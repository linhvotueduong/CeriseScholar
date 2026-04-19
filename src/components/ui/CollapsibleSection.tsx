"use client";

import { useState } from "react";

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  actions?: React.ReactNode;
}

export default function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
  actions,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-[#e0d8d0]">
      <div
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-[#fdfcfa] transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[#9a8a7a]">
            {open ? "▼" : "▶"}
          </span>
          <span className="text-xs font-semibold text-[#7a6a5a] uppercase tracking-wider">
            {title}
          </span>
        </div>
        {actions && (
          <div onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        )}
      </div>
      {open && <div>{children}</div>}
    </div>
  );
}
