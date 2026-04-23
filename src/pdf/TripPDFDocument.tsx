/**
 * PDF document template for immigration use.
 * Designed to be clean, formal, and easy to scan at a border.
 *
 * Rendering order follows the document: sections are emitted in their current
 * drag-sorted order, then the daily itinerary table is appended.
 */

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type {
  Activity,
  ListoDocument,
  ListoFlightBlock,
  ListoHotelBlock,
  ListoNoteBlock,
  ListoPlaceBlock,
  ListoSection,
  TripDay,
} from "../types/listo";
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
  coverHeader: { marginBottom: 28 },
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
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  summaryItem: { flex: 1 },
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
  section: { marginBottom: 26 },
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
  flightLeg: { flex: 2 },
  flightLegRight: { flex: 2, alignItems: "flex-end" },
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
  flightMiddle: { flex: 1, alignItems: "center" },
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
  hotelMetaRow: { flexDirection: "row" },
  hotelMetaItem: { flex: 1 },
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
  hotelContact: { flexDirection: "row", gap: 16 },
  hotelContactItem: { flex: 1 },

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
  placeRowAlt: { backgroundColor: COLOR.surface },
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

  // ── Notes list ──
  noteRow: {
    marginBottom: 8,
    padding: 10,
    backgroundColor: COLOR.surface,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: COLOR.accent,
  },
  noteTitle: {
    fontSize: 10,
    fontWeight: WEIGHT.bold,
    color: COLOR.black,
    marginBottom: 3,
  },
  noteContent: {
    fontSize: 9,
    color: COLOR.darkGray,
    lineHeight: 1.4,
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
    width: 60,
    fontSize: 7.5,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: COLOR.midGray,
  },
  itineraryHeaderKind: {
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
    width: 60,
    fontSize: 8.5,
    color: COLOR.darkGray,
  },
  itineraryKind: {
    width: 72,
    fontSize: 8.5,
    color: COLOR.midGray,
  },
  itineraryPlace: {
    flex: 1,
    fontSize: 9,
    color: COLOR.black,
    lineHeight: 1.35,
  },
  itineraryNotes: {
    fontSize: 8,
    color: COLOR.midGray,
    marginTop: 2,
    fontStyle: STYLE.italic,
  },
  itineraryEmptyDay: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 8.5,
    color: COLOR.lightGray,
    fontStyle: STYLE.italic,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.ruleLight,
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
  footerText: { fontSize: 7, color: COLOR.lightGray },
  pageNumber: { fontSize: 7, color: COLOR.lightGray },
});

// ─── Sub-components ───────────────────────────────────────────────────────────

function FlightCardView({ flight }: { flight: ListoFlightBlock }): React.ReactElement {
  return (
    <View style={styles.flightCard}>
      <View style={styles.flightLeg}>
        <Text style={styles.flightIata}>{flight.depart.airportIata || "—"}</Text>
        <Text style={styles.flightCity}>{flight.depart.airportName}</Text>
        <Text style={styles.flightTime}>
          {flight.depart.time !== "" ? formatTime(flight.depart.time) : "—"}
        </Text>
        <Text style={styles.flightDate}>
          {flight.depart.date !== "" ? formatDate(flight.depart.date) : ""}
        </Text>
      </View>

      <View style={styles.flightMiddle}>
        <Text style={styles.flightNumber}>{flight.flightNumber}</Text>
        <Text style={styles.flightArrow}>──→</Text>
        <Text style={styles.flightAirline}>{flight.airline}</Text>
      </View>

      <View style={styles.flightLegRight}>
        <Text style={styles.flightIata}>{flight.arrive.airportIata || "—"}</Text>
        <Text style={styles.flightCity}>{flight.arrive.airportName}</Text>
        <Text style={styles.flightTime}>
          {flight.arrive.time !== "" ? formatTime(flight.arrive.time) : "—"}
        </Text>
        <Text style={styles.flightDate}>
          {flight.arrive.date !== "" ? formatDate(flight.arrive.date) : ""}
        </Text>
      </View>
    </View>
  );
}

