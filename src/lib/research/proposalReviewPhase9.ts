import {
  createResearchArtifactIdentity,
  isResearchArtifactChecksum,
  normalizeResearchArtifactIdentity,
  normalizeResearchArtifactReference,
  sha256ArtifactChecksum,
  verifyResearchArtifactIdentity,
  type ResearchArtifactChecksum,
  type ResearchArtifactIdentity,
  type ResearchArtifactReference,
} from "./artifactIdentity";
import {
  createResearchKnowledgeEntry,
  verifyResearchKnowledgeEntry,
  type ResearchKnowledgeEntry,
} from "./livingResearchRecord";
import {
  verifyProposalHandoffPackage,
  type ProposalHandoffPackage,
} from "./proposalHandoffPhase7";
import {
  verifyProjectEvidenceAssessment,
  verifyResearchProposalDocument,
  type ProjectEvidenceAssessment,
  type ResearchProposalDocument,
} from "./researchProposalDocument";

export const PROPOSAL_REVIEW_PHASE9_SCHEMA_VERSION = 1 as const;
export const PROPOSAL_REVIEW_PHASE9_COMPILER_VERSION = "build2-phase9-v1" as const;
export const MAX_PROPOSAL_EXTERNAL_REVIEW_RECEIPTS = 25;
export const MAX_PROPOSAL_REVIEW_EXPORT_BYTES = 24 * 1024 * 1024;

export type ProposalResearcherRole =
  | "principal-investigator"
  | "student-researcher"
  | "research-team-member"
  | "independent-researcher";

export type ProposalExternalReviewKind = "advisor" | "funder" | "supervisor" | "peer" | "other";
export type ProposalExternalReviewOutcome = "comments-recorded" | "changes-requested" | "no-changes-requested";

export interface ProposalResearcherReviewDraft {
  reviewerRole: ProposalResearcherRole;
  reviewStatement: string;
}

export interface ProposalResearcherReviewRecord extends ProposalResearcherReviewDraft {
  reviewedAt: string;
  reviewedHandoffReference: ResearchArtifactReference;
  claim: "researcher-review-record-not-institutional-ethics-legal-methodological-funder-or-publication-approval";
}

export interface ProposalExternalReviewAttachmentReceipt {
  filename: string;
  mediaType: "application/pdf" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document" | "text/plain";
  sizeBytes: number;
  checksum: ResearchArtifactChecksum;
  fileBytesStored: false;
}

export interface ProposalExternalReviewReceiptDraft {
  id: string;
  kind: ProposalExternalReviewKind;
  reviewerLabel: string;
  organization: string;
  outcome: ProposalExternalReviewOutcome;
  summary: string;
  reviewedAt: string;
  attachment: ProposalExternalReviewAttachmentReceipt | null;
}

export interface ProposalExternalReviewReceipt extends ProposalExternalReviewReceiptDraft {
  reviewedHandoffReference: ResearchArtifactReference;
  checksum: ResearchArtifactChecksum;
  claim: "external-advisory-review-receipt-not-institutional-ethics-legal-methodological-funder-or-publication-approval";
}

export interface ProposalReviewTraceabilityRow {
  questionId: string;
  questionText: string;
  gapClaimIds: string[];
  studyContractEntryId: string;
  proposedMethod: string;
  analysisDirection: string;
}

export interface ProposalReviewRiskReceipt {
  responsibilityId: string;
  disposition: ProposalHandoffPackage["responsibilities"][number]["disposition"];
  stage3Target: ProposalHandoffPackage["responsibilities"][number]["stage3Target"];
  rationale: string;
}

export interface ProposalReviewIntegrityCheck {
  id:
    | "handoff-integrity"
    | "proposal-integrity"
    | "claim-evidence-reference-consistency"
    | "question-gap-method-traceability"
    | "route-requirement-profile"
    | "open-risk-ledger"
    | "researcher-review";
  label: string;
  status: "passed" | "blocked";
  detail: string;
}

export interface ProposalReviewIssue {
  id: string;
  lane: ProposalReviewIntegrityCheck["id"];
  message: string;
}

