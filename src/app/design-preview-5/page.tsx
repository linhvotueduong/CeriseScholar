export default function DesignPreview5() {
  const display = "'Fraunces', serif";
  const body = "'Plus Jakarta Sans', sans-serif";
  const bg = "#E8E8E8";
  const accent = "#FFD740";
  const dark = "#1E1B4B";
  const img = "https://res.cloudinary.com/dbc0ygwsm/image/upload/f_auto,q_auto/ế_ekoezc";

  /* All positions/sizes derived from Canva canvas: 1920 × 1080 */
  return (
    <div style={{ background: bg, fontFamily: body, color: "#111", width: "100vw", height: "100vh", overflow: "hidden", position: "relative" }}>

      {/* NAV — 1920×108 → height 10vh */}
      <nav style={{
        position: "absolute", top: 0, left: 0, right: 0,
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

      {/* IMAGE — 1253.7×822.9 at (333.2, 187.3) → 65.3vw × 76.2vh at (17.35%, 17.34%) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img} alt="Cerise Scholar" style={{
        position: "absolute",
        left: "17.35%",
        top: "17.34%",
        width: "65.3vw",
        height: "76.2vh",
        objectFit: "contain",
        zIndex: 5,
      }} />

      {/* LEFT HEADING — 568.2×406.1 at (40.5, 482.5) → left 2.1%, top 44.7% */}
      <div style={{
        position: "absolute",
        left: "2.1%",
        top: "44.7%",
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
      </div>

      {/* LEFT SUBTITLE — 568.2×72 at (40.5, 904.5) → left 2.1%, top 83.75% */}
      <p style={{
        position: "absolute",
        left: "2.1%",
        top: "83.75%",
        fontSize: "1.25vw",
        fontWeight: 600,
        letterSpacing: "0.13vw",
        color: "#000",
        textTransform: "uppercase",
        lineHeight: 1.5,
        fontFamily: body,
        margin: 0,
        zIndex: 10,
      }}>
        READ &middot; HIGHLIGHT &middot; REVIEW<br />ASK &middot; ANALYZE &middot; WRITE
      </p>

      {/* RIGHT HEADING — 439.7×326.3 at (1447.3, 540) → left 75.4%, top 50% */}
      <div style={{
        position: "absolute",
        left: "75.4%",
        top: "50%",
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
      </div>

      {/* RIGHT SUBTITLE — 439.7×26.7 at (1447.3, 878.6) → left 75.4%, top 81.35% */}
      <p style={{
        position: "absolute",
        left: "75.4%",
        top: "81.35%",
        fontSize: "0.93vw",
        fontWeight: 700,
        letterSpacing: "0.16vw",
        color: "#000",
        textTransform: "uppercase",
        fontFamily: body,
        margin: 0,
        zIndex: 10,
        textAlign: "right",
        width: "22.9vw",
      }}>
        IN ONE SIT
      </p>

      {/* BUTTON — 324.6×76.4 at (829.5, 972) → centered at ~51.7%, top 90% */}
      <div style={{
        position: "absolute",
        left: "50%",
        top: "90%",
        transform: "translateX(-50%)",
        zIndex: 20,
      }}>
        <span style={{
          display: "inline-block",
          background: `linear-gradient(180deg, ${accent} 0%, #F5CC33 100%)`,
          color: dark,
          borderRadius: 9999,
          width: "16.9vw",
          height: "7.07vh",
          lineHeight: "7.07vh",
          textAlign: "center",
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
  );
}
