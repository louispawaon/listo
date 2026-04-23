/**
 * PDF document template for immigration use.
 * Designed to be clean, formal, and easy to scan at a border.
 *
 * Layout:
 *   Page 1 — Cover: trip summary, flight records, accommodation
 *   Page 2+ — Places to visit (overflow if many entries)
 */

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { TripData, TripFlight, TripHotel, TripItineraryDay, TripPlace } from "../types/trip";
import { formatDate, formatDateRange, formatTime, nightsBetween } from "../lib/formatters";
// Side-effect import: registers Noto Sans (base) + hyphenation policy at module load.
import { FONT_FAMILY, getFontFamilyChain } from "./fonts";

// ─── Design Tokens ────────────────────────────────────────────────────────────

const COLOR = {
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

// Font family is registered in `./fonts` (Noto Sans + lazy per-script fallbacks).
// Bold/italic faces are selected via `fontWeight` / `fontStyle` — inheritance
// from the page-level `fontFamily` carries the family down the tree.
const WEIGHT = {
  bold: "bold",
} as const;

const STYLE = {
  italic: "italic",
} as const;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    paddingTop: 52,
    paddingBottom: 52,
    paddingHorizontal: 56,
    color: COLOR.black,
    backgroundColor: COLOR.white,
  },

  // ── Cover header ──
  coverHeader: {
    marginBottom: 28,
  },
  coverEyebrow: {
    fontSize: 7.5,
    letterSpacing: 1.8,
    color: COLOR.midGray,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  coverTitle: {
    fontSize: 24,
    fontWeight: WEIGHT.bold,
    color: COLOR.black,
    marginBottom: 5,
    lineHeight: 1.2,
  },
  coverDates: {
    fontSize: 11,
    color: COLOR.darkGray,
    marginBottom: 14,
  },
  coverDivider: {
    borderBottomWidth: 2,
    borderBottomColor: COLOR.black,
    marginBottom: 0,
  },

  // ── Summary bar ──
  summaryBar: {
    flexDirection: "row",
    backgroundColor: COLOR.surface,
    padding: 12,
    marginBottom: 28,
    marginTop: 0,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 7,
    letterSpacing: 1.2,
    color: COLOR.lightGray,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  summaryValue: {
    fontSize: 10,
    fontWeight: WEIGHT.bold,
    color: COLOR.black,
  },

  // ── Section ──
  section: {
    marginBottom: 26,
  },
  sectionHeader: {
    fontSize: 7.5,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: COLOR.midGray,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.rule,
    paddingBottom: 5,
    marginBottom: 12,
  },
  emptySection: {
    fontSize: 9,
    color: COLOR.lightGray,
    fontStyle: STYLE.italic,
    paddingVertical: 6,
  },

  // ── Flight card ──
  flightCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    backgroundColor: COLOR.surface,
    padding: 12,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: COLOR.accent,
  },
  flightLeg: {
    flex: 2,
  },
  flightLegRight: {
    flex: 2,
    alignItems: "flex-end",
  },
  flightIata: {
    fontSize: 20,
    fontWeight: WEIGHT.bold,
    letterSpacing: 0.5,
    color: COLOR.black,
  },
  flightCity: {
    fontSize: 8.5,
    color: COLOR.midGray,
    marginTop: 1,
  },
  flightTime: {
    fontSize: 10,
    fontWeight: WEIGHT.bold,
    marginTop: 5,
    color: COLOR.darkGray,
  },
  flightDate: {
    fontSize: 8,
    color: COLOR.lightGray,
    marginTop: 1,
  },
  flightMiddle: {
    flex: 1,
    alignItems: "center",
  },
  flightNumber: {
    fontSize: 9,
    fontWeight: WEIGHT.bold,
    color: COLOR.darkGray,
    marginBottom: 3,
  },
  flightAirline: {
    fontSize: 7.5,
    color: COLOR.lightGray,
    textAlign: "center",
  },
  flightArrow: {
    fontSize: 16,
    color: COLOR.rule,
    marginVertical: 2,
  },

  // ── Hotel card ──
  hotelCard: {
    marginBottom: 8,
    padding: 12,
    backgroundColor: COLOR.surface,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: COLOR.accent,
  },
  hotelName: {
    fontSize: 11,
    fontWeight: WEIGHT.bold,
    marginBottom: 3,
    color: COLOR.black,
  },
  hotelAddress: {
    fontSize: 8.5,
    color: COLOR.midGray,
    marginBottom: 10,
    lineHeight: 1.4,
  },
  hotelMetaRow: {
    flexDirection: "row",
  },
  hotelMetaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 7,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: COLOR.lightGray,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 9,
    fontWeight: WEIGHT.bold,
    color: COLOR.black,
  },
  metaValueMuted: {
    fontSize: 9,
    color: COLOR.lightGray,
    fontStyle: STYLE.italic,
  },
  hotelDivider: {
    borderTopWidth: 1,
    borderTopColor: COLOR.ruleLight,
    marginTop: 10,
    paddingTop: 8,
  },
  hotelContact: {
    flexDirection: "row",
    gap: 16,
  },
  hotelContactItem: {
    flex: 1,
  },

  // ── Places table ──
  placesTable: {
    borderTopWidth: 1,
    borderTopColor: COLOR.rule,
  },
  placeRow: {
    flexDirection: "row",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.ruleLight,
    alignItems: "flex-start",
  },
  placeRowAlt: {
    backgroundColor: COLOR.surface,
  },
  placeIndex: {
    width: 20,
    fontSize: 8,
    color: COLOR.lightGray,
    paddingTop: 1,
  },
  placeName: {
    flex: 2,
    fontSize: 9,
    fontWeight: WEIGHT.bold,
    color: COLOR.black,
    lineHeight: 1.4,
  },
  placeAddress: {
    flex: 3,
    fontSize: 8,
    color: COLOR.midGray,
    lineHeight: 1.4,
    paddingRight: 8,
  },
  placeRating: {
    width: 36,
    fontSize: 8,
    color: COLOR.lightGray,
    textAlign: "right",
    paddingTop: 1,
  },

  // ── Daily itinerary table ──
  itineraryTable: {
    borderTopWidth: 1,
    borderTopColor: COLOR.rule,
  },
  itineraryHeader: {
    flexDirection: "row",
    backgroundColor: COLOR.surfaceDark,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.rule,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  itineraryHeaderTime: {
    width: 72,
    fontSize: 7.5,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: COLOR.midGray,
  },
  itineraryHeaderPlace: {
    flex: 1,
    fontSize: 7.5,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: COLOR.midGray,
  },
  itineraryDayRow: {
    backgroundColor: COLOR.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.rule,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  itineraryDayLabel: {
    fontSize: 9,
    fontWeight: WEIGHT.bold,
    color: COLOR.black,
  },
  itineraryRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLOR.ruleLight,
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  itineraryTime: {
    width: 72,
    fontSize: 8.5,
    color: COLOR.darkGray,
  },
  itineraryPlace: {
    flex: 1,
    fontSize: 9,
    color: COLOR.black,
    lineHeight: 1.35,
  },

  // ── Footer ──
  footer: {
    position: "absolute",
    bottom: 24,
    left: 56,
    right: 56,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: COLOR.ruleLight,
    paddingTop: 7,
  },
  footerText: {
    fontSize: 7,
    color: COLOR.lightGray,
  },
  pageNumber: {
    fontSize: 7,
    color: COLOR.lightGray,
  },
});

