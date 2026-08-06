import {
  isResearchArtifactChecksum,
  sha256ArtifactChecksum,
  type ResearchArtifactChecksum,
  type ResearchArtifactReference,
} from "./artifactIdentity";
import {
  verifyProjectEvidenceAssessment,
  verifyResearchProposalDocument,
  type ProjectEvidenceAssessment,
  type ResearchProposalDocument,
  type ResearchProposalSection,
} from "./researchProposalDocument";
import {
  createResearchDecisionRecord,
  verifyResearchDecisionRecord,
  type ResearchDecisionRecord,
} from "./researchDecisionLedger";

export const PROPOSAL_COPILOT_SCHEMA_VERSION = 1 as const;
export const MAX_PROPOSAL_COPILOT_REQUEST_BYTES = 96 * 1024;
export const MAX_PROPOSAL_COPILOT_SECTION_TEXT = 30_000;
export const MAX_PROPOSAL_COPILOT_FOCUS = 1_200;
export const MAX_PROPOSAL_COPILOT_SOURCES = 12;
export const MAX_PROPOSAL_COPILOT_OPERATIONS = 6;
export const MAX_PROPOSAL_COPILOT_DECISIONS = 200;

export const PROPOSAL_COPILOT_TECHNIQUES = [
  "outline",
  "evidence-synthesis",
  "clarity",
  "structure",
  "consistency",
] as const;

export type ProposalCopilotTechnique = typeof PROPOSAL_COPILOT_TECHNIQUES[number];
export type ProposalCopilotOperationKind = "replace-text" | "insert-after";
export type ProposalCopilotDisposition = "accept" | "decline" | "defer";

export interface ProposalCopilotSourceContext {
  assessmentId: string;
  sourceId: string;
  assessmentChecksum: ResearchArtifactChecksum;
  decisionRationale: string;
  researcherNotes: string;
  caveats: string[];
  linkedQuestionIds: string[];
  linkedClaimIds: string[];
}

export interface ProposalCopilotContext {
  schemaVersion: typeof PROPOSAL_COPILOT_SCHEMA_VERSION;
  projectId: string;
  technique: ProposalCopilotTechnique;
  focus: string;
  baseProposal: ResearchArtifactReference;
  section: {
    id: string;
    title: string;
    role: string;
    content: string;
    contentChecksum: ResearchArtifactChecksum;
  };
  selectedSources: ProposalCopilotSourceContext[];
  allowedCitationKeys: string[];
  excludedContent: readonly [
    "nonselected-proposal-sections",
    "nonselected-sources",
    "requirements-and-authority-rules",
    "research-questions-and-study-contract",
    "participant-data",
    "decision-ledger",
    "prompt-or-chat-history",
  ];
  participantDataIncluded: false;
  contextChecksum: ResearchArtifactChecksum;
  claim: "single-section-selected-source-context-not-independent-evidence-or-authorship";
}

export interface ProposalCopilotOperation {
  id: string;
  kind: ProposalCopilotOperationKind;
  title: string;
  rationale: string;
  uncertainty: string;
  currentText: string;
  proposedText: string;
  start: number;
  end: number;
  evidenceAssessmentIds: string[];
  citationKeys: string[];
}

export interface ProposalCopilotPatch {
  schemaVersion: typeof PROPOSAL_COPILOT_SCHEMA_VERSION;
  id: string;
  projectId: string;
  technique: ProposalCopilotTechnique;
  focus: string;
  sectionId: string;
  baseProposal: ResearchArtifactReference;
  baseSectionChecksum: ResearchArtifactChecksum;
  contextChecksum: ResearchArtifactChecksum;
  summary: string;
  operations: ProposalCopilotOperation[];
  servedModel: string;
  generatedAt: string;
  claim: "review-before-apply-writing-patch-not-authorship-evidence-verification-or-approval";
  checksum: ResearchArtifactChecksum;
}

