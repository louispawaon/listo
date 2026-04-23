import React from "react";
import type { TripMeta } from "../../types/listo";
import { TextField } from "./Field";

interface TripHeaderProps {
  meta: TripMeta;
  onChange: (patch: Partial<TripMeta>) => void;
}

export function TripHeader({ meta, onChange }: TripHeaderProps): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-3 border-b border-neutral-200 bg-white px-6 py-4 md:grid-cols-4">
      <TextField
        label="Trip name"
        value={meta.name}
        onChange={(name) => { onChange({ name }); }}
        placeholder="Untitled trip"
        className="md:col-span-2"
      />
      <TextField
        label="Destination"
        value={meta.destination}
        onChange={(destination) => { onChange({ destination }); }}
        placeholder="City, country"
      />
      <div className="grid grid-cols-2 gap-2">
        <TextField
          label="Start"
          type="date"
          value={meta.startDate}
          onChange={(startDate) => { onChange({ startDate }); }}
        />
        <TextField
          label="End"
          type="date"
          value={meta.endDate}
          onChange={(endDate) => { onChange({ endDate }); }}
        />
      </div>
    </div>
  );
}
