import Navbar from "@/components/layout/Navbar";
import { requireBetaAccessForCurrentUser } from "@/lib/beta/server";
import { requireLegalConsentForCurrentUser } from "@/lib/legal/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireBetaAccessForCurrentUser("/dashboard");
  await requireLegalConsentForCurrentUser("/dashboard");

  return (
    <div style={{ minHeight: "100vh", background: "#fefefe" }}>
      <Navbar />
      <main className="flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
