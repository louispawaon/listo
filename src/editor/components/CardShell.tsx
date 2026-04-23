import React from "react";

interface CardShellProps {
  title: string;
  subtitle?: string;
  onRemove: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  dragHandleRef?: React.Ref<HTMLButtonElement>;
  children: React.ReactNode;
}

export function CardShell({
  title,
  subtitle,
  onRemove,
  dragHandleProps,
  dragHandleRef,
  children,
}: CardShellProps): React.ReactElement {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-start gap-2">
        {dragHandleProps !== undefined && (
          <button
            type="button"
            ref={dragHandleRef}
            {...dragHandleProps}
            aria-label="Drag to reorder"
            className="mt-0.5 cursor-grab touch-none text-neutral-300 hover:text-neutral-500"
          >
            <DragDotsIcon />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-neutral-900">{title}</div>
          {subtitle !== undefined && (
            <div className="truncate text-xs text-neutral-500">{subtitle}</div>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove"
          className="text-neutral-400 hover:text-red-600"
        >
          <TrashIcon />
        </button>
      </div>
      <div className="space-y-2">{children}</div>
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
