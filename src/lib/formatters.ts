/**
 * Date and formatting utilities.
 * All functions are pure and type-safe.
 */

/**
 * Formats "YYYY-MM-DD" → "September 27, 2026"
 */
export function formatDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Formats "HH:MM" → "8:00 AM"
 */
export function formatTime(time: string): string {
  const [hourStr, minuteStr] = time.split(":");
  const hour = parseInt(hourStr ?? "0", 10);
  const minute = minuteStr ?? "00";
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minute} ${period}`;
}

/**
 * Number of nights between two "YYYY-MM-DD" strings
 */
export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(`${checkIn}T00:00:00`).getTime();
  const b = new Date(`${checkOut}T00:00:00`).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

/**
 * Formats a date range for display
 * e.g. "September 27 – October 2, 2026"
 */
export function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  const startFormatted = start.toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    ...(!sameYear && { year: "numeric" }),
  });

  const endFormatted = end.toLocaleDateString("en-PH", {
    month: !sameMonth ? "long" : undefined,
    day: "numeric",
    year: "numeric",
  });

  return `${startFormatted} – ${endFormatted}`;
}
