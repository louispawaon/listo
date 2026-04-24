/**
 * Builds date-keyed daily itinerary rows from Wanderlog sections + extracted
 * flights/hotels. Day sections are discovered by reserved overview indices, not
 * a fixed slice offset.
 */

import type {
  WanderlogBlock,
  WanderlogChecklistBlock,
  WanderlogPlaceBlock,
  WanderlogSection,
} from "../types/wanderlog";
import type {
  TripFlight,
  TripHotel,
  TripItineraryDay,
  TripItineraryRow,
} from "../types/trip";
import { effectiveTripBounds, isIsoDateString } from "./calendarDates";

// First token / exact titles only — substring matching would drop real days
// (e.g. headings containing "Activities" or "places to visit").
const OVERVIEW_HEADING_TOKENS = new Set([
  "flight",
  "flights",
  "hotel",
  "hotels",
  "lodging",
  "accommodation",
  "place",
  "places",
]);

function matchesOverviewHeading(heading: string): boolean {
  const t = heading.trim().toLowerCase();
  if (OVERVIEW_HEADING_TOKENS.has(t)) return true;
  const first = t.split(/\s+/)[0]?.replace(/[^a-z0-9]/g, "") ?? "";
  return OVERVIEW_HEADING_TOKENS.has(first);
}

function safeString(val: unknown): string | null {
  return typeof val === "string" && val.trim().length > 0 ? val.trim() : null;
}

function safeObject(val: unknown): Record<string, unknown> | null {
  return typeof val === "object" && val !== null ? (val as Record<string, unknown>) : null;
}

function safeTime(val: unknown): string | undefined {
  const s = safeString(val);
  return s !== null ? s : undefined;
}

function parseDayDate(heading: string): string | null {
  const match = heading.match(/\d{4}-\d{2}-\d{2}/);
  return match !== null ? match[0] : null;
}

function buildDayLabel(index: number, isoDate: string | null): string {
  if (isoDate === null) {
    return `Day ${index + 1}`;
  }
  const readableDate = new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return `Day ${index + 1} - ${readableDate}`;
}

function isWanderlogSectionShape(val: unknown): val is WanderlogSection {
  if (val === null || typeof val !== "object" || !("heading" in val) || !("blocks" in val)) {
    return false;
  }
  const rec = val as Record<string, unknown>;
  return typeof rec["heading"] === "string" && Array.isArray(rec["blocks"]);
}

function isDayLikeSection(section: unknown, heading: string): section is WanderlogSection {
  if (!isWanderlogSectionShape(section)) return false;
  return !matchesOverviewHeading(heading);
}

interface DaySectionCandidate {
  section: WanderlogSection;
  originalIndex: number;
}

function collectReservedSectionIndices(
  sections: readonly unknown[],
  flightSection: WanderlogSection | null,
  hotelSection: WanderlogSection | null,
  placeSection: WanderlogSection | null
): Set<number> {
  const reserved = new Set<number>();
  for (const s of [flightSection, hotelSection, placeSection]) {
    if (s === null) continue;
    const idx = sections.indexOf(s);
    if (idx >= 0) reserved.add(idx);
  }
  return reserved;
}

function collectDaySections(
  sections: readonly unknown[],
  reserved: Set<number>
): DaySectionCandidate[] {
  const out: DaySectionCandidate[] = [];
  for (let i = 0; i < sections.length; i++) {
    if (reserved.has(i)) continue;
    const section = sections[i];
    if (!isWanderlogSectionShape(section)) continue;
    const heading = section.heading;
    if (!isDayLikeSection(section, heading)) continue;
    out.push({ section, originalIndex: i });
  }
  return out;
}

function readSectionDate(candidate: DaySectionCandidate): string | null {
  const sectionDate = safeString(candidate.section.date);
  return sectionDate !== null && isIsoDateString(sectionDate) ? sectionDate : null;
}

function createItineraryRow(
  kind: TripItineraryRow["kind"],
  place: string,
  time?: string
): TripItineraryRow {
  return time !== undefined ? { kind, place, time } : { kind, place };
}

