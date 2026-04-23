/**
 * Detects which non-Latin writing systems appear in a document's text fields.
 * The result drives lazy font registration in `./fonts` — we only ship
 * fallback TTFs for scripts that are actually present in the data.
 *
 * Ranges are intentionally conservative (BMP + common supplementary blocks).
 * Unknown scripts fall through to the base Noto Sans (Latin/Greek/Cyrillic/
 * Vietnamese) without triggering a download.
 */

import type { ListoDocument } from "../types/listo";

export type ScriptTag =
  | "thai"
  // Phase B additions (not yet wired — fonts not shipped)
  ;

interface ScriptRange {
  tag: ScriptTag;
  test: RegExp;
}

const SCRIPT_RANGES: readonly ScriptRange[] = [
  { tag: "thai", test: /[\u0E00-\u0E7F]/ },
];

/** Concatenates every user-facing string from a Listo document into a scan buffer. */
function collectText(doc: ListoDocument): string {
  const parts: string[] = [doc.meta.name, doc.meta.destination];

  for (const section of doc.sections) {
    parts.push(section.heading);
    for (const block of section.blocks) {
      switch (block.type) {
        case "flight":
          parts.push(
            block.airline,
            block.flightNumber,
            block.depart.airportName,
            block.depart.city,
            block.arrive.airportName,
            block.arrive.city,
          );
          break;
        case "hotel":
          parts.push(block.name, block.address);
          if (block.confirmationNumber !== null) parts.push(block.confirmationNumber);
          if (block.phone !== null) parts.push(block.phone);
          if (block.website !== null) parts.push(block.website);
          break;
        case "place":
          parts.push(block.name, block.address);
          break;
        case "note":
          parts.push(block.title, block.content);
          break;
      }
    }
  }

  for (const day of doc.days) {
    parts.push(day.label);
    for (const activity of day.activities) {
      parts.push(activity.label);
      if (activity.source === "manual" && activity.notes !== undefined) {
        parts.push(activity.notes);
      }
    }
  }

  return parts.join("\n");
}

export function detectScripts(doc: ListoDocument): ReadonlySet<ScriptTag> {
  const blob = collectText(doc);
  const hits = new Set<ScriptTag>();
  for (const { tag, test } of SCRIPT_RANGES) {
    if (test.test(blob)) {
      hits.add(tag);
    }
  }
  console.debug(`[Listo/scriptDetect] scanned ${blob.length} chars, detected: [${[...hits].join(", ") || "latin only"}]`);
  return hits;
}
