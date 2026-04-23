import React from "react";
import type { ListoFlightBlock, ListoFlightEndpoint } from "../../types/listo";
import { CardShell } from "./CardShell";
import { TextField } from "./Field";

interface FlightCardProps {
  block: ListoFlightBlock;
  onChange: (patch: Partial<ListoFlightBlock>) => void;
  onRemove: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  dragHandleRef?: React.Ref<HTMLButtonElement>;
}

export function FlightCard({
  block,
  onChange,
  onRemove,
  dragHandleProps,
  dragHandleRef,
}: FlightCardProps): React.ReactElement {
  const updateEndpoint = (
    key: "depart" | "arrive",
    patch: Partial<ListoFlightEndpoint>
  ): void => {
    onChange({ [key]: { ...block[key], ...patch } } as Partial<ListoFlightBlock>);
  };

  return (
    <CardShell
      title={block.flightNumber || "Flight"}
      subtitle={`${block.depart.airportIata || "???"} → ${block.arrive.airportIata || "???"}`}
      onRemove={onRemove}
      {...(dragHandleProps !== undefined ? { dragHandleProps } : {})}
      {...(dragHandleRef !== undefined ? { dragHandleRef } : {})}
    >
      <div className="grid grid-cols-2 gap-2">
        <TextField
          label="Airline"
          value={block.airline}
          onChange={(airline) => { onChange({ airline }); }}
        />
        <TextField
          label="Flight number"
          value={block.flightNumber}
          onChange={(flightNumber) => { onChange({ flightNumber }); }}
        />
      </div>

      <div className="rounded-md border border-neutral-100 bg-neutral-50 p-2">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Departure</div>
        <div className="grid grid-cols-2 gap-2">
          <TextField
            label="Airport IATA"
            value={block.depart.airportIata}
            onChange={(airportIata) => { updateEndpoint("depart", { airportIata }); }}
          />
          <TextField
            label="City"
            value={block.depart.city}
            onChange={(city) => { updateEndpoint("depart", { city }); }}
          />
          <TextField
            label="Airport name"
            value={block.depart.airportName}
            onChange={(airportName) => { updateEndpoint("depart", { airportName }); }}
            className="col-span-2"
          />
          <TextField
            label="Date"
            type="date"
            value={block.depart.date}
            onChange={(date) => { updateEndpoint("depart", { date }); }}
          />
          <TextField
            label="Time"
            type="time"
            value={block.depart.time}
            onChange={(time) => { updateEndpoint("depart", { time }); }}
          />
        </div>
      </div>

      <div className="rounded-md border border-neutral-100 bg-neutral-50 p-2">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Arrival</div>
        <div className="grid grid-cols-2 gap-2">
          <TextField
            label="Airport IATA"
            value={block.arrive.airportIata}
            onChange={(airportIata) => { updateEndpoint("arrive", { airportIata }); }}
          />
          <TextField
            label="City"
            value={block.arrive.city}
            onChange={(city) => { updateEndpoint("arrive", { city }); }}
          />
          <TextField
            label="Airport name"
            value={block.arrive.airportName}
            onChange={(airportName) => { updateEndpoint("arrive", { airportName }); }}
            className="col-span-2"
          />
          <TextField
            label="Date"
            type="date"
            value={block.arrive.date}
            onChange={(date) => { updateEndpoint("arrive", { date }); }}
          />
          <TextField
            label="Time"
            type="time"
            value={block.arrive.time}
            onChange={(time) => { updateEndpoint("arrive", { time }); }}
          />
        </div>
      </div>
    </CardShell>
  );
}
