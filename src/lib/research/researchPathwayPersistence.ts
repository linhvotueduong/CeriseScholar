import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResearchArtifactChecksum } from "./artifactIdentity";
import { indexResearchArtifact } from "./researchFoundation";
import { upsertResearchArtifactIndexRecord } from "./researchFoundationPersistence";
import {
  appendResearchKnowledgeEntry,
  upsertProjectRouteProfile,
} from "./researchFoundationPersistence";
import {
  compilePathwayKnowledgeEntries,
  compileRouteFromResearchPathway,
} from "./researchPathwayBrief";
import {
  emptyLegacyProjectPathwayFields,
  legacyProjectFieldsFromResearchPathway,
  normalizeResearchPathwayDocument,
  verifyResearchPathwayDocument,
  type LegacyProjectPathwayFields,
  type ResearchPathwayDocument,
} from "./researchPathwayDocument";

interface ResearchPathwayRow {
  project_id: string;
  schema_version: number;
  revision: number;
  checksum: string;
  document: unknown;
  updated_at: string;
}

export interface ResearchPathwayCloudState {
  canonical: ResearchPathwayDocument | null;
  canonicalStoredChecksum: ResearchArtifactChecksum | null;
  canonicalNeedsUpgrade: boolean;
  legacyProject: LegacyProjectPathwayFields;
  canonicalAvailable: boolean;
}

export type ResearchPathwaySaveResult =
  | { status: "saved"; document: ResearchPathwayDocument; compatibilityWarnings: string[] }
  | { status: "conflict"; current: ResearchPathwayDocument | null; currentStoredChecksum: ResearchArtifactChecksum | null }
  | { status: "unavailable"; reason: string };

function persistenceMessage(error: { code?: string; message?: string } | null): string {
  if (!error) return "unknown persistence error";
  return [error.code, error.message].filter(Boolean).join(": ").slice(0, 500);
}

async function normalizeRow(row: ResearchPathwayRow | null, projectId: string): Promise<{ document: ResearchPathwayDocument; storedChecksum: ResearchArtifactChecksum; needsUpgrade: boolean } | null> {
  if (!row || row.project_id !== projectId || row.schema_version < 1 || row.revision < 1) return null;
  const raw = row.document && typeof row.document === "object" && !Array.isArray(row.document) ? row.document as Record<string, unknown> : null;
  const rawIdentity = raw?.identity && typeof raw.identity === "object" && !Array.isArray(raw.identity) ? raw.identity as Record<string, unknown> : null;
  if (raw?.revision !== row.revision || rawIdentity?.checksum !== row.checksum || !/^sha256:[a-f0-9]{64}$/.test(row.checksum)) return null;
  const document = await normalizeResearchPathwayDocument(row.document, projectId);
  return document ? {
    document,
    storedChecksum: row.checksum as ResearchArtifactChecksum,
    needsUpgrade: row.schema_version !== document.schemaVersion || row.checksum !== document.identity.checksum,
  } : null;
}

export async function fetchResearchPathwayCloudState(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
): Promise<ResearchPathwayCloudState> {
  const [canonicalResult, projectResult] = await Promise.all([
    supabase
      .from("research_pathway_documents")
      .select("project_id,schema_version,revision,checksum,document,updated_at")
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .maybeSingle(),
    supabase
      .from("projects")
      .select("research_question,research_approach,research_hypothesis,updated_at")
      .eq("user_id", userId)
      .eq("id", projectId)
      .maybeSingle(),
  ]);

  const project = projectResult.data as Record<string, unknown> | null;
  const legacyProject: LegacyProjectPathwayFields = project ? {
    researchQuestion: typeof project.research_question === "string" ? project.research_question : "",
    researchApproach: typeof project.research_approach === "string" ? project.research_approach : "",
    researchHypothesis: typeof project.research_hypothesis === "string" ? project.research_hypothesis : "",
    updatedAt: typeof project.updated_at === "string" ? project.updated_at : null,
  } : emptyLegacyProjectPathwayFields();

  const canonicalAvailable = !canonicalResult.error;
  const canonicalRow = canonicalResult.error ? null : await normalizeRow(canonicalResult.data as ResearchPathwayRow | null, projectId);
  return {
    canonical: canonicalRow?.document ?? null,
    canonicalStoredChecksum: canonicalRow?.storedChecksum ?? null,
    canonicalNeedsUpgrade: canonicalRow?.needsUpgrade ?? false,
    legacyProject,
    canonicalAvailable,
  };
}

