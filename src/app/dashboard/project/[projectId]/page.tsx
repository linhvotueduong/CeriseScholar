"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ResearchPathWorkspace from "@/components/research-path/ResearchPathWorkspace";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/types/project";

export default function ProjectWorkspacePage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadProject() {
      const supabase = createClient();
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (!cancelled) {
        setProject((data as Project | null) ?? null);
        setLoading(false);
      }
    }

    void loadProject();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#dbeaf4]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#a9c3d3] border-t-[#1a1208]" />
      </div>
    );
  }

  return (
    <div className="h-full">
      <ResearchPathWorkspace
        projectId={projectId}
        projectName={project?.name ?? "Research project"}
      />
    </div>
  );
}
