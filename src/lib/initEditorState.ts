/**
 * Hydrates a `ListoDocument` from a `TripData` extraction.
 *
 * Runs once when the editor tab opens from a fresh Wanderlog extraction. Does
 * NOT run when loading a `.listo` file — those go straight to the editor.
 *
 * v1 hydration rules (matches plan decisions):
 * - Four sections in fixed order: flights, hotels, places, notes (notes empty).
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
  ListoNoteBlock,
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
  return {
    name: tripData.name,
    startDate: tripData.startDate,
    endDate: tripData.endDate,
    destination: deriveDestination(tripData),
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
  return tripData.flights.map((flight, index) => ({
    id: uuid(),
    type: "flight",
    order: index,
    airline: flight.airline,
    flightNumber: flight.flightNumber,
    depart: { ...flight.depart },
    arrive: { ...flight.arrive },
  }));
}

function buildHotelBlocks(tripData: TripData): ListoHotelBlock[] {
  return tripData.hotels.map((hotel, index) => ({
    id: uuid(),
    type: "hotel",
    order: index,
    name: hotel.name,
    address: hotel.address,
    checkIn: hotel.checkIn,
    checkOut: hotel.checkOut,
    confirmationNumber: hotel.confirmationNumber,
    phone: hotel.phone,
    website: hotel.website,
  }));
}

function buildPlaceBlocks(tripData: TripData): ListoPlaceBlock[] {
  return tripData.places.map((place, index) => ({
    id: uuid(),
    type: "place",
    order: index,
    name: place.name,
    address: place.address,
    rating: place.rating,
  }));
}

function buildNoteBlocks(): ListoNoteBlock[] {
  return [];
}

function buildSections(tripData: TripData): ListoSection[] {
  const flights = buildFlightBlocks(tripData);
  const hotels = buildHotelBlocks(tripData);
  const places = buildPlaceBlocks(tripData);
  const notes = buildNoteBlocks();

  const kinds: ListoSectionKind[] = ["flights", "hotels", "places", "notes"];
  return kinds.map((kind, index): ListoSection => ({
    id: uuid(),
    kind,
    heading: SECTION_HEADINGS[kind],
    order: index,
    blocks:
      kind === "flights" ? flights :
      kind === "hotels" ? hotels :
      kind === "places" ? places :
      notes,
  }));
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

function toManualActivity(row: TripItineraryRow, order: number): ManualActivity {
  return {
    id: uuid(),
    source: "manual",
    order,
    kind: mapRowKindToManualKind(row.kind),
    label: row.place,
    time: row.time,
    notes: undefined,
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
      activities: day.rows.map((row, rowIndex) => toManualActivity(row, rowIndex)),
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
    return {
      id: uuid(),
      date,
      label: formatDayLabel(date, index),
      order: index,
      activities: rows.map((row, rowIndex) => toManualActivity(row, rowIndex)),
    };
  });
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function initEditorState(tripData: TripData): ListoDocument {
  const sections = buildSections(tripData);
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    source: "wanderlog",
    meta: buildMeta(tripData),
    sections,
    itineraryIndex: sections.length,
    days: buildDays(tripData),
  };
}
