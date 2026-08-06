import {
  createResearchArtifactIdentity,
  isResearchArtifactChecksum,
  normalizeResearchArtifactIdentity,
  normalizeResearchArtifactReference,
  verifyResearchArtifactIdentity,
  type ResearchArtifactIdentity,
  type ResearchArtifactReference,
} from "./artifactIdentity";
import type { ProposalStudyQuestion, ProposalStudyRoute } from "./proposalStudyContractPhase5";
import {
  verifyProjectEvidenceAssessment,
  verifyResearchProposalDocument,
  type EvidenceAssessmentStatus,
  type ProjectEvidenceAssessment,
  type ResearchProposalDocument,
} from "./researchProposalDocument";

export const PROPOSAL_HANDOFF_PHASE7_SCHEMA_VERSION = 1 as const;
export const PROPOSAL_HANDOFF_PHASE7_COMPILER_VERSION = "build2-phase7-v1" as const;
export const MAX_PROPOSAL_HANDOFF_RESPONSIBILITIES = 1_000;
export const MAX_PROPOSAL_HANDOFF_EVIDENCE_RECEIPTS = 500;

export type ProposalHandoffResponsibilityKind =
  | "question-uncertainty"
  | "feasibility"
  | "access"
  | "ethics-sensitivity"
  | "section-support-limit"
  | "proposal-open-question";

export type ProposalHandoffDisposition =
  | "unreviewed"
  | "carry-to-stage3"
  | "retained-proposal-limitation"
  | "not-applicable"
  | "resolve-in-stage2";

export type ProposalHandoffTarget =
  | ""
  | "select-design"
  | "map-measures"
  | "plan-participants"
  | "build-study"
  | "consent-and-rights"
  | "verify-data-analysis-contract";

export interface ProposalHandoffResponsibility {
  id: string;
  kind: ProposalHandoffResponsibilityKind;
  sourceId: string;
  sourceText: string;
  disposition: ProposalHandoffDisposition;
  stage3Target: ProposalHandoffTarget;
  rationale: string;
}

export interface ProposalHandoffQuestion {
  questionId: string;
  questionText: string;
  purpose: string;
  evidenceNeed: string;
  populationOrSource: string;
  proposedMethod: string;
  analysisDirection: string;
  uncertainty: string;
}

export interface ProposalHandoffEvidenceReceipt {
  assessmentId: string;
  sourceId: string;
  status: EvidenceAssessmentStatus;
  assessmentChecksum: string;
  evidenceSourceReference: ResearchArtifactReference;
}

export interface ProposalHandoffVerificationCheck {
  id: "pathway" | "requirements" | "evidence-review" | "synthesis" | "study-contract" | "composition" | "handoff-responsibilities";
  label: string;
  status: "passed";
}

export interface ProposalHandoffPayload {
  schemaVersion: typeof PROPOSAL_HANDOFF_PHASE7_SCHEMA_VERSION;
  compilerVersion: typeof PROPOSAL_HANDOFF_PHASE7_COMPILER_VERSION;
  projectId: string;
  revision: number;
  proposalReference: ResearchArtifactReference;
  pathwayReference: ResearchArtifactReference;
  route: ProposalStudyRoute;
  questionHandoffs: ProposalHandoffQuestion[];
  evidenceManifest: ProposalHandoffEvidenceReceipt[];
  sectionIds: string[];
  responsibilities: ProposalHandoffResponsibility[];
  verificationChecks: ProposalHandoffVerificationCheck[];
  frozenAt: string;
  participantDataIncluded: false;
  claim: "verified-stage3-input-not-factual-novelty-methodological-ethical-compliance-submission-funding-or-collection-approval";
}

export interface ProposalHandoffPackage extends ProposalHandoffPayload {
  identity: ResearchArtifactIdentity;
}

export interface ProposalHandoffIssue {
  id: string;
  severity: "blocking" | "advisory";
  lane: "pathway" | "requirements" | "evidence-review" | "synthesis" | "study-contract" | "composition" | "responsibilities" | "frozen-package";
  message: string;
  responsibilityId: string | null;
}

