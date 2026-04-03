export default function DesignPreview5() {
  const display = "'Fraunces', serif";
  const body = "'Plus Jakarta Sans', sans-serif";
  const bg = "#E8E8E8";
  const accent = "#FFD740";
  const dark = "#1E1B4B";
  const img = "https://res.cloudinary.com/dbc0ygwsm/image/upload/f_auto,q_auto/ế_ekoezc";

  return (
    <div style={{ background: bg, fontFamily: body, color: "#111", width: "100vw", minHeight: "100vh", display: "flex", flexDirection: "column" }}>

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

      {/* HERO — 3-column grid, all vw-based */}
      <div style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "27vw 1fr 27vw",
        minHeight: 0,
      }}>

        {/* LEFT COLUMN */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 1.5vw 0 3vw",
        }}>
          <h2 style={{
            fontFamily: display,
            fontSize: "6.5vw",
            fontWeight: 500,
            lineHeight: 0.88,
            letterSpacing: "0.3vw",
            color: "#000",
            margin: 0,
          }}>
            AI<br />scholar<br />friend
          </h2>
          <p style={{
            fontSize: "0.85vw",
            fontWeight: 600,
            letterSpacing: "0.07vw",
            color: "#000",
            textTransform: "uppercase",
            lineHeight: 1.8,
            fontFamily: body,
            margin: 0,
            marginTop: "0.8vw",
          }}>
            READ &middot; HIGHLIGHT &middot; REVIEW<br />ASK &middot; ANALYZE &middot; WRITE
          </p>
        </div>

        {/* CENTER COLUMN — image + button */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 0,
          padding: "2vw 3vw",
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img} alt="Cerise Scholar" style={{
            maxWidth: "100%",
            width: "100%",
            objectFit: "contain",
            display: "block",
          }} />
          <span style={{
            display: "block",
            width: "fit-content",
            margin: "1.6vw auto 0",
            background: `linear-gradient(180deg, ${accent} 0%, #F5CC33 100%)`,
            color: dark,
            borderRadius: 9999,
            padding: "1vw 3vw",
            fontSize: "0.8vw",
            fontWeight: 700,
            letterSpacing: "0.2vw",
            textTransform: "uppercase",
            cursor: "pointer",
            boxShadow: "0 6px 20px rgba(255,215,64,0.4), 0 2px 6px rgba(0,0,0,0.08)",
          }}>
            Begin Research
          </span>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-end",
          padding: "0 3vw 0 1.5vw",
          textAlign: "right",
        }}>
          <h2 style={{
            fontFamily: display,
            fontSize: "6.5vw",
            fontWeight: 500,
            lineHeight: 0.88,
            letterSpacing: "0.3vw",
            color: "#000",
            margin: 0,
          }}>
            All<br />research<br />process
          </h2>
          <p style={{
            fontSize: "0.75vw",
            fontWeight: 700,
            letterSpacing: "0.18vw",
            color: "#000",
            textTransform: "uppercase",
            fontFamily: body,
            margin: 0,
            marginTop: "0.8vw",
            whiteSpace: "nowrap",
          }}>
            IN ONE SIT
          </p>
        </div>
      </div>
    </div>
  );
}
