import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResearchArtifactChecksum } from "./artifactIdentity";
import { indexResearchArtifact } from "./researchFoundation";
import { upsertResearchArtifactIndexRecord } from "./researchFoundationPersistence";
import {
  normalizeReviewedProposalBaseline,
  verifyReviewedProposalBaseline,
  type ReviewedProposalBaselinePackage,
} from "./proposalReviewPhase9";

interface ProposalReviewRow {
  project_id: string;
  schema_version: number;
  revision: number;
  checksum: string;
  baseline: unknown;
  frozen_at: string;
}

export interface ProposalReviewCloudState {
  baseline: ReviewedProposalBaselinePackage | null;
  storedChecksum: ResearchArtifactChecksum | null;
  available: boolean;
  reason: string | null;
}

export type ProposalReviewSaveResult =
  | { status: "saved"; baseline: ReviewedProposalBaselinePackage; compatibilityWarnings: string[] }
  | { status: "conflict"; current: ReviewedProposalBaselinePackage | null; currentStoredChecksum: ResearchArtifactChecksum | null }
  | { status: "unavailable"; reason: string };

function message(error: { code?: string; message?: string } | null): string {
  return error ? [error.code, error.message].filter(Boolean).join(": ").slice(0, 500) : "unknown persistence error";
}

async function normalizeRow(row: ProposalReviewRow | null, projectId: string): Promise<{ baseline: ReviewedProposalBaselinePackage; storedChecksum: ResearchArtifactChecksum } | null> {
  if (!row || row.project_id !== projectId || row.schema_version < 1 || row.revision < 1 || !/^sha256:[a-f0-9]{64}$/.test(row.checksum)) return null;
  const baseline = await normalizeReviewedProposalBaseline(row.baseline, projectId);
  if (!baseline || baseline.revision !== row.revision || baseline.identity.checksum !== row.checksum || baseline.frozenAt !== new Date(row.frozen_at).toISOString()) return null;
  return { baseline, storedChecksum: row.checksum as ResearchArtifactChecksum };
}

export async function fetchProposalReviewCloudState(supabase: SupabaseClient, userId: string, projectId: string): Promise<ProposalReviewCloudState> {
  const { data, error } = await supabase.from("research_proposal_review_baselines").select("project_id,schema_version,revision,checksum,baseline,frozen_at").eq("user_id", userId).eq("project_id", projectId).maybeSingle();
  if (error) return { baseline: null, storedChecksum: null, available: false, reason: message(error) };
  const normalized = await normalizeRow(data as ProposalReviewRow | null, projectId);
  return { baseline: normalized?.baseline ?? null, storedChecksum: normalized?.storedChecksum ?? null, available: true, reason: null };
}

export async function saveProposalReviewBaseline(supabase: SupabaseClient, userId: string, baseline: ReviewedProposalBaselinePackage, expectedCloudChecksum: ResearchArtifactChecksum | null): Promise<ProposalReviewSaveResult> {
  if (!await verifyReviewedProposalBaseline(baseline)) return { status: "unavailable", reason: "Refusing to save an invalid reviewed proposal baseline." };
  const row = { project_id: baseline.projectId, user_id: userId, schema_version: baseline.schemaVersion, revision: baseline.revision, checksum: baseline.identity.checksum, handoff_checksum: baseline.handoffReference.checksum, proposal_checksum: baseline.proposalReference.checksum, baseline, frozen_at: baseline.frozenAt };
  if (expectedCloudChecksum) {
    const { data, error } = await supabase.from("research_proposal_review_baselines").update(row).eq("project_id", baseline.projectId).eq("user_id", userId).eq("checksum", expectedCloudChecksum).select("project_id").maybeSingle();
    if (error) return { status: "unavailable", reason: message(error) };
    if (!data) {
      const current = await fetchProposalReviewCloudState(supabase, userId, baseline.projectId);
      return { status: "conflict", current: current.baseline, currentStoredChecksum: current.storedChecksum };
    }
  } else {
    const { error } = await supabase.from("research_proposal_review_baselines").insert(row);
    if (error) {
      if (error.code === "23505") {
        const current = await fetchProposalReviewCloudState(supabase, userId, baseline.projectId);
        return { status: "conflict", current: current.baseline, currentStoredChecksum: current.storedChecksum };
      }
      return { status: "unavailable", reason: message(error) };
    }
  }
  const compatibilityWarnings: string[] = [];
  try {
    await upsertResearchArtifactIndexRecord(supabase, indexResearchArtifact({ projectId: baseline.projectId, userId, identity: baseline.identity, storageLocator: `supabase:research_proposal_review_baselines:${baseline.projectId}`, createdAt: baseline.frozenAt, updatedAt: baseline.frozenAt }));
  } catch (error) {
    compatibilityWarnings.push(`Reviewed baseline artifact index sync failed: ${error instanceof Error ? error.message : "unknown error"}`);
  }
  return { status: "saved", baseline, compatibilityWarnings };
}
