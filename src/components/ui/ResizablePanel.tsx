"use client";

import { useState, useRef, useCallback } from "react";

interface ResizablePanelProps {
  children: React.ReactNode;
  title: string;
  defaultWidth: number;
  minWidth?: number;
  maxWidth?: number;
  side: "left" | "right";
  defaultOpen?: boolean;
}

export default function ResizablePanel({
  children,
  title,
  defaultWidth,
  minWidth = 150,
  maxWidth = 500,
  side,
  defaultOpen = true,
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [open, setOpen] = useState(defaultOpen);
  const isResizing = useRef(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isResizing.current = true;
      const startX = e.clientX;
      const startWidth = width;

      function onMouseMove(e: MouseEvent) {
        if (!isResizing.current) return;
        const delta = side === "left" ? e.clientX - startX : startX - e.clientX;
        const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth + delta));
        setWidth(newWidth);
      }

      function onMouseUp() {
        isResizing.current = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      }

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [width, side, minWidth, maxWidth]
  );

  if (!open) {
    return (
      <div
        className={`w-8 bg-white flex flex-col items-center pt-2 cursor-pointer hover:bg-gray-50 ${
          side === "left" ? "border-r" : "border-l"
        } border-gray-200`}
        onClick={() => setOpen(true)}
        title={`Show ${title}`}
      >
        <span
          className="text-gray-400 text-xs"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          {title}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative flex ${side === "left" ? "border-r" : "border-l"} border-gray-200 bg-white`}
      style={{ width, minWidth, maxWidth, flexShrink: 0 }}
    >
      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </div>

      {/* Resize handle — wider hit area with visible indicator */}
      <div
        onMouseDown={handleMouseDown}
        className={`absolute top-0 bottom-0 w-2 cursor-col-resize z-10 group ${
          side === "left" ? "-right-1" : "-left-1"
        }`}
      >
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 bg-gray-200 group-hover:bg-[#DE3163] group-active:bg-[#DE3163] transition-colors" />
      </div>

      {/* Collapse button */}
      <button
        onClick={() => setOpen(false)}
        className={`absolute top-2 text-gray-400 hover:text-gray-600 text-xs z-10 ${
          side === "left" ? "right-2" : "left-2"
        }`}
        title={`Hide ${title}`}
      >
        {side === "left" ? "\u2039" : "\u203A"}
      </button>
    </div>
  );
}
