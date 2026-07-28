/**
 * Merges a fresh Wanderlog extraction into the current editor document.
 *
 * Updates matched blocks/activities, appends new Wanderlog entries, and preserves
 * user-added content, Notes, layout order, and custom headings.
 */

import type {
  Activity,
  ListoBlock,
  ListoDocument,
  ListoFlightBlock,
  ListoFlightSyncSnapshot,
  ListoHotelBlock,
  ListoHotelSyncSnapshot,
  ListoPlaceBlock,
  ListoPlaceSyncSnapshot,
  ListoSection,
  ListoSectionKind,
  ManualActivity,
  ManualActivitySyncSnapshot,
  TripDay,
  TripMetaSyncSnapshot,
} from "../types/listo";
import {
  adjustItineraryIndexAfterSectionRemoval,
  sectionsInPaperOrder,
} from "./paperLayout";

export interface MergeSummary {
  addedBlocks: number;
  updatedBlocks: number;
  removedBlocks: number;
  addedActivities: number;
  updatedActivities: number;
  removedActivities: number;
  addedDays: number;
}

function withOrder<T extends { order: number }>(items: T[]): T[] {
  return items.map((item, index) => ({ ...item, order: index }));
}

function valuesEqual<T>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** 3-way merge: keep local edits, apply Wanderlog updates to untouched fields. */
function pickSyncedValue<T>(current: T, lastSynced: T | undefined, fresh: T): T {
  if (lastSynced === undefined) {
    return current;
  }
  if (valuesEqual(current, lastSynced)) {
    return fresh;
  }
  return current;
}

function flightSyncSnapshot(block: ListoFlightBlock): ListoFlightSyncSnapshot {
  return {
    airline: block.airline,
    flightNumber: block.flightNumber,
    depart: { ...block.depart },
    arrive: { ...block.arrive },
  };
}

function hotelSyncSnapshot(block: ListoHotelBlock): ListoHotelSyncSnapshot {
  return {
    name: block.name,
    address: block.address,
    checkIn: block.checkIn,
    checkOut: block.checkOut,
    confirmationNumber: block.confirmationNumber,
    phone: block.phone,
    website: block.website,
  };
}

function placeSyncSnapshot(block: ListoPlaceBlock): ListoPlaceSyncSnapshot {
  return {
    name: block.name,
    address: block.address,
    rating: block.rating,
  };
}

function activitySyncSnapshot(activity: ManualActivity): ManualActivitySyncSnapshot {
  return {
    kind: activity.kind,
    label: activity.label,
    time: activity.time,
  };
}

function getSectionByKind(
  sections: ListoSection[],
  kind: ListoSectionKind
): ListoSection | undefined {
  return sections.find((s) => s.kind === kind);
}

function mergeFlightBlock(
  current: ListoFlightBlock,
  fresh: ListoFlightBlock
): ListoFlightBlock {
  const snap = current.lastSynced;
  const freshSnap = flightSyncSnapshot(fresh);
  return {
    ...current,
    airline: pickSyncedValue(current.airline, snap?.airline, fresh.airline),
    flightNumber: pickSyncedValue(current.flightNumber, snap?.flightNumber, fresh.flightNumber),
    depart: pickSyncedValue(current.depart, snap?.depart, fresh.depart),
    arrive: pickSyncedValue(current.arrive, snap?.arrive, fresh.arrive),
    lastSynced: freshSnap,
  };
}

function mergeHotelBlock(
  current: ListoHotelBlock,
  fresh: ListoHotelBlock
): ListoHotelBlock {
  const snap = current.lastSynced;
  const freshSnap = hotelSyncSnapshot(fresh);
  return {
    ...current,
    name: pickSyncedValue(current.name, snap?.name, fresh.name),
    address: pickSyncedValue(current.address, snap?.address, fresh.address),
    checkIn: pickSyncedValue(current.checkIn, snap?.checkIn, fresh.checkIn),
    checkOut: pickSyncedValue(current.checkOut, snap?.checkOut, fresh.checkOut),
    confirmationNumber: pickSyncedValue(
      current.confirmationNumber,
      snap?.confirmationNumber,
      fresh.confirmationNumber
    ),
    phone: pickSyncedValue(current.phone, snap?.phone, fresh.phone),
    website: pickSyncedValue(current.website, snap?.website, fresh.website),
    lastSynced: freshSnap,
  };
}

function mergePlaceBlock(
  current: ListoPlaceBlock,
  fresh: ListoPlaceBlock
): ListoPlaceBlock {
  const snap = current.lastSynced;
  const freshSnap = placeSyncSnapshot(fresh);
  return {
    ...current,
    name: pickSyncedValue(current.name, snap?.name, fresh.name),
    address: pickSyncedValue(current.address, snap?.address, fresh.address),
    rating: pickSyncedValue(current.rating, snap?.rating, fresh.rating),
    lastSynced: freshSnap,
  };
}