export interface ProposalReviewCompilation {
  schemaVersion: typeof PROPOSAL_REVIEW_PHASE9_SCHEMA_VERSION;
  compilerVersion: typeof PROPOSAL_REVIEW_PHASE9_COMPILER_VERSION;
  checks: ProposalReviewIntegrityCheck[];
  issues: ProposalReviewIssue[];
  traceability: ProposalReviewTraceabilityRow[];
  riskLedger: ProposalReviewRiskReceipt[];
  readyToFreeze: boolean;
  currentBaseline: boolean;
  claim: "derived-proposal-review-readiness-not-approval-certification-or-authorization";
}

export interface ReviewedProposalBaselinePayload {
  schemaVersion: typeof PROPOSAL_REVIEW_PHASE9_SCHEMA_VERSION;
  compilerVersion: typeof PROPOSAL_REVIEW_PHASE9_COMPILER_VERSION;
  projectId: string;
  revision: number;
  handoffReference: ResearchArtifactReference;
  proposalReference: ResearchArtifactReference;
  proposalRevision: number;
  integrityChecks: Array<ProposalReviewIntegrityCheck & { status: "passed" }>;
  traceability: ProposalReviewTraceabilityRow[];
  riskLedger: ProposalReviewRiskReceipt[];
  researcherReview: ProposalResearcherReviewRecord;
  externalReviewReceipts: ProposalExternalReviewReceipt[];
  livingResearchEntryChecksums: ResearchArtifactChecksum[];
  frozenAt: string;
  participantDataIncluded: false;
  claim: "reviewed-proposal-baseline-not-factual-novelty-methodological-ethical-legal-compliance-submission-funding-publication-or-collection-approval";
}

export interface ReviewedProposalBaselinePackage extends ReviewedProposalBaselinePayload {
  identity: ResearchArtifactIdentity;
}

export interface ProposalReviewExportPayload {
  schemaVersion: typeof PROPOSAL_REVIEW_PHASE9_SCHEMA_VERSION;
  projectId: string;
  reviewedBaseline: ReviewedProposalBaselinePackage;
  proposal: ResearchProposalDocument;
  evidenceManifest: ProjectEvidenceAssessment[];
  livingResearchEntries: ResearchKnowledgeEntry[];
  exportedAt: string;
  participantDataIncluded: false;
  sourceFilesIncluded: false;
  claim: "portable-proposal-review-export-not-submission-package-approval-certification-or-authorization";
}

export interface ProposalReviewExportBundle extends ProposalReviewExportPayload {
  bundleChecksum: ResearchArtifactChecksum;
}

const TOKEN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const ROLES: readonly ProposalResearcherRole[] = ["principal-investigator", "student-researcher", "research-team-member", "independent-researcher"];
const EXTERNAL_KINDS: readonly ProposalExternalReviewKind[] = ["advisor", "funder", "supervisor", "peer", "other"];
const EXTERNAL_OUTCOMES: readonly ProposalExternalReviewOutcome[] = ["comments-recorded", "changes-requested", "no-changes-requested"];
const ATTACHMENT_MEDIA_TYPES: readonly ProposalExternalReviewAttachmentReceipt["mediaType"][] = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];

function token(value: unknown, label: string): string {
  if (typeof value !== "string" || !TOKEN_PATTERN.test(value)) throw new Error(`${label} is invalid.`);
  return value;
}

function bounded(value: unknown, maximum: number, label: string, minimum = 0): string {
  if (typeof value !== "string" || value.length > maximum || value.trim().length < minimum) throw new Error(`${label} is invalid.`);
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
}

function iso(value: unknown, label: string): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new Error(`${label} is invalid.`);
  return new Date(value).toISOString();
}

function reference(identity: ResearchArtifactIdentity): ResearchArtifactReference {
  return { artifactKind: identity.artifactKind, artifactId: identity.artifactId, schemaVersion: identity.artifactSchemaVersion, checksum: identity.checksum };
}

function sameReference(left: ResearchArtifactReference, right: ResearchArtifactReference): boolean {
  return left.artifactKind === right.artifactKind
    && left.artifactId === right.artifactId
    && left.schemaVersion === right.schemaVersion
    && left.checksum === right.checksum;
}

function issue(id: string, lane: ProposalReviewIssue["lane"], message: string): ProposalReviewIssue {
  return { id, lane, message };
}

function externalReceiptPayload(receipt: Omit<ProposalExternalReviewReceipt, "checksum">) {
  return receipt;
}

