import React from "react";
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
import type { ListoPlaceBlock } from "../../../types/listo";
import { InlineInput } from "../InlineEdit";

/**
 * Places table — a real HTML `<table>` that mirrors `PlacesTableView` in
 * the PDF:
 *   - 1pt top border
 *   - each row: index / name / address / rating, 7pt vertical padding,
 *     alternating surface background
 *   - 1pt bottom rule on each row
 *
 * Rows are sortable within the section via `@dnd-kit/sortable`.
 */

interface PlacesTableEditorProps {
  places: ListoPlaceBlock[];
  onChange: (blockId: string, patch: Partial<ListoPlaceBlock>) => void;
  onRemove: (blockId: string) => void;
  onReorder: (fromId: string, toId: string) => void;
}

export function PlacesTableEditor({
  places,
  onChange,
  onRemove,
  onReorder,
}: PlacesTableEditorProps): React.ReactElement {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    if (over === null || active.id === over.id) return;
    onReorder(String(active.id), String(over.id));
  };

  return (
    <div style={{ borderTop: "1pt solid var(--c-rule)" }}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={places.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          {places.map((place, index) => (
            <SortablePlaceRow
              key={place.id}
              place={place}
              index={index}
              alt={index % 2 !== 0}
              onChange={(patch) => {
                onChange(place.id, patch);
              }}
              onRemove={() => {
                onRemove(place.id);
              }}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}

// ─── Sortable row ────────────────────────────────────────────────────────────

interface SortablePlaceRowProps {
  place: ListoPlaceBlock;
  index: number;
  alt: boolean;
  onChange: (patch: Partial<ListoPlaceBlock>) => void;
  onRemove: () => void;
}

function SortablePlaceRow({
  place,
  index,
  alt,
  onChange,
  onRemove,
}: SortablePlaceRowProps): React.ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: place.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    display: "flex",
    flexDirection: "row",
    paddingTop: "7pt",
    paddingBottom: "7pt",
    borderBottom: "1pt solid var(--c-rule-light)",
    alignItems: "flex-start",
    backgroundColor: alt ? "var(--c-surface)" : "transparent",
  };

  return (
    <div ref={setNodeRef} style={style} className="group/place relative">
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder place"
        className="absolute -left-6 top-1 cursor-grab touch-none text-neutral-300 opacity-0 transition-opacity hover:text-neutral-600 group-hover/place:opacity-100"
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

      <div
        style={{
          width: "20pt",
          fontSize: "8pt",
          color: "var(--c-light-gray)",
          paddingTop: "1pt",
          flexShrink: 0,
        }}
      >
        {index + 1}.
      </div>
      <div
        style={{
          flex: 2,
          fontSize: "9pt",
          fontWeight: 700,
          color: "var(--c-black)",
          lineHeight: 1.4,
          minWidth: 0,
        }}
      >
        <InlineInput
          value={place.name}
          onChange={(name) => {
            onChange({ name });
          }}
          placeholder="Unnamed place"
          ariaLabel="Place name"
        />
      </div>
      <div
        style={{
          flex: 3,
          fontSize: "8pt",
          color: "var(--c-mid-gray)",
          lineHeight: 1.4,
          paddingRight: "8pt",
          minWidth: 0,
        }}
      >
        <InlineInput
          value={place.address}
          onChange={(address) => {
            onChange({ address });
          }}
          placeholder="Address"
          ariaLabel="Address"
        />
      </div>
      <div
        style={{
          width: "50pt",
          fontSize: "8pt",
          color: "var(--c-light-gray)",
          paddingTop: "1pt",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: "3pt",
        }}
      >
        <span>★</span>
        <InlineInput
          value={place.rating > 0 ? place.rating.toFixed(1) : ""}
          onChange={(value) => {
            const parsed = parseFloat(value);
            const rating = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
            onChange({ rating });
          }}
          placeholder="—"
          ariaLabel="Rating"
          align="right"
        />
      </div>

      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove place"
        className="absolute -right-6 top-1 text-neutral-300 opacity-0 transition-opacity hover:text-red-600 group-hover/place:opacity-100"
      >
        <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M3 6h14" strokeLinecap="round" />
          <path d="M8 6V4a1 1 0 011-1h2a1 1 0 011 1v2" strokeLinecap="round" />
          <path d="M5 6l1 10a2 2 0 002 2h4a2 2 0 002-2l1-10" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
