import React from "react";

/** Discrete zoom levels exposed in the toolbar. */
export const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5] as const;
export type ZoomLevel = (typeof ZOOM_LEVELS)[number];

interface ToolbarProps {
  tripName: string;
  onSave: () => void;
  onLoad: () => void;
  onExportPdf: () => void;
  exportPending: boolean;
  exportError: string | null;
  savedLabel: string | null;
  zoom: ZoomLevel;
  onZoomChange: (zoom: ZoomLevel) => void;
}

export function Toolbar({
  tripName,
  onSave,
  onLoad,
  onExportPdf,
  exportPending,
  exportError,
  savedLabel,
  zoom,
  onZoomChange,
}: ToolbarProps): React.ReactElement {
  return (
    <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3">
      <div className="flex items-baseline gap-3">
        <div className="text-lg font-semibold tracking-tight text-neutral-900">Listo</div>
        <div className="truncate text-sm text-neutral-500">{tripName || "Untitled trip"}</div>
      </div>

      <div className="flex items-center gap-2">
        <ZoomControl zoom={zoom} onChange={onZoomChange} />

        {savedLabel !== null && (
          <span className="mr-2 text-xs text-neutral-400">{savedLabel}</span>
        )}
        {exportError !== null && (
          <span className="mr-2 text-xs text-red-600">{exportError}</span>
        )}
        <button
          type="button"
          onClick={onLoad}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
        >
          Load .listo
        </button>
        <button
          type="button"
          onClick={onSave}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
        >
          Save .listo
        </button>
        <button
          type="button"
          onClick={onExportPdf}
          disabled={exportPending}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
        >
          {exportPending ? "Exporting…" : "Export PDF"}
        </button>
      </div>
    </div>
  );
}

// ─── Zoom control (decrement / label / increment) ───────────────────────────

interface ZoomControlProps {
  zoom: ZoomLevel;
  onChange: (next: ZoomLevel) => void;
}

function ZoomControl({ zoom, onChange }: ZoomControlProps): React.ReactElement {
  const currentIndex = ZOOM_LEVELS.indexOf(zoom);
  const canDec = currentIndex > 0;
  const canInc = currentIndex < ZOOM_LEVELS.length - 1;

  const dec = (): void => {
    if (canDec) {
      const next = ZOOM_LEVELS[currentIndex - 1];
      if (next !== undefined) onChange(next);
    }
  };
  const inc = (): void => {
    if (canInc) {
      const next = ZOOM_LEVELS[currentIndex + 1];
      if (next !== undefined) onChange(next);
    }
  };

  return (
    <div className="mr-2 flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-1 py-0.5">
      <button
        type="button"
        onClick={dec}
        disabled={!canDec}
        aria-label="Zoom out"
        className="rounded px-1.5 text-xs text-neutral-600 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-300"
      >
        −
      </button>
      <button
        type="button"
        onClick={() => {
          onChange(1);
        }}
        aria-label="Reset zoom"
        className="min-w-[3ch] rounded px-1 text-center text-xs font-medium tabular-nums text-neutral-700 hover:bg-neutral-100"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        type="button"
        onClick={inc}
        disabled={!canInc}
        aria-label="Zoom in"
        className="rounded px-1.5 text-xs text-neutral-600 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-300"
      >
        +
      </button>
    </div>
  );
}
