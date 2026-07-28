/**
 * Debounced autosave of the current editor document into chrome.storage.local.
 *
 * Also persists immediately when the editor session starts and on tab close so
 * a browser refresh can resume the open document.
 */

import { useEffect, useRef, useState } from "react";
import type { ListoDocument } from "../../types/listo";
import { writeAutosave } from "../storage";

const DEBOUNCE_MS = 5_000;

async function persistDoc(doc: ListoDocument): Promise<void> {
  await writeAutosave({ ...doc, savedAt: new Date().toISOString() });
}

export function useAutoSave(doc: ListoDocument): { savedAt: Date | null } {
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const docRef = useRef(doc);
  docRef.current = doc;
  const firstRun = useRef(true);

  useEffect(() => {
    void persistDoc(doc).then(() => {
      setSavedAt(new Date());
    }).catch((err: unknown) => {
      console.error("[Listo] initial autosave failed", err);
    });
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (): void => {
      void persistDoc(docRef.current);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

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
          await persistDoc(doc);
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