export interface ProposalCopilotOperationDecision {
  operationId: string;
  disposition: ProposalCopilotDisposition;
  rationale: string;
  proposedText: string;
}

export interface ProposalCopilotReview {
  stale: boolean;
  accepted: number;
  declined: number;
  deferred: number;
  missingRationales: string[];
  canCommit: boolean;
  message: string;
}

export interface ProposalCopilotRejectedOperation {
  index: number;
  reason:
    | "malformed"
    | "unknown-kind"
    | "unknown-source-reference"
    | "unknown-citation"
    | "anchor-not-unique"
    | "overlapping-operation"
    | "unsafe-proposed-text";
}

const TOKEN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const OPERATION_KINDS: readonly ProposalCopilotOperationKind[] = ["replace-text", "insert-after"];
const EXCLUDED_CONTENT = [
  "nonselected-proposal-sections",
  "nonselected-sources",
  "requirements-and-authority-rules",
  "research-questions-and-study-contract",
  "participant-data",
  "decision-ledger",
  "prompt-or-chat-history",
] as const;
const HTML_PATTERN = /<\/?[A-Za-z][^>]*>/;
const REDACTION_PATTERN = /\[(?:EMAIL|PHONE|ADDRESS|NAME|SIGNATURE|INSTITUTIONAL IDENTIFIER)[^\]]*REDACTED\]/i;
const INLINE_CITATION_PATTERN = /\[@([A-Za-z0-9._:-]{1,160})\]/g;
const AUTHOR_YEAR_PAREN_PATTERN = /\([A-Z][A-Za-z'’-]+(?:\s+et\s+al\.)?,\s*(?:19|20)\d{2}[a-z]?\)/g;
const AUTHOR_YEAR_NARRATIVE_PATTERN = /\b[A-Z][A-Za-z'’-]+(?:\s+et\s+al\.)?\s*\((?:19|20)\d{2}[a-z]?\)/g;

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

function safeTokenList(value: unknown, maximum = 24): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.slice(0, maximum).map(safeToken).filter(Boolean))].sort();
}

function proposalReference(document: ResearchProposalDocument): ResearchArtifactReference {
  return {
    artifactKind: document.identity.artifactKind,
    artifactId: document.identity.artifactId,
    schemaVersion: document.identity.artifactSchemaVersion,
    checksum: document.identity.checksum,
  };
}

function contextPayload(context: Omit<ProposalCopilotContext, "contextChecksum">) {
  return context;
}

function patchPayload(patch: Omit<ProposalCopilotPatch, "checksum">) {
  return patch;
}

function occurrences(text: string, needle: string): number[] {
  if (!needle) return [];
  const positions: number[] = [];
  let from = 0;
  while (from <= text.length - needle.length) {
    const position = text.indexOf(needle, from);
    if (position < 0) break;
    positions.push(position);
    from = position + Math.max(1, needle.length);
  }
  return positions;
}

function citationTokens(text: string): string[] {
  INLINE_CITATION_PATTERN.lastIndex = 0;
  return [...text.matchAll(INLINE_CITATION_PATTERN)].map((match) => match[1]);
}

function newAuthorYearCitations(currentText: string, proposedText: string): boolean {
  const current = new Set([
    ...(currentText.match(AUTHOR_YEAR_PAREN_PATTERN) ?? []),
    ...(currentText.match(AUTHOR_YEAR_NARRATIVE_PATTERN) ?? []),
  ]);
  return [
    ...(proposedText.match(AUTHOR_YEAR_PAREN_PATTERN) ?? []),
    ...(proposedText.match(AUTHOR_YEAR_NARRATIVE_PATTERN) ?? []),
  ].some((citation) => !current.has(citation));
}

