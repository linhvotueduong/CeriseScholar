"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import DataIntakeAuditWorkspace from "@/components/data-intake/DataIntakeAuditWorkspace";
import { createClient } from "@/lib/supabase/client";

export default function DataIntakeAuditPage() {
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
        // Release-bound local intake remains available while the cloud is offline.
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  return <DataIntakeAuditWorkspace projectId={projectId} projectName={projectName} />;
}
