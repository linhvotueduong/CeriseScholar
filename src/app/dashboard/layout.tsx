import Navbar from "@/components/layout/Navbar";
import LocalAgentStatusCard from "@/components/local-agent/LocalAgentStatusCard";
import LocalSetupOnboarding from "@/components/local-agent/LocalSetupOnboarding";
import LocalVaultControls from "@/components/local-agent/LocalVaultControls";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: "100vh", background: "#fefefe" }}>
      <Navbar />
      <div style={{ maxWidth: "1100px", margin: "12px auto 0", padding: "0 24px", display: "grid", gap: "10px" }}>
        <LocalAgentStatusCard compact />
        <LocalVaultControls compact />
      </div>
      <LocalSetupOnboarding />
      <main className="flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
