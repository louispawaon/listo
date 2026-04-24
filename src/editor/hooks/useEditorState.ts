/**
 * Central editor state hook.
 *
 * Wraps a `ListoDocument` in a typed reducer. All mutation happens through
 * named action methods returned by the hook. Every reorder operation
 * recomputes the affected `order` fields as a contiguous 0..n-1 integer
 * sequence (see plan invariant #3).
 */

import { useCallback, useMemo, useReducer } from "react";
import type {
  Activity,
  ListoBlock,
  ListoDocument,
  ListoFlightBlock,
  ListoHotelBlock,
  ListoNoteBlock,
  ListoPlaceBlock,
  ListoSection,
  ManualActivity,
  ManualActivityKind,
  TripDay,
  TripMeta,
} from "../../types/listo";
import { LISTO_ITINERARY_SORTABLE_ID } from "../../lib/paperLayout";

// ─── UUID ────────────────────────────────────────────────────────────────────

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

// ─── Order helpers ───────────────────────────────────────────────────────────

function reorderArray<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex) return items;
  if (fromIndex < 0 || fromIndex >= items.length) return items;
  if (toIndex < 0 || toIndex >= items.length) return items;
  const next = items.slice();
  const moved = next[fromIndex];
  if (moved === undefined) return items;
  next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function withOrder<T extends { order: number }>(items: T[]): T[] {
  return items.map((item, index) => ({ ...item, order: index }));
}

function indexOfId<T extends { id: string }>(items: readonly T[], id: string): number {
  return items.findIndex((item) => item.id === id);
}

// ─── Actions ─────────────────────────────────────────────────────────────────

type Action =
  | { kind: "setMeta"; patch: Partial<TripMeta> }
  | { kind: "setSectionHeading"; sectionId: string; heading: string }
  | { kind: "reorderPaperLayout"; orderedIds: string[] }
  | { kind: "addBlock"; sectionId: string; block: ListoBlock }
  | { kind: "updateBlock"; sectionId: string; blockId: string; patch: Partial<ListoBlock> }
  | { kind: "removeBlock"; sectionId: string; blockId: string }
  | { kind: "reorderBlocks"; sectionId: string; fromId: string; toId: string }
  | { kind: "addActivity"; dayId: string; activity: Activity }
  | { kind: "updateActivity"; dayId: string; activityId: string; patch: Partial<ManualActivity> }
  | { kind: "removeActivity"; dayId: string; activityId: string }
  | { kind: "reorderActivities"; dayId: string; fromId: string; toId: string }
  | {
      kind: "moveActivity";
      fromDayId: string;
      toDayId: string;
      activityId: string;
      /** Target index within destination day. Clamped to [0, dest.length]. */
      toIndex: number;
    }
  | { kind: "replace"; doc: ListoDocument };

function mergeBlock(existing: ListoBlock, patch: Partial<ListoBlock>): ListoBlock {
  // We branch on the original block's `type` so the union stays sound — a
  // patch coming from a narrowed update call matches one of these shapes.
  switch (existing.type) {
    case "flight":
      return { ...existing, ...(patch as Partial<ListoFlightBlock>), type: "flight" };
    case "hotel":
      return { ...existing, ...(patch as Partial<ListoHotelBlock>), type: "hotel" };
    case "place":
      return { ...existing, ...(patch as Partial<ListoPlaceBlock>), type: "place" };
    case "note":
      return { ...existing, ...(patch as Partial<ListoNoteBlock>), type: "note" };
  }
}

function mergeActivity(existing: Activity, patch: Partial<ManualActivity>): Activity {
  if (existing.source === "auto") {
    // Auto-activities don't accept manual patches; they're derived from blocks.
    return existing;
  }
  return { ...existing, ...patch, source: "manual" };
}

function updateSection(
  sections: ListoSection[],
  sectionId: string,
  updater: (section: ListoSection) => ListoSection
): ListoSection[] {
  return sections.map((section) => (section.id === sectionId ? updater(section) : section));
}

function updateDay(
  days: TripDay[],
  dayId: string,
  updater: (day: TripDay) => TripDay
): TripDay[] {
  return days.map((day) => (day.id === dayId ? updater(day) : day));
}

