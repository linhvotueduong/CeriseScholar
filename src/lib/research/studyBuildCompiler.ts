import {
  canonicalArtifactJson,
  createResearchArtifactSourceFingerprint,
  sha256ArtifactChecksum,
  type ResearchArtifactReference,
} from "./artifactIdentity";
import {
  getStudyRuntimeCapability,
  STUDY_RUNTIME_CAPABILITY_REGISTRY,
  STUDY_RUNTIME_CAPABILITY_REGISTRY_VERSION,
} from "./studyBuildCapabilities";
import {
  STUDY_ACCESSIBILITY_MODULE_REGISTRY,
  STUDY_ASSIGNMENT_MODULE_REGISTRY,
  STUDY_BUILD_CONTEXT_REGISTRY_VERSION,
  STUDY_MEASURE_MODULE_REGISTRY,
  STUDY_PARTICIPANT_MODULE_REGISTRY,
} from "./studyBuildContextModules";
import {
  getStudyDesignContribution,
  STUDY_DESIGN_MODULE_REGISTRY,
} from "./studyBuildDesignModules";
import {
  contribution,
  STUDY_BUILD_SOURCE_PRECEDENCE,
  type StudyBuildCapabilityRequest,
  type StudyBuildRegistryContribution,
  type StudyBuildRegistryModule,
  type StudyBuildRegistrySourceKind,
} from "./studyBuildRegistry";
import {
  getStudySettingContribution,
  STUDY_SETTING_MODULE_REGISTRY,
} from "./studyBuildSettingModules";
import {
  normalizeStudyBuildProfile,
  type StudyBuildCheck,
  type StudyBuildConflict,
  type StudyBuildModuleRecommendation,
  type StudyBuildProfile,
  type StudyBuildProfileVariant,
  type StudyBuildRationale,
  type StudyCapabilityFinding,
} from "./studyBuildProfile";
import {
  STUDY_DESIGN_SCHEMA_VERSION,
  STUDY_DESIGN_OPTIONS,
  type StudyDesignDocument,
  type StudyDesignKind,
  type StudySetting,
} from "./studyDesign";

export const STUDY_BUILD_COMPILER_VERSION = 1 as const;

export const STUDY_BUILD_PROFILE_VARIANTS: readonly StudyBuildProfileVariant[] = [
  "guided",
  "minimal-compatible",
  "blank-with-requirements",
];

type ConcreteDesignKind = Exclude<StudyDesignKind, "">;
type ConcreteStudySetting = Exclude<StudySetting, "">;

interface CompilerSources {
  fingerprintSources: ResearchArtifactReference[];
  byKind: Record<StudyBuildRegistrySourceKind, ResearchArtifactReference>;
}

const BASE_STUDY_BUILD_CONTRIBUTION: StudyBuildRegistryContribution = contribution({
  modules: [
    {
      id: "flow.welcome",
      moduleKind: "participant-welcome",
      status: "required",
      sourceKinds: ["product-default"],
      proposedBlockRoles: ["welcome"],
      proposedVariableRoles: [],
      rationale: "Every participant-facing study needs a clear entry point and an accurate description of what happens next.",
    },
    {
      id: "flow.consent-reference",
      moduleKind: "later-bound-consent-reference",
      status: "required",
      sourceKinds: ["product-default", "participants"],
      proposedBlockRoles: ["consent-reference"],
      proposedVariableRoles: ["participation-decision"],
      rationale: "The study scaffold reserves a stable binding point for the separately authored and reviewed consent process added in Phase 5.",
    },
    {
      id: "flow.debrief-and-close",
      moduleKind: "debrief-and-close",
      status: "required",
      sourceKinds: ["product-default", "design"],
      proposedBlockRoles: ["debrief", "session-close"],
      proposedVariableRoles: ["completion-status"],
      rationale: "Every study needs an explicit close that can provide debriefing, next steps, and a reproducible completion state.",
    },
    {
      id: "flow.participant-exit-support",
      moduleKind: "participant-exit-and-support",
      status: "required",
      sourceKinds: ["product-default", "participants"],
      proposedBlockRoles: ["participant-exit", "support-access"],
      proposedVariableRoles: ["completion-status"],
      rationale: "Every participant flow needs a safe refusal, stop, and support route.",
    },
  ],
  checks: [{
    id: "check.source-decisions.reviewed",
    level: "required",
    repairTarget: "design",
    message: "Review and approve the design, measure, and participant source decisions before accepting a generated Study Studio draft.",
    sourceKinds: ["design", "measures", "participants"],
  }],
  capabilityRequests: [{
    id: "participant-refusal-and-exit",
    requiredForRunnable: true,
    repairTarget: "studio",
    rationale: "Every participant-facing study requires a safe refusal and stop path.",
    sourceKinds: ["product-default", "participants", "runtime"],
  }],
});

