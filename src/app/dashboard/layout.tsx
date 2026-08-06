import AppShell from "@/components/app-shell/AppShell";

// The one-time AI welcome popup is rendered by the dashboard page itself because
// it needs auth and demo-state context.
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell contentClassName="bg-white">{children}</AppShell>;
}