function proposedTextIsSafe(currentText: string, proposedText: string, allowedCitationKeys: ReadonlySet<string>): boolean {
  if (!proposedText || proposedText.length > 12_000 || HTML_PATTERN.test(proposedText) || REDACTION_PATTERN.test(proposedText)) return false;
  if (citationTokens(proposedText).some((key) => !allowedCitationKeys.has(key))) return false;
  return !newAuthorYearCitations(currentText, proposedText);
}

export async function createProposalCopilotContext(input: {
  document: ResearchProposalDocument;
  sectionId: string;
  assessments: readonly ProjectEvidenceAssessment[];
  selectedAssessmentIds: readonly string[];
  technique: ProposalCopilotTechnique;
  focus?: string;
}): Promise<ProposalCopilotContext> {
  if (!await verifyResearchProposalDocument(input.document)) throw new Error("The current proposal revision could not be verified.");
  if (!PROPOSAL_COPILOT_TECHNIQUES.includes(input.technique)) throw new Error("The selected proposal technique is not registered.");
  const section = input.document.sections.find((candidate) => candidate.id === input.sectionId);
  if (!section || section.content.length > MAX_PROPOSAL_COPILOT_SECTION_TEXT) throw new Error("Select one bounded proposal section.");
  const linkedAssessmentIds = new Set(section.sourceEvidenceAssessmentIds ?? []);
  const selectedIds = [...new Set(input.selectedAssessmentIds)].slice(0, MAX_PROPOSAL_COPILOT_SOURCES);
  if (selectedIds.some((id) => !linkedAssessmentIds.has(id))) throw new Error("The copilot can use only reviewed sources already linked to this section.");
  const byId = new Map(input.assessments.map((assessment) => [assessment.assessmentId, assessment]));
  const selected: ProjectEvidenceAssessment[] = [];
  for (const id of selectedIds) {
    const assessment = byId.get(id);
    if (!assessment || assessment.status !== "included" || !assessment.reviewedAt || !await verifyProjectEvidenceAssessment(assessment)) {
      throw new Error("Every selected source must be an included, researcher-reviewed, checksum-valid assessment.");
    }
    selected.push(assessment);
  }
  const contentChecksum = await sha256ArtifactChecksum({ sectionId: section.id, content: section.content });
  const core: Omit<ProposalCopilotContext, "contextChecksum"> = {
    schemaVersion: PROPOSAL_COPILOT_SCHEMA_VERSION,
    projectId: input.document.projectId,
    technique: input.technique,
    focus: safeText(input.focus, MAX_PROPOSAL_COPILOT_FOCUS),
    baseProposal: proposalReference(input.document),
    section: {
      id: section.id,
      title: section.title.slice(0, 500),
      role: section.role,
      content: section.content,
      contentChecksum,
    },
    selectedSources: selected.map((assessment) => ({
      assessmentId: assessment.assessmentId,
      sourceId: assessment.sourceId,
      assessmentChecksum: assessment.identity.checksum,
      decisionRationale: assessment.decisionRationale.slice(0, 2_000),
      researcherNotes: assessment.researcherNotes.slice(0, 4_000),
      caveats: assessment.caveats.slice(0, 24).map((value) => value.slice(0, 1_000)),
      linkedQuestionIds: assessment.linkedQuestionIds.slice(0, 24),
      linkedClaimIds: assessment.linkedClaimIds.slice(0, 24),
    })),
    allowedCitationKeys: [...new Set(selected.map((assessment) => assessment.sourceId))].sort(),
    excludedContent: EXCLUDED_CONTENT,
    participantDataIncluded: false,
    claim: "single-section-selected-source-context-not-independent-evidence-or-authorship",
  };
  return { ...core, contextChecksum: await sha256ArtifactChecksum(contextPayload(core), { maximumBytes: MAX_PROPOSAL_COPILOT_REQUEST_BYTES }) };
}

