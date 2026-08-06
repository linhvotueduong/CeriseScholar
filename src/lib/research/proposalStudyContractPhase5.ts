import type {
  AssignmentStrategy,
  DataSensitivity,
  MethodFamily,
  ParticipantAudience,
  ResearchIntent,
  ResearchSetting,
  SpecialProcedure,
} from "./projectRouteProfile";
import {
  PROPOSED_STUDY_CONTRACT_SCHEMA_VERSION,
  type ClaimEvidenceMap,
  type ProposedStudyContract,
  type ProposedStudyContractEntry,
} from "./researchProposalDocument";

export const PROPOSAL_STUDY_CONTRACT_PHASE5_VERSION = 1 as const;

export type ProposalStudyRoute = {
  intent: ResearchIntent | "undetermined";
  methodFamily: MethodFamily | "undetermined";
  assignment: AssignmentStrategy | "undetermined";
  setting: ResearchSetting | "undetermined";
  audience: ParticipantAudience | "undetermined";
  dataSensitivity: DataSensitivity | "undetermined";
  possibleSpecialProcedures: SpecialProcedure[];
};

export interface ProposalStudyQuestion {
  id: string;
  text: string;
  family: string | null;
  scope: {
    populationOrSource: string;
    setting: string;
    constructOrPhenomenon: string;
    timeframe: string;
    comparison: string;
    evidenceAccess: string;
  };
}

export type StudyContractFieldKey =
  | "purpose"
  | "evidenceNeed"
  | "populationOrSource"
  | "proposedMethod"
  | "analysisDirection"
  | "uncertainty";

export interface StudyContractGuidanceSource {
  id: string;
  name: string;
  version: string;
  sourceUrl: string;
  accessedAt: string;
  role: "rigor" | "quantitative-reporting" | "qualitative-reporting" | "mixed-methods" | "secondary-data" | "review-protocol" | "human-subjects";
  boundary: "planning-prompt-not-design-prescription-quality-score-compliance-or-approval";
}

export interface StudyContractRouteGuidance {
  routeLabel: string;
  populationOrSourceLabel: string;
  populationOrSourcePrompt: string;
  routePrompts: string[];
  suggestions: Record<StudyContractFieldKey, string[]>;
}

export interface StudyContractIssue {
  id: string;
  severity: "blocking" | "advisory";
  message: string;
  entryId: string | null;
  questionId: string | null;
  field: StudyContractFieldKey | "feasibilityNotes" | "accessNotes" | "ethicsAndSensitivityNotes" | "route" | null;
}

export interface StudyContractQuestionSummary {
  questionId: string;
  entryIds: string[];
  gapClaimIds: string[];
  completedFields: number;
  totalFields: 6;
  ready: boolean;
}

export interface StudyContractCompilation {
  schemaVersion: typeof PROPOSAL_STUDY_CONTRACT_PHASE5_VERSION;
  route: ProposalStudyRoute;
  guidance: StudyContractRouteGuidance;
  guidanceSources: StudyContractGuidanceSource[];
  questionSummaries: StudyContractQuestionSummary[];
  staleEntryIds: string[];
  issues: StudyContractIssue[];
  ready: boolean;
  claim: "proposal-level-study-intent-not-runnable-implementation-methodological-validation-ethical-approval-compliance-or-preregistration";
}

const ACCESSED_AT = "2026-08-05";
const ENTRY_FIELDS: readonly StudyContractFieldKey[] = ["purpose", "evidenceNeed", "populationOrSource", "proposedMethod", "analysisDirection", "uncertainty"];

