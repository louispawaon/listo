/**
 * Hydrates a `ListoDocument` from a `TripData` extraction.
 *
 * Runs once when the editor tab opens from a fresh Wanderlog extraction. Does
 * NOT run when loading a `.listo` file — those go straight to the editor.
 *
 * v1 hydration rules (matches plan decisions):
 * - Flights and hotels always; places only when Wanderlog has place items.
 * - Notes are Listo-only and omitted on init (added manually or from a saved file).
 * - Each block gets a `crypto.randomUUID()` id; `order` is 0..n-1.
 * - Days are generated chronologically from `startDate` to `endDate` so empty
 *   days exist as editable shells even if the extractor dropped them.
 * - Every TripItineraryRow maps to a `ManualActivity`. No `AutoActivity`s are
 *   produced in v1 (extractor already injects synthetic flight/hotel rows; we
 *   treat them as editable manual activities rather than re-deriving them).
 */

import type { TripData, TripItineraryRow } from "../types/trip";
import { effectiveTripBounds, enumerateInclusiveRange } from "./calendarDates";
import { pickInboundFlight } from "./flightHeuristics";
import type {
  ListoDocument,
  ListoFlightBlock,
  ListoHotelBlock,
  ListoPlaceBlock,
  ListoSection,
  ListoSectionKind,
  ManualActivity,
  ManualActivityKind,
  TripDay,
  TripMeta,
} from "../types/listo";

// ─── UUID helper ─────────────────────────────────────────────────────────────

function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback: generate RFC4122-ish v4 from Math.random. Good enough for our
  // storage-local use case; we never leave the device.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Meta derivation ─────────────────────────────────────────────────────────

function deriveDestination(tripData: TripData): string {
  const geoName = tripData.destinationGeoName?.trim() ?? "";
  const geoCountry = tripData.destinationGeoCountryName?.trim() ?? "";
  if (geoName.length > 0 && geoCountry.length > 0) {
    return `${geoName}, ${geoCountry}`;
  }
  if (geoName.length > 0) return geoName;
  if (geoCountry.length > 0) return geoCountry;

  if (tripData.flights.length > 0) {
    // Use the outbound (inbound-to-trip) leg — same heuristic as itinerary
    // auto-rows — not the last listed flight, which is often the return home.
    const primary =
      pickInboundFlight(tripData.flights, tripData.startDate) ?? tripData.flights[0]!;
    const city = primary.arrive.city.trim();
    if (city.length > 0) return city;
  }
  if (tripData.hotels.length > 0) {
    const first = tripData.hotels[0];
    if (first !== undefined) {
      const parts = first.address.split(",").map((p) => p.trim()).filter((p) => p.length > 0);
      // Prefer the penultimate segment (typically the city) if available.
      if (parts.length >= 2) {
        const candidate = parts[parts.length - 2];
        if (candidate !== undefined && candidate.length > 0) return candidate;
      }
      const fallback = parts[parts.length - 1];
      if (fallback !== undefined) return fallback;
    }
  }
  return "";
}

function buildMeta(tripData: TripData): TripMeta {
  const name = tripData.name;
  const startDate = tripData.startDate;
  const endDate = tripData.endDate;
  return {
    name,
    startDate,
    endDate,
    destination: deriveDestination(tripData),
    lastSynced: { name, startDate, endDate },
  };
}

// ─── Section heading labels ──────────────────────────────────────────────────

const SECTION_HEADINGS: Record<ListoSectionKind, string> = {
  flights: "Flights",
  hotels: "Accommodation",
  places: "Places",
  notes: "Notes",
};

// ─── Block hydration ─────────────────────────────────────────────────────────

function buildFlightBlocks(tripData: TripData): ListoFlightBlock[] {
  return tripData.flights.map((flight, index) => {
    const depart = { ...flight.depart };
    const arrive = { ...flight.arrive };
    return {
      id: uuid(),
      type: "flight",
      order: index,
      wanderlogId: flight.id,
      airline: flight.airline,
      flightNumber: flight.flightNumber,
      depart,
      arrive,
      lastSynced: {
        airline: flight.airline,
        flightNumber: flight.flightNumber,
        depart: { ...depart },
        arrive: { ...arrive },
      },
    };
  });
}

function buildHotelBlocks(tripData: TripData): ListoHotelBlock[] {
  return tripData.hotels.map((hotel, index) => ({
    id: uuid(),
    type: "hotel",
    order: index,
    wanderlogId: hotel.id,
    name: hotel.name,
    address: hotel.address,
    checkIn: hotel.checkIn,
    checkOut: hotel.checkOut,
    confirmationNumber: hotel.confirmationNumber,
    phone: hotel.phone,
    website: hotel.website,
    lastSynced: {
      name: hotel.name,
      address: hotel.address,
      checkIn: hotel.checkIn,
      checkOut: hotel.checkOut,
      confirmationNumber: hotel.confirmationNumber,
      phone: hotel.phone,
      website: hotel.website,
    },
  }));
}

