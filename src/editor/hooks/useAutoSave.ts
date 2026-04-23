/**
 * Debounced autosave of the current editor document into chrome.storage.local.
 *
 * The debounce window is short enough that an accidental tab close loses at
 * most a few seconds of edits, but long enough to avoid hammering the storage
 * API on every keystroke.
 */

import { useEffect, useRef, useState } from "react";
import type { ListoDocument } from "../../types/listo";
import { writeAutosave } from "../storage";

const DEBOUNCE_MS = 5_000;

export function useAutoSave(doc: ListoDocument): { savedAt: Date | null } {
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const timeoutRef = useRef<number | null>(null);
  // Skip the first render: the doc was just loaded and hasn't changed yet.
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      void (async () => {
        try {
          await writeAutosave({ ...doc, savedAt: new Date().toISOString() });
          setSavedAt(new Date());
        } catch (err) {
          console.error("[Listo] autosave failed", err);
        }
      })();
    }, DEBOUNCE_MS);

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [doc]);

  return { savedAt };
}
