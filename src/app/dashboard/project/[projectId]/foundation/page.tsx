import FoundationInspector from "@/components/research-path/FoundationInspector";

export default async function ResearchFoundationPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <FoundationInspector projectId={projectId} />;
}