export const STUDY_CONTRACT_GUIDANCE_SOURCES: readonly StudyContractGuidanceSource[] = [
  {
    id: "nih-rigor-reproducibility-2024",
    name: "NIH Enhancing Reproducibility through Rigor and Transparency",
    version: "Page updated September 9, 2024; accessed 2026-08-05",
    sourceUrl: "https://www.grants.nih.gov/policy-and-compliance/policy-topics/reproducibility",
    accessedAt: ACCESSED_AT,
    role: "rigor",
    boundary: "planning-prompt-not-design-prescription-quality-score-compliance-or-approval",
  },
  {
    id: "strobe-current-registry",
    name: "STROBE reporting guideline registry",
    version: "EQUATOR record updated June 8, 2026",
    sourceUrl: "https://www.equator-network.org/reporting-guidelines/strobe/",
    accessedAt: ACCESSED_AT,
    role: "quantitative-reporting",
    boundary: "planning-prompt-not-design-prescription-quality-score-compliance-or-approval",
  },
  {
    id: "jars-qual-mmars-current-registry",
    name: "JARS-Qual and MMARS reporting guideline registry",
    version: "EQUATOR record updated October 1, 2024",
    sourceUrl: "https://www.equator-network.org/reporting-guidelines/journal-article-reporting-standards-for-qualitative-primary-qualitative-meta-analytic-and-mixed-methods-research-in-psychology-the-apa-publications-and-communications-board-task-force-report/",
    accessedAt: ACCESSED_AT,
    role: "qualitative-reporting",
    boundary: "planning-prompt-not-design-prescription-quality-score-compliance-or-approval",
  },
  {
    id: "nih-obssr-mixed-methods-2011",
    name: "NIH OBSSR Best Practices for Mixed Methods Research in the Health Sciences",
    version: "August 2011",
    sourceUrl: "https://obssr.od.nih.gov/research-resources/mixed-methods-research",
    accessedAt: ACCESSED_AT,
    role: "mixed-methods",
    boundary: "planning-prompt-not-design-prescription-quality-score-compliance-or-approval",
  },
  {
    id: "uk-data-service-study-documentation-current",
    name: "UK Data Service study-level documentation guidance",
    version: "Current guidance accessed 2026-08-05",
    sourceUrl: "https://ukdataservice.ac.uk/learning-hub/research-data-management/document-your-data/study-level-documentation/",
    accessedAt: ACCESSED_AT,
    role: "secondary-data",
    boundary: "planning-prompt-not-design-prescription-quality-score-compliance-or-approval",
  },
  {
    id: "prisma-p-2015",
    name: "PRISMA-P protocol guidance",
    version: "PRISMA-P 2015",
    sourceUrl: "https://www.prisma-statement.org/protocols",
    accessedAt: ACCESSED_AT,
    role: "review-protocol",
    boundary: "planning-prompt-not-design-prescription-quality-score-compliance-or-approval",
  },
  {
    id: "hhs-ohrp-guidance-current",
    name: "HHS Office for Human Research Protections guidance registry",
    version: "Page reviewed June 2, 2026",
    sourceUrl: "https://www.hhs.gov/ohrp/regulations-and-policy/guidance/index.html",
    accessedAt: ACCESSED_AT,
    role: "human-subjects",
    boundary: "planning-prompt-not-design-prescription-quality-score-compliance-or-approval",
  },
] as const;

function issue(
  id: string,
  message: string,
  details: Partial<Pick<StudyContractIssue, "severity" | "entryId" | "questionId" | "field">> = {},
): StudyContractIssue {
  return {
    id,
    severity: details.severity ?? "blocking",
    message,
    entryId: details.entryId ?? null,
    questionId: details.questionId ?? null,
    field: details.field ?? null,
  };
}

function routeLabel(route: ProposalStudyRoute): string {
  if (route.intent === "evidence-synthesis") return "Evidence synthesis protocol";
  if (route.intent === "secondary-data") return "Secondary-data study";
  if (route.methodFamily === "qualitative") return "Qualitative primary study";
  if (route.methodFamily === "mixed-methods") return "Mixed-methods primary study";
  if (route.methodFamily === "quantitative") return "Quantitative primary study";
  return "Route awaiting confirmation";
}

function baseSuggestions(): Record<StudyContractFieldKey, string[]> {
  return {
    purpose: ["Describe the question’s role in the proposed study", "State the decision or understanding this question should support"],
    evidenceNeed: ["Specify the observation, comparison, account, record, or synthesis needed to answer the question"],
    populationOrSource: [],
    proposedMethod: [],
    analysisDirection: [],
    uncertainty: ["Feasibility remains to be established", "Measurement or interpretation remains uncertain", "Access or recruitment may constrain the final design"],
  };
}

