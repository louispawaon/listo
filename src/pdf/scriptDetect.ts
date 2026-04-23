/**
 * Detects which non-Latin writing systems appear in a trip's text fields.
 * The result drives lazy font registration in `./fonts` — we only ship
 * fallback TTFs for scripts that are actually present in the data.
 *
 * Ranges are intentionally conservative (BMP + common supplementary blocks).
 * Unknown scripts fall through to the base Noto Sans (Latin/Greek/Cyrillic/
 * Vietnamese) without triggering a download.
 */

import type { TripData } from "../types/trip";

export type ScriptTag =
  | "thai"
  // Phase B additions (not yet wired — fonts not shipped)
  ;

interface ScriptRange {
  tag: ScriptTag;
  test: RegExp;
}

const SCRIPT_RANGES: readonly ScriptRange[] = [
  { tag: "thai", test: /[\u0E00-\u0E7F]/ },
];

/** Concatenates every user-facing string from a trip into a scan buffer. */
function collectText(trip: TripData): string {
  const parts: string[] = [trip.name];

  for (const flight of trip.flights) {
    parts.push(
      flight.airline,
      flight.depart.airportName, flight.depart.city,
      flight.arrive.airportName, flight.arrive.city,
    );
  }
  for (const hotel of trip.hotels) {
    parts.push(hotel.name, hotel.address);
    if (hotel.confirmationNumber !== null) parts.push(hotel.confirmationNumber);
    if (hotel.phone !== null) parts.push(hotel.phone);
    if (hotel.website !== null) parts.push(hotel.website);
  }
  for (const place of trip.places) {
    parts.push(place.name, place.address);
  }
  for (const day of trip.itineraryDays) {
    parts.push(day.label);
    for (const row of day.rows) {
      parts.push(row.place);
    }
  }

  return parts.join("\n");
}

export function detectScripts(trip: TripData): ReadonlySet<ScriptTag> {
  const blob = collectText(trip);
  const hits = new Set<ScriptTag>();
  for (const { tag, test } of SCRIPT_RANGES) {
    if (test.test(blob)) {
      hits.add(tag);
    }
  }
  console.debug(`[Listo/scriptDetect] scanned ${blob.length} chars, detected: [${[...hits].join(", ") || "latin only"}]`);
  return hits;
}
