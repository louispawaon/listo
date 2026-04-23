import React, { useState } from "react";
import type { ManualActivityKind } from "../../types/listo";
import { SelectField, TextArea, TextField } from "./Field";
import { MANUAL_KIND_OPTIONS } from "./ActivityRow";

interface AddActivityModalProps {
  dayLabel: string;
  onCancel: () => void;
  onConfirm: (input: {
    kind: ManualActivityKind;
    label: string;
    time: string | undefined;
    notes: string | undefined;
  }) => void;
}

export function AddActivityModal({
  dayLabel,
  onCancel,
  onConfirm,
}: AddActivityModalProps): React.ReactElement {
  const [kind, setKind] = useState<ManualActivityKind>("activity");
  const [label, setLabel] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (label.trim() === "") return;
    onConfirm({
      kind,
      label: label.trim(),
      time: time.trim() === "" ? undefined : time,
      notes: notes.trim() === "" ? undefined : notes.trim(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
      >
        <div className="mb-4">
          <div className="text-base font-semibold text-neutral-900">Add activity</div>
          <div className="text-xs text-neutral-500">{dayLabel}</div>
        </div>

        <div className="space-y-3">
          <SelectField<ManualActivityKind>
            label="Kind"
            value={kind}
            onChange={setKind}
            options={MANUAL_KIND_OPTIONS}
          />
          <TextField
            label="Label"
            value={label}
            onChange={setLabel}
            placeholder="e.g. Lunch at hotel"
          />
          <TextField
            label="Time (optional)"
            type="time"
            value={time}
            onChange={setTime}
          />
          <TextArea
            label="Notes (optional)"
            value={notes}
            onChange={setNotes}
            rows={3}
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={label.trim() === ""}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
          >
            Add activity
          </button>
        </div>
      </form>
    </div>
  );
}
