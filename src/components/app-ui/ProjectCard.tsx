import { cn } from "@/lib/utils/cn";

export default function ProjectCard({
  active,
  title,
  meta,
  status,
  progress,
  tone = "attention",
  onClick,
}: {
  active?: boolean;
  title: string;
  meta: string;
  status: string;
  progress: number;
  tone?: "success" | "attention" | "blue" | "neutral";
  onClick?: () => void;
}) {
  const toneClass = {
    success: "bg-[#eef8ed] text-[#23651d]",
    attention: "bg-[#fff8e8] text-[#8a5b10]",
    blue: "bg-[#eef4ff] text-[#2457a6]",
    neutral: "bg-[#f3f1ee] text-[#4f4842]",
  }[tone];

  return (
    <button
      className={cn(
        "w-full rounded-[12px] border p-2.5 text-left transition",
        active ? "border-[#d8d3ce] bg-[#f1f1ef]" : "border-[#e5e1dc] bg-white hover:bg-[#f7f5f2]"
      )}
      onClick={onClick}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[13px] font-bold leading-[18px] text-[#111111]">{title}</h3>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${toneClass}`}>
          {status}
        </span>
      </div>
      <p className="mt-1.5 text-[11px] font-semibold text-[#625a52]">{meta}</p>
      <div className="mt-2.5 flex items-center gap-3">
        <div className="h-1.5 flex-1 rounded-full bg-[#e8e5e1]">
          <div className="h-1.5 rounded-full bg-[#111111]" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-xs font-bold text-[#111111]">{progress}%</span>
      </div>
    </button>
  );
}