export interface ProposalHandoffCompilation {
  schemaVersion: typeof PROPOSAL_HANDOFF_PHASE7_SCHEMA_VERSION;
  compilerVersion: typeof PROPOSAL_HANDOFF_PHASE7_COMPILER_VERSION;
  issues: ProposalHandoffIssue[];
  readyToFreeze: boolean;
  currentPackage: boolean;
  evidenceReceiptCount: number;
  includedEvidenceCount: number;
  excludedEvidenceCount: number;
  responsibilityCount: number;
  reviewedResponsibilityCount: number;
  claim: "derived-verification-not-approval-or-certification";
}

const TOKEN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const RESPONSIBILITY_KINDS: readonly ProposalHandoffResponsibilityKind[] = ["question-uncertainty", "feasibility", "access", "ethics-sensitivity", "section-support-limit", "proposal-open-question"];
const DISPOSITIONS: readonly ProposalHandoffDisposition[] = ["unreviewed", "carry-to-stage3", "retained-proposal-limitation", "not-applicable", "resolve-in-stage2"];
const TARGETS: readonly ProposalHandoffTarget[] = ["", "select-design", "map-measures", "plan-participants", "build-study", "consent-and-rights", "verify-data-analysis-contract"];

function issue(id: string, lane: ProposalHandoffIssue["lane"], message: string, responsibilityId: string | null = null, severity: ProposalHandoffIssue["severity"] = "blocking"): ProposalHandoffIssue {
  return { id, lane, message, responsibilityId, severity };
}

function reference(identity: ResearchArtifactIdentity): ResearchArtifactReference {
  return {
    artifactKind: identity.artifactKind,
    artifactId: identity.artifactId,
    schemaVersion: identity.artifactSchemaVersion,
    checksum: identity.checksum,
  };
}

function sameReference(left: ResearchArtifactReference, right: ResearchArtifactReference): boolean {
  return left.artifactKind === right.artifactKind
    && left.artifactId === right.artifactId
    && left.schemaVersion === right.schemaVersion
    && left.checksum === right.checksum;
}

function boundedText(value: unknown, maximum: number, label: string, allowEmpty = true): string {
  if (typeof value !== "string" || value.length > maximum || (!allowEmpty && !value.trim())) throw new Error(`${label} is invalid.`);
  return value;
}

function token(value: unknown, label: string): string {
  if (typeof value !== "string" || !TOKEN_PATTERN.test(value)) throw new Error(`${label} is invalid.`);
  return value;
}

function normalizedResponsibility(item: ProposalHandoffResponsibility): ProposalHandoffResponsibility {
  return {
    id: token(item.id, "Handoff responsibility ID"),
    kind: RESPONSIBILITY_KINDS.includes(item.kind) ? item.kind : "proposal-open-question",
    sourceId: token(item.sourceId, "Handoff responsibility source ID"),
    sourceText: boundedText(item.sourceText, 20_000, "Handoff responsibility source text", false),
    disposition: DISPOSITIONS.includes(item.disposition) ? item.disposition : "unreviewed",
    stage3Target: TARGETS.includes(item.stage3Target) ? item.stage3Target : "",
    rationale: boundedText(item.rationale, 20_000, "Handoff responsibility rationale"),
  };
}

export function normalizeProposalHandoffResponsibilityList(value: unknown): ProposalHandoffResponsibility[] | null {
  try {
    if (!Array.isArray(value) || value.length > MAX_PROPOSAL_HANDOFF_RESPONSIBILITIES) return null;
    const normalized = value.map((item) => normalizedResponsibility(item as ProposalHandoffResponsibility));
    if (new Set(normalized.map((item) => item.id)).size !== normalized.length) return null;
    return normalized;
  } catch {
    return null;
  }
}

function responsibility(input: Pick<ProposalHandoffResponsibility, "id" | "kind" | "sourceId" | "sourceText">): ProposalHandoffResponsibility {
  return { ...input, disposition: "unreviewed", stage3Target: "", rationale: "" };
}

