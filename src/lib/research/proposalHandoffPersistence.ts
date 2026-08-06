import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResearchArtifactChecksum } from "./artifactIdentity";
import { indexResearchArtifact } from "./researchFoundation";
import { upsertResearchArtifactIndexRecord } from "./researchFoundationPersistence";
import { normalizeProposalHandoffPackage, verifyProposalHandoffPackage, type ProposalHandoffPackage } from "./proposalHandoffPhase7";

interface ProposalHandoffRow {
  project_id: string;
  schema_version: number;
  revision: number;
  checksum: string;
  package: unknown;
  frozen_at: string;
}

export type ProposalHandoffSaveResult =
  | { status: "saved"; package: ProposalHandoffPackage; compatibilityWarnings: string[] }
  | { status: "conflict"; current: ProposalHandoffPackage | null; currentStoredChecksum: ResearchArtifactChecksum | null }
  | { status: "unavailable"; reason: string };

export interface ProposalHandoffCloudState {
  package: ProposalHandoffPackage | null;
  storedChecksum: ResearchArtifactChecksum | null;
  available: boolean;
  reason: string | null;
}

function message(error: { code?: string; message?: string } | null): string {
  return error ? [error.code, error.message].filter(Boolean).join(": ").slice(0, 500) : "unknown persistence error";
}

async function normalizeRow(row: ProposalHandoffRow | null, projectId: string): Promise<{ package: ProposalHandoffPackage; storedChecksum: ResearchArtifactChecksum } | null> {
  if (!row || row.project_id !== projectId || row.schema_version < 1 || row.revision < 1 || !/^sha256:[a-f0-9]{64}$/.test(row.checksum)) return null;
  const packageValue = await normalizeProposalHandoffPackage(row.package, projectId);
  if (!packageValue || packageValue.revision !== row.revision || packageValue.identity.checksum !== row.checksum || packageValue.frozenAt !== new Date(row.frozen_at).toISOString()) return null;
  return { package: packageValue, storedChecksum: row.checksum as ResearchArtifactChecksum };
}

export async function fetchProposalHandoffCloudState(supabase: SupabaseClient, userId: string, projectId: string): Promise<ProposalHandoffCloudState> {
  const { data, error } = await supabase.from("research_proposal_handoffs").select("project_id,schema_version,revision,checksum,package,frozen_at").eq("user_id", userId).eq("project_id", projectId).maybeSingle();
  if (error) return { package: null, storedChecksum: null, available: false, reason: message(error) };
  const normalized = await normalizeRow(data as ProposalHandoffRow | null, projectId);
  return { package: normalized?.package ?? null, storedChecksum: normalized?.storedChecksum ?? null, available: true, reason: null };
}

async function fetchCurrent(supabase: SupabaseClient, userId: string, projectId: string) {
  const state = await fetchProposalHandoffCloudState(supabase, userId, projectId);
  return { package: state.package, storedChecksum: state.storedChecksum };
}

export async function saveProposalHandoffPackage(supabase: SupabaseClient, userId: string, packageValue: ProposalHandoffPackage, expectedCloudChecksum: ResearchArtifactChecksum | null): Promise<ProposalHandoffSaveResult> {
  if (!await verifyProposalHandoffPackage(packageValue)) return { status: "unavailable", reason: "Refusing to save an invalid proposal handoff checksum." };
  const row = { project_id: packageValue.projectId, user_id: userId, schema_version: packageValue.schemaVersion, revision: packageValue.revision, checksum: packageValue.identity.checksum, proposal_checksum: packageValue.proposalReference.checksum, package: packageValue, frozen_at: packageValue.frozenAt };
  if (expectedCloudChecksum) {
    const { data, error } = await supabase.from("research_proposal_handoffs").update(row).eq("project_id", packageValue.projectId).eq("user_id", userId).eq("checksum", expectedCloudChecksum).select("project_id").maybeSingle();
    if (error) return { status: "unavailable", reason: message(error) };
    if (!data) {
      const current = await fetchCurrent(supabase, userId, packageValue.projectId);
      return { status: "conflict", current: current.package, currentStoredChecksum: current.storedChecksum };
    }
  } else {
    const { error } = await supabase.from("research_proposal_handoffs").insert(row);
    if (error) {
      if (error.code === "23505") {
        const current = await fetchCurrent(supabase, userId, packageValue.projectId);
        return { status: "conflict", current: current.package, currentStoredChecksum: current.storedChecksum };
      }
      return { status: "unavailable", reason: message(error) };
    }
  }
  const compatibilityWarnings: string[] = [];
  try {
    await upsertResearchArtifactIndexRecord(supabase, indexResearchArtifact({ projectId: packageValue.projectId, userId, identity: packageValue.identity, storageLocator: `supabase:research_proposal_handoffs:${packageValue.projectId}`, createdAt: packageValue.frozenAt, updatedAt: packageValue.frozenAt }));
  } catch (error) {
    compatibilityWarnings.push(`Handoff artifact index sync failed: ${error instanceof Error ? error.message : "unknown error"}`);
  }
  return { status: "saved", package: packageValue, compatibilityWarnings };
}
