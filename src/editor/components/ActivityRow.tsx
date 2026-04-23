import React from "react";
import type { Activity, ManualActivity, ManualActivityKind } from "../../types/listo";
import { SelectField, TextArea, TextField } from "./Field";

export const MANUAL_KIND_OPTIONS: readonly { value: ManualActivityKind; label: string }[] = [
  { value: "activity", label: "Activity" },
  { value: "meal", label: "Meal" },
  { value: "transport", label: "Transport" },
  { value: "note", label: "Note" },
] as const;

function kindLabel(activity: Activity): string {
  if (activity.source === "manual") {
    switch (activity.kind) {
      case "meal":
        return "Meal";
      case "transport":
        return "Transport";
      case "activity":
        return "Activity";
      case "note":
        return "Note";
    }
  }
  switch (activity.kind) {
    case "flight":
      return "Flight";
    case "hotel":
      return "Hotel";
    case "place":
      return "Place";
    case "note":
      return "Note";
  }
}

interface ActivityRowProps {
  activity: Activity;
  onChange: (patch: Partial<ManualActivity>) => void;
  onRemove: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  dragHandleRef?: React.Ref<HTMLButtonElement>;
}

export function ActivityRow({
  activity,
  onChange,
  onRemove,
  dragHandleProps,
  dragHandleRef,
}: ActivityRowProps): React.ReactElement {
  const isAuto = activity.source === "auto";

  return (
    <div
      className={`flex items-start gap-2 rounded-md border ${
        isAuto ? "border-neutral-200 bg-neutral-50" : "border-neutral-200 bg-white"
      } p-2`}
    >
      {dragHandleProps !== undefined && (
        <button
          type="button"
          ref={dragHandleRef}
          {...dragHandleProps}
          aria-label="Drag to reorder activity"
          className="mt-1 cursor-grab touch-none text-neutral-300 hover:text-neutral-500"
        >
          <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <circle cx="7" cy="5" r="1.5" />
            <circle cx="7" cy="10" r="1.5" />
            <circle cx="7" cy="15" r="1.5" />
            <circle cx="13" cy="5" r="1.5" />
            <circle cx="13" cy="10" r="1.5" />
            <circle cx="13" cy="15" r="1.5" />
          </svg>
        </button>
      )}

      <div className="w-20 shrink-0">
        {isAuto ? (
          <div className="mt-1 text-sm text-neutral-500">{activity.time ?? "—"}</div>
        ) : (
          <TextField
            type="time"
            value={activity.time ?? ""}
            onChange={(value) => {
              const next = value.trim() === "" ? undefined : value;
              onChange({ time: next });
            }}
          />
        )}
      </div>

      <div className="w-24 shrink-0">
        {isAuto ? (
          <div className="mt-1 text-xs font-medium uppercase tracking-wider text-neutral-500">
            {kindLabel(activity)}
          </div>
        ) : (
          <SelectField<ManualActivityKind>
            value={activity.kind}
            onChange={(kind) => { onChange({ kind }); }}
            options={MANUAL_KIND_OPTIONS}
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        {isAuto ? (
          <div className="space-y-1">
            <div className="text-sm text-neutral-700">{activity.label}</div>
            <div className="text-[10px] text-neutral-400">Edit via the source block in the sections panel</div>
          </div>
        ) : (
          <div className="space-y-1">
            <TextField
              value={activity.label}
              onChange={(label) => { onChange({ label }); }}
              placeholder="Activity label"
            />
            {(activity.notes ?? "") !== "" || activity.kind === "note" ? (
              <TextArea
                value={activity.notes ?? ""}
                onChange={(value) => {
                  const next = value.trim() === "" ? undefined : value;
                  onChange({ notes: next });
                }}
                rows={2}
                placeholder="Notes"
              />
            ) : null}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove activity"
        className="text-neutral-400 hover:text-red-600"
      >
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M3 6h14" strokeLinecap="round" />
          <path d="M8 6V4a1 1 0 011-1h2a1 1 0 011 1v2" strokeLinecap="round" />
          <path d="M5 6l1 10a2 2 0 002 2h4a2 2 0 002-2l1-10" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
