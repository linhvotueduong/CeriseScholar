import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResearchPathDraft } from "./researchPathDraft";
import {
  normalizeStudyDesignDocument,
  type StudyDesignDocument,
} from "./studyDesign";

interface StudyDesignRow {
  project_id: string;
  schema_version: number;
  spec: unknown;
  updated_at: string;
}

export async function fetchStudyDesign(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  pathway: ResearchPathDraft,
): Promise<StudyDesignDocument | null> {
  try {
    const { data, error } = await supabase
      .from("study_designs")
      .select("project_id, schema_version, spec, updated_at")
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .maybeSingle();

    if (error || !data) return null;
    const row = data as StudyDesignRow;
    return normalizeStudyDesignDocument(
      {
        schemaVersion: row.schema_version,
        projectId: row.project_id,
        updatedAt: row.updated_at,
        spec: row.spec,
      },
      projectId,
      pathway,
    );
  } catch {
    return null;
  }
}

export async function upsertStudyDesign(
  supabase: SupabaseClient,
  userId: string,
  document: StudyDesignDocument,
): Promise<boolean> {
  try {
    const { error } = await supabase.from("study_designs").upsert(
      {
        project_id: document.projectId,
        user_id: userId,
        schema_version: document.schemaVersion,
        spec: document.spec,
        updated_at: document.updatedAt,
      },
      { onConflict: "project_id" },
    );
    return !error;
  } catch {
    return false;
  }
}
