"use client";

import { useEffect, useRef, useState } from "react";
import { TextLayer } from "pdfjs-dist";
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
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    let cancelled = false;

    async function renderPage() {
      const canvas = canvasRef.current;
      const textLayerDiv = textLayerRef.current;
      if (!canvas || !textLayerDiv) return;

      // Cancel any previous render on this canvas
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }

      const page = await document.getPage(pageNumber);
      if (cancelled) return;

      const viewport = page.getViewport({ scale: zoom });
      setPageDimensions({ width: viewport.width, height: viewport.height });

      const dpr = window.devicePixelRatio || 1;
      canvas.width = viewport.width * dpr;
      canvas.height = viewport.height * dpr;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      const ctx = canvas.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const renderTask = page.render({
        canvasContext: ctx,
        viewport,
      });
      renderTaskRef.current = renderTask;

      try {
        await renderTask.promise;
      } catch (err: unknown) {
        if (err && typeof err === "object" && "name" in err && (err as { name: string }).name === "RenderingCancelledException") return;
        throw err;
      }

      if (cancelled) return;

      // Build text layer
      textLayerDiv.innerHTML = "";
      textLayerDiv.style.width = `${viewport.width}px`;
      textLayerDiv.style.height = `${viewport.height}px`;

      const textContent = await page.getTextContent();
      if (cancelled) return;

      const textLayer = new TextLayer({
        textContentSource: textContent,
        container: textLayerDiv,
        viewport,
      });
      await textLayer.render();
    }

    renderPage();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [document, pageNumber, zoom]);

  const handleCreateHighlight = (
    text: string,
    rects: { x: number; y: number; width: number; height: number }[]
  ) => {
    onCreateHighlight(pageNumber, text, rects);
  };

  return (
    <div
      className="relative inline-block shadow-lg bg-white mb-4"
      data-page-number={pageNumber}
    >
      <canvas ref={canvasRef} className="block" />

      {/* Text layer — must be ABOVE highlight layer for text selection */}
      <div
        ref={textLayerRef}
        className="absolute top-0 left-0 textLayer"
      />

      {/* Highlight layer — renders colored rects BELOW text layer */}
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