export function deriveProposalHandoffResponsibilities(proposal: ResearchProposalDocument): ProposalHandoffResponsibility[] {
  const derived: ProposalHandoffResponsibility[] = [];
  for (const entry of proposal.proposedStudyContract.entries) {
    if (entry.uncertainty.trim()) derived.push(responsibility({
      id: `question-${entry.id}`,
      kind: "question-uncertainty",
      sourceId: entry.id,
      sourceText: entry.uncertainty,
    }));
  }
  const global: Array<[string, ProposalHandoffResponsibilityKind, string]> = [
    ["global-feasibility", "feasibility", proposal.proposedStudyContract.feasibilityNotes],
    ["global-access", "access", proposal.proposedStudyContract.accessNotes],
    ["global-ethics-sensitivity", "ethics-sensitivity", proposal.proposedStudyContract.ethicsAndSensitivityNotes],
  ];
  for (const [id, kind, sourceText] of global) if (sourceText.trim()) derived.push(responsibility({ id, kind, sourceId: id, sourceText }));
  for (const section of proposal.sections) if ((section.unresolvedSupportNotes ?? "").trim()) derived.push(responsibility({
    id: `section-${section.id}`,
    kind: "section-support-limit",
    sourceId: section.id,
    sourceText: section.unresolvedSupportNotes ?? "",
  }));
  proposal.unresolvedQuestions.forEach((sourceText, index) => derived.push(responsibility({
    id: `open-question-${index + 1}`,
    kind: "proposal-open-question",
    sourceId: `unresolved-question-${index + 1}`,
    sourceText,
  })));
  return derived.slice(0, MAX_PROPOSAL_HANDOFF_RESPONSIBILITIES);
}

export function createProposalHandoffResponsibilityDraft(
  proposal: ResearchProposalDocument,
  previous: readonly ProposalHandoffResponsibility[] = [],
): ProposalHandoffResponsibility[] {
  const previousById = new Map(previous.map((item) => [item.id, item]));
  return deriveProposalHandoffResponsibilities(proposal).map((item) => {
    const prior = previousById.get(item.id);
    return prior?.sourceText === item.sourceText ? normalizedResponsibility(prior) : item;
  });
}

function evidenceManifest(assessments: readonly ProjectEvidenceAssessment[]): ProposalHandoffEvidenceReceipt[] {
  return [...assessments]
    .sort((left, right) => left.assessmentId.localeCompare(right.assessmentId))
    .map((assessment) => ({
      assessmentId: assessment.assessmentId,
      sourceId: assessment.sourceId,
      status: assessment.status,
      assessmentChecksum: assessment.identity.checksum,
      evidenceSourceReference: assessment.identity.sourceFingerprint.sources[0],
    }));
}

function packageMatchesCurrentSources(input: {
  package: ProposalHandoffPackage | null;
  proposal: ResearchProposalDocument;
  pathwayReference: ResearchArtifactReference;
  assessments: readonly ProjectEvidenceAssessment[];
}): boolean {
  if (!input.package) return false;
  if (!sameReference(input.package.proposalReference, reference(input.proposal.identity))) return false;
  if (!sameReference(input.package.pathwayReference, input.pathwayReference)) return false;
  const manifest = evidenceManifest(input.assessments);
  if (manifest.length !== input.package.evidenceManifest.length) return false;
  return manifest.every((item, index) => {
    const frozen = input.package?.evidenceManifest[index];
    return frozen?.assessmentId === item.assessmentId
      && frozen.status === item.status
      && frozen.assessmentChecksum === item.assessmentChecksum
      && sameReference(frozen.evidenceSourceReference, item.evidenceSourceReference);
  });
}

