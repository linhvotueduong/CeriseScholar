export default function DesignPreview5() {
  const display = "'Fraunces', serif";
  const body = "'Plus Jakarta Sans', sans-serif";
  const bg = "#E8E8E8";
  const accent = "#FFD740";
  const dark = "#1E1B4B";
  const img = "https://res.cloudinary.com/dbc0ygwsm/image/upload/f_auto,q_auto/ế_ekoezc";

  /*
   * Canva canvas = 1920 × 1080.  Nav = 1920 × 108.  Hero = 1920 × 972.
   * All hero children use % of the hero box.
   * The hero box is aspect-ratio locked to 1920/972 so positions
   * stay correct at ANY viewport size.
   */
  return (
    <div style={{ background: bg, fontFamily: body, color: "#111", width: "100vw", height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>

      {/* NAV — 1920 × 108 */}
      <nav style={{
        flexShrink: 0,
        height: "10vh",
        background: bg,
        borderBottom: "1px solid rgba(0,0,0,0.08)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 5.2%",
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

      {/* HERO — aspect-ratio locked container, centered in remaining space */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <div style={{
          position: "relative",
          width: "100%",
          maxHeight: "90vh",
          aspectRatio: "1920 / 972",
          containerType: "inline-size" as React.CSSProperties["containerType"],
        }}>

          {/* IMAGE — 1253.7×822.9 at (333.2, 79.3) in hero coords */}
          {/* hero-relative: left 17.35%, top 8.16%, w 65.3%, h 84.66% */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img} alt="Cerise Scholar" style={{
            position: "absolute",
            left: "17.35%",
            top: "8.16%",
            width: "65.3%",
            height: "84.66%",
            objectFit: "contain",
            zIndex: 5,
          }} />

          {/* LEFT HEADING — at (40.5, 374.5) in hero → 2.1%, 38.5% */}
          <div style={{
            position: "absolute",
            left: "2.1%",
            top: "38.5%",
            zIndex: 10,
          }}>
            <h2 style={{
              fontFamily: display,
              fontSize: "8.3cqw",
              fontWeight: 900,
              lineHeight: 0.85,
              letterSpacing: "-0.2cqw",
              color: "#000",
              margin: 0,
            }}>
              AI<br />scholar<br />friend
            </h2>
            <p style={{
              fontSize: "1.25cqw",
              fontWeight: 600,
              letterSpacing: "0.13cqw",
              color: "#000",
              textTransform: "uppercase",
              lineHeight: 1.5,
              fontFamily: body,
              margin: 0,
              marginTop: "1.5cqw",
            }}>
              READ &middot; HIGHLIGHT &middot; REVIEW<br />ASK &middot; ANALYZE &middot; WRITE
            </p>
          </div>

          {/* RIGHT HEADING — at (1447.3, 432) in hero → 75.4%, 44.4% */}
          <div style={{
            position: "absolute",
            left: "75.4%",
            top: "44.4%",
            zIndex: 10,
            textAlign: "right",
          }}>
            <h2 style={{
              fontFamily: display,
              fontSize: "6.7cqw",
              fontWeight: 900,
              lineHeight: 0.85,
              letterSpacing: "-0.2cqw",
              color: "#000",
              margin: 0,
            }}>
              All<br />research<br />process
            </h2>
            <p style={{
              fontSize: "0.93cqw",
              fontWeight: 700,
              letterSpacing: "0.16cqw",
              color: "#000",
              textTransform: "uppercase",
              fontFamily: body,
              margin: 0,
              marginTop: "1.5cqw",
            }}>
              IN ONE SIT
            </p>
          </div>

          {/* BUTTON — at (829.5, 864) in hero → center 51.7%, top 88.9% */}
          <div style={{
            position: "absolute",
            left: "50%",
            top: "88.9%",
            transform: "translateX(-50%)",
            zIndex: 20,
          }}>
            <span style={{
              display: "inline-block",
              background: `linear-gradient(180deg, ${accent} 0%, #F5CC33 100%)`,
              color: dark,
              borderRadius: 9999,
              padding: "1.8cqw 4.5cqw",
              fontSize: "1.15cqw",
              fontWeight: 700,
              letterSpacing: "0.2cqw",
              textTransform: "uppercase",
              cursor: "pointer",
              boxShadow: "0 6px 20px rgba(255,215,64,0.4), 0 2px 6px rgba(0,0,0,0.08)",
            }}>
              Begin Research
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
