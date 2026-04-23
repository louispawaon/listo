/**
 * Triggers PDF generation and download in the browser.
 * Uses @react-pdf/renderer's pdf() function directly (no iframe needed).
 */

import React from "react";
import { pdf } from "@react-pdf/renderer";
import { safeDownloadBasename } from "../lib/downloadFilename";
import { TripPDFDocument } from "./TripPDFDocument";
import { ensureFontsForScripts } from "./fonts";
import { detectScripts } from "./scriptDetect";
import type { TripData } from "../types/trip";

export type GenerationResult =
  | { success: true }
  | { success: false; error: string };

export async function generateAndDownloadPDF(trip: TripData): Promise<GenerationResult> {
  try {
    ensureFontsForScripts(detectScripts(trip));

    const generatedAt = new Date().toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const blob = await pdf(
      <TripPDFDocument trip={trip} generatedAt={generatedAt} />
    ).toBlob();

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeDownloadBasename(trip.name, "Itinerary")}_Itinerary.pdf`;
    anchor.click();

    // Cleanup
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 10_000);

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown PDF generation error";
    return { success: false, error: message };
  }
}
