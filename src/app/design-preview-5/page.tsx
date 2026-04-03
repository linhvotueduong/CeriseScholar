export default function DesignPreview5() {
  const display = "'Fraunces', serif";
  const body = "'Plus Jakarta Sans', sans-serif";
  const bg = "#E8E8E8";
  const accent = "#FFD740";
  const dark = "#1E1B4B";
  const img = "https://res.cloudinary.com/dbc0ygwsm/image/upload/f_auto,q_auto/ế_ekoezc";

  return (
    <div style={{ background: bg, fontFamily: body, color: "#111", width: "100vw", height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>

      {/* NAV */}
      <nav style={{
        flexShrink: 0,
        background: bg,
        borderBottom: "1px solid rgba(0,0,0,0.08)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "1.4vh 5.2vw",
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
          <span style={{ fontSize: "1vw", padding: "0.7vh 1.8vw", borderRadius: 9999, background: "#000", color: "#fff", fontWeight: 600 }}>Sign Up Free</span>
        </div>
      </nav>

      {/* HERO — flex column, image centered, button below */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5vh", padding: "1vh 0" }}>

        {/* Image wrapper — image + overlapping side text */}
        <div style={{ position: "relative", flexShrink: 1, minHeight: 0 }}>

          {/* Image — takes up available height */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img} alt="Cerise Scholar" style={{
            display: "block",
            height: "70vh",
            width: "auto",
            maxWidth: "65vw",
            objectFit: "contain",
          }} />

          {/* LEFT text — positioned relative to image */}
          <div style={{
            position: "absolute",
            right: "100%",
            bottom: "8%",
            marginRight: "-12vw",
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
              whiteSpace: "nowrap",
            }}>
              AI<br />scholar<br />friend
            </h2>
            <p style={{
              fontSize: "1.1vw",
              fontWeight: 600,
              letterSpacing: "0.13vw",
              color: "#000",
              textTransform: "uppercase",
              lineHeight: 1.5,
              fontFamily: body,
              margin: 0,
              marginTop: "0.8vh",
            }}>
              READ &middot; HIGHLIGHT &middot; REVIEW<br />ASK &middot; ANALYZE &middot; WRITE
            </p>
          </div>

          {/* RIGHT text — positioned relative to image */}
          <div style={{
            position: "absolute",
            left: "100%",
            bottom: "8%",
            marginLeft: "-10vw",
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
              whiteSpace: "nowrap",
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
              marginTop: "0.8vh",
            }}>
              IN ONE SIT
            </p>
          </div>
        </div>

        {/* BUTTON — in normal flow, below the image */}
        <span style={{
          display: "inline-block",
          background: `linear-gradient(180deg, ${accent} 0%, #F5CC33 100%)`,
          color: dark,
          borderRadius: 9999,
          padding: "1.5vh 3.5vw",
          fontSize: "1vw",
          fontWeight: 700,
          letterSpacing: "0.2vw",
          textTransform: "uppercase",
          cursor: "pointer",
          boxShadow: "0 6px 20px rgba(255,215,64,0.4), 0 2px 6px rgba(0,0,0,0.08)",
          flexShrink: 0,
        }}>
          Begin Research
        </span>
      </div>
    </div>
  );
}
