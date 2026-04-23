/**
 * Content script — runs on wanderlog.com/plan/* pages.
 * Injects a floating "Open in Listo" button. On click, reads the Wanderlog
 * MobX store via the background bridge, hydrates a ListoDocument, stashes it
 * in chrome.storage.local, and asks the background worker to open the editor
 * tab (content scripts cannot call chrome.tabs directly).
 */

import { extractTripData } from "../lib/extractor";
import { initEditorState } from "../lib/initEditorState";
import { readMobXStateFromPage } from "./readPageMobx";

const BUTTON_ID = "listo-open-editor-btn";

function createOpenButton(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.id = BUTTON_ID;
  btn.textContent = "Open in Listo";

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
      btn.textContent = "Open in Listo";
      btn.disabled = false;
      btn.style.backgroundColor = "#1a1a1a";
      break;
    case "loading":
      btn.textContent = "Preparing…";
      btn.disabled = true;
      btn.style.backgroundColor = "#555555";
      break;
    case "error":
      btn.textContent = "Couldn't open";
      btn.disabled = false;
      btn.style.backgroundColor = "#cc3333";
      setTimeout(() => { setButtonState(btn, "idle"); }, 3000);
      break;
  }
}

type OpenEditorResponse =
  | { ok: true }
  | { ok: false; error: string }
  | undefined;

async function requestOpenEditor(): Promise<void> {
  const response = (await chrome.runtime.sendMessage({ type: "OPEN_EDITOR" })) as OpenEditorResponse;
  if (response === undefined) {
    throw new Error("No response from extension background.");
  }
  if (!response.ok) {
    throw new Error(response.error);
  }
}

async function handleOpenEditor(btn: HTMLButtonElement): Promise<void> {
  setButtonState(btn, "loading");

  let mobxState: unknown;
  try {
    mobxState = await readMobXStateFromPage();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not read page MobX state.";
    console.error("[Listo]", msg);
    setButtonState(btn, "error");
    return;
  }

  const extraction = extractTripData(mobxState);
  if (!extraction.success) {
    console.error("[Listo]", extraction.error);
    setButtonState(btn, "error");
    return;
  }

  const doc = initEditorState(extraction.data);

  try {
    await chrome.storage.local.set({ listoDoc: doc, listoSource: "extraction" });
    await requestOpenEditor();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to open the editor.";
    console.error("[Listo]", msg);
    setButtonState(btn, "error");
    return;
  }

  setButtonState(btn, "idle");
}

function inject(): void {
  if (document.getElementById(BUTTON_ID) !== null) return;

  const btn = createOpenButton();
  btn.addEventListener("click", () => { void handleOpenEditor(btn); });
  document.body.appendChild(btn);
}

// Wanderlog is an SPA — wait for the page to be interactive.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", inject);
} else {
  inject();
}