// ─── Sub-components ───────────────────────────────────────────────────────────

interface FlightCardProps {
  flight: TripFlight;
}

function FlightCard({ flight }: FlightCardProps): React.ReactElement {
  return (
    <View style={styles.flightCard}>
      <View style={styles.flightLeg}>
        <Text style={styles.flightIata}>{flight.depart.airportIata}</Text>
        <Text style={styles.flightCity}>{flight.depart.airportName}</Text>
        <Text style={styles.flightTime}>{formatTime(flight.depart.time)}</Text>
        <Text style={styles.flightDate}>{formatDate(flight.depart.date)}</Text>
      </View>

      <View style={styles.flightMiddle}>
        <Text style={styles.flightNumber}>{flight.flightNumber}</Text>
        <Text style={styles.flightArrow}>──→</Text>
        <Text style={styles.flightAirline}>{flight.airline}</Text>
      </View>

      <View style={styles.flightLegRight}>
        <Text style={styles.flightIata}>{flight.arrive.airportIata}</Text>
        <Text style={styles.flightCity}>{flight.arrive.airportName}</Text>
        <Text style={styles.flightTime}>{formatTime(flight.arrive.time)}</Text>
        <Text style={styles.flightDate}>{formatDate(flight.arrive.date)}</Text>
      </View>
    </View>
  );
}

