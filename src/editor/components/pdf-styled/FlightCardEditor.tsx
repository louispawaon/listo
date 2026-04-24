import React from "react";
import type { ListoFlightBlock, ListoFlightEndpoint } from "../../../types/listo";
import { SPACE, TRACKING, TYPE } from "../../../design/tokens";
import { InlineInput } from "../InlineEdit";
import { formatDate, formatTime } from "../../../lib/formatters";

interface FlightCardEditorProps {
  block: ListoFlightBlock;
  onChange: (patch: Partial<ListoFlightBlock>) => void;
  onRemove: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

export function FlightCardEditor({
  block,
  onChange,
  onRemove,
  dragHandleProps,
}: FlightCardEditorProps): React.ReactElement {
  const updateEndpoint = (
    key: "depart" | "arrive",
    patch: Partial<ListoFlightEndpoint>
  ): void => {
    onChange({ [key]: { ...block[key], ...patch } } as Partial<ListoFlightBlock>);
  };

  return (
    <div className="group/card relative" style={{ marginBottom: `${SPACE.cardMarginBottom}pt` }}>
      {dragHandleProps !== undefined && (
        <button
          type="button"
          {...dragHandleProps}
          aria-label="Drag to reorder"
          className="absolute -left-6 top-3 cursor-grab touch-none text-neutral-300 opacity-0 transition-opacity hover:text-neutral-600 group-hover/card:opacity-100"
        >
          <DragDotsIcon />
        </button>
      )}

      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove"
        className="absolute -right-6 top-3 text-neutral-300 opacity-0 transition-opacity hover:text-red-600 group-hover/card:opacity-100"
      >
        <TrashIcon />
      </button>

      <div
        style={{
          position: "relative",
          backgroundColor: "var(--c-surface)",
          borderRadius: `${SPACE.flightCardRadius}pt`,
          overflow: "hidden",
          boxShadow:
            "0 1px 0 rgba(0,0,0,0.02), 0 2px 6px rgba(0,0,0,0.04)",
        }}
      >
        <HeaderBand />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "start",
            padding: `${SPACE.flightBodyPaddingTop}pt ${SPACE.flightBodyPaddingX}pt ${SPACE.flightBodyPaddingBottom}pt`,
            columnGap: "6pt",
          }}
        >
          <FlightLeg
            endpoint={block.depart}
            align="left"
            label="From"
            onChange={(patch) => {
              updateEndpoint("depart", patch);
            }}
          />

          <FlightMiddle
            flightNumber={block.flightNumber}
            airline={block.airline}
            onFlightNumberChange={(flightNumber) => {
              onChange({ flightNumber });
            }}
            onAirlineChange={(airline) => {
              onChange({ airline });
            }}
          />

          <FlightLeg
            endpoint={block.arrive}
            align="right"
            label="To"
            onChange={(patch) => {
              updateEndpoint("arrive", patch);
            }}
          />
        </div>

        <Perforation />

        <StubFooter depart={block.depart} />
      </div>
    </div>
  );
}

// ─── Header band (dark, "BOARDING PASS") ─────────────────────────────────────

function HeaderBand(): React.ReactElement {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: `${SPACE.flightHeaderPaddingY}pt ${SPACE.flightHeaderPaddingX}pt`,
        backgroundColor: "var(--c-accent)",
        color: "var(--c-white)",
      }}
    >
      <span
        style={{
          fontSize: `${TYPE.flightHeaderEyebrow}pt`,
          letterSpacing: `${TRACKING.flightBoardingTitle}pt`,
          textTransform: "uppercase",
          fontWeight: 700,
          color: "var(--c-white)",
        }}
      >
        Boarding Pass
      </span>
      <span
        style={{
          fontSize: `${TYPE.flightHeaderEyebrow}pt`,
          letterSpacing: `${TRACKING.flightBoardingRight}pt`,
          textTransform: "uppercase",
          color: "rgba(255, 255, 255, 0.65)",
          display: "flex",
          alignItems: "center",
          gap: "4pt",
        }}
      >
        <PlaneIconSmall />
        Flight Segment
      </span>
    </div>
  );
}

// ─── Middle column (flight number + airline, split by dashed line) ───────────

interface FlightMiddleProps {
  flightNumber: string;
  airline: string;
  onFlightNumberChange: (value: string) => void;
  onAirlineChange: (value: string) => void;
}