export async function normalizeAndVerifyProposalCopilotContext(value: unknown): Promise<ProposalCopilotContext | null> {
  try {
    if (!isRecord(value) || value.schemaVersion !== PROPOSAL_COPILOT_SCHEMA_VERSION || !isRecord(value.section) || !isRecord(value.baseProposal)) return null;
    const technique = typeof value.technique === "string" && PROPOSAL_COPILOT_TECHNIQUES.includes(value.technique as ProposalCopilotTechnique) ? value.technique as ProposalCopilotTechnique : null;
    const projectId = safeToken(value.projectId);
    const sectionId = safeToken(value.section.id);
    const role = safeToken(value.section.role);
    const baseProposal = value.baseProposal as unknown as ResearchArtifactReference;
    if (!technique || !projectId || !sectionId || !role || baseProposal.artifactKind !== "research-proposal" || baseProposal.artifactId !== `proposal-${projectId}` || baseProposal.schemaVersion !== 1 || !isResearchArtifactChecksum(baseProposal.checksum)) return null;
    const content = typeof value.section.content === "string" && value.section.content.length <= MAX_PROPOSAL_COPILOT_SECTION_TEXT ? value.section.content : null;
    if (content === null || !isResearchArtifactChecksum(value.section.contentChecksum) || value.section.contentChecksum !== await sha256ArtifactChecksum({ sectionId, content })) return null;
    if (!Array.isArray(value.selectedSources) || value.selectedSources.length > MAX_PROPOSAL_COPILOT_SOURCES) return null;
    const selectedSources: ProposalCopilotSourceContext[] = [];
    for (const item of value.selectedSources) {
      if (!isRecord(item)) return null;
      const assessmentId = safeToken(item.assessmentId);
      const sourceId = safeToken(item.sourceId);
      if (!assessmentId || !sourceId || !isResearchArtifactChecksum(item.assessmentChecksum)) return null;
      selectedSources.push({
        assessmentId,
        sourceId,
        assessmentChecksum: item.assessmentChecksum,
        decisionRationale: safeText(item.decisionRationale, 2_000),
        researcherNotes: safeText(item.researcherNotes, 4_000),
        caveats: Array.isArray(item.caveats) ? item.caveats.slice(0, 24).map((entry) => safeText(entry, 1_000)).filter(Boolean) : [],
        linkedQuestionIds: safeTokenList(item.linkedQuestionIds),
        linkedClaimIds: safeTokenList(item.linkedClaimIds),
      });
    }
    if (new Set(selectedSources.map((item) => item.assessmentId)).size !== selectedSources.length) return null;
    const allowedCitationKeys = safeTokenList(value.allowedCitationKeys, MAX_PROPOSAL_COPILOT_SOURCES);
    if (allowedCitationKeys.some((key) => !selectedSources.some((source) => source.sourceId === key))) return null;
    if (!isResearchArtifactChecksum(value.contextChecksum) || value.participantDataIncluded !== false || value.claim !== "single-section-selected-source-context-not-independent-evidence-or-authorship") return null;
    if (JSON.stringify(value.excludedContent) !== JSON.stringify(EXCLUDED_CONTENT)) return null;
    const core: Omit<ProposalCopilotContext, "contextChecksum"> = {
      schemaVersion: PROPOSAL_COPILOT_SCHEMA_VERSION,
      projectId,
      technique,
      focus: safeText(value.focus, MAX_PROPOSAL_COPILOT_FOCUS),
      baseProposal,
      section: { id: sectionId, title: safeText(value.section.title, 500), role, content, contentChecksum: value.section.contentChecksum },
      selectedSources,
      allowedCitationKeys,
      excludedContent: EXCLUDED_CONTENT,
      participantDataIncluded: false,
      claim: "single-section-selected-source-context-not-independent-evidence-or-authorship",
    };
    return value.contextChecksum === await sha256ArtifactChecksum(contextPayload(core), { maximumBytes: MAX_PROPOSAL_COPILOT_REQUEST_BYTES })
      ? { ...core, contextChecksum: value.contextChecksum }
      : null;
  } catch {
    return null;
  }
}

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try { return JSON.parse(trimmed.slice(start, end + 1)); } catch { return null; }
  }
}

