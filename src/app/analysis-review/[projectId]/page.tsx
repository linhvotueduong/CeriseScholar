"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AnalysisReviewerWorkspace from "@/components/analysis-reviewer/AnalysisReviewerWorkspace";
import { createClient } from "@/lib/supabase/client";

export default function AnalysisReviewPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [projectName, setProjectName] = useState("Research project");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await createClient()
          .from("projects")
          .select("name")
          .eq("id", projectId)
          .maybeSingle();
        if (!cancelled && typeof data?.name === "string" && data.name.trim()) {
          setProjectName(data.name.trim().slice(0, 200));
        }
      } catch {
        // The release-bound aggregate review remains available while cloud state is offline.
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  return (
    <AnalysisReviewerWorkspace
      projectId={projectId}
      projectName={projectName}
    />
  );
}
