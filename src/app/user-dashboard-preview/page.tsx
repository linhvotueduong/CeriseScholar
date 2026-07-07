import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import PublicMarketingNavbar from "@/components/layout/PublicMarketingNavbar";

export const metadata: Metadata = {
  title: "User Dashboard Preview | Cerise Scholar",
  description: "Public mock preview of the Cerise Scholar user dashboard and account area.",
};

const sidebarItems = [
  ["01", "Dashboard", "Research home"],
  ["02", "Research Track", "Projects and evidence"],
  ["03", "Learning Track", "Courses"],
  ["04", "Cerise Space", "Community"],
  ["05", "Account", "Profile and privacy"],
];

const projectRows = [
  {
    name: "Geopolitical influence and peace",
    body: "Literature review for conflict mediation, theory notes, and draft framing.",
    stage: "Reading",
    date: "May 14",
    progress: "62%",
    color: "#c0392b",
  },
  {
    name: "AI ethics in student research",
    body: "Saved papers, classroom policy notes, and citation questions for a short report.",
    stage: "Sources",
    date: "May 9",
    progress: "38%",
    color: "#d4a843",
  },
  {
    name: "Public health communication",
    body: "Early reading list with source summaries waiting for the next pass.",
    stage: "Collecting",
    date: "Apr 28",
    progress: "24%",
    color: "#7a8a6a",
  },
];

const setupRows = [
  {
    label: "OpenRouter setup",
    status: "Connected",
    tone: "ready" as const,
    body: "Ready for limited testing.",
  },
  {
    label: "OpenRouter",
    status: "Ready",
    tone: "ready" as const,
    body: "Serving the included and own-key lanes.",
  },
  {
    label: "Project files",
    status: "User controlled",
    tone: "quiet" as const,
    body: "Handled through hosted project workflows.",
  },
  {
    label: "Metering",
    status: "Active",
    tone: "ready" as const,
    body: "Requests are counted before and after AI answers.",
  },
];

const permissionMetrics = [
  {
    label: "Checks ready",
    value: "4/4",
    note: "Lane, key, files, meter",
    tone: "ready" as const,
  },
  {
    label: "AI services",
    value: "2",
    note: "OpenRouter and routing ready",
    tone: "active" as const,
  },
  {
    label: "Project storage",
    value: "1",
    note: "Hosted workspace active",
    tone: "quiet" as const,
  },
  {
    label: "Own-key lane",
    value: "On",
    note: "Unlimited when connected",
    tone: "attention" as const,
  },
];

const permissionSegments = [
  ["Included", "27%", "#c0392b"],
  ["Own key", "26%", "#d4a843"],
  ["Storage", "25%", "#7a8a6a"],
  ["Meter", "22%", "#1a1208"],
];

const readinessBars = [36, 48, 58, 44, 72, 84, 68, 92];

const vaultFolders = [
  ["Papers", "18 files", "#fff5f2"],
  ["Highlights", "42 notes", "#faf7f0"],
  ["Drafts", "3 sections", "#f7f4e8"],
  ["Citations", "12 saved", "#f5f8ef"],
];

const nextActions = [
  ["Source gap", "Find one methods paper for the literature review.", "#c0392b"],
  ["Draft step", "Move the strongest quote into the intro outline.", "#d4a843"],
  ["AI", "OpenRouter setup is ready for ScholarAsk.", "#7a8a6a"],
];

const accountLinks = [
  ["Profile", "Name, email, login method"],
  ["AI setup", "OpenRouter, provider key, usage"],
  ["Privacy", "Hosted workspace and account data"],
  ["Support", "Help Center and contact"],
];

