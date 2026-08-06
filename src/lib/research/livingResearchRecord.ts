import {
  createResearchArtifactIdentity,
  isResearchArtifactChecksum,
  sha256ArtifactChecksum,
  type ResearchArtifactChecksum,
  type ResearchArtifactIdentity,
  type ResearchArtifactReference,
} from "./artifactIdentity";
import type { ResearchStageNumber } from "./researchArtifactRegistry";

export const LIVING_RESEARCH_RECORD_SCHEMA_VERSION = 1 as const;
export const MAX_LIVING_RESEARCH_ENTRY_TEXT = 20_000;
export const MAX_LIVING_RESEARCH_ENTRIES = 5_000;

export type ResearchKnowledgeKind =
  | "decision"
  | "rationale"
  | "evidence"
  | "assumption"
  | "limitation"
  | "method-detail"
  | "result"
  | "interpretation"
  | "writing-note";
export type ResearchKnowledgeState = "current" | "stale" | "superseded";
export type ResearchKnowledgeTiming = "planned" | "actual" | "reconciled";
export type ResearchKnowledgeAuthor = "researcher" | "system-derived";
export type ManuscriptTarget =
  | "abstract"
  | "introduction"
  | "literature-review"
  | "methods"
  | "results"
  | "discussion"
  | "conclusion"
  | "references"
  | "supplement"
  | "poster";

export interface ResearchKnowledgeEntry {
  schemaVersion: typeof LIVING_RESEARCH_RECORD_SCHEMA_VERSION;
  id: string;
  projectId: string;
  stage: ResearchStageNumber;
  stepId: string;
  kind: ResearchKnowledgeKind;
  title: string;
  body: string;
  state: ResearchKnowledgeState;
  timing: ResearchKnowledgeTiming;
  author: ResearchKnowledgeAuthor;
  sourceReferences: ResearchArtifactReference[];
  manuscriptTargets: ManuscriptTarget[];
  supersedesEntryId: string | null;
  reconcilesEntryIds: string[];
  createdAt: string;
  checksum: ResearchArtifactChecksum;
  claim: "research-knowledge-record-not-independent-verification-or-publication-claim";
}

export interface LivingResearchRecord {
  schemaVersion: typeof LIVING_RESEARCH_RECORD_SCHEMA_VERSION;
  projectId: string;
  entries: ResearchKnowledgeEntry[];
  identity: ResearchArtifactIdentity;
  participantDataIncluded: false;
}

export interface CreateResearchKnowledgeEntryInput {
  id: string;
  projectId: string;
  stage: ResearchStageNumber;
  stepId: string;
  kind: ResearchKnowledgeKind;
  title: string;
  body: string;
  timing: ResearchKnowledgeTiming;
  author: ResearchKnowledgeAuthor;
  sourceReferences?: readonly ResearchArtifactReference[];
  manuscriptTargets?: readonly ManuscriptTarget[];
  supersedesEntryId?: string | null;
  reconcilesEntryIds?: readonly string[];
  createdAt: string;
}

const KNOWLEDGE_KINDS: readonly ResearchKnowledgeKind[] = [
  "decision", "rationale", "evidence", "assumption", "limitation",
  "method-detail", "result", "interpretation", "writing-note",
];
const KNOWLEDGE_TIMINGS: readonly ResearchKnowledgeTiming[] = ["planned", "actual", "reconciled"];
const MANUSCRIPT_TARGETS: readonly ManuscriptTarget[] = [
  "abstract", "introduction", "literature-review", "methods", "results",
  "discussion", "conclusion", "references", "supplement", "poster",
];
const TOKEN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;

function text(value: unknown, maximum: number): string {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, maximum)
    : "";
}

function token(value: unknown): string {
  const candidate = text(value, 160);
  return TOKEN_PATTERN.test(candidate) ? candidate : "";
}

function unique<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)].sort();
}

function entryPayload(input: Omit<ResearchKnowledgeEntry, "checksum">) {
  return input;
}

async function researchKnowledgeEntryWithState(
  entry: ResearchKnowledgeEntry,
  state: ResearchKnowledgeState,
): Promise<ResearchKnowledgeEntry> {
  const { checksum: _checksum, ...core } = entry;
  void _checksum;
  const updated = { ...core, state };
  return { ...updated, checksum: await sha256ArtifactChecksum(entryPayload(updated)) };
}

export async function createResearchKnowledgeEntry(
  input: CreateResearchKnowledgeEntryInput,
): Promise<ResearchKnowledgeEntry> {
  const id = token(input.id);
  const projectId = token(input.projectId);
  const stepId = token(input.stepId);
  const title = text(input.title, 500);
  const body = text(input.body, MAX_LIVING_RESEARCH_ENTRY_TEXT);
  if (!id || !projectId || !stepId || !title || !body) {
    throw new Error("Research knowledge entry is missing a bounded identifier, title, or body.");
  }
  if (!KNOWLEDGE_KINDS.includes(input.kind)) throw new Error("Research knowledge kind is invalid.");
  if (!KNOWLEDGE_TIMINGS.includes(input.timing)) throw new Error("Research knowledge timing is invalid.");
  if (Number.isNaN(new Date(input.createdAt).getTime())) throw new Error("Research knowledge timestamp is invalid.");
  const manuscriptTargets = unique(input.manuscriptTargets ?? []);
  if (manuscriptTargets.some((target) => !MANUSCRIPT_TARGETS.includes(target))) {
    throw new Error("Research knowledge manuscript target is invalid.");
  }
  const sourceReferences = [...(input.sourceReferences ?? [])].sort((left, right) => (
    left.artifactKind.localeCompare(right.artifactKind) || left.artifactId.localeCompare(right.artifactId)
  ));
  const core: Omit<ResearchKnowledgeEntry, "checksum"> = {
    schemaVersion: LIVING_RESEARCH_RECORD_SCHEMA_VERSION,
    id,
    projectId,
    stage: input.stage,
    stepId,
    kind: input.kind,
    title,
    body,
    state: "current",
    timing: input.timing,
    author: input.author,
    sourceReferences,
    manuscriptTargets,
    supersedesEntryId: input.supersedesEntryId ? token(input.supersedesEntryId) || null : null,
    reconcilesEntryIds: unique((input.reconcilesEntryIds ?? []).map(token).filter(Boolean)),
    createdAt: new Date(input.createdAt).toISOString(),
    claim: "research-knowledge-record-not-independent-verification-or-publication-claim",
  };
  return { ...core, checksum: await sha256ArtifactChecksum(entryPayload(core)) };
}

