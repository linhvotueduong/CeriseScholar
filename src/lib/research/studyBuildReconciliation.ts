import { sha256ArtifactChecksum, type ResearchArtifactChecksum } from "./artifactIdentity";
import {
  validateExperimentStudio,
  type ExperimentBranchRule,
  type ExperimentCondition,
  type ExperimentStudioDocument,
} from "./experimentStudio";
import type {
  StudyBuildMaterializationPreview,
  StudyBuildRecommendationDecision,
} from "./studyBuildMaterializer";
import type { StudyBuildProfile } from "./studyBuildProfile";

export const STUDIO_SOURCE_LINK_SCHEMA_VERSION = 1 as const;
export const STUDY_BUILD_RECONCILIATION_SCHEMA_VERSION = 1 as const;
export const MAX_RECONCILIATION_RATIONALE_LENGTH = 2_000;

export type StudioSemanticKind = "block" | "condition" | "branch" | "assignment" | "execution" | "title";
export type ReconciliationChangeRisk = "safe" | "researcher-owned";
export type ReconciliationDecisionAction = "apply" | "keep";

export interface StudioSourceBinding {
  semanticId: string;
  kind: StudioSemanticKind;
  recommendationIds: string[];
}

export interface StudioResearcherOverride {
  semanticId: string;
  rationale: string;
  recordedAt: string;
  sourceFingerprintChecksum: ResearchArtifactChecksum;
}

export interface StudioSourceLink {
  schemaVersion: typeof STUDIO_SOURCE_LINK_SCHEMA_VERSION;
  projectId: string;
  linkedAt: string;
  materializerVersion: number;
  sourceFingerprintChecksum: ResearchArtifactChecksum;
  profileChecksum: ResearchArtifactChecksum;
  synchronizedDocumentChecksum: ResearchArtifactChecksum;
  acceptedRecommendationIds: string[];
  recommendationDecisions: StudyBuildRecommendationDecision[];
  bindings: StudioSourceBinding[];
  researcherOverrides: StudioResearcherOverride[];
  baselineDocument: ExperimentStudioDocument;
  integrityClaim: "source-links-support-three-way-reconciliation-not-scientific-ethics-or-release-approval";
}

export interface StudyBuildReconciliationChange {
  id: string;
  semanticId: string;
  kind: StudioSemanticKind;
  operation: "add" | "update" | "remove";
  risk: ReconciliationChangeRisk;
  summary: string;
  recommendationIds: string[];
  currentValue: unknown;
  proposedValue: unknown;
}

export interface StudyBuildReconciliationPreview {
  schemaVersion: typeof STUDY_BUILD_RECONCILIATION_SCHEMA_VERSION;
  projectId: string;
  currentDocumentChecksum: ResearchArtifactChecksum;
  proposedDocumentChecksum: ResearchArtifactChecksum;
  sourceChanged: boolean;
  changes: StudyBuildReconciliationChange[];
  preservedManualSemanticIds: string[];
  issues: string[];
}

export interface ReconciliationDecision {
  changeId: string;
  action: ReconciliationDecisionAction;
  rationale: string;
}

export interface AppliedStudyBuildReconciliation {
  document: ExperimentStudioDocument;
  documentChecksum: ResearchArtifactChecksum;
  sourceLink: StudioSourceLink;
  appliedChangeIds: string[];
  keptChangeIds: string[];
  validationErrors: string[];
}

export interface RebuiltStudyDraft {
  schemaVersion: 1;
  projectId: string;
  draftId: string;
  createdAt: string;
  document: ExperimentStudioDocument;
  sourceLink: StudioSourceLink;
  integrityClaim: "alternate-draft-does-not-replace-current-studio-document";
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface SemanticElement {
  semanticId: string;
  kind: StudioSemanticKind;
  value: unknown;
}

function cleanRationale(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, MAX_RECONCILIATION_RATIONALE_LENGTH);
}

