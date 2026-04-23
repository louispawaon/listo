/**
 * Triggers PDF generation and download in the browser.
 * Uses @react-pdf/renderer's pdf() function directly (no iframe needed).
 *
 * The generator takes a fully edited `ListoDocument` — all user edits in the
 * editor are reflected in the PDF. It does not read the original `TripData`.
 */

import React from "react";
import { pdf } from "@react-pdf/renderer";
import { safeDownloadBasename } from "../lib/downloadFilename";
import { TripPDFDocument } from "./TripPDFDocument";
import { ensureFontsForScripts } from "./fonts";
import { detectScripts } from "./scriptDetect";
import type { ListoDocument } from "../types/listo";

export type GenerationResult =
  | { success: true }
  | { success: false; error: string };

export async function generateAndDownloadPDF(doc: ListoDocument): Promise<GenerationResult> {
  try {
    ensureFontsForScripts(detectScripts(doc));

    const generatedAt = new Date().toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const blob = await pdf(
      <TripPDFDocument doc={doc} generatedAt={generatedAt} />
    ).toBlob();

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeDownloadBasename(doc.meta.name, "Itinerary")}_Itinerary.pdf`;
    anchor.click();

    setTimeout(() => { URL.revokeObjectURL(url); }, 10_000);

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown PDF generation error";
    return { success: false, error: message };
  }
}