function normalizeAttachment(value: ProposalExternalReviewAttachmentReceipt | null): ProposalExternalReviewAttachmentReceipt | null {
  if (value === null) return null;
  const filename = bounded(value.filename, 240, "External review attachment filename", 1);
  if (!ATTACHMENT_MEDIA_TYPES.includes(value.mediaType)) throw new Error("External review attachment type is invalid.");
  if (!Number.isSafeInteger(value.sizeBytes) || value.sizeBytes < 1 || value.sizeBytes > 10 * 1024 * 1024) throw new Error("External review attachment size is invalid.");
  if (!isResearchArtifactChecksum(value.checksum) || value.fileBytesStored !== false) throw new Error("External review attachment receipt is invalid.");
  return { filename, mediaType: value.mediaType, sizeBytes: value.sizeBytes, checksum: value.checksum, fileBytesStored: false };
}

function normalizeResearcherReviewDraft(value: ProposalResearcherReviewDraft): ProposalResearcherReviewDraft {
  if (!ROLES.includes(value.reviewerRole)) throw new Error("Researcher review role is invalid.");
  return { reviewerRole: value.reviewerRole, reviewStatement: bounded(value.reviewStatement, 4_000, "Researcher review statement", 20) };
}

function normalizeExternalDraft(value: ProposalExternalReviewReceiptDraft): ProposalExternalReviewReceiptDraft {
  if (!EXTERNAL_KINDS.includes(value.kind) || !EXTERNAL_OUTCOMES.includes(value.outcome)) throw new Error("External review receipt kind or outcome is invalid.");
  return {
    id: token(value.id, "External review receipt ID"),
    kind: value.kind,
    reviewerLabel: bounded(value.reviewerLabel, 240, "External reviewer label", 1),
    organization: bounded(value.organization, 500, "External review organization"),
    outcome: value.outcome,
    summary: bounded(value.summary, 4_000, "External review summary", 10),
    reviewedAt: iso(value.reviewedAt, "External review date"),
    attachment: normalizeAttachment(value.attachment),
  };
}

export async function createProposalExternalReviewReceipt(
  draft: ProposalExternalReviewReceiptDraft,
  handoff: ProposalHandoffPackage,
): Promise<ProposalExternalReviewReceipt> {
  if (!await verifyProposalHandoffPackage(handoff)) throw new Error("External review must bind to a valid proposal handoff.");
  const normalized = normalizeExternalDraft(draft);
  const core: Omit<ProposalExternalReviewReceipt, "checksum"> = {
    ...normalized,
    reviewedHandoffReference: reference(handoff.identity),
    claim: "external-advisory-review-receipt-not-institutional-ethics-legal-methodological-funder-or-publication-approval",
  };
  return { ...core, checksum: await sha256ArtifactChecksum(externalReceiptPayload(core), { maximumBytes: 64 * 1024 }) };
}

export async function verifyProposalExternalReviewReceipt(receipt: ProposalExternalReviewReceipt): Promise<boolean> {
  try {
    const { checksum, ...core } = receipt;
    normalizeExternalDraft(core);
    if (!normalizeResearchArtifactReference(core.reviewedHandoffReference) || core.reviewedHandoffReference.artifactKind !== "proposal-handoff") return false;
    return core.claim === "external-advisory-review-receipt-not-institutional-ethics-legal-methodological-funder-or-publication-approval"
      && isResearchArtifactChecksum(checksum)
      && checksum === await sha256ArtifactChecksum(externalReceiptPayload(core), { maximumBytes: 64 * 1024 });
  } catch {
    return false;
  }
}

function deriveTraceability(proposal: ResearchProposalDocument, handoff: ProposalHandoffPackage): { rows: ProposalReviewTraceabilityRow[]; issues: ProposalReviewIssue[] } {
  const issues: ProposalReviewIssue[] = [];
  const rows = handoff.questionHandoffs.map((question) => {
    const gaps = proposal.claimEvidenceMap.claims.filter((claim) => claim.kind === "gap" && claim.status !== "draft" && claim.questionIds.includes(question.questionId));
    const contracts = proposal.proposedStudyContract.entries.filter((entry) => entry.questionId === question.questionId);
    if (gaps.length === 0) issues.push(issue(`missing-gap-${question.questionId}`, "question-gap-method-traceability", `Research question ${question.questionId} has no current reviewed gap claim.`));
    if (contracts.length !== 1) issues.push(issue(`contract-count-${question.questionId}`, "question-gap-method-traceability", `Research question ${question.questionId} must map to exactly one Proposed Study Contract entry.`));
    const contract = contracts[0];
    if (!contract?.proposedMethod.trim() || !contract.analysisDirection.trim()) issues.push(issue(`method-analysis-${question.questionId}`, "question-gap-method-traceability", `Research question ${question.questionId} needs both a proposed method and analysis direction.`));
    return {
      questionId: question.questionId,
      questionText: question.questionText,
      gapClaimIds: gaps.map((claim) => claim.id).sort(),
      studyContractEntryId: contract?.id ?? "missing",
      proposedMethod: contract?.proposedMethod ?? "",
      analysisDirection: contract?.analysisDirection ?? "",
    };
  });
  return { rows, issues };
}

