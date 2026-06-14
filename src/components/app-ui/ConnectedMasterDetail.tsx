import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type ConnectedTone = "rose" | "taupe";

export function ConnectedMasterDetail({
  children,
  className,
  leftHeader,
  leftMin = "320px",
  leftSize = "0.4fr",
  rightHeader,
  rightMin = "520px",
  rightSize = "0.6fr",
  rows,
  tone = "taupe",
}: {
  children: ReactNode;
  className?: string;
  leftHeader: ReactNode;
  leftMin?: string;
  leftSize?: string;
  rightHeader: ReactNode;
  rightMin?: string;
  rightSize?: string;
  rows: ReactNode;
  tone?: ConnectedTone;
}) {
  const style = {
    "--cmd-left-min": leftMin,
    "--cmd-left-size": leftSize,
    "--cmd-right-min": rightMin,
    "--cmd-right-size": rightSize,
  } as CSSProperties;

  return (
    <section
      className={cn("connected-master-detail", `cmd-tone-${tone}`, className)}
      style={style}
    >
      <div className="cmd-left-header">{leftHeader}</div>
      <div className="cmd-right-header">{rightHeader}</div>
      <div className="cmd-list">{rows}</div>
      <div className="cmd-detail-surface">{children}</div>
    </section>
  );
}

export function ConnectedMasterDetailRow({
  active,
  children,
  className,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      className={cn("cmd-row", active && "cmd-row-active", className)}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
