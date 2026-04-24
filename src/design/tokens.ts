/**
 * Shared design tokens for Listo.
 *
 * This module is the single source of truth for colors, spacing, and
 * typography used by *both* the PDF renderer (`src/pdf/TripPDFDocument.tsx`)
 * and the editor UI (`src/editor/**`). Keeping them in lockstep is the whole
 * point of the WYSIWYG refactor — a change here propagates to both surfaces.
 *
 * Numeric values use PDF "points" (1pt = 1/72in) as their native unit. The
 * editor bridges them to CSS pixels at 96 DPI via `ptToPx()` and the CSS
 * variables emitted from `src/editor/styles.css`.
 *
 * Keep this file free of React / react-pdf imports so it can be consumed
 * from anywhere (future build-step codegen, tests, etc.).
 */

// ─── Unit conversion ─────────────────────────────────────────────────────────

/**
 * Convert PDF points to CSS pixels at 96 DPI (browser default).
 * 1pt = 1/72 inch, 1 CSS px = 1/96 inch, so 1pt = 96/72 px = 1.333… px.
 */
export function ptToPx(pt: number): number {
  return (pt * 96) / 72;
}

// ─── Colors ──────────────────────────────────────────────────────────────────

export const COLOR = {
  black: "#0f0f0f",
  darkGray: "#333333",
  midGray: "#666666",
  lightGray: "#999999",
  rule: "#dddddd",
  ruleLight: "#eeeeee",
  surface: "#f7f7f7",
  surfaceDark: "#efefef",
  white: "#ffffff",
  accent: "#1a1a1a",
} as const;

export type ColorToken = keyof typeof COLOR;

// ─── Font weight / style ─────────────────────────────────────────────────────

export const WEIGHT = {
  normal: "normal",
  bold: "bold",
} as const;

export const STYLE = {
  normal: "normal",
  italic: "italic",
} as const;

// ─── Typography sizes (in pt) ────────────────────────────────────────────────

export const TYPE = {
  // Page default body
  body: 10,
  // Cover
  coverEyebrow: 7.5,
  coverTitle: 24,
  coverDates: 11,
  // Summary bar
  summaryLabel: 7,
  summaryValue: 10,
  // Section header ("eyebrow" style)
  sectionHeader: 7.5,
  // Flight card
  flightIata: 20,
  flightCity: 8.5,
  flightTime: 10,
  flightDate: 8,
  flightNumber: 9,
  flightAirline: 7.5,
  flightArrow: 16,
  // Hotel card
  hotelName: 11,
  hotelAddress: 8.5,
  metaLabel: 7,
  metaValue: 9,
  // Places table
  placeIndex: 8,
  placeName: 9,
  placeAddress: 8,
  placeRating: 8,
  // Notes list
  noteTitle: 10,
  noteContent: 9,
  // Itinerary table
  itineraryHeader: 7.5,
  itineraryDayLabel: 9,
  itineraryTime: 8.5,
  itineraryKind: 8.5,
  itineraryPlace: 9,
  itineraryNotes: 8,
  itineraryEmptyDay: 8.5,
  // Empty state
  emptySection: 9,
  // Footer
  footer: 7,
} as const;

// ─── Letter-spacing (in pt) ──────────────────────────────────────────────────

export const TRACKING = {
  coverEyebrow: 1.8,
  summaryLabel: 1.2,
  sectionHeader: 1.8,
  metaLabel: 1,
  itineraryHeader: 1,
} as const;

// ─── Line heights (unit-less multipliers) ────────────────────────────────────

export const LINE_HEIGHT = {
  coverTitle: 1.2,
  hotelAddress: 1.4,
  placeName: 1.4,
  placeAddress: 1.4,
  noteContent: 1.4,
  itineraryPlace: 1.35,
} as const;

// ─── Page & spacing (in pt) ──────────────────────────────────────────────────

export const PAGE = {
  // A4 at 72dpi (pt): 595 × 842
  widthPt: 595,
  heightPt: 842,
  paddingTop: 52,
  paddingBottom: 52,
  paddingHorizontal: 56,
  // Footer offset (bottom: 24pt in the PDF)
  footerBottom: 24,
} as const;

export const SPACE = {
  // Section block
  sectionMarginBottom: 26,
  sectionHeaderPaddingBottom: 5,
  sectionHeaderMarginBottom: 12,
  // Cover
  coverHeaderMarginBottom: 28,
  coverEyebrowMarginBottom: 8,
  coverTitleMarginBottom: 5,
  coverDatesMarginBottom: 14,
  // Summary bar
  summaryBarPadding: 12,
  summaryBarMarginBottom: 28,
  summaryLabelMarginBottom: 3,
  // Card padding
  cardPadding: 12,
  cardMarginBottom: 8,
  cardBorderLeftWidth: 3,
  // Meta row
  metaLabelMarginBottom: 2,
  // Hotel
  hotelNameMarginBottom: 3,
  hotelAddressMarginBottom: 10,
  hotelDividerMarginTop: 10,
  hotelDividerPaddingTop: 8,
  hotelContactGap: 16,
  // Flight
  flightTimeMarginTop: 5,
  flightDateMarginTop: 1,
  flightCityMarginTop: 1,
  flightNumberMarginBottom: 3,
  flightArrowMarginVertical: 2,
  // Places
  placeRowPaddingY: 7,
  placeIndexWidth: 20,
  placeRatingWidth: 36,
  placeAddressPaddingRight: 8,
  // Notes
  noteRowPadding: 10,
  noteRowMarginBottom: 8,
  noteTitleMarginBottom: 3,
  // Itinerary
  itineraryHeaderPaddingY: 6,
  itineraryHeaderPaddingX: 8,
  itineraryDayPaddingY: 6,
  itineraryDayPaddingX: 8,
  itineraryRowPaddingY: 7,
  itineraryRowPaddingX: 8,
  itineraryTimeWidth: 60,
  itineraryKindWidth: 72,
  itineraryNotesMarginTop: 2,
  // Radius
  radius: 4,
  // Footer
  footerPaddingTop: 7,
} as const;

// ─── Font family ─────────────────────────────────────────────────────────────

export const FONT_FAMILY_PRIMARY = "Noto Sans";

/**
 * CSS font-family stack for the browser, used by the editor. The PDF side
 * builds its own chain via `src/pdf/fonts.ts::getFontFamilyChain()` so
 * react-pdf can cascade per-codepoint across script-specific families.
 */
export const FONT_STACK_CSS =
  `"${FONT_FAMILY_PRIMARY}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
