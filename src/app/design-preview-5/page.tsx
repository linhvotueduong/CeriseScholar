export default function DesignPreview5() {
  const s = "'Instrument Serif',serif";
  const g = "#6F6F6F";
  const b = "#000";
  const bg = "#F2F0ED";

  return (
    <div style={{ background: bg, fontFamily: "'Inter',sans-serif", minHeight: "100vh", overflow: "hidden" }}>
      {/* ═══ NAVBAR ═══ */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 48px", maxWidth: 1400, margin: "0 auto" }}>
        <span style={{ fontFamily: s, fontSize: 26, color: b, letterSpacing: "-0.5px" }}>Cerise Scholar</span>
        <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
          {["Home", "About", "Research Guide", "Workspace"].map((t, i) => (
            <span key={t} style={{ fontSize: 14, color: i === 0 ? b : g, fontWeight: i === 0 ? 600 : 400, cursor: "pointer", letterSpacing: "0.5px" }}>{t}</span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 14, color: g, cursor: "pointer" }}>Log In</span>
          <span style={{ fontSize: 14, padding: "10px 24px", borderRadius: 9999, background: b, color: "#fff", cursor: "pointer", fontWeight: 500 }}>Sign Up Free</span>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section style={{ position: "relative", maxWidth: 1400, margin: "0 auto", padding: "40px 48px 60px", minHeight: "calc(100vh - 80px)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {/* Three-column layout: left text, center illustration, right text */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0 }}>

          {/* Left text block */}
          <div style={{ flex: "0 0 280px", textAlign: "left", zIndex: 10 }}>
            <h2 style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(3rem,6vw,5.5rem)", fontWeight: 900, lineHeight: 0.9, color: b, letterSpacing: "-2px" }}>
              Your<br />AI scholar<br />friend
            </h2>
            <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: "1.5px", color: g, marginTop: 20, textTransform: "uppercase", lineHeight: 1.5 }}>
              Read &middot; Highlight &middot; Review<br />Ask &middot; Analyze &middot; Write
            </p>
          </div>

          {/* Center illustration */}
          <div style={{ flex: "1 1 auto", maxWidth: 700, position: "relative", zIndex: 5 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/hero-illustration.png"
              alt="Cerise Scholar - Let's Think Outside The Box"
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </div>

          {/* Right text block */}
          <div style={{ flex: "0 0 280px", textAlign: "right", zIndex: 10 }}>
            <h2 style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(3rem,6vw,5.5rem)", fontWeight: 900, lineHeight: 0.9, color: b, letterSpacing: "-2px" }}>
              All<br />research<br />process
            </h2>
            <p style={{ fontSize: 14, fontWeight: 700, letterSpacing: "2px", color: g, marginTop: 20, textTransform: "uppercase" }}>
              IN ONE SIT
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <div style={{ textAlign: "center", marginTop: 32, position: "relative", zIndex: 10 }}>
          <span style={{ display: "inline-block", padding: "18px 56px", borderRadius: 9999, background: b, color: "#fff", fontSize: 16, fontWeight: 700, letterSpacing: "2px", cursor: "pointer", textTransform: "uppercase" }}>
            Begin Research
          </span>
        </div>
      </section>

      {/* ═══ BANNER / SCROLL HINT ═══ */}
      <div style={{ background: b, padding: "20px 0", overflow: "hidden" }}>
        <div style={{ display: "flex", gap: 80, whiteSpace: "nowrap", animation: "none" }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ display: "flex", gap: 80 }}>
              {["PDF VIEWER", "SMART HIGHLIGHTING", "LITERATURE REVIEW", "SCHOLARASK AI", "TEXT-TO-SPEECH", "PAPER WRITER", "META-ANALYSIS", "CSV EXPORT"].map((t) => (
                <span key={t + i} style={{ fontSize: 13, fontWeight: 600, letterSpacing: "3px", color: "rgba(255,255,255,0.5)" }}>{t}</span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
