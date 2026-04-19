"use client";

import { useState, useEffect } from "react";

const palette = {
  ink: "#1a1208",
  inkMuted: "#7a6a5a",
  inkFaint: "#9a8a7a",
  cerise: "#c0392b",
  rule: "#e0d8d0",
  gold: "#c8a84b",
};

const pages = [
  {
    name: "ScholarAsk",
    url: "cerisescholar.app/projects/scholar-ask",
    content: (
      <div style={{ display: "flex", gap: "12px", height: "100%" }}>
        <div style={{ width: "120px", background: "#fdfcfa", borderRight: "1px solid #e0d8d0", borderRadius: "6px", padding: "10px", flexShrink: 0 }}>
          <div style={{ fontSize: "7px", color: "#c0392b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>Documents</div>
          <div style={{ fontSize: "8px", color: "#1a1208", fontWeight: 600, marginBottom: "4px" }}>+ New Research</div>
          <div style={{ fontSize: "7px", color: "#9a8a7a" }}>the relationship between...</div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#1a1208", textAlign: "center" }}>Ask anything.</div>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#1a1208", textAlign: "center" }}>Discover <em>everything</em></div>
          <div style={{ fontSize: "7px", color: "#7a6a5a", marginTop: "4px", textAlign: "center" }}>Powered by OpenAlex and AI synthesis</div>
          <div style={{ marginTop: "12px", width: "70%", background: "#fff", border: "1px solid #e0d8d0", borderRadius: "6px", padding: "8px 10px" }}>
            <div style={{ fontSize: "7px", color: "#9a8a7a" }}>What would you like to learn more about?</div>
            <div style={{ fontSize: "7px", color: "#1a1208", marginTop: "4px" }}>Deep research</div>
          </div>
          <div style={{ display: "flex", gap: "12px", marginTop: "8px", fontSize: "6px", color: "#9a8a7a" }}>
            <span>Explore topics</span><span>Find experts</span><span>Literature review</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    name: "Workspace",
    url: "cerisescholar.app/projects/workspace",
    content: (
      <div style={{ display: "flex", gap: "0", height: "100%" }}>
        <div style={{ width: "100px", background: "#fdfcfa", borderRight: "1px solid #e0d8d0", padding: "8px", flexShrink: 0 }}>
          <div style={{ fontSize: "6px", color: "#9a8a7a", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px" }}>Documents</div>
          {["Smith_2023.pdf", "Johnson_2022.pdf", "Lee_2024.pdf"].map((f) => (
            <div key={f} style={{ fontSize: "6px", color: "#1a1208", padding: "3px 4px", marginBottom: "2px" }}>{f}</div>
          ))}
          <div style={{ fontSize: "6px", color: "#9a8a7a", fontWeight: 700, textTransform: "uppercase", marginTop: "10px", marginBottom: "6px" }}>Code System</div>
          {[{ n: "Abstract", c: "#f87171" }, { n: "Lit Review", c: "#34d399" }, { n: "Methods", c: "#60a5fa" }].map((code) => (
            <div key={code.n} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "6px", color: "#1a1208", marginBottom: "2px" }}>
              <span style={{ width: "5px", height: "5px", borderRadius: "2px", background: code.c }} />{code.n}
            </div>
          ))}
        </div>
        <div style={{ flex: 1, background: "#f5f0e8", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "16px", overflow: "hidden" }}>
          <div style={{ background: "#fff", width: "75%", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", borderRadius: "2px", padding: "20px" }}>
            <div style={{ fontSize: "9px", fontWeight: 700, color: "#1a1208", textAlign: "center", lineHeight: 1.3 }}>The Effects of Geopolitical Uncertainty on Student Career Planning</div>
            <div style={{ fontSize: "6px", color: "#7a6a5a", textAlign: "center", marginTop: "4px" }}>Smith, J. et al. (2023)</div>
            <div style={{ fontSize: "6px", color: "#7a6a5a", textAlign: "center" }}>Journal of Educational Research, Vol. 45</div>
            <div style={{ marginTop: "12px" }}>
              {[...Array(12)].map((_, j) => <div key={j} style={{ height: "3px", background: j === 3 ? "#fde68a" : "#e0d8d0", borderRadius: "2px", marginBottom: "5px", width: j === 11 ? "55%" : j === 7 ? "80%" : "100%", opacity: j === 3 ? 1 : 0.35 }} />)}
            </div>
            <div style={{ background: "#fef9c3", borderLeft: "2px solid #c8a84b", padding: "5px 8px", borderRadius: "0 3px 3px 0", fontSize: "5px", color: "#1a1208", marginTop: "8px", lineHeight: 1.5 }}>
              &quot;This study examined the effects of geopolitical uncertainty on career decision-making among undergraduate students...&quot;
            </div>
            <div style={{ marginTop: "10px" }}>
              {[...Array(8)].map((_, j) => <div key={j} style={{ height: "3px", background: "#e0d8d0", borderRadius: "2px", marginBottom: "5px", width: j === 7 ? "40%" : j === 4 ? "85%" : "100%", opacity: 0.35 }} />)}
            </div>
          </div>
        </div>
        <div style={{ width: "90px", borderLeft: "1px solid #e0d8d0", padding: "8px", flexShrink: 0 }}>
          <div style={{ fontSize: "6px", color: "#9a8a7a", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px" }}>Highlights (3)</div>
          <div style={{ background: "#fef9c3", borderLeft: "2px solid #c8a84b", padding: "4px 6px", borderRadius: "0 3px 3px 0", fontSize: "6px", color: "#1a1208", marginBottom: "6px" }}>&quot;This study examined...&quot;</div>
          <div style={{ fontSize: "5px", color: "#9a8a7a" }}>Page 4 · 3:38 PM</div>
        </div>
      </div>
    ),
  },
  {
    name: "Literature Review",
    url: "cerisescholar.app/projects/lit-review",
    content: (
      <div style={{ padding: "12px", height: "100%", overflow: "hidden" }}>
        <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
          {["All Sections", "All Sources"].map((f) => (
            <div key={f} style={{ padding: "3px 8px", border: "1px solid #e0d8d0", borderRadius: "4px", fontSize: "6px", color: "#7a6a5a" }}>{f}</div>
          ))}
          <div style={{ marginLeft: "auto", fontSize: "6px", color: "#7a6a5a" }}>4 entries</div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "6px" }}>
          <thead>
            <tr>{["Source", "Author", "Year", "Section", "Quote"].map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "4px 6px", borderBottom: "1.5px solid #e0d8d0", color: "#9a8a7a", fontWeight: 700, fontSize: "5px", textTransform: "uppercase" }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {[
              { s: "Smith_2023", a: "Smith, J.", y: "2023", sec: "Lit Review", secC: "#34d399", q: "Geopolitical uncertainty has been shown..." },
              { s: "Johnson_2022", a: "Johnson, R.", y: "2022", sec: "Methods", secC: "#60a5fa", q: "A mixed-methods approach combining..." },
              { s: "Lee_2024", a: "Lee & Park", y: "2024", sec: "Results", secC: "#f59e0b", q: "Students scored 23% lower on CDSE..." },
            ].map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #e0d8d0" }}>
                <td style={{ padding: "5px 6px", fontWeight: 600, color: "#1a1208" }}>{r.s}</td>
                <td style={{ padding: "5px 6px", color: "#7a6a5a" }}>{r.a}</td>
                <td style={{ padding: "5px 6px", color: "#1a1208", fontWeight: 600 }}>{r.y}</td>
                <td style={{ padding: "5px 6px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", background: `${r.secC}18`, border: `1px solid ${r.secC}40`, borderRadius: "100px", padding: "1px 6px", fontSize: "5px" }}>
                    <span style={{ width: "4px", height: "4px", borderRadius: "2px", background: r.secC }} />{r.sec}
                  </span>
                </td>
                <td style={{ padding: "5px 6px", color: "#7a6a5a", fontStyle: "italic" }}>{r.q}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
  },
  {
    name: "Meta-Analysis",
    url: "cerisescholar.app/projects/meta-analysis",
    content: (
      <div style={{ display: "flex", gap: "0", height: "100%" }}>
        {/* Left panel — variables */}
        <div style={{ width: "110px", background: "#fdfcfa", borderRight: "1px solid #e0d8d0", padding: "10px", flexShrink: 0 }}>
          <div style={{ fontSize: "6px", color: "#9a8a7a", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px" }}>Research Question</div>
          <div style={{ fontSize: "6px", color: "#1a1208", lineHeight: 1.4, marginBottom: "10px", background: "#fff", border: "1px solid #e0d8d0", borderRadius: "4px", padding: "5px" }}>How does geopolitical uncertainty affect career planning?</div>
          <div style={{ fontSize: "6px", color: "#9a8a7a", fontWeight: 700, textTransform: "uppercase", marginBottom: "4px" }}>Variables</div>
          {["career_self_efficacy", "political_instab", "economic_anxiety"].map((v) => (
            <div key={v} style={{ fontSize: "5px", color: "#1a1208", fontFamily: "monospace", padding: "3px 4px", background: "#fff", border: "1px solid #e0d8d0", borderRadius: "3px", marginBottom: "3px" }}>{v}</div>
          ))}
        </div>
        {/* Center — forest plot style */}
        <div style={{ flex: 1, padding: "12px 16px", overflow: "hidden" }}>
          <div style={{ display: "flex", gap: "4px", marginBottom: "10px", justifyContent: "center" }}>
            {["Define", "Upload", "Analyze", "Effects", "Results"].map((t, i) => (
              <span key={t} style={{ padding: "2px 6px", borderRadius: "100px", fontSize: "5px", fontWeight: 600, background: i === 4 ? "#c0392b" : "transparent", color: i === 4 ? "#fff" : "#7a6a5a", border: `1px solid ${i === 4 ? "#c0392b" : "#e0d8d0"}` }}>{t}</span>
            ))}
          </div>
          <div style={{ fontSize: "9px", fontWeight: 700, color: "#1a1208", marginBottom: "8px" }}>Forest Plot</div>
          {/* Mini forest plot */}
          {[
            { a: "Smith (2023)", d: 0.54, w: "24%" },
            { a: "Johnson (2022)", d: 0.41, w: "20%" },
            { a: "Lee & Park (2024)", d: 0.67, w: "28%" },
            { a: "Chen (2023)", d: 0.38, w: "16%" },
            { a: "Rivera (2019)", d: 0.12, w: "12%" },
          ].map((s) => (
            <div key={s.a} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
              <span style={{ fontSize: "5px", color: "#1a1208", fontWeight: 600, width: "70px", flexShrink: 0 }}>{s.a}</span>
              <div style={{ flex: 1, height: "10px", position: "relative", background: "#f5f0e8", borderRadius: "2px" }}>
                <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: "1px", background: "#e0d8d0" }} />
                <div style={{ position: "absolute", left: `${50 + s.d * 25}%`, top: "2px", width: "6px", height: "6px", borderRadius: "50%", background: s.d > 0.5 ? "#c0392b" : "#c8a84b", transform: "translateX(-50%)" }} />
              </div>
              <span style={{ fontSize: "5px", color: "#1a1208", fontWeight: 700, width: "30px", textAlign: "right" }}>d={s.d}</span>
            </div>
          ))}
          {/* Overall diamond */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px", borderTop: "1.5px solid #1a1208", paddingTop: "4px" }}>
            <span style={{ fontSize: "5px", fontWeight: 700, color: "#1a1208", width: "70px" }}>Overall (k=5)</span>
            <div style={{ flex: 1, height: "10px", position: "relative", background: "#f5f0e8", borderRadius: "2px" }}>
              <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: "1px", background: "#e0d8d0" }} />
              <div style={{ position: "absolute", left: "61%", top: "1px", width: "8px", height: "8px", background: "#1a1208", transform: "translateX(-50%) rotate(45deg)" }} />
            </div>
            <span style={{ fontSize: "5px", fontWeight: 700, color: "#1a1208", width: "30px", textAlign: "right" }}>d=0.45</span>
          </div>
          {/* Stats cards */}
          <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
            {[{ v: "0.45", l: "Pooled d" }, { v: "73%", l: "I²" }, { v: "p<.001", l: "p-value" }, { v: "14.82", l: "Q-test" }].map((s) => (
              <div key={s.l} style={{ flex: 1, background: "#fdfcfa", border: "1px solid #e0d8d0", borderRadius: "4px", padding: "5px", textAlign: "center" }}>
                <div style={{ fontSize: "9px", fontWeight: 700, color: "#1a1208" }}>{s.v}</div>
                <div style={{ fontSize: "4px", color: "#9a8a7a", textTransform: "uppercase", marginTop: "1px" }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Right panel — results summary */}
        <div style={{ width: "90px", borderLeft: "1px solid #e0d8d0", padding: "10px", flexShrink: 0 }}>
          <div style={{ fontSize: "6px", color: "#9a8a7a", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px" }}>Results</div>
          {[{ l: "Effect", v: "d=0.45" }, { l: "CI", v: "[0.28,0.62]" }, { l: "p", v: "<.001" }, { l: "I²", v: "73%" }].map((r) => (
            <div key={r.l} style={{ display: "flex", justifyContent: "space-between", fontSize: "5px", marginBottom: "4px" }}>
              <span style={{ color: "#9a8a7a" }}>{r.l}</span>
              <span style={{ color: "#1a1208", fontWeight: 600 }}>{r.v}</span>
            </div>
          ))}
          <button style={{ width: "100%", padding: "4px", background: "#c0392b", color: "#fff", border: "none", borderRadius: "4px", fontSize: "5px", fontWeight: 600, marginTop: "8px", cursor: "pointer" }}>Export to Paper</button>
        </div>
      </div>
    ),
  },
  {
    name: "Paper Writer",
    url: "cerisescholar.app/projects/paper-writer",
    content: (
      <div style={{ display: "flex", gap: "0", height: "100%" }}>
        <div style={{ width: "100px", background: "#fdfcfa", borderRight: "1px solid #e0d8d0", padding: "8px", flexShrink: 0 }}>
          <div style={{ fontSize: "6px", color: "#9a8a7a", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px" }}>Paper Sections</div>
          {["Abstract", "Introduction", "Lit Review", "Methodology", "Results", "Discussion", "Conclusion", "References"].map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "3px 4px", borderRadius: "4px", marginBottom: "1px", background: i === 2 ? "#fff" : "transparent", border: i === 2 ? "1px solid #e0d8d0" : "1px solid transparent" }}>
              <span style={{ width: "14px", height: "14px", borderRadius: "3px", background: i === 2 ? "#c0392b" : [3,4].includes(i) ? "#c8a84b" : "#e0d8d0", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "6px", fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
              <span style={{ fontSize: "6px", color: i === 2 ? "#1a1208" : "#7a6a5a", fontWeight: i === 2 ? 600 : 400 }}>{s}</span>
            </div>
          ))}
        </div>
        <div style={{ flex: 1, background: "#faf7f0", padding: "12px", display: "flex", justifyContent: "center" }}>
          <div style={{ background: "#fff", width: "85%", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", borderRadius: "2px", padding: "14px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#1a1208", marginBottom: "6px" }}>Literature Review</div>
            <div style={{ background: "#faf7f0", border: "1px solid #e0d8d0", borderRadius: "4px", padding: "6px 8px", marginBottom: "8px" }}>
              <div style={{ fontSize: "5px", color: "#c8a84b", fontWeight: 700, textTransform: "uppercase" }}>★ Writing guidance</div>
              <div style={{ fontSize: "5px", color: "#7a6a5a", marginTop: "2px" }}>Synthesize existing research by theme</div>
            </div>
            <div style={{ background: "#fef9c3", borderLeft: "2px solid #c8a84b", padding: "4px 6px", borderRadius: "0 3px 3px 0", fontSize: "5px", color: "#1a1208", marginBottom: "6px" }}>&quot;Geopolitical uncertainty has been shown...&quot; — Smith (2023)</div>
            <div style={{ fontSize: "6px", color: "#1a1208", lineHeight: 1.5 }}>Multiple studies converge on the finding that geopolitical instability creates measurable anxiety...</div>
          </div>
        </div>
      </div>
    ),
  },
];

export default function LiveDemo() {
  const [active, setActive] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setActive((prev) => (prev + 1) % pages.length);
        setFading(false);
      }, 300);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const goTo = (i: number) => {
    setFading(true);
    setTimeout(() => {
      setActive(i);
      setFading(false);
    }, 200);
  };

  const V = (px: number) => `calc(${px} / 1460 * 100vw)`;

  return (
    <section style={{ borderTop: `1px solid ${palette.rule}` }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "80px 48px" }}>
        <p style={{ fontFamily: "var(--font-roboto)", fontSize: "15px", fontWeight: 700, color: palette.cerise, textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>
          LIVE DEMO
        </p>
        <h2 style={{ fontFamily: "var(--font-roboto)", fontSize: "27px", fontWeight: 700, color: palette.ink, margin: "8px 0 0", lineHeight: 1.15 }}>
          See it in action
        </h2>
        <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: palette.inkMuted, marginTop: "16px" }}>
          Read, highlight, and annotate — all in one place. Highlights auto-populate your literature review table instantly.
        </p>

        {/* Browser mockup */}
        <div style={{
          marginTop: "40px", background: "#fff",
          border: `1.5px solid ${palette.rule}`, borderRadius: "12px",
          overflow: "hidden", boxShadow: "0 16px 40px rgba(26,18,8,0.06)",
        }}>
          {/* Chrome bar */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "12px 16px", borderBottom: `1px solid ${palette.rule}`, background: "#fdfcfa" }}>
            <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#FF5F57" }} />
            <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#FEBC2E" }} />
            <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#28C840" }} />
            <span style={{ marginLeft: "12px", fontSize: "10px", color: palette.inkFaint, fontFamily: "var(--font-noto)" }}>
              {pages[active].url}
            </span>
            {/* Page name tabs */}
            <div style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
              {pages.map((p, i) => (
                <button
                  key={p.name}
                  onClick={() => goTo(i)}
                  style={{
                    padding: "2px 8px", borderRadius: "4px",
                    fontSize: "8px", fontFamily: "var(--font-noto)",
                    background: i === active ? palette.ink : "transparent",
                    color: i === active ? "#fff" : palette.inkFaint,
                    border: `1px solid ${i === active ? palette.ink : palette.rule}`,
                    cursor: "pointer", fontWeight: i === active ? 600 : 400,
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Content area */}
          <div style={{
            height: "320px",
            transition: "opacity 0.3s ease",
            opacity: fading ? 0 : 1,
            background: "#fefefe",
          }}>
            {pages[active].content}
          </div>
        </div>

        {/* Dot indicators */}
        <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "20px" }}>
          {pages.map((p, i) => (
            <button
              key={p.name}
              onClick={() => goTo(i)}
              style={{
                width: i === active ? "24px" : "8px", height: "8px",
                borderRadius: "4px",
                background: i === active ? palette.ink : palette.rule,
                border: "none", cursor: "pointer",
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
