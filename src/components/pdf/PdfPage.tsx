"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import * as pdfjs from "pdfjs-dist";
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
  const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 });

  const renderPage = useCallback(async () => {
    const canvas = canvasRef.current;
    const textLayerDiv = textLayerRef.current;
    if (!canvas || !textLayerDiv) return;

    const page = await document.getPage(pageNumber);
    const viewport = page.getViewport({ scale: zoom });

    setPageDimensions({ width: viewport.width, height: viewport.height });

    // Set canvas dimensions
    const dpr = window.devicePixelRatio || 1;
    canvas.width = viewport.width * dpr;
    canvas.height = viewport.height * dpr;
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    // Render the PDF page onto the canvas
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (page as any).render({
      canvasContext: ctx,
      viewport,
    }).promise;

    // Clear old text layer content
    textLayerDiv.innerHTML = "";
    textLayerDiv.style.width = `${viewport.width}px`;
    textLayerDiv.style.height = `${viewport.height}px`;

    // Build the text layer (invisible but selectable text over the canvas)
    const textContent = await page.getTextContent();
    const textLayer = new TextLayer({
      textContentSource: textContent,
      container: textLayerDiv,
      viewport,
    });
    await textLayer.render();
  }, [document, pageNumber, zoom]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  return (
    <div ref={containerRef} className="relative inline-block shadow-lg bg-white">
      {/* Layer 1: Canvas — the visual PDF rendering */}
      <canvas ref={canvasRef} className="block" />

      {/* Layer 2: Text layer — invisible selectable text positioned over the canvas */}
      <div
        ref={textLayerRef}
        className="absolute top-0 left-0 textLayer"
      />

      {/* Layer 3: Highlight layer — colored highlight rectangles */}
      <HighlightLayer
        highlights={highlights}
        pageNumber={pageNumber}
        highlightMode={highlightMode}
        containerWidth={pageDimensions.width}
        containerHeight={pageDimensions.height}
        onCreateHighlight={onCreateHighlight}
      />
    </div>
  );
}
