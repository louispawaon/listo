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
} from "../../../types/listo";
import { FlightCardEditor } from "./FlightCardEditor";
import { HotelCardEditor } from "./HotelCardEditor";
import { PlacesTableEditor } from "./PlacesTableEditor";
import { NotesListEditor } from "./NotesListEditor";

/**
 * Dispatches the right editor body for a section based on its `kind`.
 *
 *   - flights → sortable list of FlightCardEditor
 *   - hotels  → sortable list of HotelCardEditor
 *   - places  → PlacesTableEditor (table with sortable rows)
 *   - notes   → NotesListEditor (accented cards with sortable order)
 */

interface SectionContentProps {
  section: ListoSection;
  onBlockChange: (blockId: string, patch: Partial<ListoBlock>) => void;
  onBlockRemove: (blockId: string) => void;
  onBlockReorder: (fromId: string, toId: string) => void;
}

export function SectionContent({
  section,
  onBlockChange,
  onBlockRemove,
  onBlockReorder,
}: SectionContentProps): React.ReactElement {
  switch (section.kind) {
    case "flights": {
      const flights = section.blocks.filter(
        (b): b is ListoFlightBlock => b.type === "flight"
      );
      return (
        <SortableCardList ids={flights.map((f) => f.id)} onReorder={onBlockReorder}>
          {flights.map((flight) => (
            <SortableCard key={flight.id} id={flight.id}>
              {(dragHandleProps) => (
                <FlightCardEditor
                  block={flight}
                  onChange={(patch) => {
                    onBlockChange(flight.id, patch);
                  }}
                  onRemove={() => {
                    onBlockRemove(flight.id);
                  }}
                  dragHandleProps={dragHandleProps}
                />
              )}
            </SortableCard>
          ))}
        </SortableCardList>
      );
    }
    case "hotels": {
      const hotels = section.blocks.filter(
        (b): b is ListoHotelBlock => b.type === "hotel"
      );
      return (
        <SortableCardList ids={hotels.map((h) => h.id)} onReorder={onBlockReorder}>
          {hotels.map((hotel) => (
            <SortableCard key={hotel.id} id={hotel.id}>
              {(dragHandleProps) => (
                <HotelCardEditor
                  block={hotel}
                  onChange={(patch) => {
                    onBlockChange(hotel.id, patch);
                  }}
                  onRemove={() => {
                    onBlockRemove(hotel.id);
                  }}
                  dragHandleProps={dragHandleProps}
                />
              )}
            </SortableCard>
          ))}
        </SortableCardList>
      );
    }
    case "places": {
      const places = section.blocks.filter(
        (b): b is ListoPlaceBlock => b.type === "place"
      );
      return (
        <PlacesTableEditor
          places={places}
          onChange={(id, patch) => {
            onBlockChange(id, patch);
          }}
          onRemove={(id) => {
            onBlockRemove(id);
          }}
          onReorder={onBlockReorder}
        />
      );
    }
    case "notes": {
      const notes = section.blocks.filter(
        (b): b is ListoNoteBlock => b.type === "note"
      );
      return (
        <NotesListEditor
          notes={notes}
          onChange={(id, patch) => {
            onBlockChange(id, patch);
          }}
          onRemove={(id) => {
            onBlockRemove(id);
          }}
          onReorder={onBlockReorder}
        />
      );
    }
  }
}

// ─── Generic sortable list used by flights & hotels ──────────────────────────

interface SortableCardListProps {
  ids: string[];
  onReorder: (fromId: string, toId: string) => void;
  children: React.ReactNode;
}

function SortableCardList({
  ids,
  onReorder,
  children,
}: SortableCardListProps): React.ReactElement {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    if (over === null || active.id === over.id) return;
    onReorder(String(active.id), String(over.id));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

interface SortableCardProps {
  id: string;
  children: (
    dragHandleProps: React.HTMLAttributes<HTMLButtonElement>
  ) => React.ReactNode;
}

function SortableCard({ id, children }: SortableCardProps): React.ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const handleProps: React.HTMLAttributes<HTMLButtonElement> = {
    ...attributes,
    ...listeners,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children(handleProps)}
    </div>
  );
}