export default function UserDashboardPreviewPage() {
  return (
    <main
      className="min-h-screen bg-[#fffefa] text-[#1a1208]"
      style={{ fontFamily: "var(--font-noto), 'Noto Sans', sans-serif" }}
    >
      <PublicMarketingNavbar />

      <style>{`
        .cerise-preview-shell {
          border: 1px solid #d4cdc5;
          border-radius: 8px;
          background: #fefefe;
          box-shadow: 0 18px 50px rgba(26, 18, 8, 0.08);
          overflow: hidden;
        }

        .cerise-preview-app {
          display: grid;
          grid-template-columns: 220px minmax(0, 1fr) 310px;
          min-height: 720px;
        }

        .cerise-preview-sidebar {
          background: #f5f0eb;
          border-right: 1px solid #e0d8d0;
          padding: 26px 22px;
        }

        .cerise-preview-main {
          padding: 28px;
          min-width: 0;
        }

        .cerise-preview-rail {
          border-left: 1px solid #e0d8d0;
          background: #fffefa;
          padding: 24px 20px;
        }

        .cerise-preview-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
          gap: 14px;
        }

        .cerise-preview-card {
          border: 1px solid #d4cdc5;
          border-radius: 8px;
          background: #fff;
          box-shadow: 0 10px 30px rgba(26, 18, 8, 0.045);
        }

        .cerise-preview-muted-card {
          border: 1px solid #e0d8d0;
          border-radius: 8px;
          background: #fffefa;
        }

        .cerise-preview-folder {
          border: 1px solid #d4cdc5;
          border-radius: 8px;
          min-height: 116px;
          position: relative;
          overflow: hidden;
        }

        .cerise-preview-folder::before {
          content: "";
          position: absolute;
          left: 16px;
          top: 0;
          width: 70px;
          height: 18px;
          background: rgba(26, 18, 8, 0.06);
          border-radius: 0 0 8px 8px;
        }

        @media (max-width: 1100px) {
          .cerise-preview-app {
            grid-template-columns: 1fr;
          }

          .cerise-preview-sidebar,
          .cerise-preview-rail {
            border: 0;
          }

          .cerise-preview-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="mx-auto max-w-[1240px] px-5 pb-20 pt-16 sm:px-8 sm:pt-20 lg:px-0">
        <header className="grid gap-8 border-b border-[#e0d8d0] pb-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
          <div>
            <p className="text-[11px] font-black uppercase tracking-normal text-[#c0392b]">
              Public preview
            </p>
            <h1 className="mt-4 max-w-[800px] font-display text-[42px] font-normal leading-[1.02] tracking-normal text-[#1a1208] sm:text-[60px]">
              User dashboard and account preview
            </h1>
            <p className="mt-5 max-w-[690px] text-[15px] leading-7 text-[#7a6a5a]">
              A no-login mock that pulls the inspiration into visible Cerise patterns: dashboard
              shell, continue-working card, project desk, local file controls, account settings, and
              avatar support access.
            </p>
          </div>

          <AvatarMenuPreview />
        </header>

        <section className="pt-10">
          <SectionIntro
            eyebrow="Screen 01"
            title="Dashboard Home"
            body="This version borrows the admin sidebar density, the project dashboard controls, the local file cards, and the right-side priority panel."
          />

          <div className="cerise-preview-shell mt-5">
            <div className="cerise-preview-app">
              <aside className="cerise-preview-sidebar">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#1a1208] text-xs font-black text-white">
                    CS
                  </div>
                  <div>
                    <p className="text-sm font-black text-[#1a1208]">Cerise Scholar</p>
                    <p className="text-[11px] text-[#7a6a5a]">Student workspace</p>
                  </div>
                </div>

                <div className="mt-9 grid gap-2">
                  {sidebarItems.map(([number, label, body], index) => (
                    <div
                      className={`grid grid-cols-[34px_1fr] gap-3 rounded-[8px] border p-3 ${
                        index === 0
                          ? "border-[#1a1208] bg-[#1a1208] text-white"
                          : "border-[#e0d8d0] bg-white text-[#1a1208]"
                      }`}
                      key={label}
                    >
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-[6px] text-[10px] font-black ${
                          index === 0 ? "bg-white/12 text-white" : "bg-[#faf7f0] text-[#9a8a7a]"
                        }`}
                      >
                        {number}
                      </span>
                      <span>
                        <span className="block text-xs font-black">{label}</span>
                        <span
                          className={`mt-0.5 block text-[10px] ${
                            index === 0 ? "text-white/65" : "text-[#9a8a7a]"
                          }`}
                        >
                          {body}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-9 rounded-[8px] border border-[#e0d8d0] bg-white p-4">
                  <p className="text-[11px] font-black uppercase tracking-normal text-[#c0392b]">
                    Beta note
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[#7a6a5a]">
                    AI features run through the included lane or your connected key.
                  </p>
                </div>
              </aside>

              <div className="cerise-preview-main">
                <div className="flex flex-col gap-4 border-b border-[#e0d8d0] pb-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-normal text-[#c0392b]">
                      Public beta workspace
                    </p>
                    <h2 className="mt-2 font-display text-[38px] font-normal leading-tight tracking-normal text-[#1a1208]">
                      Good morning, Cerise
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <MockButton tone="light">Help Center</MockButton>
                    <MockButton tone="light">Contact</MockButton>
                    <MockButton tone="dark">New Project</MockButton>
                  </div>
                </div>

                <div className="cerise-preview-grid mt-5">
                  <ContinueCard />
                  <LocalSetupCard />
                </div>

                <ProjectDesk />

                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  <AreaCard eyebrow="Research Track" title="Projects">
                    Papers, notes, PDFs, and drafts stay grouped by research thread.
                  </AreaCard>
                  <AreaCard eyebrow="Learning Track" title="Courses">
                    Courses stay separate from research work, with progress only where it belongs.
                  </AreaCard>
                  <AreaCard eyebrow="Cerise Space" title="Community">
                    Product notes and student questions without making the dashboard noisy.
                  </AreaCard>
                </div>
              </div>

              <aside className="cerise-preview-rail">
                <PriorityPanel />
                <VaultFolderPanel />
                <SupportPanel />
              </aside>
            </div>
          </div>
        </section>

        <section className="pt-12">
          <SectionIntro
            eyebrow="Screen 02"
            title="Account and Profile"
            body="This version borrows the account/settings side navigation, the integration rows, the permission toggles, and the local file/folder language."
          />

          <div className="cerise-preview-shell mt-5">
            <div className="grid min-h-[620px] grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)]">
              <aside className="border-b border-[#e0d8d0] bg-[#f5f0eb] p-6 lg:border-b-0 lg:border-r">
                <p className="text-sm font-black text-[#1a1208]">Account Settings</p>
                <div className="mt-5 grid gap-2">
                  {accountLinks.map(([label, body], index) => (
                    <div
                      className={`rounded-[8px] border p-3 ${
                        index === 1
                          ? "border-[#1a1208] bg-[#1a1208] text-white"
                          : "border-[#e0d8d0] bg-white text-[#1a1208]"
                      }`}
                      key={label}
                    >
                      <p className="text-xs font-black">{label}</p>
                      <p className={`mt-1 text-[11px] ${index === 1 ? "text-white/65" : "text-[#8a7a6a]"}`}>
                        {body}
                      </p>
                    </div>
                  ))}
                </div>
              </aside>

              <div className="p-5 sm:p-7">
                <header className="border-b border-[#e0d8d0] pb-6">
                  <p className="text-[11px] font-black uppercase tracking-normal text-[#c0392b]">
                    Account
                  </p>
                  <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <h2 className="font-display text-[38px] font-normal leading-tight tracking-normal text-[#1a1208]">
                        Your Cerise profile
                      </h2>
                      <p className="mt-3 max-w-[620px] text-sm leading-6 text-[#7a6a5a]">
                        See identity, beta access, laptop readiness, privacy boundaries, and help
                        paths without turning account settings into a control panel.
                      </p>
                    </div>
                    <MockButton tone="light">Sign Out</MockButton>
                  </div>
                </header>

                <div className="mt-6 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                  <ProfileCard />
                  <LocalPermissionsCard />
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_320px]">
                  <PrivacyFilesCard />
                  <NeedHelpCard />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function AvatarMenuPreview() {
  const items = ["Account", "Dashboard", "Settings", "Help Center", "Contact support"];

  return (
    <div className="cerise-preview-card p-5">
      <p className="text-[11px] font-black uppercase tracking-normal text-[#c0392b]">
        Avatar menu
      </p>
      <div className="mt-4 rounded-[8px] border border-[#d4cdc5] bg-white p-2 shadow-[0_16px_36px_rgba(26,18,8,0.12)]">
        <div className="border-b border-[#eee6dd] px-3 py-2">
          <p className="truncate text-[12px] font-black text-[#1a1208]">Cerise Scholar</p>
          <p className="mt-0.5 truncate text-[11px] text-[#7a6a5a]">student@example.com</p>
        </div>
        <div className="py-2">
          {items.map((item) => (
            <div
              className="rounded-[8px] px-3 py-2 text-[12px] font-semibold text-[#1a1208]"
              key={item}
            >
              {item}
            </div>
          ))}
        </div>
        <div className="border-t border-[#eee6dd] pt-2">
          <div className="rounded-[8px] px-3 py-2 text-[12px] font-semibold text-[#c0392b]">
            Sign Out
          </div>
        </div>
      </div>
    </div>
  );
}

function ContinueCard() {
  return (
    <section className="cerise-preview-card p-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_210px]">
        <div>
          <p className="text-[11px] font-black uppercase tracking-normal text-[#c0392b]">
            Continue research
          </p>
          <h3 className="mt-2 font-display text-[31px] font-normal leading-tight tracking-normal text-[#1a1208]">
            Geopolitical influence and peace
          </h3>
          <p className="mt-3 max-w-[620px] text-sm leading-6 text-[#7a6a5a]">
            Literature review for conflict mediation, theory notes, and draft framing.
          </p>

          <div className="mt-5 grid gap-3 rounded-[8px] border border-[#eee6dd] bg-[#fffefa] p-4 md:grid-cols-[1fr_160px]">
            <div>
              <p className="text-[11px] font-black uppercase tracking-normal text-[#9a8a7a]">
                Next useful step
              </p>
              <p className="mt-2 text-sm font-black leading-6 text-[#1a1208]">
                Move two saved source notes into the literature review outline.
              </p>
            </div>
            <div className="grid gap-2">
              <ProgressBar label="Sources" value="18 saved" percent="72%" />
              <ProgressBar label="Draft" value="3 sections" percent="38%" />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <MockButton tone="dark">Open Project</MockButton>
            <MockButton tone="light">Research Guide</MockButton>
          </div>
        </div>

        <div className="grid content-start gap-3 border-t border-[#eee6dd] pt-4 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
          <Metric label="Projects" value="3" />
          <Metric label="Latest edit" value="May 14" />
          <Metric label="AI" value="Included" />
        </div>
      </div>
    </section>
  );
}

function LocalSetupCard() {
  return <LocalPermissionMetricsCard compact />;
}

function ProjectDesk() {
  return (
    <section className="cerise-preview-card mt-4 p-5">
      <div className="flex flex-col gap-4 border-b border-[#eee6dd] pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-normal text-[#c0392b]">
            Research Track preview
          </p>
          <h3 className="mt-2 text-lg font-black tracking-normal text-[#1a1208]">Project desk</h3>
          <p className="mt-1 text-sm leading-6 text-[#7a6a5a]">
            Switch between cards, table, and timeline when the project list grows.
          </p>
        </div>
        <div className="flex w-fit rounded-full border border-[#d4cdc5] bg-[#faf7f0] p-1 text-xs font-black text-[#7a6a5a]">
          <span className="rounded-full bg-[#1a1208] px-3 py-1 text-white">Card</span>
          <span className="px-3 py-1">Table</span>
          <span className="px-3 py-1">Timeline</span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {projectRows.map((project) => (
          <div className="rounded-[8px] border border-[#e0d8d0] bg-[#fffefa] p-4" key={project.name}>
            <div className="flex items-start justify-between gap-3">
              <span
                aria-hidden="true"
                className="h-3 w-3 rounded-full"
                style={{ background: project.color }}
              />
              <StatusPill tone={project.stage === "Reading" ? "active" : "quiet"}>
                {project.stage}
              </StatusPill>
            </div>
            <h4 className="mt-4 text-sm font-black leading-5 text-[#1a1208]">{project.name}</h4>
            <p className="mt-2 text-xs leading-5 text-[#7a6a5a]">{project.body}</p>
            <div className="mt-4">
              <div className="flex justify-between text-[11px] font-black uppercase tracking-normal text-[#9a8a7a]">
                <span>{project.date}</span>
                <span>{project.progress}</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-[#eee6dd]">
                <div
                  className="h-1.5 rounded-full"
                  style={{ background: project.color, width: project.progress }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PriorityPanel() {
  return (
    <section className="cerise-preview-card p-5">
      <p className="text-[11px] font-black uppercase tracking-normal text-[#c0392b]">Today</p>
      <h3 className="mt-2 text-lg font-black tracking-normal text-[#1a1208]">What to do next</h3>
      <div className="mt-4 grid gap-3">
        {nextActions.map(([label, body, color]) => (
          <div className="grid grid-cols-[4px_1fr] gap-3" key={label}>
            <span className="rounded-full" style={{ background: color }} />
            <div>
              <p className="text-sm font-black text-[#1a1208]">{label}</p>
              <p className="mt-1 text-xs leading-5 text-[#7a6a5a]">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function VaultFolderPanel() {
  return (
    <section className="mt-4">
      <p className="text-[11px] font-black uppercase tracking-normal text-[#c0392b]">
        Project workspace
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {vaultFolders.map(([label, body, color]) => (
          <div
            className="cerise-preview-folder p-4 pt-8"
            key={label}
            style={{ background: color }}
          >
            <p className="text-sm font-black text-[#1a1208]">{label}</p>
            <p className="mt-1 text-xs text-[#7a6a5a]">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SupportPanel() {
  return (
    <section className="cerise-preview-muted-card mt-4 p-5">
      <p className="text-[11px] font-black uppercase tracking-normal text-[#c0392b]">Support</p>
      <h3 className="mt-2 text-lg font-black tracking-normal text-[#1a1208]">Help stays close</h3>
      <p className="mt-3 text-sm leading-6 text-[#7a6a5a]">
        Setup questions, beta feedback, and contact support stay visible without taking over the
        workspace.
      </p>
      <div className="mt-4 grid gap-2">
        <Link
          className="inline-flex h-9 items-center justify-center rounded-full bg-[#1a1208] px-4 text-xs font-black text-white no-underline"
          href="/help/contact?type=help"
        >
          Request support
        </Link>
        <Link
          className="inline-flex h-9 items-center justify-center rounded-full border border-[#d4cdc5] bg-white px-4 text-xs font-black text-[#1a1208] no-underline"
          href="/help"
        >
          Open Help Center
        </Link>
      </div>
    </section>
  );
}

function ProfileCard() {
  return (
    <section className="cerise-preview-card p-5">
      <p className="text-[11px] font-black uppercase tracking-normal text-[#c0392b]">Signed in as</p>
      <h3 className="mt-2 text-base font-black tracking-normal text-[#1a1208]">Profile identity</h3>
      <div className="mt-4 flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#1a1208] text-base font-black uppercase text-white">
          CS
        </div>
        <div className="min-w-0">
          <h4 className="truncate text-lg font-black text-[#1a1208]">Cerise Scholar</h4>
          <p className="mt-1 truncate text-sm text-[#7a6a5a]">student@example.com</p>
          <div className="mt-4 grid gap-2 text-sm">
            <DetailRow label="Login method" value="Google" />
            <DetailRow label="Member since" value="May 2026" />
            <DetailRow label="Beta status" value="Public laptop beta tester" />
          </div>
        </div>
      </div>
    </section>
  );
}

function LocalPermissionsCard() {
  return <LocalPermissionMetricsCard />;
}

function LocalPermissionMetricsCard({ compact = false }: { compact?: boolean }) {
  return (
    <section className="cerise-preview-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-normal text-[#c0392b]">
            {compact ? "Local setup" : "Trusted laptop"}
          </p>
          <h3
            className={`mt-2 font-black tracking-normal text-[#1a1208] ${
              compact ? "text-lg" : "text-base"
            }`}
          >
            {compact ? "Laptop signal" : "Local permissions"}
          </h3>
        </div>
        <MockButton tone="light">{compact ? "Check" : "Check now"}</MockButton>
      </div>

      <div className={`mt-4 grid gap-3 ${compact ? "grid-cols-2" : "sm:grid-cols-4"}`}>
        {permissionMetrics.map((metric, index) => (
          <div
            className={`rounded-[8px] border border-[#eee6dd] bg-[#fffefa] p-3 ${
              compact && index > 1 ? "hidden" : ""
            }`}
            key={metric.label}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[10px] font-black uppercase tracking-normal text-[#9a8a7a]">
                {metric.label}
              </p>
              <span
                aria-hidden="true"
                className={`mt-0.5 h-2 w-2 rounded-full ${
                  metric.tone === "ready"
                    ? "bg-[#6f9a4f]"
                    : metric.tone === "active"
                      ? "bg-[#c0392b]"
                      : metric.tone === "attention"
                        ? "bg-[#d4a843]"
                        : "bg-[#cfc5ba]"
                }`}
              />
            </div>
            <p className="mt-2 text-2xl font-black leading-none text-[#1a1208]">{metric.value}</p>
            <p className="mt-2 min-h-8 text-[11px] leading-4 text-[#7a6a5a]">{metric.note}</p>
          </div>
        ))}
      </div>

      <div className={`mt-4 grid gap-3 ${compact ? "" : "xl:grid-cols-[1fr_210px]"}`}>
        <div className="rounded-[8px] border border-[#eee6dd] bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-normal text-[#9a8a7a]">
                Local readiness
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-[34px] font-black leading-none text-[#1a1208]">92%</span>
                <span className="text-[11px] font-black uppercase tracking-normal text-[#6f9a4f]">
                  ready
                </span>
              </div>
            </div>
            <div className="flex h-16 items-end gap-1.5">
              {readinessBars.map((height, index) => (
                <span
                  aria-hidden="true"
                  className={`w-2 rounded-full ${index === readinessBars.length - 1 ? "bg-[#c0392b]" : "bg-[#eee6dd]"}`}
                  key={`${height}-${index}`}
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>

          <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-[#f1ece6]">
            {permissionSegments.map(([label, width, color]) => (
              <span
                aria-label={label}
                className="h-full"
                key={label}
                style={{ background: color, width }}
              />
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-4">
            {permissionSegments.map(([label, , color]) => (
              <div
                className="flex items-center gap-1.5 text-[10px] font-black text-[#7a6a5a]"
                key={label}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {!compact ? <PermissionReadout /> : null}
      </div>

      {compact ? (
        <div className="mt-4">
          <PermissionReadout />
        </div>
      ) : null}
    </section>
  );
}

function PermissionReadout() {
  return (
    <div className="rounded-[8px] border border-[#eee6dd] bg-[#fffefa] p-3">
      <div className="flex items-center justify-between gap-3 border-b border-[#eee6dd] pb-2">
        <p className="text-[10px] font-black uppercase tracking-normal text-[#9a8a7a]">
          Permission readout
        </p>
        <StatusPill tone="ready">Live</StatusPill>
      </div>
      <div className="mt-2 grid gap-2">
        {setupRows.map((row) => (
          <div className="grid gap-1 rounded-[8px] bg-white px-3 py-2" key={row.label}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-black text-[#1a1208]">{row.label}</span>
              <span className="text-[11px] font-black text-[#7a6a5a]">{row.status}</span>
            </div>
            <p className="text-[11px] leading-4 text-[#7a6a5a]">{row.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrivacyFilesCard() {
  return (
    <section className="cerise-preview-card p-5">
      <p className="text-[11px] font-black uppercase tracking-normal text-[#c0392b]">
        Hosted boundary
      </p>
      <h3 className="mt-2 text-base font-black tracking-normal text-[#1a1208]">
        Privacy and project files
      </h3>
      <p className="mt-4 text-sm leading-6 text-[#7a6a5a]">
        Project materials and AI requests move through the hosted workspace and selected providers.
        Support records remain separate.
      </p>
      <div className="mt-5 grid gap-2 text-sm">
        <DetailRow label="Private source files" value="Handled through hosted project workflows" />
        <DetailRow label="AI provider" value="OpenRouter included or own-key lane" />
        <DetailRow label="Hosted account data" value="Managed through Supabase authentication" />
      </div>
    </section>
  );
}

function NeedHelpCard() {
  return (
    <section className="cerise-preview-muted-card p-5">
      <p className="text-[11px] font-black uppercase tracking-normal text-[#c0392b]">Support</p>
      <h3 className="mt-2 text-base font-black tracking-normal text-[#1a1208]">Need a hand?</h3>
      <p className="mt-4 text-sm leading-6 text-[#7a6a5a]">
        If setup feels stuck, send the page, device type, and the message Cerise showed you.
      </p>
      <Link
        className="mt-5 inline-flex h-9 items-center rounded-full bg-[#1a1208] px-4 text-xs font-black text-white no-underline"
        href="/help/contact?type=help"
      >
        Request support
      </Link>
    </section>
  );
}

function AreaCard({
  children,
  eyebrow,
  title,
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="cerise-preview-card p-5">
      <p className="text-[11px] font-black uppercase tracking-normal text-[#c0392b]">{eyebrow}</p>
      <h3 className="mt-2 text-lg font-black tracking-normal text-[#1a1208]">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-[#7a6a5a]">{children}</p>
    </section>
  );
}

function SectionIntro({ body, eyebrow, title }: { body: string; eyebrow: string; title: string }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[11px] font-black uppercase tracking-normal text-[#c0392b]">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-black tracking-normal text-[#1a1208]">{title}</h2>
      </div>
      <p className="max-w-[520px] text-sm leading-6 text-[#7a6a5a]">{body}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-[#eee6dd] pb-3 last:border-b-0 last:pb-0">
      <p className="text-[11px] font-black uppercase tracking-normal text-[#9a8a7a]">{label}</p>
      <p className="mt-1 text-sm font-black text-[#1a1208]">{value}</p>
    </div>
  );
}

function ProgressBar({ label, percent, value }: { label: string; percent: string; value: string }) {
  return (
    <div>
      <div className="flex justify-between gap-3 text-[11px] font-black uppercase tracking-normal text-[#9a8a7a]">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-[#eee6dd]">
        <div className="h-1.5 rounded-full bg-[#c0392b]" style={{ width: percent }} />
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-t border-[#eee6dd] pt-2 sm:grid-cols-[150px_1fr] sm:gap-3">
      <span className="text-[11px] font-black uppercase tracking-normal text-[#9a8a7a]">
        {label}
      </span>
      <span className="min-w-0 break-words text-sm font-semibold text-[#1a1208]">{value}</span>
    </div>
  );
}

function StatusPill({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "active" | "ready" | "attention" | "quiet";
}) {
  const styles = {
    active: "border-[#f0d3cc] bg-[#fff5f2] text-[#c0392b]",
    ready: "border-[#cfe0c6] bg-[#f1f8ed] text-[#3f6f2c]",
    attention: "border-[#efd8a5] bg-[#fff8e8] text-[#9a6a1f]",
    quiet: "border-[#e0d8d0] bg-[#faf7f0] text-[#7a6a5a]",
  };

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${styles[tone]}`}>
      {children}
    </span>
  );
}

function MockButton({ children, tone }: { children: ReactNode; tone: "dark" | "light" }) {
  return (
    <span
      className={`inline-flex h-9 w-fit items-center justify-center rounded-full px-4 text-xs font-black ${
        tone === "dark"
          ? "bg-[#1a1208] text-white"
          : "border border-[#d4cdc5] bg-white text-[#1a1208]"
      }`}
    >
      {children}
    </span>
  );
}