function claimEvidenceReferenceIssues(proposal: ResearchProposalDocument, handoff: ProposalHandoffPackage): ProposalReviewIssue[] {
  const issues: ProposalReviewIssue[] = [];
  const manifestIds = new Set(handoff.evidenceManifest.map((item) => item.assessmentId));
  const claimIds = new Set(proposal.claimEvidenceMap.claims.map((claim) => claim.id));
  const contractIds = new Set(proposal.proposedStudyContract.entries.map((entry) => entry.id));
  const usedNarrativeEvidence = new Set<string>();
  const references = proposal.sections.find((section) => section.id === "proposal_references" || section.role === "proposal_references");
  for (const claim of proposal.claimEvidenceMap.claims) {
    for (const assessmentId of claim.evidenceAssessmentIds) if (!manifestIds.has(assessmentId)) issues.push(issue(`claim-evidence-${claim.id}-${assessmentId}`, "claim-evidence-reference-consistency", `Claim ${claim.id} references evidence that is absent from the frozen manifest.`));
  }
  for (const section of proposal.sections) {
    for (const claimId of section.sourceClaimIds ?? []) if (!claimIds.has(claimId)) issues.push(issue(`section-claim-${section.id}-${claimId}`, "claim-evidence-reference-consistency", `Section ${section.id} references an unknown claim.`));
    for (const assessmentId of section.sourceEvidenceAssessmentIds ?? []) {
      if (!manifestIds.has(assessmentId)) issues.push(issue(`section-evidence-${section.id}-${assessmentId}`, "claim-evidence-reference-consistency", `Section ${section.id} references evidence that is absent from the frozen manifest.`));
      if (section.id !== "proposal_references" && section.role !== "proposal_references") usedNarrativeEvidence.add(assessmentId);
    }
    for (const contractId of section.sourceContractEntryIds ?? []) if (!contractIds.has(contractId)) issues.push(issue(`section-contract-${section.id}-${contractId}`, "claim-evidence-reference-consistency", `Section ${section.id} references an unknown study-contract entry.`));
  }
  const referenceEvidence = new Set(references?.sourceEvidenceAssessmentIds ?? []);
  for (const assessmentId of usedNarrativeEvidence) if (!referenceEvidence.has(assessmentId)) issues.push(issue(`reference-coverage-${assessmentId}`, "claim-evidence-reference-consistency", `Narrative evidence ${assessmentId} is absent from the References provenance.`));
  if (usedNarrativeEvidence.size > 0 && new Set(references?.citationKeys ?? []).size < usedNarrativeEvidence.size) issues.push(issue("citation-key-coverage", "claim-evidence-reference-consistency", "The References section needs an inspectable citation key for every evidence source used in narrative sections."));
  return issues;
}

export function reviewedProposalBaselineIsCurrent(
  baseline: ReviewedProposalBaselinePackage | null,
  handoff: ProposalHandoffPackage | null,
): boolean {
  return Boolean(baseline && handoff)
    && sameReference((baseline as ReviewedProposalBaselinePackage).handoffReference, reference((handoff as ProposalHandoffPackage).identity))
    && sameReference((baseline as ReviewedProposalBaselinePackage).proposalReference, (handoff as ProposalHandoffPackage).proposalReference);
}

