"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import * as pdfjs from "pdfjs-dist";
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
  const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 });

  const renderPage = useCallback(async () => {
    const canvas = canvasRef.current;
    const textLayerDiv = textLayerRef.current;
    if (!canvas || !textLayerDiv) return;

    const page = await document.getPage(pageNumber);
    const viewport = page.getViewport({ scale: zoom });

    setPageDimensions({ width: viewport.width, height: viewport.height });

    const dpr = window.devicePixelRatio || 1;
    canvas.width = viewport.width * dpr;
    canvas.height = viewport.height * dpr;
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    await page.render({
      canvasContext: ctx,
      viewport,
    }).promise;

    textLayerDiv.innerHTML = "";
    textLayerDiv.style.width = `${viewport.width}px`;
    textLayerDiv.style.height = `${viewport.height}px`;

    const textContent = await page.getTextContent();
    pdfjs.renderTextLayer({
      textContentSource: textContent,
      container: textLayerDiv,
      viewport,
    });
  }, [document, pageNumber, zoom]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  const handleCreateHighlight = useCallback(
    (
      text: string,
      rects: { x: number; y: number; width: number; height: number }[]
    ) => {
      onCreateHighlight(pageNumber, text, rects);
    },
    [pageNumber, onCreateHighlight]
  );

  return (
    <div
      ref={containerRef}
      className="relative inline-block shadow-lg bg-white mb-4"
      data-page-number={pageNumber}
    >
      <canvas ref={canvasRef} className="block" />

      <div
        ref={textLayerRef}
        className="absolute top-0 left-0 textLayer"
      />

      <HighlightLayer
        highlights={highlights}
        pageNumber={pageNumber}
        highlightMode={highlightMode}
        containerWidth={pageDimensions.width}
        containerHeight={pageDimensions.height}
        onCreateHighlight={handleCreateHighlight}
      />

      {/* Page number label */}
      <div className="text-center text-xs text-gray-400 py-1">
        Page {pageNumber}
      </div>
    </div>
  );
}