export async function verifyResearchKnowledgeEntry(entry: ResearchKnowledgeEntry): Promise<boolean> {
  if (!isResearchArtifactChecksum(entry.checksum)) return false;
  const { checksum, ...core } = entry;
  return checksum === await sha256ArtifactChecksum(entryPayload(core));
}

export async function createLivingResearchRecord(
  projectId: string,
  entries: readonly ResearchKnowledgeEntry[],
): Promise<LivingResearchRecord> {
  if (!token(projectId)) throw new Error("Living Research Record project ID is invalid.");
  if (entries.length > MAX_LIVING_RESEARCH_ENTRIES) throw new Error("Living Research Record entry limit exceeded.");
  const ids = new Set<string>();
  for (const entry of entries) {
    if (entry.projectId !== projectId) throw new Error("Living Research Record cannot mix projects.");
    if (ids.has(entry.id)) throw new Error(`Duplicate Living Research Record entry: ${entry.id}`);
    if (!await verifyResearchKnowledgeEntry(entry)) throw new Error(`Invalid Living Research Record entry: ${entry.id}`);
    ids.add(entry.id);
  }
  const normalizedEntries = [...entries].sort((left, right) => (
    left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id)
  ));
  for (const entry of normalizedEntries) {
    if (entry.supersedesEntryId && !ids.has(entry.supersedesEntryId)) {
      throw new Error(`Missing superseded Living Research Record entry: ${entry.supersedesEntryId}`);
    }
    if (entry.reconcilesEntryIds.some((id) => !ids.has(id))) {
      throw new Error(`Missing reconciled Living Research Record entry for: ${entry.id}`);
    }
  }
  const payload = {
    schemaVersion: LIVING_RESEARCH_RECORD_SCHEMA_VERSION,
    projectId,
    entries: normalizedEntries,
    participantDataIncluded: false as const,
  };
  const latestSources = new Map<string, ResearchArtifactReference>();
  for (const entry of normalizedEntries) {
    if (entry.state === "superseded") continue;
    for (const source of entry.sourceReferences) {
      latestSources.set(`${source.artifactKind}:${source.artifactId}`, source);
    }
  }
  return {
    ...payload,
    identity: await createResearchArtifactIdentity({
      artifactKind: "living-research-record",
      artifactId: `living-record-${projectId}`,
      artifactSchemaVersion: LIVING_RESEARCH_RECORD_SCHEMA_VERSION,
      payload,
      // Each entry retains its exact historical provenance in the payload. The
      // envelope fingerprint represents the current source view only, avoiding
      // conflicting old/new checksums for the same versioned source identity.
      sources: [...latestSources.values()],
    }),
  };
}

export async function appendResearchKnowledgeEntry(
  entries: readonly ResearchKnowledgeEntry[],
  next: ResearchKnowledgeEntry,
): Promise<ResearchKnowledgeEntry[]> {
  if (entries.some((entry) => entry.id === next.id)) throw new Error("Research knowledge history is append-only by ID.");
  const superseded = next.supersedesEntryId;
  const existing = await Promise.all(entries.map((entry) => (
    superseded === entry.id ? researchKnowledgeEntryWithState(entry, "superseded") : Promise.resolve(entry)
  )));
  return [...existing, next];
}

export async function markResearchKnowledgeStale(
  entries: readonly ResearchKnowledgeEntry[],
  changedSources: readonly ResearchArtifactReference[],
): Promise<ResearchKnowledgeEntry[]> {
  const changed = new Set(changedSources.map((source) => `${source.artifactKind}:${source.artifactId}:${source.checksum}`));
  return Promise.all(entries.map(async (entry) => {
    if (entry.state === "superseded") return entry;
    const hasChangedSource = entry.sourceReferences.some((source) => (
      [...changed].some((candidate) => candidate.startsWith(`${source.artifactKind}:${source.artifactId}:`) && candidate !== `${source.artifactKind}:${source.artifactId}:${source.checksum}`)
    ));
    return hasChangedSource ? researchKnowledgeEntryWithState(entry, "stale") : entry;
  }));
}

export function selectCurrentResearchKnowledge(
  record: LivingResearchRecord,
  target?: ManuscriptTarget,
): ResearchKnowledgeEntry[] {
  return record.entries.filter((entry) => (
    entry.state === "current" && (!target || entry.manuscriptTargets.includes(target))
  ));
}
