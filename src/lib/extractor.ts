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
  WanderlogChecklistBlock,
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
  TripItineraryDay,
  TripItineraryRow,
  TripPlace,
} from "../types/trip";

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

function isChecklistBlock(block: WanderlogBlock): block is WanderlogChecklistBlock {
  return block.type === "checklist";
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

/** Trip title for PDF — Wanderlog occasionally omits `name`. */
function safeTripName(val: unknown): string {
  const s = safeString(val);
  return s !== null ? s : "Untitled trip";
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

function addDays(isoDate: string, dayOffset: number): string | null {
  const base = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(base.getTime())) {
    return null;
  }
  base.setDate(base.getDate() + dayOffset);
  return base.toISOString().slice(0, 10);
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

function pickInboundFlight(flights: TripFlight[], tripStartDate: string): TripFlight | null {
  if (flights.length === 0) return null;

  const sameDay = flights
    .filter((flight) => flight.arrive.date === tripStartDate)
    .sort((a, b) => a.arrive.time.localeCompare(b.arrive.time));

  if (sameDay.length > 0) {
    return sameDay[0] ?? null;
  }

  return (
    [...flights].sort((a, b) => {
    const aStamp = `${a.arrive.date}T${a.arrive.time}`;
    const bStamp = `${b.arrive.date}T${b.arrive.time}`;
    return aStamp.localeCompare(bStamp);
    })[0] ?? null
  );
}

function pickCheckInHotel(hotels: TripHotel[], tripStartDate: string): TripHotel | null {
  if (hotels.length === 0) return null;
  const exactMatch = hotels.find((hotel) => hotel.checkIn === tripStartDate);
  return exactMatch ?? hotels[0] ?? null;
}

function pickOutboundFlight(flights: TripFlight[], tripEndDate: string): TripFlight | null {
  if (flights.length === 0) return null;

  const sameDay = flights
    .filter((flight) => flight.depart.date === tripEndDate)
    .sort((a, b) => a.depart.time.localeCompare(b.depart.time));

  if (sameDay.length > 0) {
    return sameDay[sameDay.length - 1] ?? null;
  }

  return (
    [...flights].sort((a, b) => {
      const aStamp = `${a.depart.date}T${a.depart.time}`;
      const bStamp = `${b.depart.date}T${b.depart.time}`;
      return bStamp.localeCompare(aStamp);
    })[0] ?? null
  );
}

function pickCheckOutHotel(hotels: TripHotel[], tripEndDate: string): TripHotel | null {
  if (hotels.length === 0) return null;
  const exactMatch = hotels.find((hotel) => hotel.checkOut === tripEndDate);
  if (exactMatch !== undefined) {
    return exactMatch;
  }
  return (
    [...hotels].sort((a, b) => b.checkOut.localeCompare(a.checkOut))[0] ?? null
  );
}

function createItineraryRow(
  kind: TripItineraryRow["kind"],
  place: string,
  time?: string
): TripItineraryRow {
  return time !== undefined ? { kind, place, time } : { kind, place };
}

function buildAutoStartRows(
  flights: TripFlight[],
  hotels: TripHotel[],
  tripStartDate: string
): TripItineraryRow[] {
  const rows: TripItineraryRow[] = [];
  const inboundFlight = pickInboundFlight(flights, tripStartDate);
  if (inboundFlight !== null) {
    rows.push(
      createItineraryRow(
        "flight",
        `Arrive via ${inboundFlight.airline} ${inboundFlight.flightNumber} at ${inboundFlight.arrive.airportName} (${inboundFlight.arrive.airportIata})`,
        safeTime(inboundFlight.arrive.time)
      )
    );
  }

  const checkInHotel = pickCheckInHotel(hotels, tripStartDate);
  if (checkInHotel !== null) {
    rows.push({
      place: `Hotel check-in: ${checkInHotel.name}`,
      kind: "hotel",
    });
  }

  return rows;
}

function buildAutoEndRows(
  flights: TripFlight[],
  hotels: TripHotel[],
  tripEndDate: string
): TripItineraryRow[] {
  const rows: TripItineraryRow[] = [];

  const checkOutHotel = pickCheckOutHotel(hotels, tripEndDate);
  if (checkOutHotel !== null) {
    rows.push(createItineraryRow("hotel", `Hotel check-out: ${checkOutHotel.name}`));
  }

  const outboundFlight = pickOutboundFlight(flights, tripEndDate);
  if (outboundFlight !== null) {
    rows.push(
      createItineraryRow(
        "flight",
        `Depart via ${outboundFlight.airline} ${outboundFlight.flightNumber} from ${outboundFlight.depart.airportName} (${outboundFlight.depart.airportIata})`,
        safeTime(outboundFlight.depart.time)
      )
    );
  }

  return rows;
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

function extractItineraryDays(
  sections: readonly (WanderlogSection | unknown)[],
  flights: TripFlight[],
  hotels: TripHotel[],
  tripStartDate: string,
  tripEndDate: string
): TripItineraryDay[] {
  const daySections = sections.slice(4);

  return daySections
    .map((section, index): TripItineraryDay | null => {
      const daySection = safeObject(section);
      if (daySection === null || !Array.isArray(daySection["blocks"])) {
        return null;
      }

      const rawHeading = safeString(daySection["heading"]);
      const headingDate = rawHeading !== null ? parseDayDate(rawHeading) : null;
      const date = headingDate ?? addDays(tripStartDate, index);
      const label = buildDayLabel(index, date);
      const rows: TripItineraryRow[] = [];

      for (const rawBlock of daySection["blocks"] as unknown[]) {
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

      if (index === 0) {
        rows.unshift(...buildAutoStartRows(flights, hotels, tripStartDate));
      }
      if (index === daySections.length - 1) {
        rows.push(...buildAutoEndRows(flights, hotels, tripEndDate));
      }

      if (rows.length === 0) {
        return null;
      }

      return { label, date, rows };
    })
    .filter((day): day is TripItineraryDay => day !== null);
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
    const itineraryDays = extractItineraryDays(
      sections,
      flights,
      hotels,
      tripPlan.startDate,
      tripPlan.endDate
    );

    const data: TripData = {
      name: safeTripName(tripPlan.name),
      startDate: tripPlan.startDate,
      endDate: tripPlan.endDate,
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
