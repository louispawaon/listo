/// <reference types="chrome" />

/**
 * Runs `executeScript` in MAIN world — only available here, not in content scripts.
 */

type ReadMobxResponse =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

chrome.runtime.onMessage.addListener(
  (
    message: unknown,
    sender: chrome.runtime.MessageSender,
    sendResponse: (r: ReadMobxResponse) => void
  ): boolean => {
    if (
      typeof message !== "object" ||
      message === null ||
      (message as { type?: string }).type !== "READ_PAGE_MOBX"
    ) {
      return false;
    }

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
);
