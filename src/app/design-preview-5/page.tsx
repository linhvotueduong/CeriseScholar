export default function DesignPreview5() {
  const display = "'Fraunces', serif";
  const body = "'Plus Jakarta Sans', sans-serif";
  const bg = "#E8E8E8";
  const accent = "#FFD740";
  const dark = "#1E1B4B";
  const muted = "#555";
  const imgUrl = "https://res.cloudinary.com/dbc0ygwsm/image/upload/f_auto,q_auto/ế-3_dokblv";

  return (
    <div style={{ background: bg, fontFamily: body, color: "#111", minHeight: "100vh", overflow: "hidden" }}>

      {/* ═══ NAV ═══ */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: bg, borderBottom: "1px solid rgba(0,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", maxWidth: 1280, margin: "0 auto" }}>
        <span style={{ fontFamily: display, fontSize: 20, color: "#000", fontWeight: 900 }}>Cerise Scholar</span>
        <div style={{ display: "flex", gap: 32 }}>
          {["Home", "About", "Research Guide", "Workspace"].map((t, i) => (
            <span key={t} style={{ fontSize: 14, color: i === 0 ? "#000" : "#888", fontWeight: i === 0 ? 600 : 400, cursor: "pointer" }}>{t}</span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 14, color: "#888" }}>Log In</span>
          <span style={{ fontSize: 14, padding: "8px 20px", borderRadius: 9999, background: "#000", color: "#fff", fontWeight: 600 }}>Sign Up Free</span>
        </div>
      </nav>

      {/* ═══ HERO — single unified section with overlapping layout ═══ */}
      <section style={{ position: "relative", minHeight: "calc(100vh - 60px)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "40px 32px 0", maxWidth: 1400, margin: "0 auto" }}>

        {/* Three-column overlay: text + illustration + text all on same plane */}
        <div style={{ position: "relative", width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>

          {/* Left text — positioned to overlap with illustration */}
          <div style={{ position: "absolute", left: 0, bottom: 0, zIndex: 20, textAlign: "left", maxWidth: 380 }}>
            <h2 style={{ fontFamily: display, fontSize: "clamp(3.5rem,7vw,7rem)", fontWeight: 900, lineHeight: 0.9, letterSpacing: "-3px", color: "#000" }}>
              AI<br />scholar<br />friend
            </h2>
            <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: "2px", color: "#000", marginTop: 16, textTransform: "uppercase", lineHeight: 1.8 }}>
              READ &middot; HIGHLIGHT &middot; REVIEW<br />ASK &middot; ANALYZE &middot; WRITE
            </p>
          </div>

          {/* Center illustration */}
          <div style={{ position: "relative", zIndex: 10, maxWidth: 700, width: "60%" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imgUrl} alt="Cerise Scholar" style={{ width: "100%", height: "auto", display: "block" }} />
          </div>

          {/* Right text — positioned to overlap with illustration */}
          <div style={{ position: "absolute", right: 0, bottom: 0, zIndex: 20, textAlign: "right", maxWidth: 380 }}>
            <h2 style={{ fontFamily: display, fontSize: "clamp(3.5rem,7vw,7rem)", fontWeight: 900, lineHeight: 0.9, letterSpacing: "-3px", color: "#000" }}>
              All<br />research<br />process
            </h2>
            <p style={{ fontSize: 14, fontWeight: 700, letterSpacing: "3px", color: "#000", marginTop: 16, textTransform: "uppercase" }}>
              IN ONE SIT
            </p>
          </div>
        </div>

        {/* CTA below illustration — overlapping slightly */}
        <div style={{ position: "relative", zIndex: 30, marginTop: -20, textAlign: "center" }}>
          <span style={{ display: "inline-block", background: accent, color: dark, borderRadius: 9999, padding: "18px 56px", fontSize: 14, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", cursor: "pointer" }}>
            Begin Research
          </span>
        </div>
      </section>

      {/* ═══ FEATURE TICKER ═══ */}
      <div style={{ background: "#000", padding: "18px 0", marginTop: 40, overflow: "hidden" }}>
        <div style={{ display: "flex", gap: 60, whiteSpace: "nowrap" }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ display: "flex", gap: 60 }}>
              {["PDF VIEWER", "SMART HIGHLIGHTING", "LITERATURE REVIEW", "SCHOLARASK AI", "TEXT-TO-SPEECH", "PAPER WRITER", "META-ANALYSIS"].map((t) => (
                <span key={t + i} style={{ fontSize: 12, fontWeight: 600, letterSpacing: "3px", color: "rgba(255,255,255,0.4)" }}>{t}</span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
