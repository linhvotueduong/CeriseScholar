export default function DesignPreview5() {
  const display = "'Fraunces', serif";
  const body = "'Plus Jakarta Sans', sans-serif";
  const bg = "#E8E8E8";
  const accent = "#FFD740";
  const dark = "#1E1B4B";
  const img = "https://res.cloudinary.com/dbc0ygwsm/image/upload/f_auto,q_auto/ế_ekoezc";

  return (
    <div style={{ background: bg, fontFamily: body, color: "#111", height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>

      {/* ═══ NAV ═══ */}
      <nav style={{ flexShrink: 0, background: bg, borderBottom: "1px solid rgba(0,0,0,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 40px" }}>
        <span style={{ fontFamily: display, fontSize: 22, color: "#000", fontWeight: 900, letterSpacing: "-0.5px" }}>Cerise Scholar</span>
        <div style={{ display: "flex", gap: 36 }}>
          {["Home", "About", "Research Guide", "Workspace"].map((t, i) => (
            <span key={t} style={{ fontSize: 14, color: i === 0 ? "#000" : "#999", fontWeight: i === 0 ? 600 : 400, cursor: "pointer" }}>{t}</span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 14, color: "#999" }}>Log In</span>
          <span style={{ fontSize: 13, padding: "10px 22px", borderRadius: 9999, background: "#000", color: "#fff", fontWeight: 600 }}>Sign Up Free</span>
        </div>
      </nav>

      {/* ═══ HERO — full viewport, image as background with text overlay ═══ */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>

        {/* Image — centered, fills the space */}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img} alt="Cerise Scholar" style={{ height: "100%", width: "auto", maxWidth: "none", display: "block", objectFit: "contain" }} />
        </div>

        {/* Left text overlay */}
        <div style={{ position: "absolute", left: 32, bottom: 60, zIndex: 10 }}>
          <h2 style={{ fontFamily: display, fontSize: "clamp(3rem,6vw,7rem)", fontWeight: 900, lineHeight: 0.88, letterSpacing: "-3px", color: "#000" }}>
            AI<br />scholar<br />friend
          </h2>
          <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: "1px", color: "#000", marginTop: 16, textTransform: "uppercase", lineHeight: 1.6 }}>
            SCHOLARASK, LIT REVIEW,<br />META-ANALYSIS
          </p>
        </div>

        {/* Right text overlay */}
        <div style={{ position: "absolute", right: 32, bottom: 60, zIndex: 10, textAlign: "right" }}>
          <h2 style={{ fontFamily: display, fontSize: "clamp(3rem,6vw,7rem)", fontWeight: 900, lineHeight: 0.88, letterSpacing: "-3px", color: "#000" }}>
            All<br />research<br />process
          </h2>
          <p style={{ fontSize: 14, fontWeight: 700, letterSpacing: "3px", color: "#000", marginTop: 16, textTransform: "uppercase" }}>
            IN ONE SIT
          </p>
        </div>

        {/* CTA centered at bottom */}
        <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 20 }}>
          <span style={{ display: "inline-block", background: accent, color: dark, borderRadius: 9999, padding: "16px 48px", fontSize: 13, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
            Begin Research
          </span>
        </div>
      </div>
    </div>
  );
}
