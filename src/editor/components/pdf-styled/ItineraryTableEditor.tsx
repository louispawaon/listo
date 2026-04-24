import React, { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
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
} from "../../../types/listo";
import { InlineInput, InlineSelect, InlineTextarea } from "../InlineEdit";

const MANUAL_KIND_OPTIONS: readonly { value: ManualActivityKind; label: string }[] = [
  { value: "activity", label: "Activity" },
  { value: "meal", label: "Meal" },
  { value: "transport", label: "Transport" },
  { value: "note", label: "Note" },
] as const;

/**
 * Daily itinerary table — the centerpiece of the WYSIWYG editor.
 *
 * Matches the PDF's `ItineraryTableView`:
 *   - header row: Time / Kind / Activity (uppercase eyebrows, surface bg)
 *   - per-day group row (surface background, bold day label)
 *   - activity rows with time / kind / label+notes
 *
 * DnD is multi-container: a single outer `DndContext` spans *all* days so an
 * activity can be dragged from one day into another. Each day is a
 * `SortableContext` (plus a droppable for empty days). On drag end we pick
 * between `reorderActivities` (same day) and `moveActivity` (cross day).
 */

interface ItineraryTableEditorProps {
  days: TripDay[];
  onActivityChange: (
    dayId: string,
    activityId: string,
    patch: Partial<ManualActivity>
  ) => void;
  onActivityRemove: (dayId: string, activityId: string) => void;
  onActivityReorder: (dayId: string, fromId: string, toId: string) => void;
  onActivityMove: (
    fromDayId: string,
    toDayId: string,
    activityId: string,
    toIndex: number
  ) => void;
  onActivityAdd: (dayId: string) => void;
}

/** Activities are keyed by id only; we store `dayId` alongside for lookup. */
interface ActivityLocation {
  dayId: string;
  index: number;
}

function buildLocationMap(days: TripDay[]): Map<string, ActivityLocation> {
  const m = new Map<string, ActivityLocation>();
  for (const day of days) {
    day.activities.forEach((a, index) => {
      m.set(a.id, { dayId: day.id, index });
    });
  }
  return m;
}

/**
 * Live "projected" cross-day move. While the user is dragging an activity
 * over another day, we apply this locally to produce a `displayDays` that
 * reflects where the row will land — the dragged row visually relocates
 * into the target day and existing rows there shift to make room, exactly
 * like within-day sortable feedback. We only commit to the reducer on
 * drag end.
 */
interface PendingMove {
  activityId: string;
  fromDayId: string;
  toDayId: string;
  toIndex: number;
}

function applyPendingMove(days: TripDay[], move: PendingMove): TripDay[] {
  const fromDay = days.find((d) => d.id === move.fromDayId);
  if (fromDay === undefined) return days;
  const activity = fromDay.activities.find((a) => a.id === move.activityId);
  if (activity === undefined) return days;
  return days.map((day) => {
    const withoutActive = day.activities.filter((a) => a.id !== move.activityId);
    if (day.id !== move.toDayId) {
      return { ...day, activities: withoutActive };
    }
    const clamped = Math.max(0, Math.min(move.toIndex, withoutActive.length));
    const activities = [
      ...withoutActive.slice(0, clamped),
      activity,
      ...withoutActive.slice(clamped),
    ];
    return { ...day, activities };
  });
}

