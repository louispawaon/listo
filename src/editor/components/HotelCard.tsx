import React from "react";
import type { ListoHotelBlock } from "../../types/listo";
import { CardShell } from "./CardShell";
import { TextField } from "./Field";

interface HotelCardProps {
  block: ListoHotelBlock;
  onChange: (patch: Partial<ListoHotelBlock>) => void;
  onRemove: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  dragHandleRef?: React.Ref<HTMLButtonElement>;
}

export function HotelCard({
  block,
  onChange,
  onRemove,
  dragHandleProps,
  dragHandleRef,
}: HotelCardProps): React.ReactElement {
  return (
    <CardShell
      title={block.name || "Hotel"}
      {...(block.address !== "" ? { subtitle: block.address } : {})}
      onRemove={onRemove}
      {...(dragHandleProps !== undefined ? { dragHandleProps } : {})}
      {...(dragHandleRef !== undefined ? { dragHandleRef } : {})}
    >
      <TextField
        label="Name"
        value={block.name}
        onChange={(name) => { onChange({ name }); }}
      />
      <TextField
        label="Address"
        value={block.address}
        onChange={(address) => { onChange({ address }); }}
      />
      <div className="grid grid-cols-2 gap-2">
        <TextField
          label="Check-in"
          type="date"
          value={block.checkIn}
          onChange={(checkIn) => { onChange({ checkIn }); }}
        />
        <TextField
          label="Check-out"
          type="date"
          value={block.checkOut}
          onChange={(checkOut) => { onChange({ checkOut }); }}
        />
      </div>
      <TextField
        label="Confirmation number"
        value={block.confirmationNumber ?? ""}
        onChange={(value) => {
          const next = value.trim() === "" ? null : value;
          onChange({ confirmationNumber: next });
        }}
      />
      <div className="grid grid-cols-2 gap-2">
        <TextField
          label="Phone"
          value={block.phone ?? ""}
          onChange={(value) => {
            const next = value.trim() === "" ? null : value;
            onChange({ phone: next });
          }}
        />
        <TextField
          label="Website"
          value={block.website ?? ""}
          onChange={(value) => {
            const next = value.trim() === "" ? null : value;
            onChange({ website: next });
          }}
        />
      </div>
    </CardShell>
  );
}
