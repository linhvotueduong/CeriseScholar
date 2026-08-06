import type { SupabaseClient } from "@supabase/supabase-js";
import {
  experimentStudioSpecSize,
  MAX_EXPERIMENT_SPEC_BYTES,
  normalizeExperimentStudioDocument,
  type ExperimentStudioDocument,
} from "./experimentStudio";
import type { StudyDesignDocument } from "./studyDesign";

interface ExperimentStudioRow {
  project_id: string;
  schema_version: number;
  spec: unknown;
  updated_at: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function fetchExperimentStudio(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  studyDesign?: StudyDesignDocument | null,
): Promise<ExperimentStudioDocument | null> {
  try {
    const { data, error } = await supabase
      .from("experiment_studios")
      .select("project_id, schema_version, spec, updated_at")
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .maybeSingle();

    if (error || !data) return null;
    const row = data as ExperimentStudioRow;
    return normalizeExperimentStudioDocument(
      {
        schemaVersion: row.schema_version,
        projectId: row.project_id,
        updatedAt: row.updated_at,
        ...(isRecord(row.spec) ? row.spec : {}),
      },
      projectId,
      studyDesign,
    );
  } catch {
    return null;
  }
}

export async function upsertExperimentStudio(
  supabase: SupabaseClient,
  userId: string,
  document: ExperimentStudioDocument,
): Promise<boolean> {
  try {
    if (experimentStudioSpecSize(document) > MAX_EXPERIMENT_SPEC_BYTES) return false;
    const { schemaVersion, projectId, updatedAt, ...spec } = document;
    const { error } = await supabase.from("experiment_studios").upsert(
      {
        project_id: projectId,
        user_id: userId,
        schema_version: schemaVersion,
        spec,
        updated_at: updatedAt,
      },
      { onConflict: "project_id" },
    );
    return !error;
  } catch {
    return false;
  }
}
