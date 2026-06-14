import type { Metadata } from "next";
import PolicyArticlePage from "@/components/help/PolicyArticlePage";
import { agreementDocuments } from "@/lib/legal/agreements";

export const metadata: Metadata = {
  title: "Privacy Policy | Cerise Scholar",
  description: "Privacy Policy for Cerise Scholar.",
};

export default async function PrivacyPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  return (
    <PolicyArticlePage
      document={agreementDocuments.privacy}
      pageNumber={Number(params?.page || 1)}
    />
  );
}
