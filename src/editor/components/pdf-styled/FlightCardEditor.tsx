import React from "react";
import type { ListoFlightBlock, ListoFlightEndpoint } from "../../../types/listo";
import { InlineInput } from "../InlineEdit";
import { PdfCard } from "./PdfCard";
import { formatDate, formatTime } from "../../../lib/formatters";

/**
 * Editable flight card. Renders with the exact same visual structure as
 * `FlightCardView` in `src/pdf/TripPDFDocument.tsx`:
 *   - 3 columns (departure / middle / arrival)
 *   - big IATA codes (20pt bold)
 *   - airport name below, followed by time and date
 *   - middle column: flight number, arrow, airline
 *
 * Read-only formatted date appears below the date input in a faint color —
 * this matches what the PDF will show when exported.
 */

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
    <PdfCard
      onRemove={onRemove}
      {...(dragHandleProps !== undefined ? { dragHandleProps } : {})}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: "12pt",
        }}
      >
        <FlightLeg
          endpoint={block.depart}
          align="left"
          onChange={(patch) => {
            updateEndpoint("depart", patch);
          }}
        />

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: "9pt",
              fontWeight: 700,
              color: "var(--c-dark-gray)",
              marginBottom: "3pt",
              textAlign: "center",
              width: "100%",
            }}
          >
            <InlineInput
              value={block.flightNumber}
              onChange={(flightNumber) => {
                onChange({ flightNumber });
              }}
              placeholder="FL123"
              ariaLabel="Flight number"
              align="center"
            />
          </div>
          <div
            style={{
              fontSize: "16pt",
              color: "var(--c-rule)",
              marginTop: "2pt",
              marginBottom: "2pt",
              lineHeight: 1,
            }}
          >
            ──→
          </div>
          <div
            style={{
              fontSize: "7.5pt",
              color: "var(--c-light-gray)",
              textAlign: "center",
              width: "100%",
            }}
          >
            <InlineInput
              value={block.airline}
              onChange={(airline) => {
                onChange({ airline });
              }}
              placeholder="Airline"
              ariaLabel="Airline"
              align="center"
            />
          </div>
        </div>

        <FlightLeg
          endpoint={block.arrive}
          align="right"
          onChange={(patch) => {
            updateEndpoint("arrive", patch);
          }}
        />
      </div>
    </PdfCard>
  );
}

// ─── One endpoint column (departure or arrival) ──────────────────────────────

interface FlightLegProps {
  endpoint: ListoFlightEndpoint;
  align: "left" | "right";
  onChange: (patch: Partial<ListoFlightEndpoint>) => void;
}

function FlightLeg({ endpoint, align, onChange }: FlightLegProps): React.ReactElement {
  return (
    <div
      style={{
        flex: 2,
        display: "flex",
        flexDirection: "column",
        alignItems: align === "right" ? "flex-end" : "flex-start",
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: "20pt",
          fontWeight: 700,
          letterSpacing: "0.5pt",
          color: "var(--c-black)",
          lineHeight: 1,
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
          fontSize: "8.5pt",
          color: "var(--c-mid-gray)",
          marginTop: "1pt",
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
          fontSize: "10pt",
          fontWeight: 700,
          marginTop: "5pt",
          color: "var(--c-dark-gray)",
          width: "100%",
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
          fontSize: "8pt",
          color: "var(--c-light-gray)",
          marginTop: "1pt",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: align === "right" ? "flex-end" : "flex-start",
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
