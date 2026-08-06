/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import HEDGEHOG from "@/lib/hedgehog";

const palette = {
  ink: "#1a1208",
  inkMuted: "#8a7a6a",
  rule: "#e0d8d0",
  border: "#d4cdc5",
};

const productLinks = [
  { href: "/scholar-ask-preview", label: "ScholarAsk" },
  { href: "/workspace-preview", label: "Workspace" },
  { href: "/lit-review-preview", label: "Literature Review" },
  { href: "/meta-analysis-preview", label: "Meta-Analysis" },
  { href: "/paper-writer-preview", label: "Paper Writer" },
];

const companyLinks = [
  { href: "/about", label: "About" },
  { href: "/research-guidance", label: "Research Guide" },
  { href: "/projects", label: "Projects" },
  { href: "/help", label: "Help" },
];

export default function PublicMarketingFooter() {
  return (
    <footer style={{ background: "#f5f2ec" }}>
      <style>{`
        .public-footer-shell {
          max-width: 1100px;
          margin: 0 auto;
          padding: 48px 48px 0;
        }

        .public-footer-cta {
          background: #fff;
          border-radius: 20px;
          padding: 48px 56px;
          position: relative;
          z-index: 2;
          box-shadow: 0 4px 24px rgba(0,0,0,0.04);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 40px;
        }

        .public-footer-orbit {
          width: 280px;
          height: 260px;
          position: relative;
          flex-shrink: 0;
          overflow: visible;
        }

        .public-footer-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr 1.5fr;
          gap: 40px;
          padding: 48px 0;
        }

        .public-footer-bottom {
          border-top: 1px solid ${palette.rule};
          padding-top: 20px;
          padding-bottom: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        @media (prefers-reduced-motion: no-preference) {
          @keyframes footerOrbitCW  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes footerOrbitCCW { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
          .public-footer-orb-inner  { animation: footerOrbitCW  30s linear infinite; will-change: transform; }
          .public-footer-orb-middle { animation: footerOrbitCCW 50s linear infinite; will-change: transform; }
          .public-footer-orb-outer  { animation: footerOrbitCW  75s linear infinite; will-change: transform; }
          .public-footer-ct-inner  { animation: footerOrbitCCW 30s linear infinite; }
          .public-footer-ct-middle { animation: footerOrbitCW  50s linear infinite; }
          .public-footer-ct-outer  { animation: footerOrbitCCW 75s linear infinite; }
        }

        @media (max-width: 900px) {
          .public-footer-shell {
            padding: 32px 20px 0;
          }

          .public-footer-cta {
            padding: 34px 28px;
            align-items: flex-start;
          }

          .public-footer-orbit {
            width: 210px;
            height: 210px;
            transform: scale(0.82);
            transform-origin: center;
          }

          .public-footer-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 32px;
          }
        }

        @media (max-width: 680px) {
          .public-footer-cta {
            flex-direction: column;
          }

          .public-footer-orbit {
            align-self: center;
          }

          .public-footer-grid {
            grid-template-columns: 1fr;
            padding: 36px 0;
          }

          .public-footer-bottom {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>

      <div className="public-footer-shell">
        <div className="public-footer-cta">
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "var(--font-noto)", fontSize: "11px", color: palette.inkMuted, marginBottom: "8px" }}>
              Join Cerise Scholar
            </p>
            <h2 style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', serif", fontSize: "28px", fontWeight: 400, color: palette.ink, margin: "0 0 12px", lineHeight: 1.2 }}>
              Start your research <span style={{ fontStyle: "italic" }}>journey today</span>
            </h2>
            <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: palette.inkMuted, lineHeight: 1.6, maxWidth: "360px", marginBottom: "20px" }}>
              Free to use with no credit card required. Built for researchers who want a warmer, smarter workflow.
            </p>
            <Link
              href="/signup"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "14px 28px",
                borderRadius: "100px",
                background: palette.ink,
                color: "#fff",
                fontFamily: "var(--font-fredoka)",
                fontSize: "13px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Get started free ↗
            </Link>
          </div>

          <div aria-hidden="true" className="public-footer-orbit">
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "220px", height: "220px", borderRadius: "50%", border: "1px solid rgba(224,216,208,0.4)" }} />
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "150px", height: "150px", borderRadius: "50%", border: "1px solid rgba(224,216,208,0.35)" }} />
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "80px", height: "80px", borderRadius: "50%", border: "1px solid rgba(224,216,208,0.3)" }} />

            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "56px", height: "56px", borderRadius: "50%", background: "transparent", border: "1.5px solid rgba(224,216,208,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
              <span style={{ fontSize: "22px" }}>💡</span>
            </div>

            <div className="public-footer-orb-outer" style={{ position: "absolute", top: "50%", left: "50%", width: 0, height: 0 }}>
              <div style={{ position: "absolute", transform: "rotate(-45deg) translateX(110px) translateY(-17px)" }}>
                <div className="public-footer-ct-outer" style={{ width: "34px", height: "34px" }}>
                  <div style={{ width: "34px", height: "34px", borderRadius: "50%", aspectRatio: "1 / 1", overflow: "hidden", background: "#fff", border: "2px solid #e0d8d0", display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(45deg)" }}>
                    <img src={HEDGEHOG.hedgehog06Clasped} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  </div>
                </div>
              </div>
              <div style={{ position: "absolute", transform: "rotate(135deg) translateX(110px) translateY(-15px)" }}>
                <div className="public-footer-ct-outer" style={{ width: "30px", height: "30px" }}>
                  <div style={{ width: "30px", height: "30px", borderRadius: "50%", aspectRatio: "1 / 1", overflow: "hidden", background: "#fff", border: "2px solid #e0d8d0", display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(-135deg)" }}>
                    <img src={HEDGEHOG.hedgehog05Laptop} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="public-footer-orb-middle" style={{ position: "absolute", top: "50%", left: "50%", width: 0, height: 0 }}>
              <div style={{ position: "absolute", transform: "rotate(210deg) translateX(75px) translateY(-14px)" }}>
                <div className="public-footer-ct-middle" style={{ width: "28px", height: "28px" }}>
                  <div style={{ width: "28px", height: "28px", borderRadius: "50%", aspectRatio: "1 / 1", overflow: "hidden", background: "#fff", border: "2px solid #e0d8d0", display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(-210deg)" }}>
                    <img src={HEDGEHOG.hedgehog04RedPen} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  </div>
                </div>
              </div>
              <div style={{ position: "absolute", transform: "rotate(30deg) translateX(75px) translateY(-13px)" }}>
                <div className="public-footer-ct-middle" style={{ width: "26px", height: "26px" }}>
                  <div style={{ width: "26px", height: "26px", borderRadius: "50%", aspectRatio: "1 / 1", overflow: "hidden", background: "#fff", border: "2px solid #e0d8d0", display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(-30deg)" }}>
                    <img src={HEDGEHOG.hedgehog02Writing} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="public-footer-orb-inner" style={{ position: "absolute", top: "50%", left: "50%", width: 0, height: 0 }}>
              <div style={{ position: "absolute", transform: "rotate(180deg) translateX(40px) translateY(-15px)" }}>
                <div className="public-footer-ct-inner" style={{ width: "30px", height: "30px" }}>
                  <div style={{ width: "30px", height: "30px", borderRadius: "50%", aspectRatio: "1 / 1", overflow: "hidden", background: "#dbeafe", border: "2px solid #60a5fa", display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(-180deg)" }}>
                    <img src={HEDGEHOG.hedgehog11LitBook} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  </div>
                </div>
              </div>
              <div style={{ position: "absolute", transform: "rotate(0deg) translateX(40px) translateY(-18px)" }}>
                <div className="public-footer-ct-inner" style={{ width: "36px", height: "36px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", aspectRatio: "1 / 1", overflow: "hidden", background: "#fef3c7", border: "2px solid #f0b945", display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(0deg)" }}>
                    <img src={HEDGEHOG.hedgehog10Magnifier} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="public-footer-grid">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <img src={HEDGEHOG.hedgehog03Standing} alt="" style={{ width: "28px", height: "28px", objectFit: "contain" }} />
              <span style={{ fontFamily: "var(--font-playfair)", fontSize: "15px", color: palette.ink }}>
                Cerise Scholar
              </span>
            </div>
            <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: palette.inkMuted, lineHeight: 1.6, maxWidth: "220px" }}>
              The research companion for reading, highlighting, reviewing, and writing — built warmly, freely, and for you.
            </p>
          </div>

          <div>
            <p style={{ fontFamily: "var(--font-noto)", fontSize: "11px", fontWeight: 700, color: palette.ink, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "14px" }}>
              Product
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontFamily: "var(--font-dm-sans)", fontSize: "12px" }}>
              {productLinks.map((link) => (
                <Link className="hover:opacity-70" href={link.href} key={link.href} style={{ color: palette.inkMuted, textDecoration: "none" }}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p style={{ fontFamily: "var(--font-noto)", fontSize: "11px", fontWeight: 700, color: palette.ink, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "14px" }}>
              Company
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontFamily: "var(--font-dm-sans)", fontSize: "12px" }}>
              {companyLinks.map((link) => (
                <Link className="hover:opacity-70" href={link.href} key={link.href} style={{ color: palette.inkMuted, textDecoration: "none" }}>
                  {link.label}
                </Link>
              ))}
              <a className="hover:opacity-70" href="https://github.com/linhvotueduong/CeriseScholar" target="_blank" rel="noreferrer" style={{ color: palette.inkMuted, textDecoration: "none" }}>
                GitHub ↗
              </a>
            </div>
          </div>

          <div>
            <p style={{ fontFamily: "var(--font-noto)", fontSize: "11px", fontWeight: 700, color: palette.ink, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "14px" }}>
              Newsletter
            </p>
            <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: palette.inkMuted, lineHeight: 1.6, marginBottom: "14px" }}>
              Receive product updates, research tips, and early access.
            </p>
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                aria-label="Newsletter email"
                placeholder="Enter your email..."
                style={{ flex: 1, padding: "10px 14px", border: `1.5px solid ${palette.border}`, borderRadius: "100px", fontSize: "12px", fontFamily: "var(--font-dm-sans)", color: palette.ink, outline: "none", background: "#fff", minWidth: 0 }}
                type="email"
              />
              <button
                aria-label="Join newsletter"
                style={{ width: "40px", height: "40px", borderRadius: "50%", background: palette.ink, color: "#fff", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "16px", flexShrink: 0 }}
                type="button"
              >
                →
              </button>
            </div>
          </div>
        </div>

        <div className="public-footer-bottom">
          <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "11px", color: "#a09080" }}>
            © 2025 Cerise Scholar · All rights reserved · Made with Cerise Scholar
          </span>
          <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "11px", color: "#a09080" }}>
            Built for researchers
          </span>
        </div>
      </div>
    </footer>
  );
}
