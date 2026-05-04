import type { Metadata } from "next";
import LegalDocumentView from "@/app/legal/LegalDocumentView";
import { legalDocuments } from "@/app/legal/content";

export const metadata: Metadata = {
  title: "Beta Participation Terms - Cerise Scholar",
  description: legalDocuments["beta-terms"].summary,
};

export default function BetaTermsPage() {
  return <LegalDocumentView document={legalDocuments["beta-terms"]} />;
}
