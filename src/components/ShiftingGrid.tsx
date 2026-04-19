"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const V = (px: number) => `calc(${px} / 1460 * 100vw)`;

const palette = {
  ink: "#1a1208",
  inkMuted: "#7a6a5a",
  rule: "#e0d8d0",
};

interface Pillar {
  title: string;
  desc: string;
}

interface ShiftingGridProps {
  pillars: Pillar[];
}

const LAYOUTS = [
  { columns: "1fr 1fr 1fr", rows: "1fr 1fr", areas: `"W W A" "F C A"` },
  { columns: "1fr 1fr 1fr", rows: "1fr 1fr", areas: `"W W W" "F C A"` },
  { columns: "1fr 1fr 2fr", rows: "1fr 1fr", areas: `"W W W" "F C A"` },
  { columns: "1fr 2fr 2fr", rows: "1fr 1fr", areas: `"F W W" "F C A"` },
  { columns: "1fr 1fr",     rows: "1fr 1fr", areas: `"F W" "C A"` },
  { columns: "1fr 1fr",     rows: "1fr 2fr", areas: `"F W" "C A"` },
  { columns: "1fr 1fr 1fr", rows: "1fr 1fr", areas: `"F W A" "C W A"` },
];

const CARD_IDS = ["W", "F", "C", "A"] as const;
const dotColors = ["#E05A6B", "#6B8CC7", "#F0B945", "#a78bfa"];
const dotSides = ["left", "left", "right", "right"];

const TRANSITION = {
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
};

const HOLD_MS = 2000;

export default function ShiftingGrid({ pillars }: ShiftingGridProps) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setIsPaused(true);
      }
    }
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % LAYOUTS.length);
    }, HOLD_MS + TRANSITION.duration * 1000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const current = LAYOUTS[index];

  return (
    <motion.div
      layout
      transition={TRANSITION}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={{
        display: "grid",
        gap: V(16),
        gridTemplateColumns: current.columns,
        gridTemplateRows: current.rows,
        gridTemplateAreas: current.areas,
        marginTop: V(50),
        minHeight: V(300),
      }}
    >
      {pillars.map((pillar, i) => (
        <motion.div
          key={CARD_IDS[i]}
          layoutId={CARD_IDS[i]}
          layout
          transition={TRANSITION}
          style={{
            gridArea: CARD_IDS[i],
            background: "#fff",
            border: `1.5px solid ${palette.rule}`,
            borderRadius: V(16),
            padding: `${V(32)} ${V(28)}`,
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            overflow: "hidden",
            minHeight: V(140),
          }}
        >
          <span
            style={{
              position: "absolute",
              top: V(16),
              [dotSides[i]]: V(16),
              width: V(14),
              height: V(14),
              borderRadius: "50%",
              background: dotColors[i],
              opacity: 0.7,
            }}
          />
          <div
            style={{
              fontFamily: "var(--font-noto), 'Noto Sans', sans-serif",
              fontSize: V(14),
              fontWeight: 700,
              color: palette.ink,
              textAlign: "center",
              marginTop: V(10),
            }}
          >
            {pillar.title}
          </div>
          <p
            style={{
              fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
              fontSize: V(11),
              color: palette.inkMuted,
              textAlign: "center",
              lineHeight: 1.6,
              marginTop: V(12),
              maxWidth: V(360),
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            {pillar.desc}
          </p>
        </motion.div>
      ))}
    </motion.div>
  );
}
