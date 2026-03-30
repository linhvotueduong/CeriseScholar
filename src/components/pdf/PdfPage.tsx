"use client";

import { useEffect, useRef, useCallback } from "react";
import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy } from "@/lib/pdf/loadPdf";

interface PdfPageProps {
  document: PDFDocumentProxy;
  pageNumber: number;
  zoom: number;
}

export default function PdfPage({ document, pageNumber, zoom }: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const renderPage = useCallback(async () => {
    const canvas = canvasRef.current;
    const textLayerDiv = textLayerRef.current;
    if (!canvas || !textLayerDiv) return;

    const page = await document.getPage(pageNumber);
    const viewport = page.getViewport({ scale: zoom });

    // Set canvas dimensions
    const dpr = window.devicePixelRatio || 1;
    canvas.width = viewport.width * dpr;
    canvas.height = viewport.height * dpr;
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    // Render the PDF page onto the canvas
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    await page.render({
      canvasContext: ctx,
      viewport,
    }).promise;

    // Clear old text layer content
    textLayerDiv.innerHTML = "";
    textLayerDiv.style.width = `${viewport.width}px`;
    textLayerDiv.style.height = `${viewport.height}px`;

    // Build the text layer (invisible but selectable text over the canvas)
    const textContent = await page.getTextContent();
    await pdfjs.renderTextLayer({
      textContentSource: textContent,
      container: textLayerDiv,
      viewport,
    }).promise;
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
    </div>
  );
}
