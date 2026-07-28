/**
 * PDF document template for immigration use.
 * Designed to be clean, formal, and easy to scan at a border.
 *
 * Rendering order follows the document: sections and the daily itinerary
 * share one drag order (`itineraryIndex`); see `src/lib/paperLayout.ts`.
 */

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Path,
  Rect,
  G,
} from "@react-pdf/renderer";
import type {
  Activity,
  ListoDocument,
  ListoFlightBlock,
  ListoFlightEndpoint,
  ListoHotelBlock,
  ListoNoteBlock,
  ListoPlaceBlock,
  ListoSection,
  TripDay,
} from "../types/listo";
import { resolvedItineraryIndex, sectionsInPaperOrder } from "../lib/paperLayout";
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

  // ── Flight card (boarding pass — mirrors `FlightCardEditor`) ──
  flightCard: {
    marginBottom: SPACE.cardMarginBottom,
    backgroundColor: COLOR.surface,
    borderRadius: SPACE.flightCardRadius,
    overflow: "hidden",
  },
  flightCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLOR.accent,
    paddingVertical: SPACE.flightHeaderPaddingY,
    paddingHorizontal: SPACE.flightHeaderPaddingX,
  },
  flightCardHeaderLeft: {
    fontSize: TYPE.flightHeaderEyebrow,
    fontWeight: WEIGHT.bold,
    letterSpacing: TRACKING.flightBoardingTitle,
    textTransform: "uppercase",
    color: COLOR.white,
  },
  flightCardHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  flightCardHeaderRightText: {
    fontSize: TYPE.flightHeaderEyebrow,
    fontWeight: WEIGHT.bold,
    letterSpacing: TRACKING.flightBoardingRight,
    textTransform: "uppercase",
    color: "rgba(255, 255, 255, 0.65)",
    marginLeft: 4,
  },
  flightCardBody: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: SPACE.flightBodyPaddingTop,
    paddingBottom: SPACE.flightBodyPaddingBottom,
    paddingHorizontal: SPACE.flightBodyPaddingX,
  },
  flightLegColumn: { flex: 2, minWidth: 0 },
  flightLegColumnRight: { alignItems: "flex-end" },
  flightLegLabel: {
    fontSize: TYPE.flightLegLabel,
    fontWeight: WEIGHT.bold,
    letterSpacing: TRACKING.flightLegLabel,
    textTransform: "uppercase",
    color: COLOR.lightGray,
    marginBottom: SPACE.flightLegLabelMarginBottom,
  },
  flightIata: {
    fontSize: TYPE.flightIata,
    fontWeight: WEIGHT.bold,
    letterSpacing: 0.5,
    lineHeight: 1,
    textTransform: "uppercase",
    color: COLOR.black,
  },
  flightIataRight: { textAlign: "right" },
  flightCity: {
    fontSize: TYPE.flightCity,
    color: COLOR.midGray,
    marginTop: SPACE.flightCityMarginTop,
  },
  flightCityRight: { textAlign: "right" },
  flightTime: {
    fontSize: TYPE.flightTime,
    fontWeight: WEIGHT.bold,
    marginTop: SPACE.flightTimeMarginTop,
    color: COLOR.darkGray,
  },
  flightTimeRight: { textAlign: "right" },
  flightDate: {
    fontSize: TYPE.flightDate,
    color: COLOR.lightGray,
    marginTop: SPACE.flightDateMarginTop,
  },
  flightDateRight: { textAlign: "right" },
  flightMiddle: {
    width: SPACE.flightMiddleMinWidth,
    paddingTop: SPACE.flightMiddlePaddingTop,
    paddingHorizontal: SPACE.flightMiddlePaddingX,
    alignItems: "center",
  },
  flightNumber: {
    fontSize: TYPE.flightNumber,
    fontWeight: WEIGHT.bold,
    letterSpacing: TRACKING.flightNumber,
    color: COLOR.darkGray,
    textAlign: "center",
  },
  flightDashedRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginTop: SPACE.flightDashedRowMarginTop,
    marginBottom: SPACE.flightDashedRowMarginBottom,
  },
  flightDashSegment: {
    flexGrow: 1,
    borderTopWidth: 1,
    borderTopColor: COLOR.rule,
    borderStyle: "dashed",
  },
  flightAirline: {
    fontSize: TYPE.flightAirline,
    color: COLOR.lightGray,
    letterSpacing: TRACKING.flightAirline,
    textTransform: "uppercase",
    textAlign: "center",
  },
  flightPerforationWrap: {
    position: "relative",
    borderTopWidth: 1,
    borderTopColor: COLOR.rule,
    borderStyle: "dashed",
    marginTop: SPACE.flightPerforationMarginTop,
  },
  flightTearNotch: {
    position: "absolute",
    top: -5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLOR.white,
  },
  flightStub: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: SPACE.flightStubPaddingY,
    paddingBottom: SPACE.flightStubPaddingBottom,
    paddingHorizontal: SPACE.flightStubPaddingX,
  },
  flightStubLabel: {
    fontSize: TYPE.flightStubLabel,
    fontWeight: WEIGHT.bold,
    letterSpacing: TRACKING.flightLegLabel,
    textTransform: "uppercase",
    color: COLOR.lightGray,
    marginBottom: 1,
    textAlign: "right",
  },
  flightStubValue: {
    fontSize: TYPE.flightStubValue,
    fontWeight: WEIGHT.bold,
    color: COLOR.darkGray,
    textAlign: "right",
  },

  // ── Hotel card (stay voucher — mirrors `HotelCardEditor`) ──
  hotelCard: {
    marginBottom: SPACE.cardMarginBottom,
    backgroundColor: COLOR.surface,
    borderRadius: SPACE.hotelCardRadius,
    overflow: "hidden",
  },
  hotelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLOR.accent,
    paddingVertical: SPACE.hotelHeaderPaddingY,
    paddingHorizontal: SPACE.hotelHeaderPaddingX,
  },
  hotelHeaderLeft: {
    fontSize: TYPE.hotelHeaderEyebrow,
    fontWeight: WEIGHT.bold,
    letterSpacing: TRACKING.hotelHeaderTitle,
    textTransform: "uppercase",
    color: COLOR.white,
  },
  hotelHeaderRight: {
    fontSize: TYPE.hotelNightsPill,
    fontWeight: WEIGHT.bold,
    letterSpacing: TRACKING.hotelNightsPill,
    color: "rgba(255, 255, 255, 0.72)",
  },
  hotelBody: {
    paddingTop: SPACE.hotelBodyPaddingTop,
    paddingBottom: 0,
    paddingHorizontal: SPACE.hotelBodyPaddingX,
  },
  hotelName: {
    fontSize: TYPE.hotelName,
    fontWeight: WEIGHT.bold,
    marginBottom: SPACE.hotelNameMarginBottom,
    color: COLOR.black,
    lineHeight: LINE_HEIGHT.hotelName,
  },
  hotelAddress: {
    fontSize: TYPE.hotelAddress,
    color: COLOR.midGray,
    marginBottom: SPACE.hotelAddressMarginBottom,
    lineHeight: LINE_HEIGHT.hotelAddress,
  },
  hotelDateRow: {
    flexDirection: "row",
    alignItems: "stretch",
    marginTop: SPACE.hotelDateRowMarginTop,
    gap: SPACE.hotelDateRowGap,
  },
  hotelDateTile: {
    flex: 1,
    minWidth: 0,
    backgroundColor: COLOR.white,
    borderWidth: 1,
    borderColor: COLOR.rule,
    borderStyle: "solid",
    borderRadius: SPACE.hotelDateTileRadius,
    padding: SPACE.hotelDateTilePadding,
  },
  hotelDateTileLabel: {
    fontSize: TYPE.hotelDateTileLabel,
    fontWeight: WEIGHT.bold,
    letterSpacing: TRACKING.hotelDateTileLabel,
    textTransform: "uppercase",
    color: COLOR.lightGray,
    marginBottom: 3,
  },
  hotelDateTileValue: {
    fontSize: TYPE.hotelStayDate,
    fontWeight: WEIGHT.bold,
    color: COLOR.black,
  },
  hotelDateMid: {
    width: 12,
    marginHorizontal: SPACE.hotelDateMidGutter,
    alignItems: "center",
    justifyContent: "center",
  },
  hotelDateRule: {
    width: 1,
    height: SPACE.hotelDateRuleHeight,
    backgroundColor: COLOR.rule,
  },
  hotelConfirmationBlock: {
    marginTop: SPACE.hotelConfirmationMarginTop,
    backgroundColor: COLOR.surfaceDark,
    borderRadius: SPACE.hotelDateTileRadius,
    padding: SPACE.hotelConfirmationPadding,
    borderWidth: 1,
    borderColor: COLOR.ruleLight,
    borderStyle: "solid",
  },
  hotelConfirmationValue: {
    fontSize: TYPE.hotelConfirmation,
    fontWeight: WEIGHT.bold,
    color: COLOR.black,
    letterSpacing: 0.3,
  },
  hotelContactShell: {
    borderTopWidth: 1,
    borderTopColor: COLOR.rule,
    borderStyle: "dashed",
    marginTop: SPACE.hotelDividerMarginTop,
    marginLeft: SPACE.hotelBodyPaddingX,
    marginRight: SPACE.hotelBodyPaddingX,
    paddingTop: SPACE.hotelDividerPaddingTop,
    paddingBottom: SPACE.hotelBodyPaddingBottom,
  },
  hotelContact: { flexDirection: "row", gap: SPACE.hotelContactGap },
  hotelContactItem: { flex: 1 },
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

