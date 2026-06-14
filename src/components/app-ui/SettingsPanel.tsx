import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export default function SettingsPanel({
  children,
  className,
  description,
  title,
  danger = false,
  hideHeading = false,
}: {
  children: ReactNode;
  className?: string;
  description?: string;
  title: string;
  danger?: boolean;
  hideHeading?: boolean;
}) {
  return (
    <section
      className={cn("settingsPanel box-border h-[760px] min-h-[760px] max-h-[760px] overflow-visible rounded-[12px] border border-[#e5e1dc] bg-white px-5 pb-8 pt-5 shadow-[0_1px_0_rgba(17,17,17,0.02)]", className)}
      data-settings-panel={title}
    >
      {hideHeading ? (
        <h2 className="sr-only">{title}</h2>
      ) : (
        <>
          <h2 className="text-[20px] font-bold tracking-normal text-[#17120d]">{title}</h2>
          {description ? (
            <p className={cn("mt-1 text-[12px] font-semibold leading-4", danger ? "text-[#d92d20]" : "text-[#6f6760]")}>
              {description}
            </p>
          ) : null}
        </>
      )}
      <div className={cn("settingsPanelBody", hideHeading ? "mt-0" : "mt-4")}>{children}</div>
    </section>
  );
}
