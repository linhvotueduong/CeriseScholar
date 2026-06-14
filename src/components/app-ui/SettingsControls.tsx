"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

export function ToggleSwitch({
  defaultOn = false,
  label,
}: {
  defaultOn?: boolean;
  label?: string;
}) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      aria-label={label || "Toggle setting"}
      aria-pressed={on}
      className={cn("flex h-5 w-9 items-center rounded-full p-0.5 transition", on ? "bg-[#111111]" : "bg-[#e6e2de]")}
      onClick={() => setOn((current) => !current)}
      type="button"
    >
      <span className={cn("h-4 w-4 rounded-full bg-white transition", on ? "translate-x-4" : "translate-x-0")} />
    </button>
  );
}

export function SettingsRow({
  action,
  body,
  className,
  label,
}: {
  action?: ReactNode;
  body?: string;
  className?: string;
  label: string;
}) {
  return (
    <div className={cn("grid min-h-[30px] gap-2 border-t border-[#eeeae5] py-1 first:border-t-0 sm:grid-cols-[1fr_auto] sm:items-center", className)}>
      <div>
        <p className="text-[11px] font-bold text-[#111111]">{label}</p>
        {body ? <p className="text-[9px] font-semibold leading-3 text-[#625a52]">{body}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
