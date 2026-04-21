/**
 * Raw types that mirror the Wanderlog MobX store shape.
 * These are intentionally loose in places (unknown) because
 * the store contains data we don't use and don't want to
 * accidentally rely on without verifying.
 */

export interface WanderlogGooglePlace {
  name: string;
  formatted_address: string;
  international_phone_number: string | null;
  website: string | null;
  rating?: number;
  user_ratings_total?: number;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

export interface WanderlogAirport {
  iata: string;
  name: string;
  cityName: string;
  googlePlace: WanderlogGooglePlace;
}

export interface WanderlogFlightLeg {
  type: "depart" | "arrive";
  airport: WanderlogAirport;
  date: string;   // "YYYY-MM-DD"
  time: string;   // "HH:MM"
}

export interface WanderlogAirline {
  iata: string;
  name: string;
}

export interface WanderlogFlightInfo {
  airline: WanderlogAirline;
  number: number;
}

export interface WanderlogHotelInfo {
  checkIn: string;   // "YYYY-MM-DD"
  checkOut: string;  // "YYYY-MM-DD"
  travelerNames: string[];
  confirmationNumber: string | null;
}

export interface WanderlogPlace {
  name: string;
  place_id: string;
  formatted_address: string;
  rating: number;
  user_ratings_total: number;
  website: string | null;
  international_phone_number: string | null;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

// Discriminated union for block types
export type WanderlogBlock =
  | WanderlogFlightBlock
  | WanderlogPlaceBlock
  | WanderlogChecklistBlock;

export interface WanderlogFlightBlock {
  id: number;
  type: "flight";
  flightInfo: WanderlogFlightInfo;
  depart: WanderlogFlightLeg;
  arrive: WanderlogFlightLeg;
}

export interface WanderlogPlaceBlock {
  id: number;
  type: "place";
  place: WanderlogPlace;
  hotel?: WanderlogHotelInfo;
}

export interface WanderlogChecklistBlock {
  id: number;
  type: "checklist";
  title: string;
}

export interface WanderlogSection {
  heading: string;
  blocks: WanderlogBlock[];
}

export interface WanderlogItinerary {
  sections: [
    unknown,               // index 0 - unused
    WanderlogSection,      // index 1 - flights
    WanderlogSection,      // index 2 - hotels
    WanderlogSection,      // index 3 - places
    ...unknown[]
  ];
}

export interface WanderlogTripPlan {
  name: string;
  startDate: string;  // "YYYY-MM-DD"
  endDate: string;    // "YYYY-MM-DD"
  itinerary: WanderlogItinerary;
}

export interface WanderlogTripPlanStoreData {
  tripPlan: WanderlogTripPlan;
}

export interface WanderlogTripPlanStore {
  data: WanderlogTripPlanStoreData;
}

export interface WanderlogMobXState {
  tripPlanStore: WanderlogTripPlanStore;
}

// Window augmentation - what we read from the page
declare global {
  interface Window {
    __MOBX_STATE__?: WanderlogMobXState;
  }
}
