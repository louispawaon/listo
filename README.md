# Listo

Listo is a Chrome extension that exports your Wanderlog trip plan as a clean, immigration-ready PDF covering flights, hotels, and places to visit.

## Overview

On `wanderlog.com/plan/*` pages, the extension reads trip data from Wanderlog's in-page MobX state (`window.__MOBX_STATE__.tripPlanStore`) and generates the PDF locally in your browser.

No trip data is sent to any external server.

## Features

- One-click export from a Wanderlog plan page
- Structured PDF output for travel and immigration documents
- Local-only processing for privacy

## Tech Stack

- TypeScript
- React
- Chrome Extension (Manifest V3)
- React PDF rendering

## Project Structure

```text
src/
├── types/
│   ├── wanderlog.ts        # Raw MobX store types (Wanderlog shape)
│   └── trip.ts             # Normalized app-level trip types
├── lib/
│   ├── extractor.ts        # Reads + validates MobX store -> TripData
│   └── formatters.ts       # Date/time formatting utilities
├── pdf/
│   ├── TripPDFDocument.tsx # React PDF document template
│   └── generator.tsx       # PDF generation + download trigger
├── content/
│   └── index.ts            # Content script (injects Export button)
└── popup/
    └── index.tsx           # Extension popup UI
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
3. Click **⬇ Export PDF** in the bottom-right corner
4. The PDF downloads automatically

## Maintenance Notes

- The extension only runs on `wanderlog.com/plan/*`
- If Wanderlog changes their internal store shape, update:
  - `src/types/wanderlog.ts`
  - `src/lib/extractor.ts`
