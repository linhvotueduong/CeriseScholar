export default function DesignPreview() {
  const purple = "#3D1B7F";
  const yellow = "#F5D76E";

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", position: "relative", fontFamily: "'Inter', sans-serif" }}>

      {/* Layer 0: Snow background — fullscreen behind everything */}
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundImage: "url('/snow-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center bottom",
        backgroundRepeat: "no-repeat",
        backgroundColor: "#f5f3ef",
        zIndex: 0,
      }} />

      {/* Layer 1: "LET'S THINK OUTSIDE THE BOX" image — centered */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -48%)",
        zIndex: 1,
        pointerEvents: "none",
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/think-text.png"
          alt="Let's Think Outside The Box"
          style={{ width: "clamp(400px, 42vw, 600px)", height: "auto" }}
        />
      </div>

      {/* Layer 2: Characters cluster — on top of text, compact */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -52%)",
        zIndex: 2,
        pointerEvents: "none",
        width: "clamp(500px, 50vw, 700px)",
      }}>
        {/* Top row — 3 characters */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 0 }}>
          <div style={{ width: "clamp(140px, 14vw, 190px)", height: "clamp(140px, 14vw, 190px)" }}>
            <video autoPlay loop muted playsInline style={{ width: "100%", height: "100%", objectFit: "contain" }}>
              <source src="/Woman_sitting_transparent.webm" type="video/webm" />
            </video>
          </div>
          <div style={{ width: "clamp(150px, 15vw, 210px)", height: "clamp(150px, 15vw, 210px)" }}>
            <video autoPlay loop muted playsInline style={{ width: "100%", height: "100%", objectFit: "contain" }}>
              <source src="/Animate_character_typing_transparent.webm" type="video/webm" />
            </video>
          </div>
          <div style={{ width: "clamp(140px, 14vw, 190px)", height: "clamp(140px, 14vw, 190px)" }}>
            <video autoPlay loop muted playsInline style={{ width: "100%", height: "100%", objectFit: "contain" }}>
              <source src="/Woman_pointing_at_board_transparent.webm" type="video/webm" />
            </video>
          </div>
        </div>
        {/* Bottom row — 3 characters */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", gap: 16, marginTop: -20 }}>
          <div style={{ width: "clamp(140px, 14vw, 190px)", height: "clamp(140px, 14vw, 190px)" }}>
            <video autoPlay loop muted playsInline style={{ width: "100%", height: "100%", objectFit: "contain" }}>
              <source src="/Woman_working_transparent.webm" type="video/webm" />
            </video>
          </div>
          <div style={{ width: "clamp(150px, 15vw, 210px)", height: "clamp(150px, 15vw, 210px)" }}>
            <video autoPlay loop muted playsInline style={{ width: "100%", height: "100%", objectFit: "contain" }}>
              <source src="/Woman_reading_surrounded_transparent.webm" type="video/webm" />
            </video>
          </div>
          <div style={{ width: "clamp(140px, 14vw, 190px)", height: "clamp(140px, 14vw, 190px)" }}>
            <video autoPlay loop muted playsInline style={{ width: "100%", height: "100%", objectFit: "contain" }}>
              <source src="/Woman_typing_transparent.webm" type="video/webm" />
            </video>
          </div>
        </div>
      </div>

      {/* Layer 3: Left side text */}
      <div style={{
        position: "absolute",
        left: 32,
        top: "42%",
        transform: "translateY(-50%)",
        zIndex: 3,
        color: "#1a1a1a",
      }}>
        <h2 style={{
          fontFamily: "'League Spartan', sans-serif",
          fontSize: "clamp(28px, 3.5vw, 52px)",
          fontWeight: 800,
          lineHeight: 1,
          marginBottom: 12,
        }}>
          AI<br />scholar<br />friend
        </h2>
        <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1, color: "#555", lineHeight: 1.6, textTransform: "uppercase" }}>
          Read · Highlight · Review · Ask ·<br />Analyze · Write
        </p>
      </div>

      {/* Layer 3: Right side text */}
      <div style={{
        position: "absolute",
        right: 32,
        top: "42%",
        transform: "translateY(-50%)",
        zIndex: 3,
        color: "#1a1a1a",
        textAlign: "right",
      }}>
        <h2 style={{
          fontFamily: "'League Spartan', sans-serif",
          fontSize: "clamp(28px, 3.5vw, 52px)",
          fontWeight: 800,
          lineHeight: 1,
          marginBottom: 12,
        }}>
          All<br />research<br />process
        </h2>
        <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1, color: "#555" }}>
          IN ONE SET
        </p>
      </div>

      {/* Layer 10: Navigation bar */}
      <nav style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 32px",
        background: yellow,
        zIndex: 10,
      }}>
        <span style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 20, fontWeight: 700, color: purple }}>
          Cerise Scholar
        </span>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          {["Home", "About", "Research Guide", "Workspace"].map((s, i) => (
            <span key={s} style={{
              fontSize: 13,
              color: purple,
              cursor: "pointer",
              fontWeight: i === 0 ? 700 : 500,
              textDecoration: i === 0 ? "underline" : "none",
              textUnderlineOffset: 4,
            }}>{s}</span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: purple, cursor: "pointer", fontWeight: 500 }}>Log In</span>
          <span style={{
            fontSize: 13,
            color: "white",
            background: purple,
            borderRadius: 20,
            padding: "7px 18px",
            cursor: "pointer",
            fontWeight: 600,
          }}>Sign Up Free</span>
        </div>
      </nav>

      {/* Layer 10: BEGIN RESEARCH button */}
      <div style={{
        position: "absolute",
        bottom: 40,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10,
      }}>
        <span style={{
          display: "inline-block",
          padding: "12px 44px",
          background: yellow,
          color: purple,
          fontWeight: 700,
          fontSize: 15,
          borderRadius: 28,
          cursor: "pointer",
          letterSpacing: 1.5,
          textTransform: "uppercase",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}>
          BEGIN RESEARCH
        </span>
      </div>
    </div>
  );
}