function reducer(state: ListoDocument, action: Action): ListoDocument {
  switch (action.kind) {
    case "setMeta":
      return { ...state, meta: { ...state.meta, ...action.patch } };

    case "setSectionHeading":
      return {
        ...state,
        sections: updateSection(state.sections, action.sectionId, (section) => ({
          ...section,
          heading: action.heading,
        })),
      };

    case "reorderPaperLayout": {
      const orderedIds = action.orderedIds;
      const itinIdx = orderedIds.indexOf(LISTO_ITINERARY_SORTABLE_ID);
      if (itinIdx === -1) return state;

      const sectionIds = orderedIds.filter((id) => id !== LISTO_ITINERARY_SORTABLE_ID);
      if (sectionIds.length !== state.sections.length) return state;

      const expected = new Set(state.sections.map((s) => s.id));
      for (const id of sectionIds) {
        if (!expected.delete(id)) return state;
      }
      if (expected.size !== 0) return state;

      const nextSections = sectionIds
        .map((id) => state.sections.find((s) => s.id === id))
        .filter((s): s is ListoSection => s !== undefined);
      if (nextSections.length !== state.sections.length) return state;

      return {
        ...state,
        sections: withOrder(nextSections),
        itineraryIndex: itinIdx,
      };
    }

    case "addBlock":
      return {
        ...state,
        sections: updateSection(state.sections, action.sectionId, (section) => {
          const nextBlocks = [...section.blocks, { ...action.block, order: section.blocks.length }];
          return { ...section, blocks: withOrder(nextBlocks) };
        }),
      };

    case "updateBlock":
      return {
        ...state,
        sections: updateSection(state.sections, action.sectionId, (section) => ({
          ...section,
          blocks: section.blocks.map((block) =>
            block.id === action.blockId ? mergeBlock(block, action.patch) : block
          ),
        })),
      };

    case "removeBlock":
      return {
        ...state,
        sections: updateSection(state.sections, action.sectionId, (section) => ({
          ...section,
          blocks: withOrder(section.blocks.filter((block) => block.id !== action.blockId)),
        })),
      };

    case "reorderBlocks": {
      return {
        ...state,
        sections: updateSection(state.sections, action.sectionId, (section) => {
          const fromIndex = indexOfId(section.blocks, action.fromId);
          const toIndex = indexOfId(section.blocks, action.toId);
          if (fromIndex === -1 || toIndex === -1) return section;
          const next = reorderArray(section.blocks, fromIndex, toIndex);
          return { ...section, blocks: withOrder(next) };
        }),
      };
    }

    case "addActivity":
      return {
        ...state,
        days: updateDay(state.days, action.dayId, (day) => {
          const nextActivities = [
            ...day.activities,
            { ...action.activity, order: day.activities.length },
          ];
          return { ...day, activities: withOrder(nextActivities) };
        }),
      };

    case "updateActivity":
      return {
        ...state,
        days: updateDay(state.days, action.dayId, (day) => ({
          ...day,
          activities: day.activities.map((activity) =>
            activity.id === action.activityId ? mergeActivity(activity, action.patch) : activity
          ),
        })),
      };

    case "removeActivity":
      return {
        ...state,
        days: updateDay(state.days, action.dayId, (day) => ({
          ...day,
          activities: withOrder(
            day.activities.filter((activity) => activity.id !== action.activityId)
          ),
        })),
      };

    case "reorderActivities": {
      return {
        ...state,
        days: updateDay(state.days, action.dayId, (day) => {
          const fromIndex = indexOfId(day.activities, action.fromId);
          const toIndex = indexOfId(day.activities, action.toId);
          if (fromIndex === -1 || toIndex === -1) return day;
          const next = reorderArray(day.activities, fromIndex, toIndex);
          return { ...day, activities: withOrder(next) };
        }),
      };
    }

    case "moveActivity": {
      // Same-day moves route through reorderActivities. This action is for
      // cross-day DnD only; if called with the same from/to day we still
      // handle it correctly (clamped insertion index) but it's redundant.
      const fromDay = state.days.find((d) => d.id === action.fromDayId);
      if (fromDay === undefined) return state;
      const activity = fromDay.activities.find((a) => a.id === action.activityId);
      if (activity === undefined) return state;

      if (action.fromDayId === action.toDayId) {
        // Intra-day reorder to a specific index.
        return {
          ...state,
          days: updateDay(state.days, action.fromDayId, (day) => {
            const fromIndex = indexOfId(day.activities, action.activityId);
            if (fromIndex === -1) return day;
            const clamped = Math.max(0, Math.min(action.toIndex, day.activities.length - 1));
            const next = reorderArray(day.activities, fromIndex, clamped);
            return { ...day, activities: withOrder(next) };
          }),
        };
      }

      // Cross-day: remove from source, insert into destination.
      return {
        ...state,
        days: state.days.map((day) => {
          if (day.id === action.fromDayId) {
            return {
              ...day,
              activities: withOrder(
                day.activities.filter((a) => a.id !== action.activityId)
              ),
            };
          }
          if (day.id === action.toDayId) {
            const clamped = Math.max(0, Math.min(action.toIndex, day.activities.length));
            const next = day.activities.slice();
            // Insert at clamped index. `activity` keeps its id, blockRef, kind,
            // label, time, notes — only its `order` is recomputed by withOrder.
            next.splice(clamped, 0, activity);
            return { ...day, activities: withOrder(next) };
          }
          return day;
        }),
      };
    }

    case "replace":
      return action.doc;
  }
}

