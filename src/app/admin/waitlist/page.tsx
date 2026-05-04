import AdminSectionNav from "@/components/admin/AdminSectionNav";
import Navbar from "@/components/layout/Navbar";
import { requireAdminUser } from "@/lib/admin/auth";
import { waitlistDecisionEmail } from "@/lib/beta/emailTemplates";
import { betaWaitlistStatusLabels, type BetaWaitlistApplication, type BetaWaitlistStatus } from "@/types/beta";
import { updateWaitlistApplication } from "./actions";

export const dynamic = "force-dynamic";

const p = {
  ink: "#1a1208",
  muted: "#7a6a5a",
  faint: "#9a8a7a",
  cerise: "#c0392b",
  border: "#d4cdc5",
  rule: "#e0d8d0",
  warm: "#faf7f0",
  bg: "#fefefe",
};

function statusTone(status: BetaWaitlistStatus) {
  if (status === "approved") return { background: "#eef7ee", color: "#2f6b3f", border: "#bddfc4" };
  if (status === "future_cohort") return { background: "#f7f0ea", color: "#8b5c31", border: "#e5cdb7" };
  return { background: "#fff8e6", color: "#85620f", border: "#ead48e" };
}

function formatDate(value?: string | null) {
  if (!value) return "Not yet";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function countByStatus(applications: BetaWaitlistApplication[], status: BetaWaitlistStatus) {
  return applications.filter((application) => application.status === status).length;
}

export default async function AdminWaitlistPage() {
  const { supabase } = await requireAdminUser();
  const { data, error } = await supabase
    .from("beta_waitlist_applications")
    .select("*")
    .order("created_at", { ascending: false });

  const applications = ((data ?? []) as BetaWaitlistApplication[]) || [];
  const counts = {
    total: applications.length,
    pending: countByStatus(applications, "pending_review"),
    approved: countByStatus(applications, "approved"),
    future: countByStatus(applications, "future_cohort"),
  };

  return (
    <div style={{ minHeight: "100vh", background: p.bg, color: p.ink }}>
      <Navbar />
      <AdminSectionNav active="users" />
      <main style={{ maxWidth: "1180px", margin: "0 auto", padding: "42px 24px 72px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "20px", flexWrap: "wrap" }}>
          <div>
            <p
              style={{
                color: p.cerise,
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                marginBottom: "10px",
              }}
            >
              Admin
            </p>
            <h1
              style={{
                fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
                fontSize: "clamp(42px, 7vw, 76px)",
                fontWeight: 400,
                lineHeight: 1,
                margin: 0,
              }}
            >
              User Management
            </h1>
            <p style={{ color: p.muted, fontSize: "16px", lineHeight: 1.7, maxWidth: "720px" }}>
              Review public beta waitlist accounts, approve access, or move someone into a future cohort without
              deleting their record.
            </p>
          </div>
        </div>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "14px",
            margin: "28px 0",
          }}
        >
          {[
            ["Total", counts.total],
            ["Pending Review", counts.pending],
            ["Approved", counts.approved],
            ["Future Cohort", counts.future],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                border: `1px solid ${p.border}`,
                borderRadius: "8px",
                background: "#fff",
                padding: "18px",
              }}
            >
              <p style={{ color: p.faint, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                {label}
              </p>
              <p style={{ fontSize: "34px", margin: "8px 0 0", fontWeight: 700 }}>{value}</p>
            </div>
          ))}
        </section>

        <div
          style={{
            border: `1px solid ${p.rule}`,
            borderRadius: "8px",
            background: p.warm,
            color: p.muted,
            fontSize: "14px",
            lineHeight: 1.65,
            padding: "16px",
            marginBottom: "24px",
          }}
        >
          Email templates are prepared in code, but custom email sending is disabled until a provider is configured and
          approved. Supabase Auth may still send its normal account confirmation email.
        </div>

        {error && (
          <div style={{ border: `1px solid ${p.cerise}`, color: p.cerise, borderRadius: "8px", padding: "16px" }}>
            Could not load waitlist applications: {error.message}
          </div>
        )}

        <section style={{ display: "grid", gap: "16px" }}>
          {applications.length === 0 && !error && (
            <div
              style={{
                border: `1px solid ${p.border}`,
                borderRadius: "8px",
                background: "#fff",
                padding: "28px",
                color: p.muted,
              }}
            >
              No waitlist signups yet.
            </div>
          )}

          {applications.map((application) => {
            const tone = statusTone(application.status);
            const template = waitlistDecisionEmail(application.email, application.status);

            return (
              <article
                key={application.id}
                style={{
                  border: `1px solid ${p.border}`,
                  borderRadius: "8px",
                  background: "#fff",
                  padding: "20px",
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr)",
                  gap: "16px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "14px", flexWrap: "wrap" }}>
                  <div>
                    <h2 style={{ margin: "0 0 6px", fontSize: "22px" }}>{application.email}</h2>
                    <p style={{ margin: 0, color: p.muted, fontSize: "14px" }}>
                      Joined {formatDate(application.created_at)} via {application.signup_method}
                    </p>
                  </div>
                  <span
                    style={{
                      alignSelf: "flex-start",
                      border: `1px solid ${tone.border}`,
                      background: tone.background,
                      color: tone.color,
                      borderRadius: "999px",
                      padding: "7px 12px",
                      fontSize: "12px",
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    {betaWaitlistStatusLabels[application.status]}
                  </span>
                </div>

                <form action={updateWaitlistApplication} style={{ display: "grid", gap: "12px" }}>
                  <input name="id" type="hidden" value={application.id} />
                  <label style={{ display: "grid", gap: "6px", color: p.muted, fontSize: "13px" }}>
                    Admin notes
                    <textarea
                      name="admin_notes"
                      defaultValue={application.admin_notes}
                      rows={3}
                      style={{
                        resize: "vertical",
                        border: `1px solid ${p.border}`,
                        borderRadius: "8px",
                        color: p.ink,
                        fontFamily: "inherit",
                        fontSize: "14px",
                        padding: "10px 12px",
                      }}
                    />
                  </label>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                    <button
                      name="status"
                      value="approved"
                      style={{
                        border: "none",
                        borderRadius: "999px",
                        background: p.ink,
                        color: "#fff",
                        cursor: "pointer",
                        fontWeight: 800,
                        padding: "10px 16px",
                      }}
                      type="submit"
                    >
                      Approve
                    </button>
                    <button
                      name="status"
                      value="future_cohort"
                      style={{
                        border: `1px solid ${p.border}`,
                        borderRadius: "999px",
                        background: p.warm,
                        color: p.ink,
                        cursor: "pointer",
                        fontWeight: 800,
                        padding: "10px 16px",
                      }}
                      type="submit"
                    >
                      Future Cohort
                    </button>
                    <button
                      name="status"
                      value="pending_review"
                      style={{
                        border: `1px solid ${p.border}`,
                        borderRadius: "999px",
                        background: "#fff",
                        color: p.ink,
                        cursor: "pointer",
                        fontWeight: 800,
                        padding: "10px 16px",
                      }}
                      type="submit"
                    >
                      Keep Pending
                    </button>
                  </div>
                </form>

                <details style={{ color: p.muted, fontSize: "13px", lineHeight: 1.6 }}>
                  <summary style={{ cursor: "pointer", color: p.ink, fontWeight: 700 }}>Email template preview</summary>
                  <p style={{ marginBottom: "6px" }}>
                    <strong>Subject:</strong> {template.subject}
                  </p>
                  <pre
                    style={{
                      whiteSpace: "pre-wrap",
                      background: p.warm,
                      border: `1px solid ${p.rule}`,
                      borderRadius: "8px",
                      padding: "12px",
                      fontFamily: "var(--font-mono), monospace",
                      fontSize: "12px",
                      overflowX: "auto",
                    }}
                  >
                    {template.text}
                  </pre>
                </details>
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}