export function compileProposalHandoff(input: {
  proposal: ResearchProposalDocument;
  pathwayReference: ResearchArtifactReference;
  assessments: readonly ProjectEvidenceAssessment[];
  responsibilities: readonly ProposalHandoffResponsibility[];
  currentPackage?: ProposalHandoffPackage | null;
  pathwayReady: boolean;
  requirementsReady: boolean;
  evidenceReviewReady: boolean;
  synthesisReady: boolean;
  studyContractReady: boolean;
  compositionReady: boolean;
  evidenceConflictCount?: number;
}): ProposalHandoffCompilation {
  const issues: ProposalHandoffIssue[] = [];
  const proposalSources = input.proposal.identity.sourceFingerprint.sources;
  if (!input.pathwayReady || !proposalSources.some((source) => sameReference(source, input.pathwayReference))) issues.push(issue("pathway-not-current", "pathway", "The proposal is not bound to the current ready Stage 1 pathway revision."));
  if (!input.requirementsReady) issues.push(issue("requirements-not-ready", "requirements", "Reconfirm the current requirements profile and resolve authority drift."));
  if (!input.evidenceReviewReady || (input.evidenceConflictCount ?? 0) > 0) issues.push(issue("evidence-review-not-ready", "evidence-review", "Resolve every evidence decision and device/secure review conflict."));
  if (!input.synthesisReady) issues.push(issue("synthesis-not-ready", "synthesis", "Resolve the current claim, evidence, gap, and limitation map."));
  if (!input.studyContractReady) issues.push(issue("study-contract-not-ready", "study-contract", "Complete the current question-level Proposed Study Contract."));
  if (!input.compositionReady) issues.push(issue("composition-not-ready", "composition", "Complete and review all six source-linked proposal sections."));
  if (input.assessments.length > MAX_PROPOSAL_HANDOFF_EVIDENCE_RECEIPTS) issues.push(issue("evidence-manifest-limit", "evidence-review", "The evidence review manifest exceeds the Phase 7 package limit."));

  const expected = deriveProposalHandoffResponsibilities(input.proposal);
  const expectedById = new Map(expected.map((item) => [item.id, item]));
  const responsibilityIds = new Set<string>();
  for (const item of input.responsibilities) {
    if (responsibilityIds.has(item.id)) issues.push(issue(`duplicate-responsibility-${item.id}`, "responsibilities", "A Stage 3 responsibility appears more than once.", item.id));
    responsibilityIds.add(item.id);
    const source = expectedById.get(item.id);
    if (!source || source.sourceText !== item.sourceText || source.kind !== item.kind || source.sourceId !== item.sourceId) {
      issues.push(issue(`stale-responsibility-${item.id}`, "responsibilities", "This responsibility no longer matches the current proposal source.", item.id));
      continue;
    }
    if (item.disposition === "unreviewed") issues.push(issue(`unreviewed-responsibility-${item.id}`, "responsibilities", "Review and disposition this Stage 3 responsibility.", item.id));
    if (item.disposition === "resolve-in-stage2") issues.push(issue(`resolve-upstream-${item.id}`, "responsibilities", "Resolve this item in Stage 2; freezing it as a Stage 3 input would preserve a contradiction.", item.id));
    if (item.disposition === "carry-to-stage3" && !item.stage3Target) issues.push(issue(`missing-target-${item.id}`, "responsibilities", "Choose the Stage 3 product that owns this carried responsibility.", item.id));
    if (item.disposition !== "unreviewed" && item.disposition !== "resolve-in-stage2" && item.rationale.trim().length < 10) issues.push(issue(`missing-rationale-${item.id}`, "responsibilities", "Record a concrete rationale for this disposition.", item.id));
    if (item.disposition === "retained-proposal-limitation" && !["section-support-limit", "proposal-open-question"].includes(item.kind)) issues.push(issue(`invalid-limitation-${item.id}`, "responsibilities", "Only proposal support limits or open questions may be retained as proposal limitations.", item.id));
  }
  for (const item of expected) if (!responsibilityIds.has(item.id)) issues.push(issue(`missing-responsibility-${item.id}`, "responsibilities", "A current proposal responsibility is missing from the handoff ledger.", item.id));

  const currentPackage = packageMatchesCurrentSources({ package: input.currentPackage ?? null, proposal: input.proposal, pathwayReference: input.pathwayReference, assessments: input.assessments });
  const currentPackageMatchesDraft = currentPackage && JSON.stringify(input.currentPackage?.responsibilities) === JSON.stringify(input.responsibilities);
  if (input.currentPackage && !currentPackage) issues.push(issue("frozen-package-stale", "frozen-package", "The existing Stage 3 handoff is stale because a bound proposal, pathway, or evidence review checksum changed.", null, "advisory"));
  if (currentPackage && !currentPackageMatchesDraft) issues.push(issue("frozen-package-draft-differs", "frozen-package", "The current handoff remains preserved, but the edited responsibility draft requires a new freeze before it can replace that baseline.", null, "advisory"));
  const readyToFreeze = !issues.some((item) => item.severity === "blocking");
  return {
    schemaVersion: PROPOSAL_HANDOFF_PHASE7_SCHEMA_VERSION,
    compilerVersion: PROPOSAL_HANDOFF_PHASE7_COMPILER_VERSION,
    issues,
    readyToFreeze,
    currentPackage: currentPackageMatchesDraft && readyToFreeze,
    evidenceReceiptCount: input.assessments.length,
    includedEvidenceCount: input.assessments.filter((item) => item.status === "included").length,
    excludedEvidenceCount: input.assessments.filter((item) => item.status === "excluded").length,
    responsibilityCount: expected.length,
    reviewedResponsibilityCount: input.responsibilities.filter((item) => !["unreviewed", "resolve-in-stage2"].includes(item.disposition)).length,
    claim: "derived-verification-not-approval-or-certification",
  };
}

