import type { Metadata } from "next";
import LegalDocumentView from "@/app/legal/LegalDocumentView";
import { legalDocuments } from "@/app/legal/content";

export const metadata: Metadata = {
  title: "Terms of Service - Cerise Scholar",
  description: legalDocuments.terms.summary,
};

export default function TermsPage() {
  return <LegalDocumentView document={legalDocuments.terms} />;
}
