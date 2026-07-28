/**
 * Flight ordering heuristics shared by the Wanderlog extractor and editor
 * hydration (e.g. which leg represents arriving at the trip destination).
 */

import type { TripFlight } from "../types/trip";

/** Flight whose arrival best matches the start of the trip (outbound / inbound leg). */
export function pickInboundFlight(flights: TripFlight[], tripStartDate: string): TripFlight | null {
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
