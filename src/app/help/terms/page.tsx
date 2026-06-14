import type { Metadata } from "next";
import PolicyArticlePage from "@/components/help/PolicyArticlePage";
import { agreementDocuments } from "@/lib/legal/agreements";

export const metadata: Metadata = {
  title: "Terms of Use | Cerise Scholar",
  description: "Terms of Use for Cerise Scholar.",
};

export default async function TermsPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  return (
    <PolicyArticlePage
      document={agreementDocuments.terms}
      pageNumber={Number(params?.page || 1)}
    />
  );
}
