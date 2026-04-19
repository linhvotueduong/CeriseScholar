export default function DesignPreview3() {
  return (
    <div style={{ position: "relative", minHeight: "100vh", width: "100%", overflow: "hidden", background: "#FFFFFF", fontFamily: "'Inter',sans-serif" }}>

      {/* Banner */}
      <div style={{ background: "#111111", textAlign: "center", fontSize: 12, padding: "6px 0", fontWeight: 600, color: "white", letterSpacing: 0.5, position: "relative", zIndex: 20 }}>
        Design Preview 3 — visual mockup only
      </div>

      {/* Video */}
      <video autoPlay loop muted playsInline style={{ position: "absolute", top: 300, right: 0, bottom: 0, left: 0, width: "100%", height: "calc(100% - 300px)", objectFit: "cover", zIndex: 0 }}>
        <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_083109_283f3553-e28f-428b-a723-d639c617eb2b.mp4" type="video/mp4" />
      </video>

      {/* Gradient overlay */}
      <div style={{ position: "absolute", top: 300, right: 0, bottom: 0, left: 0, zIndex: 1, background: "linear-gradient(to bottom, #FFFFFF 0%, transparent 30%, transparent 70%, #FFFFFF 100%)", pointerEvents: "none" }} />

      {/* Navigation */}
      <nav style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 32px", maxWidth: 1280, margin: "0 auto" }}>
        <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: 30, letterSpacing: "-0.5px", color: "#000" }}>
          Cerise Scholar<sup style={{ fontSize: 10 }}>&reg;</sup>
        </span>
        <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
          {["Home", "About", "Research Guide", "Workspace", "Scholar Ask"].map((s, i) => (
            <span key={s} style={{ fontSize: 14, color: i === 0 ? "#000" : "#6F6F6F", cursor: "pointer" }}>{s}</span>
          ))}
        </div>
        <span style={{ borderRadius: 9999, padding: "10px 24px", fontSize: 14, background: "#000", color: "#fff", cursor: "pointer" }}>
          Begin Research
        </span>
      </nav>

      {/* Hero */}
      <section style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", paddingTop: "calc(8rem - 75px)", paddingBottom: 160, paddingLeft: 24, paddingRight: 24 }}>
        <h1 style={{ fontFamily: "'Instrument Serif',serif", fontSize: "clamp(3rem,8vw,6.5rem)", lineHeight: 0.95, letterSpacing: "-2.46px", maxWidth: 1280, fontWeight: 400, color: "#000" }}>
          Beyond <em style={{ fontStyle: "normal", color: "#6F6F6F" }}>silence,</em> we build
          <br />
          <em style={{ fontStyle: "normal", color: "#6F6F6F" }}>the eternal.</em>
        </h1>

        <p style={{ color: "#6F6F6F", fontSize: "clamp(15px,1.2vw,18px)", maxWidth: 640, marginTop: 32, lineHeight: 1.7 }}>
          Building platforms for brilliant minds, fearless makers, and thoughtful souls. Through the noise, we craft digital havens for deep work and pure flows.
        </p>

        <span style={{ borderRadius: 9999, padding: "20px 56px", fontSize: 16, background: "#000", color: "#fff", marginTop: 48, cursor: "pointer", display: "inline-block" }}>
          Begin Journey
        </span>
      </section>
    </div>
  );
}
