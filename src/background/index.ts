/// <reference types="chrome" />

/**
 * Background service worker.
 *
 * Responsibilities:
 * - `READ_PAGE_MOBX`: bridges a content script's request into the page's JS
 *   world via `chrome.scripting.executeScript({ world: "MAIN" })`, which is
 *   only available here, not in content scripts.
 * - `OPEN_EDITOR`: opens the Listo editor tab. Content scripts cannot call
 *   `chrome.tabs.create`, so they dispatch this message to us.
 */

type ReadMobxResponse =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

type OpenEditorResponse =
  | { ok: true }
  | { ok: false; error: string };

function handleReadMobx(
  sender: chrome.runtime.MessageSender,
  sendResponse: (r: ReadMobxResponse) => void
): boolean {
  const tabId = sender.tab?.id;
  if (tabId === undefined) {
    sendResponse({ ok: false, error: "No sender tab." });
    return false;
  }

  void chrome.scripting
    .executeScript({
      target: { tabId },
      world: "MAIN",
      func: () =>
        (window as unknown as { __MOBX_STATE__?: unknown }).__MOBX_STATE__,
    })
    .then((results) => {
      sendResponse({ ok: true, value: results[0]?.result });
    })
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      sendResponse({ ok: false, error: msg });
    });

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
    sendResponse: (r: ReadMobxResponse | OpenEditorResponse) => void
  ): boolean => {
    if (typeof message !== "object" || message === null) {
      return false;
    }

    const type = (message as { type?: string }).type;
    if (type === "READ_PAGE_MOBX") {
      return handleReadMobx(sender, sendResponse as (r: ReadMobxResponse) => void);
    }
    if (type === "OPEN_EDITOR") {
      return handleOpenEditor(sendResponse as (r: OpenEditorResponse) => void);
    }
    return false;
  }
);
