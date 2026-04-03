export default function DesignPreview2() {
  const s = "'Instrument Serif',serif";
  const g = "#6F6F6F";
  const b = "#000";
  const e = "#E5E5E5";
  const f = "#FAFAFA";

  return (
    <div style={{ background: "#FFF", fontFamily: "'Inter',sans-serif" }}>
      <div style={{ background: "#DE3163", textAlign: "center", fontSize: 12, padding: "6px 0", fontWeight: 600, color: "#fff" }}>Design Preview 2 — scroll down for workspace mockups</div>

      {/* ═══ HERO WITH VIDEO ═══ */}
      <div style={{ position: "relative", minHeight: "100vh", overflow: "hidden" }}>
        <video autoPlay loop muted playsInline style={{ position: "absolute", top: 300, right: 0, bottom: 0, left: 0, width: "100%", height: "calc(100% - 300px)", objectFit: "cover", zIndex: 0 }}>
          <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_083109_283f3553-e28f-428b-a723-d639c617eb2b.mp4" type="video/mp4" />
        </video>
        <div style={{ position: "absolute", top: 300, right: 0, bottom: 0, left: 0, zIndex: 1, background: "linear-gradient(to bottom, #FFF 0%, transparent 30%, transparent 70%, #FFF 100%)", pointerEvents: "none" }} />

        <nav style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 32px", maxWidth: 1280, margin: "0 auto" }}>
          <span style={{ fontFamily: s, fontSize: 28, color: b }}>Cerise Scholar</span>
          <div style={{ display: "flex", gap: 28 }}>
            {["Home", "About", "Research Guide", "Workspace"].map((t, i) => (
              <span key={t} style={{ fontSize: 14, color: i === 0 ? b : g, cursor: "pointer" }}>{t}</span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <span style={{ fontSize: 14, color: g, padding: "8px 16px" }}>Log In</span>
            <span style={{ borderRadius: 9999, padding: "8px 20px", fontSize: 14, background: b, color: "#fff", cursor: "pointer" }}>Sign Up Free</span>
          </div>
        </nav>

        <section style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingTop: "calc(8rem - 75px)", paddingBottom: 160, paddingLeft: 24, paddingRight: 24 }}>
          <h1 style={{ fontFamily: s, fontSize: "clamp(3rem,8vw,6.5rem)", lineHeight: 0.95, letterSpacing: "-2.46px", maxWidth: 1280, fontWeight: 400, color: b }}>
            Beyond <em style={{ fontStyle: "normal", color: g }}>reading,</em> we build<br /><em style={{ fontStyle: "normal", color: g }}>the complete scholar.</em>
          </h1>
          <p style={{ color: g, fontSize: "clamp(15px,1.2vw,18px)", maxWidth: 640, marginTop: 32, lineHeight: 1.7 }}>Upload your PDFs, highlight what matters, and watch your literature review build itself — with AI that cites real academic papers.</p>
          <span style={{ borderRadius: 9999, padding: "20px 56px", fontSize: 16, background: b, color: "#fff", marginTop: 48, cursor: "pointer", display: "inline-block" }}>Begin Your Research</span>
        </section>
      </div>

      {/* ═══ DIVIDER ═══ */}
      <div style={{ textAlign: "center", padding: "80px 24px 40px", borderTop: `1px solid ${e}` }}>
        <span style={{ fontSize: 11, letterSpacing: 3, color: g }}>WORKSPACE PREVIEW</span>
        <h2 style={{ fontFamily: s, fontSize: "clamp(2rem,4vw,3.5rem)", fontWeight: 400, marginTop: 12, color: b }}>What your workspace looks like</h2>
      </div>

      {/* ═══ DASHBOARD ═══ */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 32px 60px" }}>
        <div style={{ border: `1px solid ${e}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", background: "#fff", borderBottom: `1px solid ${e}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <span style={{ fontFamily: s, fontSize: 18, color: b }}>Cerise Scholar</span>
              <div style={{ display: "flex", gap: 16 }}>
                {["Workspace", "Home", "About", "Research Guide"].map((t, i) => (
                  <span key={t} style={{ fontSize: 13, color: i === 0 ? b : g, fontWeight: i === 0 ? 500 : 400 }}>{t}</span>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <span style={{ fontSize: 12, color: g }}>researcher@university.edu</span>
              <span style={{ fontSize: 12, color: g }}>Log Out</span>
            </div>
          </div>
          <div style={{ background: f, padding: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
              <h3 style={{ fontFamily: s, fontSize: 24, fontWeight: 400 }}>My Projects</h3>
              <span style={{ borderRadius: 9999, padding: "8px 20px", fontSize: 13, background: b, color: "#fff" }}>+ New Project</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
              {[{ n: "Geopolitical Influence & Peace", d: "Literature review on global conflict resolution strategies", c: "#DE3163", t: "Mar 28, 2026" }, { n: "Student Mental Health Study", d: "Meta-analysis of university counseling program effectiveness", c: "#3B82F6", t: "Mar 15, 2026" }, { n: "AI in Education", d: "Systematic review of AI-assisted learning outcomes", c: "#22C55E", t: "Feb 20, 2026" }].map((p) => (
                <div key={p.n} style={{ background: "#fff", borderRadius: 12, padding: 20, border: `1px solid ${e}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: p.c }} />
                    <span style={{ fontWeight: 500, fontSize: 14 }}>{p.n}</span>
                  </div>
                  <p style={{ fontSize: 13, color: g, lineHeight: 1.5, marginBottom: 12 }}>{p.d}</p>
                  <span style={{ fontSize: 11, color: "#B0B0B0" }}>{p.t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PDF WORKSPACE ═══ */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <span style={{ fontSize: 11, letterSpacing: 3, color: g }}>PDF WORKSPACE</span>
          <h2 style={{ fontFamily: s, fontSize: 28, fontWeight: 400, marginTop: 8 }}>Read, highlight, annotate</h2>
        </div>
        <div style={{ border: `1px solid ${e}`, borderRadius: 12, overflow: "hidden" }}>
          {/* Project bar */}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 20px", background: f, borderBottom: `1px solid ${e}` }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 13, color: g }}>← Projects</span>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#DE3163" }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Geopolitical Influence &amp; Peace</span>
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              {["ScholarAsk", "Meta-Analysis", "Lit Review", "Paper Writer →"].map((t) => (
                <span key={t} style={{ fontSize: 12, color: "#DE3163", fontWeight: 500 }}>{t}</span>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", minHeight: 500 }}>
            {/* Left sidebar */}
            <div style={{ width: 180, borderRight: `1px solid ${e}`, background: f, padding: 12, fontSize: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 10, letterSpacing: 0.5, marginBottom: 8 }}>DOCUMENTS</div>
              <div style={{ color: "#DE3163", marginBottom: 10 }}>+ Upload PDF</div>
              <div style={{ padding: "6px 8px", borderRadius: 6, background: "rgba(222,49,99,0.06)", border: "1px solid rgba(222,49,99,0.15)", marginBottom: 12 }}>
                <div style={{ color: "#DE3163", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>The Effects Of Delay Of Gratifi...</div>
                <div style={{ fontSize: 10, color: g, marginTop: 2 }}>2.3 MB · <span style={{ color: "#F59E0B" }}>OCR pending</span></div>
              </div>
              <div style={{ fontWeight: 600, fontSize: 10, letterSpacing: 0.5, marginBottom: 8, marginTop: 16, borderTop: `1px solid ${e}`, paddingTop: 12 }}>CODE SYSTEM</div>
              {[["Abstract", "#EF4444"], ["Introduction", "#F97316"], ["Literature Review", "#EAB308"], ["Methodology", "#22C55E"], ["Results", "#3B82F6"], ["Discussion", "#6366F1"], ["Conclusion", "#8B5CF6"]].map(([n, c]) => (
                <div key={n} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
                  <span>{n}</span>
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
                <div style={{ maxWidth: 580, margin: "0 auto", background: "#fff", padding: "40px 48px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
                  <div style={{ textAlign: "center", fontFamily: s, fontSize: 24, letterSpacing: 3, marginBottom: 20 }}>S T A R S</div>
                  <div style={{ fontSize: 12, color: g, marginBottom: 4 }}>University of Central Florida</div>
                  <div style={{ borderTop: `1px solid ${e}`, paddingTop: 16, marginBottom: 6 }}><span style={{ fontSize: 12, color: "#3B82F6" }}>Electronic Theses and Dissertations, 2004-2019</span></div>
                  <div style={{ fontSize: 12, color: g, marginBottom: 14 }}>2011</div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.4, marginBottom: 10 }}>The Effects Of Delay Of Gratification On The Academic Achievement, Substance Abuse, And Violent Behavior Of Middle-school Students In Alternative Learning Settings</h3>
                  <div style={{ fontSize: 13 }}>J S. Herndon</div>
                  <div style={{ fontSize: 12, color: g, fontStyle: "italic" }}>University of Central Florida</div>
                </div>
              </div>
            </div>
            {/* Right sidebar */}
            <div style={{ width: 240, borderLeft: `1px solid ${e}`, padding: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.5, marginBottom: 12 }}>HIGHLIGHTS (1)</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 9999, background: "#DE3163", color: "#fff" }}>All Pages</span>
                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 9999, border: `1px solid ${e}`, color: g }}>This Page</span>
              </div>
              <div>
                <span style={{ fontSize: 11, color: "#3B82F6", fontWeight: 500 }}>Page 4 ▶</span>
                <p style={{ fontSize: 12, marginTop: 4, lineHeight: 1.4 }}>&ldquo;This study examined the effects&rdquo;</p>
                <div style={{ marginTop: 6, padding: "4px 8px", borderRadius: 4, background: "#FFFDE7", fontSize: 11, color: "#444" }}>hi<div style={{ fontSize: 10, color: g, marginTop: 2 }}>3/31/2026, 6:30 PM</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ LIT REVIEW TABLE ═══ */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <span style={{ fontSize: 11, letterSpacing: 3, color: g }}>LITERATURE REVIEW</span>
          <h2 style={{ fontFamily: s, fontSize: 28, fontWeight: 400, marginTop: 8 }}>Your highlights, structured</h2>
        </div>
        <div style={{ border: `1px solid ${e}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 20px", background: f, borderBottom: `1px solid ${e}` }}>
            <div style={{ display: "flex", gap: 8 }}>
              {["All Sections", "All Sources"].map((t) => (<span key={t} style={{ fontSize: 12, padding: "6px 14px", borderRadius: 9999, border: `1px solid ${e}`, color: g, background: "#fff" }}>{t} ▾</span>))}
              <input placeholder="Search..." readOnly style={{ fontSize: 12, padding: "6px 14px", borderRadius: 9999, border: `1px solid ${e}`, width: 160 }} />
            </div>
            <span style={{ fontSize: 12, padding: "6px 14px", borderRadius: 9999, background: b, color: "#fff" }}>Export CSV</span>
          </div>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead><tr style={{ background: f }}>
              {["Source", "APA Ref", "Section", "Quote", "Notes"].map((h) => (<th key={h} style={{ textAlign: "left", padding: "10px 16px", fontWeight: 500, color: g, borderBottom: `1px solid ${e}`, fontSize: 12 }}>{h}</th>))}
            </tr></thead>
            <tbody>
              {[{ s: "Smith_2023.pdf", a: "Smith et al. (2023)", c: "Lit Review", q: "prolonged exposure to geopolitical uncertainty...", n: "67% impact rate", cl: "#DE3163" }, { s: "Johnson_2024.pdf", a: "Johnson & Lee (2024)", c: "Methodology", q: "universities with dedicated counseling...", n: "43% improvement", cl: "#3B82F6" }, { s: "Williams_2022.pdf", a: "Williams (2022)", c: "Introduction", q: "environmental stressors correlate...", n: "Background context", cl: "#F59E0B" }].map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${e}` }}>
                  <td style={{ padding: "12px 16px", fontWeight: 500 }}>{r.s}</td>
                  <td style={{ padding: "12px 16px", color: "#444" }}>{r.a}</td>
                  <td style={{ padding: "12px 16px" }}><span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 9999, background: r.cl + "18", color: r.cl, fontWeight: 500 }}>{r.c}</span></td>
                  <td style={{ padding: "12px 16px", color: "#444", maxWidth: 200 }}>&ldquo;{r.q}&rdquo;</td>
                  <td style={{ padding: "12px 16px", color: g }}>{r.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ═══ SCHOLARASK FULL PAGE ═══ */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <span style={{ fontSize: 11, letterSpacing: 3, color: g }}>SCHOLARASK</span>
          <h2 style={{ fontFamily: s, fontSize: 28, fontWeight: 400, marginTop: 8 }}>AI Research Assistant</h2>
        </div>
        <div style={{ border: `1px solid ${e}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ display: "flex", minHeight: 480 }}>
            {/* Sidebar */}
            <div style={{ width: 210, borderRight: `1px solid ${e}`, background: f, padding: 12, fontSize: 12 }}>
              <div style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${e}`, background: "#fff", textAlign: "center", fontWeight: 500, marginBottom: 12 }}>+ New research</div>
              <div style={{ padding: "8px 10px", borderRadius: 6, background: "#fff", border: `1px solid ${e}`, marginBottom: 6 }}><span style={{ fontWeight: 500 }}>Geopolitical effects</span><div style={{ fontSize: 10, color: g, marginTop: 2 }}>12 papers</div></div>
              <div style={{ padding: "8px 10px", color: g }}>Student mental health</div>
              <div style={{ color: g, marginTop: 20, fontSize: 11 }}>No conversations yet</div>
            </div>
            {/* Main */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 16px", borderBottom: `1px solid ${e}` }}>
                <span style={{ color: g }}>☰</span><span style={{ fontSize: 12 }}>← Workspace</span>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32 }}>
                <h2 style={{ fontFamily: s, fontSize: 32, fontWeight: 400, marginBottom: 8 }}>Discover <em style={{ fontStyle: "italic", color: g }}>deeper</em> insights</h2>
                <p style={{ fontSize: 14, color: g, marginBottom: 32 }}>Powered by OpenAlex and AI synthesis</p>
                <div style={{ width: "100%", maxWidth: 500, borderRadius: 14, border: `1px solid ${e}`, padding: "16px 20px" }}>
                  <input placeholder="What would you like to learn more about?" readOnly style={{ width: "100%", border: "none", outline: "none", fontSize: 14, color: "#444", marginBottom: 12 }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 32, height: 18, borderRadius: 9, background: "#E0E0E0", position: "relative" }}><div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: 2, boxShadow: "0 1px 2px rgba(0,0,0,0.2)" }} /></div>
                      <span style={{ fontSize: 12, color: g }}>Deep research</span>
                    </div>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(222,49,99,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "#DE3163", fontWeight: 700 }}>↑</span></div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 20 }}>
                  {["Explore topics", "Find experts", "Literature review"].map((t) => (<span key={t} style={{ fontSize: 12, color: g }}>{t}</span>))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PAPER WRITER ═══ */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <span style={{ fontSize: 11, letterSpacing: 3, color: g }}>PAPER WRITER</span>
          <h2 style={{ fontFamily: s, fontSize: 28, fontWeight: 400, marginTop: 8 }}>Write section by section</h2>
        </div>
        <div style={{ border: `1px solid ${e}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ display: "flex", borderBottom: `1px solid ${e}`, overflowX: "auto" }}>
            {["Abstract", "Introduction", "Literature Review", "Methodology", "Results", "Discussion", "Conclusion", "References"].map((t, i) => (
              <div key={t} style={{ padding: "12px 20px", fontSize: 13, color: i === 2 ? b : g, fontWeight: i === 2 ? 500 : 400, borderBottom: i === 2 ? "2px solid #000" : "none", whiteSpace: "nowrap" }}>{t}</div>
            ))}
          </div>
          <div style={{ display: "flex", minHeight: 350 }}>
            <div style={{ flex: 1, padding: 32 }}>
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Literature Review</div>
              <div style={{ fontSize: 14, color: "#444", lineHeight: 1.8 }}>
                <p>The relationship between geopolitical instability and educational outcomes has emerged as a critical area of study in recent years.</p>
                <p style={{ marginTop: 16 }}>Smith et al. (2023) demonstrated that prolonged exposure to geopolitical uncertainty significantly impacts student career planning, with 67% of participants reporting altered academic trajectories.</p>
                <p style={{ marginTop: 16, color: g, fontStyle: "italic" }}>Continue writing...</p>
              </div>
            </div>
            <div style={{ width: 260, borderLeft: `1px solid ${e}`, padding: 20, background: f }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16 }}>Imported Materials</div>
              <p style={{ fontSize: 12, color: g, marginBottom: 12 }}>Highlights tagged &ldquo;Lit Review&rdquo;:</p>
              {[{ t: "prolonged exposure to geopolitical uncertainty...", s: "Smith_2023.pdf" }, { t: "environmental stressors correlate with...", s: "Williams_2022.pdf" }].map((m, i) => (
                <div key={i} style={{ padding: 10, borderRadius: 8, background: "#fff", border: `1px solid ${e}`, marginBottom: 8 }}>
                  <p style={{ fontSize: 12, color: "#444", lineHeight: 1.5 }}>&ldquo;{m.t}&rdquo;</p>
                  <span style={{ fontSize: 11, color: g, display: "block", marginTop: 4 }}>{m.s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ borderTop: `1px solid ${e}`, padding: "40px 32px", maxWidth: 1280, margin: "0 auto", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontFamily: s, fontSize: 16 }}>Cerise Scholar</span>
        <span style={{ fontSize: 12, color: g }}>Built for researchers. &copy; 2026</span>
      </footer>
    </div>
  );
}
