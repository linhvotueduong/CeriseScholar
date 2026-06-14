import type { ReactNode } from "react";

export default function StatCard({
  icon,
  label,
  value,
  detail,
  tone = "neutral",
}: {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  detail?: string;
  tone?: "neutral" | "success" | "attention" | "blue" | "danger";
}) {
  const toneClass = {
    neutral: "bg-white text-[#17120d]",
    success: "bg-[#eef8ed] text-[#23651d]",
    attention: "bg-[#fff8e8] text-[#8a5b10]",
    blue: "bg-[#eef4ff] text-[#2457a6]",
    danger: "bg-[#fff1f0] text-[#b42318]",
  }[tone];

  return (
    <article className="min-h-[92px] rounded-[12px] border border-[#e5e1dc] bg-white p-4 shadow-[0_1px_0_rgba(17,17,17,0.02)]">
      <div className="flex items-center gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#ece8e3] text-[13px] font-bold ${toneClass}`}>
          {icon || label.slice(0, 1)}
        </span>
        <div className="min-w-0">
          <p className="text-[12px] font-bold text-[#17120d]">{label}</p>
          <p className="mt-1 text-[24px] font-bold leading-none text-[#17120d]">{value}</p>
          {detail ? <p className="mt-1 text-[11px] font-medium text-[#6f6760]">{detail}</p> : null}
        </div>
      </div>
    </article>
  );
}