function formatDepartStubReadout(depart: ListoFlightEndpoint): string {
  const has = depart.date !== "" || depart.time !== "";
  if (!has) return "—";
  const parts: string[] = [];
  if (depart.date !== "") parts.push(formatDate(depart.date));
  if (depart.time !== "") parts.push(formatTime(depart.time));
  return parts.join(" · ");
}

const FLIGHT_BARCODE_WIDTHS = [
  2, 1, 3, 1, 2, 1, 4, 1, 2, 3, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3,
] as const;

const PLANE_PATH =
  "M16 3h-2l-5 8H3.5c-.83 0-1.5.67-1.5 1.5S2.67 14 3.5 14H9l5 8h2l-2.5-8H19l1.5 2H22l-1-3.5 1-3.5h-1.5L19 11h-5.5l2.5-8z";

function FlightBarcodePdf(): React.ReactElement {
  const rects: React.ReactElement[] = [];
  let x = 0;
  FLIGHT_BARCODE_WIDTHS.forEach((w, i) => {
    rects.push(<Rect key={i} x={x} y={0} width={w} height={22} fill={COLOR.black} />);
    x += w + (i % 2 === 0 ? 2 : 1);
  });
  return (
    <Svg width={100} height={22} viewBox={`0 0 ${x} 22`} style={{ opacity: 0.2 }}>
      {rects}
    </Svg>
  );
}