export async function parseProposalCopilotResponse(input: {
  raw: string;
  context: ProposalCopilotContext;
  servedModel: string;
  generatedAt?: string;
}): Promise<{ patch: ProposalCopilotPatch | null; rejectedOperations: ProposalCopilotRejectedOperation[] }> {
  const parsed = extractJsonObject(input.raw);
  if (!isRecord(parsed)) return { patch: null, rejectedOperations: [{ index: 0, reason: "malformed" }] };
  const rawOperations = Array.isArray(parsed.operations) ? parsed.operations : [];
  const allowedAssessments = new Set(input.context.selectedSources.map((source) => source.assessmentId));
  const allowedCitations = new Set(input.context.allowedCitationKeys);
  const operations: ProposalCopilotOperation[] = [];
  const rejectedOperations: ProposalCopilotRejectedOperation[] = [];
  const ids = new Set<string>();
  rawOperations.slice(0, MAX_PROPOSAL_COPILOT_OPERATIONS).forEach((candidate, index) => {
    if (!isRecord(candidate)) { rejectedOperations.push({ index, reason: "malformed" }); return; }
    const kind = typeof candidate.kind === "string" && OPERATION_KINDS.includes(candidate.kind as ProposalCopilotOperationKind) ? candidate.kind as ProposalCopilotOperationKind : null;
    if (!kind) { rejectedOperations.push({ index, reason: "unknown-kind" }); return; }
    const currentText = safeText(candidate.currentText, 6_000);
    const proposedText = safeText(candidate.proposedText, 12_001);
    const evidenceAssessmentIds = safeTokenList(candidate.evidenceAssessmentIds);
    const citationKeys = safeTokenList(candidate.citationKeys);
    if (evidenceAssessmentIds.some((id) => !allowedAssessments.has(id))) { rejectedOperations.push({ index, reason: "unknown-source-reference" }); return; }
    const proposedCitationTokens = citationTokens(proposedText);
    if (citationKeys.some((key) => !allowedCitations.has(key)) || proposedCitationTokens.some((key) => !allowedCitations.has(key) || !citationKeys.includes(key))) { rejectedOperations.push({ index, reason: "unknown-citation" }); return; }
    const found = occurrences(input.context.section.content, currentText);
    if (!currentText || found.length !== 1) { rejectedOperations.push({ index, reason: "anchor-not-unique" }); return; }
    if (!proposedTextIsSafe(currentText, proposedText, allowedCitations)) { rejectedOperations.push({ index, reason: "unsafe-proposed-text" }); return; }
    const start = kind === "insert-after" ? found[0] + currentText.length : found[0];
    const end = kind === "insert-after" ? start : found[0] + currentText.length;
    if (operations.some((operation) => (start === end && operation.start === operation.end && start === operation.start) || (start < operation.end && end > operation.start))) { rejectedOperations.push({ index, reason: "overlapping-operation" }); return; }
    const requestedId = safeToken(candidate.id) || `operation-${index + 1}`;
    const id = ids.has(requestedId) ? `${requestedId}-${index + 1}` : requestedId;
    ids.add(id);
    operations.push({
      id,
      kind,
      title: safeText(candidate.title, 240) || "Review writing change",
      rationale: safeText(candidate.rationale, 1_500) || "Review whether this change improves the selected section without changing its evidentiary meaning.",
      uncertainty: safeText(candidate.uncertainty, 1_000) || "The copilot cannot verify evidence, factual accuracy, authorship, or submission readiness.",
      currentText,
      proposedText,
      start,
      end,
      evidenceAssessmentIds,
      citationKeys,
    });
  });
  if (!operations.length || rejectedOperations.length) return { patch: null, rejectedOperations: rejectedOperations.length ? rejectedOperations : [{ index: 0, reason: "malformed" }] };
  const generatedAt = new Date(input.generatedAt ?? new Date().toISOString()).toISOString();
  const id = safeToken(parsed.id) || `proposal-patch-${input.context.contextChecksum.slice(-12)}`;
  const core: Omit<ProposalCopilotPatch, "checksum"> = {
    schemaVersion: PROPOSAL_COPILOT_SCHEMA_VERSION,
    id,
    projectId: input.context.projectId,
    technique: input.context.technique,
    focus: input.context.focus,
    sectionId: input.context.section.id,
    baseProposal: input.context.baseProposal,
    baseSectionChecksum: input.context.section.contentChecksum,
    contextChecksum: input.context.contextChecksum,
    summary: safeText(parsed.summary, 2_000) || "Review every operation. No proposal change has been made.",
    operations,
    servedModel: safeText(input.servedModel, 240) || "provider-model-unreported",
    generatedAt,
    claim: "review-before-apply-writing-patch-not-authorship-evidence-verification-or-approval",
  };
  return { patch: { ...core, checksum: await sha256ArtifactChecksum(patchPayload(core), { maximumBytes: MAX_PROPOSAL_COPILOT_REQUEST_BYTES }) }, rejectedOperations };
}

