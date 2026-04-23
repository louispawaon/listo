import React from "react";

/**
 * Small controlled-input primitives for the editor.
 * Tailwind-only, no external form lib.
 */

export interface TextFieldProps {
  label?: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
  type?: "text" | "date" | "time";
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  className,
  type = "text",
}: TextFieldProps): React.ReactElement {
  const input = (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => { onChange(e.target.value); }}
      className="w-full rounded-md border border-neutral-200 bg-white px-2 py-1 text-sm text-neutral-900 outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-300"
    />
  );

  if (label === undefined) {
    return <div className={className}>{input}</div>;
  }

  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-neutral-500">
        {label}
      </span>
      {input}
    </label>
  );
}

export interface TextAreaProps {
  label?: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  className,
}: TextAreaProps): React.ReactElement {
  const input = (
    <textarea
      value={value}
      placeholder={placeholder}
      rows={rows}
      onChange={(e) => { onChange(e.target.value); }}
      className="w-full resize-y rounded-md border border-neutral-200 bg-white px-2 py-1 text-sm text-neutral-900 outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-300"
    />
  );

  if (label === undefined) {
    return <div className={className}>{input}</div>;
  }

  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-neutral-500">
        {label}
      </span>
      {input}
    </label>
  );
}

export interface SelectFieldProps<T extends string> {
  label?: string;
  value: T;
  onChange: (next: T) => void;
  options: readonly { value: T; label: string }[];
  className?: string;
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: SelectFieldProps<T>): React.ReactElement {
  const input = (
    <select
      value={value}
      onChange={(e) => { onChange(e.target.value as T); }}
      className="w-full rounded-md border border-neutral-200 bg-white px-2 py-1 text-sm text-neutral-900 outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-300"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );

  if (label === undefined) {
    return <div className={className}>{input}</div>;
  }

  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-neutral-500">
        {label}
      </span>
      {input}
    </label>
  );
}
