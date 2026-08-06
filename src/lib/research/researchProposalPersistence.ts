import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ResearchArtifactChecksum,
  ResearchArtifactReference,
} from "./artifactIdentity";
import { indexResearchArtifact } from "./researchFoundation";
import { upsertResearchArtifactIndexRecord } from "./researchFoundationPersistence";
import {
  exportLegacyProposalSections,
  importLegacyProposalSections,
  normalizeResearchProposalDocument,
  verifyProjectEvidenceAssessment,
  verifyResearchProposalDocument,
  type LegacyProposalSection,
  type ProjectEvidenceAssessment,
  type ResearchProposalDocument,
} from "./researchProposalDocument";
import { PROPOSAL_SECTIONS } from "../../types/paper-section";

interface ResearchProposalRow {
  project_id: string;
  schema_version: number;
  revision: number;
  checksum: string;
  document: unknown;
  updated_at: string;
}

export interface ResearchProposalCloudState {
  canonical: ResearchProposalDocument | null;
  canonicalStoredChecksum: ResearchArtifactChecksum | null;
  canonicalNeedsUpgrade: boolean;
  legacySections: LegacyProposalSection[];
  canonicalAvailable: boolean;
  legacyAvailable: boolean;
}

export type ResearchProposalSaveResult =
  | { status: "saved"; document: ResearchProposalDocument; compatibilityWarnings: string[] }
  | { status: "conflict"; current: ResearchProposalDocument | null; currentStoredChecksum: ResearchArtifactChecksum | null }
  | { status: "unavailable"; reason: string };

export type EvidenceAssessmentSaveResult =
  | { status: "saved"; assessment: ProjectEvidenceAssessment; compatibilityWarnings: string[] }
  | { status: "conflict"; current: ProjectEvidenceAssessment | null; currentStoredChecksum: ResearchArtifactChecksum | null }
  | { status: "unavailable"; reason: string };

export interface ProjectEvidenceAssessmentsCloudState {
  assessments: ProjectEvidenceAssessment[];
  available: boolean;
  reason: string | null;
}

function persistenceMessage(error: { code?: string; message?: string } | null): string {
  if (!error) return "unknown persistence error";
  return [error.code, error.message].filter(Boolean).join(": ").slice(0, 500);
}

async function normalizeProposalRow(
  row: ResearchProposalRow | null,
  projectId: string,
): Promise<{ document: ResearchProposalDocument; storedChecksum: ResearchArtifactChecksum; needsUpgrade: boolean } | null> {
  if (!row || row.project_id !== projectId || row.schema_version < 1 || row.revision < 1 || !/^sha256:[a-f0-9]{64}$/.test(row.checksum)) return null;
  const raw = row.document && typeof row.document === "object" && !Array.isArray(row.document) ? row.document as Record<string, unknown> : null;
  const rawIdentity = raw?.identity && typeof raw.identity === "object" && !Array.isArray(raw.identity) ? raw.identity as Record<string, unknown> : null;
  if (raw?.revision !== row.revision || rawIdentity?.checksum !== row.checksum) return null;
  const document = await normalizeResearchProposalDocument(row.document, projectId);
  return document ? {
    document,
    storedChecksum: row.checksum as ResearchArtifactChecksum,
    needsUpgrade: row.schema_version !== document.schemaVersion || row.checksum !== document.identity.checksum,
  } : null;
}

function normalizeLegacyRows(value: unknown): LegacyProposalSection[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return [];
    const row = candidate as Record<string, unknown>;
    if (typeof row.section_key !== "string" || !PROPOSAL_SECTIONS.includes(row.section_key as (typeof PROPOSAL_SECTIONS)[number])) return [];
    if (typeof row.content !== "string") return [];
    return [{
      section_key: row.section_key,
      content: row.content,
      updated_at: typeof row.updated_at === "string" ? row.updated_at : "",
    }];
  });
}

export async function fetchResearchProposalCloudState(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
): Promise<ResearchProposalCloudState> {
  const [canonicalResult, legacyResult] = await Promise.all([
    supabase
      .from("research_proposals")
      .select("project_id,schema_version,revision,checksum,document,updated_at")
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .maybeSingle(),
    supabase
      .from("paper_sections")
      .select("section_key,content,updated_at")
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .in("section_key", [...PROPOSAL_SECTIONS]),
  ]);
  const canonical = canonicalResult.error
    ? null
    : await normalizeProposalRow(canonicalResult.data as ResearchProposalRow | null, projectId);
  return {
    canonical: canonical?.document ?? null,
    canonicalStoredChecksum: canonical?.storedChecksum ?? null,
    canonicalNeedsUpgrade: canonical?.needsUpgrade ?? false,
    legacySections: legacyResult.error ? [] : normalizeLegacyRows(legacyResult.data),
    canonicalAvailable: !canonicalResult.error,
    legacyAvailable: !legacyResult.error,
  };
}

