/// <reference types="chrome" />

/**
 * React root for the editor tab (`editor.html`).
 *
 * On mount we check `chrome.storage.local` in priority order:
 *   1. Fresh extraction handoff from the content script → adopt and clear.
 *   2. Autosave blob from a previous editor session → offer to resume.
 *   3. Neither → render the landing state (load .listo / go to Wanderlog).
 */

import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { EditorApp } from "./EditorApp";
import { Landing } from "./Landing";
import {
  clearExtractionHandoff,
  readBootstrap,
} from "./storage";
import type { ListoDocument } from "../types/listo";
import "./styles.css";

type BootstrapState =
  | { phase: "loading" }
  | { phase: "editor"; doc: ListoDocument; hadRecovery: boolean }
  | { phase: "landing"; recoveryDoc: ListoDocument | null };

function Root(): React.ReactElement {
  const [state, setState] = useState<BootstrapState>({ phase: "loading" });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const { extractionDoc, autosaveDoc } = await readBootstrap();
        if (cancelled) return;

        if (extractionDoc !== null) {
          await clearExtractionHandoff();
          if (cancelled) return;
          setState({ phase: "editor", doc: extractionDoc, hadRecovery: false });
          return;
        }

        setState({ phase: "landing", recoveryDoc: autosaveDoc });
      } catch (err) {
        console.error("[Listo] bootstrap failed", err);
        if (!cancelled) {
          setState({ phase: "landing", recoveryDoc: null });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.phase === "loading") {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-500">
        Loading Listo…
      </div>
    );
  }

  if (state.phase === "editor") {
    return <EditorApp initialDoc={state.doc} />;
  }

  return (
    <Landing
      recoveryDoc={state.recoveryDoc}
      onResume={(doc) =>
        { setState({ phase: "editor", doc, hadRecovery: true }); }
      }
      onLoad={(doc) =>
        { setState({ phase: "editor", doc, hadRecovery: false }); }
      }
    />
  );
}

const container = document.getElementById("root");
if (container !== null) {
  createRoot(container).render(<Root />);
}
