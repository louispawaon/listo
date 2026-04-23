import React from "react";
import type { ListoPlaceBlock } from "../../types/listo";
import { CardShell } from "./CardShell";
import { TextField } from "./Field";

interface PlaceCardProps {
  block: ListoPlaceBlock;
  onChange: (patch: Partial<ListoPlaceBlock>) => void;
  onRemove: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  dragHandleRef?: React.Ref<HTMLButtonElement>;
}

export function PlaceCard({
  block,
  onChange,
  onRemove,
  dragHandleProps,
  dragHandleRef,
}: PlaceCardProps): React.ReactElement {
  return (
    <CardShell
      title={block.name || "Place"}
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
      <TextField
        label="Rating"
        value={block.rating > 0 ? block.rating.toFixed(1) : ""}
        onChange={(value) => {
          const parsed = parseFloat(value);
          const rating = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
          onChange({ rating });
        }}
        placeholder="0.0"
      />
    </CardShell>
  );
}
