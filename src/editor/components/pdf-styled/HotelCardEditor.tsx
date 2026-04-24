import React from "react";
import type { ListoHotelBlock } from "../../../types/listo";
import { InlineInput } from "../InlineEdit";
import { nightsBetween } from "../../../lib/formatters";
import { LINE_HEIGHT, SPACE, TRACKING, TYPE } from "../../../design/tokens";

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
    block.checkIn !== "" && block.checkOut !== "" ? nightsBetween(block.checkIn, block.checkOut) : 0;
  const nightsLabel =
    nights > 0 ? `${nights} night${nights === 1 ? "" : "s"}` : "—";

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
          borderRadius: `${SPACE.hotelCardRadius}pt`,
          overflow: "hidden",
          boxShadow: "0 1px 0 rgba(0,0,0,0.02), 0 2px 6px rgba(0,0,0,0.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: `${SPACE.hotelHeaderPaddingY}pt ${SPACE.hotelHeaderPaddingX}pt`,
            backgroundColor: "var(--c-accent)",
            color: "var(--c-white)",
          }}
        >
          <span
            style={{
              fontSize: `${TYPE.hotelHeaderEyebrow}pt`,
              letterSpacing: `${TRACKING.hotelHeaderTitle}pt`,
              textTransform: "uppercase",
              fontWeight: 700,
              color: "var(--c-white)",
            }}
          >
            Accommodation
          </span>
          <span
            style={{
              fontSize: `${TYPE.hotelNightsPill}pt`,
              fontWeight: 700,
              letterSpacing: `${TRACKING.hotelNightsPill}pt`,
              color: "rgba(255, 255, 255, 0.72)",
            }}
            aria-label="Number of nights"
          >
            {nightsLabel}
          </span>
        </div>

        <div
          style={{
            padding: `${SPACE.hotelBodyPaddingTop}pt ${SPACE.hotelBodyPaddingX}pt ${SPACE.hotelBodyPaddingBottom}pt`,
          }}
        >
          <div
            style={{
              fontSize: `${TYPE.hotelName}pt`,
              fontWeight: 700,
              color: "var(--c-black)",
              marginBottom: `${SPACE.hotelNameMarginBottom}pt`,
              lineHeight: LINE_HEIGHT.hotelName,
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
              fontSize: `${TYPE.hotelAddress}pt`,
              color: "var(--c-mid-gray)",
              marginBottom: `${SPACE.hotelAddressMarginBottom}pt`,
              lineHeight: LINE_HEIGHT.hotelAddress,
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

          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "stretch",
              gap: `${SPACE.hotelDateRowGap}pt`,
              marginTop: `${SPACE.hotelDateRowMarginTop}pt`,
            }}
          >
            <DateTile label="Check-in" ariaGroup="Check-in">
              <div
                style={{
                  fontSize: `${TYPE.hotelStayDate}pt`,
                  fontWeight: 700,
                  color: "var(--c-black)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <InlineInput
                  type="date"
                  value={block.checkIn}
                  onChange={(checkIn) => {
                    onChange({ checkIn });
                  }}
                  ariaLabel="Check-in date"
                />
              </div>
            </DateTile>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                width: "12pt",
                minWidth: "12pt",
                marginLeft: `${SPACE.hotelDateMidGutter}pt`,
                marginRight: `${SPACE.hotelDateMidGutter}pt`,
                flexShrink: 0,
              }}
              aria-hidden
            >
              <div
                style={{
                  width: "1px",
                  height: `${SPACE.hotelDateRuleHeight}pt`,
                  backgroundColor: "var(--c-rule)",
                }}
              />
            </div>
            <DateTile label="Check-out" ariaGroup="Check-out">
              <div
                style={{
                  fontSize: `${TYPE.hotelStayDate}pt`,
                  fontWeight: 700,
                  color: "var(--c-black)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <InlineInput
                  type="date"
                  value={block.checkOut}
                  onChange={(checkOut) => {
                    onChange({ checkOut });
                  }}
                  ariaLabel="Check-out date"
                />
              </div>
            </DateTile>
          </div>

          <div
            style={{
              marginTop: `${SPACE.hotelConfirmationMarginTop}pt`,
              backgroundColor: "var(--c-surface-dark)",
              borderRadius: `${SPACE.hotelDateTileRadius}pt`,
              padding: `${SPACE.hotelConfirmationPadding}pt`,
              border: "1pt solid var(--c-rule-light)",
            }}
          >
            <div
              style={{
                fontSize: `${TYPE.metaLabel}pt`,
                letterSpacing: `${TRACKING.metaLabel}pt`,
                textTransform: "uppercase",
                color: "var(--c-light-gray)",
                marginBottom: "4pt",
              }}
            >
              Confirmation
            </div>
            <div
              style={{
                fontSize: `${TYPE.hotelConfirmation}pt`,
                fontWeight: 700,
                color: "var(--c-black)",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "0.3pt",
              }}
            >
              <InlineInput
                value={block.confirmationNumber ?? ""}
                onChange={(value) => {
                  const next = value.trim() === "" ? null : value;
                  onChange({ confirmationNumber: next });
                }}
                placeholder="Not provided"
                ariaLabel="Confirmation number"
              />
            </div>
          </div>
        </div>

        <div
          style={{
            borderTop: "1pt dashed var(--c-rule)",
            marginLeft: `${SPACE.hotelBodyPaddingX}pt`,
            marginRight: `${SPACE.hotelBodyPaddingX}pt`,
            paddingTop: `${SPACE.hotelDividerPaddingTop}pt`,
            marginTop: `${SPACE.hotelDividerMarginTop}pt`,
            paddingBottom: `${SPACE.hotelBodyPaddingBottom}pt`,
            display: "flex",
            flexDirection: "row",
            gap: `${SPACE.hotelContactGap}pt`,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: `${TYPE.metaLabel}pt`,
                letterSpacing: `${TRACKING.metaLabel}pt`,
                textTransform: "uppercase",
                color: "var(--c-light-gray)",
                marginBottom: "2pt",
              }}
            >
              Phone
            </div>
            <div
              style={{
                fontSize: `${TYPE.metaValue}pt`,
                fontWeight: 700,
                color: "var(--c-black)",
              }}
            >
              <InlineInput
                value={block.phone ?? ""}
                onChange={(value) => {
                  const next = value.trim() === "" ? null : value;
                  onChange({ phone: next });
                }}
                placeholder="—"
                ariaLabel="Phone"
              />
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: `${TYPE.metaLabel}pt`,
                letterSpacing: `${TRACKING.metaLabel}pt`,
                textTransform: "uppercase",
                color: "var(--c-light-gray)",
                marginBottom: "2pt",
              }}
            >
              Website
            </div>
            <div
              style={{
                fontSize: `${TYPE.metaValue}pt`,
                fontWeight: 700,
                color: "var(--c-black)",
                wordBreak: "break-all",
              }}
            >
              <InlineInput
                value={block.website ?? ""}
                onChange={(value) => {
                  const next = value.trim() === "" ? null : value;
                  onChange({ website: next });
                }}
                placeholder="—"
                ariaLabel="Website"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DateTile({
  label,
  children,
  ariaGroup,
}: {
  label: string;
  children: React.ReactNode;
  ariaGroup: string;
}): React.ReactElement {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        backgroundColor: "var(--c-white)",
        border: "1pt solid var(--c-rule)",
        borderRadius: `${SPACE.hotelDateTileRadius}pt`,
        padding: `${SPACE.hotelDateTilePadding}pt`,
      }}
      role="group"
      aria-label={ariaGroup}
    >
      <div
        style={{
          fontSize: `${TYPE.hotelDateTileLabel}pt`,
          fontWeight: 700,
          letterSpacing: `${TRACKING.hotelDateTileLabel}pt`,
          textTransform: "uppercase",
          color: "var(--c-light-gray)",
          marginBottom: "3pt",
        }}
      >
        {label}
      </div>
      {children}
    </div>
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