export function compileProposalReview(input: {
  proposal: ResearchProposalDocument;
  handoff: ProposalHandoffPackage | null;
  handoffCurrent: boolean;
  researcherReview: ProposalResearcherReviewDraft;
  currentBaseline?: ReviewedProposalBaselinePackage | null;
}): ProposalReviewCompilation {
  const issues: ProposalReviewIssue[] = [];
  const handoff = input.handoff;
  if (!handoff || !input.handoffCurrent || handoff.proposalReference.checksum !== input.proposal.identity.checksum) issues.push(issue("handoff-not-current", "handoff-integrity", "Freeze the current deterministic Stage 3 handoff before creating a reviewed baseline."));
  if (input.proposal.identity.artifactKind !== "research-proposal") issues.push(issue("proposal-kind", "proposal-integrity", "The current proposal identity is invalid."));
  if (handoff && (handoff.route.intent !== input.proposal.requirements.route.intent || handoff.route.methodFamily !== input.proposal.requirements.route.methodFamily)) issues.push(issue("route-profile-drift", "route-requirement-profile", "The proposal requirements profile and frozen handoff route no longer match."));
  if (input.proposal.requirements.researcherConfirmed !== true) issues.push(issue("requirements-unconfirmed", "route-requirement-profile", "Review and confirm the current proposal requirements profile."));
  if (handoff) issues.push(...claimEvidenceReferenceIssues(input.proposal, handoff));
  const traceability = handoff ? deriveTraceability(input.proposal, handoff) : { rows: [], issues: [] };
  issues.push(...traceability.issues);
  const riskLedger = handoff?.responsibilities.map((item) => ({ responsibilityId: item.id, disposition: item.disposition, stage3Target: item.stage3Target, rationale: item.rationale })) ?? [];
  if (handoff && handoff.responsibilities.some((item) => item.disposition === "unreviewed" || item.disposition === "resolve-in-stage2")) issues.push(issue("open-risk-disposition", "open-risk-ledger", "Every current risk or uncertainty must be dispositioned before review."));
  try { normalizeResearcherReviewDraft(input.researcherReview); } catch { issues.push(issue("researcher-review-required", "researcher-review", "Record your role and a concrete review statement before freezing the reviewed baseline.")); }
  const checkDefinitions: Array<[ProposalReviewIntegrityCheck["id"], string, string]> = [
    ["handoff-integrity", "Current checksum-bound handoff", "The exact technical handoff and proposal revision are current."],
    ["proposal-integrity", "Proposal identity", "The canonical proposal identity is present for verification."],
    ["claim-evidence-reference-consistency", "Claim, evidence, citation, and reference closure", "Every recorded link resolves inside the frozen proposal and evidence manifest."],
    ["question-gap-method-traceability", "RQ → gap → proposed method", "Every research question maps to a reviewed gap and one proposed method contract."],
    ["route-requirement-profile", "Route and requirements profile", "The selected route and researcher-confirmed requirements remain aligned."],
    ["open-risk-ledger", "Open risk and uncertainty ledger", "Current limitations and Stage 3 responsibilities have explicit dispositions."],
    ["researcher-review", "Researcher review record", "The researcher recorded a bounded, checksum-specific review statement."],
  ];
  const checks = checkDefinitions.map(([id, label, detail]) => ({ id, label, detail, status: issues.some((item) => item.lane === id) ? "blocked" as const : "passed" as const }));
  const readyToFreeze = issues.length === 0;
  return {
    schemaVersion: PROPOSAL_REVIEW_PHASE9_SCHEMA_VERSION,
    compilerVersion: PROPOSAL_REVIEW_PHASE9_COMPILER_VERSION,
    checks,
    issues,
    traceability: traceability.rows,
    riskLedger,
    readyToFreeze,
    currentBaseline: readyToFreeze && reviewedProposalBaselineIsCurrent(input.currentBaseline ?? null, handoff),
    claim: "derived-proposal-review-readiness-not-approval-certification-or-authorization",
  };
}