export function ItineraryTableEditor({
  days,
  onActivityChange,
  onActivityRemove,
  onActivityReorder,
  onActivityMove,
  onActivityAdd,
}: ItineraryTableEditorProps): React.ReactElement {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const [activeActivityId, setActiveActivityId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);

  // Projected view of `days` during drag. When a cross-day hover is in
  // progress, the dragged row is virtually relocated into the target day
  // so SortableContext animates neighbours to make room — the same
  // feedback we already get for intra-day drags.
  const displayDays = useMemo<TripDay[]>(() => {
    if (pendingMove === null) return days;
    return applyPendingMove(days, pendingMove);
  }, [days, pendingMove]);

  const handleDragStart = (event: DragStartEvent): void => {
    setActiveActivityId(String(event.active.id));
    setPendingMove(null);
  };

  const handleDragOver = (event: DragOverEvent): void => {
    const { active, over } = event;
    if (over === null) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    // Origin is read from the stable `days` prop (reducer doesn't run mid-drag).
    const originLocs = buildLocationMap(days);
    const originLoc = originLocs.get(activeId);
    if (originLoc === undefined) return;

    // Target day + index is read from the projected view so the hover
    // target stays consistent as pendingMove updates.
    const displayLocs = buildLocationMap(displayDays);

    let toDayId: string;
    let toIndex: number;

    if (overId.startsWith("day:")) {
      toDayId = overId.slice("day:".length);
      const toDay = displayDays.find((d) => d.id === toDayId);
      toIndex = toDay === undefined ? 0 : toDay.activities.length;
    } else {
      const overLoc = displayLocs.get(overId);
      if (overLoc === undefined) return;
      toDayId = overLoc.dayId;
      toIndex = overLoc.index;
    }

    // Hovering back over origin day → let SortableContext's native
    // reorder animation handle it, drop the pending cross-day projection.
    if (toDayId === originLoc.dayId) {
      if (pendingMove !== null) setPendingMove(null);
      return;
    }

    setPendingMove((prev) => {
      if (
        prev !== null &&
        prev.activityId === activeId &&
        prev.toDayId === toDayId &&
        prev.toIndex === toIndex
      ) {
        return prev;
      }
      return {
        activityId: activeId,
        fromDayId: originLoc.dayId,
        toDayId,
        toIndex,
      };
    });
  };

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    const activeId = String(active.id);

    const committed = pendingMove;
    setActiveActivityId(null);
    setPendingMove(null);

    // Cross-day: the projected position is the drop.
    if (committed !== null) {
      onActivityMove(
        committed.fromDayId,
        committed.toDayId,
        activeId,
        committed.toIndex
      );
      return;
    }

    // Otherwise fall back to same-day reorder based on origin view.
    if (over === null) return;
    const overId = String(over.id);
    if (activeId === overId) return;
    if (overId.startsWith("day:")) return;

    const originLocs = buildLocationMap(days);
    const activeLoc = originLocs.get(activeId);
    const overLoc = originLocs.get(overId);
    if (activeLoc === undefined || overLoc === undefined) return;
    if (activeLoc.dayId !== overLoc.dayId) return;

    onActivityReorder(activeLoc.dayId, activeId, overId);
  };

  const handleDragCancel = (): void => {
    setActiveActivityId(null);
    setPendingMove(null);
  };

  return (
    <div style={{ borderTop: "1pt solid var(--c-rule)" }}>
      <TableHeader />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {displayDays.map((day) => (
          <DayGroup
            key={day.id}
            day={day}
            activeActivityId={activeActivityId}
            onActivityChange={onActivityChange}
            onActivityRemove={onActivityRemove}
            onActivityAdd={onActivityAdd}
          />
        ))}
      </DndContext>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function TableHeader(): React.ReactElement {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        backgroundColor: "var(--c-surface-dark)",
        borderBottom: "1pt solid var(--c-rule)",
        paddingTop: "6pt",
        paddingBottom: "6pt",
        paddingLeft: "8pt",
        paddingRight: "8pt",
      }}
    >
      <HeaderCell width="60pt">Time</HeaderCell>
      <HeaderCell width="72pt">Kind</HeaderCell>
      <HeaderCell flex>Activity</HeaderCell>
    </div>
  );
}

interface HeaderCellProps {
  width?: string;
  flex?: boolean;
  children: React.ReactNode;
}

function HeaderCell({ width, flex, children }: HeaderCellProps): React.ReactElement {
  return (
    <div
      style={{
        width,
        flex: flex === true ? 1 : undefined,
        fontSize: "7.5pt",
        letterSpacing: "1pt",
        textTransform: "uppercase",
        color: "var(--c-mid-gray)",
      }}
    >
      {children}
    </div>
  );
}

// ─── Day group (drop target + sortable list of activities) ───────────────────

interface DayGroupProps {
  day: TripDay;
  activeActivityId: string | null;
  onActivityChange: (
    dayId: string,
    activityId: string,
    patch: Partial<ManualActivity>
  ) => void;
  onActivityRemove: (dayId: string, activityId: string) => void;
  onActivityAdd: (dayId: string) => void;
}