// ─── Factory helpers (used by components) ────────────────────────────────────

export function createManualActivity(input: {
  kind: ManualActivityKind;
  label: string;
  time: string | undefined;
  notes: string | undefined;
}): ManualActivity {
  return {
    id: uuid(),
    source: "manual",
    order: 0,
    kind: input.kind,
    label: input.label,
    time: input.time,
    notes: input.notes,
  };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface EditorActions {
  setMeta: (patch: Partial<TripMeta>) => void;
  setSectionHeading: (sectionId: string, heading: string) => void;
  reorderPaperLayout: (orderedIds: string[]) => void;
  addBlock: (sectionId: string, block: ListoBlock) => void;
  updateBlock: (sectionId: string, blockId: string, patch: Partial<ListoBlock>) => void;
  removeBlock: (sectionId: string, blockId: string) => void;
  reorderBlocks: (sectionId: string, fromId: string, toId: string) => void;
  addActivity: (dayId: string, activity: Activity) => void;
  updateActivity: (
    dayId: string,
    activityId: string,
    patch: Partial<ManualActivity>
  ) => void;
  removeActivity: (dayId: string, activityId: string) => void;
  reorderActivities: (dayId: string, fromId: string, toId: string) => void;
  moveActivity: (
    fromDayId: string,
    toDayId: string,
    activityId: string,
    toIndex: number
  ) => void;
  replace: (doc: ListoDocument) => void;
}

export function useEditorState(initial: ListoDocument): {
  doc: ListoDocument;
  actions: EditorActions;
} {
  const [doc, dispatch] = useReducer(reducer, initial);

  const setMeta = useCallback(
    (patch: Partial<TripMeta>) => { dispatch({ kind: "setMeta", patch }); },
    []
  );
  const setSectionHeading = useCallback(
    (sectionId: string, heading: string) => { dispatch({ kind: "setSectionHeading", sectionId, heading }); },
    []
  );
  const reorderPaperLayout = useCallback(
    (orderedIds: string[]) => { dispatch({ kind: "reorderPaperLayout", orderedIds }); },
    []
  );
  const addBlock = useCallback(
    (sectionId: string, block: ListoBlock) => { dispatch({ kind: "addBlock", sectionId, block }); },
    []
  );
  const updateBlock = useCallback(
    (sectionId: string, blockId: string, patch: Partial<ListoBlock>) => {
      dispatch({ kind: "updateBlock", sectionId, blockId, patch });
    },
    []
  );
  const removeBlock = useCallback(
    (sectionId: string, blockId: string) => { dispatch({ kind: "removeBlock", sectionId, blockId }); },
    []
  );
  const reorderBlocks = useCallback(
    (sectionId: string, fromId: string, toId: string) => {
      dispatch({ kind: "reorderBlocks", sectionId, fromId, toId });
    },
    []
  );
  const addActivity = useCallback(
    (dayId: string, activity: Activity) => { dispatch({ kind: "addActivity", dayId, activity }); },
    []
  );
  const updateActivity = useCallback(
    (dayId: string, activityId: string, patch: Partial<ManualActivity>) => {
      dispatch({ kind: "updateActivity", dayId, activityId, patch });
    },
    []
  );
  const removeActivity = useCallback(
    (dayId: string, activityId: string) => { dispatch({ kind: "removeActivity", dayId, activityId }); },
    []
  );
  const reorderActivities = useCallback(
    (dayId: string, fromId: string, toId: string) => {
      dispatch({ kind: "reorderActivities", dayId, fromId, toId });
    },
    []
  );
  const moveActivity = useCallback(
    (fromDayId: string, toDayId: string, activityId: string, toIndex: number) => {
      dispatch({ kind: "moveActivity", fromDayId, toDayId, activityId, toIndex });
    },
    []
  );
  const replace = useCallback(
    (next: ListoDocument) => { dispatch({ kind: "replace", doc: next }); },
    []
  );

  const actions = useMemo<EditorActions>(
    () => ({
      setMeta,
      setSectionHeading,
      reorderPaperLayout,
      addBlock,
      updateBlock,
      removeBlock,
      reorderBlocks,
      addActivity,
      updateActivity,
      removeActivity,
      reorderActivities,
      moveActivity,
      replace,
    }),
    [
      setMeta,
      setSectionHeading,
      reorderPaperLayout,
      addBlock,
      updateBlock,
      removeBlock,
      reorderBlocks,
      addActivity,
      updateActivity,
      removeActivity,
      reorderActivities,
      moveActivity,
      replace,
    ]
  );

  return { doc, actions };
}
