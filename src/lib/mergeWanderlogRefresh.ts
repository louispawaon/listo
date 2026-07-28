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
  ListoHotelBlock,
  ListoPlaceBlock,
  ListoSection,
  ListoSectionKind,
  ManualActivity,
  TripDay,
} from "../types/listo";

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
  return {
    ...current,
    airline: fresh.airline,
    flightNumber: fresh.flightNumber,
    depart: { ...fresh.depart },
    arrive: { ...fresh.arrive },
  };
}

function mergeHotelBlock(
  current: ListoHotelBlock,
  fresh: ListoHotelBlock
): ListoHotelBlock {
  return {
    ...current,
    name: fresh.name,
    address: fresh.address,
    checkIn: fresh.checkIn,
    checkOut: fresh.checkOut,
    confirmationNumber: fresh.confirmationNumber,
    phone: fresh.phone,
    website: fresh.website,
  };
}

function mergePlaceBlock(
  current: ListoPlaceBlock,
  fresh: ListoPlaceBlock
): ListoPlaceBlock {
  return {
    ...current,
    name: fresh.name,
    address: fresh.address,
    rating: fresh.rating,
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

    const next: ManualActivity = {
      ...existing,
      kind: fresh.kind,
      label: fresh.label,
      time: fresh.time,
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

    return {
      ...day,
      label: freshDay.label,
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

export function mergeWanderlogRefresh(
  currentDoc: ListoDocument,
  freshDoc: ListoDocument
): { doc: ListoDocument; summary: MergeSummary } {
  let addedBlocks = 0;
  let updatedBlocks = 0;
  let removedBlocks = 0;

  const mergedSections = currentDoc.sections.map((section) => {
    if (section.kind === "notes") {
      return section;
    }

    if (!SYNCABLE_SECTION_KINDS.includes(section.kind)) {
      return section;
    }

    const freshSection = getSectionByKind(freshDoc.sections, section.kind);
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

  const { days, addedDays, addedActivities, updatedActivities, removedActivities } = mergeDays(
    currentDoc.days,
    freshDoc.days
  );

  const wanderlogUrl = freshDoc.wanderlogUrl ?? currentDoc.wanderlogUrl;

  const doc: ListoDocument = {
    ...currentDoc,
    savedAt: new Date().toISOString(),
    ...(wanderlogUrl !== undefined ? { wanderlogUrl } : {}),
    meta: {
      ...currentDoc.meta,
      name: freshDoc.meta.name,
      startDate: freshDoc.meta.startDate,
      endDate: freshDoc.meta.endDate,
    },
    sections: mergedSections,
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
