import {
  createResearchArtifactIdentity,
  type ResearchArtifactReference,
} from "./artifactIdentity";
import type { EvidenceLibraryRow } from "./evidenceLibrary";
import type { MethodFamily, ResearchIntent } from "./projectRouteProfile";
import type {
  EvidenceSearchVersion,
  ProjectEvidenceAppraisalItem,
  ProjectEvidenceAssessment,
  ProposalEvidenceStrategy,
} from "./researchProposalDocument";

export const PROPOSAL_EVIDENCE_PHASE3_VERSION = 1 as const;

export type ProposalEvidenceRoute = {
  intent: ResearchIntent | "undetermined";
  methodFamily: MethodFamily | "undetermined";
};

export type EvidenceAppraisalLensId =
  | "general-source"
  | "quantitative-study"
  | "qualitative-study"
  | "mixed-methods-study"
  | "secondary-dataset"
  | "evidence-synthesis";

export interface EvidenceGuidanceSource {
  id: string;
  name: string;
  version: string;
  sourceUrl: string;
  accessedAt: string;
  role: "search-conduct" | "search-reporting" | "critical-appraisal";
}

export interface EvidenceStrategyIssue {
  id: string;
  severity: "blocking" | "advisory";
  message: string;
}

export interface EvidenceStrategyCompilation {
  schemaVersion: typeof PROPOSAL_EVIDENCE_PHASE3_VERSION;
  route: ProposalEvidenceRoute;
  routeLabel: string;
  recommendedSourceTypes: string[];
  recommendedSourceSystems: string[];
  guidanceSources: EvidenceGuidanceSource[];
  issues: EvidenceStrategyIssue[];
  ready: boolean;
  claim: "planning-and-documentation-aid-not-search-completeness-methodological-quality-or-inclusion-certification";
}

export interface EvidenceAppraisalLens {
  id: EvidenceAppraisalLensId;
  label: string;
  description: string;
  authorityName: string;
  authorityVersion: string;
  authorityUrl: string;
  criteria: Array<{ id: string; prompt: string }>;
  claim: "cerise-structured-lens-inspired-by-authoritative-guidance-not-a-licensed-reproduction-or-universal-score";
}

export interface EvidenceReviewIssue {
  id: string;
  severity: "blocking" | "advisory";
  message: string;
  assessmentId: string | null;
  questionId: string | null;
}

export interface EvidenceReviewCompilation {
  schemaVersion: typeof PROPOSAL_EVIDENCE_PHASE3_VERSION;
  includedCount: number;
  excludedCount: number;
  unresolvedCount: number;
  coveredQuestionIds: string[];
  issues: EvidenceReviewIssue[];
  ready: boolean;
  claim: "researcher-owned-project-review-not-global-quality-score-truth-or-novelty-certification";
}

const ACCESSED_AT = "2026-08-05";

export const EVIDENCE_GUIDANCE_SOURCES: readonly EvidenceGuidanceSource[] = [
  {
    id: "cochrane-handbook-search-6-5-1",
    name: "Cochrane Handbook, Chapter 4: Searching for and selecting studies",
    version: "Version 6.5.1; chapter updated March 2025",
    sourceUrl: "https://training.cochrane.org/handbook/current/chapter-04",
    accessedAt: ACCESSED_AT,
    role: "search-conduct",
  },
  {
    id: "prisma-s-2021",
    name: "PRISMA-S: an extension for reporting literature searches",
    version: "2021",
    sourceUrl: "https://www.prisma-statement.org/prisma-search",
    accessedAt: ACCESSED_AT,
    role: "search-reporting",
  },
  {
    id: "casp-current-checklists",
    name: "Critical Appraisal Skills Programme checklists",
    version: "Current checklist registry accessed 2026-08-05",
    sourceUrl: "https://casp-uk.net/casp-tools-checklists/",
    accessedAt: ACCESSED_AT,
    role: "critical-appraisal",
  },
  {
    id: "mmat-2018",
    name: "Mixed Methods Appraisal Tool",
    version: "MMAT 2018",
    sourceUrl: "https://escholarship.mcgill.ca/downloads/v118rj210",
    accessedAt: ACCESSED_AT,
    role: "critical-appraisal",
  },
  {
    id: "jbi-current-tools",
    name: "JBI Critical Appraisal Tools",
    version: "Current tool registry accessed 2026-08-05",
    sourceUrl: "https://jbi.global/critical-appraisal-tools",
    accessedAt: ACCESSED_AT,
    role: "critical-appraisal",
  },
] as const;