export async function loadOrImportResearchProposal(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  projectTitle: string;
  sourceReferences?: readonly ResearchArtifactReference[];
  importedAt: string;
}): Promise<{
  document: ResearchProposalDocument;
  migratedFromLegacy: boolean;
  cloudState: ResearchProposalCloudState;
}> {
  const cloudState = await fetchResearchProposalCloudState(input.supabase, input.userId, input.projectId);
  if (cloudState.canonical) return { document: cloudState.canonical, migratedFromLegacy: false, cloudState };
  const document = await importLegacyProposalSections({
    projectId: input.projectId,
    projectTitle: input.projectTitle,
    rows: cloudState.legacySections,
    sourceReferences: input.sourceReferences,
    importedAt: input.importedAt,
  });
  return { document, migratedFromLegacy: cloudState.legacySections.length > 0, cloudState };
}

async function fetchCurrentProposal(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
): Promise<{ document: ResearchProposalDocument | null; storedChecksum: ResearchArtifactChecksum | null }> {
  const { data, error } = await supabase
    .from("research_proposals")
    .select("project_id,schema_version,revision,checksum,document,updated_at")
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .maybeSingle();
  const normalized = error ? null : await normalizeProposalRow(data as ResearchProposalRow | null, projectId);
  return { document: normalized?.document ?? null, storedChecksum: normalized?.storedChecksum ?? null };
}

async function writeProposalCompatibilityCopies(
  supabase: SupabaseClient,
  userId: string,
  document: ResearchProposalDocument,
): Promise<string[]> {
  const warnings: string[] = [];
  const rows = exportLegacyProposalSections(document).map((section) => ({
    user_id: userId,
    project_id: document.projectId,
    section_key: section.section_key,
    content: section.content,
    updated_at: document.updatedAt,
  }));
  if (rows.length > 0) {
    const { error } = await supabase.from("paper_sections").upsert(rows, { onConflict: "project_id,section_key" });
    if (error) warnings.push(`Legacy proposal dual-write failed: ${persistenceMessage(error)}`);
  }
  try {
    await upsertResearchArtifactIndexRecord(supabase, indexResearchArtifact({
      projectId: document.projectId,
      userId,
      identity: document.identity,
      storageLocator: `supabase:research_proposals:${document.projectId}`,
      createdAt: document.updatedAt,
      updatedAt: document.updatedAt,
    }));
  } catch (error) {
    warnings.push(`Proposal artifact index dual-write failed: ${error instanceof Error ? error.message : "unknown error"}`);
  }
  return warnings;
}

export async function saveResearchProposalDocument(
  supabase: SupabaseClient,
  userId: string,
  document: ResearchProposalDocument,
  expectedCloudChecksum: ResearchArtifactChecksum | null,
): Promise<ResearchProposalSaveResult> {
  if (!await verifyResearchProposalDocument(document)) {
    return { status: "unavailable", reason: "Refusing to save an invalid research proposal checksum." };
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
      .from("research_proposals")
      .update(row)
      .eq("project_id", document.projectId)
      .eq("user_id", userId)
      .eq("checksum", expectedCloudChecksum)
      .select("project_id")
      .maybeSingle();
    if (error) return { status: "unavailable", reason: persistenceMessage(error) };
    if (!data) {
      const current = await fetchCurrentProposal(supabase, userId, document.projectId);
      return { status: "conflict", current: current.document, currentStoredChecksum: current.storedChecksum };
    }
  } else {
    const { error } = await supabase.from("research_proposals").insert(row);
    if (error) {
      if (error.code === "23505") {
        const current = await fetchCurrentProposal(supabase, userId, document.projectId);
        return { status: "conflict", current: current.document, currentStoredChecksum: current.storedChecksum };
      }
      return { status: "unavailable", reason: persistenceMessage(error) };
    }
  }
  return {
    status: "saved",
    document,
    compatibilityWarnings: await writeProposalCompatibilityCopies(supabase, userId, document),
  };
}

