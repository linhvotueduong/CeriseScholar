"use client";

import { useState } from "react";
import Link from "next/link";

const palette = {
  ink: "#1a1208",
  inkMuted: "#7a6a5a",
  faint: "#9a8a7a",
  cerise: "#c0392b",
  rule: "#e0d8d0",
  gold: "#d4a843",
  surface: "#faf7f0",
};

const folderColors = [
  { front: "#8b9dc3", back: "#7b8db3" },
  { front: "#c0392b", back: "#a82d22" },
  { front: "#d4a843", back: "#b89235" },
  { front: "#7a8a6a", back: "#6a7a5a" },
  { front: "#3a3a3a", back: "#2a2a2a" },
  { front: "#5a4a3a", back: "#4a3a2a" },
];

const tabNames = [
  "Brainstorm",
  "Find Sources",
  "Analyze",
  "Lit Review",
  "Write",
  "Roadmap",
];

const hedgehogKeys = [
  "hedgehog06Clasped",
  "hedgehog05Laptop",
  "hedgehog10Magnifier",
  "hedgehog11LitBook",
  "hedgehog04RedPen",
];

interface Step {
  number: number;
  title: string;
  description: string;
  tasks: string[];
  tips: string[];
  ceriseTool: string | null;
  links: { label: string; href: string }[];
}

