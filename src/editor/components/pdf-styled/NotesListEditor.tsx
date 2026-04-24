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
import type { ListoNoteBlock } from "../../../types/listo";
import { InlineInput, InlineTextarea } from "../InlineEdit";

/**
 * Editable notes list. Matches the PDF's `NotesListView`:
 *   - each note is an accented-left card with surface background
 *   - title at 10pt bold, content at 9pt darkGray
 *   - 10pt padding, 8pt bottom margin
 *
 * Notes are individually sortable within their section.
 */

interface NotesListEditorProps {
  notes: ListoNoteBlock[];
  onChange: (blockId: string, patch: Partial<ListoNoteBlock>) => void;
  onRemove: (blockId: string) => void;
  onReorder: (fromId: string, toId: string) => void;
}

export function NotesListEditor({
  notes,
  onChange,
  onRemove,
  onReorder,
}: NotesListEditorProps): React.ReactElement {
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
      <SortableContext items={notes.map((n) => n.id)} strategy={verticalListSortingStrategy}>
        {notes.map((note) => (
          <SortableNote
            key={note.id}
            note={note}
            onChange={(patch) => {
              onChange(note.id, patch);
            }}
            onRemove={() => {
              onRemove(note.id);
            }}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}

interface SortableNoteProps {
  note: ListoNoteBlock;
  onChange: (patch: Partial<ListoNoteBlock>) => void;
  onRemove: () => void;
}

function SortableNote({ note, onChange, onRemove }: SortableNoteProps): React.ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: note.id,
  });

  const wrapperStyle: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div ref={setNodeRef} style={wrapperStyle}>
      <div
        className="group/note relative"
        style={{
          marginBottom: "8pt",
          padding: "10pt",
          backgroundColor: "var(--c-surface)",
          borderRadius: "4pt",
          borderLeft: "3pt solid var(--c-accent)",
        }}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder note"
          className="absolute -left-6 top-2 cursor-grab touch-none text-neutral-300 opacity-0 transition-opacity hover:text-neutral-600 group-hover/note:opacity-100"
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

        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove note"
          className="absolute -right-6 top-2 text-neutral-300 opacity-0 transition-opacity hover:text-red-600 group-hover/note:opacity-100"
        >
          <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M3 6h14" strokeLinecap="round" />
            <path d="M8 6V4a1 1 0 011-1h2a1 1 0 011 1v2" strokeLinecap="round" />
            <path d="M5 6l1 10a2 2 0 002 2h4a2 2 0 002-2l1-10" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div
          style={{
            fontSize: "10pt",
            fontWeight: 700,
            color: "var(--c-black)",
            marginBottom: "3pt",
          }}
        >
          <InlineInput
            value={note.title}
            onChange={(title) => {
              onChange({ title });
            }}
            placeholder="Note"
            ariaLabel="Note title"
          />
        </div>
        <div
          style={{
            fontSize: "9pt",
            color: "var(--c-dark-gray)",
            lineHeight: 1.4,
          }}
        >
          <InlineTextarea
            value={note.content}
            onChange={(content) => {
              onChange({ content });
            }}
            placeholder="Write a note…"
            ariaLabel="Note content"
          />
        </div>
      </div>
    </div>
  );
}
