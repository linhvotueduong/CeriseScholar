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
  onSpeakFromHere?: (text: string) => void;
  isSpeaking?: boolean;
  onStopSpeaking?: () => void;
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
  onSpeakFromHere,
  isSpeaking,
  onStopSpeaking,
}: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 });
  const [playBtnPos, setPlayBtnPos] = useState<{ top: number; left: number } | null>(null);
  const playTextRef = useRef<string>("");

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

  // Show play button on paragraph hover (only when not in highlight mode)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showPlayBtn = (span: HTMLElement) => {
    if (!containerRef.current) return;
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }

    const containerRect = containerRef.current.getBoundingClientRect();
    const spanRect = span.getBoundingClientRect();

    setPlayBtnPos({
      top: spanRect.top - containerRect.top,
      left: spanRect.left - containerRect.left,
    });

    // Collect text from this span and all following siblings on this page
    let text = "";
    let el: Element | null = span;
    while (el) {
      if (el.textContent) text += el.textContent + " ";
      el = el.nextElementSibling;
    }
    playTextRef.current = text.trim();
  };

  const handleTextLayerMouseMove = (e: React.MouseEvent) => {
    if (highlightMode || !onSpeakFromHere || !textLayerRef.current || !containerRef.current) {
      return;
    }
    const target = e.target as HTMLElement;
    // Check if hovering the play button itself — keep it visible
    if (target.closest("[data-playbtn]")) return;

    const span = target.closest(".textLayer > span") as HTMLElement | null;
    if (span) {
      showPlayBtn(span);
    }
  };

  const handleMouseLeave = () => {
    // Delay hiding so user can move to the button
    hideTimer.current = setTimeout(() => setPlayBtnPos(null), 500);
  };

  return (
    <div
      ref={containerRef}
      className="relative inline-block shadow-lg bg-white mb-4"
      data-page-number={pageNumber}
      onMouseMove={handleTextLayerMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <canvas ref={canvasRef} className="block" />
      <div ref={textLayerRef} className="textLayer" />

      {/* Play/Stop button — tiny, spaced from text like Speechify */}
      {playBtnPos && !highlightMode && onSpeakFromHere && (
        <button
          data-playbtn="true"
          onMouseEnter={() => { if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; } }}
          onMouseLeave={handleMouseLeave}
          onClick={(e) => {
            e.stopPropagation();
            if (isSpeaking && onStopSpeaking) {
              onStopSpeaking();
            } else if (playTextRef.current) {
              onSpeakFromHere(playTextRef.current);
            }
          }}
          className="absolute z-20 flex items-center justify-center rounded-full hover:opacity-80 transition-opacity cursor-pointer shadow-sm"
          style={{ top: playBtnPos.top - 2, left: 10, width: 20, height: 20, backgroundColor: isSpeaking ? "#EF4444" : "#7B8EC2" }}
        >
          {isSpeaking ? (
            <svg width="9" height="9" viewBox="0 0 10 10" fill="white">
              <rect x="1" y="1" width="8" height="8" rx="1" />
            </svg>
          ) : (
            <svg width="9" height="10" viewBox="0 0 10 12" fill="white">
              <path d="M1 0.5v11l9-5.5z" />
            </svg>
          )}
        </button>
      )}

      <HighlightLayer
        highlights={highlights}
        pageNumber={pageNumber}
        highlightMode={highlightMode}
        containerWidth={pageDimensions.width}
        containerHeight={pageDimensions.height}
        onCreateHighlight={handleCreateHighlight}
      />
      <div className="text-center text-xs text-[#9a8a7a] py-1">
        Page {pageNumber}
      </div>
    </div>
  );
}
