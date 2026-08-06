import type {
  ProposalPurpose,
  ProposalRequirement,
  ProposalRequirementAuthority,
  ProposalRequirementsProfile,
} from "./researchProposalDocument";
import type { MethodFamily, ResearchIntent } from "./projectRouteProfile";
import {
  normalizeProposalSetupDecision,
  type ProposalRequirementTemplateId,
  type ProposalSetupDecision,
} from "./proposalSetupDecision";

export type { ProposalRequirementTemplateId } from "./proposalSetupDecision";

export const PROPOSAL_REQUIREMENTS_COMPILER_VERSION = 1 as const;
export const PROPOSAL_AUTHORITY_REGISTRY_ACCESSED_AT = "2026-08-05T00:00:00.000Z";

export type ProposalRequirementIssueSeverity = "blocking" | "advisory";

export interface ProposalRequirementIssue {
  id: string;
  severity: ProposalRequirementIssueSeverity;
  message: string;
}

export interface ProposalRequirementTemplateDefinition {
  id: ProposalRequirementTemplateId;
  label: string;
  shortLabel: string;
  description: string;
  authorityIds: string[];
  intendedPurposes: ProposalPurpose[];
  intendedIntents: Array<ResearchIntent | "undetermined">;
  intendedMethods: Array<MethodFamily | "undetermined">;
  planningBoundary: string;
}

export interface ProposalRequirementDraft {
  purpose: ProposalPurpose;
  templateId: ProposalRequirementTemplateId;
  language: string;
  citationStyle: string;
  maximumWords: number | null;
  customNotes: string;
  customRequirementLines: string[];
  customAuthorityName: string;
  customAuthorityVersion: string;
  customAuthorityUrl: string;
  setupDecision?: ProposalSetupDecision;
  researcherConfirmed: boolean;
}

export interface CompiledProposalRequirements {
  compilerVersion: typeof PROPOSAL_REQUIREMENTS_COMPILER_VERSION;
  profile: ProposalRequirementsProfile;
  recommendedTemplateIds: ProposalRequirementTemplateId[];
  issues: ProposalRequirementIssue[];
  ready: boolean;
  claim: "planning-requirements-not-compliance-approval-submission-or-methodological-certification";
}

const authority = (
  authorityId: string,
  kind: ProposalRequirementAuthority["kind"],
  name: string,
  version: string,
  sourceUrl: string,
): ProposalRequirementAuthority => ({
  authorityId,
  kind,
  name,
  version,
  sourceUrl,
  accessedAt: PROPOSAL_AUTHORITY_REGISTRY_ACCESSED_AT,
});

/**
 * Pinned primary-source snapshots used by the compiler. These are planning
 * authorities, not evidence that a proposal complies with a live opportunity,
 * institution, journal, or regulator.
 */
export const PROPOSAL_REQUIREMENT_AUTHORITIES: readonly ProposalRequirementAuthority[] = [
  authority(
    "nih-forms-i-research-plan",
    "funder",
    "NIH and other PHS agencies — PHS 398 Research Plan",
    "SF424 (R&R) Forms Version I; released November 2024; last revised December 2025",
    "https://grants.nih.gov/grants/how-to-apply-application-guide/forms-i/general/g.400-phs-398-research-plan-form.htm",
  ),
  authority(
    "nih-forms-i-application-guide",
    "funder",
    "NIH How to Apply — Application Guide",
    "Forms Version I; page updated December 23, 2025",
    "https://www.grants.nih.gov/grants-process/write-application/how-to-apply-application-guide",
  ),
  authority(
    "nsf-pappg-24-1",
    "funder",
    "U.S. National Science Foundation Proposal & Award Policies & Procedures Guide",
    "NSF 24-1 with policy Supplements 1 (NSF 26-200) and 2 (NSF 26-202)",
    "https://www.nsf.gov/policies/pappg",
  ),
  authority(
    "prisma-p-2015",
    "reporting-guideline",
    "PRISMA-P — Preferred Reporting Items for Systematic Review and Meta-Analysis Protocols",
    "PRISMA-P 2015 statement and checklist",
    "https://www.prisma-statement.org/protocols",
  ),
  authority(
    "jars-qual-mmars-2018",
    "reporting-guideline",
    "APA qualitative and mixed-methods journal article reporting standards",
    "JARS-Qual, MMARS, and QMARS (2018); EQUATOR record updated October 1, 2024",
    "https://www.equator-network.org/reporting-guidelines/journal-article-reporting-standards-for-qualitative-primary-qualitative-meta-analytic-and-mixed-methods-research-in-psychology-the-apa-publications-and-communications-board-task-force-report/",
  ),
] as const;

