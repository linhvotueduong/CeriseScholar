export default function DesignPreview5() {
  const display = "'Fraunces', serif";
  const body = "'Plus Jakarta Sans', sans-serif";
  const bg = "#E8E8E8";
  const accent = "#FFD740";
  const dark = "#1E1B4B";
  const img = "https://res.cloudinary.com/dbc0ygwsm/image/upload/f_auto,q_auto/ế_ekoezc";

  return (
    <div style={{ background: bg, fontFamily: body, color: "#111", height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>

      {/* NAV */}
      <nav style={{ flexShrink: 0, background: bg, borderBottom: "1px solid rgba(0,0,0,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 40px" }}>
        <span style={{ fontFamily: display, fontSize: 18, color: "#000", fontWeight: 900 }}>Cerise Scholar</span>
        <div style={{ display: "flex", gap: 28 }}>
          {["Home", "About", "Research Guide", "Workspace"].map((t, i) => (
            <span key={t} style={{ fontSize: 13, color: i === 0 ? "#000" : "#999", fontWeight: i === 0 ? 600 : 400 }}>{t}</span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 13, color: "#999" }}>Log In</span>
          <span style={{ fontSize: 12, padding: "8px 18px", borderRadius: 9999, background: "#000", color: "#fff", fontWeight: 600 }}>Sign Up Free</span>
        </div>
      </nav>

      {/* HERO */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>

        {/* Image — 55% width, centered vertically and horizontally */}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", paddingBottom: 40 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img} alt="Cerise Scholar" style={{ width: "55%", height: "auto", display: "block", objectFit: "contain" }} />
        </div>

        {/* Left text — big, overlapping bottom-left of illustration */}
        <div style={{ position: "absolute", left: 28, bottom: "8%", zIndex: 10 }}>
          <h2 style={{ fontFamily: display, fontSize: "clamp(3rem,5.5vw,5.5rem)", fontWeight: 900, lineHeight: 0.88, letterSpacing: "-2px", color: "#000" }}>
            AI<br />scholar<br />friend
          </h2>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "1.5px", color: "#000", marginTop: 10, textTransform: "uppercase", lineHeight: 1.5 }}>
            READ &middot; HIGHLIGHT &middot; REVIEW<br />ASK &middot; ANALYZE &middot; WRITE
          </p>
        </div>

        {/* Right text — big, overlapping bottom-right of illustration */}
        <div style={{ position: "absolute", right: 28, bottom: "8%", zIndex: 10, textAlign: "right" }}>
          <h2 style={{ fontFamily: display, fontSize: "clamp(3rem,5.5vw,5.5rem)", fontWeight: 900, lineHeight: 0.88, letterSpacing: "-2px", color: "#000" }}>
            All<br />research<br />process
          </h2>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "2.5px", color: "#000", marginTop: 10, textTransform: "uppercase" }}>
            IN ONE SIT
          </p>
        </div>

        {/* CTA */}
        <div style={{ position: "absolute", bottom: "2%", left: "50%", transform: "translateX(-50%)", zIndex: 20 }}>
          <span style={{ display: "inline-block", background: accent, color: dark, borderRadius: 9999, padding: "14px 44px", fontSize: 12, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", cursor: "pointer" }}>
            Begin Research
          </span>
        </div>
      </div>
    </div>
  );
}