export async function compileStage2KnowledgeEntries(input: {
  proposal: ResearchProposalDocument;
  handoff: ProposalHandoffPackage;
  createdAt: string;
}): Promise<ResearchKnowledgeEntry[]> {
  const source = reference(input.handoff.identity);
  const suffix = input.handoff.identity.checksum.slice(7, 19);
  const gaps = input.proposal.claimEvidenceMap.claims.filter((claim) => claim.kind === "gap").map((claim) => claim.text);
  const methods = input.proposal.proposedStudyContract.entries.map((entry) => `${entry.questionId}: ${entry.proposedMethod}; ${entry.analysisDirection}`);
  const limitations = input.handoff.responsibilities.filter((item) => item.disposition === "retained-proposal-limitation").map((item) => item.sourceText);
  const common = { projectId: input.proposal.projectId, stage: 2 as const, stepId: "stage-02-verify-proposal", timing: "planned" as const, author: "system-derived" as const, sourceReferences: [source], createdAt: input.createdAt };
  return Promise.all([
    createResearchKnowledgeEntry({ ...common, id: `stage2-${suffix}-research-direction`, kind: "decision", title: "Reviewed proposal research direction", body: input.handoff.questionHandoffs.map((question) => `${question.questionId}: ${question.questionText}`).join("\n"), manuscriptTargets: ["introduction", "methods"] }),
    createResearchKnowledgeEntry({ ...common, id: `stage2-${suffix}-evidence-gap-boundary`, kind: "evidence", title: "Reviewed evidence and gap boundary", body: gaps.length ? gaps.join("\n") : "No gap claim was recorded.", manuscriptTargets: ["introduction", "literature-review", "discussion"] }),
    createResearchKnowledgeEntry({ ...common, id: `stage2-${suffix}-planned-method-limits`, kind: limitations.length ? "limitation" : "method-detail", title: "Proposed method and carried boundaries", body: [...methods, ...limitations.map((item) => `Limitation: ${item}`)].join("\n"), manuscriptTargets: ["methods", "discussion", "supplement"] }),
  ]);
}

export async function createReviewedProposalBaseline(input: {
  proposal: ResearchProposalDocument;
  handoff: ProposalHandoffPackage;
  compilation: ProposalReviewCompilation;
  researcherReview: ProposalResearcherReviewDraft;
  externalReviewReceipts: readonly ProposalExternalReviewReceipt[];
  knowledgeEntries: readonly ResearchKnowledgeEntry[];
  previous?: ReviewedProposalBaselinePackage | null;
  now?: string;
}): Promise<ReviewedProposalBaselinePackage> {
  if (!input.compilation.readyToFreeze) throw new Error("The reviewed proposal baseline still has blocking issues.");
  if (!await verifyResearchProposalDocument(input.proposal) || !await verifyProposalHandoffPackage(input.handoff)) throw new Error("The proposal or handoff checksum is invalid.");
  if (input.handoff.proposalReference.checksum !== input.proposal.identity.checksum) throw new Error("The handoff does not bind the current proposal.");
  if (input.externalReviewReceipts.length > MAX_PROPOSAL_EXTERNAL_REVIEW_RECEIPTS) throw new Error("The external review receipt limit was exceeded.");
  if ((await Promise.all(input.externalReviewReceipts.map(verifyProposalExternalReviewReceipt))).some((valid) => !valid)) throw new Error("An external review receipt is invalid.");
  const handoffReference = reference(input.handoff.identity);
  if (input.externalReviewReceipts.some((receipt) => !sameReference(receipt.reviewedHandoffReference, handoffReference))) throw new Error("An external review receipt refers to a different handoff revision.");
  if (input.knowledgeEntries.length !== 3 || (await Promise.all(input.knowledgeEntries.map(verifyResearchKnowledgeEntry))).some((valid) => !valid)) throw new Error("The Stage 2 Living Research Record entries are invalid.");
  const frozenAt = iso(input.now ?? new Date().toISOString(), "Proposal review freeze time");
  const reviewDraft = normalizeResearcherReviewDraft(input.researcherReview);
  const payload: ReviewedProposalBaselinePayload = {
    schemaVersion: PROPOSAL_REVIEW_PHASE9_SCHEMA_VERSION,
    compilerVersion: PROPOSAL_REVIEW_PHASE9_COMPILER_VERSION,
    projectId: token(input.proposal.projectId, "Reviewed baseline project ID"),
    revision: (input.previous?.revision ?? 0) + 1,
    handoffReference,
    proposalReference: input.handoff.proposalReference,
    proposalRevision: input.proposal.revision,
    integrityChecks: input.compilation.checks.map((check) => {
      if (check.status !== "passed") throw new Error("A reviewed baseline integrity check is blocked.");
      return { ...check, status: "passed" as const };
    }),
    traceability: input.compilation.traceability.map((row) => ({ ...row, gapClaimIds: [...row.gapClaimIds] })),
    riskLedger: input.compilation.riskLedger.map((item) => ({ ...item })),
    researcherReview: { ...reviewDraft, reviewedAt: frozenAt, reviewedHandoffReference: handoffReference, claim: "researcher-review-record-not-institutional-ethics-legal-methodological-funder-or-publication-approval" },
    externalReviewReceipts: input.externalReviewReceipts.map((receipt) => ({ ...receipt, attachment: receipt.attachment ? { ...receipt.attachment } : null })),
    livingResearchEntryChecksums: input.knowledgeEntries.map((entry) => entry.checksum).sort(),
    frozenAt,
    participantDataIncluded: false,
    claim: "reviewed-proposal-baseline-not-factual-novelty-methodological-ethical-legal-compliance-submission-funding-publication-or-collection-approval",
  };
  validateReviewedProposalBaselinePayload(payload);
  return {
    ...payload,
    identity: await createResearchArtifactIdentity({
      artifactKind: "reviewed-proposal-baseline",
      artifactId: `reviewed-proposal-${payload.projectId}`,
      artifactSchemaVersion: PROPOSAL_REVIEW_PHASE9_SCHEMA_VERSION,
      payload,
      sources: [handoffReference],
      limits: { maximumBytes: 2 * 1024 * 1024, maximumNodes: 60_000 },
    }),
  };
}