export function studyContractGuidanceForRoute(route: ProposalStudyRoute): StudyContractRouteGuidance {
  const suggestions = baseSuggestions();
  if (route.intent === "evidence-synthesis") {
    suggestions.populationOrSource = ["Eligible studies, reports, records, or other declared evidence units"];
    suggestions.proposedMethod = ["Systematic review", "Scoping review", "Qualitative evidence synthesis", "Mixed-method evidence synthesis", "Evidence map"];
    suggestions.analysisDirection = ["Structured narrative synthesis", "Meta-analysis with heterogeneity and sensitivity assessment", "Thematic or framework synthesis", "Separate strand synthesis followed by explicit integration"];
    return {
      routeLabel: routeLabel(route),
      populationOrSourceLabel: "Eligible evidence units",
      populationOrSourcePrompt: "Define the reports, studies, records, or other evidence units and the context in which they are eligible.",
      routePrompts: [
        "Keep the review question, eligibility criteria, information sources, selection process, appraisal, and synthesis direction mutually consistent.",
        "State whether the purpose is mapping, estimating, explaining, interpreting, or integrating evidence.",
        "A reporting checklist can prompt completeness; it cannot select or validate the review method.",
      ],
      suggestions,
    };
  }
  if (route.intent === "secondary-data") {
    suggestions.populationOrSource = ["Named dataset version and analysis unit", "Administrative or registry records", "Archived documents or media", "Linked or longitudinal records"];
    suggestions.proposedMethod = ["Cross-sectional secondary analysis", "Longitudinal or panel analysis", "Retrospective cohort analysis", "Archival or computational analysis"];
    suggestions.analysisDirection = ["Data-fitness, provenance, coverage, and missingness assessment before substantive analysis", "Descriptive estimates with uncertainty", "Regression or model-based comparison with confounding assessment", "Sensitivity analysis across defensible data decisions"];
    return {
      routeLabel: routeLabel(route),
      populationOrSourceLabel: "Dataset, records, and analysis unit",
      populationOrSourcePrompt: "Name the source/version, unit of analysis, population coverage, period, setting, and required variables or materials.",
      routePrompts: [
        "Separate the scientific question from what the available data can validly represent.",
        "Plan provenance, version, permissions, linkage, missingness, coverage, measurement fit, and reproducible transformations.",
        "Access to a dataset does not establish construct validity, representativeness, lawful use, or methodological fitness.",
      ],
      suggestions,
    };
  }
  if (route.methodFamily === "qualitative") {
    suggestions.populationOrSource = ["People with relevant lived or professional experience", "A bounded case, organization, community, or setting", "Documents, interactions, observations, or cultural materials"];
    suggestions.proposedMethod = ["Semi-structured interviews", "Focus groups", "Ethnographic observation", "Case study", "Qualitative document or media analysis"];
    suggestions.analysisDirection = ["Reflexive thematic analysis", "Framework analysis", "Grounded-theory analysis", "Interpretative phenomenological analysis", "Narrative or discourse analysis"];
    return {
      routeLabel: routeLabel(route),
      populationOrSourceLabel: "Participants, cases, contexts, or materials",
      populationOrSourcePrompt: "Describe who or what can illuminate the phenomenon, how context matters, and the intended sampling logic.",
      routePrompts: [
        "Align the qualitative tradition, sampling logic, data generation, analytic approach, reflexivity, and intended interpretive claim.",
        "Treat context, researcher positioning, participant meaning, and divergent cases as part of the design—not residual noise.",
        "Do not force hypotheses, statistical power, variables, or effect-size language onto an interpretive question.",
      ],
      suggestions,
    };
  }
  if (route.methodFamily === "mixed-methods") {
    suggestions.populationOrSource = ["Participants or cases contributing quantitative and qualitative evidence", "Linked quantitative records and qualitative accounts", "Separate samples connected through an explicit integration plan"];
    suggestions.proposedMethod = ["Convergent mixed-methods design", "Explanatory sequential mixed-methods design", "Exploratory sequential mixed-methods design", "Embedded mixed-methods design"];
    suggestions.analysisDirection = ["Analyze strands appropriately, then integrate through comparison or a joint display", "Use quantitative results to select or shape the qualitative phase, then integrate interpretations", "Use qualitative findings to build the quantitative phase, then evaluate and integrate"];
    return {
      routeLabel: routeLabel(route),
      populationOrSourceLabel: "Quantitative and qualitative samples or sources",
      populationOrSourcePrompt: "Describe each strand’s sample or source and how the strands connect at recruitment, collection, analysis, or interpretation.",
      routePrompts: [
        "State why mixing methods is necessary, not merely that two kinds of data will be collected.",
        "Make timing, priority, dependency, and the point of integration inspectable.",
        "Preserve credible strand-specific methods and explain how divergence will be examined rather than hidden.",
      ],
      suggestions,
    };
  }
  suggestions.populationOrSource = ["Target population and sampling frame", "Experimental units and comparison conditions", "Repeated observations from a defined cohort", "A bounded survey population"];
  suggestions.proposedMethod = ["Randomized between-subject experiment", "Within-subject experiment", "Cross-sectional survey", "Prospective cohort study", "Quasi-experimental comparison"];
  suggestions.analysisDirection = ["Descriptive estimates with uncertainty", "Between-group or within-person comparison", "Regression or model-based association with confounding assessment", "Longitudinal model with attrition and missingness assessment"];
  return {
    routeLabel: routeLabel(route),
    populationOrSourceLabel: "Population, sample, and units",
    populationOrSourcePrompt: "Define the target population, units, setting, sampling or assignment frame, conditions, and timeframe relevant to this question.",
    routePrompts: [
      "Align design, sampling or assignment, measures, comparison, analysis, and the strength of inference the study could support.",
      "Plan bias reduction, missingness, exclusions, uncertainty, and sensitivity checks before results exist.",
      "A reporting guideline can expose missing plan details; it cannot certify that a design is valid or sufficiently powered.",
    ],
    suggestions,
  };
}

