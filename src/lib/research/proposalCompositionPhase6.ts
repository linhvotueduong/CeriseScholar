import { PROPOSAL_SECTIONS, SECTION_LABELS } from "../../types/paper-section";
import type { ProposalStudyRoute } from "./proposalStudyContractPhase5";
import type {
  ProjectEvidenceAssessment,
  ProposalClaimEvidenceEntry,
  ProposalClaimKind,
  ProposalRequirementsProfile,
  ProposedStudyContract,
  ResearchProposalSection,
} from "./researchProposalDocument";

export const PROPOSAL_COMPOSITION_PHASE6_VERSION = 1 as const;

export type ProposalCompositionSectionKey = (typeof PROPOSAL_SECTIONS)[number];

export interface ProposalCompositionGuidanceSource {
  id: string;
  name: string;
  version: string;
  sourceUrl: string;
  accessedAt: string;
  role: "funder-application" | "protocol" | "reporting-boundary";
  boundary: "section-completeness-and-traceability-not-format-compliance-writing-quality-or-approval";
}

export interface ProposalCompositionSectionDefinition {
  key: ProposalCompositionSectionKey;
  label: string;
  purpose: string;
  allowedClaimKinds: ProposalClaimKind[];
  contractCoverage: "none" | "all";
  requirementKeywords: string[];
}

export interface ProposalCompositionIssue {
  id: string;
  severity: "blocking" | "advisory";
  message: string;
  sectionId: string | null;
  field: "content" | "claims" | "evidence" | "contract" | "requirements" | "citations" | "support" | "review" | "upstream" | "word-limit" | null;
}

export interface ProposalCompositionSectionSummary {
  sectionId: ProposalCompositionSectionKey;
  words: number;
  claimCount: number;
  evidenceCount: number;
  contractCount: number;
  requirementCount: number;
  ready: boolean;
}

export interface ProposalCompositionCompilation {
  schemaVersion: typeof PROPOSAL_COMPOSITION_PHASE6_VERSION;
  routePrompts: string[];
  guidanceSources: ProposalCompositionGuidanceSource[];
  sectionSummaries: ProposalCompositionSectionSummary[];
  totalWords: number;
  maximumWords: number | null;
  coveredRequirementIds: string[];
  issues: ProposalCompositionIssue[];
  ready: boolean;
  claim: "researcher-owned-source-linked-proposal-not-factual-methodological-ethical-compliance-submission-or-funding-approval";
}

const ACCESSED_AT = "2026-08-05";

export const PROPOSAL_COMPOSITION_GUIDANCE_SOURCES: readonly ProposalCompositionGuidanceSource[] = [
  {
    id: "nih-application-sections-2026",
    name: "NIH Advice on Application Sections",
    version: "Current guidance accessed 2026-08-05",
    sourceUrl: "https://grants.nih.gov/grants-process/write-application/advice-on-application-sections",
    accessedAt: ACCESSED_AT,
    role: "funder-application",
    boundary: "section-completeness-and-traceability-not-format-compliance-writing-quality-or-approval",
  },
  {
    id: "ukri-esrc-good-application-2026",
    name: "UKRI ESRC How to write a good application",
    version: "Current guidance accessed 2026-08-05",
    sourceUrl: "https://www.ukri.org/councils/esrc/guidance-for-applicants/how-to-write-a-good-application/",
    accessedAt: ACCESSED_AT,
    role: "funder-application",
    boundary: "section-completeness-and-traceability-not-format-compliance-writing-quality-or-approval",
  },
  {
    id: "ukri-core-application-sections-2026",
    name: "UKRI core application section questions and assessment",
    version: "Current guidance accessed 2026-08-05",
    sourceUrl: "https://www.ukri.org/apply-for-funding/develop-your-application/responsive-mode-opportunities-funding-service-core-application-section-questions-and-assessment/",
    accessedAt: ACCESSED_AT,
    role: "funder-application",
    boundary: "section-completeness-and-traceability-not-format-compliance-writing-quality-or-approval",
  },
  {
    id: "prisma-p-2015",
    name: "PRISMA-P protocol guidance",
    version: "PRISMA-P 2015",
    sourceUrl: "https://www.prisma-statement.org/protocols",
    accessedAt: ACCESSED_AT,
    role: "protocol",
    boundary: "section-completeness-and-traceability-not-format-compliance-writing-quality-or-approval",
  },
  {
    id: "spirit-2025",
    name: "SPIRIT 2025 Statement",
    version: "SPIRIT 2025",
    sourceUrl: "https://jamanetwork.com/journals/jama/fullarticle/2833408",
    accessedAt: ACCESSED_AT,
    role: "protocol",
    boundary: "section-completeness-and-traceability-not-format-compliance-writing-quality-or-approval",
  },
  {
    id: "equator-reporting-guideline-definition",
    name: "EQUATOR definition of a reporting guideline",
    version: "Current guidance accessed 2026-08-05",
    sourceUrl: "https://www.equator-network.org/about-us/what-is-a-reporting-guideline/",
    accessedAt: ACCESSED_AT,
    role: "reporting-boundary",
    boundary: "section-completeness-and-traceability-not-format-compliance-writing-quality-or-approval",
  },
] as const;