function validateReviewedProposalBaselinePayload(payload: ReviewedProposalBaselinePayload): void {
  if (payload.schemaVersion !== PROPOSAL_REVIEW_PHASE9_SCHEMA_VERSION || payload.compilerVersion !== PROPOSAL_REVIEW_PHASE9_COMPILER_VERSION) throw new Error("Reviewed baseline schema is unsupported.");
  token(payload.projectId, "Reviewed baseline project ID");
  if (!Number.isSafeInteger(payload.revision) || payload.revision < 1 || !Number.isSafeInteger(payload.proposalRevision) || payload.proposalRevision < 1) throw new Error("Reviewed baseline revision is invalid.");
  if (normalizeResearchArtifactReference(payload.handoffReference)?.artifactKind !== "proposal-handoff" || normalizeResearchArtifactReference(payload.proposalReference)?.artifactKind !== "research-proposal") throw new Error("Reviewed baseline source reference is invalid.");
  normalizeResearcherReviewDraft(payload.researcherReview);
  if (!sameReference(payload.researcherReview.reviewedHandoffReference, payload.handoffReference) || payload.researcherReview.claim !== "researcher-review-record-not-institutional-ethics-legal-methodological-funder-or-publication-approval") throw new Error("Researcher review receipt is invalid.");
  if (payload.integrityChecks.length !== 7 || payload.integrityChecks.some((check) => check.status !== "passed")) throw new Error("Reviewed baseline integrity receipt is incomplete.");
  if (payload.externalReviewReceipts.length > MAX_PROPOSAL_EXTERNAL_REVIEW_RECEIPTS) throw new Error("External review receipt limit exceeded.");
  if (new Set(payload.externalReviewReceipts.map((receipt) => receipt.id)).size !== payload.externalReviewReceipts.length) throw new Error("External review receipt is duplicated.");
  if (payload.livingResearchEntryChecksums.length !== 3 || payload.livingResearchEntryChecksums.some((checksum) => !isResearchArtifactChecksum(checksum))) throw new Error("Living Research Record receipt is invalid.");
  iso(payload.frozenAt, "Reviewed baseline freeze time");
  if (payload.participantDataIncluded !== false || payload.claim !== "reviewed-proposal-baseline-not-factual-novelty-methodological-ethical-legal-compliance-submission-funding-publication-or-collection-approval") throw new Error("Reviewed baseline safety boundary is invalid.");
}

export async function verifyReviewedProposalBaseline(packageValue: ReviewedProposalBaselinePackage): Promise<boolean> {
  try {
    const { identity, ...payload } = packageValue;
    validateReviewedProposalBaselinePayload(payload);
    if ((await Promise.all(payload.externalReviewReceipts.map(verifyProposalExternalReviewReceipt))).some((valid) => !valid)) return false;
    return identity.artifactKind === "reviewed-proposal-baseline"
      && identity.artifactId === `reviewed-proposal-${payload.projectId}`
      && identity.artifactSchemaVersion === PROPOSAL_REVIEW_PHASE9_SCHEMA_VERSION
      && identity.sourceFingerprint.sources.length === 1
      && sameReference(identity.sourceFingerprint.sources[0], payload.handoffReference)
      && await verifyResearchArtifactIdentity(identity, payload, { maximumBytes: 2 * 1024 * 1024, maximumNodes: 60_000 });
  } catch {
    return false;
  }
}

