"use client";

import { useEffect, useRef, useState } from "react";
import { TextLayer, setLayerDimensions } from "pdfjs-dist";
import type { PDFDocumentProxy } from "@/lib/pdf/loadPdf";
import HighlightLayer from "./HighlightLayer";
import type { Highlight } from "@/types/annotation";

interface PdfPageProps {
  document: PDFDocumentProxy;
  pageNumber: number;
  zoom: number;
  highlights: Highlight[];
  highlightMode: boolean;
  onCreateHighlight: (
    pageNumber: number,
    text: string,
    rects: { x: number; y: number; width: number; height: number }[]
  ) => void;
}

export default function PdfPage({
  document,
  pageNumber,
  zoom,
  highlights,
  highlightMode,
  onCreateHighlight,
}: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    let cancelled = false;

    async function renderPage() {
      const canvas = canvasRef.current;
      const textLayerDiv = textLayerRef.current;
      const container = containerRef.current;
      if (!canvas || !textLayerDiv || !container) return;

      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }

      const page = await document.getPage(pageNumber);
      if (cancelled) return;

      const viewport = page.getViewport({ scale: zoom });
      setPageDimensions({ width: viewport.width, height: viewport.height });

      // Set --scale-factor on the container — PDF.js uses this for text positioning
      container.style.setProperty("--scale-factor", String(viewport.scale));

      const dpr = window.devicePixelRatio || 1;
      canvas.width = viewport.width * dpr;
      canvas.height = viewport.height * dpr;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      const ctx = canvas.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const renderTask = page.render({ canvasContext: ctx, viewport });
      renderTaskRef.current = renderTask;

      try {
        await renderTask.promise;
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "name" in err &&
          (err as { name: string }).name === "RenderingCancelledException"
        )
          return;
        throw err;
      }

      if (cancelled) return;

      // Build text layer
      textLayerDiv.innerHTML = "";
      setLayerDimensions(textLayerDiv, viewport);

      const textContent = await page.getTextContent();
      if (cancelled) return;

      const textLayer = new TextLayer({
        textContentSource: textContent,
        container: textLayerDiv,
        viewport,
      });
      await textLayer.render();

      // Add the "endOfContent" selection fence div — this is how PDF.js
      // prevents the browser from selecting entire paragraphs at once
      const endOfContent = window.document.createElement("div");
      endOfContent.className = "endOfContent";
      textLayerDiv.append(endOfContent);

      // Selection management: toggle "selecting" class during mouse selection
      function onMouseDown() {
        textLayerDiv.classList.add("selecting");
      }

      function onMouseUp() {
        textLayerDiv.classList.remove("selecting");
        endOfContent.style.top = "";
      }

      textLayerDiv.addEventListener("mousedown", onMouseDown);
      document.addEventListener("mouseup", onMouseUp);

      // Clean up listeners on next render
      const cleanup = () => {
        textLayerDiv.removeEventListener("mousedown", onMouseDown);
        document.removeEventListener("mouseup", onMouseUp);
      };

      // Store cleanup for the effect's return
      if (!cancelled) {
        cleanupRef.current = cleanup;
      }
    }

    renderPage();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [document, pageNumber, zoom]);

  const cleanupRef = useRef<(() => void) | null>(null);

  const handleCreateHighlight = (
    text: string,
    rects: { x: number; y: number; width: number; height: number }[]
  ) => {
    onCreateHighlight(pageNumber, text, rects);
  };

  return (
    <div
      ref={containerRef}
      className="relative inline-block shadow-lg bg-white mb-4"
      data-page-number={pageNumber}
    >
      <canvas ref={canvasRef} className="block" />

      <div ref={textLayerRef} className="textLayer" />

      <HighlightLayer
        highlights={highlights}
        pageNumber={pageNumber}
        highlightMode={highlightMode}
        containerWidth={pageDimensions.width}
        containerHeight={pageDimensions.height}
        onCreateHighlight={handleCreateHighlight}
      />

      <div className="text-center text-xs text-gray-400 py-1">
        Page {pageNumber}
      </div>
    </div>
  );
}
