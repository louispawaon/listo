/// <reference types="chrome" />

import { useCallback, useRef, useState } from "react";
import { extractTripData } from "../../lib/extractor";
import { fetchWanderlogMobx } from "../../lib/fetchWanderlogMobx";
import { initEditorState } from "../../lib/initEditorState";
import {
  formatMergeSummary,
  mergeWanderlogRefresh,
} from "../../lib/mergeWanderlogRefresh";
import type { ListoDocument } from "../../types/listo";
import { writeAutosave } from "../storage";
import type { EditorActions } from "./useEditorState";

export interface WanderlogRefreshState {
  syncing: boolean;
  message: string | null;
  error: string | null;
  sync: () => void;
}

async function currentEditorTabId(): Promise<number | undefined> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0]?.id;
}

export function useWanderlogRefresh(
  doc: ListoDocument,
  actions: EditorActions
): WanderlogRefreshState {
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const docRef = useRef(doc);
  docRef.current = doc;

  const sync = useCallback((): void => {
    void (async () => {
      setSyncing(true);
      setMessage(null);
      setError(null);

      try {
        const returnToTabId = await currentEditorTabId();
        const currentDoc = docRef.current;
        const mobxResult = await fetchWanderlogMobx(
          currentDoc.wanderlogUrl,
          returnToTabId,
          true
        );
        if (!mobxResult.ok) {
          setError(mobxResult.error);
          return;
        }

        const extraction = extractTripData(mobxResult.value);
        if (!extraction.success) {
          setError(extraction.error);
          return;
        }

        const freshDoc = initEditorState(extraction.data, {
          wanderlogUrl: mobxResult.tabUrl,
        });
        const { doc: merged, summary } = mergeWanderlogRefresh(currentDoc, freshDoc);
        actions.replace(merged);
        await writeAutosave(merged);
        setMessage(formatMergeSummary(summary));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Sync failed.";
        setError(msg);
      } finally {
        setSyncing(false);
      }
    })();
  }, [actions]);

  return { syncing, message, error, sync };
}