function isConcreteDesign(value: StudyDesignKind): value is ConcreteDesignKind {
  return value !== "" && STUDY_DESIGN_OPTIONS.some((option) => option.id === value);
}

function isConcreteSetting(value: StudySetting): value is ConcreteStudySetting {
  return value === "online" || value === "laboratory" || value === "field" || value === "hybrid";
}

function assertCompilerInput(document: StudyDesignDocument, variant: StudyBuildProfileVariant): void {
  canonicalArtifactJson(document, { maximumBytes: 512 * 1024 });
  if (
    document.schemaVersion !== STUDY_DESIGN_SCHEMA_VERSION
    || !document.projectId.trim()
    || !isConcreteDesign(document.spec.design.selectedDesign)
    || !isConcreteSetting(document.spec.design.setting)
    || !STUDY_BUILD_PROFILE_VARIANTS.includes(variant)
    || !Array.isArray(document.spec.researchQuestions)
  ) {
    throw new Error("Study Build compiler input is incomplete or invalid.");
  }
}

function methodLanes(designKind: ConcreteDesignKind): Array<"quantitative" | "qualitative"> {
  if (designKind === "qualitative") return ["qualitative"];
  if (designKind === "mixed-methods") return ["quantitative", "qualitative"];
  return ["quantitative"];
}

async function artifactReference(
  artifactKind: string,
  artifactId: string,
  schemaVersion: number,
  payload: unknown,
): Promise<ResearchArtifactReference> {
  return {
    artifactKind,
    artifactId,
    schemaVersion,
    checksum: await sha256ArtifactChecksum(payload),
  };
}

async function createCompilerSources(document: StudyDesignDocument): Promise<CompilerSources> {
  const [design, measures, participants, productDefault, runtime] = await Promise.all([
    artifactReference("study-design-decision", "stage-03-step-01", 1, document.spec.design),
    artifactReference("study-measures", "stage-03-step-02", 1, document.spec.researchQuestions),
    artifactReference("study-participant-plan", "stage-03-step-03", 1, document.spec.participants),
    artifactReference("study-build-registry", "phase-02-composition", STUDY_BUILD_COMPILER_VERSION, {
      base: BASE_STUDY_BUILD_CONTRIBUTION,
      compilerVersion: STUDY_BUILD_COMPILER_VERSION,
      contextRegistryVersion: STUDY_BUILD_CONTEXT_REGISTRY_VERSION,
      designs: STUDY_DESIGN_MODULE_REGISTRY,
      settings: STUDY_SETTING_MODULE_REGISTRY,
      sourcePrecedence: STUDY_BUILD_SOURCE_PRECEDENCE,
    }),
    artifactReference(
      "study-runtime-capabilities",
      "experiment-studio-v8-local-host",
      STUDY_RUNTIME_CAPABILITY_REGISTRY_VERSION,
      STUDY_RUNTIME_CAPABILITY_REGISTRY,
    ),
  ]);

  return {
    fingerprintSources: [design, measures, participants, productDefault, runtime],
    byKind: {
      "product-default": productDefault,
      design,
      setting: design,
      measures,
      participants,
      assignment: participants,
      accessibility: participants,
      runtime,
    },
  };
}

