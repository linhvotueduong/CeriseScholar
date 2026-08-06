import {
  createResearchArtifactIdentity,
  type ResearchArtifactIdentity,
} from "./artifactIdentity";

export const PROJECT_ROUTE_PROFILE_SCHEMA_VERSION = 1 as const;
export const PROJECT_ROUTE_COMPILER_VERSION = 1 as const;

export type ResearchIntent = "primary-data" | "secondary-data" | "evidence-synthesis";
export type MethodFamily = "quantitative" | "qualitative" | "mixed-methods" | "evidence-synthesis";
export type ResearchSetting = "online-home" | "laboratory" | "field" | "telephone" | "import-only" | "not-applicable";
export type AssignmentStrategy = "randomized" | "non-randomized" | "none";
export type ParticipantAudience = "adult" | "minor" | "capacity-limited" | "not-participant";
export type DataSensitivity = "public" | "deidentified" | "restricted" | "identifiable";
export type SpecialProcedure = "recording" | "deception" | "specimen" | "genetic" | "longitudinal" | "reconsent";
export type RouteConfirmation = "draft" | "researcher-confirmed";
export type StepApplicabilityStatus = "required" | "recommended" | "optional" | "not-applicable";

export interface ProjectRouteProfileInput {
  projectId: string;
  intent: ResearchIntent;
  methodFamily: MethodFamily;
  setting: ResearchSetting;
  assignment: AssignmentStrategy;
  audience: ParticipantAudience;
  dataSensitivity: DataSensitivity;
  specialProcedures: SpecialProcedure[];
  confirmation: RouteConfirmation;
}

export interface ProjectRouteProfile extends ProjectRouteProfileInput {
  schemaVersion: typeof PROJECT_ROUTE_PROFILE_SCHEMA_VERSION;
  compilerVersion: typeof PROJECT_ROUTE_COMPILER_VERSION;
  capabilities: string[];
  applicability: StepApplicabilityDecision[];
  identity: ResearchArtifactIdentity;
  claim: "workflow-routing-aid-not-methodological-ethical-legal-or-institutional-approval";
}

export interface StepApplicabilityDecision {
  stage: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  stepId: string;
  status: StepApplicabilityStatus;
  reasonCodes: string[];
  capabilities: string[];
}

export interface ProjectRouteFixture {
  id: string;
  label: string;
  input: ProjectRouteProfileInput;
}

function unique<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)].sort();
}

function decision(
  stage: StepApplicabilityDecision["stage"],
  stepId: string,
  status: StepApplicabilityStatus,
  reasonCodes: string[],
  capabilities: string[] = [],
): StepApplicabilityDecision {
  return {
    stage,
    stepId,
    status,
    reasonCodes: unique(reasonCodes),
    capabilities: unique(capabilities),
  };
}

function isPrimary(input: ProjectRouteProfileInput): boolean {
  return input.intent === "primary-data";
}

function isParticipantRoute(input: ProjectRouteProfileInput): boolean {
  return isPrimary(input) && input.audience !== "not-participant";
}

function compileCapabilities(input: ProjectRouteProfileInput): string[] {
  const capabilities = new Set<string>([
    "artifact-lineage",
    "living-research-record",
    "canonical-manuscript",
    "figure-provenance",
    "versioned-release",
  ]);
  if (isParticipantRoute(input)) {
    capabilities.add("participant-plan");
    capabilities.add("consent-authoring");
    capabilities.add("refusal-and-withdrawal");
    capabilities.add("recruitment-materials");
  }
  if (input.setting === "online-home") {
    capabilities.add("responsive-browser-study");
    capabilities.add("remote-accessibility-checks");
    capabilities.add("remote-identity-boundary");
  }
  if (input.setting === "laboratory") {
    capabilities.add("researcher-led-session");
    capabilities.add("lab-device-rehearsal");
    capabilities.add("session-scheduling");
  }
  if (input.setting === "field") capabilities.add("field-procedure");
  if (input.setting === "telephone") capabilities.add("oral-consent-script");
  if (input.assignment === "randomized") {
    capabilities.add("random-assignment");
    capabilities.add("allocation-integrity");
  }
  if (input.methodFamily === "qualitative" || input.methodFamily === "mixed-methods") {
    capabilities.add("qualitative-analysis");
    capabilities.add("coding-framework");
  }
  if (input.methodFamily === "mixed-methods") capabilities.add("mixed-method-integration");
  if (input.methodFamily === "quantitative" || input.methodFamily === "mixed-methods") {
    capabilities.add("quantitative-analysis");
  }
  if (input.intent === "secondary-data") {
    capabilities.add("data-use-and-rights-review");
    capabilities.add("imported-evidence-manifest");
  }
  if (input.intent === "evidence-synthesis") {
    capabilities.add("review-protocol");
    capabilities.add("study-selection-ledger");
  }
  if (input.audience === "minor") {
    capabilities.add("parental-permission");
    capabilities.add("assent");
  }
  if (input.audience === "capacity-limited") capabilities.add("capacity-and-representative-consent");
  if (input.dataSensitivity === "restricted" || input.dataSensitivity === "identifiable") {
    capabilities.add("restricted-data-boundary");
  }
  for (const procedure of input.specialProcedures) {
    capabilities.add({
      recording: "recording-consent",
      deception: "deception-and-debriefing",
      specimen: "specimen-consent",
      genetic: "genetic-data-consent",
      longitudinal: "longitudinal-contact-plan",
      reconsent: "reconsent-lifecycle",
    }[procedure]);
  }
  return [...capabilities].sort();
}

