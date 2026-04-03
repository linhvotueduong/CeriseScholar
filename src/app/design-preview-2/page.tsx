export default function DesignPreview2() {
  const s = "'Instrument Serif',serif";
  const g = "#6F6F6F";
  const b = "#000";
  const e = "#E5E5E5";
  const f = "#FAFAFA";

  return (
    <div style={{ background: "#FFF", fontFamily: "'Inter',sans-serif" }}>
      <div style={{ background: "#DE3163", textAlign: "center", fontSize: 12, padding: "6px 0", fontWeight: 600, color: "#fff" }}>Design Preview 2</div>

      {/* Hero */}
      <div style={{ minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "80px 24px" }}>
        <nav style={{ position: "absolute", top: 32, left: 0, right: 0, display: "flex", justifyContent: "space-between", padding: "0 32px", maxWidth: 1200, margin: "0 auto" }}>
          <span style={{ fontFamily: s, fontSize: 28, color: b }}>Cerise Scholar</span>
          <span style={{ borderRadius: 9999, padding: "8px 20px", fontSize: 14, background: b, color: "#fff" }}>Sign Up Free</span>
        </nav>
        <h1 style={{ fontFamily: s, fontSize: "clamp(3rem,7vw,5.5rem)", lineHeight: 0.95, letterSpacing: "-2px", fontWeight: 400, color: b }}>
          Beyond <em style={{ fontStyle: "normal", color: g }}>reading,</em> we build<br /><em style={{ fontStyle: "normal", color: g }}>the complete scholar.</em>
        </h1>
        <p style={{ color: g, fontSize: 16, maxWidth: 560, marginTop: 28, lineHeight: 1.7 }}>Upload your PDFs, highlight what matters, and watch your literature review build itself.</p>
        <span style={{ borderRadius: 9999, padding: "18px 48px", fontSize: 16, background: b, color: "#fff", marginTop: 40, display: "inline-block" }}>Begin Your Research</span>
      </div>

      {/* Divider */}
      <div style={{ textAlign: "center", padding: "60px 24px 30px", borderTop: `1px solid ${e}` }}>
        <span style={{ fontSize: 11, letterSpacing: 3, color: g }}>WORKSPACE PREVIEW</span>
        <h2 style={{ fontFamily: s, fontSize: 32, fontWeight: 400, marginTop: 8, color: b }}>What your workspace looks like</h2>
      </div>

      {/* Dashboard */}
      <section style={{ maxWidth: 1000, margin: "0 auto", padding: "20px 32px 60px" }}>
        <div style={{ border: `1px solid ${e}`, borderRadius: 12, background: f, padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
            <h3 style={{ fontFamily: s, fontSize: 22, fontWeight: 400 }}>My Projects</h3>
            <span style={{ borderRadius: 9999, padding: "6px 16px", fontSize: 13, background: b, color: "#fff" }}>+ New Project</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {[{ n: "Geopolitical Influence", c: "#DE3163" }, { n: "Student Mental Health", c: "#3B82F6" }, { n: "AI in Education", c: "#22C55E" }].map((p) => (
              <div key={p.n} style={{ background: "#fff", borderRadius: 10, padding: 16, border: `1px solid ${e}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.c }} />
                  <span style={{ fontWeight: 500, fontSize: 13 }}>{p.n}</span>
                </div>
                <span style={{ fontSize: 11, color: "#B0B0B0" }}>Mar 2026</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PDF Workspace */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <span style={{ fontSize: 11, letterSpacing: 3, color: g }}>PDF WORKSPACE</span>
          <h2 style={{ fontFamily: s, fontSize: 24, fontWeight: 400, marginTop: 6 }}>Read, highlight, annotate</h2>
        </div>
        <div style={{ border: `1px solid ${e}`, borderRadius: 12, overflow: "hidden" }}>
          {/* Project bar */}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 16px", background: f, borderBottom: `1px solid ${e}` }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: g }}>← Projects</span>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#DE3163" }} />
              <span style={{ fontSize: 12, fontWeight: 600 }}>Geopolitical Influence</span>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              {["ScholarAsk", "Meta-Analysis", "Lit Review", "Paper Writer"].map((t) => (
                <span key={t} style={{ fontSize: 11, color: "#DE3163", fontWeight: 500 }}>{t}</span>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", minHeight: 450 }}>
            {/* Left sidebar */}
            <div style={{ width: 170, borderRight: `1px solid ${e}`, background: f, padding: 12, fontSize: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 10, letterSpacing: 0.5, marginBottom: 8 }}>DOCUMENTS</div>
              <div style={{ color: "#DE3163", marginBottom: 10 }}>+ Upload PDF</div>
              <div style={{ padding: "6px 8px", borderRadius: 6, background: "rgba(222,49,99,0.06)", border: "1px solid rgba(222,49,99,0.15)", marginBottom: 12 }}>
                <div style={{ color: "#DE3163", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>The Effects Of Delay...</div>
                <div style={{ fontSize: 10, color: g, marginTop: 2 }}>2.3 MB</div>
              </div>
              <div style={{ fontWeight: 600, fontSize: 10, letterSpacing: 0.5, marginBottom: 8, marginTop: 16, borderTop: `1px solid ${e}`, paddingTop: 12 }}>CODE SYSTEM</div>
              {[["Abstract", "#EF4444"], ["Introduction", "#F97316"], ["Lit Review", "#EAB308"], ["Methodology", "#22C55E"], ["Results", "#3B82F6"], ["Discussion", "#6366F1"], ["Conclusion", "#8B5CF6"]].map(([n, c]) => (
                <div key={n} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
                  <span style={{ fontSize: 12 }}>{n}</span>
                </div>
              ))}
            </div>
            {/* Center */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              {/* Toolbar */}
              <div style={{ display: "flex", alignItems: "center", padding: "6px 12px", borderBottom: `1px solid ${e}`, gap: 6 }}>
                <div style={{ display: "flex", background: f, borderRadius: 8, padding: 2 }}>
                  <span style={{ fontSize: 11, color: g, padding: "4px 8px" }}>←</span>
                  <span style={{ fontSize: 11, padding: "4px 6px", fontWeight: 500 }}>1/127</span>
                  <span style={{ fontSize: 11, color: g, padding: "4px 8px" }}>→</span>
                </div>
                <div style={{ width: 1, height: 16, background: e }} />
                <div style={{ display: "flex", background: b, borderRadius: 9999, padding: 3, gap: 2 }}>
                  <div style={{ width: 28, height: 26, borderRadius: 9999, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={b} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2l4 4M7.5 20.5L2 22l1.5-5.5M17.5 5.5l-12 12M12.5 5.5l2.5-2.5 4 4-2.5 2.5" /></svg>
                  </div>
                  <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 9999, color: "rgba(255,255,255,0.5)" }}>Read</span>
                </div>
                <div style={{ width: 1, height: 16, background: e }} />
                <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 8, background: "#1A1A2E", color: "#fff" }}>AI Chat</span>
                <div style={{ flex: 1 }} />
                <div style={{ display: "flex", background: f, borderRadius: 8, padding: 2 }}>
                  <span style={{ fontSize: 11, color: g, padding: "3px 6px" }}>−</span>
                  <span style={{ fontSize: 11, padding: "3px 4px", fontWeight: 500 }}>100%</span>
                  <span style={{ fontSize: 11, color: g, padding: "3px 6px" }}>+</span>
                </div>
              </div>
              {/* PDF */}
              <div style={{ flex: 1, padding: 24, background: "#F5F5F5" }}>
                <div style={{ maxWidth: 550, margin: "0 auto", background: "#fff", padding: "36px 44px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
                  <div style={{ textAlign: "center", fontFamily: s, fontSize: 22, letterSpacing: 3, marginBottom: 20 }}>S T A R S</div>
                  <div style={{ fontSize: 12, color: g, marginBottom: 12 }}>University of Central Florida</div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.4, marginBottom: 8 }}>The Effects Of Delay Of Gratification On Academic Achievement</h3>
                  <div style={{ fontSize: 12 }}>J S. Herndon</div>
                </div>
              </div>
            </div>
            {/* Right sidebar */}
            <div style={{ width: 220, borderLeft: `1px solid ${e}`, padding: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.5, marginBottom: 12 }}>HIGHLIGHTS (1)</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 9999, background: "#DE3163", color: "#fff" }}>All Pages</span>
                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 9999, border: `1px solid ${e}`, color: g }}>This Page</span>
              </div>
              <div>
                <span style={{ fontSize: 11, color: "#3B82F6", fontWeight: 500 }}>Page 4 ▶</span>
                <p style={{ fontSize: 12, marginTop: 4, lineHeight: 1.4 }}>&ldquo;This study examined the effects&rdquo;</p>
                <div style={{ marginTop: 6, padding: "4px 8px", borderRadius: 4, background: "#FFFDE7", fontSize: 11, color: "#444" }}>hi</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ScholarAsk Full Page */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <span style={{ fontSize: 11, letterSpacing: 3, color: g }}>SCHOLARASK</span>
          <h2 style={{ fontFamily: s, fontSize: 24, fontWeight: 400, marginTop: 6 }}>AI Research Assistant</h2>
        </div>
        <div style={{ border: `1px solid ${e}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ display: "flex", minHeight: 450 }}>
            {/* Sidebar */}
            <div style={{ width: 200, borderRight: `1px solid ${e}`, background: f, padding: 12, fontSize: 12 }}>
              <div style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${e}`, background: "#fff", textAlign: "center", fontWeight: 500, marginBottom: 12 }}>+ New research</div>
              <div style={{ padding: "8px 10px", borderRadius: 6, background: "#fff", border: `1px solid ${e}`, marginBottom: 6 }}>
                <span style={{ fontWeight: 500 }}>Geopolitical effects</span>
                <div style={{ fontSize: 10, color: g, marginTop: 2 }}>12 papers</div>
              </div>
              <div style={{ padding: "8px 10px", color: g }}>Student mental health</div>
              <div style={{ color: g, marginTop: 20, fontSize: 11 }}>No conversations yet</div>
            </div>
            {/* Main */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 16px", borderBottom: `1px solid ${e}` }}>
                <span style={{ color: g }}>☰</span>
                <span style={{ fontSize: 12 }}>← Workspace</span>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32 }}>
                <h2 style={{ fontFamily: s, fontSize: 30, fontWeight: 400, marginBottom: 6 }}>Discover <em style={{ fontStyle: "italic", color: g }}>deeper</em> insights</h2>
                <p style={{ fontSize: 13, color: g, marginBottom: 32 }}>Powered by OpenAlex and AI synthesis</p>
                <div style={{ width: "100%", maxWidth: 480, borderRadius: 14, border: `1px solid ${e}`, padding: "16px 20px" }}>
                  <input placeholder="What would you like to learn more about?" readOnly style={{ width: "100%", border: "none", outline: "none", fontSize: 14, color: "#444", marginBottom: 12 }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 32, height: 18, borderRadius: 9, background: "#E0E0E0", position: "relative" }}><div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: 2, boxShadow: "0 1px 2px rgba(0,0,0,0.2)" }} /></div>
                      <span style={{ fontSize: 12, color: g }}>Deep research</span>
                    </div>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(222,49,99,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: "#DE3163", fontWeight: 700 }}>↑</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 20 }}>
                  {["Explore topics", "Find experts", "Literature review"].map((t) => (
                    <span key={t} style={{ fontSize: 12, color: g }}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${e}`, padding: "32px", maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontFamily: s, fontSize: 14 }}>Cerise Scholar</span>
        <span style={{ fontSize: 12, color: g }}>&copy; 2026</span>
      </footer>
    </div>
  );
}