function blocksEqual(a: ListoBlock, b: ListoBlock): boolean {
  if (a.type !== b.type) return false;
  switch (a.type) {
    case "flight":
      return (
        b.type === "flight" &&
        a.airline === b.airline &&
        a.flightNumber === b.flightNumber &&
        JSON.stringify(a.depart) === JSON.stringify(b.depart) &&
        JSON.stringify(a.arrive) === JSON.stringify(b.arrive)
      );
    case "hotel":
      return (
        b.type === "hotel" &&
        a.name === b.name &&
        a.address === b.address &&
        a.checkIn === b.checkIn &&
        a.checkOut === b.checkOut &&
        a.confirmationNumber === b.confirmationNumber &&
        a.phone === b.phone &&
        a.website === b.website
      );
    case "place":
      return (
        b.type === "place" &&
        a.name === b.name &&
        a.address === b.address &&
        a.rating === b.rating
      );
    case "note":
      return b.type === "note" && a.title === b.title && a.content === b.content;
  }
}

function mergeWanderlogBlocks(
  currentBlocks: ListoBlock[],
  freshBlocks: ListoBlock[]
): { blocks: ListoBlock[]; added: number; updated: number; removed: number } {
  const freshByWanderlogId = new Map<number, ListoBlock>();
  for (const block of freshBlocks) {
    if (
      block.type !== "note" &&
      block.wanderlogId !== undefined
    ) {
      freshByWanderlogId.set(block.wanderlogId, block);
    }
  }

  const currentWanderlogIds = new Set<number>();
  let updated = 0;
  let removed = 0;

  const merged: ListoBlock[] = [];

  for (const block of currentBlocks) {
    if (
      block.type === "note" ||
      block.wanderlogId === undefined
    ) {
      merged.push(block);
      continue;
    }

    currentWanderlogIds.add(block.wanderlogId);
    const fresh = freshByWanderlogId.get(block.wanderlogId);
    if (fresh === undefined) {
      removed += 1;
      continue;
    }

    let next: ListoBlock;
    switch (block.type) {
      case "flight":
        next =
          fresh.type === "flight"
            ? mergeFlightBlock(block, fresh)
            : block;
        break;
      case "hotel":
        next =
          fresh.type === "hotel"
            ? mergeHotelBlock(block, fresh)
            : block;
        break;
      case "place":
        next =
          fresh.type === "place"
            ? mergePlaceBlock(block, fresh)
            : block;
        break;
      default:
        next = block;
    }

    if (!blocksEqual(block, next)) {
      updated += 1;
    }
    merged.push(next);
  }

  let added = 0;
  for (const fresh of freshBlocks) {
    if (
      fresh.type === "note" ||
      fresh.wanderlogId === undefined ||
      currentWanderlogIds.has(fresh.wanderlogId)
    ) {
      continue;
    }
    merged.push(fresh);
    added += 1;
  }

  return { blocks: withOrder(merged), added, updated, removed };
}

function isManualActivity(activity: Activity): activity is ManualActivity {
  return activity.source === "manual";
}

/** Fallback match for activities extracted before wanderlogKey was stored. */
function legacyActivityMatchKey(activity: ManualActivity): string {
  return `${activity.label}|${activity.time ?? ""}|${activity.kind}`;
}

function backfillWanderlogKeys(
  currentActivities: Activity[],
  freshActivities: Activity[]
): Activity[] {
  const freshManual = freshActivities.filter(isManualActivity);
  const freshByLegacyKey = new Map<string, string>();
  for (const activity of freshManual) {
    if (activity.wanderlogKey !== undefined) {
      freshByLegacyKey.set(legacyActivityMatchKey(activity), activity.wanderlogKey);
    }
  }

  return currentActivities.map((activity) => {
    if (!isManualActivity(activity) || activity.wanderlogKey !== undefined) {
      return activity;
    }
    const key = freshByLegacyKey.get(legacyActivityMatchKey(activity));
    if (key === undefined) {
      return activity;
    }
    return { ...activity, wanderlogKey: key };
  });
}

