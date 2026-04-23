import React from "react";

interface ToolbarProps {
  tripName: string;
  onSave: () => void;
  onLoad: () => void;
  onExportPdf: () => void;
  exportPending: boolean;
  exportError: string | null;
  savedLabel: string | null;
}

export function Toolbar({
  tripName,
  onSave,
  onLoad,
  onExportPdf,
  exportPending,
  exportError,
  savedLabel,
}: ToolbarProps): React.ReactElement {
  return (
    <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3">
      <div className="flex items-baseline gap-3">
        <div className="text-lg font-semibold tracking-tight text-neutral-900">Listo</div>
        <div className="truncate text-sm text-neutral-500">{tripName || "Untitled trip"}</div>
      </div>

      <div className="flex items-center gap-2">
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
