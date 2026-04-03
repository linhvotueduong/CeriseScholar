export default function DesignPreview5() {
  const display = "'Fraunces', serif";
  const body = "'Plus Jakarta Sans', sans-serif";
  const bg = "#E8E8E8";
  const accent = "#FFD740";
  const indigo = "#4F46E5";
  const dark = "#1E1B4B";
  const muted = "#555555";
  const imgUrl = "https://res.cloudinary.com/dbc0ygwsm/image/upload/f_auto,q_auto/ế-3_dokblv";

  return (
    <div style={{ background: bg, fontFamily: body, color: "#111", minHeight: "100vh" }}>

      {/* ═══ NAV ═══ */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: bg, borderBottom: "1px solid rgba(0,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", maxWidth: 1280, margin: "0 auto" }}>
        <span style={{ fontFamily: display, fontSize: 20, letterSpacing: "-0.5px", color: "#000", fontWeight: 900 }}>Cerise Scholar</span>
        <div style={{ display: "flex", gap: 32 }}>
          {["Home", "About", "Research Guide", "Workspace"].map((t, i) => (
            <span key={t} style={{ fontSize: 14, color: i === 0 ? "#000" : "#888", fontWeight: i === 0 ? 600 : 400, cursor: "pointer" }}>{t}</span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 14, color: "#888", cursor: "pointer" }}>Log In</span>
          <span style={{ fontSize: 14, padding: "8px 20px", borderRadius: 9999, background: "#000", color: "#fff", fontWeight: 600, cursor: "pointer" }}>Sign Up Free</span>
        </div>
      </nav>

      {/* ═══ HERO TOP: Badge + H1 + Subtext + CTA ═══ */}
      <section style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "64px 24px 0", maxWidth: 1280, margin: "0 auto" }}>
        {/* Badge */}
        <div style={{ borderRadius: 9999, background: "rgba(255,255,255,0.8)", border: "1px solid rgba(79,70,229,0.15)", color: indigo, fontSize: 12, fontWeight: 600, padding: "6px 16px", marginBottom: 24 }}>
          ✦ Now with AI-powered citation finder
        </div>

        {/* H1 */}
        <h1 style={{ fontFamily: display, fontSize: "clamp(3rem,7vw,5rem)", fontWeight: 900, lineHeight: 1.02, letterSpacing: "-2px", maxWidth: 800, color: dark }}>
          Let&apos;s Think <em style={{ fontStyle: "italic", color: indigo }}>Outside</em> the Box
        </h1>

        {/* Subtext */}
        <p style={{ color: muted, fontSize: "clamp(15px,1.2vw,18px)", maxWidth: 540, marginTop: 20, lineHeight: 1.7 }}>
          Your all-in-one academic research workspace. Find sources, cite instantly, and write stronger papers — powered by AI.
        </p>

        {/* CTA */}
        <span style={{ display: "inline-block", background: dark, color: "#fff", borderRadius: 9999, padding: "16px 48px", fontSize: 15, fontWeight: 700, marginTop: 32, cursor: "pointer", letterSpacing: "0.5px" }}>
          Begin Research →
        </span>

        {/* Trust row */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 20, justifyContent: "center" }}>
          <div style={{ display: "flex" }}>
            {[{ bg: "#DE3163", l: "AM" }, { bg: "#3B82F6", l: "JK" }, { bg: "#22C55E", l: "SR" }, { bg: "#F59E0B", l: "TP" }].map((a, i) => (
              <div key={a.l} style={{ width: 28, height: 28, borderRadius: "50%", background: a.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#fff", fontWeight: 700, marginLeft: i > 0 ? -8 : 0, border: `2px solid ${bg}` }}>{a.l}</div>
            ))}
          </div>
          <span style={{ fontSize: 13, color: muted }}>12,400+ students trust Cerise Scholar</span>
        </div>
      </section>

      {/* ═══ ILLUSTRATION ═══ */}
      <div style={{ maxWidth: 900, margin: "40px auto 0", padding: "0 24px", position: "relative", zIndex: 10 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgUrl} alt="Cerise Scholar - Let's Think Outside The Box" style={{ width: "100%", height: "auto", display: "block" }} />
      </div>

      {/* ═══ THREE-COLUMN SECTION ═══ */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 16, padding: "0 48px 40px", maxWidth: 1400, margin: "0 auto" }}>
        {/* Left */}
        <div style={{ textAlign: "left" }}>
          <h2 style={{ fontFamily: display, fontSize: "clamp(3rem,6vw,6rem)", fontWeight: 900, lineHeight: 0.95, letterSpacing: "-3px", color: "#000" }}>
            AI<br />scholar<br />friend
          </h2>
          <p style={{ fontSize: 13, fontWeight: 500, letterSpacing: "2px", color: "#000", marginTop: 20, textTransform: "uppercase", lineHeight: 1.8 }}>
            READ &middot; HIGHLIGHT &middot; REVIEW<br />ASK &middot; ANALYZE &middot; WRITE
          </p>
        </div>

        {/* Center CTA */}
        <div style={{ textAlign: "center" }}>
          <span style={{ display: "inline-block", background: accent, color: dark, borderRadius: 9999, padding: "16px 48px", fontSize: 13, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", cursor: "pointer" }}>
            Begin Research
          </span>
        </div>

        {/* Right */}
        <div style={{ textAlign: "right" }}>
          <h2 style={{ fontFamily: display, fontSize: "clamp(3rem,6vw,6rem)", fontWeight: 900, lineHeight: 0.95, letterSpacing: "-3px", color: "#000" }}>
            All<br />research<br />process
          </h2>
          <p style={{ fontSize: 13, fontWeight: 500, letterSpacing: "3px", color: "#000", marginTop: 20, textTransform: "uppercase" }}>
            IN ONE SIT
          </p>
        </div>
      </section>

      {/* ═══ FEATURE TICKER ═══ */}
      <div style={{ background: "#000", padding: "18px 0", overflow: "hidden" }}>
        <div style={{ display: "flex", gap: 60, whiteSpace: "nowrap" }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ display: "flex", gap: 60 }}>
              {["PDF VIEWER", "SMART HIGHLIGHTING", "LITERATURE REVIEW", "SCHOLARASK AI", "TEXT-TO-SPEECH", "PAPER WRITER", "META-ANALYSIS"].map((t) => (
                <span key={t + i} style={{ fontSize: 12, fontWeight: 600, letterSpacing: "3px", color: "rgba(255,255,255,0.4)" }}>{t}</span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ padding: "32px 48px", maxWidth: 1280, margin: "0 auto", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontFamily: display, fontSize: 14, fontWeight: 900 }}>Cerise Scholar</span>
        <span style={{ fontSize: 12, color: muted }}>&copy; 2026. Built for researchers.</span>
      </footer>
    </div>
  );
}
