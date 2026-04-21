/**
 * Content script — runs on wanderlog.com/plan/* pages.
 * Injects a floating export button into the page.
 * PDF stack is bundled into this script so webpack does not load numbered chunks
 * from the wrong origin (page CSP / Wanderlog’s own chunk URLs).
 */

import { extractTripData } from "../lib/extractor";
import { generateAndDownloadPDF, type GenerationResult } from "../pdf/generator";
import { readMobXStateFromPage } from "./readPageMobx";

const BUTTON_ID = "wanderlog-exporter-btn";

function createExportButton(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.id = BUTTON_ID;
  btn.textContent = "⬇ Export PDF";

  Object.assign(btn.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    zIndex: "99999",
    padding: "10px 18px",
    backgroundColor: "#1a1a1a",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    fontFamily: "system-ui, sans-serif",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    transition: "opacity 0.2s",
  });

  btn.addEventListener("mouseenter", () => {
    btn.style.opacity = "0.85";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.opacity = "1";
  });

  return btn;
}

function setButtonState(
  btn: HTMLButtonElement,
  state: "idle" | "loading" | "error"
): void {
  switch (state) {
    case "idle":
      btn.textContent = "⬇ Export PDF";
      btn.disabled = false;
      btn.style.backgroundColor = "#1a1a1a";
      break;
    case "loading":
      btn.textContent = "Generating...";
      btn.disabled = true;
      btn.style.backgroundColor = "#555555";
      break;
    case "error":
      btn.textContent = "Export Failed";
      btn.disabled = false;
      btn.style.backgroundColor = "#cc3333";
      setTimeout(() => { setButtonState(btn, "idle"); }, 3000);
      break;
  }
}

async function handleExport(btn: HTMLButtonElement): Promise<void> {
  setButtonState(btn, "loading");

  let mobxState: unknown;
  try {
    mobxState = await readMobXStateFromPage();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not read page MobX state.";
    console.error("[Wanderlog Exporter]", msg);
    setButtonState(btn, "error");
    return;
  }

  const extraction = extractTripData(mobxState);

  if (!extraction.success) {
    console.error("[Wanderlog Exporter]", extraction.error);
    setButtonState(btn, "error");
    return;
  }

  let generation: GenerationResult;
  try {
    generation = await generateAndDownloadPDF(extraction.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load PDF generator";
    console.error("[Wanderlog Exporter]", message);
    setButtonState(btn, "error");
    return;
  }

  if (!generation.success) {
    console.error("[Wanderlog Exporter]", generation.error);
    setButtonState(btn, "error");
    return;
  }

  setButtonState(btn, "idle");
}

function inject(): void {
  if (document.getElementById(BUTTON_ID) !== null) return;

  const btn = createExportButton();
  btn.addEventListener("click", () => { void handleExport(btn); });
  document.body.appendChild(btn);
}

// Wanderlog is an SPA — wait for the page to be interactive
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", inject);
} else {
  inject();
}