function normalizeAssessmentRow(value: unknown, projectId: string): ProjectEvidenceAssessment | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (row.project_id !== projectId || typeof row.checksum !== "string" || !/^sha256:[a-f0-9]{64}$/.test(row.checksum)) return null;
  if (!row.assessment || typeof row.assessment !== "object" || Array.isArray(row.assessment)) return null;
  const assessment = row.assessment as ProjectEvidenceAssessment;
  return assessment.identity?.checksum === row.checksum ? assessment : null;
}

export async function fetchProjectEvidenceAssessments(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
): Promise<ProjectEvidenceAssessmentsCloudState> {
  const { data, error } = await supabase
    .from("project_evidence_assessments")
    .select("project_id,assessment_id,checksum,assessment,updated_at")
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });
  if (error) return { assessments: [], available: false, reason: persistenceMessage(error) };
  const normalized = await Promise.all((data ?? []).map(async (row) => {
    const assessment = normalizeAssessmentRow(row, projectId);
    return assessment && await verifyProjectEvidenceAssessment(assessment) ? assessment : null;
  }));
  return {
    assessments: normalized.filter((assessment): assessment is ProjectEvidenceAssessment => assessment !== null),
    available: true,
    reason: null,
  };
}

async function fetchCurrentAssessment(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  assessmentId: string,
): Promise<{ assessment: ProjectEvidenceAssessment | null; storedChecksum: ResearchArtifactChecksum | null }> {
  const { data, error } = await supabase
    .from("project_evidence_assessments")
    .select("project_id,assessment_id,checksum,assessment")
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .eq("assessment_id", assessmentId)
    .maybeSingle();
  const assessment = error ? null : normalizeAssessmentRow(data, projectId);
  if (!assessment || !await verifyProjectEvidenceAssessment(assessment)) return { assessment: null, storedChecksum: null };
  return { assessment, storedChecksum: assessment.identity.checksum };
}

export async function saveProjectEvidenceAssessment(
  supabase: SupabaseClient,
  userId: string,
  assessment: ProjectEvidenceAssessment,
  expectedCloudChecksum: ResearchArtifactChecksum | null,
): Promise<EvidenceAssessmentSaveResult> {
  if (!await verifyProjectEvidenceAssessment(assessment)) {
    return { status: "unavailable", reason: "Refusing to save an invalid evidence assessment checksum." };
  }
  const row = {
    project_id: assessment.projectId,
    user_id: userId,
    assessment_id: assessment.assessmentId,
    source_id: assessment.sourceId,
    schema_version: assessment.schemaVersion,
    revision: assessment.revision,
    status: assessment.status,
    checksum: assessment.identity.checksum,
    source_checksum: assessment.identity.sourceFingerprint.sources[0].checksum,
    assessment,
    reviewed_at: assessment.reviewedAt,
    updated_at: assessment.updatedAt,
  };
  if (expectedCloudChecksum) {
    const { data, error } = await supabase
      .from("project_evidence_assessments")
      .update(row)
      .eq("project_id", assessment.projectId)
      .eq("user_id", userId)
      .eq("assessment_id", assessment.assessmentId)
      .eq("checksum", expectedCloudChecksum)
      .select("assessment_id")
      .maybeSingle();
    if (error) return { status: "unavailable", reason: persistenceMessage(error) };
    if (!data) {
      const current = await fetchCurrentAssessment(supabase, userId, assessment.projectId, assessment.assessmentId);
      return { status: "conflict", current: current.assessment, currentStoredChecksum: current.storedChecksum };
    }
  } else {
    const { error } = await supabase.from("project_evidence_assessments").insert(row);
    if (error) {
      if (error.code === "23505") {
        const current = await fetchCurrentAssessment(supabase, userId, assessment.projectId, assessment.assessmentId);
        return { status: "conflict", current: current.assessment, currentStoredChecksum: current.storedChecksum };
      }
      return { status: "unavailable", reason: persistenceMessage(error) };
    }
  }
  const warnings: string[] = [];
  try {
    await upsertResearchArtifactIndexRecord(supabase, indexResearchArtifact({
      projectId: assessment.projectId,
      userId,
      identity: assessment.identity,
      storageLocator: `supabase:project_evidence_assessments:${assessment.projectId}:${assessment.assessmentId}`,
      createdAt: assessment.updatedAt,
      updatedAt: assessment.updatedAt,
    }));
  } catch (error) {
    warnings.push(`Evidence assessment artifact index dual-write failed: ${error instanceof Error ? error.message : "unknown error"}`);
  }
  return { status: "saved", assessment, compatibilityWarnings: warnings };
}