function FlightMiddle({
  flightNumber,
  airline,
  onFlightNumberChange,
  onAirlineChange,
}: FlightMiddleProps): React.ReactElement {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minWidth: `${SPACE.flightMiddleMinWidth}pt`,
        padding: `${SPACE.flightMiddlePaddingTop}pt ${SPACE.flightMiddlePaddingX}pt 0`,
      }}
    >
      <div
        style={{
          fontSize: `${TYPE.flightNumber}pt`,
          fontWeight: 700,
          color: "var(--c-dark-gray)",
          textAlign: "center",
          letterSpacing: `${TRACKING.flightNumber}pt`,
          width: "100%",
        }}
      >
        <InlineInput
          value={flightNumber}
          onChange={onFlightNumberChange}
          placeholder="FL123"
          ariaLabel="Flight number"
          align="center"
        />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          marginTop: `${SPACE.flightDashedRowMarginTop}pt`,
          marginBottom: `${SPACE.flightDashedRowMarginBottom}pt`,
        }}
      >
        <div style={{ flex: 1, borderTop: "1pt dashed var(--c-rule)" }} />
        <PlaneIcon />
        <div style={{ flex: 1, borderTop: "1pt dashed var(--c-rule)" }} />
      </div>

      <div
        style={{
          fontSize: `${TYPE.flightAirline}pt`,
          color: "var(--c-light-gray)",
          textAlign: "center",
          letterSpacing: `${TRACKING.flightAirline}pt`,
          textTransform: "uppercase",
          width: "100%",
        }}
      >
        <InlineInput
          value={airline}
          onChange={onAirlineChange}
          placeholder="Airline"
          ariaLabel="Airline"
          align="center"
        />
      </div>
    </div>
  );
}

// ─── One endpoint column (departure or arrival) ──────────────────────────────

interface FlightLegProps {
  endpoint: ListoFlightEndpoint;
  align: "left" | "right";
  label: string;
  onChange: (patch: Partial<ListoFlightEndpoint>) => void;
}