interface HotelCardProps {
  hotel: TripHotel;
}

function HotelCard({ hotel }: HotelCardProps): React.ReactElement {
  const nights = nightsBetween(hotel.checkIn, hotel.checkOut);
  const hasContact = hotel.phone !== null || hotel.website !== null;

  return (
    <View style={styles.hotelCard}>
      <Text style={styles.hotelName}>{hotel.name}</Text>
      <Text style={styles.hotelAddress}>{hotel.address}</Text>

      <View style={styles.hotelMetaRow}>
        <View style={styles.hotelMetaItem}>
          <Text style={styles.metaLabel}>Check-in</Text>
          <Text style={styles.metaValue}>{formatDate(hotel.checkIn)}</Text>
        </View>
        <View style={styles.hotelMetaItem}>
          <Text style={styles.metaLabel}>Check-out</Text>
          <Text style={styles.metaValue}>{formatDate(hotel.checkOut)}</Text>
        </View>
        <View style={styles.hotelMetaItem}>
          <Text style={styles.metaLabel}>Nights</Text>
          <Text style={styles.metaValue}>{nights}</Text>
        </View>
        <View style={styles.hotelMetaItem}>
          <Text style={styles.metaLabel}>Confirmation</Text>
          {hotel.confirmationNumber !== null ? (
            <Text style={styles.metaValue}>{hotel.confirmationNumber}</Text>
          ) : (
            <Text style={styles.metaValueMuted}>Not provided</Text>
          )}
        </View>
      </View>

      {hasContact && (
        <View style={styles.hotelDivider}>
          <View style={styles.hotelContact}>
            {hotel.phone !== null && (
              <View style={styles.hotelContactItem}>
                <Text style={styles.metaLabel}>Phone</Text>
                <Text style={styles.metaValue}>{hotel.phone}</Text>
              </View>
            )}
            {hotel.website !== null && (
              <View style={styles.hotelContactItem}>
                <Text style={styles.metaLabel}>Website</Text>
                <Text style={styles.metaValue}>{hotel.website}</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

interface PlacesTableProps {
  places: TripPlace[];
}

function PlacesTable({ places }: PlacesTableProps): React.ReactElement {
  return (
    <View style={styles.placesTable}>
      {places.map((place, index) => (
        <View
          key={place.id}
          style={[styles.placeRow, index % 2 !== 0 ? styles.placeRowAlt : {}]}
        >
          <Text style={styles.placeIndex}>{index + 1}.</Text>
          <Text style={styles.placeName}>{place.name}</Text>
          <Text style={styles.placeAddress}>{place.address}</Text>
          <Text style={styles.placeRating}>
            {place.rating > 0 ? `★ ${place.rating.toFixed(1)}` : "—"}
          </Text>
        </View>
      ))}
    </View>
  );
}

interface ItineraryTableProps {
  itineraryDays: TripItineraryDay[];
}

function ItineraryTable({ itineraryDays }: ItineraryTableProps): React.ReactElement {
  return (
    <View style={styles.itineraryTable}>
      <View style={styles.itineraryHeader}>
        <Text style={styles.itineraryHeaderTime}>Time</Text>
        <Text style={styles.itineraryHeaderPlace}>Place / Activity</Text>
      </View>
      {itineraryDays.map((day) => (
        <View key={`${day.label}-${day.date ?? "na"}`}>
          <View style={styles.itineraryDayRow}>
            <Text style={styles.itineraryDayLabel}>{day.label}</Text>
          </View>
          {day.rows.map((row, index) => (
            <View key={`${day.label}-${index}`} style={styles.itineraryRow}>
              <Text style={styles.itineraryTime}>{row.time ?? ""}</Text>
              <Text style={styles.itineraryPlace}>{row.place}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

// ─── Summary helpers ──────────────────────────────────────────────────────────

function tripDurationNights(startDate: string, endDate: string): number {
  const a = new Date(`${startDate}T00:00:00`).getTime();
  const b = new Date(`${endDate}T00:00:00`).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function destinationSummary(hotels: TripHotel[], flights: TripFlight[]): string {
  // Prefer hotel cities; fall back to flight arrival cities
  if (hotels.length > 0) {
    const cities = [...new Set(hotels.map((h) => h.address.split(",").pop()?.trim() ?? ""))].filter(
      Boolean
    );
    if (cities.length > 0) return cities.join(", ");
  }
  if (flights.length > 0) {
    const cities = [...new Set(flights.map((f) => f.arrive.city))];
    return cities.join(", ");
  }
  return "—";
}

// ─── Main Document ────────────────────────────────────────────────────────────

interface TripPDFDocumentProps {
  trip: TripData;
  generatedAt: string;
}

export function TripPDFDocument({ trip, generatedAt }: TripPDFDocumentProps): React.ReactElement {
  const nights = tripDurationNights(trip.startDate, trip.endDate);
  const destination = destinationSummary(trip.hotels, trip.flights);
  // Snapshot the current chain at render time — `ensureFontsForScripts`
  // has already run by this point (see generator.tsx). The array form is
  // react-pdf v4's per-codepoint fallback mechanism.
  const fontFamily = [...getFontFamilyChain()];

  return (
    <Document
      title={`${trip.name} — Travel Itinerary`}
      author="Wanderlog Exporter"
      subject="Immigration Travel Document"
      keywords="itinerary, travel, immigration"
    >
      <Page size="A4" style={[styles.page, { fontFamily }]}>

        {/* ── Cover header ── */}
        <View style={styles.coverHeader}>
          <Text style={styles.coverEyebrow}>Travel Itinerary</Text>
          <Text style={styles.coverTitle}>{trip.name}</Text>
          <Text style={styles.coverDates}>{formatDateRange(trip.startDate, trip.endDate)}</Text>
          <View style={styles.coverDivider} />
        </View>

        {/* ── Summary bar ── */}
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Duration</Text>
            <Text style={styles.summaryValue}>{nights} night{nights !== 1 ? "s" : ""}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Destination</Text>
            <Text style={styles.summaryValue}>{destination}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Flights</Text>
            <Text style={styles.summaryValue}>{trip.flights.length}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Hotels</Text>
            <Text style={styles.summaryValue}>{trip.hotels.length}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Places</Text>
            <Text style={styles.summaryValue}>{trip.places.length}</Text>
          </View>
        </View>

        {/* ── Daily itinerary ── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Daily Itinerary</Text>
          {trip.itineraryDays.length === 0 ? (
            <Text style={styles.emptySection}>No daily itinerary entries found.</Text>
          ) : (
            <ItineraryTable itineraryDays={trip.itineraryDays} />
          )}
        </View>

        {/* ── Flights ── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Flight Records</Text>
          {trip.flights.length === 0 ? (
            <Text style={styles.emptySection}>No flights recorded.</Text>
          ) : (
            trip.flights.map((flight) => (
              <FlightCard key={flight.id} flight={flight} />
            ))
          )}
        </View>

        {/* ── Hotels ── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Accommodation</Text>
          {trip.hotels.length === 0 ? (
            <Text style={styles.emptySection}>No accommodations recorded.</Text>
          ) : (
            trip.hotels.map((hotel) => (
              <HotelCard key={hotel.id} hotel={hotel} />
            ))
          )}
        </View>

        {/* ── Places (only if they fit on the same page, else new page) ── */}
        {trip.places.length > 0 && (
          <View style={styles.section} break={trip.hotels.length > 2}>
            <Text style={styles.sectionHeader}>Places to Visit</Text>
            <PlacesTable places={trip.places} />
          </View>
        )}

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Generated by Listo · {generatedAt}
          </Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