function questionHandoffs(proposal: ResearchProposalDocument, questions: readonly ProposalStudyQuestion[]): ProposalHandoffQuestion[] {
  const questionById = new Map(questions.map((item) => [item.id, item]));
  return proposal.proposedStudyContract.entries.map((entry) => ({
    questionId: entry.questionId,
    questionText: questionById.get(entry.questionId)?.text ?? entry.questionId,
    purpose: entry.purpose,
    evidenceNeed: entry.evidenceNeed,
    populationOrSource: entry.populationOrSource,
    proposedMethod: entry.proposedMethod,
    analysisDirection: entry.analysisDirection,
    uncertainty: entry.uncertainty,
  }));
}

const VERIFICATION_CHECKS: ProposalHandoffVerificationCheck[] = [
  { id: "pathway", label: "Current Stage 1 pathway", status: "passed" },
  { id: "requirements", label: "Selected requirements profile", status: "passed" },
  { id: "evidence-review", label: "Project-specific evidence review", status: "passed" },
  { id: "synthesis", label: "Claim–evidence synthesis and bounded gap", status: "passed" },
  { id: "study-contract", label: "Proposed Study Contract", status: "passed" },
  { id: "composition", label: "Six-section source-linked proposal", status: "passed" },
  { id: "handoff-responsibilities", label: "Explicit Stage 3 responsibility ledger", status: "passed" },
];