const AUTHORITY_BY_ID = new Map(PROPOSAL_REQUIREMENT_AUTHORITIES.map((item) => [item.authorityId, item]));

export const PROPOSAL_REQUIREMENT_TEMPLATES: readonly ProposalRequirementTemplateDefinition[] = [
  {
    id: "generic-academic",
    label: "Generic academic proposal",
    shortLabel: "Academic",
    description: "A route-aware proposal structure for theses, dissertations, coursework, and internal review.",
    authorityIds: [],
    intendedPurposes: ["thesis", "dissertation", "coursework", "internal", "custom"],
    intendedIntents: ["primary-data", "secondary-data", "evidence-synthesis", "undetermined"],
    intendedMethods: ["quantitative", "qualitative", "mixed-methods", "evidence-synthesis", "undetermined"],
    planningBoundary: "Institutional and program requirements still control the submitted document.",
  },
  {
    id: "nih-forms-i",
    label: "NIH/PHS research plan — Forms I",
    shortLabel: "NIH Forms I",
    description: "Planning structure for the scientific narrative of a current NIH/PHS research application.",
    authorityIds: ["nih-forms-i-research-plan", "nih-forms-i-application-guide"],
    intendedPurposes: ["funder"],
    intendedIntents: ["primary-data", "secondary-data"],
    intendedMethods: ["quantitative", "qualitative", "mixed-methods"],
    planningBoundary: "The selected Notice of Funding Opportunity and institutional grants office supersede this profile.",
  },
  {
    id: "nsf-pappg-24-1",
    label: "NSF full proposal — PAPPG 24-1",
    shortLabel: "NSF PAPPG",
    description: "Planning structure for a full NSF proposal under the currently published PAPPG and supplements.",
    authorityIds: ["nsf-pappg-24-1"],
    intendedPurposes: ["funder"],
    intendedIntents: ["primary-data", "secondary-data", "evidence-synthesis"],
    intendedMethods: ["quantitative", "qualitative", "mixed-methods", "evidence-synthesis"],
    planningBoundary: "The selected NSF funding opportunity can add, remove, or override PAPPG instructions.",
  },
  {
    id: "prisma-p-2015",
    label: "Systematic review protocol — PRISMA-P",
    shortLabel: "PRISMA-P",
    description: "Protocol-planning structure for a systematic review or meta-analysis.",
    authorityIds: ["prisma-p-2015"],
    intendedPurposes: ["review-protocol", "thesis", "dissertation", "internal"],
    intendedIntents: ["evidence-synthesis"],
    intendedMethods: ["evidence-synthesis"],
    planningBoundary: "PRISMA-P is a reporting guideline and does not certify review quality, registration, or institutional approval.",
  },
  {
    id: "jars-qual-2018",
    label: "Qualitative planning lens — JARS-Qual",
    shortLabel: "JARS-Qual",
    description: "Prospective planning prompts adapted from qualitative article-reporting standards.",
    authorityIds: ["jars-qual-mmars-2018"],
    intendedPurposes: ["thesis", "dissertation", "coursework", "internal", "custom"],
    intendedIntents: ["primary-data", "secondary-data"],
    intendedMethods: ["qualitative"],
    planningBoundary: "JARS-Qual reports completed research; using it prospectively does not validate a proposed method.",
  },
  {
    id: "mmars-2018",
    label: "Mixed-methods planning lens — MMARS",
    shortLabel: "MMARS",
    description: "Prospective planning prompts adapted from mixed-methods article-reporting standards.",
    authorityIds: ["jars-qual-mmars-2018"],
    intendedPurposes: ["thesis", "dissertation", "coursework", "internal", "custom"],
    intendedIntents: ["primary-data", "secondary-data"],
    intendedMethods: ["mixed-methods"],
    planningBoundary: "MMARS reports completed research; using it prospectively does not validate integration or inference quality.",
  },
  {
    id: "researcher-defined",
    label: "Researcher-defined requirements",
    shortLabel: "Custom",
    description: "A transparent profile for a university, course, funder, journal, or other authority not in the registry.",
    authorityIds: [],
    intendedPurposes: ["thesis", "dissertation", "coursework", "internal", "funder", "review-protocol", "custom"],
    intendedIntents: ["primary-data", "secondary-data", "evidence-synthesis", "undetermined"],
    intendedMethods: ["quantitative", "qualitative", "mixed-methods", "evidence-synthesis", "undetermined"],
    planningBoundary: "The researcher must identify and verify the controlling authority and version.",
  },
] as const;

