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
      <nav style={{ flexShrink: 0, background: bg, borderBottom: "1px solid rgba(0,0,0,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "min(2vh, 20px) min(5vw, 80px)" }}>
        <span style={{ fontFamily: display, fontSize: "min(3vw, 28px)", color: "#000", fontWeight: 900 }}>Cerise Scholar</span>
        <div style={{ display: "flex", gap: "min(3vw, 48px)" }}>
          {["Home", "About", "Research Guide", "Workspace"].map((t, i) => (
            <span key={t} style={{ fontSize: "min(1.6vw, 18px)", color: i === 0 ? "#000" : "#999", fontWeight: i === 0 ? 600 : 400 }}>{t}</span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "min(2vw, 24px)" }}>
          <span style={{ fontSize: "min(1.6vw, 18px)", color: "#999" }}>Log In</span>
          <span style={{ fontSize: "min(1.4vw, 16px)", padding: "min(1.2vh, 14px) min(2.5vw, 32px)", borderRadius: 9999, background: "#000", color: "#fff", fontWeight: 600 }}>Sign Up Free</span>
        </div>
      </nav>

      {/* HERO — single viewport composition */}
      <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>

        {/* Image — uses height to fill available space */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img} alt="Cerise Scholar" style={{ height: "80%", width: "auto", maxWidth: "55vw", objectFit: "contain", display: "block", position: "relative", zIndex: 5 }} />

        {/* Left text */}
        <div style={{ position: "absolute", left: "min(3vw, 80px)", top: "50%", transform: "translateY(-20%)", zIndex: 10 }}>
          <h2 style={{ fontFamily: display, fontSize: "min(8vw, 9rem)", fontWeight: 900, lineHeight: 0.85, letterSpacing: "-3px", color: "#000" }}>
            AI<br />scholar<br />friend
          </h2>
          <p style={{ fontSize: "min(1.3vw, 16px)", fontWeight: 600, letterSpacing: "2px", color: "#000", marginTop: "min(1.5vh, 16px)", textTransform: "uppercase", lineHeight: 1.5 }}>
            READ &middot; HIGHLIGHT &middot; REVIEW<br />ASK &middot; ANALYZE &middot; WRITE
          </p>
        </div>

        {/* Right text */}
        <div style={{ position: "absolute", right: "min(3vw, 80px)", top: "50%", transform: "translateY(-20%)", zIndex: 10, textAlign: "right" }}>
          <h2 style={{ fontFamily: display, fontSize: "min(8vw, 9rem)", fontWeight: 900, lineHeight: 0.85, letterSpacing: "-3px", color: "#000" }}>
            All<br />research<br />process
          </h2>
          <p style={{ fontSize: "min(1.3vw, 16px)", fontWeight: 700, letterSpacing: "3px", color: "#000", marginTop: "min(1.5vh, 16px)", textTransform: "uppercase" }}>
            IN ONE SIT
          </p>
        </div>

        {/* CTA — pinned near bottom of hero area */}
        <div style={{ position: "absolute", bottom: "min(3vh, 30px)", left: "50%", transform: "translateX(-50%)", zIndex: 20 }}>
          <span style={{ display: "inline-block", background: accent, color: dark, borderRadius: 9999, padding: "min(1.8vh, 20px) min(5vw, 72px)", fontSize: "min(1.4vw, 18px)", fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", cursor: "pointer" }}>
            Begin Research
          </span>
        </div>
      </div>
    </div>
  );
}