export async function createProposalHandoffPackage(input: {
  proposal: ResearchProposalDocument;
  pathwayReference: ResearchArtifactReference;
  assessments: readonly ProjectEvidenceAssessment[];
  questions: readonly ProposalStudyQuestion[];
  route: ProposalStudyRoute;
  responsibilities: readonly ProposalHandoffResponsibility[];
  compilation: ProposalHandoffCompilation;
  previous?: ProposalHandoffPackage | null;
  now?: string;
}): Promise<ProposalHandoffPackage> {
  if (!input.compilation.readyToFreeze) throw new Error("The proposal handoff still has blocking verification issues.");
  if (!await verifyResearchProposalDocument(input.proposal)) throw new Error("The proposal checksum is invalid.");
  if (input.assessments.length > MAX_PROPOSAL_HANDOFF_EVIDENCE_RECEIPTS) throw new Error("The evidence manifest exceeds the handoff limit.");
  if ((await Promise.all(input.assessments.map(verifyProjectEvidenceAssessment))).some((valid) => !valid)) throw new Error("An evidence assessment checksum is invalid.");
  const normalizedPathway = normalizeResearchArtifactReference(input.pathwayReference);
  if (!normalizedPathway || normalizedPathway.artifactKind !== "research-pathway") throw new Error("The pathway reference is invalid.");
  const responsibilities = input.responsibilities.map(normalizedResponsibility);
  const current = compileProposalHandoff({
    proposal: input.proposal,
    pathwayReference: normalizedPathway,
    assessments: input.assessments,
    responsibilities,
    pathwayReady: true,
    requirementsReady: true,
    evidenceReviewReady: true,
    synthesisReady: true,
    studyContractReady: true,
    compositionReady: true,
  });
  if (!current.readyToFreeze) throw new Error("The handoff responsibility ledger changed before freezing.");
  const frozenAt = new Date(input.now ?? Date.now()).toISOString();
  const projectId = token(input.proposal.projectId, "Handoff project ID");
  const payload: ProposalHandoffPayload = {
    schemaVersion: PROPOSAL_HANDOFF_PHASE7_SCHEMA_VERSION,
    compilerVersion: PROPOSAL_HANDOFF_PHASE7_COMPILER_VERSION,
    projectId,
    revision: (input.previous?.revision ?? 0) + 1,
    proposalReference: reference(input.proposal.identity),
    pathwayReference: normalizedPathway,
    route: { ...input.route, possibleSpecialProcedures: [...input.route.possibleSpecialProcedures] },
    questionHandoffs: questionHandoffs(input.proposal, input.questions),
    evidenceManifest: evidenceManifest(input.assessments),
    sectionIds: input.proposal.sections.map((section) => section.id),
    responsibilities,
    verificationChecks: VERIFICATION_CHECKS.map((item) => ({ ...item })),
    frozenAt,
    participantDataIncluded: false,
    claim: "verified-stage3-input-not-factual-novelty-methodological-ethical-compliance-submission-funding-or-collection-approval",
  };
  validateProposalHandoffPayload(payload);
  return {
    ...payload,
    identity: await createResearchArtifactIdentity({
      artifactKind: "proposal-handoff",
      artifactId: `proposal-handoff-${projectId}`,
      artifactSchemaVersion: PROPOSAL_HANDOFF_PHASE7_SCHEMA_VERSION,
      payload,
      sources: [payload.proposalReference, payload.pathwayReference],
      limits: { maximumBytes: 2 * 1024 * 1024, maximumNodes: 50_000 },
    }),
  };
}