const TEMPLATE_BY_ID = new Map(PROPOSAL_REQUIREMENT_TEMPLATES.map((item) => [item.id, item]));

const requirement = (
  id: string,
  label: string,
  description: string,
  required = true,
  authorityId: string | null = null,
): ProposalRequirement => ({ id, label, description, required, authorityId });

const GENERIC_REQUIREMENTS = [
  requirement("working-title", "Working title and proposal purpose", "State the working title, intended audience, and decision this proposal is meant to support."),
  requirement("background-context", "Background and current context", "Explain the relevant scholarly and practical context without presenting uncertain claims as established facts."),
  requirement("problem-gap", "Problem, uncertainty, and proposed contribution", "Trace the selected problem to what is known, contested, or missing and bound the contribution being proposed."),
  requirement("questions-objectives", "Research questions or objectives", "State each selected question or objective and preserve its relationship to the Stage 1 pathway."),
  requirement("evidence-basis", "Evidence strategy and synthesis", "Describe how relevant sources will be found, appraised, compared, and connected to proposal claims."),
  requirement("proposed-approach", "Proposed approach", "Explain the proposed source of evidence, method family, analysis direction, and important uncertainty without claiming validation."),
  requirement("feasibility-risks", "Feasibility, access, ethics, and limitations", "Record practical dependencies, access constraints, sensitivities, uncertainties, and decisions deferred to later stages."),
  requirement("references", "References and source traceability", "Use the selected citation style and retain source links for claims, figures, and borrowed material."),
];

function routeRequirements(intent: ResearchIntent | "undetermined", method: MethodFamily | "undetermined"): ProposalRequirement[] {
  if (intent === "evidence-synthesis" || method === "evidence-synthesis") {
    return [
      requirement("review-boundary", "Review objective and evidence boundary", "Define the review question, eligible evidence units, coverage limits, and exclusions."),
      requirement("review-search-selection", "Search, selection, and synthesis plan", "Describe information sources, reproducible search logic, selection decisions, appraisal, and synthesis direction."),
    ];
  }
  if (intent === "secondary-data") {
    return [
      requirement("data-source-fit", "Data-source coverage and fitness", "Identify candidate datasets or archives, coverage, measurement limitations, rights, access, and missingness risks."),
      requirement("secondary-analysis", "Secondary analysis direction", "Connect each question to available records, defensible transformations, comparisons, and bounded inferences."),
    ];
  }
  if (method === "qualitative") {
    return [
      requirement("qual-purpose-position", "Qualitative purpose and researcher positioning", "Explain the phenomenon, context, perspective, researcher role, and interpretive commitments relevant to the proposed inquiry."),
      requirement("qual-sampling-analysis", "Information-source and analysis rationale", "Describe how information-rich sources may be identified, documented, interpreted, and checked for credible alternatives."),
    ];
  }
  if (method === "mixed-methods") {
    return [
      requirement("mixed-rationale", "Mixed-methods rationale", "Explain why more than one evidence tradition is needed and what each strand contributes."),
      requirement("mixed-integration", "Sequence, priority, and integration", "Describe the planned relationship among strands and where evidence will be connected, compared, or integrated."),
    ];
  }
  return [
    requirement("primary-evidence-plan", "Primary evidence plan", "Describe the proposed source of primary evidence, constructs or phenomena, collection approach, and analysis direction."),
    requirement("measurement-uncertainty", "Measurement and inference uncertainty", "Identify operational assumptions, plausible sources of bias, precision needs, and decisions deferred to Stage 3."),
  ];
}

