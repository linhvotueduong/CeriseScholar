import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MAX_CONSENT_PHASE_5_BYTES,
  normalizeConsentPhase5Document,
  type ConsentPhase5Document,
} from "./consentPhase5";
import { canonicalArtifactJson } from "./artifactIdentity";

interface ConsentProtocolRow {
  project_id: string;
  schema_version: number;
  spec: unknown;
  updated_at: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function fetchConsentPhase5Document(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
): Promise<ConsentPhase5Document | null> {
  try {
    const { data, error } = await supabase
      .from("consent_protocols")
      .select("project_id, schema_version, spec, updated_at")
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as ConsentProtocolRow;
    return normalizeConsentPhase5Document({
      schemaVersion: row.schema_version,
      projectId: row.project_id,
      updatedAt: row.updated_at,
      ...(isRecord(row.spec) ? row.spec : {}),
    }, projectId);
  } catch {
    return null;
  }
}

export async function upsertConsentPhase5Document(
  supabase: SupabaseClient,
  userId: string,
  document: ConsentPhase5Document,
): Promise<boolean> {
  try {
    const normalized = normalizeConsentPhase5Document(document, document.projectId);
    if (!normalized) return false;
    const { schemaVersion, projectId, updatedAt, ...spec } = normalized;
    if (new TextEncoder().encode(canonicalArtifactJson(spec)).byteLength > MAX_CONSENT_PHASE_5_BYTES) return false;
    const { error } = await supabase.from("consent_protocols").upsert({
      project_id: projectId,
      user_id: userId,
      schema_version: schemaVersion,
      spec,
      updated_at: updatedAt,
    }, { onConflict: "project_id" });
    return !error;
  } catch {
    return false;
  }
}