function entryId(existingEntries: readonly ProposedStudyContractEntry[], questionId: string): string {
  const ids = new Set(existingEntries.map((entry) => entry.id));
  const direct = `study-${questionId}`.slice(0, 160);
  if (/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(direct) && !ids.has(direct)) return direct;
  let index = existingEntries.length + 1;
  while (ids.has(`study-entry-${String(index).padStart(3, "0")}`)) index += 1;
  return `study-entry-${String(index).padStart(3, "0")}`;
}

function routeSnapshot(route: ProposalStudyRoute): NonNullable<ProposedStudyContract["routeSnapshot"]> {
  return {
    assignment: route.assignment,
    setting: route.setting,
    audience: route.audience,
    dataSensitivity: route.dataSensitivity,
    possibleSpecialProcedures: [...route.possibleSpecialProcedures].sort(),
  };
}

function contractMatchesRoute(contract: ProposedStudyContract, route: ProposalStudyRoute): boolean {
  const snapshot = contract.routeSnapshot;
  return contract.intent === route.intent
    && contract.methodFamily === route.methodFamily
    && snapshot !== undefined
    && snapshot !== null
    && snapshot.assignment === route.assignment
    && snapshot.setting === route.setting
    && snapshot.audience === route.audience
    && snapshot.dataSensitivity === route.dataSensitivity
    && JSON.stringify([...snapshot.possibleSpecialProcedures].sort()) === JSON.stringify([...route.possibleSpecialProcedures].sort());
}

export function createProposedStudyContractEntry(
  existingEntries: readonly ProposedStudyContractEntry[],
  question: ProposalStudyQuestion,
): ProposedStudyContractEntry {
  return {
    id: entryId(existingEntries, question.id),
    questionId: question.id,
    purpose: "",
    evidenceNeed: "",
    populationOrSource: question.scope.populationOrSource,
    proposedMethod: "",
    analysisDirection: "",
    uncertainty: "",
  };
}

export function createProposedStudyContractDraft(input: {
  current: ProposedStudyContract;
  questions: readonly ProposalStudyQuestion[];
  route: ProposalStudyRoute;
}): ProposedStudyContract {
  const entries = [...input.current.entries];
  const representedQuestionIds = new Set(entries.map((entry) => entry.questionId));
  for (const question of input.questions) {
    if (representedQuestionIds.has(question.id)) continue;
    const next = createProposedStudyContractEntry(entries, question);
    entries.push(next);
    representedQuestionIds.add(question.id);
  }
  return {
    ...input.current,
    intent: input.current.intent === "undetermined" ? input.route.intent : input.current.intent,
    methodFamily: input.current.methodFamily === "undetermined" ? input.route.methodFamily : input.current.methodFamily,
    routeSnapshot: input.current.routeSnapshot ?? (input.current.entries.length === 0 ? routeSnapshot(input.route) : null),
    entries,
  };
}

