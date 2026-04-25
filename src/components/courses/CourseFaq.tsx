"use client";

import { useState } from "react";

const p = {
  ink: "#1a1208",
  inkMuted: "#7a6a5a",
  inkFaint: "#9a8a7a",
  cerise: "#c0392b",
  rule: "#e0d8d0",
  border: "#d4cdc5",
  surface: "#fdfcfa",
};

interface FaqEntry {
  question: string;
  answer: string;
}

const FAQS: FaqEntry[] = [
  {
    question: "Is this course free?",
    answer:
      "Yes. The full course, your notes, and the Cerise AI coach are free to use. If we add paid features later, anything that exists today will stay free.",
  },
  {
    question: "Do I need to be a student to take it?",
    answer:
      "No. The course is aimed at early-career researchers, but anyone curious about how academic research is written and read is welcome. You'll just need a free account.",
  },
  {
    question: "How long does the course take?",
    answer:
      "Self-paced — go as fast or slow as you want. Each lesson is short (a few minutes of video plus time to take notes). Most people finish in a handful of sittings spread across a couple of weeks.",
  },
  {
    question: "Are my notes private?",
    answer:
      "Yes. Notes you write while watching are tied to your account and can only be read by you. They're stored in a database row protected by row-level security, so even other users can't see them.",
  },
  {
    question: "Can I export my notes when I'm done?",
    answer:
      "Yes. From My Learning → Notes you can copy any single note, copy everything to your clipboard, or download a single .txt file with all your notes grouped by module. PDF export is on the roadmap.",
  },
  {
    question: "What is the AI coach (Cerise)?",
    answer:
      "Cerise is a small AI assistant on the Notes page. It reads the notes you've written and helps you organise them — find connections, group themes, build a study guide. It can't see anyone else's notes, and you can clear the conversation at any time.",
  },
];

export default function CourseFaq() {
  return (
    <div
      style={{
        background: "#fff",
        border: `1.5px solid ${p.border}`,
        borderRadius: "16px",
        overflow: "hidden",
      }}
    >
      {FAQS.map((f, i) => (
        <FaqItem
          key={i}
          entry={f}
          isLast={i === FAQS.length - 1}
        />
      ))}
    </div>
  );
}

function FaqItem({ entry, isLast }: { entry: FaqEntry; isLast: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: isLast ? "none" : `1px solid ${p.rule}` }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          width: "100%",
          padding: "18px 22px",
          background: "transparent",
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          cursor: "pointer",
          textAlign: "left",
          color: p.ink,
        }}
      >
        <span style={{ fontSize: "15px", fontWeight: 600, color: p.ink, flex: 1 }}>
          {entry.question}
        </span>
        <span
          aria-hidden
          style={{
            display: "inline-block",
            color: p.inkMuted,
            fontSize: "14px",
            transition: "transform 200ms ease",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ▾
        </span>
      </button>
      {/* Smooth collapse using the grid-template-rows 0fr → 1fr trick */}
      <div
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          transition: "grid-template-rows 220ms ease",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <p
            style={{
              margin: 0,
              padding: "0 22px 18px",
              fontSize: "13px",
              color: p.inkMuted,
              lineHeight: 1.7,
            }}
          >
            {entry.answer}
          </p>
        </div>
      </div>
    </div>
  );
}
