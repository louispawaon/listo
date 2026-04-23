import React, { useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type {
  Activity,
  ManualActivity,
  ManualActivityKind,
  TripDay,
} from "../../types/listo";
import { ActivityRow } from "./ActivityRow";
import { AddActivityModal } from "./AddActivityModal";
import { createManualActivity } from "../hooks/useEditorState";

interface DayPanelProps {
  day: TripDay;
  onActivityChange: (activityId: string, patch: Partial<ManualActivity>) => void;
  onActivityRemove: (activityId: string) => void;
  onActivityReorder: (fromId: string, toId: string) => void;
  onActivityAdd: (activity: Activity) => void;
}

interface SortableActivityProps {
  activity: Activity;
  onChange: (patch: Partial<ManualActivity>) => void;
  onRemove: () => void;
}

function SortableActivity({ activity, onChange, onRemove }: SortableActivityProps): React.ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: activity.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const handleProps: React.HTMLAttributes<HTMLButtonElement> = {
    ...attributes,
    ...listeners,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ActivityRow
        activity={activity}
        onChange={onChange}
        onRemove={onRemove}
        dragHandleProps={handleProps}
      />
    </div>
  );
}

export function DayPanel({
  day,
  onActivityChange,
  onActivityRemove,
  onActivityReorder,
  onActivityAdd,
}: DayPanelProps): React.ReactElement {
  const [modalOpen, setModalOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    if (over === null || active.id === over.id) return;
    onActivityReorder(String(active.id), String(over.id));
  };

  const handleConfirmAdd = (input: {
    kind: ManualActivityKind;
    label: string;
    time: string | undefined;
    notes: string | undefined;
  }): void => {
    onActivityAdd(createManualActivity(input));
    setModalOpen(false);
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-neutral-900">{day.label}</div>
          {day.date !== null && (
            <div className="text-[10px] uppercase tracking-wider text-neutral-400">{day.date}</div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {day.activities.length === 0 ? (
          <div className="rounded-md border border-dashed border-neutral-200 bg-neutral-50 py-4 text-center text-xs text-neutral-400">
            No activities yet.
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={day.activities.map((a) => a.id)}
              strategy={verticalListSortingStrategy}
            >
              {day.activities.map((activity) => (
                <SortableActivity
                  key={activity.id}
                  activity={activity}
                  onChange={(patch) => { onActivityChange(activity.id, patch); }}
                  onRemove={() => { onActivityRemove(activity.id); }}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      <button
        type="button"
        onClick={() => { setModalOpen(true); }}
        className="mt-3 w-full rounded-md border border-dashed border-neutral-300 bg-white py-2 text-xs font-medium text-neutral-600 hover:border-neutral-500 hover:text-neutral-900"
      >
        + Add activity
      </button>

      {modalOpen && (
        <AddActivityModal
          dayLabel={day.label}
          onCancel={() => { setModalOpen(false); }}
          onConfirm={handleConfirmAdd}
        />
      )}
    </div>
  );
}