function FlightLeg({
  endpoint,
  align,
  label,
  onChange,
}: FlightLegProps): React.ReactElement {
  const isRight = align === "right";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isRight ? "flex-end" : "flex-start",
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: `${TYPE.flightLegLabel}pt`,
          letterSpacing: `${TRACKING.flightLegLabel}pt`,
          textTransform: "uppercase",
          color: "var(--c-light-gray)",
          fontWeight: 700,
          marginBottom: `${SPACE.flightLegLabelMarginBottom}pt`,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: `${TYPE.flightIata}pt`,
          fontWeight: 700,
          letterSpacing: "0.5pt",
          lineHeight: 1,
          color: "var(--c-black)",
          textTransform: "uppercase",
          width: "100%",
        }}
      >
        <InlineInput
          value={endpoint.airportIata}
          onChange={(airportIata) => {
            onChange({ airportIata: airportIata.toUpperCase() });
          }}
          placeholder="???"
          ariaLabel="Airport IATA code"
          align={align}
        />
      </div>

      <div
        style={{
          fontSize: `${TYPE.flightCity}pt`,
          color: "var(--c-mid-gray)",
          marginTop: `${SPACE.flightCityMarginTop}pt`,
          width: "100%",
        }}
      >
        <InlineInput
          value={endpoint.airportName}
          onChange={(airportName) => {
            onChange({ airportName });
          }}
          placeholder="Airport name"
          ariaLabel="Airport name"
          align={align}
        />
      </div>

      <div
        style={{
          fontSize: `${TYPE.flightTime}pt`,
          fontWeight: 700,
          marginTop: `${SPACE.flightTimeMarginTop}pt`,
          color: "var(--c-dark-gray)",
          width: "100%",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <InlineInput
          type="time"
          value={endpoint.time}
          onChange={(time) => {
            onChange({ time });
          }}
          ariaLabel="Time"
          align={align}
        />
      </div>

      <div
        style={{
          fontSize: `${TYPE.flightDate}pt`,
          color: "var(--c-light-gray)",
          marginTop: `${SPACE.flightDateMarginTop}pt`,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: isRight ? "flex-end" : "flex-start",
        }}
      >
        <InlineInput
          type="date"
          value={endpoint.date}
          onChange={(date) => {
            onChange({ date });
          }}
          ariaLabel="Date"
          align={align}
        />
        {endpoint.date !== "" && (
          <div style={{ fontSize: "7pt", fontStyle: "italic", marginTop: "1pt" }}>
            {formatDate(endpoint.date)}
            {endpoint.time !== "" ? ` · ${formatTime(endpoint.time)}` : ""}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Perforated divider with tear-notch cutouts ──────────────────────────────

function Perforation(): React.ReactElement {
  return (
    <div
      style={{
        position: "relative",
        borderTop: "1pt dashed var(--c-rule)",
        marginTop: `${SPACE.flightPerforationMarginTop}pt`,
      }}
      aria-hidden="true"
    >
      <span style={{ ...tearNotchStyle, left: "-5pt" }} />
      <span style={{ ...tearNotchStyle, right: "-5pt" }} />
    </div>
  );
}

const tearNotchStyle: React.CSSProperties = {
  position: "absolute",
  top: "-5pt",
  width: "10pt",
  height: "10pt",
  borderRadius: "50%",
  backgroundColor: "var(--c-white)",
};

// ─── Stub footer (barcode + departure readout) ───────────────────────────────

function StubFooter({
  depart,
}: {
  depart: ListoFlightEndpoint;
}): React.ReactElement {
  const hasDeparture = depart.date !== "" || depart.time !== "";
  const readout = hasDeparture
    ? [
        depart.date !== "" ? formatDate(depart.date) : "",
        depart.time !== "" ? formatTime(depart.time) : "",
      ]
        .filter((s) => s !== "")
        .join(" · ")
    : "—";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: `${SPACE.flightStubPaddingY}pt ${SPACE.flightStubPaddingX}pt ${SPACE.flightStubPaddingBottom}pt`,
        gap: "12pt",
      }}
    >
      <BarcodeDecoration />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
        <span
          style={{
            fontSize: `${TYPE.flightStubLabel}pt`,
            letterSpacing: `${TRACKING.flightLegLabel}pt`,
            textTransform: "uppercase",
            color: "var(--c-light-gray)",
            fontWeight: 700,
            marginBottom: "1pt",
          }}
        >
          Departs
        </span>
        <span
          style={{
            fontSize: `${TYPE.flightStubValue}pt`,
            fontWeight: 700,
            color: "var(--c-dark-gray)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {readout}
        </span>
      </div>
    </div>
  );
}

// ─── Decorative bits (barcode + plane icons + control glyphs) ────────────────

function BarcodeDecoration(): React.ReactElement {
  // Deterministic bar widths; matches the kind of pattern rendered on a
  // real Code-128 stripe without actually encoding anything.
  const widths = [
    2, 1, 3, 1, 2, 1, 4, 1, 2, 3, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3,
    1, 2, 1, 3, 2, 1, 4, 1, 2, 3,
  ];
  const rects: React.ReactElement[] = [];
  let x = 0;
  widths.forEach((w, i) => {
    rects.push(<rect key={i} x={x} y={0} width={w} height={22} fill="var(--c-black)" />);
    x += w + (i % 2 === 0 ? 2 : 1);
  });
  return (
    <svg
      width="100"
      height="22"
      viewBox={`0 0 ${x} 22`}
      style={{ opacity: 0.2, flexShrink: 0 }}
      aria-hidden="true"
    >
      {rects}
    </svg>
  );
}

function PlaneIcon(): React.ReactElement {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      style={{ color: "var(--c-mid-gray)", flexShrink: 0, margin: "0 4pt" }}
    >
      <path
        d="M2 10L9 7l1-5 2 1-1 4.5 4-1.5 1 1-3.5 2 1 4-1.5.5L11 10l-4 2L7 14l-1.5.5L4 11 2 10z"
        fill="currentColor"
      />
    </svg>
  );
}

function PlaneIconSmall(): React.ReactElement {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      style={{ color: "currentColor", flexShrink: 0 }}
    >
      <path
        d="M2 10L9 7l1-5 2 1-1 4.5 4-1.5 1 1-3.5 2 1 4-1.5.5L11 10l-4 2L7 14l-1.5.5L4 11 2 10z"
        fill="currentColor"
      />
    </svg>
  );
}

function DragDotsIcon(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <circle cx="7" cy="5" r="1.5" />
      <circle cx="7" cy="10" r="1.5" />
      <circle cx="7" cy="15" r="1.5" />
      <circle cx="13" cy="5" r="1.5" />
      <circle cx="13" cy="10" r="1.5" />
      <circle cx="13" cy="15" r="1.5" />
    </svg>
  );
}

function TrashIcon(): React.ReactElement {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M3 6h14" strokeLinecap="round" />
      <path d="M8 6V4a1 1 0 011-1h2a1 1 0 011 1v2" strokeLinecap="round" />
      <path
        d="M5 6l1 10a2 2 0 002 2h4a2 2 0 002-2l1-10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
