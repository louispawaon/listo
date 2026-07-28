/**
 * Listo editor document model.
 *
 * A `ListoDocument` is the in-memory and on-disk representation of an edited trip.
 * It is hydrated from a `TripData` extraction (see `src/lib/initEditorState.ts`)
 * or loaded verbatim from a `.listo` file.
 *
 * Design notes:
 * - All entity collections carry an `order: number` field. `order` values are
 *   always a contiguous 0..n-1 integer sequence; reducers must recompute after
 *   any reorder. Do not use fractional indices.
 * - Blocks and activities use discriminated unions on `type` / `source`.
 *   Consumers should `switch` exhaustively (ESLint enforces this).
 * - `AutoActivity` is defined for forward compatibility but is not produced by
 *   `initEditorState` in v1 — all hydrated activities are `ManualActivity`.
 */

// ─── Root ────────────────────────────────────────────────────────────────────

export interface ListoDocument {
  version: 1;
  savedAt: string;
  source: ListoSource;
  /** Wanderlog plan URL at extraction time; used to pick the correct tab on sync. */
  wanderlogUrl?: string;
  meta: TripMeta;
  sections: ListoSection[];
  /**
   * How many sections (in `order`) appear before the daily itinerary block.
   * Range `0..sections.length`. Omitted or out of range is treated as
   * `sections.length` (itinerary last), matching legacy documents.
   */
  itineraryIndex?: number;
  days: TripDay[];
}

export type ListoSource = "wanderlog" | "listo-file";

// ─── Meta ────────────────────────────────────────────────────────────────────

export interface TripMeta {
  name: string;
  startDate: string;
  endDate: string;
  destination: string;
}

// ─── Sections ────────────────────────────────────────────────────────────────

export type ListoSectionKind = "flights" | "hotels" | "places" | "notes";

export interface ListoSection {
  id: string;
  kind: ListoSectionKind;
  heading: string;
  order: number;
  blocks: ListoBlock[];
}

// ─── Blocks ──────────────────────────────────────────────────────────────────

export type ListoBlock =
  | ListoFlightBlock
  | ListoHotelBlock
  | ListoPlaceBlock
  | ListoNoteBlock;

export type ListoBlockType = ListoBlock["type"];

export interface ListoFlightEndpoint {
  airportIata: string;
  airportName: string;
  city: string;
  date: string;
  time: string;
}

export interface ListoFlightBlock {
  id: string;
  type: "flight";
  order: number;
  /** Wanderlog block id; set during extraction for sync matching. */
  wanderlogId?: number;
  airline: string;
  flightNumber: string;
  depart: ListoFlightEndpoint;
  arrive: ListoFlightEndpoint;
}

export interface ListoHotelBlock {
  id: string;
  type: "hotel";
  order: number;
  /** Wanderlog block id; set during extraction for sync matching. */
  wanderlogId?: number;
  name: string;
  address: string;
  checkIn: string;
  checkOut: string;
  confirmationNumber: string | null;
  phone: string | null;
  website: string | null;
}

export interface ListoPlaceBlock {
  id: string;
  type: "place";
  order: number;
  /** Wanderlog block id; set during extraction for sync matching. */
  wanderlogId?: number;
  name: string;
  address: string;
  rating: number;
}

export interface ListoNoteBlock {
  id: string;
  type: "note";
  order: number;
  title: string;
  content: string;
}

// ─── Days ────────────────────────────────────────────────────────────────────

export interface TripDay {
  id: string;
  date: string | null;
  label: string;
  order: number;
  activities: Activity[];
}

// ─── Activities ──────────────────────────────────────────────────────────────

export type Activity = AutoActivity | ManualActivity;

export type AutoActivityKind = "flight" | "hotel" | "place" | "note";
export type ManualActivityKind = "meal" | "transport" | "activity" | "note";

export interface AutoActivity {
  id: string;
  source: "auto";
  order: number;
  kind: AutoActivityKind;
  label: string;
  time: string | undefined;
  blockRef: string;
}

export interface ManualActivity {
  id: string;
  source: "manual";
  order: number;
  kind: ManualActivityKind;
  label: string;
  time: string | undefined;
  notes: string | undefined;
  /** Stable key from Wanderlog row; set during extraction for sync matching. */
  wanderlogKey?: string;
}
