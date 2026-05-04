import type { Metadata } from "next";
import LegalDocumentView from "@/app/legal/LegalDocumentView";
import { legalDocuments } from "@/app/legal/content";

export const metadata: Metadata = {
  title: "AI Data Use Notice - Cerise Scholar",
  description: legalDocuments["ai-data-use"].summary,
};

export default function AiDataUsePage() {
  return <LegalDocumentView document={legalDocuments["ai-data-use"]} />;
}
