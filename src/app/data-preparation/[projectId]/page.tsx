"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import DataPreparationWorkspace from "@/components/data-preparation/DataPreparationWorkspace";
import { createClient } from "@/lib/supabase/client";

export default function DataPreparationPage() {
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
        // Release-bound local preparation remains available while cloud state is offline.
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  return <DataPreparationWorkspace projectId={projectId} projectName={projectName} />;
}
