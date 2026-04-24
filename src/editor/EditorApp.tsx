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
  arrayMove,
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
  TripMeta,
} from "../types/listo";
import { Toolbar, type ZoomLevel } from "./components/Toolbar";
import { PaperCanvas } from "./components/PaperCanvas";
import { CoverHeader } from "./components/pdf-styled/CoverHeader";
import { SummaryBar } from "./components/pdf-styled/SummaryBar";
import { SectionBlock, AddButton } from "./components/pdf-styled/SectionBlock";
import { SectionContent } from "./components/pdf-styled/SectionContent";
import { ItineraryTableEditor } from "./components/pdf-styled/ItineraryTableEditor";
import { useEditorState, createManualActivity } from "./hooks/useEditorState";
import { useAutoSave } from "./hooks/useAutoSave";
import { loadListoFile, saveListoFile } from "./hooks/useListoFile";
import { clearAutosave } from "./storage";
import {
  buildPaperSortIds,
  LISTO_ITINERARY_SORTABLE_ID,
} from "../lib/paperLayout";

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

function addButtonLabelFor(kind: ListoSection["kind"]): string {
  switch (kind) {
    case "flights":
      return "+ Flight";
    case "hotels":
      return "+ Hotel";
    case "places":
      return "+ Place";
    case "notes":
      return "+ Note";
  }
}

function emptyHintFor(kind: ListoSection["kind"]): string {
  switch (kind) {
    case "flights":
      return "No flights recorded. Click + Flight to add one.";
    case "hotels":
      return "No hotels recorded. Click + Hotel to add one.";
    case "places":
      return "No places recorded. Click + Place to add one.";
    case "notes":
      return "No notes recorded. Click + Note to add one.";
  }
}

// ─── Sortable wrapper for section-level DnD ──────────────────────────────────

interface SortableSectionProps {
  id: string;
  children: (
    dragHandleProps: React.HTMLAttributes<HTMLButtonElement>
  ) => React.ReactNode;
}

function SortableSection({ id, children }: SortableSectionProps): React.ReactElement {
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

// ─── EditorApp ───────────────────────────────────────────────────────────────

export function EditorApp({ initialDoc }: EditorAppProps): React.ReactElement {
  const { doc, actions } = useEditorState(initialDoc);
  const { savedAt } = useAutoSave(doc);

  const [exportPending, setExportPending] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<ZoomLevel>(1);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const paperSortIds = useMemo(() => buildPaperSortIds(doc), [doc]);

  const handleSectionDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over === null || active.id === over.id) return;
    const oldIndex = paperSortIds.indexOf(String(active.id));
    const newIndex = paperSortIds.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    actions.reorderPaperLayout(arrayMove(paperSortIds, oldIndex, newIndex));
  }, [actions, paperSortIds]);

  const handleSave = useCallback((): void => {
    saveListoFile(doc);
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

  const handleMetaChange = useCallback(
    (patch: Partial<TripMeta>) => {
      actions.setMeta(patch);
    },
    [actions]
  );

  const handleActivityAdd = useCallback(
    (dayId: string) => {
      const blank = createManualActivity({
        kind: "activity",
        label: "",
        time: undefined,
        notes: undefined,
      });
      actions.addActivity(dayId, blank);
    },
    [actions]
  );

  const savedLabel = useMemo(() => {
    if (savedAt === null) return null;
    return `Autosaved ${savedAt.toLocaleTimeString()}`;
  }, [savedAt]);

  return (
    <div className="flex h-full min-h-screen flex-col bg-neutral-100">
      <Toolbar
        tripName={doc.meta.name}
        onSave={handleSave}
        onLoad={() => {
          void handleLoad();
        }}
        onExportPdf={() => {
          void handleExportPdf();
        }}
        exportPending={exportPending}
        exportError={exportError}
        savedLabel={savedLabel}
        zoom={zoom}
        onZoomChange={setZoom}
      />

      <div className="flex-1 overflow-auto">
        <PaperCanvas zoom={zoom}>
          <CoverHeader meta={doc.meta} onChange={handleMetaChange} />
          <SummaryBar doc={doc} onMetaChange={handleMetaChange} />

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleSectionDragEnd}
          >
            <SortableContext
              items={paperSortIds}
              strategy={verticalListSortingStrategy}
            >
              {paperSortIds.map((sortId) => {
                if (sortId === LISTO_ITINERARY_SORTABLE_ID) {
                  return (
                    <SortableSection key={sortId} id={sortId}>
                      {(dragHandleProps) => (
                        <SectionBlock
                          heading="Daily Itinerary"
                          onHeadingChange={() => {}}
                          headingReadOnly
                          isEmpty={doc.days.length === 0}
                          emptyHint="No daily itinerary entries. Set trip dates above to generate days."
                          dragHandleProps={dragHandleProps}
                        >
                          <ItineraryTableEditor
                            days={doc.days}
                            onActivityChange={(dayId, activityId, patch) => {
                              actions.updateActivity(dayId, activityId, patch);
                            }}
                            onActivityRemove={(dayId, activityId) => {
                              actions.removeActivity(dayId, activityId);
                            }}
                            onActivityReorder={(dayId, fromId, toId) => {
                              actions.reorderActivities(dayId, fromId, toId);
                            }}
                            onActivityMove={(fromDayId, toDayId, activityId, toIndex) => {
                              actions.moveActivity(fromDayId, toDayId, activityId, toIndex);
                            }}
                            onActivityAdd={handleActivityAdd}
                          />
                        </SectionBlock>
                      )}
                    </SortableSection>
                  );
                }
                const section = doc.sections.find((s) => s.id === sortId);
                if (section === undefined) return null;
                return (
                  <SortableSection key={section.id} id={section.id}>
                    {(dragHandleProps) => (
                      <SectionBlock
                        heading={section.heading}
                        onHeadingChange={(heading) => {
                          actions.setSectionHeading(section.id, heading);
                        }}
                        isEmpty={section.blocks.length === 0}
                        emptyHint={emptyHintFor(section.kind)}
                        dragHandleProps={dragHandleProps}
                        actions={
                          <AddButton
                            onClick={() => {
                              actions.addBlock(section.id, newBlockFor(section));
                            }}
                          >
                            {addButtonLabelFor(section.kind)}
                          </AddButton>
                        }
                      >
                        <SectionContent
                          section={section}
                          onBlockChange={(blockId, patch) => {
                            actions.updateBlock(section.id, blockId, patch);
                          }}
                          onBlockRemove={(blockId) => {
                            actions.removeBlock(section.id, blockId);
                          }}
                          onBlockReorder={(fromId, toId) => {
                            actions.reorderBlocks(section.id, fromId, toId);
                          }}
                        />
                      </SectionBlock>
                    )}
                  </SortableSection>
                );
              })}
            </SortableContext>
          </DndContext>
        </PaperCanvas>
      </div>
    </div>
  );
}