export async function verifyProposalCopilotPatch(patch: ProposalCopilotPatch): Promise<boolean> {
  try {
    const { checksum, ...core } = patch;
    if (!isResearchArtifactChecksum(checksum) || patch.schemaVersion !== PROPOSAL_COPILOT_SCHEMA_VERSION || patch.operations.length < 1 || patch.operations.length > MAX_PROPOSAL_COPILOT_OPERATIONS) return false;
    return checksum === await sha256ArtifactChecksum(patchPayload(core), { maximumBytes: MAX_PROPOSAL_COPILOT_REQUEST_BYTES });
  } catch { return false; }
}

export async function normalizeAndVerifyProposalCopilotPatch(value: unknown, projectId: string): Promise<ProposalCopilotPatch | null> {
  try {
    if (!isRecord(value) || value.projectId !== projectId || !Array.isArray(value.operations)) return null;
    const patch = value as unknown as ProposalCopilotPatch;
    if (!await verifyProposalCopilotPatch(patch)) return null;
    if (!safeToken(patch.id) || !safeToken(patch.sectionId) || !PROPOSAL_COPILOT_TECHNIQUES.includes(patch.technique) || !isResearchArtifactChecksum(patch.baseSectionChecksum) || !isResearchArtifactChecksum(patch.contextChecksum) || !Number.isFinite(Date.parse(patch.generatedAt))) return null;
    if (patch.baseProposal.artifactKind !== "research-proposal" || patch.baseProposal.artifactId !== `proposal-${projectId}`) return null;
    if (new Set(patch.operations.map((operation) => operation.id)).size !== patch.operations.length) return null;
    if (!patch.operations.every((operation) => safeToken(operation.id) && OPERATION_KINDS.includes(operation.kind) && operation.currentText.length > 0 && operation.currentText.length <= 6_000 && operation.proposedText.length > 0 && operation.proposedText.length <= 12_000 && Number.isSafeInteger(operation.start) && Number.isSafeInteger(operation.end) && operation.start >= 0 && operation.end >= operation.start && operation.evidenceAssessmentIds.every((id) => Boolean(safeToken(id))) && operation.citationKeys.every((id) => Boolean(safeToken(id))))) return null;
    return patch;
  } catch { return null; }
}

