export default function DesignPreview() {
  const navy = "hsl(201,100%,13%)";
  const muted = "hsl(240,4%,66%)";
  const serif = "'Instrument Serif', serif";
  const glass = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" };

  return (
    <div style={{ minHeight: "100vh", position: "relative", overflow: "hidden", background: navy, color: "white", fontFamily: "'Inter', sans-serif" }}>

      <video autoPlay loop muted playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }}>
        <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4" type="video/mp4" />
      </video>

      <div style={{ position: "relative", zIndex: 20, background: "#DE3163", textAlign: "center", fontSize: 12, padding: "6px 0", fontWeight: 600, letterSpacing: 0.5 }}>
        Design Preview — visual mockup only
      </div>

      <nav style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", maxWidth: 1100, margin: "0 auto" }}>
        <span style={{ fontFamily: serif, fontSize: 24 }}>Cerise Scholar</span>
        <div style={{ display: "flex", gap: 28 }}>
          {["Home", "About", "Research Guide", "Workspace"].map((s, i) => (
            <span key={s} style={{ fontSize: 14, color: i === 0 ? "white" : muted, cursor: "pointer" }}>{s}</span>
          ))}
        </div>
        <span style={{ borderRadius: 9999, padding: "8px 20px", fontSize: 14, cursor: "pointer", ...glass }}>Begin Research</span>
      </nav>

      <section style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "min(8vh,80px) 24px min(8vh,80px)" }}>
        <h1 style={{ fontFamily: serif, fontSize: "clamp(2.2rem,5.5vw,4.5rem)", lineHeight: 0.95, letterSpacing: "-1.5px", maxWidth: 900, fontWeight: 400 }}>
          Where every <em style={{ fontStyle: "normal", color: muted }}>highlight</em> becomes<br />
          <em style={{ fontStyle: "normal", color: muted }}>insight and understanding.</em>
        </h1>
        <p style={{ color: muted, fontSize: "clamp(14px,1.2vw,16px)", maxWidth: 540, marginTop: "min(2.5vh,24px)", lineHeight: 1.7 }}>
          A research companion for deep readers, meticulous reviewers, and ambitious scholars. Upload your PDFs, highlight what matters, and watch your literature review build itself — with AI that cites real academic papers.
        </p>
        <span style={{ borderRadius: 9999, padding: "14px 44px", fontSize: 15, marginTop: "min(3vh,32px)", cursor: "pointer", display: "inline-block", ...glass }}>
          Begin Your Research
        </span>
      </section>

      <section style={{ position: "relative", zIndex: 10, maxWidth: 1000, margin: "0 auto", padding: "0 32px min(6vh,60px)", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {[
          { title: "PDF Workspace", desc: "Upload, read, and annotate research papers with OCR, zoom, and page navigation." },
          { title: "Smart Highlighting", desc: "Select any passage — it instantly becomes a structured entry in your literature review table." },
          { title: "Literature Review Table", desc: "Auto-populated with source, author, year, theme, and notes. Filter and export to CSV." },
          { title: "ScholarAsk AI", desc: "Ask research questions in plain language and receive answers with citations from real papers." },
          { title: "AI Text-to-Speech", desc: "Listen to your PDFs read aloud with 8 natural AI voices. Adjustable speed, paragraph hover play." },
          { title: "Paper Writer", desc: "Write your paper section by section with auto-imported highlights and methodology notes." },
        ].map((f) => (
          <div key={f.title} style={{ borderRadius: 12, padding: "18px 20px", ...glass }}>
            <h3 style={{ fontFamily: serif, fontSize: 16, marginBottom: 6 }}>{f.title}</h3>
            <p style={{ fontSize: 13, color: muted, lineHeight: 1.55 }}>{f.desc}</p>
          </div>
        ))}
      </section>

      <footer style={{ position: "relative", zIndex: 10, borderTop: "1px solid rgba(255,255,255,0.1)", padding: 24, maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontFamily: serif, fontSize: 14, color: muted }}>Cerise Scholar</span>
        <span style={{ fontSize: 12, color: "hsl(240,4%,46%)" }}>Built for researchers. &copy; 2026</span>
      </footer>
    </div>
  );
}
