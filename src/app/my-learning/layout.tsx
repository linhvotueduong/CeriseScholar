import { requireBetaAccessForCurrentUser } from "@/lib/beta/server";
import { requireLegalConsentForCurrentUser } from "@/lib/legal/server";

export default async function MyLearningLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireBetaAccessForCurrentUser("/my-learning");
  await requireLegalConsentForCurrentUser("/my-learning");

  return children;
}
