import React from "react";
import type { ListoDocument, ListoSection, TripMeta } from "../../../types/listo";
import { InlineInput } from "../InlineEdit";

/**
 * Horizontal summary bar under the cover — mirrors the PDF's `summaryBar`.
 *
 * The Duration / Flights / Hotels / Places cells are *derived* (auto-
 * computed from the document), so they render as static text. Destination
 * and the start/end dates are editable here — this is the only place the
 * user edits `TripMeta` after the refactor, replacing the old TripHeader.
 */

interface SummaryBarProps {
  doc: ListoDocument;
  onMetaChange: (patch: Partial<TripMeta>) => void;
}

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

export function SummaryBar({ doc, onMetaChange }: SummaryBarProps): React.ReactElement {
  const nights = tripDurationNights(doc.meta.startDate, doc.meta.endDate);
  const flights = countBlocks(doc, "flights");
  const hotels = countBlocks(doc, "hotels");
  const places = countBlocks(doc, "places");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        backgroundColor: "var(--c-surface)",
        padding: "12pt",
        marginBottom: "28pt",
        borderBottomLeftRadius: "4pt",
        borderBottomRightRadius: "4pt",
        gap: "4pt",
      }}
    >
      <SummaryCell label="Start">
        <InlineInput
          type="date"
          value={doc.meta.startDate}
          onChange={(startDate) => {
            onMetaChange({ startDate });
          }}
          ariaLabel="Trip start date"
          className="font-bold"
        />
      </SummaryCell>
      <SummaryCell label="End">
        <InlineInput
          type="date"
          value={doc.meta.endDate}
          onChange={(endDate) => {
            onMetaChange({ endDate });
          }}
          ariaLabel="Trip end date"
          className="font-bold"
        />
      </SummaryCell>
      <SummaryCell label="Destination">
        <InlineInput
          value={doc.meta.destination}
          onChange={(destination) => {
            onMetaChange({ destination });
          }}
          placeholder="City, country"
          ariaLabel="Destination"
          className="font-bold"
        />
      </SummaryCell>
      <SummaryCell label="Duration" readOnly>
        {nights} night{nights === 1 ? "" : "s"}
      </SummaryCell>
      <SummaryCell label="Flights" readOnly>
        {flights}
      </SummaryCell>
      <SummaryCell label="Hotels" readOnly>
        {hotels}
      </SummaryCell>
      <SummaryCell label="Places" readOnly>
        {places}
      </SummaryCell>
    </div>
  );
}

interface SummaryCellProps {
  label: string;
  readOnly?: boolean;
  children: React.ReactNode;
}

function SummaryCell({ label, readOnly = false, children }: SummaryCellProps): React.ReactElement {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          fontSize: "7pt",
          letterSpacing: "1.2pt",
          color: "var(--c-light-gray)",
          textTransform: "uppercase",
          marginBottom: "3pt",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "10pt",
          fontWeight: 700,
          color: "var(--c-black)",
          lineHeight: 1.2,
        }}
      >
        {readOnly ? <span>{children}</span> : children}
      </div>
    </div>
  );
}