function mergeActivities(
  currentActivities: Activity[],
  freshActivities: Activity[]
): { activities: Activity[]; added: number; updated: number; removed: number } {
  const keyedCurrent = backfillWanderlogKeys(currentActivities, freshActivities);
  const freshManual = freshActivities.filter(isManualActivity);
  const hasKeyedCurrent = keyedCurrent.some(
    (activity) => isManualActivity(activity) && activity.wanderlogKey !== undefined
  );
  const hasKeyedFresh = freshManual.some((activity) => activity.wanderlogKey !== undefined);

  // Legacy migration path: old docs may have zero stored keys, which makes it
  // impossible to tell "manual add" vs "extracted row". In that case we trust
  // fresh Wanderlog order/content for synced rows and stop carrying stale rows.
  if (!hasKeyedCurrent && hasKeyedFresh) {
    return {
      activities: withOrder(freshManual),
      added: freshManual.length,
      updated: 0,
      removed: currentActivities.length,
    };
  }

  const userAdded = keyedCurrent.filter(
    (activity) => isManualActivity(activity) && activity.wanderlogKey === undefined
  );

  const currentByKey = new Map<string, ManualActivity>();
  for (const activity of keyedCurrent) {
    if (isManualActivity(activity) && activity.wanderlogKey !== undefined) {
      currentByKey.set(activity.wanderlogKey, activity);
    }
  }

  const seenKeys = new Set<string>();
  let added = 0;
  let updated = 0;
  let removed = 0;

  const synced: ManualActivity[] = [];
  for (const fresh of freshManual) {
    if (fresh.wanderlogKey === undefined) {
      continue;
    }
    seenKeys.add(fresh.wanderlogKey);
    const existing = currentByKey.get(fresh.wanderlogKey);
    if (existing === undefined) {
      synced.push(fresh);
      added += 1;
      continue;
    }

    const snap = existing.lastSynced;
    const freshSnap = activitySyncSnapshot(fresh);
    const next: ManualActivity = {
      ...existing,
      kind: pickSyncedValue(existing.kind, snap?.kind, fresh.kind),
      label: pickSyncedValue(existing.label, snap?.label, fresh.label),
      time: pickSyncedValue(existing.time, snap?.time, fresh.time),
      lastSynced: freshSnap,
    };
    if (
      existing.label !== next.label ||
      existing.time !== next.time ||
      existing.kind !== next.kind
    ) {
      updated += 1;
    }
    synced.push(next);
  }

  for (const key of currentByKey.keys()) {
    if (!seenKeys.has(key)) {
      removed += 1;
    }
  }

  return {
    activities: withOrder([...synced, ...userAdded]),
    added,
    updated,
    removed,
  };
}

function mergeDays(
  currentDays: TripDay[],
  freshDays: TripDay[]
): {
  days: TripDay[];
  addedDays: number;
  addedActivities: number;
  updatedActivities: number;
  removedActivities: number;
} {
  const freshByDate = new Map<string, TripDay>();
  for (const day of freshDays) {
    if (day.date !== null) {
      freshByDate.set(day.date, day);
    }
  }

  const currentDates = new Set<string>();
  let addedActivities = 0;
  let updatedActivities = 0;
  let removedActivities = 0;

  const mergedDays: TripDay[] = currentDays.map((day) => {
    if (day.date === null) {
      return day;
    }
    currentDates.add(day.date);

    const freshDay = freshByDate.get(day.date);
    if (freshDay === undefined) {
      return day;
    }

    const { activities, added, updated, removed } = mergeActivities(
      day.activities,
      freshDay.activities
    );
    addedActivities += added;
    updatedActivities += updated;
    removedActivities += removed;

    const freshSnap = { label: freshDay.label };
    return {
      ...day,
      label: pickSyncedValue(day.label, day.lastSynced?.label, freshDay.label),
      lastSynced: freshSnap,
      activities,
    };
  });

  let addedDays = 0;
  for (const freshDay of freshDays) {
    if (freshDay.date === null || currentDates.has(freshDay.date)) {
      continue;
    }
    mergedDays.push(freshDay);
    addedDays += 1;
    addedActivities += freshDay.activities.filter(isManualActivity).length;
  }

  return {
    days: withOrder(mergedDays),
    addedDays,
    addedActivities,
    updatedActivities,
    removedActivities,
  };
}

const SYNCABLE_SECTION_KINDS: ListoSectionKind[] = ["flights", "hotels", "places"];

function isOptionalSectionKind(kind: ListoSectionKind): boolean {
  return kind === "places" || kind === "notes";
}

function shouldDropSection(section: ListoSection): boolean {
  return isOptionalSectionKind(section.kind) && section.blocks.length === 0;
}

