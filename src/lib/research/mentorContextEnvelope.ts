import {
  isResearchArtifactChecksum,
  normalizeResearchArtifactReference,
  sha256ArtifactChecksum,
  type ResearchArtifactChecksum,
  type ResearchArtifactReference,
} from "./artifactIdentity";
import { collectResearchArtifactInvalidations, CERISE_RESEARCH_ARTIFACT_GRAPH, type ResearchArtifactKind } from "./researchArtifactGraph";
import { getResearchArtifactDefinition, isRegisteredResearchArtifactKind, type ResearchStageNumber } from "./researchArtifactRegistry";
import { verifyResearchDecisionRecord, type ResearchDecisionRecord } from "./researchDecisionLedger";
import { verifyResearchKnowledgeEntry, type ResearchKnowledgeEntry } from "./livingResearchRecord";
import type { ResearchFoundationSnapshot } from "./researchFoundationPersistence";
import type { ResearchStageId } from "./researchPathConfig";

export const MENTOR_CONTEXT_ENVELOPE_SCHEMA_VERSION = 1 as const;
export const MENTOR_PROJECT_MEMORY_SCHEMA_VERSION = 1 as const;
export const MAX_MENTOR_CONTEXT_BYTES = 96 * 1024;
export const MAX_MENTOR_SELECTED_TEXT = 1_500;
export const MAX_MENTOR_MEMORY_ITEMS = 24;
export const MAX_MENTOR_APPROVED_EVIDENCE = 12;
export const MAX_MENTOR_ARTIFACTS = 40;
export const MAX_MENTOR_DECISIONS = 10;

const TOKEN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const MEMORY_STORAGE_PREFIX = "cerise:research-mentor-memory:v1";
const INSIGHT_STORAGE_PREFIX = "cerise:research-mentor-insights:v1";
export const MENTOR_CONTEXT_REFRESH_EVENT = "cerise:mentor-context-refresh" as const;

export interface MentorStageCapability {
  stage: ResearchStageNumber;
  stageId: ResearchStageId;
  focus: string;
  allowsCanvasAlternatives: boolean;
  permittedContext: readonly string[];
  prohibitedContext: readonly string[];
}

export const MENTOR_STAGE_CAPABILITIES: readonly MentorStageCapability[] = [
  { stage: 1, stageId: "stage-01", focus: "Frame and compare a researcher-owned pathway.", allowsCanvasAlternatives: true, permittedContext: ["pathway summaries", "route", "work-state notes"], prohibitedContext: ["mental-state inference", "automatic selection"] },
  { stage: 2, stageId: "stage-02", focus: "Connect the proposal to approved evidence and unresolved claims.", allowsCanvasAlternatives: false, permittedContext: ["artifact metadata", "approved evidence", "open questions"], prohibitedContext: ["invented citations", "automatic authorship"] },
  { stage: 3, stageId: "stage-03", focus: "Reconcile design, implementation, consent, and analysis dependencies.", allowsCanvasAlternatives: false, permittedContext: ["route", "artifact lifecycle", "approved method knowledge"], prohibitedContext: ["participant rows", "signatures", "recordings"] },
  { stage: 4, stageId: "stage-04", focus: "Explain pilot, governance, and operational readiness dependencies.", allowsCanvasAlternatives: false, permittedContext: ["artifact lifecycle", "approved aggregate knowledge"], prohibitedContext: ["approval decisions by AI", "participant rows"] },
  { stage: 5, stageId: "stage-05", focus: "Support collection or import workflow without exposing evidence rows.", allowsCanvasAlternatives: false, permittedContext: ["manifest metadata", "route", "open questions"], prohibitedContext: ["participant rows", "raw imported records"] },
  { stage: 6, stageId: "stage-06", focus: "Connect preparation and analysis artifacts to the verified contract.", allowsCanvasAlternatives: false, permittedContext: ["aggregate artifact metadata", "approved analysis knowledge"], prohibitedContext: ["dataset rows", "raw qualitative material"] },
  { stage: 7, stageId: "stage-07", focus: "Separate findings, interpretations, limitations, and writing decisions.", allowsCanvasAlternatives: false, permittedContext: ["approved knowledge", "aggregate results metadata", "manuscript decisions"], prohibitedContext: ["unsupported claims", "automatic authorship"] },
  { stage: 8, stageId: "stage-08", focus: "Reconcile publication, poster, reproducibility, and preservation outputs.", allowsCanvasAlternatives: false, permittedContext: ["template metadata", "asset metadata", "release lifecycle"], prohibitedContext: ["venue approval claims", "restricted package contents"] },
] as const;

