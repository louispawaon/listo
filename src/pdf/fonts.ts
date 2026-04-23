/// <reference types="chrome" />

/**
 * Unicode-safe font wiring for the PDF pipeline.
 *
 * Strategy
 * ────────
 * - Base family (`Noto Sans`) is registered once at module load. It covers
 *   Latin, Vietnamese, Cyrillic, Greek — enough for the default PDF.
 * - Script-specific families are registered lazily via `ensureFontsForScripts`
 *   to keep the first render fast and avoid fetching fonts we don't need.
 * - Fallback is expressed at the *style* layer: `getFontFamilyChain()` returns
 *   every registered family in registration order, and the Page style applies
 *   it as `fontFamily: string[]`. react-pdf v4's layout engine walks this
 *   array per-codepoint, so missing glyphs in Noto Sans cascade to
 *   Noto Sans Thai (etc.) automatically. There is no `fallback: true` flag
 *   in v4 — that option was removed when the font stack was rewritten.
 *
 * Variable fonts are intentionally avoided — react-pdf's fontkit/pdfkit stack
 * ignores variation axes, so we register static Regular/Bold cuts instead.
 *
 * Font TTFs live in `public/fonts/` and are copied into `dist/fonts/` by the
 * existing webpack CopyPlugin entry. They are exposed to the content script
 * origin via `web_accessible_resources` in the manifest.
 */

import { Font } from "@react-pdf/renderer";
import type { ScriptTag } from "./scriptDetect";

export const FONT_FAMILY = "Noto Sans";

/** Resolve a bundled asset path to an extension URL where possible. */
function fontUrl(relativePath: string): string {
  if (typeof chrome !== "undefined" && chrome.runtime !== undefined && typeof chrome.runtime.getURL === "function") {
    return chrome.runtime.getURL(relativePath);
  }
  return relativePath;
}

interface FaceSpec {
  src: string;
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
}

interface FamilySpec {
  family: string;
  faces: readonly FaceSpec[];
}

const BASE_FAMILY: FamilySpec = {
  family: FONT_FAMILY,
  faces: [
    { src: fontUrl("fonts/NotoSans-Regular.ttf"), fontWeight: "normal", fontStyle: "normal" },
    { src: fontUrl("fonts/NotoSans-Bold.ttf"),    fontWeight: "bold",   fontStyle: "normal" },
    { src: fontUrl("fonts/NotoSans-Italic.ttf"),  fontWeight: "normal", fontStyle: "italic" },
  ],
};

const SCRIPT_FAMILIES: Readonly<Record<ScriptTag, FamilySpec>> = {
  thai: {
    family: "Noto Sans Thai",
    faces: [
      { src: fontUrl("fonts/NotoSansThai-Regular.ttf"), fontWeight: "normal", fontStyle: "normal" },
      { src: fontUrl("fonts/NotoSansThai-Regular.ttf"), fontWeight: "normal", fontStyle: "italic" },
      { src: fontUrl("fonts/NotoSansThai-Bold.ttf"),    fontWeight: "bold",   fontStyle: "normal" },
      { src: fontUrl("fonts/NotoSansThai-Bold.ttf"),    fontWeight: "bold",   fontStyle: "italic" },
    ],
  },
};

const registered = new Set<string>();
const chain: string[] = [];

function registerFamily(spec: FamilySpec): void {
  if (registered.has(spec.family)) return;
  Font.register({
    family: spec.family,
    fonts: spec.faces.map((face) => ({ ...face })),
  });
  registered.add(spec.family);
  chain.push(spec.family);
  console.debug(`[Listo/fonts] registered ${spec.family} (${spec.faces.length} face${spec.faces.length === 1 ? "" : "s"})`);
}

/**
 * Disables the default Latin hyphenation algorithm. Without this, react-pdf
 * will try to hyphenate words mid-glyph in scripts it doesn't understand
 * (Thai, CJK), producing broken line breaks.
 */
function disableHyphenation(): void {
  Font.registerHyphenationCallback((word) => [word]);
}

// ── Module-load: register the base family + hyphenation policy ────────────────
registerFamily(BASE_FAMILY);
disableHyphenation();

/**
 * Registers any script-specific fallback families needed for the given trip.
 * Idempotent — calling repeatedly with the same scripts is a no-op after the
 * first registration.
 *
 * Scripts not present in `SCRIPT_FAMILIES` (e.g. future phase-B scripts for
 * which we haven't shipped TTFs yet) are silently ignored; the text will
 * render as tofu rather than throw.
 */
export function ensureFontsForScripts(scripts: ReadonlySet<ScriptTag>): void {
  console.debug(`[Listo/fonts] ensureFontsForScripts called with: [${[...scripts].join(", ") || "∅"}]`);
  for (const tag of scripts) {
    const spec = SCRIPT_FAMILIES[tag];
    if (spec !== undefined) {
      registerFamily(spec);
    } else {
      console.warn(`[Listo/fonts] no font spec for script "${tag}" — glyphs may render as tofu`);
    }
  }
}

/**
 * Returns every registered font family, ordered by registration. Apply as
 * `fontFamily: getFontFamilyChain()` on the Page style so react-pdf's layout
 * engine walks the chain per-codepoint when a glyph is missing from the
 * primary family.
 */
export function getFontFamilyChain(): readonly string[] {
  return chain;
}
