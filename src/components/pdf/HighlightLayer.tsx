"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Highlight } from "@/types/annotation";

interface HighlightLayerProps {
  highlights: Highlight[];
  pageNumber: number;
  highlightMode: boolean;
  containerWidth: number;
  containerHeight: number;
  onCreateHighlight: (
    text: string,
    rects: { x: number; y: number; width: number; height: number }[]
  ) => void;
}

export default function HighlightLayer({
  highlights,
  pageNumber,
  highlightMode,
  containerWidth,
  containerHeight,
  onCreateHighlight,
}: HighlightLayerProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const pointerStartedInTextLayerRef = useRef(false);

  const pageHighlights = highlights.filter((h) => h.page_number === pageNumber);

  const getPageSelectionContext = useCallback(() => {
    const layer = layerRef.current;
    if (!layer) return null;

    const pageContainer = layer.closest("[data-page-number]");
    if (!pageContainer) return null;

    const canvas = pageContainer.querySelector("canvas");
    const textLayerDiv = pageContainer.querySelector(".textLayer");
    if (!canvas || !textLayerDiv) return null;

    return { canvas, pageContainer, textLayerDiv };
  }, []);

  const handlePointerDown = useCallback((event: PointerEvent) => {
    pointerStartedInTextLayerRef.current = false;
    if (!highlightMode || event.button !== 0) return;

    const context = getPageSelectionContext();
    const target = event.target;
    if (!context || !(target instanceof Node)) return;

    window.getSelection()?.removeAllRanges();
    pointerStartedInTextLayerRef.current = context.textLayerDiv.contains(target);
  }, [getPageSelectionContext, highlightMode]);

  const handleMouseUp = useCallback((event: MouseEvent) => {
    const pointerStartedInTextLayer = pointerStartedInTextLayerRef.current;
    pointerStartedInTextLayerRef.current = false;

    if (!highlightMode) return;
    if (!pointerStartedInTextLayer) return;

    const context = getPageSelectionContext();
    const target = event.target;
    if (!context || !(target instanceof Node)) return;
    if (!context.textLayerDiv.contains(target)) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) return;

    // Clean up the text: PDF.js puts each line in a separate span,
    // so selection adds newlines between them. Replace with spaces.
    const text = selection.toString().replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
    if (text.length < 2) return;

    // Both anchor and focus must be in this page's text layer
    const selectionAnchor = selection.anchorNode;
    const selectionFocus = selection.focusNode;
    if (!selectionAnchor || !context.textLayerDiv.contains(selectionAnchor)) return;
    if (!selectionFocus || !context.textLayerDiv.contains(selectionFocus)) return;

    const range = selection.getRangeAt(0);
    const clientRects = range.getClientRects();
    if (clientRects.length === 0) return;

    // Measure relative to the canvas — most reliable reference
    const canvasRect = context.canvas.getBoundingClientRect();

    const rects: { x: number; y: number; width: number; height: number }[] = [];
    for (let i = 0; i < clientRects.length; i++) {
      const r = clientRects[i];
      if (r.width <= 0 || r.height <= 0) continue;

      // Skip rects that are wider than 95% of canvas — likely over-selection artifacts
      if (r.width > canvasRect.width * 0.95 && clientRects.length > 1) continue;

      // Position as percentage of canvas dimensions
      let x = ((r.left - canvasRect.left) / canvasRect.width) * 100;
      let y = ((r.top - canvasRect.top) / canvasRect.height) * 100;
      let w = (r.width / canvasRect.width) * 100;
      let h = (r.height / canvasRect.height) * 100;

      // Clamp to page bounds
      x = Math.max(0, x);
      y = Math.max(0, y);
      w = Math.min(w, 100 - x);
      h = Math.min(h, 100 - y);

      if (w > 0.5 && h > 0.5) {
        rects.push({ x, y, width: w, height: h });
      }
    }

    // Deduplicate rects that overlap significantly (same line, overlapping x ranges)
    const merged: typeof rects = [];
    for (const rect of rects) {
      const existing = merged.find(
        (m) => Math.abs(m.y - rect.y) < 1 && m.x < rect.x + rect.width && rect.x < m.x + m.width
      );
      if (existing) {
        const minX = Math.min(existing.x, rect.x);
        const maxX = Math.max(existing.x + existing.width, rect.x + rect.width);
        existing.x = minX;
        existing.width = maxX - minX;
        existing.height = Math.max(existing.height, rect.height);
      } else {
        merged.push({ ...rect });
      }
    }

    if (merged.length === 0) return;

    onCreateHighlight(text, merged);
    selection.removeAllRanges();
  }, [getPageSelectionContext, highlightMode, onCreateHighlight]);

  useEffect(() => {
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseUp, handlePointerDown]);

  return (
    <div
      ref={layerRef}
      className="absolute top-0 left-0 pointer-events-none overflow-hidden"
      style={{ width: containerWidth, height: containerHeight, zIndex: 1 }}
    >
      {pageHighlights.map((highlight) =>
        highlight.rects.map((rect, i) => (
          <div
            key={`${highlight.id}-${i}`}
            className="absolute"
            style={{
              left: `${rect.x}%`,
              top: `${rect.y}%`,
              width: `${rect.width}%`,
              height: `${rect.height}%`,
              backgroundColor: highlight.color || "#FFD700",
              opacity: 0.35,
              mixBlendMode: "multiply",
              borderRadius: "2px",
            }}
          />
        ))
      )}
    </div>
  );
}
