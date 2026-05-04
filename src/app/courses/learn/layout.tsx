import { requireBetaAccessForCurrentUser } from "@/lib/beta/server";
import { requireLegalConsentForCurrentUser } from "@/lib/legal/server";

export default async function CourseLearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireBetaAccessForCurrentUser("/courses/learn");
  await requireLegalConsentForCurrentUser("/courses/learn");

  return children;
}