function FlightLegPdfView({
  endpoint,
  label,
  alignRight,
}: {
  endpoint: ListoFlightEndpoint;
  label: string;
  alignRight: boolean;
}): React.ReactElement {
  const ta = alignRight ? { textAlign: "right" as const } : {};
  return (
    <View style={alignRight ? [styles.flightLegColumn, styles.flightLegColumnRight] : styles.flightLegColumn}>
      <Text style={[styles.flightLegLabel, ta]}>{label}</Text>
      <View style={alignRight ? { width: "100%", alignItems: "flex-end" } : { width: "100%" }}>
        <Text style={[styles.flightIata, ta]}>{endpoint.airportIata.trim() !== "" ? endpoint.airportIata : "—"}</Text>
      </View>
      <View style={alignRight ? { width: "100%", alignItems: "flex-end" } : { width: "100%" }}>
        <Text style={[styles.flightCity, ta]}>{endpoint.airportName}</Text>
      </View>
      <View style={alignRight ? { width: "100%", alignItems: "flex-end" } : { width: "100%" }}>
        <Text style={[styles.flightTime, ta]}>
          {endpoint.time !== "" ? formatTime(endpoint.time) : "—"}
        </Text>
      </View>
      <View style={alignRight ? { width: "100%", alignItems: "flex-end" } : { width: "100%" }}>
        <Text style={[styles.flightDate, ta]}>
          {endpoint.date !== "" ? formatDate(endpoint.date) : ""}
        </Text>
      </View>
    </View>
  );
}