async function fetchCurrentResearchPathway(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
): Promise<{ document: ResearchPathwayDocument | null; storedChecksum: ResearchArtifactChecksum | null }> {
  const { data, error } = await supabase
    .from("research_pathway_documents")
    .select("project_id,schema_version,revision,checksum,document,updated_at")
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .maybeSingle();
  const normalized = error ? null : await normalizeRow(data as ResearchPathwayRow | null, projectId);
  return { document: normalized?.document ?? null, storedChecksum: normalized?.storedChecksum ?? null };
}

async function writeCompatibilityCopies(
  supabase: SupabaseClient,
  userId: string,
  document: ResearchPathwayDocument,
): Promise<string[]> {
  const warnings: string[] = [];
  const legacy = legacyProjectFieldsFromResearchPathway(document);
  const { error: legacyError } = await supabase
    .from("projects")
    .update({
      research_question: legacy.researchQuestion,
      research_approach: legacy.researchApproach,
      research_hypothesis: legacy.researchHypothesis,
      updated_at: document.updatedAt,
    })
    .eq("id", document.projectId)
    .eq("user_id", userId);
  if (legacyError) warnings.push(`Legacy project dual-write failed: ${persistenceMessage(legacyError)}`);

  try {
    const index = indexResearchArtifact({
      projectId: document.projectId,
      userId,
      identity: document.identity,
      storageLocator: `supabase:research_pathway_documents:${document.projectId}`,
      createdAt: document.updatedAt,
      updatedAt: document.updatedAt,
    });
    await upsertResearchArtifactIndexRecord(supabase, index);
  } catch (error) {
    warnings.push(`Artifact index dual-write failed: ${error instanceof Error ? error.message : "unknown error"}`);
  }

  try {
    const route = await compileRouteFromResearchPathway(document);
    if (route) await upsertProjectRouteProfile(supabase, userId, route);
  } catch (error) {
    warnings.push(`Route profile dual-write failed: ${error instanceof Error ? error.message : "unknown error"}`);
  }

  try {
    const entries = await compilePathwayKnowledgeEntries(document);
    for (const entry of entries) await appendResearchKnowledgeEntry(supabase, userId, entry);
  } catch (error) {
    warnings.push(`Living Research Record dual-write failed: ${error instanceof Error ? error.message : "unknown error"}`);
  }
  return warnings;
}

export async function saveResearchPathwayDocument(
  supabase: SupabaseClient,
  userId: string,
  document: ResearchPathwayDocument,
  expectedCloudChecksum: ResearchArtifactChecksum | null,
): Promise<ResearchPathwaySaveResult> {
  if (!await verifyResearchPathwayDocument(document)) {
    return { status: "unavailable", reason: "Refusing to save an invalid research pathway checksum." };
  }
  const row = {
    project_id: document.projectId,
    user_id: userId,
    schema_version: document.schemaVersion,
    revision: document.revision,
    checksum: document.identity.checksum,
    document,
    updated_at: document.updatedAt,
  };

  if (expectedCloudChecksum) {
    const { data, error } = await supabase
      .from("research_pathway_documents")
      .update(row)
      .eq("project_id", document.projectId)
      .eq("user_id", userId)
      .eq("checksum", expectedCloudChecksum)
      .select("project_id,schema_version,revision,checksum,document,updated_at")
      .maybeSingle();
    if (error) return { status: "unavailable", reason: persistenceMessage(error) };
    if (!data) {
      const current = await fetchCurrentResearchPathway(supabase, userId, document.projectId);
      return { status: "conflict", current: current.document, currentStoredChecksum: current.storedChecksum };
    }
  } else {
    const { error } = await supabase.from("research_pathway_documents").insert(row);
    if (error) {
      if (error.code === "23505") {
        const current = await fetchCurrentResearchPathway(supabase, userId, document.projectId);
        return { status: "conflict", current: current.document, currentStoredChecksum: current.storedChecksum };
      }
      return { status: "unavailable", reason: persistenceMessage(error) };
    }
  }

  return {
    status: "saved",
    document,
    compatibilityWarnings: await writeCompatibilityCopies(supabase, userId, document),
  };
}
