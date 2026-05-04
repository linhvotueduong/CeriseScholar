import { requireBetaAccessForCurrentUser } from "@/lib/beta/server";
import { requireLegalConsentForCurrentUser } from "@/lib/legal/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireBetaAccessForCurrentUser("/admin/waitlist");
  await requireLegalConsentForCurrentUser("/admin/waitlist");

  return children;
}
