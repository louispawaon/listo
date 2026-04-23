/// <reference types="chrome" />

/**
 * Thin typed wrappers over `chrome.storage.local` for the editor tab.
 *
 * Three storage keys are used:
 *   - `listoDoc`       : set by the content script when a fresh extraction is
 *                        ready for adoption by the editor
 *   - `listoSource`    : always "extraction" when paired with `listoDoc`
 *   - `listoAutosave`  : debounced document snapshot from the editor itself
 */

import type { ListoDocument } from "../types/listo";

export const STORAGE_KEYS = {
  doc: "listoDoc",
  source: "listoSource",
  autosave: "listoAutosave",
} as const;

export interface BootstrapPayload {
  /** Fresh extraction from Wanderlog awaiting adoption. */
  extractionDoc: ListoDocument | null;
  /** Last autosaved editor snapshot, if any. */
  autosaveDoc: ListoDocument | null;
}

function isListoDocument(val: unknown): val is ListoDocument {
  if (typeof val !== "object" || val === null) return false;
  const record = val as Record<string, unknown>;
  return record["version"] === 1 && typeof record["savedAt"] === "string";
}

export async function readBootstrap(): Promise<BootstrapPayload> {
  const stored = await chrome.storage.local.get([
    STORAGE_KEYS.doc,
    STORAGE_KEYS.source,
    STORAGE_KEYS.autosave,
  ]);

  const extractionCandidate = stored[STORAGE_KEYS.doc];
  const source = stored[STORAGE_KEYS.source];
  const autosaveCandidate = stored[STORAGE_KEYS.autosave];

  const extractionDoc =
    source === "extraction" && isListoDocument(extractionCandidate)
      ? extractionCandidate
      : null;

  const autosaveDoc = isListoDocument(autosaveCandidate) ? autosaveCandidate : null;

  return { extractionDoc, autosaveDoc };
}

export async function clearExtractionHandoff(): Promise<void> {
  await chrome.storage.local.remove([STORAGE_KEYS.doc, STORAGE_KEYS.source]);
}

export async function writeAutosave(doc: ListoDocument): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.autosave]: doc });
}

export async function clearAutosave(): Promise<void> {
  await chrome.storage.local.remove([STORAGE_KEYS.autosave]);
}
