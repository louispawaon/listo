import React, { useState } from "react";
import type { ListoDocument } from "../types/listo";
import { loadListoFile } from "./hooks/useListoFile";

interface LandingProps {
  recoveryDoc: ListoDocument | null;
  onResume: (doc: ListoDocument) => void;
  onLoad: (doc: ListoDocument) => void;
}

export function Landing({
  recoveryDoc,
  onResume,
  onLoad,
}: LandingProps): React.ReactElement {
  const [loadError, setLoadError] = useState<string | null>(null);

  const handleLoad = async (): Promise<void> => {
    setLoadError(null);
    const result = await loadListoFile();
    if (!result.success) {
      setLoadError(result.error);
      return;
    }
    onLoad(result.data);
  };

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="w-full max-w-lg rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Listo</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Extract, edit, and export your Wanderlog trip.
        </p>

        {recoveryDoc !== null && (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="text-sm font-medium text-amber-900">
              Unsaved session found
            </div>
            <div className="mt-1 text-xs text-amber-800">
              {recoveryDoc.meta.name || "Untitled trip"} · last saved{" "}
              {new Date(recoveryDoc.savedAt).toLocaleString()}
            </div>
            <button
              type="button"
              className="mt-3 rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
              onClick={() => { onResume(recoveryDoc); }}
            >
              Resume editing
            </button>
          </div>
        )}

        <div className="mt-6 space-y-4 text-sm text-neutral-700">
          <div>
            <div className="font-medium">Start from Wanderlog</div>
            <p className="mt-1 text-neutral-500">
              Open your trip at{" "}
              <span className="font-mono">wanderlog.com/plan/…</span> and click the{" "}
              <span className="font-medium">Open in Listo</span> button at the bottom-right.
            </p>
          </div>

          <div>
            <div className="font-medium">Or load a saved file</div>
            <p className="mt-1 text-neutral-500">
              Continue editing an existing <span className="font-mono">.listo</span> document.
            </p>
            <button
              type="button"
              className="mt-3 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
              onClick={() => { void handleLoad(); }}
            >
              Load .listo file
            </button>
            {loadError !== null && (
              <p className="mt-2 text-xs text-red-600">{loadError}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