function validateProposalHandoffPayload(payload: ProposalHandoffPayload): void {
  if (payload.schemaVersion !== PROPOSAL_HANDOFF_PHASE7_SCHEMA_VERSION || payload.compilerVersion !== PROPOSAL_HANDOFF_PHASE7_COMPILER_VERSION) throw new Error("Proposal handoff schema is unsupported.");
  token(payload.projectId, "Handoff project ID");
  if (!Number.isSafeInteger(payload.revision) || payload.revision < 1) throw new Error("Proposal handoff revision is invalid.");
  if (normalizeResearchArtifactReference(payload.proposalReference)?.artifactKind !== "research-proposal") throw new Error("Proposal handoff proposal reference is invalid.");
  if (normalizeResearchArtifactReference(payload.pathwayReference)?.artifactKind !== "research-pathway") throw new Error("Proposal handoff pathway reference is invalid.");
  if (!Array.isArray(payload.questionHandoffs) || payload.questionHandoffs.length > 1_000) throw new Error("Proposal handoff question list is invalid.");
  for (const item of payload.questionHandoffs) {
    token(item.questionId, "Handoff question ID");
    for (const [key, value] of Object.entries(item)) if (key !== "questionId") boundedText(value, 20_000, `Handoff question ${key}`, false);
  }
  if (!Array.isArray(payload.evidenceManifest) || payload.evidenceManifest.length > MAX_PROPOSAL_HANDOFF_EVIDENCE_RECEIPTS) throw new Error("Proposal handoff evidence manifest is invalid.");
  const assessmentIds = new Set<string>();
  for (const receipt of payload.evidenceManifest) {
    const id = token(receipt.assessmentId, "Handoff assessment ID");
    if (assessmentIds.has(id)) throw new Error("Proposal handoff assessment is duplicated.");
    assessmentIds.add(id);
    token(receipt.sourceId, "Handoff evidence source ID");
    if (!isResearchArtifactChecksum(receipt.assessmentChecksum) || !normalizeResearchArtifactReference(receipt.evidenceSourceReference)) throw new Error("Proposal handoff evidence receipt is invalid.");
  }
  if (!Array.isArray(payload.responsibilities) || payload.responsibilities.length > MAX_PROPOSAL_HANDOFF_RESPONSIBILITIES) throw new Error("Proposal handoff responsibility list is invalid.");
  const responsibilityIds = new Set<string>();
  for (const responsibilityItem of payload.responsibilities) {
    const normalized = normalizedResponsibility(responsibilityItem);
    if (responsibilityIds.has(normalized.id) || normalized.disposition === "unreviewed" || normalized.disposition === "resolve-in-stage2") throw new Error("Proposal handoff responsibility is not frozen-ready.");
    responsibilityIds.add(normalized.id);
    if (normalized.disposition === "carry-to-stage3" && !normalized.stage3Target) throw new Error("Proposal handoff carried responsibility has no target.");
    if (normalized.rationale.trim().length < 10) throw new Error("Proposal handoff responsibility rationale is incomplete.");
  }
  if (new Set(payload.sectionIds.map((id) => token(id, "Handoff section ID"))).size !== payload.sectionIds.length) throw new Error("Proposal handoff section identity is invalid.");
  if (payload.verificationChecks.length !== VERIFICATION_CHECKS.length || payload.verificationChecks.some((item, index) => item.id !== VERIFICATION_CHECKS[index].id || item.status !== "passed")) throw new Error("Proposal handoff verification receipt is invalid.");
  if (!Number.isFinite(Date.parse(payload.frozenAt))) throw new Error("Proposal handoff freeze time is invalid.");
  if (payload.participantDataIncluded !== false || payload.claim !== "verified-stage3-input-not-factual-novelty-methodological-ethical-compliance-submission-funding-or-collection-approval") throw new Error("Proposal handoff safety boundary is invalid.");
}

export async function verifyProposalHandoffPackage(packageValue: ProposalHandoffPackage): Promise<boolean> {
  try {
    const { identity, ...payload } = packageValue;
    validateProposalHandoffPayload(payload);
    return identity.artifactKind === "proposal-handoff"
      && identity.artifactId === `proposal-handoff-${payload.projectId}`
      && identity.artifactSchemaVersion === PROPOSAL_HANDOFF_PHASE7_SCHEMA_VERSION
      && identity.sourceFingerprint.sources.length === 2
      && identity.sourceFingerprint.sources.some((source) => sameReference(source, payload.proposalReference))
      && identity.sourceFingerprint.sources.some((source) => sameReference(source, payload.pathwayReference))
      && await verifyResearchArtifactIdentity(identity, payload, { maximumBytes: 2 * 1024 * 1024, maximumNodes: 50_000 });
  } catch {
    return false;
  }
}

export async function normalizeProposalHandoffPackage(value: unknown, projectId: string): Promise<ProposalHandoffPackage | null> {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const candidate = value as Record<string, unknown>;
    if (candidate.projectId !== projectId) return null;
    const identity = normalizeResearchArtifactIdentity(candidate.identity);
    if (!identity) return null;
    const packageValue = { ...candidate, identity } as unknown as ProposalHandoffPackage;
    return await verifyProposalHandoffPackage(packageValue) ? packageValue : null;
  } catch {
    return null;
  }
}

export async function proposalHandoffIsCurrent(input: {
  package: ProposalHandoffPackage | null;
  proposal: ResearchProposalDocument;
  pathwayReference: ResearchArtifactReference;
  assessments: readonly ProjectEvidenceAssessment[];
}): Promise<boolean> {
  return Boolean(input.package)
    && await verifyProposalHandoffPackage(input.package as ProposalHandoffPackage)
    && packageMatchesCurrentSources(input);
}
