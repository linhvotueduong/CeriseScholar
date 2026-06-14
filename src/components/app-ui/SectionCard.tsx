import { cn } from "@/lib/utils/cn";
import { AppIcon, type AppIconName } from "@/components/app-shell/AppIcons";

export default function SectionCard({
  active,
  label,
  progress,
  tone = "neutral",
  onClick,
}: {
  active?: boolean;
  label: string;
  progress: number;
  tone?: "rose" | "blue" | "amber" | "green" | "purple" | "neutral";
  onClick?: () => void;
}) {
  const chipClass = {
    rose: "bg-[#fdebf3] text-[#9f2d62]",
    blue: "bg-[#eef4ff] text-[#2457a6]",
    amber: "bg-[#fff8e8] text-[#8a5b10]",
    green: "bg-[#eef8ed] text-[#23651d]",
    purple: "bg-[#f4edff] text-[#6840a0]",
    neutral: "bg-[#f3f1ee] text-[#4f4842]",
  }[tone];
  const iconMap: Record<string, AppIconName> = {
    "Meta-analysis": "target",
    "Literature Review Table": "workflow",
    Workspace: "folder",
    "Paper Draft": "file",
    Citations: "book-open",
    Notes: "edit",
  };
  const icon = iconMap[label] || "list";

  return (
    <button
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-[10px] border px-3 py-2 text-left transition",
        active ? "border-[#d8d3ce] bg-[#f1f1ef]" : "border-[#eeeae5] bg-white hover:bg-[#f7f5f2]"
      )}
      onClick={onClick}
      type="button"
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f7f5f2] text-[#17120d]">
          <AppIcon className="h-4 w-4" name={icon} />
        </span>
        <span className="truncate text-[12px] font-bold text-[#111111]">{label}</span>
      </span>
      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${chipClass}`}>{progress}%</span>
    </button>
  );
}
