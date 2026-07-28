import React from "react";
import { InlineInput } from "../InlineEdit";

/**
 * Section wrapper in the paper canvas.
 *
 * Renders the PDF's `sectionHeader` — an uppercase eyebrow with a 1px
 * bottom rule — followed by the section body. The heading is editable
 * inline. Add / reorder / drag handles live in the chrome around the
 * wrapper so they don't leak into the page layout.
 */

interface SectionBlockProps {
  heading: string;
  onHeadingChange: (next: string) => void;
  /** When true, the heading is static text (e.g. fixed “Daily Itinerary”). */
  headingReadOnly?: boolean;
  isEmpty: boolean;
  emptyHint: string;
  actions?: React.ReactNode;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  dragHandleRef?: React.Ref<HTMLButtonElement>;
  children: React.ReactNode;
}

export function SectionBlock({
  heading,
  onHeadingChange,
  headingReadOnly = false,
  isEmpty,
  emptyHint,
  actions,
  dragHandleProps,
  dragHandleRef,
  children,
}: SectionBlockProps): React.ReactElement {
  return (
    <section className="group/section relative" style={{ marginBottom: "26pt" }}>
      {dragHandleProps !== undefined && (
        <button
          type="button"
          ref={dragHandleRef}
          {...dragHandleProps}
          aria-label="Drag to reorder section"
          className="absolute -left-8 top-0 cursor-grab touch-none text-neutral-300 opacity-0 transition-opacity hover:text-neutral-600 group-hover/section:opacity-100"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <circle cx="7" cy="5" r="1.5" />
            <circle cx="7" cy="10" r="1.5" />
            <circle cx="7" cy="15" r="1.5" />
            <circle cx="13" cy="5" r="1.5" />
            <circle cx="13" cy="10" r="1.5" />
            <circle cx="13" cy="15" r="1.5" />
          </svg>
        </button>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "8pt",
          borderBottom: "1pt solid var(--c-rule)",
          paddingBottom: "5pt",
          marginBottom: "12pt",
        }}
      >
        <div
          style={{
            fontSize: "7.5pt",
            letterSpacing: "1.8pt",
            textTransform: "uppercase",
            color: "var(--c-mid-gray)",
            flex: 1,
          }}
        >
          {headingReadOnly ? (
            heading
          ) : (
            <InlineInput
              value={heading}
              onChange={onHeadingChange}
              ariaLabel="Section heading"
              placeholder="Section heading"
            />
          )}
        </div>
        {actions !== undefined && <div className="shrink-0">{actions}</div>}
      </div>

      {isEmpty ? (
        <div
          style={{
            fontSize: "9pt",
            color: "var(--c-light-gray)",
            fontStyle: "italic",
            paddingTop: "6pt",
            paddingBottom: "6pt",
          }}
        >
          {emptyHint}
        </div>
      ) : (
        children
      )}
    </section>
  );
}

// ─── Small "+ add" button styled to fade into the PDF chrome ─────────────────

interface AddButtonProps {
  onClick: () => void;
  children: React.ReactNode;
}

export function AddButton({ onClick, children }: AddButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded border border-dashed border-neutral-300 px-2 py-0.5 text-[8pt] font-medium uppercase tracking-wider text-neutral-500 hover:border-neutral-500 hover:text-neutral-900"
      style={{ letterSpacing: "0.8pt" }}
    >
      {children}
    </button>
  );
}