function equal(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function semanticElements(document: ExperimentStudioDocument): Map<string, SemanticElement> {
  const elements: SemanticElement[] = [
    { semanticId: "document:title", kind: "title", value: document.title },
    { semanticId: "document:assignment", kind: "assignment", value: document.assignment },
    { semanticId: "document:execution", kind: "execution", value: document.execution },
    ...document.blocks.map((value) => ({ semanticId: `block:${value.id}`, kind: "block" as const, value })),
    ...document.conditions.map((value) => ({ semanticId: `condition:${value.id}`, kind: "condition" as const, value })),
    ...document.branchRules.map((value) => ({ semanticId: `branch:${value.id}`, kind: "branch" as const, value })),
  ];
  return new Map(elements.map((element) => [element.semanticId, element]));
}

function recommendationIdsFor(
  semanticId: string,
  preview: StudyBuildMaterializationPreview,
  previousBindings: readonly StudioSourceBinding[] = [],
): string[] {
  const rawId = semanticId.split(":").slice(1).join(":");
  const direct = preview.changes.filter((item) => item.path.includes(rawId));
  const familyAliases: Array<[string, string[]]> = [
    ["welcome", ["welcome"]],
    ["consent-reference", ["consent-reference"]],
    ["eligibility", ["eligibility"]],
    ["online-privacy", ["online-privacy", "home-privacy"]],
    ["researcher-handoff", ["researcher-handoff"]],
    ["equipment-check", ["equipment-check"]],
    ["field-readiness", ["field-readiness"]],
    ["field-privacy", ["field-privacy"]],
    ["hybrid-", ["hybrid"]],
    ["survey-measure", ["survey-sections", "survey-design"]],
    ["survey-routing", ["survey-routing", "survey-skip-rule"]],
    ["survey-instructions", ["survey-sections", "survey-design"]],
    ["condition-", ["randomized-design", "lab-condition"]],
    ["manipulation", ["manipulation"]],
    ["outcome", ["outcomes", "randomized-design"]],
    ["within-", ["within-design"]],
    ["existing-group", ["quasi-design"]],
    ["baseline", ["quasi-design"]],
    ["observation", ["observational-design"]],
    ["qualitative", ["qualitative-design"]],
    ["recording-binding", ["qualitative-design"]],
    ["mixed-", ["mixed-design"]],
    ["debrief", ["debrief"]],
  ];
  const aliases = familyAliases.find(([needle]) => rawId.includes(needle))?.[1] ?? [];
  const family = preview.changes.filter((item) => aliases.some((alias) => item.id.includes(alias)));
  const broad = preview.changes.filter((item) => {
    if (semanticId.startsWith("block:")) return item.kind === "block";
    if (semanticId.startsWith("condition:")) return item.kind === "condition";
    if (semanticId.startsWith("branch:")) return item.kind === "branch";
    return item.kind === "execution" || item.kind === "runtime-boundary";
  });
  const previous = previousBindings.find((binding) => binding.semanticId === semanticId)?.recommendationIds ?? [];
  const selected = direct.length > 0 ? direct : family.length > 0 ? family : broad;
  const selectedIds = selected.flatMap((item) => item.recommendationIds);
  return [...new Set(selectedIds.length > 0 ? selectedIds : previous)].sort();
}

function bindingsFor(
  document: ExperimentStudioDocument,
  preview: StudyBuildMaterializationPreview,
  previousBindings: readonly StudioSourceBinding[] = [],
): StudioSourceBinding[] {
  return [...semanticElements(document).values()].map((element) => ({
    semanticId: element.semanticId,
    kind: element.kind,
    recommendationIds: recommendationIdsFor(element.semanticId, preview, previousBindings),
  })).sort((left, right) => left.semanticId.localeCompare(right.semanticId));
}

export function studioSourceLinkStorageKey(projectId: string): string {
  return `cerise-studio-source-link:${projectId}:v${STUDIO_SOURCE_LINK_SCHEMA_VERSION}`;
}

export function rebuiltStudyDraftStorageKey(projectId: string, draftId: string): string {
  return `cerise-study-build-alternate:${projectId}:${draftId}:v1`;
}

export async function createStudioSourceLink(
  preview: StudyBuildMaterializationPreview,
  profile: StudyBuildProfile,
  decisions: readonly StudyBuildRecommendationDecision[],
  linkedAt: string,
  previous?: StudioSourceLink,
  document: ExperimentStudioDocument | null = preview.candidate,
): Promise<StudioSourceLink> {
  const baselineDocument = preview.candidate;
  if (!document || !baselineDocument || !preview.candidateChecksum) throw new Error("A materialized candidate is required to create a Studio source link.");
  const acceptedRecommendationIds = decisions
    .filter((decision) => decision.action === "accept" || decision.action === "modify")
    .map((decision) => decision.recommendationId)
    .sort();
  return {
    schemaVersion: STUDIO_SOURCE_LINK_SCHEMA_VERSION,
    projectId: profile.projectId,
    linkedAt,
    materializerVersion: 2,
    sourceFingerprintChecksum: profile.sourceFingerprint.checksum,
    profileChecksum: preview.profileChecksum,
    synchronizedDocumentChecksum: await sha256ArtifactChecksum(document),
    acceptedRecommendationIds,
    recommendationDecisions: decisions.map((decision) => ({ ...decision })),
    bindings: bindingsFor(baselineDocument, preview, previous?.bindings),
    researcherOverrides: previous?.researcherOverrides.map((override) => ({ ...override })) ?? [],
    baselineDocument: structuredClone(baselineDocument),
    integrityClaim: "source-links-support-three-way-reconciliation-not-scientific-ethics-or-release-approval",
  };
}

export function writeStudioSourceLink(storage: StorageLike, link: StudioSourceLink): void {
  storage.setItem(studioSourceLinkStorageKey(link.projectId), JSON.stringify(link));
}

export function readStudioSourceLink(storage: StorageLike, projectId: string): StudioSourceLink | null {
  try {
    const raw = storage.getItem(studioSourceLinkStorageKey(projectId));
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<StudioSourceLink>;
    if (
      value.schemaVersion !== STUDIO_SOURCE_LINK_SCHEMA_VERSION
      || value.projectId !== projectId
      || !value.baselineDocument
      || !Array.isArray(value.bindings)
      || !Array.isArray(value.recommendationDecisions)
      || !Array.isArray(value.researcherOverrides)
      || typeof value.sourceFingerprintChecksum !== "string"
      || typeof value.profileChecksum !== "string"
      || typeof value.synchronizedDocumentChecksum !== "string"
    ) return null;
    return value as StudioSourceLink;
  } catch {
    return null;
  }
}

export async function createStudyBuildReconciliationPreview(
  sourceLink: StudioSourceLink,
  currentDocument: ExperimentStudioDocument,
  proposedPreview: StudyBuildMaterializationPreview,
  profile: StudyBuildProfile,
): Promise<StudyBuildReconciliationPreview> {
  const issues: string[] = [];
  if (!proposedPreview.candidate || !proposedPreview.candidateChecksum) {
    issues.push("The new source profile cannot produce a valid bounded candidate.");
  }
  if (sourceLink.projectId !== currentDocument.projectId || sourceLink.projectId !== profile.projectId) {
    issues.push("The source link, current Studio document, and proposed profile do not belong to the same project.");
  }
  const currentDocumentChecksum = await sha256ArtifactChecksum(currentDocument);
  const proposedDocumentChecksum = proposedPreview.candidateChecksum ?? await sha256ArtifactChecksum(currentDocument);
  if (!proposedPreview.candidate || issues.length > 0) {
    return {
      schemaVersion: STUDY_BUILD_RECONCILIATION_SCHEMA_VERSION,
      projectId: currentDocument.projectId,
      currentDocumentChecksum,
      proposedDocumentChecksum,
      sourceChanged: sourceLink.sourceFingerprintChecksum !== profile.sourceFingerprint.checksum,
      changes: [],
      preservedManualSemanticIds: [],
      issues,
    };
  }

  const baseline = semanticElements(sourceLink.baselineDocument);
  const current = semanticElements(currentDocument);
  const proposed = semanticElements(proposedPreview.candidate);
  const keys = [...new Set([...baseline.keys(), ...proposed.keys()])].sort();
  const changes: StudyBuildReconciliationChange[] = [];
  for (const semanticId of keys) {
    const baselineElement = baseline.get(semanticId);
    const currentElement = current.get(semanticId);
    const proposedElement = proposed.get(semanticId);
    if (equal(baselineElement?.value, proposedElement?.value)) continue;
    if (equal(currentElement?.value, proposedElement?.value)) continue;
    const kind = proposedElement?.kind ?? baselineElement?.kind;
    if (!kind) continue;
    const operation = !baselineElement ? "add" : !proposedElement ? "remove" : "update";
    const risk: ReconciliationChangeRisk = equal(currentElement?.value, baselineElement?.value)
      ? "safe"
      : "researcher-owned";
    changes.push({
      id: `reconcile:${semanticId}`,
      semanticId,
      kind,
      operation,
      risk,
      summary: `${operation === "add" ? "Add" : operation === "remove" ? "Remove" : "Update"} ${semanticId.replace(":", " · ")}`,
      recommendationIds: recommendationIdsFor(semanticId, proposedPreview, sourceLink.bindings),
      currentValue: currentElement?.value ?? null,
      proposedValue: proposedElement?.value ?? null,
    });
  }
  const generated = new Set(sourceLink.bindings.map((binding) => binding.semanticId));
  const preservedManualSemanticIds = [...current.keys()]
    .filter((semanticId) => !generated.has(semanticId) && !proposed.has(semanticId))
    .sort();
  return {
    schemaVersion: STUDY_BUILD_RECONCILIATION_SCHEMA_VERSION,
    projectId: currentDocument.projectId,
    currentDocumentChecksum,
    proposedDocumentChecksum,
    sourceChanged: sourceLink.sourceFingerprintChecksum !== profile.sourceFingerprint.checksum,
    changes,
    preservedManualSemanticIds,
    issues,
  };
}

function replaceById<T extends { id: string }>(items: T[], value: T | null, id: string): T[] {
  if (value === null) return items.filter((item) => item.id !== id);
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return [...items, structuredClone(value)];
  return items.map((item, itemIndex) => itemIndex === index ? structuredClone(value) : item);
}

function applyElement(document: ExperimentStudioDocument, change: StudyBuildReconciliationChange): ExperimentStudioDocument {
  const next = structuredClone(document);
  const id = change.semanticId.split(":").slice(1).join(":");
  if (change.kind === "block") next.blocks = replaceById(next.blocks, change.proposedValue as ExperimentStudioDocument["blocks"][number] | null, id);
  if (change.kind === "condition") next.conditions = replaceById(next.conditions, change.proposedValue as ExperimentCondition | null, id);
  if (change.kind === "branch") next.branchRules = replaceById(next.branchRules, change.proposedValue as ExperimentBranchRule | null, id);
  if (change.kind === "assignment" && change.proposedValue) next.assignment = structuredClone(change.proposedValue as ExperimentStudioDocument["assignment"]);
  if (change.kind === "execution" && change.proposedValue) next.execution = structuredClone(change.proposedValue as ExperimentStudioDocument["execution"]);
  if (change.kind === "title" && typeof change.proposedValue === "string") next.title = change.proposedValue;
  return next;
}

export async function applyStudyBuildReconciliation(
  preview: StudyBuildReconciliationPreview,
  currentDocument: ExperimentStudioDocument,
  proposedPreview: StudyBuildMaterializationPreview,
  profile: StudyBuildProfile,
  decisions: readonly ReconciliationDecision[],
  recommendationDecisions: readonly StudyBuildRecommendationDecision[],
  appliedAt: string,
  previousLink: StudioSourceLink,
): Promise<AppliedStudyBuildReconciliation> {
  if (!proposedPreview.candidate || !proposedPreview.candidateChecksum || preview.issues.length > 0) {
    throw new Error("A blocked reconciliation cannot be applied.");
  }
  if (await sha256ArtifactChecksum(currentDocument) !== preview.currentDocumentChecksum) {
    throw new Error("The Studio document changed during review. Refresh the reconciliation before applying anything.");
  }
  const byId = new Map(decisions.map((decision) => [decision.changeId, {
    ...decision,
    rationale: cleanRationale(decision.rationale),
  }]));
  for (const change of preview.changes) {
    const decision = byId.get(change.id);
    if (!decision) throw new Error(`Choose Apply or Keep for ${change.semanticId}.`);
    if (decision.action === "keep" && !decision.rationale) throw new Error(`Record a rationale for keeping ${change.semanticId}.`);
    if (change.risk === "researcher-owned" && decision.action === "apply" && !decision.rationale) {
      throw new Error(`Record why the proposed source should replace researcher-owned ${change.semanticId}.`);
    }
  }
  let document = structuredClone(currentDocument);
  const appliedChangeIds: string[] = [];
  const keptChangeIds: string[] = [];
  const overrides = previousLink.researcherOverrides.filter((override) => (
    !preview.changes.some((change) => change.semanticId === override.semanticId)
  ));
  for (const change of preview.changes) {
    const decision = byId.get(change.id)!;
    if (decision.action === "apply") {
      document = applyElement(document, change);
      appliedChangeIds.push(change.id);
    } else {
      keptChangeIds.push(change.id);
      overrides.push({
        semanticId: change.semanticId,
        rationale: decision.rationale,
        recordedAt: appliedAt,
        sourceFingerprintChecksum: profile.sourceFingerprint.checksum,
      });
    }
  }
  document.updatedAt = appliedAt;
  const validationErrors = validateExperimentStudio(document)
    .filter((issue) => issue.severity === "error")
    .map((issue) => issue.message);
  if (validationErrors.length > 0) throw new Error(validationErrors[0]);
  const sourceLink = await createStudioSourceLink(
    proposedPreview,
    profile,
    recommendationDecisions,
    appliedAt,
    previousLink,
    document,
  );
  sourceLink.researcherOverrides = overrides;
  sourceLink.synchronizedDocumentChecksum = await sha256ArtifactChecksum(document);
  return {
    document,
    documentChecksum: sourceLink.synchronizedDocumentChecksum,
    sourceLink,
    appliedChangeIds,
    keptChangeIds,
    validationErrors,
  };
}

export async function createRebuiltStudyDraft(
  proposedPreview: StudyBuildMaterializationPreview,
  profile: StudyBuildProfile,
  recommendationDecisions: readonly StudyBuildRecommendationDecision[],
  createdAt: string,
): Promise<RebuiltStudyDraft> {
  if (!proposedPreview.candidate || !proposedPreview.canCreate) throw new Error("A blocked candidate cannot become a new draft.");
  const checksum = await sha256ArtifactChecksum(proposedPreview.candidate);
  const draftId = checksum.slice("sha256:".length, "sha256:".length + 12);
  return {
    schemaVersion: 1,
    projectId: profile.projectId,
    draftId,
    createdAt,
    document: structuredClone(proposedPreview.candidate),
    sourceLink: await createStudioSourceLink(proposedPreview, profile, recommendationDecisions, createdAt),
    integrityClaim: "alternate-draft-does-not-replace-current-studio-document",
  };
}

export function writeRebuiltStudyDraft(storage: StorageLike, draft: RebuiltStudyDraft): void {
  storage.setItem(rebuiltStudyDraftStorageKey(draft.projectId, draft.draftId), JSON.stringify(draft));
}
