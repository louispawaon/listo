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
import type {
  ListoBlock,
  ListoFlightBlock,
  ListoHotelBlock,
  ListoNoteBlock,
  ListoPlaceBlock,
  ListoSection,
  ListoSectionKind,
} from "../../types/listo";
import { FlightCard } from "./FlightCard";
import { HotelCard } from "./HotelCard";
import { PlaceCard } from "./PlaceCard";
import { NoteCard } from "./NoteCard";

export interface SectionPanelProps {
  section: ListoSection;
  onHeadingChange: (heading: string) => void;
  onBlockChange: (blockId: string, patch: Partial<ListoBlock>) => void;
  onBlockRemove: (blockId: string) => void;
  onBlockAdd: () => void;
  onBlockReorder: (fromId: string, toId: string) => void;
  sectionDragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  sectionDragHandleRef?: React.Ref<HTMLButtonElement>;
}

function addLabelFor(kind: ListoSectionKind): string {
  switch (kind) {
    case "flights":
      return "+ Add flight";
    case "hotels":
      return "+ Add hotel";
    case "places":
      return "+ Add place";
    case "notes":
      return "+ Add note";
  }
}

interface SortableBlockProps {
  block: ListoBlock;
  onChange: (patch: Partial<ListoBlock>) => void;
  onRemove: () => void;
}

function SortableBlock({ block, onChange, onRemove }: SortableBlockProps): React.ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
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
      {renderBlockCard(block, onChange, onRemove, handleProps)}
    </div>
  );
}

function renderBlockCard(
  block: ListoBlock,
  onChange: (patch: Partial<ListoBlock>) => void,
  onRemove: () => void,
  dragHandleProps: React.HTMLAttributes<HTMLButtonElement>
): React.ReactElement {
  switch (block.type) {
    case "flight":
      return (
        <FlightCard
          block={block}
          onChange={onChange as (patch: Partial<ListoFlightBlock>) => void}
          onRemove={onRemove}
          dragHandleProps={dragHandleProps}
        />
      );
    case "hotel":
      return (
        <HotelCard
          block={block}
          onChange={onChange as (patch: Partial<ListoHotelBlock>) => void}
          onRemove={onRemove}
          dragHandleProps={dragHandleProps}
        />
      );
    case "place":
      return (
        <PlaceCard
          block={block}
          onChange={onChange as (patch: Partial<ListoPlaceBlock>) => void}
          onRemove={onRemove}
          dragHandleProps={dragHandleProps}
        />
      );
    case "note":
      return (
        <NoteCard
          block={block}
          onChange={onChange as (patch: Partial<ListoNoteBlock>) => void}
          onRemove={onRemove}
          dragHandleProps={dragHandleProps}
        />
      );
  }
}

export function SectionPanel({
  section,
  onHeadingChange,
  onBlockChange,
  onBlockRemove,
  onBlockAdd,
  onBlockReorder,
  sectionDragHandleProps,
  sectionDragHandleRef,
}: SectionPanelProps): React.ReactElement {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    if (over === null || active.id === over.id) return;
    const fromId = String(active.id);
    const toId = String(over.id);
    onBlockReorder(fromId, toId);
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
      <div className="mb-3 flex items-center gap-2">
        {sectionDragHandleProps !== undefined && (
          <button
            type="button"
            ref={sectionDragHandleRef}
            {...sectionDragHandleProps}
            aria-label="Drag to reorder section"
            className="cursor-grab touch-none text-neutral-400 hover:text-neutral-600"
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
        <input
          type="text"
          value={section.heading}
          onChange={(e) => { onHeadingChange(e.target.value); }}
          className="flex-1 bg-transparent text-sm font-semibold uppercase tracking-wider text-neutral-700 outline-none focus:text-neutral-900"
        />
        <button
          type="button"
          onClick={onBlockAdd}
          className="rounded-md border border-dashed border-neutral-300 bg-white px-2 py-1 text-xs font-medium text-neutral-600 hover:border-neutral-500 hover:text-neutral-900"
        >
          {addLabelFor(section.kind)}
        </button>
      </div>

      <div className="space-y-2">
        {section.blocks.length === 0 ? (
          <div className="rounded-md border border-dashed border-neutral-200 bg-white py-4 text-center text-xs text-neutral-400">
            No {section.kind} yet.
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={section.blocks.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              {section.blocks.map((block) => (
                <SortableBlock
                  key={block.id}
                  block={block}
                  onChange={(patch) => { onBlockChange(block.id, patch); }}
                  onRemove={() => { onBlockRemove(block.id); }}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