const COMMON_SOURCE_TYPES = [
  "Peer-reviewed research",
  "Scholarly reviews",
  "Authoritative reports or guidance",
  "Grey literature",
] as const;

function uniqueTrimmed(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function routeLabel(route: ProposalEvidenceRoute): string {
  if (route.intent === "evidence-synthesis") return "Evidence synthesis";
  if (route.intent === "secondary-data") return "Secondary-data study";
  if (route.methodFamily === "qualitative") return "Qualitative primary study";
  if (route.methodFamily === "mixed-methods") return "Mixed-methods primary study";
  if (route.methodFamily === "quantitative") return "Quantitative primary study";
  return "Route awaiting confirmation";
}

export function recommendedEvidenceSourceTypes(route: ProposalEvidenceRoute): string[] {
  const values: string[] = [...COMMON_SOURCE_TYPES];
  if (route.intent === "secondary-data") values.push("Datasets and data documentation", "Data-use terms and provenance records");
  if (route.intent === "evidence-synthesis") values.push("Primary studies eligible for synthesis", "Trials or study registries", "Backward and forward citation trails");
  if (route.methodFamily === "qualitative" || route.methodFamily === "mixed-methods") values.push("Qualitative empirical studies");
  if (route.methodFamily === "quantitative" || route.methodFamily === "mixed-methods") values.push("Quantitative empirical studies");
  return uniqueTrimmed(values);
}

export function recommendedEvidenceSourceSystems(route: ProposalEvidenceRoute): string[] {
  const values = ["Cross-disciplinary bibliographic database", "Field-specific bibliographic database", "Citation chaining"];
  if (route.intent === "secondary-data") values.push("Trusted data repository", "Data catalogue", "Repository documentation");
  if (route.intent === "evidence-synthesis") values.push("Study or trial registry", "Grey-literature source", "Relevant regional database");
  if (route.methodFamily === "qualitative" || route.methodFamily === "mixed-methods") values.push("Qualitative or social-science index");
  return uniqueTrimmed(values);
}

export function createDefaultEvidenceStrategy(
  route: ProposalEvidenceRoute,
  selectedQuestionIds: readonly string[],
): ProposalEvidenceStrategy {
  return {
    questionIds: uniqueTrimmed(selectedQuestionIds),
    concepts: [],
    synonyms: [],
    sourceTypes: [],
    eligibilityNotes: "",
    searchVersions: [],
    stoppingRationale: "",
  };
}

export function appendEvidenceSearchVersion(
  strategy: ProposalEvidenceStrategy,
  input: {
    query: string;
    sourceSystems: readonly string[];
    runAt?: string | null;
    resultCount?: number | null;
  },
): ProposalEvidenceStrategy {
  const query = input.query.trim();
  const sourceSystems = uniqueTrimmed(input.sourceSystems);
  if (!query) throw new Error("A search query is required before saving a version.");
  if (sourceSystems.length === 0) throw new Error("At least one source system is required before saving a version.");
  if (input.runAt !== undefined && input.runAt !== null && !Number.isFinite(Date.parse(input.runAt))) throw new Error("Search run time is invalid.");
  if (input.resultCount !== undefined && input.resultCount !== null && (!Number.isSafeInteger(input.resultCount) || input.resultCount < 0)) throw new Error("Search result count is invalid.");
  let version = Math.max(0, ...strategy.searchVersions.map((item) => item.version)) + 1;
  const ids = new Set(strategy.searchVersions.map((item) => item.id));
  while (ids.has(`search-v${version}`)) version += 1;
  const next: EvidenceSearchVersion = {
    id: `search-v${version}`,
    version,
    query,
    sourceSystems,
    runAt: input.runAt ?? null,
    resultCount: input.resultCount ?? null,
  };
  return { ...strategy, searchVersions: [...strategy.searchVersions, next] };
}

export function compileEvidenceStrategy(input: {
  route: ProposalEvidenceRoute;
  selectedQuestionIds: readonly string[];
  strategy: ProposalEvidenceStrategy;
}): EvidenceStrategyCompilation {
  const selectedQuestionIds = uniqueTrimmed(input.selectedQuestionIds);
  const linkedQuestionIds = uniqueTrimmed(input.strategy.questionIds);
  const issues: EvidenceStrategyIssue[] = [];
  const missingQuestions = selectedQuestionIds.filter((id) => !linkedQuestionIds.includes(id));
  const unknownQuestions = linkedQuestionIds.filter((id) => !selectedQuestionIds.includes(id));
  if (selectedQuestionIds.length === 0) issues.push({ id: "selected-question-required", severity: "blocking", message: "Select at least one Stage 1 research question before planning evidence." });
  if (missingQuestions.length > 0) issues.push({ id: "question-coverage", severity: "blocking", message: `${missingQuestions.length} selected research question${missingQuestions.length === 1 ? " is" : "s are"} not linked to this strategy.` });
  if (unknownQuestions.length > 0) issues.push({ id: "stale-question-link", severity: "blocking", message: "The strategy contains links to questions that are no longer selected in Stage 1." });
  if (uniqueTrimmed(input.strategy.concepts).length === 0) issues.push({ id: "concept-required", severity: "blocking", message: "Record at least one searchable concept drawn from the selected questions." });
  if (uniqueTrimmed(input.strategy.synonyms).length === 0) issues.push({ id: "synonym-required", severity: "blocking", message: "Record at least one alternate term, spelling, subject heading, or related phrase." });
  if (uniqueTrimmed(input.strategy.sourceTypes).length === 0) issues.push({ id: "source-type-required", severity: "blocking", message: "Choose the kinds of evidence that can answer the questions." });
  if (!input.strategy.eligibilityNotes.trim()) issues.push({ id: "eligibility-required", severity: "blocking", message: "Define what should be considered eligible, ineligible, or out of scope." });
  if (input.strategy.searchVersions.length === 0) issues.push({ id: "search-version-required", severity: "blocking", message: "Save at least one immutable search version." });
  if (!input.strategy.stoppingRationale.trim()) issues.push({ id: "stopping-rationale-required", severity: "blocking", message: "Record a defensible stopping or update rationale." });
  if (input.strategy.searchVersions.some((item) => !item.query.trim() || item.sourceSystems.length === 0)) issues.push({ id: "invalid-search-version", severity: "blocking", message: "Every search version needs a query and at least one source system." });
  const hasRun = input.strategy.searchVersions.some((item) => item.runAt !== null);
  if (input.route.intent === "evidence-synthesis" && !hasRun) issues.push({ id: "synthesis-run-required", severity: "blocking", message: "An evidence-synthesis proposal must record at least one executed search with a run date." });
  if (input.route.intent !== "evidence-synthesis" && input.strategy.searchVersions.length > 0 && !hasRun) issues.push({ id: "run-log-advisory", severity: "advisory", message: "The strategy is planned but no executed search has been logged yet. Add run details when searching begins." });
  if (input.route.intent === "evidence-synthesis" && input.strategy.searchVersions.some((item) => item.runAt !== null && item.resultCount === null)) issues.push({ id: "synthesis-result-count", severity: "advisory", message: "Record result counts for executed review searches to support later flow reporting." });
  return {
    schemaVersion: PROPOSAL_EVIDENCE_PHASE3_VERSION,
    route: input.route,
    routeLabel: routeLabel(input.route),
    recommendedSourceTypes: recommendedEvidenceSourceTypes(input.route),
    recommendedSourceSystems: recommendedEvidenceSourceSystems(input.route),
    guidanceSources: [...EVIDENCE_GUIDANCE_SOURCES],
    issues,
    ready: !issues.some((issue) => issue.severity === "blocking"),
    claim: "planning-and-documentation-aid-not-search-completeness-methodological-quality-or-inclusion-certification",
  };
}

export const EVIDENCE_APPRAISAL_LENSES: readonly EvidenceAppraisalLens[] = [
  {
    id: "general-source",
    label: "General scholarly source",
    description: "For reports, guidance, conceptual papers, and sources that do not fit a study-design-specific lens.",
    authorityName: "Cerise project-specific evidence review",
    authorityVersion: "Phase 3 v1",
    authorityUrl: "https://casp-uk.net/casp-tools-checklists/",
    criteria: [
      { id: "relevance", prompt: "Does this source directly inform a selected question or claim in this project?" },
      { id: "provenance", prompt: "Are authorship, publication context, date, and source provenance sufficiently clear?" },
      { id: "basis", prompt: "Is the basis for the source’s main claims transparent enough to inspect?" },
      { id: "scope", prompt: "Are the population, context, concepts, or boundaries relevant to the intended use?" },
      { id: "limitations", prompt: "Are important limitations, conflicts, corrections, or uncertainties identified?" },
    ],
    claim: "cerise-structured-lens-inspired-by-authoritative-guidance-not-a-licensed-reproduction-or-universal-score",
  },
  {
    id: "quantitative-study",
    label: "Quantitative study",
    description: "A design-aware planning lens for quantitative empirical studies; use the controlling risk-of-bias tool when required.",
    authorityName: "JBI Critical Appraisal Tools registry",
    authorityVersion: "Registry accessed 2026-08-05",
    authorityUrl: "https://jbi.global/critical-appraisal-tools",
    criteria: [
      { id: "design-fit", prompt: "Is the design appropriate for the question the study claims to answer?" },
      { id: "sample-selection", prompt: "Could selection, allocation, or comparison-group formation materially bias the result?" },
      { id: "measurement", prompt: "Are exposures, interventions, outcomes, and measures defined and measured credibly?" },
      { id: "missingness", prompt: "Are missing data, attrition, exclusions, and deviations handled transparently?" },
      { id: "analysis-uncertainty", prompt: "Does the analysis address confounding and report uncertainty appropriate to the design?" },
    ],
    claim: "cerise-structured-lens-inspired-by-authoritative-guidance-not-a-licensed-reproduction-or-universal-score",
  },
  {
    id: "qualitative-study",
    label: "Qualitative study",
    description: "A project review lens inspired by CASP’s qualitative appraisal domains, without reproducing or scoring the checklist.",
    authorityName: "CASP Qualitative Studies Checklist",
    authorityVersion: "Current page accessed 2026-08-05",
    authorityUrl: "https://casp-uk.net/casp-tools-checklists/qualitative-studies-checklist/",
    criteria: [
      { id: "method-congruence", prompt: "Are the qualitative approach and design congruent with the study aim?" },
      { id: "context-sampling", prompt: "Are context, participant selection, and data generation described well enough for this use?" },
      { id: "reflexivity-ethics", prompt: "Are researcher influence, relationships, and ethical considerations addressed?" },
      { id: "analysis-trace", prompt: "Can the reader follow how data were transformed into themes, interpretations, or findings?" },
      { id: "grounding-transfer", prompt: "Are interpretations grounded in evidence and bounded to an appropriate context?" },
    ],
    claim: "cerise-structured-lens-inspired-by-authoritative-guidance-not-a-licensed-reproduction-or-universal-score",
  },
  {
    id: "mixed-methods-study",
    label: "Mixed-methods study",
    description: "For studies combining qualitative and quantitative components and making an integration claim.",
    authorityName: "Mixed Methods Appraisal Tool",
    authorityVersion: "MMAT 2018",
    authorityUrl: "https://escholarship.mcgill.ca/downloads/v118rj210",
    criteria: [
      { id: "rationale", prompt: "Is there a clear rationale for using more than one methodological component?" },
      { id: "strand-quality", prompt: "Are the qualitative and quantitative components each credible for their stated purpose?" },
      { id: "integration", prompt: "Are the components integrated in a way that answers the mixed-methods question?" },
      { id: "divergence", prompt: "Are divergent or inconsistent findings examined rather than hidden?" },
      { id: "whole-inference", prompt: "Do the combined interpretations remain supported by the component evidence and integration process?" },
    ],
    claim: "cerise-structured-lens-inspired-by-authoritative-guidance-not-a-licensed-reproduction-or-universal-score",
  },
  {
    id: "secondary-dataset",
    label: "Dataset fitness and provenance",
    description: "For judging whether an existing dataset is fit for a specific proposed use, not whether the dataset is universally good.",
    authorityName: "Cerise data-fitness planning lens",
    authorityVersion: "Phase 3 v1",
    authorityUrl: "https://jbi.global/critical-appraisal-tools",
    criteria: [
      { id: "rights-provenance", prompt: "Are provenance, access conditions, licensing, and permitted uses clear?" },
      { id: "coverage", prompt: "Does the dataset cover the population, period, setting, and units needed for this question?" },
      { id: "construct-fit", prompt: "Do available variables and collection procedures represent the concepts the project needs?" },
      { id: "quality-missingness", prompt: "Are missingness, exclusions, linkage, revisions, and known quality issues documented?" },
      { id: "reproducibility", prompt: "Can the exact dataset version, documentation, and transformation lineage be cited and recovered?" },
    ],
    claim: "cerise-structured-lens-inspired-by-authoritative-guidance-not-a-licensed-reproduction-or-universal-score",
  },
  {
    id: "evidence-synthesis",
    label: "Review or synthesis report",
    description: "For appraising an existing review or synthesis as a source within this project.",
    authorityName: "CASP Systematic Review Checklist and Cochrane Handbook",
    authorityVersion: "Current registries accessed 2026-08-05",
    authorityUrl: "https://casp-uk.net/casp-tools-checklists/",
    criteria: [
      { id: "question-protocol", prompt: "Is the review question clear and is a protocol or pre-specified method available?" },
      { id: "search-selection", prompt: "Are search sources, dates, strategies, eligibility decisions, and selection processes transparent?" },
      { id: "appraisal", prompt: "Were included studies appraised with methods suited to their designs?" },
      { id: "synthesis-fit", prompt: "Is the synthesis method appropriate to the evidence and heterogeneity?" },
      { id: "certainty-limits", prompt: "Are missing evidence, uncertainty, limitations, and applicability addressed?" },
    ],
    claim: "cerise-structured-lens-inspired-by-authoritative-guidance-not-a-licensed-reproduction-or-universal-score",
  },
] as const;

export function getEvidenceAppraisalLens(id: string): EvidenceAppraisalLens {
  return EVIDENCE_APPRAISAL_LENSES.find((lens) => lens.id === id) ?? EVIDENCE_APPRAISAL_LENSES[0];
}

export function recommendedEvidenceAppraisalLens(
  route: ProposalEvidenceRoute,
  docType: string | null | undefined,
): EvidenceAppraisalLensId {
  const type = docType?.toLowerCase() ?? "";
  if (/dataset|data set|data documentation|codebook/.test(type) || route.intent === "secondary-data") return "secondary-dataset";
  if (/systematic review|meta-analysis|scoping review|evidence synthesis/.test(type) || route.intent === "evidence-synthesis") return "evidence-synthesis";
  if (/qualitative|ethnograph|phenomenolog|grounded theory|interview|focus group/.test(type) || route.methodFamily === "qualitative") return "qualitative-study";
  if (/mixed[- ]methods?/.test(type) || route.methodFamily === "mixed-methods") return "mixed-methods-study";
  if (/trial|cohort|case.control|cross.section|quantitative|observational|experimental/.test(type) || route.methodFamily === "quantitative") return "quantitative-study";
  return "general-source";
}

export function createEvidenceAppraisalItems(lensId: EvidenceAppraisalLensId): ProjectEvidenceAppraisalItem[] {
  return getEvidenceAppraisalLens(lensId).criteria.map((criterion) => ({
    criterionId: criterion.id,
    prompt: criterion.prompt,
    answer: "unclear",
    rationale: "",
  }));
}

export function compileEvidenceReview(input: {
  selectedQuestionIds: readonly string[];
  assessments: readonly ProjectEvidenceAssessment[];
}): EvidenceReviewCompilation {
  const selectedQuestionIds = uniqueTrimmed(input.selectedQuestionIds);
  const selectedSet = new Set(selectedQuestionIds);
  const issues: EvidenceReviewIssue[] = [];
  const included = input.assessments.filter((item) => item.status === "included");
  const excluded = input.assessments.filter((item) => item.status === "excluded");
  const unresolved = input.assessments.filter((item) => item.status === "candidate" || item.status === "awaiting-review");
  if (input.assessments.length === 0) issues.push({ id: "review-source-required", severity: "blocking", message: "Add at least one Evidence Library source to the project review ledger.", assessmentId: null, questionId: null });
  if (unresolved.length > 0) issues.push({ id: "unresolved-decisions", severity: "blocking", message: `${unresolved.length} source decision${unresolved.length === 1 ? " remains" : "s remain"} unresolved.`, assessmentId: null, questionId: null });
  for (const assessment of input.assessments) {
    const unknownQuestion = assessment.linkedQuestionIds.find((id) => !selectedSet.has(id));
    if (unknownQuestion) issues.push({ id: `stale-question-${assessment.assessmentId}`, severity: "blocking", message: "This source links to a question that is no longer selected.", assessmentId: assessment.assessmentId, questionId: unknownQuestion });
    if (assessment.status === "included" && assessment.linkedQuestionIds.length === 0) issues.push({ id: `included-link-${assessment.assessmentId}`, severity: "blocking", message: "Included evidence must link to at least one selected research question.", assessmentId: assessment.assessmentId, questionId: null });
    if ((assessment.status === "included" || assessment.status === "excluded") && assessment.appraisal.length === 0) issues.push({ id: `appraisal-${assessment.assessmentId}`, severity: "blocking", message: "Complete a structured appraisal before finalizing this decision.", assessmentId: assessment.assessmentId, questionId: null });
    const unexplained = assessment.appraisal.find((item) => item.answer !== "yes" && !item.rationale.trim());
    if ((assessment.status === "included" || assessment.status === "excluded") && unexplained) issues.push({ id: `appraisal-rationale-${assessment.assessmentId}-${unexplained.criterionId}`, severity: "blocking", message: "Explain every No, Unclear, or Not applicable appraisal response.", assessmentId: assessment.assessmentId, questionId: null });
  }
  const coveredQuestionIds = selectedQuestionIds.filter((questionId) => included.some((assessment) => assessment.linkedQuestionIds.includes(questionId)));
  for (const questionId of selectedQuestionIds.filter((id) => !coveredQuestionIds.includes(id))) {
    issues.push({ id: `question-evidence-${questionId}`, severity: "blocking", message: "No reviewed included source is linked to this selected question.", assessmentId: null, questionId });
  }
  if (included.some((assessment) => assessment.caveats.length === 0)) issues.push({ id: "caveat-advisory", severity: "advisory", message: "At least one included source has no recorded caveat; confirm that this is intentional.", assessmentId: null, questionId: null });
  return {
    schemaVersion: PROPOSAL_EVIDENCE_PHASE3_VERSION,
    includedCount: included.length,
    excludedCount: excluded.length,
    unresolvedCount: unresolved.length,
    coveredQuestionIds,
    issues,
    ready: selectedQuestionIds.length > 0 && !issues.some((issue) => issue.severity === "blocking"),
    claim: "researcher-owned-project-review-not-global-quality-score-truth-or-novelty-certification",
  };
}

export async function createEvidenceLibraryReference(row: EvidenceLibraryRow): Promise<ResearchArtifactReference> {
  const identity = await createResearchArtifactIdentity({
    artifactKind: "evidence-library",
    artifactId: row.id,
    artifactSchemaVersion: 1,
    payload: {
      id: row.id,
      projectId: row.project_id,
      pdfId: row.pdf_id,
      source: row.source,
      title: row.title,
      documentType: row.doc_type,
      evidence: row.evidence,
      caveat: row.caveat,
      status: row.status,
      citation: row.citation,
      url: row.url,
      createdAt: row.created_at,
      participantDataIncluded: false,
    },
  });
  return {
    artifactKind: identity.artifactKind,
    artifactId: identity.artifactId,
    schemaVersion: identity.artifactSchemaVersion,
    checksum: identity.checksum,
  };
}

export function assessmentIdForEvidenceSource(sourceId: string): string {
  const normalized = sourceId.toLowerCase().replace(/[^a-z0-9._:-]/g, "-").replace(/-+/g, "-").slice(0, 120);
  if (!normalized) throw new Error("Evidence source ID cannot create an assessment identity.");
  return `review-${normalized}`;
}
