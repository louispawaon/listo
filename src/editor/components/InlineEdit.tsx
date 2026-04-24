import React, { useLayoutEffect, useRef } from "react";

/**
 * Inline editing primitives for the WYSIWYG canvas.
 *
 * These inputs render invisibly at rest — they adopt the surrounding
 * typography (font-size, weight, color, text-transform, letter-spacing) so
 * that the editor looks like the final PDF until the user interacts with a
 * field. On hover they reveal a 1px inset ring, and on focus the ring
 * becomes solid and a faint white background appears. No layout shift — the
 * ring is reserved space using transparent `box-shadow` at rest.
 *
 * All styling lives in `listo-edit` inside `src/editor/styles.css`.
 */

interface BaseProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}

// ─── Single-line input ───────────────────────────────────────────────────────

export interface InlineInputProps extends BaseProps {
  type?: "text" | "date" | "time";
  align?: "left" | "right" | "center";
}

export function InlineInput({
  value,
  onChange,
  placeholder,
  className,
  ariaLabel,
  type = "text",
  align,
}: InlineInputProps): React.ReactElement {
  const style: React.CSSProperties | undefined =
    align !== undefined ? { textAlign: align } : undefined;
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => {
        onChange(e.target.value);
      }}
      className={`listo-edit ${className ?? ""}`}
      style={style}
    />
  );
}

// ─── Auto-growing textarea ───────────────────────────────────────────────────
//
// Matches PDF flow: content wraps naturally at the column width and the
// element grows to fit. We reset height to 0 before measuring scrollHeight
// so it can both grow *and* shrink.

export interface InlineTextareaProps extends BaseProps {
  rows?: number;
}

export function InlineTextarea({
  value,
  onChange,
  placeholder,
  className,
  ariaLabel,
  rows = 1,
}: InlineTextareaProps): React.ReactElement {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el === null) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      placeholder={placeholder}
      rows={rows}
      aria-label={ariaLabel}
      onChange={(e) => {
        onChange(e.target.value);
      }}
      className={`listo-edit resize-none overflow-hidden ${className ?? ""}`}
    />
  );
}

// ─── Dropdown selector styled like an input ──────────────────────────────────

export interface InlineSelectProps<T extends string> {
  value: T;
  onChange: (next: T) => void;
  options: readonly { value: T; label: string }[];
  className?: string;
  ariaLabel?: string;
}

export function InlineSelect<T extends string>({
  value,
  onChange,
  options,
  className,
  ariaLabel,
}: InlineSelectProps<T>): React.ReactElement {
  return (
    <select
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => {
        onChange(e.target.value as T);
      }}
      className={`listo-edit cursor-pointer ${className ?? ""}`}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