function templateRequirements(templateId: ProposalRequirementTemplateId): ProposalRequirement[] {
  if (templateId === "nih-forms-i") {
    return [
      requirement("nih-specific-aims", "Specific Aims", "State the project goals, expected outcomes, and likely effect of the proposed work.", true, "nih-forms-i-research-plan"),
      requirement("nih-significance", "Research Strategy — Significance", "Explain the important problem or barrier and how the proposed project may improve knowledge, capability, or practice.", true, "nih-forms-i-research-plan"),
      requirement("nih-innovation", "Research Strategy — Innovation", "Explain what is new in the concepts, approaches, methods, instruments, or interventions without treating novelty as certified.", true, "nih-forms-i-research-plan"),
      requirement("nih-approach", "Research Strategy — Approach", "Describe the overall strategy, methodology, analyses, feasibility, potential problems, alternatives, and benchmarks.", true, "nih-forms-i-research-plan"),
      requirement("nih-bibliography", "Bibliography and references", "Prepare the relevant references as the application package and opportunity require.", true, "nih-forms-i-application-guide"),
      requirement("nih-nofo", "Confirm the active opportunity package", "Verify the activity code, Notice of Funding Opportunity, attachment set, page limits, and institutional submission process before use.", true, "nih-forms-i-application-guide"),
      requirement("nih-human-subjects-boundary", "Route human-subject details to the required form", "Keep proposal planning aligned with the PHS Human Subjects and Clinical Trials Information form where applicable; this profile does not complete or approve it.", false, "nih-forms-i-application-guide"),
    ];
  }
  if (templateId === "nsf-pappg-24-1") {
    return [
      requirement("nsf-project-summary", "Project Summary", "Plan an overview plus separately stated intellectual merit and broader impacts.", true, "nsf-pappg-24-1"),
      requirement("nsf-project-description", "Project Description", "Describe the work, objectives, significance, methods, and expected outcomes with intellectual merit and broader impacts integrated as required.", true, "nsf-pappg-24-1"),
      requirement("nsf-prior-support", "Results from prior NSF support", "Determine whether the current PAPPG and opportunity require prior-support reporting for senior personnel.", false, "nsf-pappg-24-1"),
      requirement("nsf-references", "References Cited", "Keep complete, attributable references separate from the Project Description when the package requires it.", true, "nsf-pappg-24-1"),
      requirement("nsf-data-sharing", "Data Management and Sharing Plan", "Identify the current Research.gov and program-specific requirements; a proposal narrative is not a substitute for the required plan.", true, "nsf-pappg-24-1"),
      requirement("nsf-solicitation", "Confirm the active funding opportunity", "Verify proposal type, solicitation-specific sections, current supplements, limits, and institutional submission requirements before use.", true, "nsf-pappg-24-1"),
    ];
  }
  if (templateId === "prisma-p-2015") {
    return [
      requirement("prisma-identification", "Protocol identification and status", "Identify the work as a systematic review protocol and state whether it updates or amends earlier work.", true, "prisma-p-2015"),
      requirement("prisma-registration", "Registration and amendment plan", "Record the intended registry or explain the plan, and specify how important amendments will be documented.", true, "prisma-p-2015"),
      requirement("prisma-rationale-objectives", "Rationale and objectives", "Describe why the review is needed and frame explicit objectives using an appropriate question structure.", true, "prisma-p-2015"),
      requirement("prisma-eligibility", "Eligibility criteria", "Define study or document characteristics, report characteristics, and defensible inclusion boundaries.", true, "prisma-p-2015"),
      requirement("prisma-information-sources", "Information sources and search strategy", "Name intended databases and other sources, coverage dates, and a reproducible draft strategy.", true, "prisma-p-2015"),
      requirement("prisma-study-records", "Selection and data-management process", "Plan record management, screening, data collection, and the data items to be sought.", true, "prisma-p-2015"),
      requirement("prisma-outcomes-bias", "Outcomes, prioritization, and bias appraisal", "Define outcomes or findings of interest and how limitations or bias in included evidence will be examined.", true, "prisma-p-2015"),
      requirement("prisma-synthesis", "Synthesis plan and meta-biases", "State when quantitative or qualitative synthesis is appropriate, alternatives when it is not, and planned certainty or meta-bias assessments.", true, "prisma-p-2015"),
      requirement("prisma-support", "Contributions, support, and competing interests", "Record roles, sponsorship, funder role, and competing interests.", true, "prisma-p-2015"),
    ];
  }
  if (templateId === "jars-qual-2018") {
    return [
      requirement("jars-qual-question", "Qualitative research purpose", "Explain the purpose, context, and characteristics of the qualitative inquiry.", true, "jars-qual-mmars-2018"),
      requirement("jars-qual-approach", "Approach to inquiry and rationale", "Name the qualitative approach or tradition when useful and explain why it fits the question.", true, "jars-qual-mmars-2018"),
      requirement("jars-qual-researcher", "Researcher description and reflexivity", "Plan transparent reporting of researcher roles, perspectives, relationships, and influence on the inquiry.", true, "jars-qual-mmars-2018"),
      requirement("jars-qual-sources", "Information sources and context", "Describe the proposed information sources, context, selection rationale, and adequacy logic without forcing statistical fields.", true, "jars-qual-mmars-2018"),
      requirement("jars-qual-analysis", "Interpretive and analytic process", "Describe how material may be transformed, interpreted, audited, and tested against alternatives.", true, "jars-qual-mmars-2018"),
      requirement("jars-qual-integrity", "Methodological integrity considerations", "Plan evidence-adequacy, perspective management, grounding, contextualization, and transparency checks.", true, "jars-qual-mmars-2018"),
    ];
  }
  if (templateId === "mmars-2018") {
    return [
      requirement("mmars-rationale", "Rationale for mixing evidence traditions", "Explain why the question needs multiple forms of evidence and why a single tradition is insufficient.", true, "jars-qual-mmars-2018"),
      requirement("mmars-design", "Mixed-methods design and sequence", "Describe the design, timing, priority, dependencies, and rationale for the proposed strands.", true, "jars-qual-mmars-2018"),
      requirement("mmars-strands", "Transparent strand-specific plans", "Describe each strand with standards appropriate to that evidence tradition.", true, "jars-qual-mmars-2018"),
      requirement("mmars-integration", "Integration procedures", "State where and how evidence will be connected, built upon, merged, compared, or embedded.", true, "jars-qual-mmars-2018"),
      requirement("mmars-inference", "Integrated interpretation and limitations", "Plan how convergent, complementary, and divergent findings will be interpreted without erasing uncertainty.", true, "jars-qual-mmars-2018"),
    ];
  }
  return [];
}

