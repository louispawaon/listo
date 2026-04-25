# Listo

Listo is a Chrome extension for building clean, immigration-ready trip documents from your Wanderlog plan.

It works in three stages: **Extract → Edit → Export**.

1. **Extract** — on a `wanderlog.com/plan/*` page, Listo reads trip data from Wanderlog's in-page MobX state (`window.__MOBX_STATE__.tripPlanStore`), validates it, and turns it into a normalized trip model. Daily rows are built from your sections with heuristics that map overview-style headings (flights, hotels, places) to the calendar without guessing from loose substrings.
2. **Edit** — the trip opens in a full editor tab on an A4 “paper” canvas. Layout and typography mirror the export PDF: cover header, summary strip, and card-based sections. You can zoom the canvas, see approximate PDF page breaks, drag sections and the daily itinerary into a **single** order, and edit flights, hotels, places, notes, and per-day activities inline.
3. **Export** — save the document as a portable `.listo` JSON file, or generate an A4 PDF suitable for visa and immigration submissions. PDF styling and measurements come from the same `design/tokens` module as the editor so the two stay aligned.

No trip data is sent to any external server. Everything runs locally in the browser.

## Features

- One-click **Open in Listo** on any Wanderlog plan page
- **WYSIWYG paper editor** — A4 canvas, zoom (50%–150%), and page-break overlay so you can see how content will split across PDF pages
- **Unified ordering** — sections and the day-by-day itinerary share one drag order; `itineraryIndex` in the document model controls where the itinerary sits (see [`.listo` format](#the-listo-format))
- **Import** / **Save** (`.listo`) and **Export PDF** in the editor toolbar; autosave to `chrome.storage.local` while the editor is open, with an optional **Resume editing** path if an unsaved session is found
- Structured, formal PDF output (fonts, spacing, and cover layout) tuned for immigration use

## Tech Stack

- TypeScript, React 19, Tailwind CSS v4
- Chrome extension (Manifest V3)
- `@react-pdf/renderer` for PDF generation; shared `src/design/tokens.ts` for layout constants used by both HTML editor and PDF
- `@dnd-kit` for drag-and-drop (sections, blocks, itinerary rows, and paper sort order)

## Project Structure

```text
src/
├── design/
│   └── tokens.ts            # Spacing, type scale, page size (PDF + editor)
├── types/
│   ├── wanderlog.ts         # Raw MobX store types
│   ├── trip.ts              # Normalized extraction types
│   ├── listo.ts             # ListoDocument (editor + .listo schema)
│   └── css.d.ts
├── lib/
│   ├── extractor.ts         # MobX store → TripData
│   ├── initEditorState.ts   # TripData → ListoDocument hydration
│   ├── itineraryFromWanderlog.ts
│   ├── flightHeuristics.ts
│   ├── calendarDates.ts
│   ├── formatters.ts
│   ├── paperLayout.ts       # Itinerary index, section order, sort IDs
│   └── downloadFilename.ts
├── pdf/
│   ├── TripPDFDocument.tsx
│   ├── generator.tsx
│   ├── fonts.ts
│   └── scriptDetect.ts
├── content/
│   ├── index.ts
│   └── readPageMobx.ts
├── background/
│   └── index.ts
├── popup/
│   └── index.tsx
└── editor/
    ├── index.tsx
    ├── EditorApp.tsx
    ├── Landing.tsx
    ├── storage.ts
    ├── styles.css
    ├── hooks/               # useEditorState, useAutoSave, useListoFile
    └── components/
        ├── Toolbar.tsx      # Zoom, Import, Save, Export PDF
        ├── PaperCanvas.tsx  # A4 shell + zoom
        ├── PageBreakOverlay.tsx
        ├── InlineEdit.tsx
        └── pdf-styled/      # On-screen cards matching PDF blocks
            ├── CoverHeader.tsx
            ├── SummaryBar.tsx
            ├── SectionBlock.tsx
            ├── SectionContent.tsx
            ├── FlightCardEditor.tsx
            ├── HotelCardEditor.tsx
            ├── PlacesTableEditor.tsx
            ├── NotesListEditor.tsx
            ├── ItineraryTableEditor.tsx
            └── PdfCard.tsx
```

## Installation

### 1) Install dependencies

```bash
pnpm install
```

### 2) Build the extension

```bash
pnpm run build
```

### 3) Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `dist/` directory

## Development

```bash
pnpm run dev        # Webpack watch mode
pnpm run typecheck  # TypeScript only
pnpm run lint       # ESLint
```

## Usage

1. Open your trip at `https://wanderlog.com/plan/...` and let the plan finish loading
2. Click **Open in Listo** (bottom-right on the plan page)
3. In the editor, adjust zoom if needed, reorder blocks with drag-and-drop, and edit text inline
4. **Save** writes a `.listo` file; **Import** loads one. **Export PDF** downloads the document

To open the editor without being on Wanderlog, use the extension’s **Open Listo editor** action, then import a `.listo` file from the empty state or from the toolbar (same as the popup’s instructions).

## The `.listo` format

A `.listo` file is JSON for the full `ListoDocument`. The root includes:

- `version: 1` — the loader checks this and rejects incompatible files
- `itineraryIndex` (optional) — how many ordered sections appear **before** the daily itinerary block. If missing or out of range, the itinerary is treated as last, matching older saves

Bumping the schema means incrementing `ListoDocument.version` in `src/types/listo.ts` and teaching the loader to migrate older files.

## Maintenance notes

- The in-page button only runs on `https://wanderlog.com/plan/*`
- If Wanderlog’s internal store changes, update `src/types/wanderlog.ts` and `src/lib/extractor.ts` (and any itinerary heuristics in `src/lib/itineraryFromWanderlog.ts` as needed)
- If PDF pages or the on-paper layout drift, keep **`src/design/tokens.ts`**, `src/lib/paperLayout.ts`, `src/pdf/TripPDFDocument.tsx`, and the `pdf-styled` editor components in sync — they intentionally share a single design source