export default function StepFolders({ steps, hedgehog }: { steps: Step[]; hedgehog: Record<string, string> }) {
  const [active, setActive] = useState(0);
  const totalTabs = steps.length + 1;

  return (
    <div style={{ position: "relative", maxWidth: "1000px", margin: "0 auto" }}>

      {/* Folder divider tabs peeking behind — each extends down to folder body */}
      {[...Array(totalTabs).keys()]
        .filter((i) => i !== active)
        .sort((a, b) => a - b)
        .map((i) => {
          const peekUp = 24;
          const tabW = 100 / totalTabs;
          const tabLeftPercent = i * tabW;

          return (
            <div
              key={`divider-${i}`}
              style={{
                position: "absolute",
                top: `-${peekUp}px`,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: i,
                pointerEvents: "none",
                display: "flex",
                flexDirection: "column",
                borderRadius: "14px",
                overflow: "hidden",
              }}
            >
              {/* Clickable tab bump area */}
              <div
                onClick={() => setActive(i)}
                style={{
                  position: "absolute",
                  left: `${tabLeftPercent}%`,
                  width: `${tabW}%`,
                  top: 0,
                  height: `${peekUp + 36}px`,
                  cursor: "pointer",
                  pointerEvents: "auto",
                  zIndex: totalTabs + 10,
                }}
              />
              {/* Visual SVG */}
              <svg width="100%" height={`${peekUp + 36}px`} preserveAspectRatio="none" viewBox="0 0 1000 60" style={{ display: "block", pointerEvents: "none", flexShrink: 0 }}>
                <path
                  d={`M0 60 L0 30
                      L${tabLeftPercent * 10 + 20} 30
                      C${tabLeftPercent * 10 + 30} 30 ${tabLeftPercent * 10 + 30} 10 ${tabLeftPercent * 10 + 40} 8
                      L${(tabLeftPercent + tabW) * 10 - 40} 8
                      C${(tabLeftPercent + tabW) * 10 - 30} 8 ${(tabLeftPercent + tabW) * 10 - 30} 30 ${(tabLeftPercent + tabW) * 10 - 20} 30
                      L1000 30 L1000 60 Z`}
                  fill={folderColors[i].back}
                />
                <text
                  x={`${(tabLeftPercent + tabW / 2) * 10}`}
                  y="24"
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.55)"
                  style={{ fontSize: "7px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "sans-serif" }}
                >
                  {tabNames[i].toUpperCase()}
                </text>
              </svg>
              {/* Solid bar filling down to folder body */}
              <div style={{ background: folderColors[i].back, flex: 1, pointerEvents: "none", borderRadius: "14px" }} />
            </div>
          );
        })}

      {/* Active folder */}
      <div style={{ position: "relative", zIndex: totalTabs + 1 }}>
        {/* Active tab bump */}
        <svg width="100%" height="36" preserveAspectRatio="none" viewBox="0 0 1000 36" style={{ display: "block" }}>
          {(() => {
            const tabW = 100 / totalTabs;
            const tabLeft = active * tabW;
            return (
              <path
                d={`M0 36 L0 20
                    L${tabLeft * 10 + 15} 20
                    C${tabLeft * 10 + 25} 20 ${tabLeft * 10 + 25} 4 ${tabLeft * 10 + 35} 2
                    L${(tabLeft + tabW) * 10 - 35} 2
                    C${(tabLeft + tabW) * 10 - 25} 2 ${(tabLeft + tabW) * 10 - 25} 20 ${(tabLeft + tabW) * 10 - 15} 20
                    L1000 20 L1000 36 Z`}
                fill={folderColors[active].front}
              />
            );
          })()}
          <text
            x={`${(active * (100 / totalTabs) + (100 / totalTabs) / 2) * 10}`}
            y="16"
            textAnchor="middle"
            fill="rgba(255,255,255,0.9)"
            style={{ fontSize: "7.5px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "sans-serif" }}
          >
            {tabNames[active].toUpperCase()}
          </text>
        </svg>

        {/* Folder body */}
        <div style={{
          background: folderColors[active].front,
          borderRadius: "0 0 14px 14px",
          padding: "36px 38px",
          color: "#fff",
          minHeight: "420px",
          marginTop: "-1px",
          transition: "background 0.3s ease",
        }}>
          {/* Steps 1-5 content */}
          {active < steps.length && (
            <>
              <div style={{ marginBottom: "24px" }}>
                <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.6, margin: "0 0 8px" }}>
                  Stage {String(steps[active].number).padStart(2, "0")}
                </p>
                <h2 style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', serif", fontSize: "clamp(22px, 2.2vw, 28px)", fontWeight: 400, lineHeight: 1.1, margin: "0 0 12px" }}>
                  {steps[active].title}
                </h2>
                <p style={{ fontSize: "13px", lineHeight: 1.65, opacity: 0.85, maxWidth: "520px" }}>
                  {steps[active].description}
                </p>
              </div>

              {steps[active].ceriseTool && (
                <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.6, margin: "0 0 4px" }}>Cerise Scholar Tool</p>
                  <p style={{ fontSize: "12px", margin: 0, lineHeight: 1.5 }}>{steps[active].ceriseTool}</p>
                  {steps[active].links.length > 0 && (
                    <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
                      {steps[active].links.map((link, j) => (
                        <Link key={j} href={link.href} target={link.href.startsWith("http") ? "_blank" : undefined} style={{ padding: "4px 12px", background: "rgba(255,255,255,0.18)", borderRadius: "100px", fontSize: "10px", fontWeight: 600, color: "#fff", textDecoration: "none" }}>
                          {link.label} {link.href.startsWith("http") ? "↗" : "→"}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div>
                  <h3 style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.65, margin: "0 0 12px" }}>What to do</h3>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
                    {steps[active].tasks.map((task, j) => (
                      <li key={j} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "11px", lineHeight: 1.55, opacity: 0.9 }}>
                        <span style={{ width: "14px", height: "14px", border: "1.5px solid rgba(255,255,255,0.35)", borderRadius: "3px", flexShrink: 0, marginTop: "2px" }} />
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.65, margin: "0 0 12px" }}>Tips</h3>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
                    {steps[active].tips.map((tip, j) => (
                      <li key={j} style={{ display: "flex", alignItems: "flex-start", gap: "7px", fontSize: "11px", lineHeight: 1.55, opacity: 0.85 }}>
                        <span style={{ flexShrink: 0, marginTop: "1px" }}>★</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}

          {/* Tab 6: Full Roadmap */}
          {active >= steps.length && (
            <div style={{ position: "relative" }}>
              <div style={{ marginBottom: "28px" }}>
                <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.6, margin: "0 0 8px" }}>
                  ROADMAP
                </p>
                <h2 style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', serif", fontSize: "clamp(22px, 2.2vw, 28px)", fontWeight: 400, lineHeight: 1.1, margin: "0 0 12px" }}>
                  Your Full Research Roadmap
                </h2>
                <p style={{ fontSize: "13px", lineHeight: 1.65, opacity: 0.85, maxWidth: "520px" }}>
                  An overview of all five stages — from brainstorming your first question to publishing your finished paper.
                </p>
              </div>
              <div style={{ position: "absolute", left: "50%", top: "130px", bottom: "50px", width: "1px", background: "rgba(255,255,255,0.15)", transform: "translateX(-50%)" }} />
              {steps.map((step, i) => {
                const isLeft = i % 2 === 0;
                const imgKey = hedgehogKeys[i] || "hedgehog03Standing";
                return (
                  <div key={step.number} style={{ display: "flex", alignItems: "flex-start", flexDirection: isLeft ? "row" : "row-reverse", marginBottom: i < steps.length - 1 ? "14px" : "0", position: "relative" }}>
                    <div style={{ width: "42%", padding: isLeft ? "0 16px 0 0" : "0 0 0 16px", textAlign: isLeft ? "right" : "left" }}>
                      <p style={{ fontFamily: "var(--font-dm-serif)", fontSize: "24px", fontWeight: 400, margin: "0 0 4px", lineHeight: 1, opacity: 0.5 }}>{String(step.number).padStart(2, "0")}</p>
                      <h4 style={{ fontSize: "12px", fontWeight: 700, margin: "0 0 4px", lineHeight: 1.3 }}>{step.title}</h4>
                      <p style={{ fontSize: "10px", lineHeight: 1.5, opacity: 0.65, margin: 0 }}>{step.description.slice(0, 80)}...</p>
                    </div>
                    <div style={{ width: "16%", display: "flex", justifyContent: "center", paddingTop: "4px", position: "relative", zIndex: 2 }}>
                      <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px", fontWeight: 700 }}>{step.number}</div>
                    </div>
                    <div style={{ width: "42%", padding: isLeft ? "0 0 0 16px" : "0 16px 0 0", display: "flex", justifyContent: isLeft ? "flex-start" : "flex-end" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={hedgehog[imgKey]} alt="" style={{ width: "70px", height: "70px", objectFit: "contain", opacity: 0.75 }} />
                    </div>
                  </div>
                );
              })}
              <div style={{ textAlign: "center", marginTop: "20px", position: "relative", zIndex: 2 }}>
                <p style={{ fontFamily: "var(--font-dm-serif)", fontSize: "22px", fontWeight: 400, fontStyle: "italic", margin: "0 0 4px", opacity: 0.75 }}>finish</p>
                <p style={{ fontSize: "9px", opacity: 0.4, letterSpacing: "0.1em" }}>publication</p>
              </div>
            </div>
          )}

          {/* Nav dots */}
          <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "24px" }}>
            {Array.from({ length: totalTabs }).map((_, i) => (
              <button key={i} onClick={() => setActive(i)} style={{ width: active === i ? "18px" : "6px", height: "6px", borderRadius: "3px", background: active === i ? "#fff" : "rgba(255,255,255,0.25)", border: "none", cursor: "pointer", transition: "all 0.25s ease" }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
