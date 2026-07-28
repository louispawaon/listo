/// <reference types="chrome" />

/**
 * Fetches Wanderlog MobX state from an open plan tab via the background worker.
 * Used by the editor's "Sync from Wanderlog" action.
 */

export type FetchWanderlogMobxResponse =
  | { ok: true; value: unknown; tabUrl: string }
  | { ok: false; error: string };

export async function fetchWanderlogMobx(
  planUrl?: string,
  returnToTabId?: number,
  forceReload?: boolean
): Promise<FetchWanderlogMobxResponse> {
  const response = (await chrome.runtime.sendMessage({
    type: "EXTRACT_FROM_WANDERLOG",
    planUrl,
    returnToTabId,
    forceReload,
  })) as FetchWanderlogMobxResponse | undefined;

  if (response === undefined) {
    return { ok: false, error: "No response from extension background." };
  }
  return response;
}
