# Listo

A Chrome extension that exports your Wanderlog trip plan as a clean, immigration-ready PDF — covering flights, hotels, and places to visit.

## How it works

When you're on a Wanderlog plan page, the extension reads your trip data directly from the page's MobX state (`window.__MOBX_STATE__.tripPlanStore`) and generates a formatted PDF document locally in your browser. No data is sent to any server.

## Project structure

```
src/
├── types/
│   ├── wanderlog.ts     # Raw MobX store types (mirrors Wanderlog's shape)
│   └── trip.ts          # Clean normalized types for our app layer
├── lib/
│   ├── extractor.ts     # Reads + validates the MobX store → TripData
│   └── formatters.ts    # Date/time formatting utilities
├── pdf/
│   ├── TripPDFDocument.tsx  # React PDF document template
│   └── generator.ts         # Triggers PDF generation + download
├── content/
│   └── index.ts         # Content script — injects the Export button
└── popup/
    └── index.tsx         # Extension toolbar popup UI
```

## Setup

```bash
npm install
npm run build
```

Then in Chrome:
1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `dist/` folder

## Development

```bash
npm run dev       # watch mode
npm run typecheck # type checking only
npm run lint      # ESLint
```

## Usage

1. Go to your Wanderlog trip at `wanderlog.com/plan/...`
2. Wait for the page to fully load
3. Click the **⬇ Export PDF** button at the bottom-right corner
4. PDF downloads automatically

## Notes

- The extension only activates on `wanderlog.com/plan/*` pages
- No permissions beyond reading the current tab's page content are required
- If Wanderlog updates their internal store structure, `src/types/wanderlog.ts` and `src/lib/extractor.ts` are the only files that need updating
