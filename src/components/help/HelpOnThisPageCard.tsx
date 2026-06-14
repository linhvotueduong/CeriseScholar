"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppIcon } from "@/components/app-shell/AppIcons";

type OnThisPageSection = {
  id: string;
  label: string;
};

function displayLabel(label: string) {
  return label.replace(/^\d+\.\s*/, "");
}

export default function HelpOnThisPageCard({
  enableScrollHighlight = false,
  showBackLink = true,
  sections,
}: {
  enableScrollHighlight?: boolean;
  showBackLink?: boolean;
  sections: OnThisPageSection[];
}) {
  const [activeId, setActiveId] = useState(sections[0]?.id || "");

  useEffect(() => {
    if (!enableScrollHighlight || !sections.length) return;

    let frame = 0;
    function updateActiveSection() {
      const sectionPositions = sections
        .map((section) => {
          const element = document.getElementById(section.id);
          return element ? { id: section.id, top: element.getBoundingClientRect().top } : null;
        })
        .filter((section): section is { id: string; top: number } => Boolean(section));

      const activationLine = Math.min(window.innerHeight * 0.58, 540);
      const currentSection =
        sectionPositions
          .filter((section) => section.top <= activationLine)
          .sort((a, b) => b.top - a.top)[0] || sectionPositions[0];

      if (currentSection) {
        setActiveId(currentSection.id);
      }
    }

    function requestUpdate() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateActiveSection);
    }

    updateActiveSection();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, [enableScrollHighlight, sections]);

  return (
    <article className="rounded-[12px] border border-[#e5e1dc] bg-white p-3.5">
      <h2 className="text-[14px] font-bold text-[#111111]">On this page</h2>
      <div className="mt-3 grid gap-1.5">
        {sections.map((section) => {
          const active = enableScrollHighlight && activeId === section.id;
          return (
            <a
              className={`grid grid-cols-[18px_minmax(0,1fr)] items-center gap-2 rounded-[8px] px-2 py-1 text-[11px] font-bold leading-4 no-underline transition ${
                active ? "bg-[#f1ece5] text-[#17120d]" : "text-[#5d6682] hover:bg-[#f7f5f2]"
              }`}
              href={`#${section.id}`}
              key={section.id}
              onClick={() => setActiveId(section.id)}
            >
              <span className={active ? "text-[#9a7b55]" : "text-[#5d6682]"}>#</span>
              <span className="min-w-0 truncate">{displayLabel(section.label)}</span>
            </a>
          );
        })}
      </div>
      {showBackLink ? (
        <Link
          className="mt-4 flex items-center gap-2 rounded-[8px] px-2 py-1 text-[11px] font-bold text-[#5d6682] no-underline hover:bg-[#f7f5f2]"
          href="/help"
        >
          <AppIcon className="h-4 w-4 shrink-0" name="arrow-left" />
          Back to Help Center
        </Link>
      ) : null}
    </article>
  );
}
