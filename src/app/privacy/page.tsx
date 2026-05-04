import type { Metadata } from "next";
import LegalDocumentView from "@/app/legal/LegalDocumentView";
import { legalDocuments } from "@/app/legal/content";

export const metadata: Metadata = {
  title: "Privacy Policy - Cerise Scholar",
  description: legalDocuments.privacy.summary,
};

export default function PrivacyPage() {
  return <LegalDocumentView document={legalDocuments.privacy} />;
}
