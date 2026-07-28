/**
 * Extracts and validates trip data from Wanderlog's MobX snapshot (`__MOBX_STATE__`).
 * Pass `mobxState` from the page context (see content script bridge); reading
 * `window.__MOBX_STATE__` directly only works in the page JS world, not in the
 * extension content-script isolated world.
 * Every field access is guarded — we never trust the store shape blindly.
 *
 * Section resolution uses heading keywords rather than fixed indices,
 * so it won't break if Wanderlog reorders or adds sections.
 */

import type {
  WanderlogBlock,
  WanderlogFlightBlock,
  WanderlogMobXState,
  WanderlogPlaceBlock,
  WanderlogSection,
} from "../types/wanderlog";
import type {
  ExtractionResult,
  TripData,
  TripFlight,
  TripHotel,
  TripPlace,
} from "../types/trip";
import { extractItineraryDaysFromWanderlog } from "./itineraryFromWanderlog";

// ─── Section Heading Keywords ────────────────────────────────────────────────
// Matched case-insensitively. Extend if Wanderlog ever localises headings.

const SECTION_KEYWORDS = {
  flights: ["flight"],
  hotels: ["hotel", "lodging", "accommodation"],
  places: ["place", "visit", "attraction", "activity"],
} as const;

type SectionKind = keyof typeof SECTION_KEYWORDS;

function matchesSectionKind(heading: string, kind: SectionKind): boolean {
  const lower = heading.toLowerCase();
  return SECTION_KEYWORDS[kind].some((keyword) => lower.includes(keyword));
}

/**
 * Finds a section by heading keyword rather than index position.
 * Falls back to the provided fallback index if no heading match is found,
 * logging a warning so we know the fallback was used.
 */
function resolveSection(
  sections: readonly (WanderlogSection | unknown)[],
  kind: SectionKind,
  fallbackIndex: number
): WanderlogSection | null {
  // Try heading match first
  for (const section of sections) {
    if (
      section !== null &&
      typeof section === "object" &&
      "heading" in section &&
      typeof (section as WanderlogSection).heading === "string" &&
      "blocks" in section &&
      Array.isArray((section as WanderlogSection).blocks) &&
      matchesSectionKind((section as WanderlogSection).heading, kind)
    ) {
      return section as WanderlogSection;
    }
  }

  // Fall back to index
  const fallback = sections[fallbackIndex];
  if (
    fallback !== null &&
    typeof fallback === "object" &&
    fallback !== undefined &&
    "blocks" in (fallback as object) &&
    Array.isArray((fallback as WanderlogSection).blocks)
  ) {
    console.warn(
      `[Wanderlog Exporter] No "${kind}" heading found — using fallback index ${fallbackIndex}. ` +
      `Section heading was: "${(fallback as WanderlogSection).heading}"`
    );
    return fallback as WanderlogSection;
  }

  return null;
}

// ─── Type Guards ─────────────────────────────────────────────────────────────

function isWanderlogMobXState(val: unknown): val is WanderlogMobXState {
  if (typeof val !== "object" || val === null || !("tripPlanStore" in val)) {
    return false;
  }
  const tps = (val as Record<string, unknown>)["tripPlanStore"];
  return tps !== null && typeof tps === "object";
}

function isFlightBlock(block: WanderlogBlock): block is WanderlogFlightBlock {
  return block.type === "flight";
}

function isPlaceBlock(block: WanderlogBlock): block is WanderlogPlaceBlock {
  return block.type === "place";
}

function isHotelBlock(block: WanderlogPlaceBlock): block is WanderlogPlaceBlock & {
  hotel: NonNullable<WanderlogPlaceBlock["hotel"]>;
} {
  return block.hotel !== undefined;
}

// ─── Field-level Helpers ─────────────────────────────────────────────────────

/**
 * Safely reads a string field, returning null if missing or not a string.
 * Used for optional fields like confirmationNumber that may be null in the store.
 */
function safeString(val: unknown): string | null {
  return typeof val === "string" && val.trim().length > 0 ? val.trim() : null;
}

/** Trip title for PDF — Wanderlog occasionally omits `title`. */
function safeTripTitle(val: unknown): string {
  const s = safeString(val);
  return s !== null ? s : "Untitled trip";
}

