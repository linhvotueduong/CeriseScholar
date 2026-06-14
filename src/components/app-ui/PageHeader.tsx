import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export default function PageHeader({
  actions,
  className,
  eyebrow,
  title,
  subtitle,
}: {
  actions?: ReactNode;
  className?: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <header className={cn("mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div>
        {eyebrow ? (
          <p className="text-xs font-bold uppercase tracking-normal text-[#9b784c]">{eyebrow}</p>
        ) : null}
        <h1 className="mt-1 text-[26px] font-bold leading-tight tracking-normal text-[#111111] sm:text-[30px]">
          {title}
        </h1>
        {subtitle ? <p className="mt-1.5 max-w-[820px] text-[13px] leading-5 text-[#625a52]">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  );
}
