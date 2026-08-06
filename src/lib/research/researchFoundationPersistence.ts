import { createClient } from "../supabase/client";
import type { ProjectRouteProfile } from "./projectRouteProfile";
import type { ResearchArtifactIndexRecord } from "./researchArtifactLifecycle";
import type { ResearchKnowledgeEntry } from "./livingResearchRecord";
import {
  exportLegacyPaperSections,
  importLegacyPaperSections,
  verifyCanonicalManuscript,
  type CanonicalManuscript,
} from "./canonicalManuscript";
import type { ResearchDecisionRecord } from "./researchDecisionLedger";
import type { ResearchAssetRecord } from "./researchAssetRegistry";
import type { ProjectTemplatePin, PublicationTemplateTarget } from "./publicationTemplateRegistry";

export type ResearchFoundationClient = ReturnType<typeof createClient>;

export interface ResearchFoundationSnapshot {
  routeProfile: unknown | null;
  artifactIndex: unknown[];
  knowledgeEntries: unknown[];
  manuscript: unknown | null;
  decisionEvents: unknown[];
  assets: unknown[];
  templatePins: unknown[];
}

function throwPersistenceError(operation: string, error: { message?: string } | null): void {
  if (error) throw new Error(`${operation} failed: ${error.message ?? "unknown persistence error"}`);
}

export async function upsertProjectRouteProfile(
  client: ResearchFoundationClient,
  userId: string,
  profile: ProjectRouteProfile,
): Promise<void> {
  const { error } = await client.from("project_route_profiles").upsert({
    project_id: profile.projectId,
    user_id: userId,
    schema_version: profile.schemaVersion,
    compiler_version: profile.compilerVersion,
    checksum: profile.identity.checksum,
    profile,
    updated_at: new Date().toISOString(),
  }, { onConflict: "project_id" });
  throwPersistenceError("Save project route profile", error);
}

export async function upsertResearchArtifactIndexRecord(
  client: ResearchFoundationClient,
  record: ResearchArtifactIndexRecord,
): Promise<void> {
  const { error } = await client.from("research_artifact_index").upsert({
    project_id: record.projectId,
    user_id: record.userId,
    artifact_kind: record.artifactKind,
    artifact_id: record.artifactId,
    artifact_schema_version: record.artifactSchemaVersion,
    checksum: record.checksum,
    payload_checksum: record.payloadChecksum,
    source_fingerprint_checksum: record.sourceFingerprintChecksum,
    source_references: record.sourceReferences,
    storage_locator: record.storageLocator,
    lifecycle_status: record.lifecycleStatus,
    supersedes_artifact_id: record.supersedesArtifactId,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  }, { onConflict: "project_id,artifact_kind,artifact_id" });
  throwPersistenceError("Save research artifact index record", error);
}

export async function appendResearchKnowledgeEntry(
  client: ResearchFoundationClient,
  userId: string,
  entry: ResearchKnowledgeEntry,
): Promise<void> {
  const { error } = await client.from("research_knowledge_entries").insert({
    project_id: entry.projectId,
    user_id: userId,
    entry_id: entry.id,
    stage: entry.stage,
    step_id: entry.stepId,
    kind: entry.kind,
    lifecycle_status: entry.state,
    timing: entry.timing,
    checksum: entry.checksum,
    entry,
    created_at: entry.createdAt,
  });
  if (error && "code" in error && error.code === "23505") {
    const { data, error: readError } = await client
      .from("research_knowledge_entries")
      .select("checksum")
      .eq("project_id", entry.projectId)
      .eq("entry_id", entry.id)
      .maybeSingle();
    throwPersistenceError("Verify existing research knowledge entry", readError);
    if (data?.checksum === entry.checksum) return;
    throw new Error("Append research knowledge entry failed: the append-only entry ID already has different content.");
  }
  throwPersistenceError("Append research knowledge entry", error);
}

export async function upsertCanonicalManuscript(
  client: ResearchFoundationClient,
  userId: string,
  manuscript: CanonicalManuscript,
  options: { dualWriteLegacy?: boolean; legacyImportedAt?: string | null } = {},
): Promise<void> {
  if (!await verifyCanonicalManuscript(manuscript)) throw new Error("Refusing to persist an invalid canonical manuscript.");
  const { error } = await client.from("manuscript_documents").upsert({
    project_id: manuscript.projectId,
    user_id: userId,
    schema_version: manuscript.schemaVersion,
    revision: manuscript.revision,
    checksum: manuscript.identity.checksum,
    document: manuscript,
    legacy_imported_at: options.legacyImportedAt ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "project_id" });
  throwPersistenceError("Save canonical manuscript", error);

  if (options.dualWriteLegacy !== false) {
    const rows = exportLegacyPaperSections(manuscript).map((section) => ({
      user_id: userId,
      project_id: manuscript.projectId,
      section_key: section.section_key,
      content: section.content,
      updated_at: new Date().toISOString(),
    }));
    if (rows.length > 0) {
      const { error: legacyError } = await client.from("paper_sections").upsert(rows, {
        onConflict: "project_id,section_key",
      });
      throwPersistenceError("Dual-write legacy paper sections", legacyError);
    }
  }
}