export const PROPOSAL_COMPOSITION_SECTION_DEFINITIONS: readonly ProposalCompositionSectionDefinition[] = [
  {
    key: "proposal_background",
    label: SECTION_LABELS.proposal_background,
    purpose: "Establish the bounded context, concepts, prior landscape, and rationale needed before the problem is introduced.",
    allowedClaimKinds: ["background", "known", "contested"],
    contractCoverage: "none",
    requirementKeywords: ["background", "context", "rationale", "significance", "vision"],
  },
  {
    key: "proposal_problem_statement",
    label: SECTION_LABELS.proposal_problem_statement,
    purpose: "State the documented problem, the bounded researcher-reviewed gap, and why addressing it matters.",
    allowedClaimKinds: ["problem", "gap", "significance", "contested"],
    contractCoverage: "none",
    requirementKeywords: ["problem", "gap", "need", "significance", "importance"],
  },
  {
    key: "proposal_literature_review",
    label: SECTION_LABELS.proposal_literature_review,
    purpose: "Synthesize what is known and contested across included evidence while preserving limitations and the gap boundary.",
    allowedClaimKinds: ["background", "known", "contested", "gap"],
    contractCoverage: "none",
    requirementKeywords: ["literature", "evidence", "prior research", "review", "scholarship"],
  },
  {
    key: "proposal_current_study",
    label: SECTION_LABELS.proposal_current_study,
    purpose: "Present the proposed purpose, questions, bounded contribution, and question-to-study alignment.",
    allowedClaimKinds: ["gap", "significance", "proposed-contribution", "problem"],
    contractCoverage: "all",
    requirementKeywords: ["aim", "objective", "question", "hypothesis", "contribution", "innovation", "vision"],
  },
  {
    key: "proposal_method_materials",
    label: SECTION_LABELS.proposal_method_materials,
    purpose: "Describe the proposed design direction, sources or participants, materials, procedure, analysis, feasibility, access, and unresolved safeguards.",
    allowedClaimKinds: ["proposed-contribution", "gap"],
    contractCoverage: "all",
    requirementKeywords: ["method", "approach", "design", "analysis", "data", "ethic", "resource", "feasibility", "timeline", "risk"],
  },
  {
    key: "proposal_references",
    label: SECTION_LABELS.proposal_references,
    purpose: "Keep a reviewable reference list aligned with the evidence assessments actually used in the proposal.",
    allowedClaimKinds: [],
    contractCoverage: "none",
    requirementKeywords: ["reference", "bibliography", "citation"],
  },
] as const;