function mergeSections(
  currentSections: ListoSection[],
  freshSections: ListoSection[]
): {
  sections: ListoSection[];
  addedBlocks: number;
  updatedBlocks: number;
  removedBlocks: number;
} {
  let addedBlocks = 0;
  let updatedBlocks = 0;
  let removedBlocks = 0;

  let merged = currentSections.map((section) => {
    if (section.kind === "notes") {
      return section;
    }

    if (!SYNCABLE_SECTION_KINDS.includes(section.kind)) {
      return section;
    }

    const freshSection = getSectionByKind(freshSections, section.kind);
    if (freshSection === undefined) {
      return section;
    }

    const { blocks, added, updated, removed } = mergeWanderlogBlocks(
      section.blocks,
      freshSection.blocks
    );
    addedBlocks += added;
    updatedBlocks += updated;
    removedBlocks += removed;

    return { ...section, blocks };
  });

  merged = merged.filter((section) => !shouldDropSection(section));

  const hasPlaces = merged.some((section) => section.kind === "places");
  const freshPlaces = getSectionByKind(freshSections, "places");
  if (
    !hasPlaces &&
    freshPlaces !== undefined &&
    freshPlaces.blocks.length > 0
  ) {
    const sorted = sectionsInPaperOrder({ sections: merged });
    const hotelsIndex = sorted.findIndex((section) => section.kind === "hotels");
    const insertAt = hotelsIndex >= 0 ? hotelsIndex + 1 : sorted.length;
    merged = [
      ...sorted.slice(0, insertAt),
      freshPlaces,
      ...sorted.slice(insertAt),
    ];
    addedBlocks += freshPlaces.blocks.length;
  }

  return {
    sections: withOrder(merged),
    addedBlocks,
    updatedBlocks,
    removedBlocks,
  };
}

export function mergeWanderlogRefresh(
  currentDoc: ListoDocument,
  freshDoc: ListoDocument
): { doc: ListoDocument; summary: MergeSummary } {
  const { sections: mergedSections, addedBlocks, updatedBlocks, removedBlocks } = mergeSections(
    currentDoc.sections,
    freshDoc.sections
  );

  const itineraryIndex = adjustItineraryIndexAfterSectionRemoval(
    currentDoc.itineraryIndex,
    currentDoc.sections,
    mergedSections
  );

  const { days, addedDays, addedActivities, updatedActivities, removedActivities } = mergeDays(
    currentDoc.days,
    freshDoc.days
  );

  const wanderlogUrl = freshDoc.wanderlogUrl ?? currentDoc.wanderlogUrl;

  const currentMeta = currentDoc.meta;
  const freshMetaSnap: TripMetaSyncSnapshot = {
    name: freshDoc.meta.name,
    startDate: freshDoc.meta.startDate,
    endDate: freshDoc.meta.endDate,
  };
  const metaSnap = currentMeta.lastSynced;

  const doc: ListoDocument = {
    ...currentDoc,
    savedAt: new Date().toISOString(),
    ...(wanderlogUrl !== undefined ? { wanderlogUrl } : {}),
    meta: {
      ...currentMeta,
      name: pickSyncedValue(currentMeta.name, metaSnap?.name, freshDoc.meta.name),
      startDate: pickSyncedValue(
        currentMeta.startDate,
        metaSnap?.startDate,
        freshDoc.meta.startDate
      ),
      endDate: pickSyncedValue(currentMeta.endDate, metaSnap?.endDate, freshDoc.meta.endDate),
      lastSynced: freshMetaSnap,
    },
    sections: mergedSections,
    itineraryIndex,
    days,
  };

  return {
    doc,
    summary: {
      addedBlocks,
      updatedBlocks,
      removedBlocks,
      addedActivities,
      updatedActivities,
      removedActivities,
      addedDays,
    },
  };
}

export function formatMergeSummary(summary: MergeSummary): string {
  const parts: string[] = [];
  if (summary.addedBlocks > 0) {
    parts.push(`${summary.addedBlocks} new block${summary.addedBlocks === 1 ? "" : "s"}`);
  }
  if (summary.updatedBlocks > 0) {
    parts.push(`${summary.updatedBlocks} updated block${summary.updatedBlocks === 1 ? "" : "s"}`);
  }
  if (summary.removedBlocks > 0) {
    parts.push(`${summary.removedBlocks} removed block${summary.removedBlocks === 1 ? "" : "s"}`);
  }
  if (summary.addedActivities > 0) {
    parts.push(
      `${summary.addedActivities} new activit${summary.addedActivities === 1 ? "y" : "ies"}`
    );
  }
  if (summary.updatedActivities > 0) {
    parts.push(
      `${summary.updatedActivities} updated activit${summary.updatedActivities === 1 ? "y" : "ies"}`
    );
  }
  if (summary.removedActivities > 0) {
    parts.push(
      `${summary.removedActivities} removed activit${summary.removedActivities === 1 ? "y" : "ies"}`
    );
  }
  if (summary.addedDays > 0) {
    parts.push(`${summary.addedDays} new day${summary.addedDays === 1 ? "" : "s"}`);
  }
  if (parts.length === 0) {
    return "Already up to date with Wanderlog.";
  }
  return `Synced: ${parts.join(", ")}.`;
}
