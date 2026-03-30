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

    const range = selection.getRangeAt(0);
    const clientRects = range.getClientRects();
    const layer = layerRef.current;

    if (!layer || clientRects.length === 0) return;

    const layerRect = layer.getBoundingClientRect();

    // Check if the selection is within this page's bounds
    const firstRect = clientRects[0];
    if (
      firstRect.top < layerRect.top - 10 ||
      firstRect.top > layerRect.bottom + 10
    ) {
      return; // Selection is on a different page
    }

    const rects: { x: number; y: number; width: number; height: number }[] = [];
    for (let i = 0; i < clientRects.length; i++) {
      const r = clientRects[i];
      // Only include rects that are within this page
      if (r.width > 0 && r.height > 0) {
        rects.push({
          x: ((r.left - layerRect.left) / layerRect.width) * 100,
          y: ((r.top - layerRect.top) / layerRect.height) * 100,
          width: (r.width / layerRect.width) * 100,
          height: (r.height / layerRect.height) * 100,
        });
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
      className="absolute top-0 left-0 pointer-events-none"
      style={{ width: containerWidth, height: containerHeight, zIndex: 1 }}
    >
      {pageHighlights.map((highlight) =>
        highlight.rects.map((rect, i) => (
          <div
            key={`${highlight.id}-${i}`}
            className="absolute rounded-sm"
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
