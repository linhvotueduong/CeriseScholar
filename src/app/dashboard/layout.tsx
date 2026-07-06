import AppShell from "@/components/app-shell/AppShell";

// The old local-agent setup wizard (LocalSetupOnboarding) used to mount here.
// It is replaced by the one-time AI welcome popup, rendered by the dashboard
// page itself (it needs auth + demo state) — see docs/byok-intake-design.md §1a.
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell contentClassName="bg-white">{children}</AppShell>;
}