export async function compileProposalCopilotReview(input: {
  document: ResearchProposalDocument;
  patch: ProposalCopilotPatch;
  decisions: readonly ProposalCopilotOperationDecision[];
}): Promise<ProposalCopilotReview> {
  const section = input.document.sections.find((candidate) => candidate.id === input.patch.sectionId);
  const sectionChecksum = section ? await sha256ArtifactChecksum({ sectionId: section.id, content: section.content }) : null;
  const operationsFitSection = Boolean(section) && input.patch.operations.every((operation) => {
    if (occurrences(section?.content ?? "", operation.currentText).length !== 1) return false;
    return operation.kind === "replace-text"
      ? section?.content.slice(operation.start, operation.end) === operation.currentText
      : operation.start === operation.end
        && operation.start >= operation.currentText.length
        && section?.content.slice(operation.start - operation.currentText.length, operation.start) === operation.currentText;
  });
  const stale = !await verifyProposalCopilotPatch(input.patch)
    || input.patch.projectId !== input.document.projectId
    || input.document.identity.checksum !== input.patch.baseProposal.checksum
    || sectionChecksum !== input.patch.baseSectionChecksum
    || !operationsFitSection;
  const decisionById = new Map(input.decisions.map((decision) => [decision.operationId, decision]));
  let accepted = 0;
  let declined = 0;
  let deferred = 0;
  const missingRationales: string[] = [];
  for (const operation of input.patch.operations) {
    const decision = decisionById.get(operation.id);
    if (!decision || decision.disposition === "defer") deferred += 1;
    else if (decision.disposition === "accept") accepted += 1;
    else declined += 1;
    if (!decision?.rationale.trim()) missingRationales.push(operation.id);
  }
  const canCommit = !stale && deferred === 0 && missingRationales.length === 0;
  return {
    stale, accepted, declined, deferred, missingRationales, canCommit,
    message: stale
      ? "The proposal changed after this patch was generated. Generate a new patch from the current saved revision."
      : deferred > 0
        ? "Resolve every deferred operation before recording or applying this patch."
        : missingRationales.length
          ? "Record a researcher rationale for every operation."
          : accepted > 0
            ? "Accepted operations can create one new reviewed-AI-patch proposal revision."
            : "No prose will change; declined operations can be recorded in the decision ledger.",
  };
}

export async function applyProposalCopilotPatch(input: {
  document: ResearchProposalDocument;
  patch: ProposalCopilotPatch;
  decisions: readonly ProposalCopilotOperationDecision[];
}): Promise<ResearchProposalSection[]> {
  const review = await compileProposalCopilotReview(input);
  if (!review.canCommit || review.accepted < 1) throw new Error(review.message);
  const decisionById = new Map(input.decisions.map((decision) => [decision.operationId, decision]));
  const section = input.document.sections.find((candidate) => candidate.id === input.patch.sectionId);
  if (!section) throw new Error("The selected proposal section is unavailable.");
  const accepted = input.patch.operations
    .filter((operation) => decisionById.get(operation.id)?.disposition === "accept")
    .sort((left, right) => right.start - left.start);
  let content = section.content;
  for (const operation of accepted) {
    const decision = decisionById.get(operation.id);
    if (!decision) throw new Error("The operation decision is missing.");
    const proposedText = safeText(decision.proposedText, 12_001);
    const allowedCitations = new Set(operation.citationKeys);
    if (!proposedTextIsSafe(operation.currentText, proposedText, allowedCitations)) throw new Error("An accepted operation contains unsafe or untraceable citation text.");
    const expected = operation.kind === "replace-text" ? operation.currentText : "";
    if (content.slice(operation.start, operation.end) !== expected) throw new Error("The proposal section changed after review began.");
    const insertion = operation.kind === "insert-after" ? `\n\n${proposedText}` : proposedText;
    content = `${content.slice(0, operation.start)}${insertion}${content.slice(operation.end)}`;
  }
  return input.document.sections.map((candidate) => candidate.id === section.id
    ? { ...candidate, content, researcherReviewed: false }
    : { ...candidate });
}