function cleanLine(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, 2_000);
}

function customRequirements(lines: readonly string[], authorityId: string | null): ProposalRequirement[] {
  return [...new Set(lines.map(cleanLine).filter(Boolean))].slice(0, 100).map((line, index) => (
    requirement(`custom-${String(index + 1).padStart(2, "0")}`, line, "Researcher-entered requirement; verify it against the named controlling source.", true, authorityId)
  ));
}

export function proposalRequirementTemplate(
  templateId: ProposalRequirementTemplateId,
): ProposalRequirementTemplateDefinition {
  const definition = TEMPLATE_BY_ID.get(templateId);
  if (!definition) throw new Error(`Unknown proposal requirement template: ${templateId}`);
  return definition;
}

export function recommendProposalRequirementTemplates(route: {
  intent: ResearchIntent | "undetermined";
  methodFamily: MethodFamily | "undetermined";
}, purpose: ProposalPurpose): ProposalRequirementTemplateId[] {
  if (purpose === "funder") return ["nih-forms-i", "nsf-pappg-24-1", "researcher-defined"];
  if (route.intent === "evidence-synthesis" || route.methodFamily === "evidence-synthesis" || purpose === "review-protocol") {
    return ["prisma-p-2015", "generic-academic", "researcher-defined"];
  }
  if (route.methodFamily === "qualitative") return ["jars-qual-2018", "generic-academic", "researcher-defined"];
  if (route.methodFamily === "mixed-methods") return ["mmars-2018", "generic-academic", "researcher-defined"];
  return ["generic-academic", "researcher-defined"];
}

