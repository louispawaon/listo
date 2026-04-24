import React, { useRef } from "react";
import { PageBreakOverlay } from "./PageBreakOverlay";
import { PAGE, ptToPx } from "../../design/tokens";

/**
 * A4-sized paper shell for the WYSIWYG editor.
 *
 * Dimensions are driven by CSS variables in `src/editor/styles.css`, which
 * come from `src/design/tokens.ts::PAGE`. The inner content area matches
 * the exact margins the PDF uses (52pt top/bottom, 56pt left/right), so
 * what fits on one "paper" page in the editor aligns with what fits on one
 * PDF page (±5% due to font-engine differences).
 *
 * Zoom is applied with the non-standard `zoom` CSS property rather than
 * `transform: scale`. `zoom` reflows layout so scrollbars and the outer
 * gutter get the correct dimensions automatically.
 */

interface PaperCanvasProps {
  zoom: number;
  children: React.ReactNode;
}

const PAGE_CONTENT_HEIGHT_PX = ptToPx(PAGE.heightPt - PAGE.paddingTop - PAGE.paddingBottom);
const PAGE_PADDING_TOP_PX = ptToPx(PAGE.paddingTop);

export function PaperCanvas({ zoom, children }: PaperCanvasProps): React.ReactElement {
  const paperRef = useRef<HTMLDivElement | null>(null);

  return (
    <div
      className="flex min-h-full w-full justify-center py-10"
      style={{ backgroundColor: "var(--canvas-bg)" }}
    >
      <div
        // Non-standard `zoom` property is preferred over `transform: scale`
        // because it reflows layout — the gutter reserves the right amount
        // of space automatically. Supported in all Chromium-based browsers
        // (including this extension's host).
        style={{ zoom }}
      >
        <div ref={paperRef} className="listo-paper">
          {children}
          <PageBreakOverlay
            paperRef={paperRef}
            pageContentHeightPx={PAGE_CONTENT_HEIGHT_PX}
            paddingTopPx={PAGE_PADDING_TOP_PX}
          />
        </div>
      </div>
    </div>
  );
}
