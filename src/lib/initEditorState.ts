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
  if (tripData.flights.length > 0) {
    const last = tripData.flights[tripData.flights.length - 1];
    if (last !== undefined) {
      const city = last.arrive.city.trim();
      if (city.length > 0) return city;
    }
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

function enumerateDateRange(startDate: string, endDate: string): string[] {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return [];
  }
  const days: string[] = [];
  const cursor = new Date(start);
  // Inclusive of both ends; guard against runaway loops.
  let safety = 0;
  while (cursor.getTime() <= end.getTime() && safety < 365) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
    safety += 1;
  }
  return days;
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
  const dateList = enumerateDateRange(tripData.startDate, tripData.endDate);

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
  // Prefer matches by date; extractor emits date-tagged days first. For days
  // that only have a label (no date), we cannot safely align them, so they are
  // dropped in favour of the chronological skeleton.
  for (const day of tripData.itineraryDays) {
    if (day.date !== null) {
      rowsByDate.set(day.date, day.rows);
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
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    source: "wanderlog",
    meta: buildMeta(tripData),
    sections: buildSections(tripData),
    days: buildDays(tripData),
  };
}
