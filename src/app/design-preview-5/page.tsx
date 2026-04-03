export default function DesignPreview5() {
  const display = "'Fraunces', serif";
  const body = "'Plus Jakarta Sans', sans-serif";
  const bg = "#E8E8E8";
  const accent = "#FFD740";
  const dark = "#1E1B4B";
  const img = "https://res.cloudinary.com/dbc0ygwsm/image/upload/f_auto,q_auto/ế_ekoezc";

  return (
    <div style={{ background: bg, fontFamily: body, color: "#111", height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>

      {/* NAV — bigger */}
      <nav style={{ flexShrink: 0, background: bg, borderBottom: "1px solid rgba(0,0,0,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "min(3vh, 28px) min(6vw, 100px)" }}>
        <span style={{ fontFamily: display, fontSize: "min(4vw, 36px)", color: "#000", fontWeight: 900 }}>Cerise Scholar</span>
        <div style={{ display: "flex", gap: "min(4vw, 56px)" }}>
          {["Home", "About", "Research Guide", "Workspace"].map((t, i) => (
            <span key={t} style={{ fontSize: "min(2.2vw, 22px)", color: i === 0 ? "#000" : "#999", fontWeight: i === 0 ? 600 : 400 }}>{t}</span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "min(2.5vw, 28px)" }}>
          <span style={{ fontSize: "min(2.2vw, 22px)", color: "#999" }}>Log In</span>
          <span style={{ fontSize: "min(2vw, 20px)", padding: "min(1.6vh, 16px) min(3.5vw, 40px)", borderRadius: 9999, background: "#000", color: "#fff", fontWeight: 600 }}>Sign Up Free</span>
        </div>
      </nav>

      {/* HERO */}
      <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>

        {/* Image — smaller */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img} alt="Cerise Scholar" style={{ height: "72%", width: "auto", maxWidth: "50vw", objectFit: "contain", display: "block", position: "relative", zIndex: 5 }} />

        {/* Left text — bigger */}
        <div style={{ position: "absolute", left: "min(3vw, 80px)", top: "50%", transform: "translateY(-20%)", zIndex: 10 }}>
          <h2 style={{ fontFamily: display, fontSize: "min(10vw, 11rem)", fontWeight: 900, lineHeight: 0.85, letterSpacing: "-4px", color: "#000" }}>
            AI<br />scholar<br />friend
          </h2>
          <p style={{ fontSize: "min(1.8vw, 20px)", fontWeight: 600, letterSpacing: "2.5px", color: "#000", marginTop: "min(2vh, 20px)", textTransform: "uppercase", lineHeight: 1.5 }}>
            READ &middot; HIGHLIGHT &middot; REVIEW<br />ASK &middot; ANALYZE &middot; WRITE
          </p>
        </div>

        {/* Right text — bigger */}
        <div style={{ position: "absolute", right: "min(3vw, 80px)", top: "50%", transform: "translateY(-20%)", zIndex: 10, textAlign: "right" }}>
          <h2 style={{ fontFamily: display, fontSize: "min(10vw, 11rem)", fontWeight: 900, lineHeight: 0.85, letterSpacing: "-4px", color: "#000" }}>
            All<br />research<br />process
          </h2>
          <p style={{ fontSize: "min(1.8vw, 20px)", fontWeight: 700, letterSpacing: "3px", color: "#000", marginTop: "min(2vh, 20px)", textTransform: "uppercase" }}>
            IN ONE SIT
          </p>
        </div>

        {/* CTA — bigger with gradient/shadow effect like the reference */}
        <div style={{ position: "absolute", bottom: "min(4vh, 40px)", left: "50%", transform: "translateX(-50%)", zIndex: 20 }}>
          <span style={{
            display: "inline-block",
            background: `linear-gradient(180deg, ${accent} 0%, #F5CC33 100%)`,
            color: dark,
            borderRadius: 9999,
            padding: "min(2.5vh, 28px) min(7vw, 100px)",
            fontSize: "min(2vw, 22px)",
            fontWeight: 700,
            letterSpacing: "4px",
            textTransform: "uppercase",
            cursor: "pointer",
            boxShadow: "0 6px 20px rgba(255,215,64,0.4), 0 2px 6px rgba(0,0,0,0.08)",
            border: "none",
          }}>
            Begin Research
          </span>
        </div>
      </div>
    </div>
  );
}
