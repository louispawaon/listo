import React from "react";

/**
 * Common chrome for flight / hotel / note cards in the paper canvas.
 *
 * Matches the PDF's accented left-border card:
 *   - surface background
 *   - 3pt accent left stripe
 *   - 4pt radius, 12pt padding, 8pt bottom margin
 *
 * Adds editor-only affordances on top:
 *   - drag handle on the left (appears on row hover)
 *   - remove button on the top-right (appears on row hover)
 *
 * Hover reveals the handle/remove controls without shifting layout — the
 * space they occupy is reserved at all times via absolute positioning.
 */

interface PdfCardProps {
  onRemove: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  dragHandleRef?: React.Ref<HTMLButtonElement>;
  children: React.ReactNode;
}

export function PdfCard({
  onRemove,
  dragHandleProps,
  dragHandleRef,
  children,
}: PdfCardProps): React.ReactElement {
  return (
    <div
      className="group/card relative"
      style={{
        backgroundColor: "var(--c-surface)",
        borderTopLeftRadius: "4pt",
        borderBottomLeftRadius: "4pt",
        borderTopRightRadius: "4pt",
        borderBottomRightRadius: "4pt",
        borderLeft: "3pt solid var(--c-accent)",
        padding: "12pt",
        marginBottom: "8pt",
      }}
    >
      {dragHandleProps !== undefined && (
        <button
          type="button"
          ref={dragHandleRef}
          {...dragHandleProps}
          aria-label="Drag to reorder"
          className="absolute -left-6 top-2 cursor-grab touch-none text-neutral-300 opacity-0 transition-opacity hover:text-neutral-600 group-hover/card:opacity-100"
        >
          <DragDotsIcon />
        </button>
      )}

      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove"
        className="absolute -right-6 top-2 text-neutral-300 opacity-0 transition-opacity hover:text-red-600 group-hover/card:opacity-100"
      >
        <TrashIcon />
      </button>

      {children}
    </div>
  );
}

function DragDotsIcon(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <circle cx="7" cy="5" r="1.5" />
      <circle cx="7" cy="10" r="1.5" />
      <circle cx="7" cy="15" r="1.5" />
      <circle cx="13" cy="5" r="1.5" />
      <circle cx="13" cy="10" r="1.5" />
      <circle cx="13" cy="15" r="1.5" />
    </svg>
  );
}

function TrashIcon(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 6h14" strokeLinecap="round" />
      <path d="M8 6V4a1 1 0 011-1h2a1 1 0 011 1v2" strokeLinecap="round" />
      <path d="M5 6l1 10a2 2 0 002 2h4a2 2 0 002-2l1-10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
