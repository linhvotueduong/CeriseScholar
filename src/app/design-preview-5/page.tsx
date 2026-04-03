export default function DesignPreview5() {
  const display = "'Fraunces', serif";
  const body = "'Plus Jakarta Sans', sans-serif";
  const bg = "#E8E8E8";
  const accent = "#FFD740";
  const dark = "#1E1B4B";
  const imgUrl = "https://res.cloudinary.com/dbc0ygwsm/image/upload/f_auto,q_auto/ế_fnxqsd";

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

      {/* ═══ HERO — one unified composition ═══ */}
      <section style={{ position: "relative", width: "100%", maxWidth: 1440, margin: "0 auto", minHeight: "calc(100vh - 60px)" }}>

        {/* Background illustration — full width */}
        <div style={{ position: "relative", width: "100%", display: "flex", justifyContent: "center", paddingTop: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgUrl} alt="Cerise Scholar" style={{ width: "100%", maxWidth: 1440, height: "auto", display: "block" }} />
        </div>

        {/* Left text — absolute, overlapping illustration */}
        <div style={{ position: "absolute", left: "3%", bottom: "12%", zIndex: 20, textAlign: "left" }}>
          <h2 style={{ fontFamily: display, fontSize: "clamp(2.5rem,5.5vw,6.5rem)", fontWeight: 900, lineHeight: 0.88, letterSpacing: "-3px", color: "#000" }}>
            AI<br />scholar<br />friend
          </h2>
          <p style={{ fontSize: "clamp(10px,1vw,13px)", fontWeight: 600, letterSpacing: "2px", color: "#000", marginTop: 14, textTransform: "uppercase", lineHeight: 1.8 }}>
            SCHOLARASK, LIT REVIEW,<br />META-ANALYSIS
          </p>
        </div>

        {/* Right text — absolute, overlapping illustration */}
        <div style={{ position: "absolute", right: "3%", bottom: "12%", zIndex: 20, textAlign: "right" }}>
          <h2 style={{ fontFamily: display, fontSize: "clamp(2.5rem,5.5vw,6.5rem)", fontWeight: 900, lineHeight: 0.88, letterSpacing: "-3px", color: "#000" }}>
            All<br />research<br />process
          </h2>
          <p style={{ fontSize: "clamp(10px,1vw,14px)", fontWeight: 700, letterSpacing: "3px", color: "#000", marginTop: 14, textTransform: "uppercase" }}>
            IN ONE SIT
          </p>
        </div>

        {/* CTA — centered at bottom, overlapping illustration */}
        <div style={{ position: "absolute", bottom: "3%", left: "50%", transform: "translateX(-50%)", zIndex: 30 }}>
          <span style={{ display: "inline-block", background: accent, color: dark, borderRadius: 9999, padding: "16px 48px", fontSize: "clamp(11px,1vw,14px)", fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
            Begin Research
          </span>
        </div>
      </section>

      {/* ═══ FEATURE TICKER ═══ */}
      <div style={{ background: "#000", padding: "18px 0", overflow: "hidden" }}>
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
