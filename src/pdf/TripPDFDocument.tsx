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
import { COLOR, LINE_HEIGHT, PAGE, SPACE, STYLE, TRACKING, TYPE, WEIGHT } from "../design/tokens";

// ─── Styles ───────────────────────────────────────────────────────────────────
//
// All numeric values come from `src/design/tokens.ts` so the editor (HTML +
// CSS) can mirror the PDF design exactly. If you need to tweak a dimension
// or color, edit the token module — both surfaces update.

const styles = StyleSheet.create({
  page: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE.body,
    paddingTop: PAGE.paddingTop,
    paddingBottom: PAGE.paddingBottom,
    paddingHorizontal: PAGE.paddingHorizontal,
    color: COLOR.black,
    backgroundColor: COLOR.white,
  },

  // ── Cover header ──
  coverHeader: { marginBottom: SPACE.coverHeaderMarginBottom },
  coverEyebrow: {
    fontSize: TYPE.coverEyebrow,
    letterSpacing: TRACKING.coverEyebrow,
    color: COLOR.midGray,
    marginBottom: SPACE.coverEyebrowMarginBottom,
    textTransform: "uppercase",
  },
  coverTitle: {
    fontSize: TYPE.coverTitle,
    fontWeight: WEIGHT.bold,
    color: COLOR.black,
    marginBottom: SPACE.coverTitleMarginBottom,
    lineHeight: LINE_HEIGHT.coverTitle,
  },
  coverDates: {
    fontSize: TYPE.coverDates,
    color: COLOR.darkGray,
    marginBottom: SPACE.coverDatesMarginBottom,
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
    padding: SPACE.summaryBarPadding,
    marginBottom: SPACE.summaryBarMarginBottom,
    borderBottomLeftRadius: SPACE.radius,
    borderBottomRightRadius: SPACE.radius,
  },
  summaryItem: { flex: 1 },
  summaryLabel: {
    fontSize: TYPE.summaryLabel,
    letterSpacing: TRACKING.summaryLabel,
    color: COLOR.lightGray,
    textTransform: "uppercase",
    marginBottom: SPACE.summaryLabelMarginBottom,
  },
  summaryValue: {
    fontSize: TYPE.summaryValue,
    fontWeight: WEIGHT.bold,
    color: COLOR.black,
  },

  // ── Section ──
  section: { marginBottom: SPACE.sectionMarginBottom },
  sectionHeader: {
    fontSize: TYPE.sectionHeader,
    letterSpacing: TRACKING.sectionHeader,
    textTransform: "uppercase",
    color: COLOR.midGray,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.rule,
    paddingBottom: SPACE.sectionHeaderPaddingBottom,
    marginBottom: SPACE.sectionHeaderMarginBottom,
  },
  emptySection: {
    fontSize: TYPE.emptySection,
    color: COLOR.lightGray,
    fontStyle: STYLE.italic,
    paddingVertical: 6,
  },

  // ── Flight card ──
  flightCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACE.cardMarginBottom,
    backgroundColor: COLOR.surface,
    padding: SPACE.cardPadding,
    borderRadius: SPACE.radius,
    borderLeftWidth: SPACE.cardBorderLeftWidth,
    borderLeftColor: COLOR.accent,
  },
  flightLeg: { flex: 2 },
  flightLegRight: { flex: 2, alignItems: "flex-end" },
  flightIata: {
    fontSize: TYPE.flightIata,
    fontWeight: WEIGHT.bold,
    letterSpacing: 0.5,
    color: COLOR.black,
  },
  flightCity: {
    fontSize: TYPE.flightCity,
    color: COLOR.midGray,
    marginTop: SPACE.flightCityMarginTop,
  },
  flightTime: {
    fontSize: TYPE.flightTime,
    fontWeight: WEIGHT.bold,
    marginTop: SPACE.flightTimeMarginTop,
    color: COLOR.darkGray,
  },
  flightDate: {
    fontSize: TYPE.flightDate,
    color: COLOR.lightGray,
    marginTop: SPACE.flightDateMarginTop,
  },
  flightMiddle: { flex: 1, alignItems: "center" },
  flightNumber: {
    fontSize: TYPE.flightNumber,
    fontWeight: WEIGHT.bold,
    color: COLOR.darkGray,
    marginBottom: SPACE.flightNumberMarginBottom,
  },
  flightAirline: {
    fontSize: TYPE.flightAirline,
    color: COLOR.lightGray,
    textAlign: "center",
  },
  flightArrow: {
    fontSize: TYPE.flightArrow,
    color: COLOR.rule,
    marginVertical: SPACE.flightArrowMarginVertical,
  },

  // ── Hotel card ──
  hotelCard: {
    marginBottom: SPACE.cardMarginBottom,
    padding: SPACE.cardPadding,
    backgroundColor: COLOR.surface,
    borderRadius: SPACE.radius,
    borderLeftWidth: SPACE.cardBorderLeftWidth,
    borderLeftColor: COLOR.accent,
  },
  hotelName: {
    fontSize: TYPE.hotelName,
    fontWeight: WEIGHT.bold,
    marginBottom: SPACE.hotelNameMarginBottom,
    color: COLOR.black,
  },
  hotelAddress: {
    fontSize: TYPE.hotelAddress,
    color: COLOR.midGray,
    marginBottom: SPACE.hotelAddressMarginBottom,
    lineHeight: LINE_HEIGHT.hotelAddress,
  },
  hotelMetaRow: { flexDirection: "row" },
  hotelMetaItem: { flex: 1 },
  metaLabel: {
    fontSize: TYPE.metaLabel,
    letterSpacing: TRACKING.metaLabel,
    textTransform: "uppercase",
    color: COLOR.lightGray,
    marginBottom: SPACE.metaLabelMarginBottom,
  },
  metaValue: {
    fontSize: TYPE.metaValue,
    fontWeight: WEIGHT.bold,
    color: COLOR.black,
  },
  metaValueMuted: {
    fontSize: TYPE.metaValue,
    color: COLOR.lightGray,
    fontStyle: STYLE.italic,
  },
  hotelDivider: {
    borderTopWidth: 1,
    borderTopColor: COLOR.ruleLight,
    marginTop: SPACE.hotelDividerMarginTop,
    paddingTop: SPACE.hotelDividerPaddingTop,
  },
  hotelContact: { flexDirection: "row", gap: SPACE.hotelContactGap },
  hotelContactItem: { flex: 1 },

  // ── Places table ──
  placesTable: {
    borderTopWidth: 1,
    borderTopColor: COLOR.rule,
  },
  placeRow: {
    flexDirection: "row",
    paddingVertical: SPACE.placeRowPaddingY,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.ruleLight,
    alignItems: "flex-start",
  },
  placeRowAlt: { backgroundColor: COLOR.surface },
  placeIndex: {
    width: SPACE.placeIndexWidth,
    fontSize: TYPE.placeIndex,
    color: COLOR.lightGray,
    paddingTop: 1,
  },
  placeName: {
    flex: 2,
    fontSize: TYPE.placeName,
    fontWeight: WEIGHT.bold,
    color: COLOR.black,
    lineHeight: LINE_HEIGHT.placeName,
  },
  placeAddress: {
    flex: 3,
    fontSize: TYPE.placeAddress,
    color: COLOR.midGray,
    lineHeight: LINE_HEIGHT.placeAddress,
    paddingRight: SPACE.placeAddressPaddingRight,
  },
  placeRating: {
    width: SPACE.placeRatingWidth,
    fontSize: TYPE.placeRating,
    color: COLOR.lightGray,
    textAlign: "right",
    paddingTop: 1,
  },

  // ── Notes list ──
  noteRow: {
    marginBottom: SPACE.noteRowMarginBottom,
    padding: SPACE.noteRowPadding,
    backgroundColor: COLOR.surface,
    borderRadius: SPACE.radius,
    borderLeftWidth: SPACE.cardBorderLeftWidth,
    borderLeftColor: COLOR.accent,
  },
  noteTitle: {
    fontSize: TYPE.noteTitle,
    fontWeight: WEIGHT.bold,
    color: COLOR.black,
    marginBottom: SPACE.noteTitleMarginBottom,
  },
  noteContent: {
    fontSize: TYPE.noteContent,
    color: COLOR.darkGray,
    lineHeight: LINE_HEIGHT.noteContent,
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
    paddingVertical: SPACE.itineraryHeaderPaddingY,
    paddingHorizontal: SPACE.itineraryHeaderPaddingX,
  },
  itineraryHeaderTime: {
    width: SPACE.itineraryTimeWidth,
    fontSize: TYPE.itineraryHeader,
    letterSpacing: TRACKING.itineraryHeader,
    textTransform: "uppercase",
    color: COLOR.midGray,
  },
  itineraryHeaderKind: {
    width: SPACE.itineraryKindWidth,
    fontSize: TYPE.itineraryHeader,
    letterSpacing: TRACKING.itineraryHeader,
    textTransform: "uppercase",
    color: COLOR.midGray,
  },
  itineraryHeaderPlace: {
    flex: 1,
    fontSize: TYPE.itineraryHeader,
    letterSpacing: TRACKING.itineraryHeader,
    textTransform: "uppercase",
    color: COLOR.midGray,
  },
  itineraryDayRow: {
    backgroundColor: COLOR.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.rule,
    paddingVertical: SPACE.itineraryDayPaddingY,
    paddingHorizontal: SPACE.itineraryDayPaddingX,
  },
  itineraryDayLabel: {
    fontSize: TYPE.itineraryDayLabel,
    fontWeight: WEIGHT.bold,
    color: COLOR.black,
  },
  itineraryRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLOR.ruleLight,
    paddingVertical: SPACE.itineraryRowPaddingY,
    paddingHorizontal: SPACE.itineraryRowPaddingX,
  },
  itineraryTime: {
    width: SPACE.itineraryTimeWidth,
    fontSize: TYPE.itineraryTime,
    color: COLOR.darkGray,
  },
  itineraryKind: {
    width: SPACE.itineraryKindWidth,
    fontSize: TYPE.itineraryKind,
    color: COLOR.midGray,
  },
  itineraryPlace: {
    flex: 1,
    fontSize: TYPE.itineraryPlace,
    color: COLOR.black,
    lineHeight: LINE_HEIGHT.itineraryPlace,
  },
  itineraryNotes: {
    fontSize: TYPE.itineraryNotes,
    color: COLOR.midGray,
    marginTop: SPACE.itineraryNotesMarginTop,
    fontStyle: STYLE.italic,
  },
  itineraryEmptyDay: {
    paddingVertical: SPACE.itineraryDayPaddingY,
    paddingHorizontal: SPACE.itineraryDayPaddingX,
    fontSize: TYPE.itineraryEmptyDay,
    color: COLOR.lightGray,
    fontStyle: STYLE.italic,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.ruleLight,
  },

  // ── Footer ──
  footer: {
    position: "absolute",
    bottom: PAGE.footerBottom,
    left: PAGE.paddingHorizontal,
    right: PAGE.paddingHorizontal,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: COLOR.ruleLight,
    paddingTop: SPACE.footerPaddingTop,
  },
  footerText: { fontSize: TYPE.footer, color: COLOR.lightGray },
  pageNumber: { fontSize: TYPE.footer, color: COLOR.lightGray },
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
            {place.rating > 0 ? place.rating.toFixed(1) : "—"}
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