function dateInTripRange(date: string, tripStart: string, tripEnd: string): boolean {
  return date >= tripStart && date <= tripEnd;
}

function appendRow(map: Map<string, TripItineraryRow[]>, date: string, row: TripItineraryRow): void {
  const list = map.get(date);
  if (list === undefined) {
    map.set(date, [row]);
  } else {
    list.push(row);
  }
}

function rowsFromFlights(
  flights: TripFlight[],
  tripStart: string,
  tripEnd: string
): Map<string, TripItineraryRow[]> {
  const map = new Map<string, TripItineraryRow[]>();
  for (const flight of flights) {
    const depDate = flight.depart.date;
    if (dateInTripRange(depDate, tripStart, tripEnd)) {
      appendRow(
        map,
        depDate,
        createItineraryRow(
          "flight",
          `Depart via ${flight.airline} ${flight.flightNumber} from ${flight.depart.airportName} (${flight.depart.airportIata})`,
          safeTime(flight.depart.time)
        )
      );
    } else {
      console.warn(
        `[Wanderlog Exporter] Skipping flight depart row outside range (${tripStart}–${tripEnd}): ${depDate}`
      );
    }

    const arrDate = flight.arrive.date;
    if (dateInTripRange(arrDate, tripStart, tripEnd)) {
      appendRow(
        map,
        arrDate,
        createItineraryRow(
          "flight",
          `Arrive via ${flight.airline} ${flight.flightNumber} at ${flight.arrive.airportName} (${flight.arrive.airportIata})`,
          safeTime(flight.arrive.time)
        )
      );
    } else {
      console.warn(
        `[Wanderlog Exporter] Skipping flight arrive row outside range (${tripStart}–${tripEnd}): ${arrDate}`
      );
    }
  }
  return map;
}

function rowsFromHotels(
  hotels: TripHotel[],
  tripStart: string,
  tripEnd: string
): Map<string, TripItineraryRow[]> {
  const map = new Map<string, TripItineraryRow[]>();
  for (const hotel of hotels) {
    const checkIn = hotel.checkIn;
    if (dateInTripRange(checkIn, tripStart, tripEnd)) {
      appendRow(
        map,
        checkIn,
        createItineraryRow("hotel", `Hotel check-in: ${hotel.name}`)
      );
    } else {
      console.warn(
        `[Wanderlog Exporter] Skipping hotel check-in outside range (${tripStart}–${tripEnd}): ${checkIn}`
      );
    }

    const checkOut = hotel.checkOut;
    if (dateInTripRange(checkOut, tripStart, tripEnd)) {
      appendRow(
        map,
        checkOut,
        createItineraryRow("hotel", `Hotel check-out: ${hotel.name}`)
      );
    } else {
      console.warn(
        `[Wanderlog Exporter] Skipping hotel check-out outside range (${tripStart}–${tripEnd}): ${checkOut}`
      );
    }
  }
  return map;
}

function mergeRowMaps(
  target: Map<string, TripItineraryRow[]>,
  source: Map<string, TripItineraryRow[]>
): void {
  for (const [date, rows] of source) {
    const existing = target.get(date);
    if (existing === undefined) {
      target.set(date, [...rows]);
    } else {
      existing.push(...rows);
    }
  }
}

function isPlaceBlock(block: WanderlogBlock): block is WanderlogPlaceBlock {
  return block.type === "place";
}

function isChecklistBlock(block: WanderlogBlock): block is WanderlogChecklistBlock {
  return block.type === "checklist";
}

function getBlockTime(block: WanderlogBlock): string | undefined {
  const record = safeObject(block);
  if (record === null) return undefined;
  return safeTime(record["time"]) ?? safeTime(record["startTime"]);
}

function isWanderlogBlock(val: unknown): val is WanderlogBlock {
  const record = safeObject(val);
  return record !== null && typeof record["type"] === "string";
}

/** Minutes since midnight for "HH:MM"; rows without time sort last. */
function timeSortKey(time: string | undefined): number {
  if (time === undefined) return 24 * 60 + 1;
  const m = time.match(/^(\d{1,2}):(\d{2})/);
  if (m === null) return 24 * 60 + 1;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return 24 * 60 + 1;
  return h * 60 + min;
}

