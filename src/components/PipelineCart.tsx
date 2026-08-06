/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const V = (px: number) => `calc(${px} / 1460 * 100vw)`;

const palette = {
  ink: "#1a1208",
  inkMuted: "#7a6a5a",
  cerise: "#c0392b",
  rule: "#e0d8d0",
  gold: "#c8a84b",
};

interface Stage {
  title: string;
  desc: string;
  img: string;
  alt: string;
  tag: string;
}

interface PipelineCartProps {
  stages: Stage[];
}

const stepRoutes: Record<string, string> = {
  "ScholarAsk": "/scholar-ask-preview",
  "Workspace": "/workspace-preview",
  "Literature Review": "/lit-review-preview",
  "Meta-Analysis": "/meta-analysis-preview",
  "StarPine Pen": "/paper-writer-preview",
};

export default function PipelineCart({ stages }: PipelineCartProps) {
  const [cart, setCart] = useState<number[]>([]);
  const [showCart, setShowCart] = useState(false);

  const toggleStep = (index: number) => {
    setCart((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index].sort()
    );
  };

  const launchCart = () => {
    if (cart.length === 0) return;
    // Save flow to localStorage so it persists across pages
    const flow = cart.map((i) => ({
      index: i,
      title: stages[i].title,
      tag: stages[i].tag,
      route: stepRoutes[stages[i].tag] || "/",
    }));
    localStorage.setItem("cerise-flow", JSON.stringify(flow));
    localStorage.setItem("cerise-flow-step", "0");
    setShowCart(false);
    // First go to create project
    window.location.href = "/projects";
  };

  return (
    <>
      {/* Pipeline section */}
      <section id="pipeline" style={{ background: "#fdfcfa", borderTop: `1px solid ${palette.rule}` }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "80px 32px" }}>

          <p style={{ fontFamily: "var(--font-roboto), 'Roboto', sans-serif", fontSize: "15px", fontWeight: 700, color: palette.cerise, textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>
            PIPELINE CART
          </p>
          <h2 style={{ fontFamily: "var(--font-roboto), 'Roboto', sans-serif", fontSize: "27px", fontWeight: 700, color: palette.ink, margin: "8px 0 0", lineHeight: 1.15 }}>
            From question to paper
          </h2>
          <p style={{ fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif", fontSize: "14px", color: palette.inkMuted, marginTop: "16px" }}>
            Five stages, one continuous workflow. Customize your research journey by adding your own steps to the cart.
          </p>

          {/* Cards */}
          <div style={{ display: "flex", gap: "19px", marginTop: "48px", justifyContent: "center", flexWrap: "nowrap" }}>
            {stages.map((s, i) => {
              const inCart = cart.includes(i);
              return (
                <div
                  key={s.title}
                  className="group transition-all duration-200 hover:-translate-y-1"
                  style={{
                    width: "206px", minHeight: "367px",
                    background: inCart ? "#fef9ee" : "#fff",
                    border: inCart ? `2px solid ${palette.gold}` : `1px solid ${palette.rule}`,
                    borderRadius: "8px",
                    display: "flex", flexDirection: "column",
                    padding: "12px 12px 10px",
                    position: "relative",
                    transition: "all 0.3s ease",
                  }}
                >
                  {/* Step badge */}
                  <span style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    background: palette.ink, color: "#fff",
                    fontFamily: "var(--font-noto), 'Noto Sans', sans-serif",
                    fontSize: "9px", fontWeight: 600, letterSpacing: "0.08em",
                    borderRadius: "100px", padding: "4px 10px", alignSelf: "flex-start",
                  }}>
                    STEP {i + 1}
                  </span>

                  {/* Hedgehog */}
                  <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
                    <img src={s.img} alt={s.alt} style={{ width: "140px", height: "160px", objectFit: "contain" }} />
                  </div>

                  {/* Title */}
                  <div style={{ fontFamily: "var(--font-noto), 'Noto Sans', sans-serif", fontWeight: 700, fontSize: "11px", color: palette.ink, lineHeight: 1.35 }}>
                    {s.title}
                  </div>

                  {/* Description */}
                  <div style={{ fontFamily: "var(--font-poppins), 'Poppins', sans-serif", fontWeight: 400, fontSize: "8px", color: palette.inkMuted, lineHeight: 1.6, marginTop: "6px", flex: 1 }}>
                    {s.desc}
                  </div>

                  {/* Footer */}
                  <div style={{ borderTop: `1px solid ${palette.rule}`, paddingTop: "8px", marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontFamily: "var(--font-noto), 'Noto Sans', sans-serif", fontWeight: 600, fontSize: "10px", color: palette.ink }}>
                      {s.tag}
                    </span>
                    {/* Add/Remove from cart button */}
                    <button
                      onClick={() => toggleStep(i)}
                      style={{
                        width: "24px", height: "24px",
                        borderRadius: "50%",
                        background: inCart ? palette.gold : palette.ink,
                        color: "#fff", border: "none",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "var(--font-bebas), 'Bebas Neue', sans-serif",
                        fontSize: "13px", lineHeight: 1,
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      {inCart ? "✓" : "+"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "72px", alignItems: "center" }}>
            <Link
              href="/research-guidance"
              className="transition-colors hover:bg-[#1a1208] hover:text-white"
              style={{
                padding: "16px 40px", borderRadius: "50px",
                border: "1px solid #cac0b8", background: "transparent",
                fontFamily: "var(--font-fredoka), 'Fredoka', sans-serif", fontSize: "12px", fontWeight: 600,
                color: palette.ink, textDecoration: "none", height: "50px",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}
            >
              Detailed Guidance
            </Link>
            <span style={{ fontFamily: "var(--font-fredoka), 'Fredoka', sans-serif", fontSize: "12px", fontWeight: 500, color: palette.ink, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 8px" }}>OR</span>
            <button
              onClick={() => cart.length > 0 ? setShowCart(true) : null}
              className="transition-colors hover:bg-[#1a1208] hover:text-white"
              style={{
                padding: "16px 40px", borderRadius: "50px",
                border: "1px solid #cac0b8",
                background: cart.length > 0 ? palette.ink : "transparent",
                fontFamily: "var(--font-fredoka), 'Fredoka', sans-serif", fontSize: "12px", fontWeight: 600,
                color: cart.length > 0 ? "#fff" : palette.ink,
                height: "50px", cursor: "pointer",
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px",
                transition: "all 0.3s",
              }}
            >
              Ready Cart
              {cart.length > 0 && (
                <span style={{
                  width: "20px", height: "20px", borderRadius: "50%",
                  background: palette.gold, color: palette.ink,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "11px", fontWeight: 700,
                }}>
                  {cart.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* ═══ Cart floating icon (when items in cart) ═══ */}
      {cart.length > 0 && !showCart && (
        <button
          onClick={() => setShowCart(true)}
          style={{
            position: "fixed", bottom: "24px", right: "24px",
            width: "56px", height: "56px", borderRadius: "50%",
            background: palette.ink, color: "#fff", border: "none",
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", zIndex: 1000,
            fontSize: "20px",
          }}
        >
          🛒
          <span style={{
            position: "absolute", top: "-4px", right: "-4px",
            width: "22px", height: "22px", borderRadius: "50%",
            background: palette.cerise, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "11px", fontWeight: 700,
          }}>
            {cart.length}
          </span>
        </button>
      )}

      {/* ═══ Cart drawer ═══ */}
      {showCart && (
        <div
          onClick={() => setShowCart(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(26,18,8,0.2)",
            backdropFilter: "blur(4px)",
            zIndex: 1001, display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fefefe", borderRadius: "24px", padding: "0",
              width: "420px", maxHeight: "85vh", overflowY: "auto",
              boxShadow: "0 24px 80px rgba(26,18,8,0.12)",
              border: `1px solid ${palette.rule}`,
            }}
          >
            {/* Header */}
            <div style={{ padding: "28px 28px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', serif", fontSize: "20px", fontWeight: 400, color: palette.ink, margin: 0 }}>
                  Research Cart
                </h3>
                <p style={{ fontSize: "11px", color: palette.inkMuted, margin: "4px 0 0" }}>
                  {cart.length} step{cart.length !== 1 ? "s" : ""} selected
                </p>
              </div>
              <button onClick={() => setShowCart(false)} style={{ background: "none", border: `1px solid ${palette.rule}`, width: "32px", height: "32px", borderRadius: "8px", fontSize: "14px", color: palette.inkMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>

            {/* Steps list */}
            <div style={{ padding: "20px 28px" }}>
              {/* Step 0 — always first */}
              <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "6px" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0" }}>
                  <span style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#fefefe", border: `2px solid ${palette.rule}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, color: palette.inkMuted }}>✓</span>
                  <div style={{ width: "2px", height: "20px", background: palette.rule }} />
                </div>
                <div style={{ flex: 1, paddingBottom: "16px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: palette.ink }}>Create New Project</div>
                  <div style={{ fontSize: "10px", color: palette.inkMuted }}>Starting point for every journey</div>
                </div>
              </div>

              {/* Selected steps with timeline */}
              {cart.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                  <div style={{ fontSize: "28px", marginBottom: "8px" }}>📋</div>
                  <p style={{ fontSize: "13px", color: palette.inkMuted }}>No steps added yet</p>
                  <p style={{ fontSize: "11px", color: palette.inkMuted }}>Click &quot;+&quot; on any pipeline card</p>
                </div>
              ) : (
                cart.map((stepIndex, i) => (
                  <div key={stepIndex} style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: i < cart.length - 1 ? "6px" : "0" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <span style={{ width: "32px", height: "32px", borderRadius: "50%", background: palette.ink, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, flexShrink: 0 }}>
                        {i + 1}
                      </span>
                      {i < cart.length - 1 && <div style={{ width: "2px", height: "20px", background: palette.rule }} />}
                    </div>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: i < cart.length - 1 ? "16px" : "0" }}>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: palette.ink }}>{stages[stepIndex].title}</div>
                        <div style={{ fontSize: "10px", color: palette.inkMuted }}>{stages[stepIndex].tag}</div>
                      </div>
                      <button
                        onClick={() => toggleStep(stepIndex)}
                        style={{ background: "none", border: "none", fontSize: "12px", color: palette.inkMuted, cursor: "pointer", padding: "4px 8px", borderRadius: "4px" }}
                        className="hover:bg-[#f5f0e8]"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {cart.length > 0 && (
              <div style={{ padding: "0 28px 28px" }}>
                {/* Flow preview */}
                <div style={{ fontSize: "11px", color: palette.inkMuted, marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600 }}>Flow:</span>
                  <span>New Project</span>
                  {cart.map((si) => (
                    <span key={si} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ color: palette.rule }}>→</span>
                      <span>{stages[si].tag}</span>
                    </span>
                  ))}
                </div>

                {/* Launch button */}
                <button
                  onClick={launchCart}
                  style={{
                    width: "100%", padding: "14px",
                    borderRadius: "12px", border: "none",
                    background: palette.ink, color: "#fff",
                    fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
                    fontSize: "14px", fontWeight: 600,
                    cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  }}
                >
                  Start Research Journey
                  <span style={{ fontSize: "16px" }}>→</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </>
  );
}