function safeObject(val: unknown): Record<string, unknown> | null {
  return typeof val === "object" && val !== null ? (val as Record<string, unknown>) : null;
}

function extractGeoDestination(
  state: WanderlogMobXState
): { name: string | null; countryName: string | null } {
  const dataRecord = state.tripPlanStore.data as unknown as Record<string, unknown>;
  const resources = safeObject(dataRecord["resources"]);
  const geo = resources !== null ? safeObject(resources["geo"]) : null;
  if (geo === null) {
    return { name: null, countryName: null };
  }
  return {
    name: safeString(geo["name"]),
    countryName: safeString(geo["countryName"]),
  };
}

// ─── Section Extractors ──────────────────────────────────────────────────────

function extractFlights(section: WanderlogSection): TripFlight[] {
  return section.blocks
    .filter(isFlightBlock)
    .map((block): TripFlight => ({
      id: block.id,
      airline: block.flightInfo.airline.name,
      flightNumber: `${block.flightInfo.airline.iata} ${block.flightInfo.number}`,
      depart: {
        airportIata: block.depart.airport.iata,
        airportName: block.depart.airport.name,
        city: block.depart.airport.cityName,
        date: block.depart.date,
        time: block.depart.time,
      },
      arrive: {
        airportIata: block.arrive.airport.iata,
        airportName: block.arrive.airport.name,
        city: block.arrive.airport.cityName,
        date: block.arrive.date,
        time: block.arrive.time,
      },
    }));
}

function extractHotels(section: WanderlogSection): TripHotel[] {
  return section.blocks
    .filter(isPlaceBlock)
    .filter(isHotelBlock)
    .map((block): TripHotel => ({
      id: block.id,
      name: block.place.name,
      address: block.place.formatted_address,
      checkIn: block.hotel.checkIn,
      checkOut: block.hotel.checkOut,
      confirmationNumber: safeString(block.hotel.confirmationNumber),
      phone: safeString(block.place.international_phone_number),
      website: safeString(block.place.website),
    }));
}

function extractPlaces(section: WanderlogSection): TripPlace[] {
  return section.blocks
    .filter(isPlaceBlock)
    .map((block): TripPlace => ({
      id: block.id,
      name: block.place.name,
      address: block.place.formatted_address,
      rating: block.place.rating,
    }));
}

// ─── Main Extractor ──────────────────────────────────────────────────────────

export function extractTripData(mobxState?: unknown): ExtractionResult {
  const state = mobxState !== undefined ? mobxState : window.__MOBX_STATE__;

  if (!isWanderlogMobXState(state)) {
    return {
      success: false,
      error:
        "Wanderlog store not found. Make sure you are on a trip plan page and the page has fully loaded.",
    };
  }

  try {
    const tripPlan = state.tripPlanStore.data.tripPlan;
    const sections = tripPlan.itinerary.sections;
    const geoDestination = extractGeoDestination(state);

    // Resolve sections by heading keyword with index fallback
    const flightSection = resolveSection(sections, "flights", 1);
    const hotelSection = resolveSection(sections, "hotels", 2);
    const placeSection = resolveSection(sections, "places", 3);

    if (flightSection === null && hotelSection === null && placeSection === null) {
      return {
        success: false,
        error:
          "No itinerary sections found. The page may still be loading — try again in a moment.",
      };
    }

    const flights = flightSection !== null ? extractFlights(flightSection) : [];
    const hotels = hotelSection !== null ? extractHotels(hotelSection) : [];
    const places = placeSection !== null ? extractPlaces(placeSection) : [];
    const itineraryDays = extractItineraryDaysFromWanderlog(
      sections,
      flightSection,
      hotelSection,
      placeSection,
      flights,
      hotels,
      tripPlan.startDate,
      tripPlan.endDate
    );

    const data: TripData = {
      name: safeTripTitle(tripPlan.title),
      startDate: tripPlan.startDate,
      endDate: tripPlan.endDate,
      destinationGeoName: geoDestination.name,
      destinationGeoCountryName: geoDestination.countryName,
      flights,
      hotels,
      places,
      itineraryDays,
    };

    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown extraction error";
    return {
      success: false,
      error: `Failed to extract trip data: ${message}`,
    };
  }
}
