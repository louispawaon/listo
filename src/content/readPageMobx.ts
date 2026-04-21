/// <reference types="chrome" />

/**
 * Reads `window.__MOBX_STATE__` from the page's JavaScript world.
 *
 * Content scripts cannot use `chrome.tabs` or `chrome.scripting`; those APIs
 * run in the service worker. We ask the background script to inject into the
 * sender tab (`sender.tab.id` from our message).
 */

export async function readMobXStateFromPage(): Promise<unknown> {
  const response = await chrome.runtime.sendMessage({ type: "READ_PAGE_MOBX" }) as
    | { ok: true; value: unknown }
    | { ok: false; error: string }
    | undefined;

  if (response === undefined) {
    throw new Error("No response from extension background.");
  }
  if (!response.ok) {
    throw new Error(response.error);
  }
  return response.value;
}
