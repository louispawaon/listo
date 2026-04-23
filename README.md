# Listo

Listo is a Chrome extension for building clean, immigration-ready trip documents from your Wanderlog plan.

It works in three stages: **Extract → Edit → Export**.

1. **Extract** — on a `wanderlog.com/plan/*` page, Listo reads trip data from Wanderlog's in-page MobX state (`window.__MOBX_STATE__.tripPlanStore`).
2. **Edit** — the data opens in a full editor tab where you can reorder sections, edit flights/hotels/places/notes, and add your own daily activities.
3. **Export** — save the edited document as a portable `.listo` JSON file, or generate an A4 PDF suitable for visa and immigration submissions.

No trip data is sent to any external server. Everything runs locally in the browser.

## Features

- One-click "Open in Listo" on any Wanderlog plan page
- Full editor tab with drag-and-drop section and block reordering
- Per-day activity list with manual entries (meals, transport, activities, notes)
- `.listo` save/load so you can continue editing later
- Auto-save to `chrome.storage.local` while the editor is open
- Structured PDF output tuned for immigration use

## Tech Stack

- TypeScript, React, Tailwind CSS
- Chrome Extension (Manifest V3)
- `@react-pdf/renderer` for PDF generation
- `@dnd-kit` for drag-and-drop

## Project Structure

```text
src/
├── types/
│   ├── wanderlog.ts        # Raw MobX store types (Wanderlog shape)
│   ├── trip.ts             # Normalized extraction types
│   ├── listo.ts            # ListoDocument (editor + .listo schema)
│   └── css.d.ts            # CSS module import shim
├── lib/
│   ├── extractor.ts        # Reads + validates MobX store -> TripData
│   ├── initEditorState.ts  # TripData -> ListoDocument hydration
│   └── formatters.ts       # Date/time formatting utilities
├── pdf/
│   ├── TripPDFDocument.tsx # React PDF template (ListoDocument)
│   ├── generator.tsx       # PDF generation + download trigger
│   ├── fonts.ts            # Font registration + script detection hook
│   └── scriptDetect.ts     # Script detection for lazy font loading
├── content/
│   ├── index.ts            # Content script (injects Open in Listo button)
│   └── readPageMobx.ts     # MobX bridge into page JS world
├── background/
│   └── index.ts            # Service worker (MobX + OPEN_EDITOR message)
├── popup/
│   └── index.tsx           # Extension popup UI
└── editor/                 # Full-page editor tab
    ├── index.tsx           # React root + bootstrap logic
    ├── EditorApp.tsx       # Top-level editor layout
    ├── Landing.tsx         # Empty-state / recovery view
    ├── storage.ts          # chrome.storage.local wrappers
    ├── styles.css          # Tailwind entry
    ├── hooks/
    │   ├── useEditorState.ts  # Reducer over ListoDocument
    │   ├── useAutoSave.ts     # Debounced autosave
    │   └── useListoFile.ts    # .listo save/load
    └── components/         # Toolbar, TripHeader, section + day UI
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
pnpm run dev        # Build in watch mode
pnpm run typecheck  # TypeScript checks only
pnpm run lint       # ESLint
```

## Usage

1. Open your trip at `https://wanderlog.com/plan/...`
2. Wait for the page content to finish loading
3. Click **Open in Listo** at the bottom-right of the page
4. Edit the trip in the newly opened editor tab
5. **Save .listo** to keep a reusable copy, or **Export PDF** for a printable itinerary

To resume editing, open the extension popup and click **Open Listo editor**, then load your `.listo` file.

## The `.listo` format

A `.listo` file is the serialized editor document as JSON. The root includes a numeric `version` field that the loader checks to reject incompatible files. The current version is `1`.

## Maintenance Notes

- The extension only auto-injects its button on `wanderlog.com/plan/*`
- If Wanderlog changes their internal store shape, update:
  - `src/types/wanderlog.ts`
  - `src/lib/extractor.ts`
- Editor state contracts live in `src/types/listo.ts`. Bumping the document schema means incrementing `ListoDocument.version` and teaching the loader to migrate older files.
