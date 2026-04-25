"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const p = {
  ink: "#1a1208",
  inkMuted: "#7a6a5a",
  border: "#d4cdc5",
  warm: "#faf7f0",
};

/**
 * Pill-style tabs that sit at the top of /courses and /my-learning (and its
 * sub-routes). The "My learning dashboard" tab stays active on both
 * /my-learning and /my-learning/notes since they're conceptually one section.
 */
export default function CoursesTabs() {
  const pathname = usePathname() ?? "";
  const onLearning = pathname.startsWith("/my-learning");

  return (
    <div
      style={{
        display: "inline-flex",
        gap: "4px",
        padding: "4px",
        background: p.warm,
        border: `1px solid ${p.border}`,
        borderRadius: "100px",
        marginBottom: "24px",
      }}
    >
      <Tab href="/courses/learn" active={!onLearning} label="Video + notes" />
      <Tab href="/my-learning" active={onLearning} label="My learning dashboard" />
    </div>
  );
}

function Tab({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      style={{
        padding: "8px 18px",
        borderRadius: "100px",
        background: active ? "#fff" : "transparent",
        color: active ? p.ink : p.inkMuted,
        fontSize: "12px",
        fontWeight: 600,
        textDecoration: "none",
        boxShadow: active ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
        transition: "background 150ms ease, color 150ms ease",
      }}
    >
      {label}
    </Link>
  );
}
