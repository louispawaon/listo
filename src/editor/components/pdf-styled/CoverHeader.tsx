import React from "react";
import type { TripMeta } from "../../../types/listo";
import { InlineInput } from "../InlineEdit";
import { formatDateRange } from "../../../lib/formatters";

/**
 * Editable cover block, rendering the same layout as the PDF's cover
 * header (src/pdf/TripPDFDocument.tsx — `coverHeader` / `coverTitle` /
 * `coverDates` / `coverDivider`).
 *
 * Three inline-editable fields: name, destination (rendered as a pill next
 * to the title), and the date range (the date range itself is derived, but
 * the start/end dates are editable via the summary bar below).
 */

interface CoverHeaderProps {
  meta: TripMeta;
  onChange: (patch: Partial<TripMeta>) => void;
}

export function CoverHeader({ meta, onChange }: CoverHeaderProps): React.ReactElement {
  const hasDates = meta.startDate !== "" && meta.endDate !== "";
  const dateRange = hasDates ? formatDateRange(meta.startDate, meta.endDate) : "";

  return (
    <div style={{ marginBottom: "28pt" }}>
      <div
        style={{
          fontSize: "7.5pt",
          letterSpacing: "1.8pt",
          color: "var(--c-mid-gray)",
          marginBottom: "8pt",
          textTransform: "uppercase",
        }}
      >
        Travel Itinerary
      </div>

      <div
        style={{
          fontSize: "24pt",
          fontWeight: 700,
          color: "var(--c-black)",
          marginBottom: "5pt",
          lineHeight: 1.2,
        }}
      >
        <InlineInput
          value={meta.name}
          onChange={(name) => {
            onChange({ name });
          }}
          placeholder="Untitled trip"
          ariaLabel="Trip name"
        />
      </div>

      <div
        style={{
          fontSize: "11pt",
          color: "var(--c-dark-gray)",
          marginBottom: "14pt",
        }}
      >
        {hasDates ? dateRange : <span style={{ color: "var(--c-light-gray)", fontStyle: "italic" }}>Add trip dates below</span>}
      </div>

      <div
        style={{
          borderBottom: "2pt solid var(--c-black)",
        }}
      />
    </div>
  );
}