function kindOrder(kind: TripItineraryRow["kind"]): number {
  switch (kind) {
    case "flight":
      return 0;
    case "hotel":
      return 1;
    case "place":
      return 2;
    case "checklist":
      return 3;
    default:
      return 9;
  }
}

function sortRowsForDay(rows: TripItineraryRow[]): void {
  rows.sort((a, b) => {
    const ta = timeSortKey(a.time);
    const tb = timeSortKey(b.time);
    if (ta !== tb) return ta - tb;
    const ka = kindOrder(a.kind);
    const kb = kindOrder(b.kind);
    if (ka !== kb) return ka - kb;
    return a.place.localeCompare(b.place);
  });
}

/**
 * Merges Wanderlog per-day blocks with flight/hotel rows keyed by ISO date.
 */
export function extractItineraryDaysFromWanderlog(
  sections: readonly unknown[],
  flightSection: WanderlogSection | null,
  hotelSection: WanderlogSection | null,
  placeSection: WanderlogSection | null,
  flights: TripFlight[],
  hotels: TripHotel[],
  tripStartDate: string,
  tripEndDate: string
): TripItineraryDay[] {
  const { start: effectiveStart, end: effectiveEnd } = effectiveTripBounds(
    tripStartDate,
    tripEndDate,
    flights,
    hotels
  );

  const reserved = collectReservedSectionIndices(sections, flightSection, hotelSection, placeSection);
  const daySections = collectDaySections(sections, reserved);

  const byDate = new Map<string, TripItineraryRow[]>();

  daySections.forEach((candidate) => {
    const rawHeading = safeString(candidate.section.heading);
    const headingDate = rawHeading !== null ? parseDayDate(rawHeading) : null;
    const date = readSectionDate(candidate);
    if (date === null) {
      console.warn("[Wanderlog Exporter] Day section has missing/invalid section.date; skipping section.", {
        heading: rawHeading,
        originalIndex: candidate.originalIndex,
        sectionDate: candidate.section.date,
      });
      return;
    }

    if (headingDate !== null && headingDate !== date) {
      console.warn("[Wanderlog Exporter] Heading date conflicts with section.date; using section.date.", {
        heading: rawHeading,
        originalIndex: candidate.originalIndex,
        headingDate,
        sectionDate: date,
      });
    }

    if (!dateInTripRange(date, effectiveStart, effectiveEnd)) {
      console.warn(
        `[Wanderlog Exporter] Skipping day section outside effective range (${effectiveStart}–${effectiveEnd}): ${date}`
      );
      return;
    }

    const rows: TripItineraryRow[] = [];
    for (const rawBlock of candidate.section.blocks as unknown[]) {
      if (!isWanderlogBlock(rawBlock)) {
        continue;
      }
      const block = rawBlock;
      if (isPlaceBlock(block)) {
        rows.push(
          createItineraryRow(
            "place",
            safeString(block.place.name) ?? safeString(block.place.formatted_address) ?? "Unspecified place",
            getBlockTime(block)
          )
        );
        continue;
      }

      if (isChecklistBlock(block)) {
        const title = safeString(block.title);
        if (title !== null) {
          rows.push(createItineraryRow("checklist", title, getBlockTime(block)));
        }
      }
    }

    if (rows.length > 0) {
      const existing = byDate.get(date);
      if (existing === undefined) {
        byDate.set(date, rows);
      } else {
        existing.push(...rows);
      }
    }
  });

  mergeRowMaps(byDate, rowsFromFlights(flights, effectiveStart, effectiveEnd));
  mergeRowMaps(byDate, rowsFromHotels(hotels, effectiveStart, effectiveEnd));

  const sortedDates = [...byDate.keys()].sort();
  const days: TripItineraryDay[] = [];

  for (let i = 0; i < sortedDates.length; i++) {
    const date = sortedDates[i];
    if (date === undefined) continue;
    const rows = byDate.get(date);
    if (rows === undefined || rows.length === 0) continue;
    sortRowsForDay(rows);
    days.push({
      label: buildDayLabel(i, date),
      date,
      rows,
    });
  }

  return days;
}
