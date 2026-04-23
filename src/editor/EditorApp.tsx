import React, { useCallback, useMemo, useState } from "react";
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
  ListoDocument,
  ListoFlightBlock,
  ListoFlightEndpoint,
  ListoHotelBlock,
  ListoNoteBlock,
  ListoPlaceBlock,
  ListoSection,
} from "../types/listo";
import { Toolbar } from "./components/Toolbar";
import { TripHeader } from "./components/TripHeader";
import { SectionPanel } from "./components/SectionPanel";
import { DayPanel } from "./components/DayPanel";
import { useEditorState } from "./hooks/useEditorState";
import { useAutoSave } from "./hooks/useAutoSave";
import { loadListoFile, saveListoFile } from "./hooks/useListoFile";
import { clearAutosave } from "./storage";

interface EditorAppProps {
  initialDoc: ListoDocument;
}

// ─── Block factories for "+ Add X" buttons ───────────────────────────────────

function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function emptyEndpoint(): ListoFlightEndpoint {
  return { airportIata: "", airportName: "", city: "", date: "", time: "" };
}

function newBlockFor(section: ListoSection): ListoBlock {
  const base = { id: uuid(), order: section.blocks.length };
  switch (section.kind) {
    case "flights":
      return {
        ...base,
        type: "flight",
        airline: "",
        flightNumber: "",
        depart: emptyEndpoint(),
        arrive: emptyEndpoint(),
      } satisfies ListoFlightBlock;
    case "hotels":
      return {
        ...base,
        type: "hotel",
        name: "",
        address: "",
        checkIn: "",
        checkOut: "",
        confirmationNumber: null,
        phone: null,
        website: null,
      } satisfies ListoHotelBlock;
    case "places":
      return {
        ...base,
        type: "place",
        name: "",
        address: "",
        rating: 0,
      } satisfies ListoPlaceBlock;
    case "notes":
      return {
        ...base,
        type: "note",
        title: "",
        content: "",
      } satisfies ListoNoteBlock;
  }
}

// ─── Sortable wrapper for section-level DnD ──────────────────────────────────

interface SortableSectionProps {
  section: ListoSection;
  children: (
    dragHandleProps: React.HTMLAttributes<HTMLButtonElement>
  ) => React.ReactNode;
}

function SortableSection({ section, children }: SortableSectionProps): React.ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
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
      {children(handleProps)}
    </div>
  );
}

// ─── EditorApp ───────────────────────────────────────────────────────────────

export function EditorApp({ initialDoc }: EditorAppProps): React.ReactElement {
  const { doc, actions } = useEditorState(initialDoc);
  const { savedAt } = useAutoSave(doc);

  const [exportPending, setExportPending] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const handleSectionDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over === null || active.id === over.id) return;
      actions.reorderSections(String(active.id), String(over.id));
    },
    [actions]
  );

  const handleSave = useCallback((): void => {
    saveListoFile(doc);
    // After an explicit save, drop the autosave — we're safe.
    void clearAutosave();
  }, [doc]);

  const handleLoad = useCallback(async (): Promise<void> => {
    const result = await loadListoFile();
    if (!result.success) {
      if ("cancelled" in result && result.cancelled) return;
      setExportError(result.error);
      return;
    }
    actions.replace({ ...result.data, source: "listo-file" });
  }, [actions]);

  const handleExportPdf = useCallback(async (): Promise<void> => {
    setExportPending(true);
    setExportError(null);
    try {
      // Lazy-load the PDF stack; it's heavy and only needed on export.
      const { generateAndDownloadPDF } = await import("../pdf/generator");
      const result = await generateAndDownloadPDF(doc);
      if (!result.success) {
        setExportError(result.error);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "PDF export failed.";
      setExportError(msg);
    } finally {
      setExportPending(false);
    }
  }, [doc]);

  const savedLabel = useMemo(() => {
    if (savedAt === null) return null;
    return `Autosaved ${savedAt.toLocaleTimeString()}`;
  }, [savedAt]);

  return (
    <div className="flex h-full min-h-screen flex-col bg-neutral-50">
      <Toolbar
        tripName={doc.meta.name}
        onSave={handleSave}
        onLoad={() => { void handleLoad(); }}
        onExportPdf={() => { void handleExportPdf(); }}
        exportPending={exportPending}
        exportError={exportError}
        savedLabel={savedLabel}
      />
      <TripHeader
        meta={doc.meta}
        onChange={(patch) => { actions.setMeta(patch); }}
      />

      <div className="flex-1 overflow-auto">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 p-6 lg:grid-cols-2">
          {/* ── Sections column ── */}
          <div>
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Sections
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleSectionDragEnd}
            >
              <SortableContext
                items={doc.sections.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {doc.sections.map((section) => (
                    <SortableSection key={section.id} section={section}>
                      {(dragHandleProps) => (
                        <SectionPanel
                          section={section}
                          onHeadingChange={(heading) => {
                            actions.setSectionHeading(section.id, heading);
                          }}
                          onBlockChange={(blockId, patch) => {
                            actions.updateBlock(section.id, blockId, patch);
                          }}
                          onBlockRemove={(blockId) => {
                            actions.removeBlock(section.id, blockId);
                          }}
                          onBlockAdd={() => {
                            actions.addBlock(section.id, newBlockFor(section));
                          }}
                          onBlockReorder={(fromId, toId) => {
                            actions.reorderBlocks(section.id, fromId, toId);
                          }}
                          sectionDragHandleProps={dragHandleProps}
                        />
                      )}
                    </SortableSection>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          {/* ── Days column ── */}
          <div>
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Daily Itinerary
            </div>
            <div className="space-y-4">
              {doc.days.length === 0 ? (
                <div className="rounded-md border border-dashed border-neutral-200 bg-white p-6 text-center text-sm text-neutral-400">
                  No days in this trip yet. Update the start and end dates above.
                </div>
              ) : (
                doc.days.map((day) => (
                  <DayPanel
                    key={day.id}
                    day={day}
                    onActivityChange={(activityId, patch) => {
                      actions.updateActivity(day.id, activityId, patch);
                    }}
                    onActivityRemove={(activityId) => {
                      actions.removeActivity(day.id, activityId);
                    }}
                    onActivityReorder={(fromId, toId) => {
                      actions.reorderActivities(day.id, fromId, toId);
                    }}
                    onActivityAdd={(activity) => {
                      actions.addActivity(day.id, activity);
                    }}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