export type MentorMemoryKind = "preference" | "open-question";
export type MentorMemoryStatus = "active" | "resolved";

export interface MentorProjectMemoryItem {
  id: string;
  kind: MentorMemoryKind;
  text: string;
  status: MentorMemoryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MentorProjectMemory {
  schemaVersion: typeof MENTOR_PROJECT_MEMORY_SCHEMA_VERSION;
  projectId: string;
  revision: number;
  items: MentorProjectMemoryItem[];
  updatedAt: string;
  participantDataIncluded: false;
  chatTranscriptStored: false;
  inferredPersonalProfileStored: false;
  checksum: ResearchArtifactChecksum;
}

export interface MentorContextLocation {
  stage: ResearchStageNumber;
  stageId: ResearchStageId;
  stageTitle: string;
  stepId: string;
  stepTitle: string;
}

export interface MentorContextRoute {
  source: "foundation" | "pathway" | "unavailable";
  confirmation: "draft" | "researcher-confirmed" | "unavailable";
  intent: string | null;
  methodFamily: string | null;
  setting: string | null;
  assignment: string | null;
  audience: string | null;
  dataSensitivity: string | null;
  specialProcedures: string[];
}

export interface MentorContextArtifact {
  id: string;
  kind: ResearchArtifactKind;
  label: string;
  stage: ResearchStageNumber;
  checksum: ResearchArtifactChecksum;
  lifecycle: "current" | "stale" | "blocked" | "superseded";
  sourceReferences: ResearchArtifactReference[];
}

export interface MentorContextEvidence {
  id: string;
  title: string;
  body: string;
  stage: ResearchStageNumber;
  stepId: string;
  timing: "planned" | "actual" | "reconciled";
  sourceReferences: ResearchArtifactReference[];
  checksum: ResearchArtifactChecksum;
}

export interface MentorContextDecision {
  id: string;
  domain: string;
  action: string;
  summary: string;
  reason: string;
  decidedAt: string;
  checksum: ResearchArtifactChecksum;
}

export interface MentorContextStaleDependency {
  artifactKind: ResearchArtifactKind;
  artifactId: string | null;
  status: "stale" | "blocked";
  action: "recompute" | "reconcile" | "reverify" | "refreeze" | "rereview";
  reason: string;
  changedSources: ResearchArtifactKind[];
}

export interface MentorContextItemSummary {
  id: string;
  kind: string;
  status: string;
  summary: string;
}

export interface MentorContextEnvelope {
  schemaVersion: typeof MENTOR_CONTEXT_ENVELOPE_SCHEMA_VERSION;
  projectId: string;
  location: MentorContextLocation;
  capability: MentorStageCapability;
  selectedText: string;
  route: MentorContextRoute;
  activeContextItems: MentorContextItemSummary[];
  workStateNotes: MentorContextItemSummary[];
  artifacts: MentorContextArtifact[];
  approvedEvidence: MentorContextEvidence[];
  unresolvedUncertainties: MentorProjectMemoryItem[];
  staleDependencies: MentorContextStaleDependency[];
  recentDecisions: MentorContextDecision[];
  preferences: MentorProjectMemoryItem[];
  memoryRevision: number;
  generatedAt: string;
  foundationStatus: "secure-and-device" | "device-only";
  redactionCount: number;
  contentChecksum: ResearchArtifactChecksum;
  contextChecksum: ResearchArtifactChecksum;
  participantDataIncluded: false;
  signaturesIncluded: false;
  recordingsIncluded: false;
  rawDatasetRowsIncluded: false;
  chatTranscriptStored: false;
  inferredPersonalProfileStored: false;
  claim: "bounded-project-context-not-independent-validity-ethics-approval-authorship-or-mental-state-assessment";
}

interface CreateMentorContextEnvelopeInput {
  projectId: string;
  location: MentorContextLocation;
  foundation?: ResearchFoundationSnapshot | null;
  memory: MentorProjectMemory;
  selectedText?: string;
  pathwayRoute?: unknown;
  activeContextItems?: readonly MentorContextItemSummary[];
  workStateNotes?: readonly MentorContextItemSummary[];
  localKnowledgeEntries?: readonly unknown[];
  generatedAt?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeText(value: unknown, maximum: number): string {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, maximum)
    : "";
}

function safeToken(value: unknown): string {
  const candidate = safeText(value, 160);
  return TOKEN_PATTERN.test(candidate) ? candidate : "";
}

function safeDate(value: unknown, fallback: string): string {
  const date = typeof value === "string" ? new Date(value) : new Date(Number.NaN);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function redactText(value: unknown, maximum: number): { value: string; count: number } {
  let text = safeText(value, maximum);
  let count = 0;
  const patterns: ReadonlyArray<[RegExp, string]> = [
    [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL REDACTED]"],
    [/(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/g, "[PHONE REDACTED]"],
    [/\b\d{1,6}\s+[A-Za-z0-9.' -]{2,60}\s(?:street|st\.?|road|rd\.?|avenue|ave\.?|boulevard|blvd\.?|lane|ln\.?|drive|dr\.?|court|ct\.?|way)\b/gi, "[ADDRESS REDACTED]"],
    [/\b(?:Dr\.?|Professor|Prof\.?|Mr\.?|Mrs\.?|Ms\.?|Mx\.?)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/g, "[NAME REDACTED]"],
    [/\b(?:irb|protocol|approval|study)(?:\s*(?:number|no\.?|id|#))?\s*[:#-]?\s*(?:[A-Z]{1,10}[-_:]?)?\d{2,}[A-Z0-9._-]*\b/gi, "[INSTITUTIONAL ID REDACTED]"],
  ];
  for (const [pattern, token] of patterns) {
    pattern.lastIndex = 0;
    text = text.replace(pattern, () => { count += 1; return token; });
  }
  return { value: text, count };
}

function memoryCore(memory: Omit<MentorProjectMemory, "checksum">) {
  return memory;
}

function normalizedMemoryItem(value: unknown, kind?: MentorMemoryKind): MentorProjectMemoryItem | null {
  if (!isRecord(value)) return null;
  const id = safeToken(value.id);
  const nextKind = value.kind === "preference" || value.kind === "open-question" ? value.kind : null;
  const status = value.status === "active" || value.status === "resolved" ? value.status : null;
  const redacted = redactText(value.text, 1_000).value;
  const createdAt = safeDate(value.createdAt, "");
  const updatedAt = safeDate(value.updatedAt, "");
  if (!id || !nextKind || kind && nextKind !== kind || !status || !redacted || !createdAt || !updatedAt) return null;
  return { id, kind: nextKind, text: redacted, status, createdAt, updatedAt };
}

export async function createMentorProjectMemory(input: {
  projectId: string;
  items?: readonly MentorProjectMemoryItem[];
  revision?: number;
  updatedAt?: string;
}): Promise<MentorProjectMemory> {
  const projectId = safeToken(input.projectId);
  if (!projectId) throw new Error("Mentor project memory requires a bounded project ID.");
  const now = safeDate(input.updatedAt, new Date().toISOString());
  const items = (input.items ?? []).map((item) => normalizedMemoryItem(item)).filter((item): item is MentorProjectMemoryItem => Boolean(item));
  const unique = [...new Map(items.map((item) => [item.id, item])).values()].slice(-MAX_MENTOR_MEMORY_ITEMS);
  const core = {
    schemaVersion: MENTOR_PROJECT_MEMORY_SCHEMA_VERSION,
    projectId,
    revision: Number.isSafeInteger(input.revision) && (input.revision ?? 0) >= 0 ? input.revision as number : 0,
    items: unique,
    updatedAt: now,
    participantDataIncluded: false as const,
    chatTranscriptStored: false as const,
    inferredPersonalProfileStored: false as const,
  };
  return { ...core, checksum: await sha256ArtifactChecksum(memoryCore(core)) };
}

export async function normalizeAndVerifyMentorProjectMemory(value: unknown, projectId: string): Promise<MentorProjectMemory | null> {
  if (!isRecord(value) || value.schemaVersion !== MENTOR_PROJECT_MEMORY_SCHEMA_VERSION || value.projectId !== projectId
    || !Number.isSafeInteger(value.revision) || Number(value.revision) < 0 || !Array.isArray(value.items)
    || value.items.length > MAX_MENTOR_MEMORY_ITEMS || !isResearchArtifactChecksum(value.checksum)
    || value.participantDataIncluded !== false || value.chatTranscriptStored !== false || value.inferredPersonalProfileStored !== false) return null;
  const items = value.items.map((item) => normalizedMemoryItem(item));
  if (items.some((item) => item === null)) return null;
  const memory = await createMentorProjectMemory({ projectId, items: items as MentorProjectMemoryItem[], revision: Number(value.revision), updatedAt: safeDate(value.updatedAt, "") });
  return memory.updatedAt && memory.checksum === value.checksum ? memory : null;
}

export async function upsertMentorProjectMemoryItem(memory: MentorProjectMemory, input: {
  id?: string;
  kind: MentorMemoryKind;
  text: string;
  status?: MentorMemoryStatus;
  now?: string;
}): Promise<MentorProjectMemory> {
  const now = safeDate(input.now, new Date().toISOString());
  const id = safeToken(input.id) || `memory-${globalThis.crypto.randomUUID()}`;
  const existing = memory.items.find((item) => item.id === id);
  const item = normalizedMemoryItem({ id, kind: input.kind, text: input.text, status: input.status ?? "active", createdAt: existing?.createdAt ?? now, updatedAt: now });
  if (!item) throw new Error("Project memory needs a bounded preference or open question.");
  return createMentorProjectMemory({ projectId: memory.projectId, items: [...memory.items.filter((current) => current.id !== id), item], revision: memory.revision + 1, updatedAt: now });
}

export async function removeMentorProjectMemoryItem(memory: MentorProjectMemory, id: string, now = new Date().toISOString()): Promise<MentorProjectMemory> {
  return createMentorProjectMemory({ projectId: memory.projectId, items: memory.items.filter((item) => item.id !== id), revision: memory.revision + 1, updatedAt: now });
}

export function mentorProjectMemoryStorageKey(projectId: string): string {
  if (!safeToken(projectId)) throw new Error("Mentor project memory project ID is invalid.");
  return `${MEMORY_STORAGE_PREFIX}:${projectId}`;
}

export async function loadMentorProjectMemory(storage: Storage, projectId: string): Promise<MentorProjectMemory> {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(mentorProjectMemoryStorageKey(projectId)) ?? "null");
    return await normalizeAndVerifyMentorProjectMemory(parsed, projectId) ?? createMentorProjectMemory({ projectId });
  } catch {
    return createMentorProjectMemory({ projectId });
  }
}

export function saveMentorProjectMemory(storage: Storage, memory: MentorProjectMemory): void {
  storage.setItem(mentorProjectMemoryStorageKey(memory.projectId), JSON.stringify(memory));
}

export function mentorInsightStorageKey(projectId: string): string {
  if (!safeToken(projectId)) throw new Error("Mentor insight project ID is invalid.");
  return `${INSIGHT_STORAGE_PREFIX}:${projectId}`;
}

export function loadLocalMentorInsights(storage: Storage, projectId: string): unknown[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(mentorInsightStorageKey(projectId)) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => isRecord(item) && item.projectId === projectId).slice(-200) : [];
  } catch {
    return [];
  }
}

export function appendLocalMentorInsight(storage: Storage, projectId: string, entry: ResearchKnowledgeEntry): number {
  if (entry.projectId !== projectId) throw new Error("Mentor insight cannot cross projects.");
  const current = loadLocalMentorInsights(storage, projectId);
  const next = [...current.filter((item) => !isRecord(item) || item.id !== entry.id), entry].slice(-200);
  storage.setItem(mentorInsightStorageKey(projectId), JSON.stringify(next));
  return next.length;
}

function normalizeLocation(value: unknown): MentorContextLocation | null {
  if (!isRecord(value)) return null;
  const stage = Number(value.stage) as ResearchStageNumber;
  const stageId = value.stageId as ResearchStageId;
  const stepId = safeToken(value.stepId);
  const stageTitle = safeText(value.stageTitle, 160);
  const stepTitle = safeText(value.stepTitle, 200);
  if (![1, 2, 3, 4, 5, 6, 7, 8].includes(stage) || stageId !== `stage-${String(stage).padStart(2, "0")}` || !stepId || !stageTitle || !stepTitle) return null;
  return { stage, stageId, stageTitle, stepId, stepTitle };
}

function routeFrom(value: unknown, source: MentorContextRoute["source"]): MentorContextRoute | null {
  if (!isRecord(value)) return null;
  const route = isRecord(value.decision) && isRecord(value.decision.route) ? value.decision.route : value;
  const profile = isRecord(value.profile) ? value.profile : value;
  const candidate = source === "foundation" ? profile : route;
  if (!isRecord(candidate)) return null;
  const special = Array.isArray(candidate.specialProcedures) ? candidate.specialProcedures : Array.isArray(candidate.possibleSpecialProcedures) ? candidate.possibleSpecialProcedures : [];
  return {
    source,
    confirmation: candidate.confirmation === "researcher-confirmed" ? "researcher-confirmed" : "draft",
    intent: safeToken(candidate.intent) || null,
    methodFamily: safeToken(candidate.methodFamily) || null,
    setting: safeToken(candidate.setting) || null,
    assignment: safeToken(candidate.assignment) || null,
    audience: safeToken(candidate.audience) || null,
    dataSensitivity: safeToken(candidate.dataSensitivity) || null,
    specialProcedures: [...new Set(special.map(safeToken).filter(Boolean))].slice(0, 12),
  };
}

function normalizeContextSummary(value: unknown): MentorContextItemSummary | null {
  if (!isRecord(value)) return null;
  const id = safeToken(value.id);
  const kind = safeToken(value.kind);
  const status = safeToken(value.status);
  const summary = redactText(value.summary, 1_200).value;
  return id && kind && status && summary ? { id, kind, status, summary } : null;
}

function normalizeArtifact(value: unknown, projectId: string): MentorContextArtifact | null {
  if (!isRecord(value)) return null;
  const explicitProject = safeToken(value.projectId ?? value.project_id);
  if (explicitProject && explicitProject !== projectId) return null;
  const kindValue = safeToken(value.kind ?? value.artifactKind ?? value.artifact_kind);
  if (!isRegisteredResearchArtifactKind(kindValue)) return null;
  const id = safeToken(value.id ?? value.artifactId ?? value.artifact_id);
  const checksum = value.checksum;
  const lifecycleValue = value.lifecycle ?? value.lifecycleStatus ?? value.lifecycle_status;
  const lifecycle = ["current", "stale", "blocked", "superseded"].includes(String(lifecycleValue)) ? lifecycleValue as MentorContextArtifact["lifecycle"] : null;
  const rawSources = value.sourceReferences ?? value.source_references;
  const sources = Array.isArray(rawSources) ? rawSources.map(normalizeResearchArtifactReference) : [];
  if (!id || !isResearchArtifactChecksum(checksum) || !lifecycle || sources.some((source) => source === null)) return null;
  const definition = getResearchArtifactDefinition(kindValue);
  return { id, kind: kindValue, label: definition.label, stage: definition.stage, checksum, lifecycle, sourceReferences: (sources as ResearchArtifactReference[]).slice(0, 64) };
}

async function normalizeEvidence(value: unknown, projectId: string): Promise<MentorContextEvidence | null> {
  if (!isRecord(value) || value.projectId !== projectId || value.kind !== "evidence" || value.state !== "current" || value.author !== "researcher") return null;
  if (!await verifyResearchKnowledgeEntry(value as unknown as ResearchKnowledgeEntry)) return null;
  const entry = value as unknown as ResearchKnowledgeEntry;
  const title = redactText(entry.title, 500).value;
  const body = redactText(entry.body, 1_500).value;
  if (!title || !body) return null;
  return { id: entry.id, title, body, stage: entry.stage, stepId: entry.stepId, timing: entry.timing, sourceReferences: entry.sourceReferences.slice(0, 32), checksum: entry.checksum };
}

async function normalizeDecision(value: unknown, projectId: string): Promise<MentorContextDecision | null> {
  if (!isRecord(value) || value.projectId !== projectId || !await verifyResearchDecisionRecord(value as unknown as ResearchDecisionRecord)) return null;
  const decision = value as unknown as ResearchDecisionRecord;
  return {
    id: decision.id,
    domain: decision.domain,
    action: decision.action,
    summary: redactText(decision.suggestionSummary, 700).value,
    reason: redactText(decision.decisionReason, 700).value,
    decidedAt: decision.decidedAt,
    checksum: decision.checksum,
  };
}

function staleDependencies(artifacts: readonly MentorContextArtifact[]): MentorContextStaleDependency[] {
  const direct = artifacts.filter((artifact) => artifact.lifecycle === "stale" || artifact.lifecycle === "blocked");
  const result: MentorContextStaleDependency[] = direct.map((artifact) => ({
    artifactKind: artifact.kind,
    artifactId: artifact.id,
    status: artifact.lifecycle as "stale" | "blocked",
    action: "reverify",
    reason: artifact.lifecycle === "blocked" ? "The artifact has unresolved blocking findings." : "The artifact is marked stale in the foundation index.",
    changedSources: [],
  }));
  if (direct.length) {
    const propagated = collectResearchArtifactInvalidations(direct.map((artifact) => artifact.kind), CERISE_RESEARCH_ARTIFACT_GRAPH);
    for (const item of propagated) {
      for (const artifact of artifacts.filter((candidate) => candidate.kind === item.artifactKind && candidate.lifecycle !== "superseded")) {
        if (result.some((current) => current.artifactId === artifact.id && current.artifactKind === artifact.kind)) continue;
        result.push({ artifactKind: artifact.kind, artifactId: artifact.id, status: "stale", action: item.action, reason: item.reason, changedSources: item.changedSources });
      }
    }
  }
  return result.slice(0, 40);
}

function envelopeContentCore(envelope: Omit<MentorContextEnvelope, "contentChecksum" | "contextChecksum" | "generatedAt">) {
  return envelope;
}

export async function createMentorContextEnvelope(input: CreateMentorContextEnvelopeInput): Promise<MentorContextEnvelope> {
  const projectId = safeToken(input.projectId);
  const location = normalizeLocation(input.location);
  const memory = await normalizeAndVerifyMentorProjectMemory(input.memory, projectId);
  if (!projectId || !location || !memory) throw new Error("Mentor context scope or memory is invalid.");
  const capability = MENTOR_STAGE_CAPABILITIES.find((item) => item.stageId === location.stageId);
  if (!capability) throw new Error("Mentor stage capability is unavailable.");
  const selected = redactText(input.selectedText, MAX_MENTOR_SELECTED_TEXT);
  const foundationRoute = input.foundation?.routeProfile && isRecord(input.foundation.routeProfile) && (!safeToken(input.foundation.routeProfile.projectId) || input.foundation.routeProfile.projectId === projectId)
    ? routeFrom(input.foundation.routeProfile, "foundation") : null;
  const route = foundationRoute ?? routeFrom(input.pathwayRoute, "pathway") ?? {
    source: "unavailable" as const, confirmation: "unavailable" as const, intent: null, methodFamily: null, setting: null, assignment: null, audience: null, dataSensitivity: null, specialProcedures: [],
  };
  const artifacts = (input.foundation?.artifactIndex ?? []).map((value) => normalizeArtifact(value, projectId)).filter((item): item is MentorContextArtifact => Boolean(item)).slice(0, MAX_MENTOR_ARTIFACTS);
  const evidenceCandidates = [...(input.foundation?.knowledgeEntries ?? []), ...(input.localKnowledgeEntries ?? [])];
  const evidence = (await Promise.all(evidenceCandidates.map((value) => normalizeEvidence(value, projectId)))).filter((item): item is MentorContextEvidence => Boolean(item));
  const approvedEvidence = [...new Map(evidence.map((item) => [item.id, item])).values()].slice(-MAX_MENTOR_APPROVED_EVIDENCE);
  const decisions = (await Promise.all((input.foundation?.decisionEvents ?? []).map((value) => normalizeDecision(value, projectId)))).filter((item): item is MentorContextDecision => Boolean(item));
  const recentDecisions = decisions.sort((left, right) => right.decidedAt.localeCompare(left.decidedAt)).slice(0, MAX_MENTOR_DECISIONS);
  const activeContextItems = (input.activeContextItems ?? []).map(normalizeContextSummary).filter((item): item is MentorContextItemSummary => Boolean(item)).slice(0, 32);
  const workStateNotes = (input.workStateNotes ?? []).map(normalizeContextSummary).filter((item): item is MentorContextItemSummary => Boolean(item)).slice(0, 8);
  const preferences = memory.items.filter((item) => item.kind === "preference" && item.status === "active").slice(-12);
  const unresolvedUncertainties = memory.items.filter((item) => item.kind === "open-question" && item.status === "active").slice(-12);
  const core = {
    schemaVersion: MENTOR_CONTEXT_ENVELOPE_SCHEMA_VERSION,
    projectId,
    location,
    capability,
    selectedText: selected.value,
    route,
    activeContextItems,
    workStateNotes,
    artifacts,
    approvedEvidence,
    unresolvedUncertainties,
    staleDependencies: staleDependencies(artifacts),
    recentDecisions,
    preferences,
    memoryRevision: memory.revision,
    foundationStatus: input.foundation ? "secure-and-device" as const : "device-only" as const,
    redactionCount: selected.count,
    participantDataIncluded: false as const,
    signaturesIncluded: false as const,
    recordingsIncluded: false as const,
    rawDatasetRowsIncluded: false as const,
    chatTranscriptStored: false as const,
    inferredPersonalProfileStored: false as const,
    claim: "bounded-project-context-not-independent-validity-ethics-approval-authorship-or-mental-state-assessment" as const,
  };
  const contentChecksum = await sha256ArtifactChecksum(envelopeContentCore(core), { maximumBytes: MAX_MENTOR_CONTEXT_BYTES });
  const generatedAt = safeDate(input.generatedAt, new Date().toISOString());
  const contextChecksum = await sha256ArtifactChecksum({ ...core, contentChecksum }, { maximumBytes: MAX_MENTOR_CONTEXT_BYTES });
  return { ...core, generatedAt, contentChecksum, contextChecksum };
}

export async function normalizeAndVerifyMentorContextEnvelope(value: unknown): Promise<MentorContextEnvelope | null> {
  if (!isRecord(value) || value.schemaVersion !== MENTOR_CONTEXT_ENVELOPE_SCHEMA_VERSION || !isRecord(value.location)
    || !isRecord(value.capability) || !isRecord(value.route) || !Array.isArray(value.artifacts)
    || !Array.isArray(value.approvedEvidence) || !Array.isArray(value.unresolvedUncertainties)
    || !Array.isArray(value.staleDependencies) || !Array.isArray(value.recentDecisions) || !Array.isArray(value.preferences)
    || !Array.isArray(value.activeContextItems) || !Array.isArray(value.workStateNotes)) return null;
  const projectId = safeToken(value.projectId);
  const location = normalizeLocation(value.location);
  const capability = MENTOR_STAGE_CAPABILITIES.find((item) => item.stageId === location?.stageId);
  if (!projectId || !location || !capability || value.capability.stageId !== location.stageId) return null;
  if (value.participantDataIncluded !== false || value.signaturesIncluded !== false || value.recordingsIncluded !== false
    || value.rawDatasetRowsIncluded !== false || value.chatTranscriptStored !== false || value.inferredPersonalProfileStored !== false
    || value.claim !== "bounded-project-context-not-independent-validity-ethics-approval-authorship-or-mental-state-assessment"
    || !isResearchArtifactChecksum(value.contentChecksum) || !isResearchArtifactChecksum(value.contextChecksum)) return null;
  const routeSource = value.route.source;
  let route: MentorContextRoute | null = null;
  if (routeSource === "unavailable") {
    route = {
      source: "unavailable",
      confirmation: "unavailable",
      intent: null,
      methodFamily: null,
      setting: null,
      assignment: null,
      audience: null,
      dataSensitivity: null,
      specialProcedures: [],
    };
  } else if (routeSource === "foundation" || routeSource === "pathway") {
    route = routeFrom(value.route, routeSource);
    if (route && value.route.confirmation === "researcher-confirmed") route.confirmation = "researcher-confirmed";
  }
  const activeContextItems = value.activeContextItems.map(normalizeContextSummary).filter((item): item is MentorContextItemSummary => Boolean(item)).slice(0, 32);
  const workStateNotes = value.workStateNotes.map(normalizeContextSummary).filter((item): item is MentorContextItemSummary => Boolean(item)).slice(0, 8);
  if (!route || activeContextItems.length !== value.activeContextItems.length || workStateNotes.length !== value.workStateNotes.length) return null;
  const artifacts = value.artifacts.map((item) => normalizeArtifact(item, projectId)).filter((item): item is MentorContextArtifact => Boolean(item)).slice(0, MAX_MENTOR_ARTIFACTS);
  if (artifacts.length !== value.artifacts.length) return null;
  const normalizeEvidenceSummary = (item: unknown): MentorContextEvidence | null => {
    if (!isRecord(item)) return null;
    const id = safeToken(item.id);
    const title = redactText(item.title, 500).value;
    const body = redactText(item.body, 1_500).value;
    const stage = Number(item.stage) as ResearchStageNumber;
    const stepId = safeToken(item.stepId);
    const timing = ["planned", "actual", "reconciled"].includes(String(item.timing)) ? item.timing as MentorContextEvidence["timing"] : null;
    const sources = Array.isArray(item.sourceReferences) ? item.sourceReferences.map(normalizeResearchArtifactReference) : [];
    if (!id || !title || !body || ![1, 2, 3, 4, 5, 6, 7, 8].includes(stage) || !stepId || !timing || sources.some((source) => source === null) || !isResearchArtifactChecksum(item.checksum)) return null;
    return { id, title, body, stage, stepId, timing, sourceReferences: sources as ResearchArtifactReference[], checksum: item.checksum };
  };
  const approvedEvidence = value.approvedEvidence.map(normalizeEvidenceSummary).filter((item): item is MentorContextEvidence => Boolean(item)).slice(0, MAX_MENTOR_APPROVED_EVIDENCE);
  if (approvedEvidence.length !== value.approvedEvidence.length) return null;
  const preferences = value.preferences.map((item) => normalizedMemoryItem(item, "preference")).filter((item): item is MentorProjectMemoryItem => Boolean(item)).slice(0, 12);
  const unresolvedUncertainties = value.unresolvedUncertainties.map((item) => normalizedMemoryItem(item, "open-question")).filter((item): item is MentorProjectMemoryItem => Boolean(item)).slice(0, 12);
  if (preferences.length !== value.preferences.length || unresolvedUncertainties.length !== value.unresolvedUncertainties.length) return null;
  const normalizeDecisionSummary = (item: unknown): MentorContextDecision | null => {
    if (!isRecord(item)) return null;
    const id = safeToken(item.id);
    const domain = safeToken(item.domain);
    const action = safeToken(item.action);
    const summary = redactText(item.summary, 700).value;
    const reason = redactText(item.reason, 700).value;
    const decidedAt = safeDate(item.decidedAt, "");
    return id && domain && action && summary && reason && decidedAt && isResearchArtifactChecksum(item.checksum)
      ? { id, domain, action, summary, reason, decidedAt, checksum: item.checksum }
      : null;
  };
  const recentDecisions = value.recentDecisions.map(normalizeDecisionSummary).filter((item): item is MentorContextDecision => Boolean(item)).slice(0, MAX_MENTOR_DECISIONS);
  if (recentDecisions.length !== value.recentDecisions.length) return null;
  const generatedAt = safeDate(value.generatedAt, "");
  const memoryRevision = Number(value.memoryRevision);
  const redactionCount = Number(value.redactionCount);
  const foundationStatus: MentorContextEnvelope["foundationStatus"] | null = value.foundationStatus === "secure-and-device" || value.foundationStatus === "device-only" ? value.foundationStatus : null;
  if (!generatedAt || !Number.isSafeInteger(memoryRevision) || memoryRevision < 0 || !Number.isSafeInteger(redactionCount) || redactionCount < 0 || !foundationStatus) return null;
  const core = {
    schemaVersion: MENTOR_CONTEXT_ENVELOPE_SCHEMA_VERSION,
    projectId,
    location,
    capability,
    selectedText: redactText(value.selectedText, MAX_MENTOR_SELECTED_TEXT).value,
    route,
    activeContextItems,
    workStateNotes,
    artifacts,
    approvedEvidence,
    unresolvedUncertainties,
    staleDependencies: staleDependencies(artifacts),
    recentDecisions,
    preferences,
    memoryRevision,
    foundationStatus,
    redactionCount,
    participantDataIncluded: false as const,
    signaturesIncluded: false as const,
    recordingsIncluded: false as const,
    rawDatasetRowsIncluded: false as const,
    chatTranscriptStored: false as const,
    inferredPersonalProfileStored: false as const,
    claim: "bounded-project-context-not-independent-validity-ethics-approval-authorship-or-mental-state-assessment" as const,
  };
  const contentChecksum = await sha256ArtifactChecksum(core, { maximumBytes: MAX_MENTOR_CONTEXT_BYTES });
  const contextChecksum = await sha256ArtifactChecksum({ ...core, contentChecksum }, { maximumBytes: MAX_MENTOR_CONTEXT_BYTES });
  if (contentChecksum !== value.contentChecksum || contextChecksum !== value.contextChecksum) return null;
  return { ...core, generatedAt, contentChecksum, contextChecksum };
}

export function mentorContextIsCurrent(responseChecksum: ResearchArtifactChecksum, current: MentorContextEnvelope): boolean {
  return responseChecksum === current.contentChecksum;
}

/** Domain workspaces dispatch this only after a meaningful save or version change. */
export function notifyMentorContextChanged(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(MENTOR_CONTEXT_REFRESH_EVENT));
}
