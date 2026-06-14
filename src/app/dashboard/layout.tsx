import AppShell from "@/components/app-shell/AppShell";
import LocalSetupOnboarding from "@/components/local-agent/LocalSetupOnboarding";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell contentClassName="bg-white">
      {children}
      <LocalSetupOnboarding />
    </AppShell>
  );
}
