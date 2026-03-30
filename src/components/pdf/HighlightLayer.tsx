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

  const pageHighlights = highlights.filter((h) => h.page_number === pageNumber);

  const handleMouseUp = useCallback(() => {
    if (!highlightMode) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) return;

    const text = selection.toString().trim();
    if (text.length < 2) return;

    const layer = layerRef.current;
    if (!layer) return;

    const range = selection.getRangeAt(0);

    // Check if the selection is within this page's text layer
    const pageContainer = layer.parentElement;
    if (!pageContainer) return;

    const textLayerDiv = pageContainer.querySelector(".textLayer");
    if (!textLayerDiv) return;

    // Verify the selection starts or ends within this page's text layer
    const selectionAnchor = selection.anchorNode;
    if (!selectionAnchor || !textLayerDiv.contains(selectionAnchor)) return;

    const clientRects = range.getClientRects();
    if (clientRects.length === 0) return;

    const layerRect = layer.getBoundingClientRect();

    const rects: { x: number; y: number; width: number; height: number }[] = [];
    for (let i = 0; i < clientRects.length; i++) {
      const r = clientRects[i];
      if (r.width <= 0 || r.height <= 0) continue;

      // Calculate position as percentage of the page
      const x = ((r.left - layerRect.left) / layerRect.width) * 100;
      const y = ((r.top - layerRect.top) / layerRect.height) * 100;
      const w = (r.width / layerRect.width) * 100;
      const h = (r.height / layerRect.height) * 100;

      // Clamp to page bounds (0-100%)
      const clampedX = Math.max(0, x);
      const clampedY = Math.max(0, y);
      const clampedW = Math.min(w, 100 - clampedX);
      const clampedH = Math.min(h, 100 - clampedY);

      if (clampedW > 0 && clampedH > 0) {
        rects.push({ x: clampedX, y: clampedY, width: clampedW, height: clampedH });
      }
    }

    if (rects.length === 0) return;

    onCreateHighlight(text, rects);
    selection.removeAllRanges();
  }, [highlightMode, onCreateHighlight]);

  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseUp]);

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
            className="absolute rounded-[2px]"
            style={{
              left: `${rect.x}%`,
              top: `${rect.y}%`,
              width: `${rect.width}%`,
              height: `${rect.height}%`,
              backgroundColor: highlight.color || "#FFD700",
              opacity: 0.35,
              mixBlendMode: "multiply",
            }}
          />
        ))
      )}
    </div>
  );
}
