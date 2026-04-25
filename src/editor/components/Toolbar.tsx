import React from "react";

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
    <div
      className="flex items-center justify-between px-6 py-3 
      bg-white/70 backdrop-blur-md border-b border-neutral-200"
    >
      {/* LEFT — Identity + Context */}
      <div className="flex items-center gap-4">
        <div className="text-base font-semibold tracking-tight text-neutral-900">
          Listo
        </div>

        <div className="h-4 w-px bg-neutral-300" />

        <div className="flex flex-col leading-tight">
          <span className="text-sm font-medium text-neutral-800 truncate max-w-[220px]">
            {tripName || "Untitled trip"}
          </span>
          {savedLabel && (
            <span className="text-[11px] text-neutral-400">{savedLabel}</span>
          )}
        </div>
      </div>

      {/* RIGHT — Tools */}
      <div className="flex items-center gap-3">
        <ZoomControl zoom={zoom} onChange={onZoomChange} />

        {exportError && (
          <span className="text-xs text-red-500">{exportError}</span>
        )}

        {/* subtle actions */}
        <button
          onClick={onLoad}
          className="text-xs text-neutral-500 hover:text-neutral-800 transition"
        >
          Import
        </button>

        <button
          onClick={onSave}
          className="text-xs text-neutral-500 hover:text-neutral-800 transition"
        >
          Save
        </button>

        {/* PRIMARY CTA */}
        <button
          onClick={onExportPdf}
          disabled={exportPending}
          className="ml-2 rounded-full px-4 py-1.5 text-sm font-medium
            bg-neutral-900 text-white
            shadow-sm hover:shadow-md hover:translate-y-[-0.5px]
            active:translate-y-0 transition
            disabled:bg-neutral-400 disabled:cursor-not-allowed"
        >
          {exportPending ? "Exporting…" : "Export PDF"}
        </button>
      </div>
    </div>
  );
}

// ─── Zoom Control (more tactile / tool-like) ────────────────────────────────

interface ZoomControlProps {
  zoom: ZoomLevel;
  onChange: (next: ZoomLevel) => void;
}

function ZoomControl({ zoom, onChange }: ZoomControlProps) {
  const index = ZOOM_LEVELS.indexOf(zoom);

  return (
    <div
      className="flex items-center gap-1 
      rounded-full bg-neutral-100 px-1.5 py-0.5 shadow-inner"
    >
      <button
        onClick={() => {
          const prev = ZOOM_LEVELS[index - 1];
          if (prev !== undefined) onChange(prev);
        }}
        disabled={index === 0}
      >
        −
      </button>

      <button
        onClick={() => onChange(1)}
        className="min-w-[42px] text-center text-xs font-medium 
          tabular-nums text-neutral-800 hover:text-black"
      >
        {Math.round(zoom * 100)}%
      </button>

      <button
        onClick={() => {
          const next = ZOOM_LEVELS[index + 1];
          if (next !== undefined) onChange(next);
        }}
        disabled={index === ZOOM_LEVELS.length - 1}
      >
        +
      </button>
    </div>
  );
}