function buildPlaceBlocks(tripData: TripData): ListoPlaceBlock[] {
  return tripData.places.map((place, index) => ({
    id: uuid(),
    type: "place",
    order: index,
    wanderlogId: place.id,
    name: place.name,
    address: place.address,
    rating: place.rating,
    lastSynced: {
      name: place.name,
      address: place.address,
      rating: place.rating,
    },
  }));
}

function buildSections(tripData: TripData): ListoSection[] {
  const sections: ListoSection[] = [
    {
      id: uuid(),
      kind: "flights",
      heading: SECTION_HEADINGS.flights,
      order: 0,
      blocks: buildFlightBlocks(tripData),
    },
    {
      id: uuid(),
      kind: "hotels",
      heading: SECTION_HEADINGS.hotels,
      order: 1,
      blocks: buildHotelBlocks(tripData),
    },
  ];

  if (tripData.places.length > 0) {
    sections.push({
      id: uuid(),
      kind: "places",
      heading: SECTION_HEADINGS.places,
      order: sections.length,
      blocks: buildPlaceBlocks(tripData),
    });
  }

  return sections;
}

// ─── Day generation ──────────────────────────────────────────────────────────

/** Skeleton dates: calendar-safe enumeration, expanded for flight/hotel/itinerary keys. */
function skeletonDateList(tripData: TripData): string[] {
  const expanded = effectiveTripBounds(
    tripData.startDate,
    tripData.endDate,
    tripData.flights,
    tripData.hotels,
    tripData.itineraryDays.map((d) => d.date)
  );
  return enumerateInclusiveRange(expanded.start, expanded.end);
}

function formatDayLabel(date: string, index: number): string {
  const readable = new Date(`${date}T00:00:00`).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return `Day ${index + 1} - ${readable}`;
}

function mapRowKindToManualKind(kind: TripItineraryRow["kind"]): ManualActivityKind {
  switch (kind) {
    case "flight":
      return "transport";
    case "hotel":
      return "activity";
    case "place":
      return "activity";
    case "checklist":
      return "note";
  }
}

/** Stable key for matching itinerary rows across Wanderlog syncs. */
export function buildWanderlogActivityKey(
  date: string | null,
  row: TripItineraryRow
): string {
  if (row.wanderlogBlockId !== undefined) {
    return `block:${row.wanderlogBlockId}`;
  }
  const datePart = date ?? "";
  const timePart = row.time ?? "";
  return `${datePart}|${timePart}|${row.place}|${row.kind}`;
}

function toManualActivity(
  date: string | null,
  row: TripItineraryRow,
  order: number
): ManualActivity {
  const kind = mapRowKindToManualKind(row.kind);
  const label = row.place;
  const time = row.time;
  return {
    id: uuid(),
    source: "manual",
    order,
    kind,
    label,
    time,
    notes: undefined,
    wanderlogKey: buildWanderlogActivityKey(date, row),
    lastSynced: { kind, label, time },
  };
}

function buildDays(tripData: TripData): TripDay[] {
  const dateList = skeletonDateList(tripData);

  // If we couldn't parse the trip range, fall back to whatever days the
  // extractor produced so we don't lose data.
  if (dateList.length === 0) {
    return tripData.itineraryDays.map((day, index): TripDay => ({
      id: uuid(),
      date: day.date,
      label: day.label,
      order: index,
      activities: day.rows.map((row, rowIndex) => toManualActivity(day.date, row, rowIndex)),
      ...(day.date !== null ? { lastSynced: { label: day.label } } : {}),
    }));
  }

  const rowsByDate = new Map<string, TripItineraryRow[]>();
  // Prefer matches by date; merge rows when multiple TripItineraryDay share the same date.
  for (const day of tripData.itineraryDays) {
    if (day.date !== null) {
      const existing = rowsByDate.get(day.date);
      if (existing === undefined) {
        rowsByDate.set(day.date, [...day.rows]);
      } else {
        existing.push(...day.rows);
      }
    }
  }

  return dateList.map((date, index): TripDay => {
    const rows = rowsByDate.get(date) ?? [];
    const label = formatDayLabel(date, index);
    return {
      id: uuid(),
      date,
      label,
      order: index,
      activities: rows.map((row, rowIndex) => toManualActivity(date, row, rowIndex)),
      lastSynced: { label },
    };
  });
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface InitEditorStateOptions {
  wanderlogUrl?: string;
}

export function initEditorState(
  tripData: TripData,
  options?: InitEditorStateOptions
): ListoDocument {
  const sections = buildSections(tripData);
  const wanderlogUrl = options?.wanderlogUrl;
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    source: "wanderlog",
    ...(wanderlogUrl !== undefined ? { wanderlogUrl } : {}),
    meta: buildMeta(tripData),
    sections,
    itineraryIndex: sections.length,
    days: buildDays(tripData),
  };
}
