/**
 * Clean, normalized types for our application layer.
 * These are what we map Wanderlog's raw store data into.
 * The PDF renderer and UI only ever touch these types.
 */

export interface TripFlight {
  id: number;
  airline: string;
  flightNumber: string;       // e.g. "5J 592"
  depart: {
    airportIata: string;
    airportName: string;
    city: string;
    date: string;             // "YYYY-MM-DD"
    time: string;             // "HH:MM"
  };
  arrive: {
    airportIata: string;
    airportName: string;
    city: string;
    date: string;
    time: string;
  };
}

export interface TripHotel {
  id: number;
  name: string;
  address: string;
  checkIn: string;            // "YYYY-MM-DD"
  checkOut: string;           // "YYYY-MM-DD"
  confirmationNumber: string | null;
  phone: string | null;
  website: string | null;
}

export interface TripPlace {
  id: number;
  name: string;
  address: string;
  rating: number;
}

export type TripItineraryRowKind = "place" | "checklist" | "flight" | "hotel";

export interface TripItineraryRow {
  time?: string;
  place: string;
  kind: TripItineraryRowKind;
}

export interface TripItineraryDay {
  label: string;
  date: string | null;
  rows: TripItineraryRow[];
}

export interface TripData {
  name: string;
  startDate: string;          // "YYYY-MM-DD"
  endDate: string;            // "YYYY-MM-DD"
  flights: TripFlight[];
  hotels: TripHotel[];
  places: TripPlace[];
  itineraryDays: TripItineraryDay[];
}

// Result type for safe extraction
export type ExtractionResult =
  | { success: true; data: TripData }
  | { success: false; error: string };