export function alignProposedStudyContractRoute(contract: ProposedStudyContract, route: ProposalStudyRoute): ProposedStudyContract {
  return { ...contract, intent: route.intent, methodFamily: route.methodFamily, routeSnapshot: routeSnapshot(route) };
}

export function createProposedStudyContract(input: {
  route: ProposalStudyRoute;
  entries: readonly ProposedStudyContractEntry[];
  feasibilityNotes: string;
  accessNotes: string;
  ethicsAndSensitivityNotes: string;
}): ProposedStudyContract {
  const ids = new Set<string>();
  return {
    schemaVersion: PROPOSED_STUDY_CONTRACT_SCHEMA_VERSION,
    intent: input.route.intent,
    methodFamily: input.route.methodFamily,
    routeSnapshot: routeSnapshot(input.route),
    entries: input.entries.map((entry) => {
      if (!entry.id || ids.has(entry.id)) throw new Error("Every Proposed Study Contract entry needs a unique stable ID.");
      ids.add(entry.id);
      return { ...entry, questionId: entry.questionId.trim() };
    }),
    feasibilityNotes: input.feasibilityNotes,
    accessNotes: input.accessNotes,
    ethicsAndSensitivityNotes: input.ethicsAndSensitivityNotes,
    implementationDeferredToStage3: true,
    claim: "proposal-intent-not-runnable-study-methodological-validation-or-ethical-approval",
  };
}