function HotelCardView({ hotel }: { hotel: ListoHotelBlock }): React.ReactElement {
  const nights =
    hotel.checkIn !== "" && hotel.checkOut !== ""
      ? nightsBetween(hotel.checkIn, hotel.checkOut)
      : 0;
  const hasContact = hotel.phone !== null || hotel.website !== null;

  return (
    <View style={styles.hotelCard}>
      <Text style={styles.hotelName}>{hotel.name || "Unnamed hotel"}</Text>
      {hotel.address !== "" && <Text style={styles.hotelAddress}>{hotel.address}</Text>}

      <View style={styles.hotelMetaRow}>
        <View style={styles.hotelMetaItem}>
          <Text style={styles.metaLabel}>Check-in</Text>
          <Text style={styles.metaValue}>
            {hotel.checkIn !== "" ? formatDate(hotel.checkIn) : "—"}
          </Text>
        </View>
        <View style={styles.hotelMetaItem}>
          <Text style={styles.metaLabel}>Check-out</Text>
          <Text style={styles.metaValue}>
            {hotel.checkOut !== "" ? formatDate(hotel.checkOut) : "—"}
          </Text>
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

function PlacesTableView({ places }: { places: ListoPlaceBlock[] }): React.ReactElement {
  return (
    <View style={styles.placesTable}>
      {places.map((place, index) => (
        <View
          key={place.id}
          style={[styles.placeRow, index % 2 !== 0 ? styles.placeRowAlt : {}]}
        >
          <Text style={styles.placeIndex}>{index + 1}.</Text>
          <Text style={styles.placeName}>{place.name || "Unnamed place"}</Text>
          <Text style={styles.placeAddress}>{place.address}</Text>
          <Text style={styles.placeRating}>
            {place.rating > 0 ? `★ ${place.rating.toFixed(1)}` : "—"}
          </Text>
        </View>
      ))}
    </View>
  );
}

function NotesListView({ notes }: { notes: ListoNoteBlock[] }): React.ReactElement {
  return (
    <View>
      {notes.map((note) => (
        <View key={note.id} style={styles.noteRow}>
          {note.title !== "" && <Text style={styles.noteTitle}>{note.title}</Text>}
          {note.content !== "" && <Text style={styles.noteContent}>{note.content}</Text>}
        </View>
      ))}
    </View>
  );
}

function SectionBody({ section }: { section: ListoSection }): React.ReactElement {
  if (section.blocks.length === 0) {
    return (
      <Text style={styles.emptySection}>
        No {section.kind} recorded.
      </Text>
    );
  }

  switch (section.kind) {
    case "flights": {
      const flights = section.blocks.filter(
        (b): b is ListoFlightBlock => b.type === "flight"
      );
      return (
        <View>
          {flights.map((flight) => (
            <FlightCardView key={flight.id} flight={flight} />
          ))}
        </View>
      );
    }
    case "hotels": {
      const hotels = section.blocks.filter(
        (b): b is ListoHotelBlock => b.type === "hotel"
      );
      return (
        <View>
          {hotels.map((hotel) => (
            <HotelCardView key={hotel.id} hotel={hotel} />
          ))}
        </View>
      );
    }
    case "places": {
      const places = section.blocks.filter(
        (b): b is ListoPlaceBlock => b.type === "place"
      );
      return <PlacesTableView places={places} />;
    }
    case "notes": {
      const notes = section.blocks.filter(
        (b): b is ListoNoteBlock => b.type === "note"
      );
      return <NotesListView notes={notes} />;
    }
  }
}

// ─── Daily itinerary ─────────────────────────────────────────────────────────

function activityKindLabel(activity: Activity): string {
  if (activity.source === "manual") {
    switch (activity.kind) {
      case "meal":
        return "Meal";
      case "transport":
        return "Transport";
      case "activity":
        return "Activity";
      case "note":
        return "Note";
    }
  }
  switch (activity.kind) {
    case "flight":
      return "Flight";
    case "hotel":
      return "Hotel";
    case "place":
      return "Place";
    case "note":
      return "Note";
  }
}

function formatActivityTime(activity: Activity): string {
  if (activity.time === undefined || activity.time === "") return "—";
  return formatTime(activity.time);
}

function ItineraryTableView({ days }: { days: TripDay[] }): React.ReactElement {
  return (
    <View style={styles.itineraryTable}>
      <View style={styles.itineraryHeader}>
        <Text style={styles.itineraryHeaderTime}>Time</Text>
        <Text style={styles.itineraryHeaderKind}>Kind</Text>
        <Text style={styles.itineraryHeaderPlace}>Activity</Text>
      </View>
      {days.map((day) => (
        <View key={day.id}>
          <View style={styles.itineraryDayRow}>
            <Text style={styles.itineraryDayLabel}>{day.label}</Text>
          </View>
          {day.activities.length === 0 ? (
            <Text style={styles.itineraryEmptyDay}>No activities planned.</Text>
          ) : (
            day.activities.map((activity) => (
              <View key={activity.id} style={styles.itineraryRow}>
                <Text style={styles.itineraryTime}>{formatActivityTime(activity)}</Text>
                <Text style={styles.itineraryKind}>{activityKindLabel(activity)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itineraryPlace}>{activity.label}</Text>
                  {activity.source === "manual" &&
                    activity.notes !== undefined &&
                    activity.notes !== "" && (
                      <Text style={styles.itineraryNotes}>{activity.notes}</Text>
                    )}
                </View>
              </View>
            ))
          )}
        </View>
      ))}
    </View>
  );
}

// ─── Summary helpers ──────────────────────────────────────────────────────────

function tripDurationNights(startDate: string, endDate: string): number {
  if (startDate === "" || endDate === "") return 0;
  const a = new Date(`${startDate}T00:00:00`).getTime();
  const b = new Date(`${endDate}T00:00:00`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function countBlocks(doc: ListoDocument, kind: ListoSection["kind"]): number {
  return doc.sections
    .filter((s) => s.kind === kind)
    .reduce((acc, s) => acc + s.blocks.length, 0);
}

// ─── Main Document ────────────────────────────────────────────────────────────

interface TripPDFDocumentProps {
  doc: ListoDocument;
  generatedAt: string;
}

export function TripPDFDocument({ doc, generatedAt }: TripPDFDocumentProps): React.ReactElement {
  const nights = tripDurationNights(doc.meta.startDate, doc.meta.endDate);
  const destination = doc.meta.destination.trim() !== "" ? doc.meta.destination : "—";
  const fontFamily = [...getFontFamilyChain()];

  const dateRange =
    doc.meta.startDate !== "" && doc.meta.endDate !== ""
      ? formatDateRange(doc.meta.startDate, doc.meta.endDate)
      : "";

  return (
    <Document
      title={`${doc.meta.name} — Travel Itinerary`}
      author="Listo"
      subject="Immigration Travel Document"
      keywords="itinerary, travel, immigration"
    >
      <Page size="A4" style={[styles.page, { fontFamily }]}>

        {/* ── Cover header ── */}
        <View style={styles.coverHeader}>
          <Text style={styles.coverEyebrow}>Travel Itinerary</Text>
          <Text style={styles.coverTitle}>{doc.meta.name || "Untitled trip"}</Text>
          {dateRange !== "" && <Text style={styles.coverDates}>{dateRange}</Text>}
          <View style={styles.coverDivider} />
        </View>

        {/* ── Summary bar ── */}
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Duration</Text>
            <Text style={styles.summaryValue}>
              {nights} night{nights !== 1 ? "s" : ""}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Destination</Text>
            <Text style={styles.summaryValue}>{destination}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Flights</Text>
            <Text style={styles.summaryValue}>{countBlocks(doc, "flights")}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Hotels</Text>
            <Text style={styles.summaryValue}>{countBlocks(doc, "hotels")}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Places</Text>
            <Text style={styles.summaryValue}>{countBlocks(doc, "places")}</Text>
          </View>
        </View>

        {/* ── Sections in document order ── */}
        {doc.sections.map((section) => (
          <View key={section.id} style={styles.section}>
            <Text style={styles.sectionHeader}>{section.heading}</Text>
            <SectionBody section={section} />
          </View>
        ))}

        {/* ── Daily itinerary ── */}
        <View style={styles.section} break>
          <Text style={styles.sectionHeader}>Daily Itinerary</Text>
          {doc.days.length === 0 ? (
            <Text style={styles.emptySection}>No daily itinerary entries.</Text>
          ) : (
            <ItineraryTableView days={doc.days} />
          )}
        </View>

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