export async function loadOrImportCanonicalManuscript(
  client: ResearchFoundationClient,
  input: { projectId: string; projectTitle: string; userId: string; importedAt: string },
): Promise<{ manuscript: CanonicalManuscript; migratedFromLegacy: boolean }> {
  const [documentResult, legacyResult] = await Promise.all([
    client.from("manuscript_documents").select("document").eq("project_id", input.projectId).maybeSingle(),
    client.from("paper_sections").select("section_key,content,updated_at").eq("project_id", input.projectId),
  ]);
  throwPersistenceError("Load canonical manuscript", documentResult.error);
  throwPersistenceError("Load legacy paper sections", legacyResult.error);
  if (documentResult.data?.document) {
    return {
      manuscript: documentResult.data.document as CanonicalManuscript,
      migratedFromLegacy: false,
    };
  }
  const rows = (legacyResult.data ?? []).map((row) => ({
    section_key: row.section_key as string,
    content: (row.content as string | null) ?? "",
    updated_at: (row.updated_at as string | null) ?? input.importedAt,
  }));
  const manuscript = await importLegacyPaperSections(
    input.projectId,
    input.projectTitle,
    rows,
    input.importedAt,
  );
  await upsertCanonicalManuscript(client, input.userId, manuscript, {
    dualWriteLegacy: false,
    legacyImportedAt: input.importedAt,
  });
  return { manuscript, migratedFromLegacy: true };
}

export async function appendResearchDecisionEvent(
  client: ResearchFoundationClient,
  userId: string,
  event: ResearchDecisionRecord,
): Promise<void> {
  const { error } = await client.from("research_decision_events").insert({
    project_id: event.projectId,
    user_id: userId,
    event_id: event.id,
    domain: event.domain,
    action: event.action,
    checksum: event.checksum,
    event,
    decided_at: event.decidedAt,
  });
  throwPersistenceError("Append research decision event", error);
}

export async function upsertResearchAsset(
  client: ResearchFoundationClient,
  userId: string,
  asset: ResearchAssetRecord,
): Promise<void> {
  const { error } = await client.from("research_asset_records").upsert({
    project_id: asset.projectId,
    user_id: userId,
    asset_id: asset.id,
    kind: asset.kind,
    rights_status: asset.rights.status,
    review_status: asset.reviewStatus,
    checksum: asset.identity.checksum,
    record: asset,
    updated_at: new Date().toISOString(),
  }, { onConflict: "project_id,asset_id" });
  throwPersistenceError("Save research asset", error);
}

export async function upsertProjectTemplatePin(
  client: ResearchFoundationClient,
  userId: string,
  target: PublicationTemplateTarget,
  pin: ProjectTemplatePin,
): Promise<void> {
  const { error } = await client.from("project_template_pins").upsert({
    project_id: pin.projectId,
    user_id: userId,
    target,
    template_id: pin.templateId,
    template_version: pin.templateVersion,
    template_checksum: pin.templateChecksum,
    pinned_at: pin.pinnedAt,
  }, { onConflict: "project_id,target" });
  throwPersistenceError("Save project template pin", error);
}

/** Loads independent foundation collections in parallel to avoid UI waterfalls. */
export async function loadResearchFoundationSnapshot(
  client: ResearchFoundationClient,
  projectId: string,
): Promise<ResearchFoundationSnapshot> {
  const results = await Promise.all([
    client.from("project_route_profiles").select("profile").eq("project_id", projectId).maybeSingle(),
    client.from("research_artifact_index").select("artifact_kind,artifact_id,checksum,lifecycle_status,source_references,storage_locator").eq("project_id", projectId),
    client.from("research_knowledge_entries").select("entry").eq("project_id", projectId).order("created_at", { ascending: true }),
    client.from("manuscript_documents").select("document").eq("project_id", projectId).maybeSingle(),
    client.from("research_decision_events").select("event").eq("project_id", projectId).order("decided_at", { ascending: false }),
    client.from("research_asset_records").select("record").eq("project_id", projectId),
    client.from("project_template_pins").select("target,template_id,template_version,template_checksum,pinned_at").eq("project_id", projectId),
  ]);
  for (const result of results) throwPersistenceError("Load research foundation snapshot", result.error);
  const [route, artifacts, knowledge, manuscript, decisions, assets, pins] = results;
  return {
    routeProfile: route.data?.profile ?? null,
    artifactIndex: artifacts.data ?? [],
    knowledgeEntries: (knowledge.data ?? []).map((row) => row.entry),
    manuscript: manuscript.data?.document ?? null,
    decisionEvents: (decisions.data ?? []).map((row) => row.event),
    assets: (assets.data ?? []).map((row) => row.record),
    templatePins: pins.data ?? [],
  };
}