function compileApplicability(input: ProjectRouteProfileInput): StepApplicabilityDecision[] {
  const participant = isParticipantRoute(input);
  const primary = isPrimary(input);
  const imported = input.intent === "secondary-data" || input.intent === "evidence-synthesis";
  const specializedConsent = input.specialProcedures.length > 0
    || input.audience === "minor"
    || input.audience === "capacity-limited";
  const enhancedPilot = primary && (
    input.assignment === "randomized"
    || input.setting !== "online-home"
    || specializedConsent
  );

  return [
    decision(1, "frame-and-route", "required", ["all-projects-require-explicit-route"]),
    decision(2, "evidence-and-proposal", "required", ["all-projects-require-evidence-backed-purpose"]),
    decision(3, "select-design", "required", ["all-projects-require-method-fit"]),
    decision(3, "map-measures-or-sources", "required", [imported ? "map-imported-evidence" : "map-primary-evidence"]),
    decision(3, "plan-participants", participant ? "required" : "not-applicable", [participant ? "human-participant-route" : "no-human-participant-recruitment"]),
    decision(3, "build-study", primary ? "required" : input.intent === "evidence-synthesis" ? "recommended" : "not-applicable", [primary ? "primary-procedure-required" : imported ? "import-or-review-protocol" : "no-runnable-study"]),
    decision(3, "consent-and-participant-rights", participant ? "required" : "not-applicable", [participant ? "participant-facing-procedure" : "no-participant-consent-event"], participant ? ["consent-authoring"] : []),
    decision(3, "verify-data-analysis-contract", "required", ["all-routes-require-evidence-contract"]),
    decision(3, "create-pilot-candidate", primary ? "required" : "not-applicable", [enhancedPilot ? "risk-or-complexity-requires-rehearsal" : primary ? "every-runnable-study-needs-checksum-bound-candidate" : "no-participant-runtime"]),
    decision(4, "pilot-and-authorize", participant || input.dataSensitivity === "restricted" || input.dataSensitivity === "identifiable" ? "required" : "not-applicable", [participant ? enhancedPilot ? "pilot-evidence-and-human-decision" : "proportionate-human-governance" : "data-use-governance-only"]),
    decision(5, "collect-evidence", primary ? "required" : "not-applicable", [primary ? "primary-collection-route" : "no-primary-collection"]),
    decision(5, "import-evidence", imported ? "required" : "optional", [imported ? "import-route" : "supplemental-import-possible"]),
    decision(6, "prepare-and-analyze", "required", ["all-routes-produce-analyzable-evidence"]),
    decision(6, "qualitative-analysis", input.methodFamily === "qualitative" || input.methodFamily === "mixed-methods" ? "required" : "not-applicable", [input.methodFamily === "qualitative" || input.methodFamily === "mixed-methods" ? "qualitative-evidence-route" : "no-qualitative-analysis-declared"]),
    decision(6, "quantitative-analysis", input.methodFamily === "quantitative" || input.methodFamily === "mixed-methods" ? "required" : "not-applicable", [input.methodFamily === "quantitative" || input.methodFamily === "mixed-methods" ? "quantitative-evidence-route" : "no-quantitative-analysis-declared"]),
    decision(7, "interpret-and-compose", "required", ["all-projects-require-bounded-interpretation"]),
    decision(8, "publish-present-preserve", "required", ["all-projects-require-versioned-output"]),
  ];
}

export function validateProjectRouteInput(input: ProjectRouteProfileInput): string[] {
  const issues: string[] = [];
  if (!input.projectId.trim()) issues.push("project-id-required");
  if (input.intent !== "primary-data" && input.setting !== "import-only" && input.setting !== "not-applicable") {
    issues.push("non-primary-setting-must-be-import-only-or-not-applicable");
  }
  if (input.intent === "evidence-synthesis" && input.methodFamily !== "evidence-synthesis") {
    issues.push("evidence-synthesis-intent-requires-synthesis-method");
  }
  if (input.intent === "primary-data" && input.audience === "not-participant") {
    issues.push("primary-data-route-requires-participant-audience");
  }
  if (input.intent !== "primary-data" && input.assignment !== "none") {
    issues.push("non-primary-route-cannot-assign-participants");
  }
  if (input.assignment === "randomized" && input.methodFamily === "qualitative") {
    issues.push("qualitative-only-route-cannot-claim-randomized-experiment");
  }
  if (input.specialProcedures.includes("genetic") && !input.specialProcedures.includes("specimen") && input.intent === "primary-data") {
    issues.push("primary-genetic-route-requires-specimen-or-data-source-clarification");
  }
  return issues.sort();
}

