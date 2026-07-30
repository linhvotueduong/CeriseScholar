"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AnalysisRobustnessWorkspace from "@/components/analysis-robustness/AnalysisRobustnessWorkspace";
import { createClient } from "@/lib/supabase/client";

export default function AnalysisRobustnessPage() {
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
        // The local robustness workflow remains available while cloud state is offline.
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  return (
    <AnalysisRobustnessWorkspace
      projectId={projectId}
      projectName={projectName}
    />
  );
}
