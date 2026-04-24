import React, { useEffect, useRef, useState } from "react";

/**
 * Visual page-break indicators overlaid on the paper canvas.
 *
 * Measures the actual rendered height of the paper (via ResizeObserver)
 * and inserts dashed horizontal markers every `pageContentHeightPx`. The
 * markers are **approximate** — @react-pdf/renderer's layout engine
 * doesn't use the browser's line-height algorithm, so the real PDF page
 * break may fall a few lines above or below what we show here. A small
 * "~" badge on each marker communicates this honestly.
 *
 * The overlay is absolutely positioned inside `.listo-paper`, sits above
 * the content with `pointer-events: none`, and spans the paper's full
 * width (including padding).
 */

interface PageBreakOverlayProps {
  /** Ref to the `.listo-paper` element we're overlaying. */
  paperRef: React.RefObject<HTMLDivElement | null>;
  /** Height (in CSS px) of a single page's content area — from tokens. */
  pageContentHeightPx: number;
  /** Top padding of the paper (in CSS px) — first break sits after this. */
  paddingTopPx: number;
}

export function PageBreakOverlay({
  paperRef,
  pageContentHeightPx,
  paddingTopPx,
}: PageBreakOverlayProps): React.ReactElement | null {
  const [paperHeight, setPaperHeight] = useState<number>(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const el = paperRef.current;
    if (el === null) return;

    const update = (): void => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = window.requestAnimationFrame(() => {
        setPaperHeight(el.getBoundingClientRect().height);
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);

    return () => {
      observer.disconnect();
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    };
  }, [paperRef]);

  const breaks: number[] = [];
  let y = paddingTopPx + pageContentHeightPx;
  let guard = 0;
  while (y < paperHeight && guard < 50) {
    breaks.push(y);
    y += pageContentHeightPx;
    guard += 1;
  }

  if (breaks.length === 0) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
      }}
    >
      {breaks.map((offset, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: offset,
            height: 0,
            borderTop: "1px dashed rgba(26, 26, 26, 0.35)",
          }}
        >
          <div
            style={{
              position: "absolute",
              right: 8,
              top: -9,
              fontSize: "9px",
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              letterSpacing: "0.8px",
              textTransform: "uppercase",
              color: "rgba(26, 26, 26, 0.55)",
              backgroundColor: "rgba(255, 255, 255, 0.85)",
              padding: "1px 6px",
              borderRadius: 2,
            }}
          >
            ~ Page {i + 2}
          </div>
        </div>
      ))}
    </div>
  );
}