function FlightCardView({ flight }: { flight: ListoFlightBlock }): React.ReactElement {
  return (
    <View style={styles.flightCard}>
      <View style={styles.flightCardHeader}>
        <Text style={styles.flightCardHeaderLeft}>Boarding Pass</Text>
        <View style={styles.flightCardHeaderRight}>
          <Svg width={10} height={10} viewBox="0 0 24 24">
            <G transform="scale(-1, 1) translate(-24, 0)">
              <Path d={PLANE_PATH} fill={COLOR.white} />
            </G>
          </Svg>
          <Text style={styles.flightCardHeaderRightText}>Flight Segment</Text>
        </View>
      </View>

      <View style={styles.flightCardBody}>
        <FlightLegPdfView endpoint={flight.depart} label="From" alignRight={false} />
        <View style={styles.flightMiddle}>
          <Text style={styles.flightNumber}>{flight.flightNumber}</Text>
          <View style={styles.flightDashedRow}>
            <View style={styles.flightDashSegment} />
            <Svg width={14} height={14} viewBox="0 0 24 24" style={{ marginHorizontal: 4 }}>
              <G transform="scale(-1, 1) translate(-24, 0)">
                <Path d={PLANE_PATH} fill={COLOR.midGray} />
              </G>
            </Svg>
            <View style={styles.flightDashSegment} />
          </View>
          <Text style={styles.flightAirline}>{flight.airline}</Text>
        </View>
        <FlightLegPdfView endpoint={flight.arrive} label="To" alignRight />
      </View>

      <View style={styles.flightPerforationWrap}>
        <View style={[styles.flightTearNotch, { left: -5 }]} />
        <View style={[styles.flightTearNotch, { right: -5 }]} />
      </View>

      <View style={styles.flightStub}>
        <FlightBarcodePdf />
        <View>
          <Text style={styles.flightStubLabel}>Departs</Text>
          <Text style={styles.flightStubValue}>{formatDepartStubReadout(flight.depart)}</Text>
        </View>
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
  const nightsLabel =
    nights > 0 ? `${nights} night${nights === 1 ? "" : "s"}` : "—";

  return (
    <View style={styles.hotelCard}>
      <View style={styles.hotelHeader} wrap={false}>
        <Text style={styles.hotelHeaderLeft}>Accommodation</Text>
        <Text style={styles.hotelHeaderRight}>{nightsLabel}</Text>
      </View>

      <View style={styles.hotelBody} wrap={false}>
        <Text style={styles.hotelName}>{hotel.name || "Unnamed hotel"}</Text>
        {hotel.address !== "" && <Text style={styles.hotelAddress}>{hotel.address}</Text>}

        <View style={styles.hotelDateRow}>
          <View style={styles.hotelDateTile}>
            <Text style={styles.hotelDateTileLabel}>Check-in</Text>
            <Text style={styles.hotelDateTileValue}>
              {hotel.checkIn !== "" ? formatDate(hotel.checkIn) : "—"}
            </Text>
          </View>
          <View style={styles.hotelDateMid}>
            <View style={styles.hotelDateRule} />
          </View>
          <View style={styles.hotelDateTile}>
            <Text style={styles.hotelDateTileLabel}>Check-out</Text>
            <Text style={styles.hotelDateTileValue}>
              {hotel.checkOut !== "" ? formatDate(hotel.checkOut) : "—"}
            </Text>
          </View>
        </View>

        <View style={styles.hotelConfirmationBlock} wrap={false}>
          <Text style={styles.metaLabel}>Confirmation</Text>
          {hotel.confirmationNumber !== null ? (
            <Text style={styles.hotelConfirmationValue}>{hotel.confirmationNumber}</Text>
          ) : (
            <Text style={styles.metaValueMuted}>Not provided</Text>
          )}
        </View>
      </View>

      {hasContact && (
        <View style={styles.hotelContactShell}>
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

        {/* ── Sections + daily itinerary in editor drag order ── */}
        {(() => {
          const itineraryIndex = resolvedItineraryIndex(doc);
          const sections = sectionsInPaperOrder(doc);
          const nodes: React.ReactElement[] = [];
          for (let i = 0; i < sections.length; i++) {
            if (i === itineraryIndex) {
              nodes.push(
                <View
                  key="__listo-itinerary__"
                  style={styles.section}
                  break={itineraryIndex > 0}
                >
                  <Text style={styles.sectionHeader}>Daily Itinerary</Text>
                  {doc.days.length === 0 ? (
                    <Text style={styles.emptySection}>No daily itinerary entries.</Text>
                  ) : (
                    <ItineraryTableView days={doc.days} />
                  )}
                </View>
              );
            }
            const section = sections[i]!;
            nodes.push(
              <View key={section.id} style={styles.section}>
                <Text style={styles.sectionHeader}>{section.heading}</Text>
                <SectionBody section={section} />
              </View>
            );
          }
          if (itineraryIndex === sections.length) {
            nodes.push(
              <View
                key="__listo-itinerary__"
                style={styles.section}
                break={itineraryIndex > 0}
              >
                <Text style={styles.sectionHeader}>Daily Itinerary</Text>
                {doc.days.length === 0 ? (
                  <Text style={styles.emptySection}>No daily itinerary entries.</Text>
                ) : (
                  <ItineraryTableView days={doc.days} />
                )}
              </View>
            );
          }
          return nodes;
        })()}

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
