"use client";

import { useEffect, useRef, useState } from "react";

const p = {
  ink: "#1a1208",
  inkMuted: "#7a6a5a",
  cerise: "#c0392b",
  rule: "#e0d8d0",
  bg: "#fefefe",
};

export const COURSE_SECTIONS = [
  { id: "about", label: "About" },
  { id: "modules", label: "Modules" },
  { id: "what-youll-learn", label: "What you'll learn" },
  { id: "faq", label: "FAQ" },
] as const;

/**
 * Sticky horizontal nav for the /courses landing page. Highlights the section
 * currently in the upper portion of the viewport via an IntersectionObserver,
 * and smooth-scrolls to a section on click. Sections are matched by id —
 * the page must render `<section id="about">` etc. for it to wire up.
 */
export default function CourseSectionNav() {
  const [active, setActive] = useState<string>(COURSE_SECTIONS[0].id);
  const navRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // The "active zone" is roughly the top third of the viewport — sections
    // with their headline visible there get highlighted in the nav.
    const observer = new IntersectionObserver(
      (entries) => {
        // Multiple sections may intersect at once during scroll. Pick the one
        // whose top is closest to (but not below) the active zone.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) =>
              Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top)
          );
        if (visible.length > 0) {
          setActive(visible[0].target.id);
        }
      },
      {
        rootMargin: "-80px 0px -60% 0px",
        threshold: 0,
      }
    );

    for (const s of COURSE_SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  function handleClick(e: React.MouseEvent, id: string) {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    // Optimistically mark active so the nav highlights immediately on click,
    // even before the IntersectionObserver fires from the smooth-scroll.
    setActive(id);
  }

  return (
    <div
      ref={navRef}
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        background: p.bg,
        borderBottom: `1px solid ${p.rule}`,
        margin: "32px 0 0",
      }}
    >
      <div
        role="tablist"
        aria-label="Course sections"
        style={{
          display: "flex",
          gap: "24px",
          overflowX: "auto",
          whiteSpace: "nowrap",
          padding: "10px 0",
          // Hide scrollbar but keep scroll behavior
          scrollbarWidth: "none",
        }}
      >
        {COURSE_SECTIONS.map((s) => {
          const isActive = active === s.id;
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={(e) => handleClick(e, s.id)}
              role="tab"
              aria-selected={isActive}
              style={{
                padding: "8px 2px",
                borderBottom: isActive ? `2px solid ${p.cerise}` : "2px solid transparent",
                color: isActive ? p.ink : p.inkMuted,
                fontSize: "13px",
                fontWeight: isActive ? 700 : 500,
                textDecoration: "none",
                flexShrink: 0,
                transition: "color 150ms ease, border-color 150ms ease",
              }}
            >
              {s.label}
            </a>
          );
        })}
      </div>
    </div>
  );
}