export async function normalizeReviewedProposalBaseline(value: unknown, projectId: string): Promise<ReviewedProposalBaselinePackage | null> {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const candidate = value as Record<string, unknown>;
    if (candidate.projectId !== projectId) return null;
    const identity = normalizeResearchArtifactIdentity(candidate.identity);
    if (!identity) return null;
    const packageValue = { ...candidate, identity } as unknown as ReviewedProposalBaselinePackage;
    return await verifyReviewedProposalBaseline(packageValue) ? packageValue : null;
  } catch {
    return null;
  }
}

export async function createProposalReviewExportBundle(input: {
  baseline: ReviewedProposalBaselinePackage;
  proposal: ResearchProposalDocument;
  handoff: ProposalHandoffPackage;
  assessments: readonly ProjectEvidenceAssessment[];
  knowledgeEntries: readonly ResearchKnowledgeEntry[];
  exportedAt?: string;
}): Promise<ProposalReviewExportBundle> {
  if (!await verifyReviewedProposalBaseline(input.baseline) || !await verifyResearchProposalDocument(input.proposal) || !await verifyProposalHandoffPackage(input.handoff)) throw new Error("The proposal review export contains an invalid checksum.");
  if (!reviewedProposalBaselineIsCurrent(input.baseline, input.handoff) || input.proposal.identity.checksum !== input.baseline.proposalReference.checksum) throw new Error("The reviewed baseline is stale and cannot be exported as current.");
  if ((await Promise.all(input.assessments.map(verifyProjectEvidenceAssessment))).some((valid) => !valid)) throw new Error("An evidence manifest record is invalid.");
  const expected = new Map(input.handoff.evidenceManifest.map((item) => [item.assessmentId, item.assessmentChecksum]));
  if (expected.size !== input.assessments.length || input.assessments.some((assessment) => expected.get(assessment.assessmentId) !== assessment.identity.checksum)) throw new Error("The evidence manifest no longer matches the reviewed handoff.");
  if (input.knowledgeEntries.length !== 3 || (await Promise.all(input.knowledgeEntries.map(verifyResearchKnowledgeEntry))).some((valid) => !valid)) throw new Error("The Living Research Record export is invalid.");
  const checksums = input.knowledgeEntries.map((entry) => entry.checksum).sort();
  if (JSON.stringify(checksums) !== JSON.stringify(input.baseline.livingResearchEntryChecksums)) throw new Error("The Living Research Record export does not match the reviewed baseline.");
  const payload: ProposalReviewExportPayload = {
    schemaVersion: PROPOSAL_REVIEW_PHASE9_SCHEMA_VERSION,
    projectId: input.baseline.projectId,
    reviewedBaseline: input.baseline,
    proposal: input.proposal,
    evidenceManifest: [...input.assessments].sort((left, right) => left.assessmentId.localeCompare(right.assessmentId)),
    livingResearchEntries: [...input.knowledgeEntries].sort((left, right) => left.id.localeCompare(right.id)),
    exportedAt: iso(input.exportedAt ?? new Date().toISOString(), "Proposal review export time"),
    participantDataIncluded: false,
    sourceFilesIncluded: false,
    claim: "portable-proposal-review-export-not-submission-package-approval-certification-or-authorization",
  };
  return { ...payload, bundleChecksum: await sha256ArtifactChecksum(payload, { maximumBytes: MAX_PROPOSAL_REVIEW_EXPORT_BYTES, maximumNodes: 250_000 }) };
}

export async function verifyProposalReviewExportBundle(bundle: ProposalReviewExportBundle): Promise<boolean> {
  try {
    const { bundleChecksum, ...payload } = bundle;
    return isResearchArtifactChecksum(bundleChecksum)
      && payload.participantDataIncluded === false
      && payload.sourceFilesIncluded === false
      && payload.claim === "portable-proposal-review-export-not-submission-package-approval-certification-or-authorization"
      && bundleChecksum === await sha256ArtifactChecksum(payload, { maximumBytes: MAX_PROPOSAL_REVIEW_EXPORT_BYTES, maximumNodes: 250_000 });
  } catch {
    return false;
  }
}
