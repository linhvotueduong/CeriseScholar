import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Pdf } from "@/types/pdf";
import ViewerClient from "./ViewerClient";

interface Props {
  params: Promise<{ projectId: string; id: string }>;
}

export default async function ProjectViewerPage({ params }: Props) {
  const { projectId, id } = await params;
  const supabase = await createClient();

  const { data: pdf } = await supabase
    .from("pdfs")
    .select("*")
    .eq("id", id)
    .single<Pdf>();

  if (!pdf) notFound();

  const { data: project } = await supabase
    .from("projects")
    .select("name, color")
    .eq("id", projectId)
    .single();

  // 8-hour expiry to cover long research sessions
  const { data: signedUrlData } = await supabase.storage
    .from("pdfs")
    .createSignedUrl(pdf.storage_path, 28800);

  if (!signedUrlData?.signedUrl) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600">Could not load PDF file</p>
      </div>
    );
  }

  return (
    <div className="-mx-8 -my-8">
      <ViewerClient
        projectId={projectId}
        pdfId={pdf.id}
        pdfName={pdf.display_name}
        pdfUrl={signedUrlData.signedUrl}
        pdfAuthor={(pdf as unknown as Record<string, string>).pdf_author || ""}
        pdfTitle={(pdf as unknown as Record<string, string>).pdf_title || ""}
        projectName={project?.name || ""}
        projectColor={project?.color || "#111111"}
      />
    </div>
  );
}
