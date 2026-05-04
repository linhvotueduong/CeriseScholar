import Link from "next/link";
import AdminSectionNav from "@/components/admin/AdminSectionNav";
import Navbar from "@/components/layout/Navbar";
import { requireAdminUser } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

const p = {
  ink: "#1a1208",
  muted: "#7a6a5a",
  faint: "#9a8a7a",
  cerise: "#c0392b",
  border: "#d4cdc5",
  warm: "#faf7f0",
  bg: "#fefefe",
};

const adminCards = [
  {
    description: "Review beta waitlist signups, approve access, and keep future cohort records without deleting them.",
    href: "/admin/users",
    label: "Open User Management",
    title: "User Management",
  },
  {
    description: "Create course modules, manage lesson videos, publish drafts, and edit student-facing course notes.",
    href: "/admin/courses",
    label: "Open Course Management",
    title: "Course Management",
  },
];

export default async function AdminHomePage() {
  const { user } = await requireAdminUser();

  return (
    <div style={{ minHeight: "100vh", background: p.bg, color: p.ink }}>
      <Navbar />
      <AdminSectionNav active="home" />
      <main style={{ maxWidth: "1180px", margin: "0 auto", padding: "42px 24px 72px" }}>
        <p
          style={{
            color: p.cerise,
            fontSize: "12px",
            fontWeight: 800,
            letterSpacing: "0.16em",
            margin: "0 0 10px",
            textTransform: "uppercase",
          }}
        >
          Admin
        </p>
        <h1
          style={{
            fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
            fontSize: "clamp(44px, 7vw, 78px)",
            fontWeight: 400,
            lineHeight: 1,
            margin: 0,
          }}
        >
          Admin Home
        </h1>
        <p style={{ color: p.muted, fontSize: "16px", lineHeight: 1.7, maxWidth: "760px" }}>
          Choose what you want to manage. Signed in as{" "}
          <strong style={{ color: p.ink }}>{user.email}</strong>.
        </p>

        <section
          style={{
            display: "grid",
            gap: "18px",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            marginTop: "30px",
          }}
        >
          {adminCards.map((card) => (
            <article
              key={card.href}
              style={{
                background: "#fff",
                border: `1px solid ${p.border}`,
                borderRadius: "8px",
                display: "grid",
                gap: "20px",
                padding: "26px",
              }}
            >
              <div>
                <h2
                  style={{
                    fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
                    fontSize: "30px",
                    fontWeight: 400,
                    margin: "0 0 10px",
                  }}
                >
                  {card.title}
                </h2>
                <p style={{ color: p.muted, fontSize: "15px", lineHeight: 1.65, margin: 0 }}>{card.description}</p>
              </div>
              <Link
                href={card.href}
                style={{
                  alignSelf: "end",
                  background: card.href.includes("courses") ? p.warm : p.ink,
                  border: card.href.includes("courses") ? `1px solid ${p.border}` : "none",
                  borderRadius: "999px",
                  color: card.href.includes("courses") ? p.ink : "#fff",
                  fontSize: "14px",
                  fontWeight: 800,
                  justifySelf: "start",
                  padding: "11px 18px",
                  textDecoration: "none",
                }}
              >
                {card.label}
              </Link>
            </article>
          ))}
        </section>

        <div
          style={{
            background: p.warm,
            border: `1px solid ${p.border}`,
            borderRadius: "8px",
            color: p.faint,
            fontSize: "14px",
            lineHeight: 1.65,
            marginTop: "24px",
            padding: "16px",
          }}
        >
          Database-backed waitlist management requires the beta waitlist migration to be applied before live use.
        </div>
      </main>
    </div>
  );
}
