export default function DesignPreview5() {
  const display = "'Fraunces', serif";
  const body = "'Plus Jakarta Sans', sans-serif";
  const bg = "#E8E8E8";
  const accent = "#FFD740";
  const dark = "#1E1B4B";
  const img = "https://res.cloudinary.com/dbc0ygwsm/image/upload/f_auto,q_auto/ế_ekoezc";

  /* Canva canvas: 1920 × 1080. Using aspect-ratio lock so layout never distorts. */
  return (
    <div style={{ background: bg, fontFamily: body, color: "#111", width: "100vw", height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>

      {/* NAV — 1920×108 */}
      <nav style={{
        flexShrink: 0,
        height: "10vh",
        background: bg,
        borderBottom: "1px solid rgba(0,0,0,0.08)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 5.2vw",
        zIndex: 50,
      }}>
        <span style={{ fontFamily: display, fontSize: "2.1vw", color: "#000", fontWeight: 900 }}>Cerise Scholar</span>
        <div style={{ display: "flex", gap: "2.6vw" }}>
          {["Home", "About", "Research Guide", "Workspace"].map((t, i) => (
            <span key={t} style={{ fontSize: "1.15vw", color: i === 0 ? "#000" : "#999", fontWeight: i === 0 ? 600 : 400 }}>{t}</span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5vw" }}>
          <span style={{ fontSize: "1.15vw", color: "#999" }}>Log In</span>
          <span style={{ fontSize: "1vw", padding: "0.9vh 1.8vw", borderRadius: 9999, background: "#000", color: "#fff", fontWeight: 600 }}>Sign Up Free</span>
        </div>
      </nav>

      {/* HERO — 90vh remaining, use it as the canvas */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>

        {/* IMAGE — centered, 65.3% of page width, auto height to maintain aspect ratio */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img} alt="Cerise Scholar" style={{
          position: "absolute",
          left: "50%",
          top: "5%",
          transform: "translateX(-50%)",
          width: "65.3vw",
          height: "auto",
          objectFit: "contain",
          zIndex: 5,
        }} />

        {/* LEFT — heading + subtitle grouped together */}
        <div style={{
          position: "absolute",
          left: "2.1%",
          top: "38%",
          zIndex: 10,
        }}>
          <h2 style={{
            fontFamily: display,
            fontSize: "8.3vw",
            fontWeight: 900,
            lineHeight: 0.85,
            letterSpacing: "-0.2vw",
            color: "#000",
            margin: 0,
          }}>
            AI<br />scholar<br />friend
          </h2>
          <p style={{
            fontSize: "1.25vw",
            fontWeight: 600,
            letterSpacing: "0.13vw",
            color: "#000",
            textTransform: "uppercase",
            lineHeight: 1.5,
            fontFamily: body,
            margin: 0,
            marginTop: "1.5vh",
          }}>
            READ &middot; HIGHLIGHT &middot; REVIEW<br />ASK &middot; ANALYZE &middot; WRITE
          </p>
        </div>

        {/* RIGHT — heading + subtitle grouped together */}
        <div style={{
          position: "absolute",
          right: "1.7%",
          top: "44%",
          zIndex: 10,
          textAlign: "right",
        }}>
          <h2 style={{
            fontFamily: display,
            fontSize: "6.7vw",
            fontWeight: 900,
            lineHeight: 0.85,
            letterSpacing: "-0.2vw",
            color: "#000",
            margin: 0,
          }}>
            All<br />research<br />process
          </h2>
          <p style={{
            fontSize: "0.93vw",
            fontWeight: 700,
            letterSpacing: "0.16vw",
            color: "#000",
            textTransform: "uppercase",
            fontFamily: body,
            margin: 0,
            marginTop: "1.5vh",
          }}>
            IN ONE SIT
          </p>
        </div>

        {/* BUTTON — 324.6×76.4, pinned near bottom */}
        <div style={{
          position: "absolute",
          left: "50%",
          bottom: "3%",
          transform: "translateX(-50%)",
          zIndex: 20,
        }}>
          <span style={{
            display: "inline-block",
            background: `linear-gradient(180deg, ${accent} 0%, #F5CC33 100%)`,
            color: dark,
            borderRadius: 9999,
            padding: "2.2vh 4.5vw",
            fontSize: "1.15vw",
            fontWeight: 700,
            letterSpacing: "0.2vw",
            textTransform: "uppercase",
            cursor: "pointer",
            boxShadow: "0 6px 20px rgba(255,215,64,0.4), 0 2px 6px rgba(0,0,0,0.08)",
          }}>
            Begin Research
          </span>
        </div>
      </div>
    </div>
  );
}