export async function compileProjectRouteProfile(
  input: ProjectRouteProfileInput,
): Promise<ProjectRouteProfile> {
  const issues = validateProjectRouteInput(input);
  if (issues.length > 0) throw new Error(`Project route profile is invalid: ${issues.join(", ")}`);
  const normalizedInput: ProjectRouteProfileInput = {
    ...input,
    projectId: input.projectId.trim(),
    specialProcedures: unique(input.specialProcedures),
  };
  const payload = {
    schemaVersion: PROJECT_ROUTE_PROFILE_SCHEMA_VERSION,
    compilerVersion: PROJECT_ROUTE_COMPILER_VERSION,
    ...normalizedInput,
    capabilities: compileCapabilities(normalizedInput),
    applicability: compileApplicability(normalizedInput),
    claim: "workflow-routing-aid-not-methodological-ethical-legal-or-institutional-approval" as const,
  };
  return {
    ...payload,
    identity: await createResearchArtifactIdentity({
      artifactKind: "route-profile",
      artifactId: `route-${normalizedInput.projectId}`,
      artifactSchemaVersion: PROJECT_ROUTE_PROFILE_SCHEMA_VERSION,
      payload,
    }),
  };
}

const base = (
  projectId: string,
  overrides: Omit<ProjectRouteProfileInput, "projectId" | "confirmation">,
): ProjectRouteProfileInput => ({ projectId, confirmation: "researcher-confirmed", ...overrides });

export const PROJECT_ROUTE_VERIFICATION_FIXTURES: readonly ProjectRouteFixture[] = [
  { id: "anonymous-online-survey", label: "Anonymous online/home survey", input: base("fixture-online-survey", { intent: "primary-data", methodFamily: "quantitative", setting: "online-home", assignment: "none", audience: "adult", dataSensitivity: "deidentified", specialProcedures: [] }) },
  { id: "randomized-lab-experiment", label: "Randomized laboratory experiment", input: base("fixture-randomized-lab", { intent: "primary-data", methodFamily: "quantitative", setting: "laboratory", assignment: "randomized", audience: "adult", dataSensitivity: "identifiable", specialProcedures: [] }) },
  { id: "deception-debrief", label: "Behavioral experiment with deception and debriefing", input: base("fixture-deception", { intent: "primary-data", methodFamily: "quantitative", setting: "laboratory", assignment: "randomized", audience: "adult", dataSensitivity: "identifiable", specialProcedures: ["deception"] }) },
  { id: "recorded-interview", label: "Qualitative interview with recording", input: base("fixture-interview", { intent: "primary-data", methodFamily: "qualitative", setting: "online-home", assignment: "none", audience: "adult", dataSensitivity: "identifiable", specialProcedures: ["recording"] }) },
  { id: "focus-group", label: "In-person focus group", input: base("fixture-focus-group", { intent: "primary-data", methodFamily: "qualitative", setting: "field", assignment: "none", audience: "adult", dataSensitivity: "identifiable", specialProcedures: ["recording"] }) },
  { id: "mixed-methods", label: "Mixed-methods survey and interview study", input: base("fixture-mixed", { intent: "primary-data", methodFamily: "mixed-methods", setting: "online-home", assignment: "non-randomized", audience: "adult", dataSensitivity: "restricted", specialProcedures: ["recording"] }) },
  { id: "public-secondary", label: "Public secondary dataset", input: base("fixture-public-data", { intent: "secondary-data", methodFamily: "quantitative", setting: "import-only", assignment: "none", audience: "not-participant", dataSensitivity: "public", specialProcedures: [] }) },
  { id: "restricted-secondary", label: "Restricted secondary dataset", input: base("fixture-restricted-data", { intent: "secondary-data", methodFamily: "quantitative", setting: "import-only", assignment: "none", audience: "not-participant", dataSensitivity: "restricted", specialProcedures: [] }) },
  { id: "systematic-review", label: "Systematic evidence review", input: base("fixture-review", { intent: "evidence-synthesis", methodFamily: "evidence-synthesis", setting: "not-applicable", assignment: "none", audience: "not-participant", dataSensitivity: "public", specialProcedures: [] }) },
  { id: "child-participants", label: "Study with child participants", input: base("fixture-minors", { intent: "primary-data", methodFamily: "quantitative", setting: "laboratory", assignment: "non-randomized", audience: "minor", dataSensitivity: "identifiable", specialProcedures: [] }) },
  { id: "biomedical-specimen", label: "Biomedical specimen and genetic study", input: base("fixture-biomedical", { intent: "primary-data", methodFamily: "quantitative", setting: "laboratory", assignment: "none", audience: "adult", dataSensitivity: "restricted", specialProcedures: ["specimen", "genetic"] }) },
  { id: "longitudinal-reconsent", label: "Longitudinal study with reconsent", input: base("fixture-longitudinal", { intent: "primary-data", methodFamily: "mixed-methods", setting: "online-home", assignment: "non-randomized", audience: "adult", dataSensitivity: "identifiable", specialProcedures: ["longitudinal", "reconsent"] }) },
] as const;