function DayGroup({
  day,
  activeActivityId,
  onActivityChange,
  onActivityRemove,
  onActivityAdd,
}: DayGroupProps): React.ReactElement {
  // Droppable zone for empty days (and as a fallback target for the day
  // when dropping past the last activity).
  const { setNodeRef: setEmptyRef, isOver: isEmptyOver } = useDroppable({
    id: `day:${day.id}`,
  });

  const isDraggingIntoEmpty =
    isEmptyOver && activeActivityId !== null && day.activities.length === 0;

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "var(--c-surface)",
          borderBottom: "1pt solid var(--c-rule)",
          paddingTop: "6pt",
          paddingBottom: "6pt",
          paddingLeft: "8pt",
          paddingRight: "8pt",
        }}
      >
        <div
          style={{
            flex: 1,
            fontSize: "9pt",
            fontWeight: 700,
            color: "var(--c-black)",
          }}
        >
          {day.label}
          {day.date !== null && (
            <span
              style={{
                fontSize: "7.5pt",
                fontWeight: 400,
                color: "var(--c-light-gray)",
                marginLeft: "8pt",
                letterSpacing: "0.8pt",
                textTransform: "uppercase",
              }}
            >
              {day.date}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            onActivityAdd(day.id);
          }}
          className="rounded border border-dashed border-neutral-300 px-2 py-0.5 text-[8pt] font-medium uppercase tracking-wider text-neutral-500 hover:border-neutral-500 hover:text-neutral-900"
        >
          + Add
        </button>
      </div>

      <SortableContext
        items={day.activities.map((a) => a.id)}
        strategy={verticalListSortingStrategy}
      >
        {day.activities.length === 0 ? (
          <div
            ref={setEmptyRef}
            className={isDraggingIntoEmpty ? "listo-drop-target" : ""}
            style={{
              paddingTop: "6pt",
              paddingBottom: "6pt",
              paddingLeft: "8pt",
              paddingRight: "8pt",
              fontSize: "8.5pt",
              color: "var(--c-light-gray)",
              fontStyle: "italic",
              borderBottom: "1pt solid var(--c-rule-light)",
            }}
          >
            No activities planned.
          </div>
        ) : (
          day.activities.map((activity) => (
            <ActivityTableRow
              key={activity.id}
              activity={activity}
              onChange={(patch) => {
                onActivityChange(day.id, activity.id, patch);
              }}
              onRemove={() => {
                onActivityRemove(day.id, activity.id);
              }}
            />
          ))
        )}
      </SortableContext>
    </>
  );
}

// ─── Activity row (one inside a day) ─────────────────────────────────────────

interface ActivityTableRowProps {
  activity: Activity;
  onChange: (patch: Partial<ManualActivity>) => void;
  onRemove: () => void;
}

function ActivityTableRow({
  activity,
  onChange,
  onRemove,
}: ActivityTableRowProps): React.ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: activity.id,
  });

  const isAuto = activity.source === "auto";

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    display: "flex",
    flexDirection: "row",
    borderBottom: "1pt solid var(--c-rule-light)",
    paddingTop: "7pt",
    paddingBottom: "7pt",
    paddingLeft: "8pt",
    paddingRight: "8pt",
    backgroundColor: isDragging ? "var(--c-surface)" : "transparent",
  };

  return (
    <div ref={setNodeRef} style={style} className="group/row relative">
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to move activity"
        className="absolute -left-6 top-2 cursor-grab touch-none text-neutral-300 opacity-0 transition-opacity hover:text-neutral-600 group-hover/row:opacity-100"
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

      {/* Time */}
      <div
        style={{
          width: "60pt",
          fontSize: "8.5pt",
          color: "var(--c-dark-gray)",
          flexShrink: 0,
        }}
      >
        {isAuto ? (
          <span>{activity.time ?? "—"}</span>
        ) : (
          <InlineInput
            type="time"
            value={activity.time ?? ""}
            onChange={(value) => {
              const next = value.trim() === "" ? undefined : value;
              onChange({ time: next });
            }}
            ariaLabel="Time"
          />
        )}
      </div>

      {/* Kind */}
      <div
        style={{
          width: "72pt",
          fontSize: "8.5pt",
          color: "var(--c-mid-gray)",
          flexShrink: 0,
        }}
      >
        {isAuto ? (
          <span style={{ textTransform: "capitalize" }}>{activity.kind}</span>
        ) : (
          <InlineSelect<ManualActivityKind>
            value={activity.kind}
            onChange={(kind) => {
              onChange({ kind });
            }}
            options={MANUAL_KIND_OPTIONS}
            ariaLabel="Activity kind"
          />
        )}
      </div>

      {/* Label + optional notes */}
      <div
        style={{
          flex: 1,
          fontSize: "9pt",
          color: "var(--c-black)",
          lineHeight: 1.35,
          minWidth: 0,
        }}
      >
        {isAuto ? (
          <div>
            <div>{activity.label}</div>
            <div
              style={{
                fontSize: "7pt",
                color: "var(--c-light-gray)",
                fontStyle: "italic",
                marginTop: "2pt",
              }}
            >
              Edit via the source block in the sections above
            </div>
          </div>
        ) : (
          <>
            <InlineInput
              value={activity.label}
              onChange={(label) => {
                onChange({ label });
              }}
              placeholder="Activity label"
              ariaLabel="Activity label"
            />
            <div
              style={{
                fontSize: "8pt",
                color: "var(--c-mid-gray)",
                marginTop: "2pt",
                fontStyle: "italic",
              }}
            >
              <InlineTextarea
                value={activity.notes ?? ""}
                onChange={(value) => {
                  const next = value.trim() === "" ? undefined : value;
                  onChange({ notes: next });
                }}
                placeholder="Notes (optional)"
                ariaLabel="Notes"
              />
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove activity"
        className="absolute -right-6 top-2 text-neutral-300 opacity-0 transition-opacity hover:text-red-600 group-hover/row:opacity-100"
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