const DEFINITION_BY_KEY = new Map(PROPOSAL_COMPOSITION_SECTION_DEFINITIONS.map((definition) => [definition.key, definition]));

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function words(value: string): number {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function normalizedSection(section: ResearchProposalSection | undefined, key: ProposalCompositionSectionKey): ResearchProposalSection {
  return {
    id: key,
    title: section?.title || SECTION_LABELS[key],
    role: key,
    content: section?.content ?? "",
    citationKeys: unique(section?.citationKeys ?? []),
    sourceKnowledgeEntryIds: unique(section?.sourceKnowledgeEntryIds ?? []),
    sourceAssetIds: unique(section?.sourceAssetIds ?? []),
    sourceClaimIds: unique(section?.sourceClaimIds ?? []),
    sourceEvidenceAssessmentIds: unique(section?.sourceEvidenceAssessmentIds ?? []),
    sourceContractEntryIds: unique(section?.sourceContractEntryIds ?? []),
    requirementIds: unique(section?.requirementIds ?? []),
    unresolvedSupportNotes: section?.unresolvedSupportNotes ?? "",
    researcherReviewed: section?.researcherReviewed ?? false,
  };
}

export function createProposalCompositionDraft(currentSections: readonly ResearchProposalSection[]): ResearchProposalSection[] {
  const byId = new Map(currentSections.map((section) => [section.id, section]));
  const byRole = new Map(currentSections.map((section) => [section.role, section]));
  const expected = PROPOSAL_SECTIONS.map((key) => normalizedSection(byId.get(key) ?? byRole.get(key), key));
  const known = new Set<string>(PROPOSAL_SECTIONS);
  const additional = currentSections.filter((section) => !known.has(section.id) && !known.has(section.role));
  return [...expected, ...additional];
}

export function suggestedRequirementIds(
  definition: ProposalCompositionSectionDefinition,
  profile: ProposalRequirementsProfile,
): string[] {
  return profile.requirements.filter((requirement) => {
    const search = `${requirement.label} ${requirement.description}`.toLocaleLowerCase();
    return definition.requirementKeywords.some((keyword) => search.includes(keyword));
  }).map((requirement) => requirement.id);
}

export function proposalCompositionPromptsForRoute(route: ProposalStudyRoute): string[] {
  if (route.intent === "evidence-synthesis") return [
    "Write the proposal as a protocol: make eligibility, information sources, selection, appraisal, and synthesis direction inspectable.",
    "Distinguish a mapped absence from evidence that no study exists, and keep search limits visible in the gap wording.",
    "Use the selected protocol authority as a completeness prompt; Cerise does not claim registration or protocol compliance.",
  ];
  if (route.intent === "secondary-data") return [
    "Separate the research question from what the named dataset or records can validly represent.",
    "Carry version, provenance, population coverage, measurement fit, missingness, access, licensing, and linkage limits into the method section.",
    "Do not describe dataset availability as evidence of validity, representativeness, or lawful use.",
  ];
  if (route.methodFamily === "qualitative") return [
    "Keep context, sampling logic, researcher positioning, reflexivity, participant meaning, and divergent cases visible.",
    "Align the qualitative tradition, data generation, analytic direction, and intended interpretive claim.",
    "Do not invent hypotheses, variables, power calculations, or effect-size language for an interpretive proposal.",
  ];
  if (route.methodFamily === "mixed-methods") return [
    "Explain why mixing is necessary and preserve the integrity of each strand before integration.",
    "State timing, priority, dependency, the point of integration, and how divergence will be examined.",
    "Map each research question to the strand or integration step that can answer it.",
  ];
  return [
    "Align the proposed design, sample or assignment, measures, comparison, analysis direction, and strength of inference.",
    "Describe bias reduction, missingness, exclusions, uncertainty, and sensitivity responsibilities before results exist.",
    "Do not present a proposal-level method direction as a validated, sufficiently powered, or implemented study.",
  ];
}

function issue(
  id: string,
  message: string,
  details: Partial<Pick<ProposalCompositionIssue, "severity" | "sectionId" | "field">> = {},
): ProposalCompositionIssue {
  return {
    id,
    severity: details.severity ?? "blocking",
    message,
    sectionId: details.sectionId ?? null,
    field: details.field ?? null,
  };
}

function claimHasKind(claims: readonly ProposalClaimEvidenceEntry[], kind: ProposalClaimKind): boolean {
  return claims.some((claim) => claim.kind === kind);
}

export function compileProposalComposition(input: {
  route: ProposalStudyRoute;
  requirements: ProposalRequirementsProfile;
  claimEvidenceMap: { claims: ProposalClaimEvidenceEntry[] };
  proposedStudyContract: ProposedStudyContract;
  assessments: readonly ProjectEvidenceAssessment[];
  sections: readonly ResearchProposalSection[];
  requirementsReady: boolean;
  synthesisReady: boolean;
  contractReady: boolean;
}): ProposalCompositionCompilation {
  const issues: ProposalCompositionIssue[] = [];
  if (!input.requirementsReady) issues.push(issue("requirements-not-ready", "Finish and reconfirm the current Proposal Requirements Profile before finalizing composition.", { field: "upstream" }));
  if (!input.synthesisReady) issues.push(issue("synthesis-not-ready", "Finish the current evidence synthesis and bounded gap before finalizing composition.", { field: "upstream" }));
  if (!input.contractReady) issues.push(issue("contract-not-ready", "Finish the current Proposed Study Contract before finalizing composition.", { field: "upstream" }));

  const claimsById = new Map(input.claimEvidenceMap.claims.map((claim) => [claim.id, claim]));
  const assessmentsById = new Map(input.assessments.map((assessment) => [assessment.assessmentId, assessment]));
  const contractById = new Map(input.proposedStudyContract.entries.map((entry) => [entry.id, entry]));
  const requirementsById = new Map(input.requirements.requirements.map((requirement) => [requirement.id, requirement]));
  const expectedSectionKeys = new Set<string>(PROPOSAL_SECTIONS);
  const sectionSummaries: ProposalCompositionSectionSummary[] = [];
  const usedNarrativeEvidenceIds = new Set<string>();

  for (const definition of PROPOSAL_COMPOSITION_SECTION_DEFINITIONS) {
    const matches = input.sections.filter((section) => section.id === definition.key || section.role === definition.key);
    if (matches.length === 0) {
      issues.push(issue(`section-missing-${definition.key}`, `${definition.label} is missing from the canonical proposal.`, { sectionId: definition.key, field: "content" }));
      sectionSummaries.push({ sectionId: definition.key, words: 0, claimCount: 0, evidenceCount: 0, contractCount: 0, requirementCount: 0, ready: false });
      continue;
    }
    if (matches.length > 1) issues.push(issue(`section-duplicate-${definition.key}`, `${definition.label} appears more than once. Merge it into one canonical section.`, { sectionId: definition.key, field: "content" }));
    const section = matches[0];
    const sourceClaimIds = unique(section.sourceClaimIds ?? []);
    const evidenceIds = unique(section.sourceEvidenceAssessmentIds ?? []);
    const contractIds = unique(section.sourceContractEntryIds ?? []);
    const requirementIds = unique(section.requirementIds ?? []);
    const linkedClaims = sourceClaimIds.map((id) => claimsById.get(id)).filter((claim): claim is ProposalClaimEvidenceEntry => Boolean(claim));
    if (!section.content.trim()) issues.push(issue(`section-content-${definition.key}`, `Write the ${definition.label} section before marking it reviewed.`, { sectionId: definition.key, field: "content" }));
    if (!(section.researcherReviewed ?? false)) issues.push(issue(`section-review-${definition.key}`, `Review the current ${definition.label} prose and provenance links.`, { sectionId: definition.key, field: "review" }));

    for (const id of sourceClaimIds) if (!claimsById.has(id)) issues.push(issue(`unknown-claim-${definition.key}-${id}`, `${definition.label} links to a claim that is no longer in the current synthesis map.`, { sectionId: definition.key, field: "claims" }));
    for (const claim of linkedClaims) {
      if (claim.status === "draft") issues.push(issue(`draft-claim-${definition.key}-${claim.id}`, `${definition.label} links to a draft claim. Review the claim in Phase 4 first.`, { sectionId: definition.key, field: "claims" }));
      if (definition.allowedClaimKinds.length > 0 && !definition.allowedClaimKinds.includes(claim.kind)) issues.push(issue(`claim-role-${definition.key}-${claim.id}`, `${claim.kind.replaceAll("-", " ")} is unusual in ${definition.label}; confirm the rhetorical role.`, { severity: "advisory", sectionId: definition.key, field: "claims" }));
      const includedEvidenceIds = claim.evidenceAssessmentIds.filter((id) => assessmentsById.get(id)?.status === "included");
      if (definition.key !== "proposal_references") for (const evidenceId of includedEvidenceIds) usedNarrativeEvidenceIds.add(evidenceId);
      for (const evidenceId of includedEvidenceIds) if (!evidenceIds.includes(evidenceId)) issues.push(issue(`claim-evidence-closure-${definition.key}-${claim.id}-${evidenceId}`, `Add the included evidence assessment supporting linked claim “${claim.text.slice(0, 90)}” to this section’s provenance.`, { sectionId: definition.key, field: "evidence" }));
      if (claim.status === "unsupported" && !(section.unresolvedSupportNotes ?? "").trim()) issues.push(issue(`unsupported-claim-note-${definition.key}-${claim.id}`, "Record how the section limits or contextualizes its unsupported claim.", { sectionId: definition.key, field: "support" }));
    }
    for (const id of evidenceIds) {
      const assessment = assessmentsById.get(id);
      if (!assessment || assessment.status !== "included") issues.push(issue(`invalid-evidence-${definition.key}-${id}`, `${definition.label} links to evidence that is missing or no longer included.`, { sectionId: definition.key, field: "evidence" }));
      else if (definition.key !== "proposal_references") usedNarrativeEvidenceIds.add(id);
    }
    for (const id of contractIds) if (!contractById.has(id)) issues.push(issue(`unknown-contract-${definition.key}-${id}`, `${definition.label} links to a Proposed Study Contract entry that is no longer current.`, { sectionId: definition.key, field: "contract" }));
    if (definition.contractCoverage === "all") {
      for (const entry of input.proposedStudyContract.entries) if (!contractIds.includes(entry.id)) issues.push(issue(`contract-coverage-${definition.key}-${entry.id}`, `${definition.label} does not yet trace to the contract entry for question ${entry.questionId}.`, { sectionId: definition.key, field: "contract" }));
    }
    for (const id of requirementIds) if (!requirementsById.has(id)) issues.push(issue(`unknown-requirement-${definition.key}-${id}`, `${definition.label} links to a requirement that is no longer in the current profile.`, { sectionId: definition.key, field: "requirements" }));

    if (definition.key === "proposal_background" && !linkedClaims.some((claim) => ["background", "known", "contested"].includes(claim.kind))) issues.push(issue("background-claim-required", "Background needs at least one current background, known, or contested claim.", { sectionId: definition.key, field: "claims" }));
    if (definition.key === "proposal_problem_statement") {
      if (!claimHasKind(linkedClaims, "gap")) issues.push(issue("problem-gap-required", "Statement of the Problem must trace to a current bounded gap claim.", { sectionId: definition.key, field: "claims" }));
      if (!claimHasKind(linkedClaims, "significance")) issues.push(issue("problem-significance-required", "Statement of the Problem must trace to why the gap matters.", { sectionId: definition.key, field: "claims" }));
    }
    if (definition.key === "proposal_literature_review" && (linkedClaims.length === 0 || evidenceIds.length === 0)) issues.push(issue("literature-trace-required", "Literature Review needs current synthesis claims and included evidence provenance.", { sectionId: definition.key, field: "evidence" }));
    if (definition.key === "proposal_current_study" && !linkedClaims.some((claim) => ["gap", "significance", "proposed-contribution"].includes(claim.kind))) issues.push(issue("current-study-claim-required", "Current Study must trace to the bounded gap, significance, or proposed contribution.", { sectionId: definition.key, field: "claims" }));

    const blockingForSection = issues.some((candidate) => candidate.sectionId === definition.key && candidate.severity === "blocking");
    sectionSummaries.push({
      sectionId: definition.key,
      words: words(section.content),
      claimCount: sourceClaimIds.length,
      evidenceCount: evidenceIds.length,
      contractCount: contractIds.length,
      requirementCount: requirementIds.length,
      ready: !blockingForSection,
    });
  }

  const references = input.sections.find((section) => section.id === "proposal_references" || section.role === "proposal_references");
  const referenceEvidenceIds = new Set(unique(references?.sourceEvidenceAssessmentIds ?? []));
  for (const id of usedNarrativeEvidenceIds) if (!referenceEvidenceIds.has(id)) issues.push(issue(`reference-evidence-${id}`, "An evidence assessment used in the proposal narrative is missing from the References section provenance.", { sectionId: "proposal_references", field: "citations" }));
  if (usedNarrativeEvidenceIds.size > 0 && unique(references?.citationKeys ?? []).length < usedNarrativeEvidenceIds.size) issues.push(issue("reference-key-coverage", "Record at least one inspectable citation key or reference identifier for every evidence assessment used in the narrative.", { sectionId: "proposal_references", field: "citations" }));

  const coveredRequirementIds = unique(input.sections.flatMap((section) => section.requirementIds ?? []));
  for (const requirement of input.requirements.requirements) if (requirement.required && !coveredRequirementIds.includes(requirement.id)) issues.push(issue(`required-requirement-${requirement.id}`, `Required proposal item “${requirement.label}” is not mapped to a section.`, { field: "requirements" }));

  for (const section of input.sections) if (!expectedSectionKeys.has(section.id) && !expectedSectionKeys.has(section.role)) issues.push(issue(`additional-section-${section.id}`, `Additional section “${section.title}” is preserved but is outside the six-section compatibility composer.`, { severity: "advisory", sectionId: section.id }));
  const totalWords = input.sections.filter((section) => expectedSectionKeys.has(section.id) || expectedSectionKeys.has(section.role)).reduce((total, section) => total + words(section.content), 0);
  if (input.requirements.maximumWords !== null && totalWords > input.requirements.maximumWords) issues.push(issue("maximum-word-limit", `The proposal has ${totalWords.toLocaleString()} words, exceeding the current ${input.requirements.maximumWords.toLocaleString()}-word profile limit.`, { field: "word-limit" }));

  const finalSectionSummaries = sectionSummaries.map((summary) => ({
    ...summary,
    ready: !issues.some((candidate) => candidate.sectionId === summary.sectionId && candidate.severity === "blocking"),
  }));

  return {
    schemaVersion: PROPOSAL_COMPOSITION_PHASE6_VERSION,
    routePrompts: proposalCompositionPromptsForRoute(input.route),
    guidanceSources: [...PROPOSAL_COMPOSITION_GUIDANCE_SOURCES],
    sectionSummaries: finalSectionSummaries,
    totalWords,
    maximumWords: input.requirements.maximumWords,
    coveredRequirementIds,
    issues,
    ready: !issues.some((candidate) => candidate.severity === "blocking"),
    claim: "researcher-owned-source-linked-proposal-not-factual-methodological-ethical-compliance-submission-or-funding-approval",
  };
}

export function definitionForProposalSection(key: ProposalCompositionSectionKey): ProposalCompositionSectionDefinition {
  const definition = DEFINITION_BY_KEY.get(key);
  if (!definition) throw new Error(`Unknown proposal section: ${key}`);
  return definition;
}