export function compileProposedStudyContract(input: {
  route: ProposalStudyRoute;
  questions: readonly ProposalStudyQuestion[];
  claimEvidenceMap: ClaimEvidenceMap;
  contract: ProposedStudyContract;
  synthesisReady: boolean;
}): StudyContractCompilation {
  const questions = input.questions.filter((question, index, values) => question.id && values.findIndex((candidate) => candidate.id === question.id) === index);
  const questionIds = new Set(questions.map((question) => question.id));
  const issues: StudyContractIssue[] = [];
  const entriesByQuestion = new Map<string, ProposedStudyContractEntry[]>();
  for (const entry of input.contract.entries) {
    const entries = entriesByQuestion.get(entry.questionId) ?? [];
    entries.push(entry);
    entriesByQuestion.set(entry.questionId, entries);
  }

  if (!input.synthesisReady) issues.push(issue("synthesis-not-ready", "Finish the current Evidence Synthesis and Gap Studio before finalizing the proposed study."));
  if (questions.length === 0) issues.push(issue("selected-question-required", "Select at least one Stage 1 research question before defining the proposed study."));
  if (input.route.intent === "undetermined" || input.route.methodFamily === "undetermined") issues.push(issue("route-required", "Confirm the Stage 1 research intent and method family before defining the study.", { field: "route" }));
  if (!contractMatchesRoute(input.contract, input.route)) {
    issues.push(issue("route-drift", "The saved contract was created for a different Stage 1 route. Review the implications, then explicitly align it to the current route.", { field: "route" }));
  }

  const staleEntryIds = input.contract.entries.filter((entry) => !questionIds.has(entry.questionId)).map((entry) => entry.id);
  for (const entryIdValue of staleEntryIds) issues.push(issue(`stale-entry-${entryIdValue}`, "This study entry belongs to a question that is no longer selected. Remove it only after reviewing whether its content should be preserved elsewhere.", { entryId: entryIdValue }));

  const questionSummaries = questions.map((question) => {
    const entries = entriesByQuestion.get(question.id) ?? [];
    const gapClaimIds = input.claimEvidenceMap.claims.filter((claim) => claim.kind === "gap" && claim.status === "researcher-reviewed" && claim.questionIds.includes(question.id)).map((claim) => claim.id);
    if (entries.length === 0) issues.push(issue(`missing-entry-${question.id}`, "Create a Proposed Study Contract entry for this selected question.", { questionId: question.id }));
    if (entries.length > 1) issues.push(issue(`duplicate-entry-${question.id}`, "This selected question has more than one Proposed Study Contract entry. Merge them into one explicit plan.", { questionId: question.id }));
    if (gapClaimIds.length === 0) issues.push(issue(`gap-link-${question.id}`, "This question no longer has a researcher-reviewed gap in the current synthesis map.", { questionId: question.id }));
    const entry = entries[0];
    let completedFields = 0;
    if (entry) {
      for (const field of ENTRY_FIELDS) {
        if (entry[field].trim()) completedFields += 1;
        else issues.push(issue(`entry-${field}-${entry.id}`, `Complete ${field === "populationOrSource" ? "population or source" : field.replace(/([A-Z])/g, " $1").toLowerCase()} for this question.`, { entryId: entry.id, questionId: question.id, field }));
      }
      if (entry.purpose.trim().toLocaleLowerCase() === question.text.trim().toLocaleLowerCase()) {
        issues.push(issue(`purpose-restates-question-${entry.id}`, "The purpose currently repeats the question. Explain what role answering it plays in the proposed study.", { severity: "advisory", entryId: entry.id, questionId: question.id, field: "purpose" }));
      }
      if (entry.evidenceNeed.trim() && entry.evidenceNeed.trim().toLocaleLowerCase() === entry.purpose.trim().toLocaleLowerCase()) {
        issues.push(issue(`evidence-restates-purpose-${entry.id}`, "The evidence need repeats the purpose. Specify what observation, comparison, account, record, or synthesis is actually needed.", { severity: "advisory", entryId: entry.id, questionId: question.id, field: "evidenceNeed" }));
      }
    }
    return { questionId: question.id, entryIds: entries.map((entryValue) => entryValue.id), gapClaimIds, completedFields, totalFields: 6 as const, ready: entries.length === 1 && gapClaimIds.length > 0 && completedFields === 6 };
  });

  const globalFields = [
    ["feasibilityNotes", input.contract.feasibilityNotes, "Record constraints, resources, timing, dependencies, and what would make the study infeasible."],
    ["accessNotes", input.contract.accessNotes, "Record recruitment, site, dataset, material, permission, language, technology, or other access dependencies."],
    ["ethicsAndSensitivityNotes", input.contract.ethicsAndSensitivityNotes, "Record participant-rights, privacy, sensitivity, data-use, community, or other ethics questions that Stage 3 must resolve."],
  ] as const;
  for (const [field, value, message] of globalFields) if (!value.trim()) issues.push(issue(`global-${field}`, message, { field }));

  if (input.route.assignment === "randomized") issues.push(issue("randomization-handoff", "Stage 1 selected randomized assignment. Stage 3 must implement and verify allocation; this proposal text cannot perform it.", { severity: "advisory", field: "route" }));
  if (input.route.possibleSpecialProcedures.length > 0) issues.push(issue("special-procedure-handoff", `Stage 1 flagged possible ${input.route.possibleSpecialProcedures.join(", ")} procedures. Keep them provisional and resolve their implementation and governance in Stage 3.`, { severity: "advisory", field: "ethicsAndSensitivityNotes" }));
  if (input.route.dataSensitivity === "identifiable" || input.route.dataSensitivity === "restricted") issues.push(issue("sensitive-data-handoff", `The current route anticipates ${input.route.dataSensitivity} data. Stage 3 must reconcile collection, access, retention, consent, and security controls.`, { severity: "advisory", field: "ethicsAndSensitivityNotes" }));
  if ((input.route.audience === "minor" || input.route.audience === "capacity-limited") && input.route.intent === "primary-data") issues.push(issue("protected-audience-handoff", "The provisional audience requires additional participant-rights planning in Stage 3; this contract is not an approval or legal determination.", { severity: "advisory", field: "ethicsAndSensitivityNotes" }));

  return {
    schemaVersion: PROPOSAL_STUDY_CONTRACT_PHASE5_VERSION,
    route: input.route,
    guidance: studyContractGuidanceForRoute(input.route),
    guidanceSources: [...STUDY_CONTRACT_GUIDANCE_SOURCES],
    questionSummaries,
    staleEntryIds,
    issues,
    ready: !issues.some((candidate) => candidate.severity === "blocking"),
    claim: "proposal-level-study-intent-not-runnable-implementation-methodological-validation-ethical-approval-compliance-or-preregistration",
  };
}
