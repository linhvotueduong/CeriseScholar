import type { ReactNode } from "react";

export default function CourseCard({
  action,
  badge,
  children,
  lessons,
  modules,
  notes,
  progress,
  remaining,
  title,
}: {
  action?: ReactNode;
  badge: string;
  children: ReactNode;
  lessons?: number;
  modules?: number;
  notes?: number;
  progress: number;
  remaining?: number;
  title: string;
}) {
  const visual = title.includes("Methods")
    ? {
        image: "/assets/hedgehogs/hedgehog10Magnifier.png",
        theme: "from-[#fff7e8] via-[#fbf7ef] to-[#eaf2ea]",
        accent: "#f59e0b",
      }
    : title.includes("Data")
      ? {
          image: "/assets/hedgehogs/hedgehog05Laptop.png",
          theme: "from-[#f2efff] via-[#fbf7ef] to-[#e9eef7]",
          accent: "#6d5bd0",
        }
      : {
          image: "/assets/hedgehogs/hedgehog11LitBook.png",
          theme: "from-[#f2eadb] via-[#fbf7f0] to-[#efe8dd]",
          accent: "#9a7b55",
        };

  return (
    <article className="flex min-h-[286px] w-full flex-col rounded-[9px] border border-[#e5e1dc] bg-white p-2.5 shadow-[0_1px_0_rgba(17,17,17,0.02)]">
      <div className={`relative h-[92px] overflow-hidden rounded-[8px] border border-[#eeeae5] bg-gradient-to-br ${visual.theme} p-2.5`}>
        <div className="absolute -right-3 -top-5 h-24 w-24 rounded-full bg-white/45" />
        <div className="absolute bottom-0 right-4 h-[82px] w-[106px]">
          <img
            alt=""
            className="h-full w-full object-contain drop-shadow-[0_10px_18px_rgba(17,17,17,0.08)]"
            src={visual.image}
          />
        </div>
        <span className="rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-[850] text-[#8a5b10]">
          {badge}
        </span>
      </div>
      <h3 className="mt-2.5 text-[15px] font-[850] leading-[1.15] text-[#17120d]">{title}</h3>
      <p className="mt-1.5 min-h-[42px] text-[11px] font-medium leading-[1.45] text-[#625a52]">{children}</p>
      <div className="mt-auto flex items-center justify-between pt-1.5 text-[10px] font-[850] text-[#625a52]">
        <span>Course progress</span>
        <span>{progress}%</span>
      </div>
      <div className="mt-1.5 h-[5px] rounded-full bg-[#e8e5e1]">
        <div className="h-[5px] rounded-full" style={{ width: `${progress}%`, backgroundColor: visual.accent }} />
      </div>
      <div className="mt-3 grid grid-cols-4 border-t border-[#eeeae5] pt-2.5 text-center">
        {[
          ["Modules", modules ?? 4],
          ["Lessons", lessons ?? 12],
          ["Notes", notes ?? 0],
          ["Remaining", remaining ?? 3],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-[12px] font-[850] leading-none text-[#17120d]">{value}</p>
            <p className="mt-1 text-[8.5px] font-semibold leading-none text-[#6f6760]">{label}</p>
          </div>
        ))}
      </div>
      {action ? <div className="mt-3">{action}</div> : null}
    </article>
  );
}