export async function createProposalCopilotDecisionRecords(input: {
  document: ResearchProposalDocument;
  resultingDocument: ResearchProposalDocument | null;
  patch: ProposalCopilotPatch;
  decisions: readonly ProposalCopilotOperationDecision[];
  decidedAt?: string;
}): Promise<ResearchDecisionRecord[]> {
  const review = await compileProposalCopilotReview({ document: input.document, patch: input.patch, decisions: input.decisions });
  if (!review.canCommit) throw new Error(review.message);
  if (review.accepted > 0 && !input.resultingDocument) throw new Error("Accepted proposal operations require the resulting immutable proposal revision.");
  if (input.resultingDocument) {
    if (!await verifyResearchProposalDocument(input.resultingDocument) || input.resultingDocument.projectId !== input.document.projectId) throw new Error("The resulting proposal revision could not be verified.");
    const lastRevision = input.resultingDocument.revisionHistory.at(-1);
    if (lastRevision?.createdBy !== "reviewed-ai-patch" || lastRevision.previousChecksum !== input.document.identity.checksum) throw new Error("The resulting proposal is not a direct reviewed-AI-patch revision of the selected base.");
  }
  const decisionById = new Map(input.decisions.map((decision) => [decision.operationId, decision]));
  const baseArtifact = proposalReference(input.document);
  const resultingArtifact = input.resultingDocument ? proposalReference(input.resultingDocument) : null;
  const decidedAt = input.decidedAt ?? new Date().toISOString();
  return Promise.all(input.patch.operations.map(async (operation, index) => {
    const decision = decisionById.get(operation.id);
    if (!decision || decision.disposition === "defer" || !decision.rationale.trim()) throw new Error("Every operation must have a final researcher decision and rationale.");
    const edited = decision.proposedText.trim() !== operation.proposedText.trim();
    const action = decision.disposition === "accept" ? (edited ? "applied-after-edit" : "applied") : "dismissed";
    const suggestionChecksum = await sha256ArtifactChecksum(operation);
    return createResearchDecisionRecord({
      id: `proposal-${input.patch.id}-${index + 1}-${crypto.randomUUID()}`.slice(0, 160),
      projectId: input.document.projectId,
      domain: "proposal",
      suggestionId: `${input.patch.id}:${operation.id}`.slice(0, 160),
      suggestionKind: `proposal-${operation.kind}`,
      suggestionSummary: `${operation.title}: ${operation.rationale}`,
      action,
      decisionReason: decision.rationale,
      decidedAt,
      baseArtifact,
      suggestionChecksum,
      resultingArtifact: decision.disposition === "accept" ? resultingArtifact : null,
      servedModel: input.patch.servedModel,
    });
  }));
}

export function proposalCopilotDecisionStorageKey(projectId: string): string {
  return `cerise:proposal-copilot-decisions:v1:${projectId}`;
}

export async function appendLocalProposalCopilotDecisions(
  storage: Pick<Storage, "getItem" | "setItem">,
  projectId: string,
  records: readonly ResearchDecisionRecord[],
): Promise<number> {
  const raw = storage.getItem(proposalCopilotDecisionStorageKey(projectId));
  const existing: ResearchDecisionRecord[] = [];
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      for (const item of parsed.slice(-MAX_PROPOSAL_COPILOT_DECISIONS)) {
        const record = item as ResearchDecisionRecord;
        if (record.projectId === projectId && record.domain === "proposal" && await verifyResearchDecisionRecord(record)) existing.push(record);
      }
    }
  } catch { /* Replace malformed device data with verified records. */ }
  const verified: ResearchDecisionRecord[] = [];
  for (const record of records) {
    if (record.projectId !== projectId || record.domain !== "proposal" || !await verifyResearchDecisionRecord(record)) throw new Error("A proposal copilot decision record failed verification.");
    verified.push(record);
  }
  const next = [...existing, ...verified].slice(-MAX_PROPOSAL_COPILOT_DECISIONS);
  storage.setItem(proposalCopilotDecisionStorageKey(projectId), JSON.stringify(next));
  return next.length;
}
