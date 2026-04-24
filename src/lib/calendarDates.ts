/**
 * Calendar-only YYYY-MM-DD math (no local-midnight → UTC day shift).
 * Flight/hotel keys and trip bounds from Wanderlog are plain calendar dates.
 */

import type { TripFlight, TripHotel } from "../types/trip";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Max inclusive days for enumerate / range cap (leap-year safe margin). */
export const MAX_CALENDAR_SPAN_DAYS = 370;

export function isIsoDateString(s: string): boolean {
  return ISO_DATE.test(s);
}

export function parseIsoDate(iso: string): { y: number; m: number; d: number } | null {
  if (!ISO_DATE.test(iso)) return null;
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  const d = Number(iso.slice(8, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

/** Add calendar days using UTC date parts only (timezone-neutral). */
export function addCalendarDays(iso: string, delta: number): string | null {
  const p = parseIsoDate(iso);
  if (p === null) return null;
  const t = Date.UTC(p.y, p.m - 1, p.d + delta);
  const out = new Date(t);
  const y = out.getUTCFullYear();
  const mo = String(out.getUTCMonth() + 1).padStart(2, "0");
  const day = String(out.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

/** Inclusive range of ISO calendar dates from `start` through `end` (lex order). */
export function enumerateInclusiveRange(start: string, end: string): string[] {
  if (!ISO_DATE.test(start) || !ISO_DATE.test(end) || start > end) {
    return [];
  }
  const out: string[] = [];
  let cur = start;
  for (let i = 0; i < MAX_CALENDAR_SPAN_DAYS; i++) {
    out.push(cur);
    if (cur === end) break;
    const next = addCalendarDays(cur, 1);
    if (next === null || next > end) break;
    cur = next;
  }
  return out;
}

function minIso(a: string, b: string): string {
  return a < b ? a : b;
}

function maxIso(a: string, b: string): string {
  return a > b ? a : b;
}

function considerDate(
  candidate: string | null | undefined,
  acc: { start: string; end: string }
): void {
  if (candidate === null || candidate === undefined) return;
  if (!ISO_DATE.test(candidate)) return;
  acc.start = minIso(acc.start, candidate);
  acc.end = maxIso(acc.end, candidate);
}

/**
 * Union of trip bounds with all flight / hotel / optional itinerary dates,
 * then capped to {@link MAX_CALENDAR_SPAN_DAYS} so checkout / return legs stay included.
 */
export function effectiveTripBounds(
  tripStart: string,
  tripEnd: string,
  flights: readonly TripFlight[],
  hotels: readonly TripHotel[],
  extraDates?: readonly (string | null)[]
): { start: string; end: string } {
  const acc = { start: tripStart, end: tripEnd };
  if (!ISO_DATE.test(acc.start) || !ISO_DATE.test(acc.end)) {
    return acc;
  }

  for (const f of flights) {
    considerDate(f.depart.date, acc);
    considerDate(f.arrive.date, acc);
  }
  for (const h of hotels) {
    considerDate(h.checkIn, acc);
    considerDate(h.checkOut, acc);
  }
  if (extraDates !== undefined) {
    for (const d of extraDates) {
      considerDate(d ?? undefined, acc);
    }
  }

  if (acc.start > acc.end) {
    return { start: tripStart, end: tripEnd };
  }

  const limitEnd = addCalendarDays(acc.start, MAX_CALENDAR_SPAN_DAYS - 1);
  if (limitEnd !== null && acc.end > limitEnd) {
    acc.end = limitEnd;
  }

  return acc;
}
