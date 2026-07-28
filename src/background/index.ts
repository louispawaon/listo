/// <reference types="chrome" />

/**
 * Background service worker.
 *
 * Responsibilities:
 * - `READ_PAGE_MOBX`: bridges a content script's request into the page's JS
 *   world via `chrome.scripting.executeScript({ world: "MAIN" })`, which is
 *   only available here, not in content scripts.
 * - `EXTRACT_FROM_WANDERLOG`: reads MobX from an open Wanderlog plan tab
 *   (used by the editor's sync action).
 * - `OPEN_EDITOR`: opens the Listo editor tab. Content scripts cannot call
 *   `chrome.tabs.create`, so they dispatch this message to us.
 */

const WANDERLOG_PLAN_URL_PATTERN = "https://wanderlog.com/plan/*";
const MOBX_FLUSH_MS = 300;
const TAB_SWITCH_SETTLE_MS = 350;
const TAB_RELOAD_TIMEOUT_MS = 20_000;

type ReadMobxResponse =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

type ExtractFromWanderlogResponse =
  | { ok: true; value: unknown; tabUrl: string }
  | { ok: false; error: string };

type OpenEditorResponse =
  | { ok: true }
  | { ok: false; error: string };

async function readMobxFromTab(tabId: number): Promise<unknown> {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: async (flushMs: number) => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, flushMs);
      });
      const state = (window as unknown as { __MOBX_STATE__?: unknown }).__MOBX_STATE__;
      if (state === undefined) {
        return undefined;
      }
      try {
        return JSON.parse(JSON.stringify(state)) as unknown;
      } catch {
        return state;
      }
    },
    args: [MOBX_FLUSH_MS],
  });
  return results[0]?.result;
}

function normalizePlanUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    return `${parsed.protocol}//${host}${parsed.pathname}`.replace(/\/$/, "");
  } catch {
    return url.replace(/\/$/, "");
  }
}

function urlsMatch(a: string, b: string): boolean {
  return normalizePlanUrl(a) === normalizePlanUrl(b);
}

async function sleep(ms: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForTabComplete(tabId: number, timeoutMs: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      reject(new Error("Timed out waiting for Wanderlog tab to finish loading."));
    }, timeoutMs);

    const onUpdated = (
      updatedTabId: number,
      changeInfo: { status?: string }
    ): void => {
      if (updatedTabId !== tabId) return;
      if (changeInfo.status === "complete") {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve();
      }
    };

    chrome.tabs.onUpdated.addListener(onUpdated);
  });
}

async function reloadTabAndWait(tabId: number): Promise<void> {
  const waiter = waitForTabComplete(tabId, TAB_RELOAD_TIMEOUT_MS);
  await chrome.tabs.reload(tabId);
  await waiter;
}

async function pickWanderlogTab(planUrl?: string): Promise<chrome.tabs.Tab | null> {
  const tabs = await chrome.tabs.query({ url: WANDERLOG_PLAN_URL_PATTERN });
  if (tabs.length === 0) return null;

  if (planUrl !== undefined && planUrl.length > 0) {
    const match = tabs.find(
      (tab) => typeof tab.url === "string" && urlsMatch(tab.url, planUrl)
    );
    if (match !== undefined) return match;
  }

  const sorted = [...tabs].sort((a, b) => {
    const aTime = a.lastAccessed ?? 0;
    const bTime = b.lastAccessed ?? 0;
    return bTime - aTime;
  });
  return sorted[0] ?? null;
}

function handleReadMobx(
  sender: chrome.runtime.MessageSender,
  sendResponse: (r: ReadMobxResponse) => void
): boolean {
  const tabId = sender.tab?.id;
  if (tabId === undefined) {
    sendResponse({ ok: false, error: "No sender tab." });
    return false;
  }

  void readMobxFromTab(tabId)
    .then((value) => {
      sendResponse({ ok: true, value });
    })
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      sendResponse({ ok: false, error: msg });
    });

  return true;
}

function handleExtractFromWanderlog(
  message: { planUrl?: string; returnToTabId?: number; forceReload?: boolean },
  sendResponse: (r: ExtractFromWanderlogResponse) => void
): boolean {
  void (async () => {
    try {
      const tab = await pickWanderlogTab(message.planUrl);
      if (tab === null || tab.id === undefined) {
        sendResponse({
          ok: false,
          error:
            "No Wanderlog plan tab found. Open your trip at wanderlog.com/plan/… and try again.",
        });
        return;
      }

      // Match the "Open in Listo" capture path more closely: make the
      // Wanderlog tab active so in-progress UI edits are flushed to MobX.
      if (tab.windowId !== undefined) {
        await chrome.windows.update(tab.windowId, { focused: true });
      }
      await chrome.tabs.update(tab.id, { active: true });
      await sleep(TAB_SWITCH_SETTLE_MS);
      if (message.forceReload === true) {
        await reloadTabAndWait(tab.id);
        await sleep(TAB_SWITCH_SETTLE_MS);
      }

      const value = await readMobxFromTab(tab.id);
      if (value === undefined) {
        sendResponse({
          ok: false,
          error:
            "Wanderlog data not found. Make sure the plan page has fully loaded.",
        });
        return;
      }

      if (message.returnToTabId !== undefined) {
        await chrome.tabs.update(message.returnToTabId, { active: true });
      }

      sendResponse({
        ok: true,
        value,
        tabUrl: tab.url ?? "",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      sendResponse({ ok: false, error: msg });
    }
  })();

  return true;
}

function handleOpenEditor(sendResponse: (r: OpenEditorResponse) => void): boolean {
  void chrome.tabs
    .create({ url: chrome.runtime.getURL("editor.html") })
    .then(() => {
      sendResponse({ ok: true });
    })
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      sendResponse({ ok: false, error: msg });
    });
  return true;
}

chrome.runtime.onMessage.addListener(
  (
    message: unknown,
    sender: chrome.runtime.MessageSender,
    sendResponse: (
      r: ReadMobxResponse | ExtractFromWanderlogResponse | OpenEditorResponse
    ) => void
  ): boolean => {
    if (typeof message !== "object" || message === null) {
      return false;
    }

    const typed = message as {
      type?: string;
      planUrl?: string;
      returnToTabId?: number;
      forceReload?: boolean;
    };
    if (typed.type === "READ_PAGE_MOBX") {
      return handleReadMobx(sender, sendResponse as (r: ReadMobxResponse) => void);
    }
    if (typed.type === "EXTRACT_FROM_WANDERLOG") {
      return handleExtractFromWanderlog(
        typed,
        sendResponse as (r: ExtractFromWanderlogResponse) => void
      );
    }
    if (typed.type === "OPEN_EDITOR") {
      return handleOpenEditor(sendResponse as (r: OpenEditorResponse) => void);
    }
    return false;
  }
);
