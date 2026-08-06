import Link from "next/link";
import { AppIcon, type AppIconName } from "@/components/app-shell/AppIcons";

export default function HelpCategoryCard({
  body,
  href,
  label,
  tone = "neutral",
}: {
  body: string;
  href: string;
  label: string;
  tone?: "rose" | "blue" | "green" | "purple" | "amber" | "neutral";
}) {
  const toneClass = {
    rose: "bg-[#fff1f3] text-[#e23b5d]",
    blue: "bg-[#eef4ff] text-[#315ad8]",
    green: "bg-[#ebf8f1] text-[#2e9b57]",
    purple: "bg-[#f4edff] text-[#8748d8]",
    amber: "bg-[#fff4e7] text-[#dd7a1a]",
    neutral: "bg-[#f3f1ee] text-[#4f4842]",
  }[tone];
  const iconMap: Record<string, AppIconName> = {
    "Getting Started": "book-open",
    "AI Setup": "dashboard",
    "Privacy & Protection": "shield",
    "Account & Access": "user",
    "Research Workflow": "folder",
    "Report an issue": "bug",
    "Request a feature": "lightbulb",
    "Ask the Cerise Community": "users",
  };
  const icon = iconMap[label] || "help";

  return (
    <Link
      className="relative grid min-h-[166px] grid-cols-[42px_minmax(0,1fr)] gap-3 rounded-[12px] border border-[#e5e1dc] bg-white px-3.5 py-4 text-[#17120d] no-underline transition hover:bg-[#f7f5f2]"
      href={href}
    >
      <span className={`flex h-10 w-10 items-center justify-center rounded-full ${toneClass}`}>
        <AppIcon className="h-[18px] w-[18px]" name={icon} />
      </span>
      <span className="min-w-0 pt-0.5">
        <span className="block text-[13px] font-[850] leading-tight">{label}</span>
        <span className="mt-2 block text-[11px] font-semibold leading-[19px] text-[#6f6760]">{body}</span>
      </span>
    </Link>
  );
}
