"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ExperimentalStudio from "@/components/experimental-studio/ExperimentalStudio";
import { createClient } from "@/lib/supabase/client";

export default function ExperimentalStudioPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [projectName, setProjectName] = useState("Experimental study");

  useEffect(() => {
    let cancelled = false;
    async function loadProjectName() {
      try {
        const { data } = await createClient()
          .from("projects")
          .select("name")
          .eq("id", projectId)
          .maybeSingle();
        if (!cancelled && typeof data?.name === "string" && data.name.trim()) {
          setProjectName(data.name);
        }
      } catch {
        // The studio remains usable from its versioned local draft when offline.
      }
    }
    void loadProjectName();
    return () => { cancelled = true; };
  }, [projectId]);

  return <ExperimentalStudio projectId={projectId} projectName={projectName} />;
}