export function createDefaultProposalRequirementDraft(route: {
  intent: ResearchIntent | "undetermined";
  methodFamily: MethodFamily | "undetermined";
}): ProposalRequirementDraft {
  const purpose: ProposalPurpose = route.intent === "evidence-synthesis" ? "review-protocol" : "thesis";
  return {
    purpose,
    templateId: recommendProposalRequirementTemplates(route, purpose)[0],
    language: "en-US",
    citationStyle: "APA 7th edition",
    maximumWords: null,
    customNotes: "",
    customRequirementLines: [],
    customAuthorityName: "",
    customAuthorityVersion: "",
    customAuthorityUrl: "",
    researcherConfirmed: false,
  };
}

export function proposalRequirementDraftFromProfile(profile: ProposalRequirementsProfile): ProposalRequirementDraft {
  const suffix = profile.profileId.split("--").at(-1) as ProposalRequirementTemplateId | undefined;
  const templateId = suffix && TEMPLATE_BY_ID.has(suffix) ? suffix : "researcher-defined";
  const customAuthority = profile.authorities.find((item) => item.kind === "researcher-defined");
  return {
    purpose: profile.purpose,
    templateId,
    language: profile.language,
    citationStyle: profile.citationStyle,
    maximumWords: profile.maximumWords,
    customNotes: profile.customNotes,
    customRequirementLines: templateId === "researcher-defined"
      ? profile.requirements.map((item) => item.label)
      : [],
    customAuthorityName: customAuthority?.name ?? "",
    customAuthorityVersion: customAuthority?.version ?? "",
    customAuthorityUrl: customAuthority?.sourceUrl ?? "",
    ...(profile.setupDecision ? { setupDecision: { ...profile.setupDecision, unresolvedRequirements: [...profile.setupDecision.unresolvedRequirements] } } : {}),
    researcherConfirmed: profile.researcherConfirmed,
  };
}

