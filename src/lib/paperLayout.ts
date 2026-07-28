/**
 * Order of printable blocks on the paper canvas / PDF: drag-sorted sections
 * plus the daily itinerary as a single reorderable unit.
 */

import type { ListoDocument, ListoSection } from "../types/listo";

/** Stable @dnd-kit id; must not collide with section UUIDs. */
export const LISTO_ITINERARY_SORTABLE_ID = "__listo:itinerary__";

export function resolvedItineraryIndex(
  doc: Pick<ListoDocument, "sections" | "itineraryIndex">
): number {
  const n = doc.sections.length;
  const raw = doc.itineraryIndex ?? n;
  return Math.max(0, Math.min(raw, n));
}

export function sectionsInPaperOrder(doc: Pick<ListoDocument, "sections">): ListoSection[] {
  return [...doc.sections].sort((a, b) => a.order - b.order);
}

/** Flat id list passed to `SortableContext` / `reorderPaperLayout`. */
export function buildPaperSortIds(doc: ListoDocument): string[] {
  const itineraryIndex = resolvedItineraryIndex(doc);
  const sections = sectionsInPaperOrder(doc);
  const ids: string[] = [];
  for (let i = 0; i < sections.length; i++) {
    if (i === itineraryIndex) ids.push(LISTO_ITINERARY_SORTABLE_ID);
    ids.push(sections[i]!.id);
  }
  if (itineraryIndex === sections.length) {
    ids.push(LISTO_ITINERARY_SORTABLE_ID);
  }
  return ids;
}
