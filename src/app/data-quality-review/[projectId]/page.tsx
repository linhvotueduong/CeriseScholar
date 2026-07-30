"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import DataQualityReviewWorkspace from "@/components/data-quality-review/DataQualityReviewWorkspace";
import { createClient } from "@/lib/supabase/client";

function safeProjectId(value: unknown): string {
  return typeof value === "string" && /^[A-Za-z0-9-]{1,100}$/.test(value)
    ? value
    : "";
}

export default function DataQualityReviewPage() {
  const params = useParams();
  const projectId = safeProjectId(params.projectId);
  const [projectName, setProjectName] = useState("Research project");

  useEffect(() => {
    if (!projectId) return;
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
        // The local quality-review workflow remains available while cloud state is offline.
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  if (!projectId) {
    return <main>Invalid project route.</main>;
  }

  return (
    <DataQualityReviewWorkspace
      projectId={projectId}
      projectName={projectName}
    />
  );
}
