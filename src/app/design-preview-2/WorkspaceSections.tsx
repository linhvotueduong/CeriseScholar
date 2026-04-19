const serif = "'Instrument Serif',serif";
const gray = "#6F6F6F";
const black = "#000";
const border = "#E5E5E5";
const bg2 = "#FAFAFA";

export function Dashboard() {
  return (
    <section style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 32px 80px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", background: "#fff", borderBottom: `1px solid ${border}`, borderRadius: "12px 12px 0 0", border: `1px solid ${border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <span style={{ fontFamily: serif, fontSize: 18, color: black }}>Cerise Scholar</span>
          <div style={{ display: "flex", gap: 16 }}>
            {["Workspace", "Home", "About", "Research Guide"].map((s, i) => (
              <span key={s} style={{ fontSize: 13, color: i === 0 ? black : gray, fontWeight: i === 0 ? 500 : 400 }}>{s}</span>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: gray }}>researcher@university.edu</span>
          <span style={{ fontSize: 12, color: gray, cursor: "pointer" }}>Log Out</span>
        </div>
      </div>
      <div style={{ border: `1px solid ${border}`, borderTop: "none", borderRadius: "0 0 12px 12px", background: bg2, padding: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h3 style={{ fontFamily: serif, fontSize: 24, fontWeight: 400, color: black }}>My Projects</h3>
          <span style={{ borderRadius: 9999, padding: "8px 20px", fontSize: 13, background: black, color: "#fff", cursor: "pointer" }}>+ New Project</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {[
            { name: "Geopolitical Influence & Peace", desc: "Literature review on global conflict resolution strategies", color: "#111111", date: "Mar 28, 2026" },
            { name: "Student Mental Health Study", desc: "Meta-analysis of university counseling program effectiveness", color: "#3B82F6", date: "Mar 15, 2026" },
            { name: "AI in Education", desc: "Systematic review of AI-assisted learning outcomes", color: "#22C55E", date: "Feb 20, 2026" },
          ].map((p) => (
            <div key={p.name} style={{ background: "#fff", borderRadius: 12, padding: 20, border: `1px solid ${border}`, cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: p.color }} />
                <span style={{ fontWeight: 500, fontSize: 14, color: black }}>{p.name}</span>
              </div>
              <p style={{ fontSize: 13, color: gray, lineHeight: 1.5, marginBottom: 12 }}>{p.desc}</p>
              <span style={{ fontSize: 11, color: "#B0B0B0" }}>{p.date}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PdfWorkspace() {
  return (
    <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 80px" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <span style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: gray }}>PDF WORKSPACE</span>
        <h2 style={{ fontFamily: serif, fontSize: 28, fontWeight: 400, marginTop: 8, color: black }}>Read, highlight, annotate</h2>
      </div>
      <div style={{ border: `1px solid ${border}`, borderRadius: 12, overflow: "hidden", background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", borderBottom: `1px solid ${border}`, background: bg2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, color: gray, cursor: "pointer" }}>← Projects</span>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#111111" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: black }}>Geopolitical Influence &amp; Peace</span>
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            {["ScholarAsk", "Meta-Analysis", "Lit Review", "Paper Writer →"].map((s) => (
              <span key={s} style={{ fontSize: 12, color: "#111111", cursor: "pointer", fontWeight: 500 }}>{s}</span>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", minHeight: 600 }}>
          <div style={{ width: 190, borderRight: `1px solid ${border}`, background: bg2, display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "14px 14px 10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: black, letterSpacing: 0.5 }}>DOCUMENTS</span>
                <span style={{ fontSize: 11, color: gray }}>127p</span>
              </div>
              <div style={{ fontSize: 12, color: "#111111", cursor: "pointer", marginBottom: 12 }}>+ Upload PDF</div>
              <div style={{ padding: "8px 10px", borderRadius: 6, background: "rgba(222,49,99,0.06)", border: "1px solid rgba(222,49,99,0.15)", marginBottom: 4 }}>
                <div style={{ fontSize: 12, color: "#111111", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>The Effects Of Delay Of Gratifi...</div>
                <div style={{ fontSize: 10, color: gray, marginTop: 2 }}>2.3 MB · 3/31/2026 <span style={{ color: "#F59E0B" }}>OCR pending</span></div>
              </div>
              <div style={{ fontSize: 11, color: gray, marginTop: 6 }}>1 document</div>
            </div>
            <div style={{ borderTop: `1px solid ${border}`, padding: "14px", flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: black, letterSpacing: 0.5 }}>CODE SYSTEM</span>
                <span style={{ fontSize: 11, color: "#111111", cursor: "pointer" }}>+ Add Code</span>
              </div>
              {[
                { name: "Abstract", color: "#EF4444" }, { name: "Introduction", color: "#F97316" },
                { name: "Literature Review", color: "#EAB308" }, { name: "Methodology", color: "#22C55E" },
                { name: "Results", color: "#3B82F6" }, { name: "Discussion", color: "#6366F1" },
                { name: "Conclusion", color: "#111111" },
              ].map((c) => (
                <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", cursor: "pointer" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: black }}>{c.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {/* Toolbar — single row, grouped with dividers */}
            <div style={{ display: "flex", alignItems: "center", padding: "8px 16px", borderBottom: `1px solid ${border}`, background: "#fff", gap: 6 }}>
              {/* Navigation group */}
              <div style={{ display: "flex", alignItems: "center", background: bg2, borderRadius: 8, padding: 2, gap: 1 }}>
                <span style={{ fontSize: 12, color: gray, padding: "5px 10px", cursor: "pointer", borderRadius: 6 }}>←</span>
                <span style={{ fontSize: 12, color: black, padding: "5px 8px", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>1/127</span>
                <span style={{ fontSize: 12, color: gray, padding: "5px 10px", cursor: "pointer", borderRadius: 6 }}>→</span>
              </div>

              {/* Go to page */}
              <div style={{ display: "flex", alignItems: "center", background: bg2, borderRadius: 8, padding: 2, gap: 2 }}>
                <input defaultValue="" placeholder="Go to" readOnly style={{ width: 42, fontSize: 11, padding: "5px 6px", borderRadius: 6, border: "none", background: "transparent", textAlign: "center", color: gray }} />
                <span style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, background: black, color: "#fff", cursor: "pointer", fontWeight: 500 }}>Go</span>
              </div>

              {/* Divider */}
              <div style={{ width: 1, height: 20, background: border, margin: "0 4px" }} />

              {/* Tools group — toggle pill like Future/Now */}
              <div style={{ display: "flex", alignItems: "center", background: black, borderRadius: 9999, padding: 3, gap: 2 }}>
                {/* Highlight toggle — active state (white pill) with pen icon */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 32, borderRadius: 9999, background: "#fff", cursor: "pointer" }}>
                  {/* Highlighter pen SVG icon */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={black} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 2l4 4" /><path d="M7.5 20.5L2 22l1.5-5.5" /><path d="M17.514 5.486l-12 12" /><path d="M12.5 5.5l2.5-2.5 4 4-2.5 2.5" />
                  </svg>
                </div>
                <span style={{ fontSize: 12, padding: "6px 14px", borderRadius: 9999, color: "rgba(255,255,255,0.6)", cursor: "pointer" }}>Read Page</span>
                <span style={{ fontSize: 12, padding: "6px 14px", borderRadius: 9999, color: "rgba(255,255,255,0.6)", cursor: "pointer" }}>Read Selection</span>
              </div>

              {/* Divider */}
              <div style={{ width: 1, height: 20, background: border, margin: "0 4px" }} />

              {/* AI */}
              <span style={{ fontSize: 12, padding: "5px 14px", borderRadius: 8, background: "#1A1A2E", color: "#fff", cursor: "pointer", fontWeight: 500 }}>AI Chat</span>

              {/* Spacer */}
              <div style={{ flex: 1 }} />

              {/* Zoom group */}
              <div style={{ display: "flex", alignItems: "center", background: bg2, borderRadius: 8, padding: 2, gap: 1 }}>
                <span style={{ fontSize: 13, color: gray, padding: "4px 8px", cursor: "pointer" }}>−</span>
                <span style={{ fontSize: 12, color: black, padding: "4px 6px", fontWeight: 500, minWidth: 36, textAlign: "center" }}>100%</span>
                <span style={{ fontSize: 13, color: gray, padding: "4px 8px", cursor: "pointer" }}>+</span>
              </div>
            </div>
            <div style={{ flex: 1, padding: "32px 48px", overflowY: "auto", background: "#F5F5F5" }}>
              <div style={{ maxWidth: 680, margin: "0 auto", background: "#fff", padding: "48px 56px", boxShadow: "0 1px 8px rgba(0,0,0,0.08)", borderRadius: 2 }}>
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                  <div style={{ fontFamily: serif, fontSize: 26, fontStyle: "italic", letterSpacing: 4, color: black, marginBottom: 12 }}>S T A R S</div>
                  <div style={{ fontSize: 12, color: gray }}>University of Central Florida</div>
                </div>
                <div style={{ borderTop: `1px solid ${border}`, paddingTop: 20, marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: "#3B82F6" }}>Electronic Theses and Dissertations, 2004-2019</span>
                </div>
                <div style={{ fontSize: 13, color: gray, marginBottom: 16 }}>2011</div>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: black, lineHeight: 1.4, marginBottom: 12 }}>The Effects Of Delay Of Gratification On The Academic Achievement, Substance Abuse, And Violent Behavior Of Middle-school Students</h3>
                <div style={{ fontSize: 13, color: black }}>J S. Herndon</div>
                <div style={{ fontSize: 12, color: gray, fontStyle: "italic" }}>University of Central Florida</div>
              </div>
            </div>
          </div>
          <div style={{ width: 260, borderLeft: `1px solid ${border}`, background: "#fff", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${border}` }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: black, letterSpacing: 0.5 }}>HIGHLIGHTS (1)</div>
            </div>
            <div style={{ padding: "12px 16px" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 9999, background: "#111111", color: "#fff" }}>All Pages</span>
                <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 9999, border: `1px solid ${border}`, color: gray }}>This Page</span>
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: "#3B82F6", fontWeight: 500 }}>Page 4</span>
                  <span style={{ fontSize: 14, color: "#111111" }}>▶</span>
                </div>
                <p style={{ fontSize: 13, color: black, lineHeight: 1.5 }}>&ldquo;This study examined the effects&rdquo;</p>
                <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 6, background: "#FFFDE7", border: "1px solid #FEF3C7" }}>
                  <div style={{ fontSize: 12, color: "#444" }}>hi</div>
                  <div style={{ fontSize: 10, color: gray, marginTop: 2 }}>3/31/2026, 6:30:05 PM</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LitReviewTable() {
  return (
    <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px 80px" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <span style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: gray }}>LITERATURE REVIEW</span>
        <h2 style={{ fontFamily: serif, fontSize: 28, fontWeight: 400, marginTop: 8, color: black }}>Your highlights, structured</h2>
      </div>
      <div style={{ border: `1px solid ${border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 20px", background: bg2, borderBottom: `1px solid ${border}` }}>
          <div style={{ display: "flex", gap: 8 }}>
            {["All Sections", "All Sources"].map((f) => (
              <span key={f} style={{ fontSize: 12, padding: "6px 14px", borderRadius: 9999, border: `1px solid ${border}`, color: gray, background: "#fff", cursor: "pointer" }}>{f} ▾</span>
            ))}
            <input placeholder="Search highlights..." readOnly style={{ fontSize: 12, padding: "6px 14px", borderRadius: 9999, border: `1px solid ${border}`, color: "#444", width: 200, outline: "none" }} />
          </div>
          <span style={{ fontSize: 12, padding: "6px 14px", borderRadius: 9999, background: black, color: "#fff", cursor: "pointer" }}>Export CSV</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: bg2 }}>
                {["Source", "APA Ref", "Section", "Quote", "Notes", "Synthesis"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontWeight: 500, color: gray, borderBottom: `1px solid ${border}`, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { src: "Smith_2023.pdf", apa: "Smith et al. (2023)", sec: "Lit Review", quote: "prolonged exposure to geopolitical uncertainty...", notes: "Key finding - 67% impact", synth: "Supports hypothesis", color: "#111111" },
                { src: "Johnson_2024.pdf", apa: "Johnson & Lee (2024)", sec: "Methodology", quote: "universities with dedicated counseling...", notes: "43% improvement", synth: "Institutional framework", color: "#3B82F6" },
                { src: "Williams_2022.pdf", apa: "Williams (2022)", sec: "Introduction", quote: "environmental stressors correlate...", notes: "Background", synth: "Theoretical foundation", color: "#F59E0B" },
              ].map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${border}` }}>
                  <td style={{ padding: "12px 16px", fontWeight: 500, color: black }}>{r.src}</td>
                  <td style={{ padding: "12px 16px", color: "#444" }}>{r.apa}</td>
                  <td style={{ padding: "12px 16px" }}><span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 9999, background: r.color + "18", color: r.color, fontWeight: 500 }}>{r.sec}</span></td>
                  <td style={{ padding: "12px 16px", color: "#444", maxWidth: 180 }}>&ldquo;{r.quote}&rdquo;</td>
                  <td style={{ padding: "12px 16px", color: gray }}>{r.notes}</td>
                  <td style={{ padding: "12px 16px", color: gray }}>{r.synth}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export function ScholarAsk() {
  return (
    <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px 80px" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <span style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: gray }}>SCHOLARASK AI</span>
        <h2 style={{ fontFamily: serif, fontSize: 28, fontWeight: 400, marginTop: 8, color: black }}>Ask. Discover. Cite.</h2>
      </div>
      <div style={{ border: `1px solid ${border}`, borderRadius: 12, overflow: "hidden", background: "#fff", display: "flex", minHeight: 420 }}>
        <div style={{ width: 220, borderRight: `1px solid ${border}`, background: bg2, padding: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 500, padding: "8px 14px", borderRadius: 9999, background: black, color: "#fff", cursor: "pointer", display: "block", textAlign: "center" }}>+ New research</span>
          <div style={{ marginTop: 16 }}>
            <div style={{ padding: "10px 12px", borderRadius: 8, background: "#fff", border: `1px solid ${border}`, marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: black, fontWeight: 500 }}>Geopolitical effects on education</span>
              <p style={{ fontSize: 11, color: gray, marginTop: 2 }}>12 papers found</p>
            </div>
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <div style={{ background: black, color: "#fff", padding: "12px 18px", borderRadius: "16px 16px 4px 16px", maxWidth: "70%", fontSize: 14, lineHeight: 1.6 }}>
                What are the main findings on geopolitical uncertainty and student career planning?
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{ background: bg2, padding: "16px 20px", borderRadius: "16px 16px 16px 4px", maxWidth: "80%", fontSize: 14, lineHeight: 1.7, color: "#333", border: `1px solid ${border}` }}>
                <p><strong>1.</strong> Smith et al. (2023) found 67% of students altered their academic trajectories.</p>
                <p style={{ marginTop: 8 }}><strong>2.</strong> Johnson &amp; Lee (2024) showed counseling programs improve confidence by 43%.</p>
                <div style={{ marginTop: 12, padding: "8px 12px", background: "#fff", borderRadius: 8, border: `1px solid ${border}` }}>
                  <span style={{ fontSize: 11, fontWeight: 500, color: gray }}>CITATIONS</span>
                  <p style={{ fontSize: 12, color: "#444", marginTop: 4 }}>Smith, A. et al. (2023). <em>J. Higher Ed Policy</em>, 45(2).</p>
                  <p style={{ fontSize: 12, color: "#444", marginTop: 2 }}>Johnson, M. &amp; Lee, S. (2024). <em>Ed Research Review</em>, 38.</p>
                </div>
              </div>
            </div>
          </div>
          <div style={{ padding: "12px 24px", borderTop: `1px solid ${border}` }}>
            <div style={{ display: "flex", borderRadius: 12, border: `1px solid ${border}`, overflow: "hidden" }}>
              <input placeholder="Ask a research question..." readOnly style={{ flex: 1, padding: "12px 18px", fontSize: 14, border: "none", outline: "none", color: "#444" }} />
              <div style={{ padding: "12px 20px", background: black, color: "#fff", cursor: "pointer", fontSize: 14 }}>↑</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ScholarAskFull() {
  return (
    <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 80px" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <span style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: gray }}>SCHOLARASK — FULL PAGE</span>
        <h2 style={{ fontFamily: serif, fontSize: 28, fontWeight: 400, marginTop: 8, color: black }}>AI Research Assistant</h2>
      </div>

      <div style={{ border: `1px solid ${border}`, borderRadius: 12, overflow: "hidden", background: "#fff" }}>
        {/* Top navbar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: `1px solid ${border}`, background: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <span style={{ fontFamily: serif, fontSize: 18, color: "#111111", fontWeight: 700 }}>Cerise Scholar</span>
            {["Workspace", "Home", "About", "Research Guidance", "Literature Review", "Paper Writer"].map((s, i) => (
              <span key={s} style={{ fontSize: 13, color: i === 0 ? black : gray }}>{s}</span>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 12, color: gray }}>researcher@university.edu</span>
            <span style={{ fontSize: 12, color: gray }}>Log Out</span>
          </div>
        </div>

        {/* Main layout */}
        <div style={{ display: "flex", minHeight: 600 }}>
          {/* Left sidebar — conversations */}
          <div style={{ width: 230, borderRight: `1px solid ${border}`, background: bg2, padding: 16 }}>
            <div style={{ padding: "10px 16px", borderRadius: 8, border: `1px solid ${border}`, background: "#fff", cursor: "pointer", textAlign: "center", fontSize: 13, fontWeight: 500, color: black, marginBottom: 16 }}>
              + New research
            </div>
            <div style={{ fontSize: 11, color: gray, marginBottom: 8, fontWeight: 500, letterSpacing: 0.5 }}>CONVERSATIONS</div>
            <div style={{ padding: "10px 12px", borderRadius: 8, background: "#fff", border: `1px solid ${border}`, marginBottom: 6, cursor: "pointer" }}>
              <span style={{ fontSize: 12, color: black, fontWeight: 500 }}>Geopolitical effects on education</span>
              <p style={{ fontSize: 11, color: gray, marginTop: 2 }}>12 papers found</p>
            </div>
            <div style={{ padding: "10px 12px", borderRadius: 8, marginBottom: 6, cursor: "pointer" }}>
              <span style={{ fontSize: 12, color: gray }}>Student mental health interventions</span>
            </div>
            <div style={{ padding: "10px 12px", borderRadius: 8, marginBottom: 6, cursor: "pointer" }}>
              <span style={{ fontSize: 12, color: gray }}>AI in higher education</span>
            </div>
            <div style={{ fontSize: 11, color: gray, marginTop: 16 }}>No conversations yet</div>
          </div>

          {/* Center — search / hero area */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {/* Sub-header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", borderBottom: `1px solid ${border}` }}>
              <span style={{ fontSize: 16, color: gray }}>☰</span>
              <span style={{ fontSize: 13, color: black, cursor: "pointer" }}>← Workspace</span>
            </div>

            {/* Centered search hero */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40 }}>
              <h2 style={{ fontFamily: serif, fontSize: 36, fontWeight: 400, color: black, marginBottom: 8 }}>
                Discover <em style={{ fontStyle: "italic", color: gray }}>deeper</em> insights
              </h2>
              <p style={{ fontSize: 14, color: gray, marginBottom: 40 }}>Powered by OpenAlex and AI synthesis</p>

              {/* Search input card */}
              <div style={{ width: "100%", maxWidth: 560, borderRadius: 16, border: `1px solid ${border}`, padding: "20px 24px", background: "#fff" }}>
                <input
                  placeholder="What would you like to learn more about?"
                  readOnly
                  style={{ width: "100%", border: "none", outline: "none", fontSize: 15, color: "#444", marginBottom: 16 }}
                />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {/* Toggle switch */}
                    <div style={{ width: 36, height: 20, borderRadius: 10, background: "#E0E0E0", position: "relative" }}>
                      <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: 2, boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                    </div>
                    <span style={{ fontSize: 13, color: gray }}>Deep research</span>
                  </div>
                  {/* Send button */}
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(222,49,99,0.12)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <span style={{ color: "#111111", fontSize: 16, fontWeight: 700 }}>↑</span>
                  </div>
                </div>
              </div>

              {/* Quick action pills */}
              <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                {["Explore topics", "Find experts", "Literature review"].map((s) => (
                  <span key={s} style={{ fontSize: 13, color: gray, cursor: "pointer", padding: "6px 0" }}>{s}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PaperWriter() {
  return (
    <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px 80px" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <span style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: gray }}>PAPER WRITER</span>
        <h2 style={{ fontFamily: serif, fontSize: 28, fontWeight: 400, marginTop: 8, color: black }}>Write section by section</h2>
      </div>
      <div style={{ border: `1px solid ${border}`, borderRadius: 12, overflow: "hidden", background: "#fff" }}>
        <div style={{ display: "flex", borderBottom: `1px solid ${border}`, overflowX: "auto" }}>
          {["Abstract", "Introduction", "Literature Review", "Methodology", "Results", "Discussion", "Conclusion", "References"].map((s, i) => (
            <div key={s} style={{ padding: "12px 20px", fontSize: 13, color: i === 2 ? black : gray, fontWeight: i === 2 ? 500 : 400, borderBottom: i === 2 ? "2px solid #000" : "none", cursor: "pointer", whiteSpace: "nowrap" }}>{s}</div>
          ))}
        </div>
        <div style={{ display: "flex", minHeight: 350 }}>
          <div style={{ flex: 1, padding: 32 }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: black, marginBottom: 16 }}>Literature Review</div>
            <div style={{ fontSize: 14, color: "#444", lineHeight: 1.8 }}>
              <p>The relationship between geopolitical instability and educational outcomes has emerged as a critical area of study.</p>
              <p style={{ marginTop: 16 }}>Smith et al. (2023) demonstrated that 67% of participants reported altered academic trajectories.</p>
              <p style={{ marginTop: 16, color: gray, fontStyle: "italic" }}>Continue writing...</p>
            </div>
          </div>
          <div style={{ width: 260, borderLeft: `1px solid ${border}`, padding: 20, background: bg2 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: black, marginBottom: 16 }}>Imported Materials</div>
            <p style={{ fontSize: 12, color: gray, marginBottom: 12 }}>Highlights tagged &ldquo;Lit Review&rdquo;:</p>
            {[
              { text: "prolonged exposure to geopolitical uncertainty...", src: "Smith_2023.pdf" },
              { text: "environmental stressors correlate with...", src: "Williams_2022.pdf" },
            ].map((m, i) => (
              <div key={i} style={{ padding: 10, borderRadius: 8, background: "#fff", border: `1px solid ${border}`, marginBottom: 8 }}>
                <p style={{ fontSize: 12, color: "#444", lineHeight: 1.5 }}>&ldquo;{m.text}&rdquo;</p>
                <span style={{ fontSize: 11, color: gray, display: "block", marginTop: 4 }}>{m.src}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
