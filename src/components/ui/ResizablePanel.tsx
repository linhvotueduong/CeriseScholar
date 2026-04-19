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
  const [dragging, setDragging] = useState(false);
  const isResizing = useRef(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isResizing.current = true;
      setDragging(true);
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
        setDragging(false);
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [width, side, minWidth, maxWidth]
  );

  if (!open) {
    return (
      <div
        className={`w-8 bg-white flex flex-col items-center pt-2 cursor-pointer hover:bg-[#fdfcfa] ${
          side === "left" ? "border-r" : "border-l"
        } border-[#e0d8d0]`}
        onClick={() => setOpen(true)}
        title={`Show ${title}`}
      >
        <span
          className="text-[#9a8a7a] text-xs"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          {title}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative ${side === "left" ? "border-r" : "border-l"} border-[#e0d8d0] bg-white`}
      style={{ width, minWidth, maxWidth, flexShrink: 0 }}
    >
      {/* Content */}
      <div className="flex flex-col h-full min-w-0 overflow-hidden">
        {children}
      </div>

      {/* Resize handle — thick grab area on the edge */}
      <div
        onMouseDown={handleMouseDown}
        className={`absolute top-0 bottom-0 z-50 cursor-col-resize ${
          side === "left" ? "-right-[6px]" : "-left-[6px]"
        }`}
        style={{ width: 12 }}
      >
        {/* Visible line */}
        <div
          className={`absolute top-0 bottom-0 transition-all ${
            dragging
              ? "w-1 bg-[#1a1208]"
              : "w-[2px] bg-transparent hover:bg-[#1a1208]"
          }`}
          style={{ left: "50%", transform: "translateX(-50%)" }}
        />
        {/* Drag dots indicator in the middle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-[2px] opacity-0 hover:opacity-100 transition-opacity">
          <div className="w-1 h-1 rounded-full bg-gray-400" />
          <div className="w-1 h-1 rounded-full bg-gray-400" />
          <div className="w-1 h-1 rounded-full bg-gray-400" />
        </div>
      </div>

      {/* Collapse button */}
      <button
        onClick={() => setOpen(false)}
        className={`absolute top-2 text-[#9a8a7a] hover:text-[#7a6a5a] text-xs z-10 ${
          side === "left" ? "right-2" : "left-2"
        }`}
        title={`Hide ${title}`}
      >
        {side === "left" ? "\u2039" : "\u203A"}
      </button>
    </div>
  );
}
