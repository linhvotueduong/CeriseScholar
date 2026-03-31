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

/**
 * Global selection manager — mirrors the official PDF.js TextLayerBuilder.
 * Tracks all text layers on the page and repositions their endOfContent
 * divs during selection to constrain the browser's selection algorithm.
 */
const textLayers = new Map<HTMLDivElement, HTMLDivElement>();
let selectionListenerActive = false;
let isPointerDown = false;
let prevRange: Range | null = null;

function resetEndOfContent(endDiv: HTMLDivElement, textLayer: HTMLDivElement) {
  textLayer.append(endDiv);
  endDiv.style.width = "";
  endDiv.style.height = "";
  textLayer.classList.remove("selecting");
}

function enableGlobalSelectionListener() {
  if (selectionListenerActive) return;
  selectionListenerActive = true;

  const controller = new AbortController();
  const { signal } = controller;

  document.addEventListener("pointerdown", () => { isPointerDown = true; }, { signal });

  document.addEventListener("pointerup", () => {
    isPointerDown = false;
    textLayers.forEach(resetEndOfContent);
  }, { signal });

  window.addEventListener("blur", () => {
    isPointerDown = false;
    textLayers.forEach(resetEndOfContent);
  }, { signal });

  document.addEventListener("selectionchange", () => {
    const selection = document.getSelection();
    if (!selection || selection.rangeCount === 0) {
      textLayers.forEach(resetEndOfContent);
      return;
    }

    // Find which text layers are actively being selected
    const activeTextLayers = new Set<HTMLDivElement>();
    for (let i = 0; i < selection.rangeCount; i++) {
      const range = selection.getRangeAt(i);
      for (const textLayerDiv of textLayers.keys()) {
        if (!activeTextLayers.has(textLayerDiv) && range.intersectsNode(textLayerDiv)) {
          activeTextLayers.add(textLayerDiv);
        }
      }
    }

    // Toggle selecting class
    for (const [textLayerDiv, endDiv] of textLayers) {
      if (activeTextLayers.has(textLayerDiv)) {
        textLayerDiv.classList.add("selecting");
      } else {
        resetEndOfContent(endDiv, textLayerDiv);
      }
    }

    // The key fix: reposition the endOfContent div based on selection direction
    const range = selection.getRangeAt(0);

    // Detect if user is extending from the start or end of the selection
    const modifyStart = prevRange && (
      range.compareBoundaryPoints(Range.END_TO_END, prevRange) === 0 ||
      range.compareBoundaryPoints(Range.START_TO_END, prevRange) === 0
    );

    // Find the anchor element (the end the user is dragging)
    let anchor: Node = modifyStart ? range.startContainer : range.endContainer;
    if (anchor.nodeType === Node.TEXT_NODE) {
      anchor = anchor.parentNode!;
    }

    const parentTextLayer = (anchor as HTMLElement).parentElement?.closest(".textLayer") as HTMLDivElement | null;
    const endDiv = parentTextLayer ? textLayers.get(parentTextLayer) : undefined;

    if (endDiv && parentTextLayer) {
      // Size the fence to cover the text layer
      endDiv.style.width = parentTextLayer.style.width;
      endDiv.style.height = parentTextLayer.style.height;
      // Insert it right after (or before) the anchor to constrain selection
      (anchor as HTMLElement).parentElement!.insertBefore(
        endDiv,
        modifyStart ? anchor : (anchor as HTMLElement).nextSibling
      );
    }

    prevRange = range.cloneRange();
  }, { signal });
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
  const cleanupRef = useRef<(() => void) | null>(null);
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

      // Clean up previous text layer registration
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }

      const page = await document.getPage(pageNumber);
      if (cancelled) return;

      const viewport = page.getViewport({ scale: zoom });
      setPageDimensions({ width: viewport.width, height: viewport.height });

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
        if (err && typeof err === "object" && "name" in err && (err as { name: string }).name === "RenderingCancelledException") return;
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

      if (cancelled) return;

      // Add endOfContent selection fence
      const endOfContent = window.document.createElement("div");
      endOfContent.className = "endOfContent";
      textLayerDiv.append(endOfContent);

      // Register with the global selection manager
      textLayers.set(textLayerDiv, endOfContent);
      enableGlobalSelectionListener();

      cleanupRef.current = () => {
        textLayers.delete(textLayerDiv);
      };
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
