"use client";

import { useState } from "react";

const SPACE_GROTESK = "'Space Grotesk', sans-serif";
const INTER = "'Inter', sans-serif";
const YELLOW = "#F5D547";

export default function HeroSection() {
  const [ctaHovered, setCtaHovered] = useState(false);

  return (
    <section
      className="hero-grid"
      style={{
        position: "relative",
        height: "calc(100vh - 72px)",
        maxHeight: "calc(100vh - 72px)",
        overflow: "hidden",
        zIndex: 2,
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        alignItems: "start",
        padding: "40px 40px 24px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* LEFT COLUMN */}
      <div className="left-col" style={{ textAlign: "left", paddingTop: 32 }}>
        <h2
          className="animate-fade-rise"
          style={{
            fontFamily: SPACE_GROTESK,
            fontSize: "clamp(48px, 5.5vw, 72px)",
            fontWeight: 900,
            color: "#000000",
            lineHeight: 0.92,
            letterSpacing: -2,
            margin: 0,
          }}
        >
          AI
          <br />
          scholar
          <br />
          friend
        </h2>
        <p
          className="animate-fade-rise-delay"
          style={{
            fontFamily: INTER,
            fontSize: "clamp(14px, 1.2vw, 18px)",
            letterSpacing: "0.12em",
            color: "#555555",
            marginTop: 20,
            lineHeight: 1.6,
            fontWeight: 500,
          }}
        >
          READ &middot; HIGHLIGHT &middot; REVIEW &middot; ASK &middot;
          <br />
          ANALYZE &middot; WRITE
        </p>
      </div>

      {/* CENTER COLUMN */}
      <div
        className="center-col"
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          height: "100%",
        }}
      >
        {/* CTA Button */}
        <div
          className="animate-fade-rise-delay-2"
          style={{
            marginTop: "auto",
            position: "relative",
            zIndex: 10,
            paddingBottom: 16,
          }}
        >
          <span
            onMouseEnter={() => setCtaHovered(true)}
            onMouseLeave={() => setCtaHovered(false)}
            style={{
              display: "inline-block",
              fontFamily: INTER,
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "0.06em",
              background: YELLOW,
              color: "#000000",
              borderRadius: 9999,
              padding: "14px 40px",
              cursor: "pointer",
              transition: "transform 0.15s",
              transform: ctaHovered ? "scale(1.04)" : "scale(1)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
            }}
          >
            BEGIN RESEARCH
          </span>
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div className="right-col" style={{ textAlign: "right", paddingTop: 32 }}>
        <h2
          className="animate-fade-rise"
          style={{
            fontFamily: SPACE_GROTESK,
            fontSize: "clamp(48px, 5.5vw, 72px)",
            fontWeight: 900,
            color: "#000000",
            lineHeight: 0.92,
            letterSpacing: -2,
            margin: 0,
          }}
        >
          All
          <br />
          research
          <br />
          process
        </h2>
        <p
          className="animate-fade-rise-delay"
          style={{
            fontFamily: INTER,
            fontSize: "clamp(14px, 1.2vw, 18px)",
            letterSpacing: "0.12em",
            color: "#555555",
            marginTop: 20,
            fontWeight: 500,
          }}
        >
          IN ONE SET
        </p>
      </div>
    </section>
  );
}