function uniqueSortedStrings(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function referenceKey(reference: ResearchArtifactReference): string {
  return `${reference.artifactKind}:${reference.artifactId}:${reference.checksum}`;
}

function referencesFor(
  sourceKinds: readonly StudyBuildRegistrySourceKind[],
  sources: CompilerSources,
): ResearchArtifactReference[] {
  const byKey = new Map<string, ResearchArtifactReference>();
  for (const kind of sourceKinds) {
    const reference = sources.byKind[kind];
    byKey.set(referenceKey(reference), reference);
  }
  return [...byKey.values()].sort((left, right) => (
    left.artifactKind.localeCompare(right.artifactKind)
    || left.artifactId.localeCompare(right.artifactId)
  ));
}

function recommendationRank(status: StudyBuildRegistryModule["status"]): number {
  if (status === "unsupported") return 4;
  if (status === "required") return 3;
  if (status === "recommended") return 2;
  return 1;
}

function moduleSourcePrecedence(module: StudyBuildRegistryModule): number {
  return Math.min(...module.sourceKinds.map((kind) => STUDY_BUILD_SOURCE_PRECEDENCE[kind]));
}

function selectionDefault(
  status: StudyBuildRegistryModule["status"],
  variant: StudyBuildProfileVariant,
): StudyBuildModuleRecommendation["selectionDefault"] {
  if (status === "unsupported") return "exclude";
  if (variant === "guided") return status === "required" || status === "recommended" ? "include" : "exclude";
  if (variant === "minimal-compatible") return status === "required" ? "include" : "exclude";
  return status === "required" ? "configure" : "exclude";
}

function composeModules(
  contributions: readonly StudyBuildRegistryContribution[],
  variant: StudyBuildProfileVariant,
  sources: CompilerSources,
): { modules: StudyBuildModuleRecommendation[]; conflicts: StudyBuildConflict[] } {
  const modules = new Map<string, StudyBuildModuleRecommendation>();
  const sourcePrecedence = new Map<string, number>();
  const conflicts = new Map<string, StudyBuildConflict>();
  for (const proposed of contributions.flatMap((item) => item.modules)) {
    const sourceReferences = referencesFor(proposed.sourceKinds, sources);
    const current = modules.get(proposed.id);
    if (!current) {
      modules.set(proposed.id, {
        id: proposed.id,
        moduleKind: proposed.moduleKind,
        status: proposed.status,
        selectionDefault: selectionDefault(proposed.status, variant),
        sourceReferences,
        proposedBlockRoles: uniqueSortedStrings(proposed.proposedBlockRoles),
        proposedVariableRoles: uniqueSortedStrings(proposed.proposedVariableRoles),
        rationale: proposed.rationale,
      });
      sourcePrecedence.set(proposed.id, moduleSourcePrecedence(proposed));
      continue;
    }

    if (current.moduleKind !== proposed.moduleKind) {
      const id = `conflict.module-kind.${proposed.id}`;
      conflicts.set(id, {
        id,
        message: `Registry contributions disagree about the semantic kind of ${proposed.id}; materialization must remain blocked until the registry is repaired.`,
        sourceReferences: [...current.sourceReferences, ...sourceReferences]
          .filter((reference, index, all) => all.findIndex((item) => referenceKey(item) === referenceKey(reference)) === index)
          .sort((left, right) => left.artifactKind.localeCompare(right.artifactKind)),
      });
    }

    const status = recommendationRank(proposed.status) > recommendationRank(current.status)
      ? proposed.status
      : current.status;
    const rationales = uniqueSortedStrings([current.rationale, proposed.rationale]);
    const proposedPrecedence = moduleSourcePrecedence(proposed);
    const currentPrecedence = sourcePrecedence.get(proposed.id) ?? Number.POSITIVE_INFINITY;
    modules.set(proposed.id, {
      ...current,
      moduleKind: proposedPrecedence < currentPrecedence ? proposed.moduleKind : current.moduleKind,
      status,
      selectionDefault: selectionDefault(status, variant),
      sourceReferences: [...current.sourceReferences, ...sourceReferences]
        .filter((reference, index, all) => all.findIndex((item) => referenceKey(item) === referenceKey(reference)) === index)
        .sort((left, right) => left.artifactKind.localeCompare(right.artifactKind)),
      proposedBlockRoles: uniqueSortedStrings([...current.proposedBlockRoles, ...proposed.proposedBlockRoles]),
      proposedVariableRoles: uniqueSortedStrings([...current.proposedVariableRoles, ...proposed.proposedVariableRoles]),
      rationale: rationales.join(" "),
    });
    sourcePrecedence.set(proposed.id, Math.min(currentPrecedence, proposedPrecedence));
  }
  return {
    modules: [...modules.values()].sort((left, right) => left.id.localeCompare(right.id)),
    conflicts: [...conflicts.values()].sort((left, right) => left.id.localeCompare(right.id)),
  };
}

function composeChecks(contributions: readonly StudyBuildRegistryContribution[]): {
  requiredChecks: StudyBuildCheck[];
  recommendedChecks: StudyBuildCheck[];
} {
  const checks = new Map<string, StudyBuildCheck>();
  for (const proposed of contributions.flatMap((item) => item.checks)) {
    const current = checks.get(proposed.id);
    const level = current?.level === "required" || proposed.level === "required" ? "required" : "recommended";
    checks.set(proposed.id, {
      id: proposed.id,
      level,
      repairTarget: proposed.repairTarget,
      message: current && current.message !== proposed.message
        ? uniqueSortedStrings([current.message, proposed.message]).join(" ")
        : proposed.message,
    });
  }
  const ordered = [...checks.values()].sort((left, right) => left.id.localeCompare(right.id));
  return {
    requiredChecks: ordered.filter((check) => check.level === "required"),
    recommendedChecks: ordered.filter((check) => check.level === "recommended"),
  };
}

function composeCapabilities(
  contributions: readonly StudyBuildRegistryContribution[],
): {
  capabilities: StudyBuildProfile["capabilities"];
  capabilityFindings: StudyCapabilityFinding[];
} {
  const grouped = new Map<string, StudyBuildCapabilityRequest[]>();
  for (const request of contributions.flatMap((item) => item.capabilityRequests)) {
    grouped.set(request.id, [...(grouped.get(request.id) ?? []), request]);
  }

  const capabilities: StudyBuildProfile["capabilities"] = [];
  const capabilityFindings: StudyCapabilityFinding[] = [];
  for (const [id, requests] of [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const definition = getStudyRuntimeCapability(id);
    const requiredForRunnable = requests.some((request) => request.requiredForRunnable);
    const requestRationale = uniqueSortedStrings(requests.map((request) => request.rationale)).join(" ");
    if (!definition) {
      capabilities.push({
        id,
        status: "unsupported",
        rationale: `${requestRationale} The requested capability is not present in the versioned runtime registry.`,
      });
      capabilityFindings.push({
        id: `capability.${id}.unknown`,
        capability: id,
        status: "unsupported",
        severity: "blocking",
        message: "This requested capability is unknown to the current runtime registry. Bounded alternative: remove or replace it with a reviewed supported capability.",
        repairTarget: requests[0].repairTarget,
      });
      continue;
    }

    capabilities.push({
      id,
      status: definition.status,
      rationale: `${requestRationale} Current boundary: ${definition.currentBoundary}`,
    });
    if (definition.status !== "supported") {
      const blocking = requiredForRunnable
        && (definition.status === "unsupported" || definition.status === "authoring-export-only");
      capabilityFindings.push({
        id: `capability.${id}.${definition.status}`,
        capability: id,
        status: definition.status,
        severity: blocking ? "blocking" : "warning",
        message: `${definition.currentBoundary} Bounded alternative: ${definition.boundedAlternative}`,
        repairTarget: requests[0].repairTarget,
      });
    }
  }
  return { capabilities, capabilityFindings };
}

function sourceContradictions(
  document: StudyDesignDocument,
  designKind: ConcreteDesignKind,
  sources: CompilerSources,
): StudyBuildConflict[] {
  const allocation = document.spec.participants.allocationMethod.trim().toLowerCase();
  if (
    designKind === "quasi-experimental"
    && ["random", "randomized", "random assignment", "random allocation"].includes(allocation)
  ) {
    return [{
      id: "conflict.quasi.random-assignment",
      message: "The selected quasi-experimental design conflicts with a participant plan that declares random assignment. Resolve the design or allocation source before materialization.",
      sourceReferences: referencesFor(["design", "assignment"], sources),
    }];
  }
  return [];
}

function buildRationales(modules: readonly StudyBuildModuleRecommendation[]): StudyBuildRationale[] {
  return modules.map((module) => ({
    id: `rationale.${module.id}`,
    recommendationId: module.id,
    explanation: module.rationale,
    sourceReferences: module.sourceReferences,
  }));
}

export async function compileStudyBuildProfile(
  document: StudyDesignDocument,
  variant: StudyBuildProfileVariant = "guided",
): Promise<StudyBuildProfile> {
  assertCompilerInput(document, variant);
  const designKind = document.spec.design.selectedDesign as ConcreteDesignKind;
  const setting = document.spec.design.setting as ConcreteStudySetting;
  const lanes = methodLanes(designKind);
  const sources = await createCompilerSources(document);
  const contributions = [
    BASE_STUDY_BUILD_CONTRIBUTION,
    getStudyDesignContribution(designKind),
    getStudySettingContribution(setting),
    STUDY_MEASURE_MODULE_REGISTRY.compile(document.spec.researchQuestions, lanes),
    STUDY_PARTICIPANT_MODULE_REGISTRY.compile(document.spec.participants),
    STUDY_ASSIGNMENT_MODULE_REGISTRY.compile(designKind, document.spec.participants),
    STUDY_ACCESSIBILITY_MODULE_REGISTRY.compile(document.spec.participants),
  ];
  const { modules, conflicts: registryConflicts } = composeModules(contributions, variant, sources);
  const checks = composeChecks(contributions);
  const capabilityResult = composeCapabilities(contributions);
  const conflicts = [...registryConflicts, ...sourceContradictions(document, designKind, sources)]
    .sort((left, right) => left.id.localeCompare(right.id));

  const profile: StudyBuildProfile = {
    schemaVersion: 1,
    compilerVersion: STUDY_BUILD_COMPILER_VERSION,
    projectId: document.projectId,
    sourceFingerprint: await createResearchArtifactSourceFingerprint(sources.fingerprintSources),
    designKind,
    setting,
    variant,
    methodLanes: lanes,
    capabilities: capabilityResult.capabilities,
    modules,
    requiredChecks: checks.requiredChecks,
    recommendedChecks: checks.recommendedChecks,
    capabilityFindings: capabilityResult.capabilityFindings,
    conflicts,
    rationales: buildRationales(modules),
  };
  const normalized = normalizeStudyBuildProfile(profile, document.projectId);
  if (!normalized) throw new Error("Study Build compiler produced an invalid bounded profile.");
  return normalized;
}

export async function compileStudyBuildProfileVariants(
  document: StudyDesignDocument,
): Promise<Record<StudyBuildProfileVariant, StudyBuildProfile>> {
  const profiles = await Promise.all(
    STUDY_BUILD_PROFILE_VARIANTS.map((variant) => compileStudyBuildProfile(document, variant)),
  );
  return Object.fromEntries(profiles.map((profile) => [profile.variant, profile])) as Record<
    StudyBuildProfileVariant,
    StudyBuildProfile
  >;
}
