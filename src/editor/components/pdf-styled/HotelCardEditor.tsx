import React from "react";
import type { ListoHotelBlock } from "../../../types/listo";
import { InlineInput } from "../InlineEdit";
import { PdfCard } from "./PdfCard";
import { nightsBetween } from "../../../lib/formatters";

/**
 * Editable hotel card. Mirrors `HotelCardView` in TripPDFDocument:
 *   - large name, optional address below
 *   - meta row: check-in / check-out / nights / confirmation
 *   - optional divider row with phone / website when either is set
 */

interface HotelCardEditorProps {
  block: ListoHotelBlock;
  onChange: (patch: Partial<ListoHotelBlock>) => void;
  onRemove: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

export function HotelCardEditor({
  block,
  onChange,
  onRemove,
  dragHandleProps,
}: HotelCardEditorProps): React.ReactElement {
  const nights =
    block.checkIn !== "" && block.checkOut !== ""
      ? nightsBetween(block.checkIn, block.checkOut)
      : 0;

  // Phone / website slots always render in the editor (unlike the PDF,
  // which hides them when both are null) so the user can fill them in.

  return (
    <PdfCard
      onRemove={onRemove}
      {...(dragHandleProps !== undefined ? { dragHandleProps } : {})}
    >
      <div
        style={{
          fontSize: "11pt",
          fontWeight: 700,
          color: "var(--c-black)",
          marginBottom: "3pt",
        }}
      >
        <InlineInput
          value={block.name}
          onChange={(name) => {
            onChange({ name });
          }}
          placeholder="Unnamed hotel"
          ariaLabel="Hotel name"
        />
      </div>

      <div
        style={{
          fontSize: "8.5pt",
          color: "var(--c-mid-gray)",
          marginBottom: "10pt",
          lineHeight: 1.4,
        }}
      >
        <InlineInput
          value={block.address}
          onChange={(address) => {
            onChange({ address });
          }}
          placeholder="Address"
          ariaLabel="Address"
        />
      </div>

      <div style={{ display: "flex", flexDirection: "row" }}>
        <MetaItem label="Check-in">
          <InlineInput
            type="date"
            value={block.checkIn}
            onChange={(checkIn) => {
              onChange({ checkIn });
            }}
            ariaLabel="Check-in date"
          />
        </MetaItem>
        <MetaItem label="Check-out">
          <InlineInput
            type="date"
            value={block.checkOut}
            onChange={(checkOut) => {
              onChange({ checkOut });
            }}
            ariaLabel="Check-out date"
          />
        </MetaItem>
        <MetaItem label="Nights" readOnly>
          {nights > 0 ? nights : "—"}
        </MetaItem>
        <MetaItem label="Confirmation">
          <InlineInput
            value={block.confirmationNumber ?? ""}
            onChange={(value) => {
              const next = value.trim() === "" ? null : value;
              onChange({ confirmationNumber: next });
            }}
            placeholder="Not provided"
            ariaLabel="Confirmation number"
          />
        </MetaItem>
      </div>

      <div
        style={{
          borderTop: "1pt solid var(--c-rule-light)",
          marginTop: "10pt",
          paddingTop: "8pt",
          display: "flex",
          flexDirection: "row",
          gap: "16pt",
        }}
      >
        <MetaItem label="Phone">
          <InlineInput
            value={block.phone ?? ""}
            onChange={(value) => {
              const next = value.trim() === "" ? null : value;
              onChange({ phone: next });
            }}
            placeholder="—"
            ariaLabel="Phone"
          />
        </MetaItem>
        <MetaItem label="Website">
          <InlineInput
            value={block.website ?? ""}
            onChange={(value) => {
              const next = value.trim() === "" ? null : value;
              onChange({ website: next });
            }}
            placeholder="—"
            ariaLabel="Website"
          />
        </MetaItem>
      </div>
    </PdfCard>
  );
}

interface MetaItemProps {
  label: string;
  readOnly?: boolean;
  children: React.ReactNode;
}

function MetaItem({ label, readOnly = false, children }: MetaItemProps): React.ReactElement {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          fontSize: "7pt",
          letterSpacing: "1pt",
          textTransform: "uppercase",
          color: "var(--c-light-gray)",
          marginBottom: "2pt",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "9pt",
          fontWeight: 700,
          color: "var(--c-black)",
        }}
      >
        {readOnly ? <span>{children}</span> : children}
      </div>
    </div>
  );
}