export function compileProposalRequirements(input: {
  projectId: string;
  route: {
    intent: ResearchIntent | "undetermined";
    methodFamily: MethodFamily | "undetermined";
  };
  draft: ProposalRequirementDraft;
  previous?: ProposalRequirementsProfile | null;
}): CompiledProposalRequirements {
  const definition = proposalRequirementTemplate(input.draft.templateId);
  const recommendedTemplateIds = recommendProposalRequirementTemplates(input.route, input.draft.purpose);
  const issues: ProposalRequirementIssue[] = [];
  const addIssue = (id: string, severity: ProposalRequirementIssueSeverity, message: string) => issues.push({ id, severity, message });

  if (input.route.intent === "undetermined" || input.route.methodFamily === "undetermined") {
    addIssue("stage1-route-unresolved", "blocking", "Return to Stage 1 and confirm the proposal route before compiling requirements.");
  }
  if (!definition.intendedIntents.includes(input.route.intent) || !definition.intendedMethods.includes(input.route.methodFamily)) {
    addIssue("template-route-mismatch", "blocking", `${definition.shortLabel} does not match the Stage 1 intent and method family.`);
  }
  if (!definition.intendedPurposes.includes(input.draft.purpose)) {
    addIssue("template-purpose-mismatch", "blocking", `${definition.shortLabel} is not intended for the selected proposal purpose.`);
  }
  if (!input.draft.language.trim()) addIssue("language-required", "blocking", "Choose the proposal language.");
  if (input.draft.language.length > 35) addIssue("language-too-long", "blocking", "Use a valid bounded language tag or label.");
  if (!input.draft.citationStyle.trim() || input.draft.citationStyle === "undetermined") {
    addIssue("citation-style-required", "blocking", "Record the working citation style or institution-specific style.");
  }
  if (input.draft.citationStyle.length > 160) addIssue("citation-style-too-long", "blocking", "Shorten the citation-style label.");
  const maximumWords = input.draft.maximumWords === null
    ? null
    : Number.isSafeInteger(input.draft.maximumWords) && input.draft.maximumWords >= 1 && input.draft.maximumWords <= 2_000_000
      ? input.draft.maximumWords
      : null;
  if (input.draft.maximumWords !== null && maximumWords === null) {
    addIssue("maximum-words-invalid", "blocking", "The maximum word count must be a whole number between 1 and 2,000,000.");
  }
  if (!input.draft.researcherConfirmed) {
    addIssue("researcher-confirmation-required", "blocking", "Confirm that you reviewed the selected source and that local requirements may supersede it.");
  }

  const authorities = definition.authorityIds.flatMap((id) => {
    const registered = AUTHORITY_BY_ID.get(id);
    return registered ? [{ ...registered }] : [];
  });
  let customAuthorityId: string | null = null;
  if (input.draft.templateId === "researcher-defined") {
    const url = input.draft.customAuthorityUrl.trim();
    const hasAuthorityFields = Boolean(input.draft.customAuthorityName.trim() || input.draft.customAuthorityVersion.trim() || url);
    if (input.draft.customRequirementLines.map(cleanLine).filter(Boolean).length === 0) {
      addIssue("custom-requirement-required", "blocking", "Add at least one researcher-defined requirement.");
    }
    if (hasAuthorityFields) {
      if (!input.draft.customAuthorityName.trim()) addIssue("custom-authority-name", "blocking", "Name the controlling custom authority.");
      if (!input.draft.customAuthorityVersion.trim()) addIssue("custom-authority-version", "blocking", "Record the custom authority version or date.");
      if (!url.startsWith("https://")) addIssue("custom-authority-url", "blocking", "Use the HTTPS source page for the custom authority.");
      if (input.draft.customAuthorityName.trim() && input.draft.customAuthorityVersion.trim() && url.startsWith("https://")) {
        customAuthorityId = "researcher-defined-authority";
        authorities.push(authority(
          customAuthorityId,
          "researcher-defined",
          input.draft.customAuthorityName.trim().slice(0, 500),
          input.draft.customAuthorityVersion.trim().slice(0, 160),
          url.slice(0, 2_000),
        ));
      }
    } else if (input.draft.purpose === "funder" || input.draft.purpose === "review-protocol") {
      addIssue("custom-authority-required", "blocking", "Identify the controlling source for this custom funder or protocol profile.");
    } else {
      addIssue("custom-authority-advisory", "advisory", "Add the institutional, course, journal, or other source when one controls this proposal.");
    }
  }

  if (input.draft.templateId === "nih-forms-i") {
    addIssue("nih-nofo-overrides", "advisory", "Confirm the active NIH Notice of Funding Opportunity and application package; they supersede the general guide.");
  }
  if (input.draft.templateId === "nsf-pappg-24-1") {
    addIssue("nsf-solicitation-overrides", "advisory", "Confirm the active NSF funding opportunity and policy supplements; they can override or extend the PAPPG.");
  }
  if (input.draft.templateId === "jars-qual-2018" || input.draft.templateId === "mmars-2018") {
    addIssue("reporting-guideline-planning-adaptation", "advisory", "This reporting standard is being used as a prospective planning lens, not as method validation.");
  }

  const setupDecision = input.draft.setupDecision
    ? normalizeProposalSetupDecision(input.draft.setupDecision)
    : null;
  if (input.draft.setupDecision && !setupDecision) {
    addIssue("proposal-setup-decision-invalid", "blocking", "Review the proposal destination and recommendation decision.");
  }
  if (setupDecision) {
    if (setupDecision.recommendationDecision === "unreviewed") {
      addIssue("proposal-recommendation-review-required", "blocking", "Review the recommended structure or record why another structure is more appropriate.");
    }
    if (setupDecision.recommendationDecision === "accepted" && !recommendedTemplateIds.includes(input.draft.templateId)) {
      addIssue("proposal-recommendation-selection-mismatch", "blocking", "The selected structure is not one of the current recommendations; record it as an override with a rationale.");
    }
    if (setupDecision.recommendationDecision === "overridden" && !setupDecision.selectionRationale.trim()) {
      addIssue("proposal-recommendation-override-rationale-required", "blocking", "Explain why the selected structure is more appropriate than the recommendation.");
    }
    if (setupDecision.instructionSourceStatus === "not-provided" || setupDecision.instructionSourceStatus === "provisional") {
      addIssue("proposal-requirements-source-provisional", "blocking", "Identify the controlling requirements or explicitly choose a destination for which no external source is required.");
    }
    if (setupDecision.instructionSourceStatus === "registered" && authorities.length === 0) {
      addIssue("proposal-registered-authority-missing", "blocking", "The selected setup expects a registered authority, but no registered source is attached.");
    }
    if (setupDecision.instructionSourceStatus === "researcher-defined" && !authorities.some((item) => item.kind === "researcher-defined")) {
      addIssue("proposal-researcher-defined-authority-missing", "blocking", "Attach the researcher-defined authority named by this proposal setup.");
    }
    if (setupDecision.instructionSourceStatus === "not-required" && authorities.length > 0) {
      addIssue("proposal-authority-status-mismatch", "blocking", "The setup says no authority is required, but versioned authority sources are attached.");
    }
  }

  const baseRequirements = input.draft.templateId === "researcher-defined"
    ? customRequirements(input.draft.customRequirementLines, customAuthorityId)
    : [
      ...GENERIC_REQUIREMENTS,
      ...routeRequirements(input.route.intent, input.route.methodFamily),
      ...templateRequirements(input.draft.templateId),
    ];
  const deduplicated = [...new Map(baseRequirements.map((item) => [item.id, item])).values()];
  const sameMeaning = input.previous
    && input.previous.purpose === input.draft.purpose
    && input.previous.profileId.endsWith(`--${input.draft.templateId}`)
    && input.previous.route.intent === input.route.intent
    && input.previous.route.methodFamily === input.route.methodFamily
    && input.previous.language === input.draft.language
    && input.previous.citationStyle === input.draft.citationStyle
    && input.previous.maximumWords === maximumWords
    && input.previous.customNotes === input.draft.customNotes
    && JSON.stringify(input.previous.setupDecision ?? null) === JSON.stringify(setupDecision)
    && input.previous.researcherConfirmed === input.draft.researcherConfirmed
    && JSON.stringify(input.previous.authorities) === JSON.stringify(authorities)
    && JSON.stringify(input.previous.requirements) === JSON.stringify(deduplicated);
  const profile: ProposalRequirementsProfile = {
    schemaVersion: 1,
    profileId: `requirements-${input.projectId}--${input.draft.templateId}`,
    revision: sameMeaning ? input.previous!.revision : (input.previous?.revision ?? 0) + 1,
    purpose: input.draft.purpose,
    route: input.route,
    language: input.draft.language.trim().slice(0, 35) || "en-US",
    citationStyle: input.draft.citationStyle.trim().slice(0, 160) || "undetermined",
    maximumWords,
    authorities,
    requirements: deduplicated,
    customNotes: input.draft.customNotes.slice(0, 20_000),
    ...(setupDecision ? { setupDecision } : {}),
    researcherConfirmed: input.draft.researcherConfirmed,
    claim: "requirements-profile-not-compliance-approval-or-submission-certification",
  };
  return {
    compilerVersion: PROPOSAL_REQUIREMENTS_COMPILER_VERSION,
    profile,
    recommendedTemplateIds,
    issues: issues.sort((a, b) => (a.severity === b.severity ? a.id.localeCompare(b.id) : a.severity === "blocking" ? -1 : 1)),
    ready: !issues.some((item) => item.severity === "blocking") && profile.requirements.length > 0,
    claim: "planning-requirements-not-compliance-approval-submission-or-methodological-certification",
  };
}

export function assessProposalRequirementAuthorityDrift(profile: ProposalRequirementsProfile): ProposalRequirementIssue[] {
  const issues: ProposalRequirementIssue[] = [];
  for (const pinned of profile.authorities) {
    if (pinned.kind === "researcher-defined") continue;
    const current = AUTHORITY_BY_ID.get(pinned.authorityId);
    if (!current) {
      issues.push({ id: `authority-removed-${pinned.authorityId}`, severity: "blocking", message: `${pinned.name} is no longer in the Cerise authority registry.` });
      continue;
    }
    if (current.version !== pinned.version || current.sourceUrl !== pinned.sourceUrl) {
      issues.push({ id: `authority-drift-${pinned.authorityId}`, severity: "blocking", message: `${pinned.name} changed after this requirements profile was confirmed. Review the current source before continuing.` });
    }
  }
  return issues;
}

export function proposalRequirementTemplateIdFromProfile(
  profile: ProposalRequirementsProfile,
): ProposalRequirementTemplateId {
  const suffix = profile.profileId.split("--").at(-1) as ProposalRequirementTemplateId | undefined;
  return suffix && TEMPLATE_BY_ID.has(suffix) ? suffix : "researcher-defined";
}
