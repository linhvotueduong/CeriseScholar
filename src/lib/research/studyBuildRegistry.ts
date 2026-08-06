import type { StudyBuildCheck, StudyBuildRecommendationStatus } from "./studyBuildProfile";

/**
 * Registry contributions are declarative compiler inputs. They never mutate a
 * Studio document and they never decide that a study is approved or runnable.
 */
export type StudyBuildRegistrySourceKind =
  | "product-default"
  | "design"
  | "setting"
  | "measures"
  | "participants"
  | "assignment"
  | "accessibility"
  | "runtime";

/**
 * Lower numbers win when two registries target the same semantic module.
 * Runtime blockers are handled separately as capability findings; this table
 * governs only the surviving recommendation shape. Researcher overrides are
 * intentionally absent until the non-destructive reconciliation phase.
 */
export const STUDY_BUILD_SOURCE_PRECEDENCE: Readonly<Record<StudyBuildRegistrySourceKind, number>> = {
  runtime: 1,
  accessibility: 2,
  participants: 2,
  assignment: 3,
  measures: 3,
  design: 3,
  setting: 4,
  "product-default": 5,
};

export interface StudyBuildRegistryModule {
  id: string;
  moduleKind: string;
  status: StudyBuildRecommendationStatus;
  sourceKinds: readonly StudyBuildRegistrySourceKind[];
  proposedBlockRoles: string[];
  proposedVariableRoles: string[];
  rationale: string;
}

export interface StudyBuildRegistryCheck {
  id: string;
  level: StudyBuildCheck["level"];
  repairTarget: StudyBuildCheck["repairTarget"];
  message: string;
  sourceKinds: readonly StudyBuildRegistrySourceKind[];
}

export interface StudyBuildCapabilityRequest {
  id: string;
  requiredForRunnable: boolean;
  repairTarget: StudyBuildCheck["repairTarget"];
  rationale: string;
  sourceKinds: readonly StudyBuildRegistrySourceKind[];
}

export interface StudyBuildRegistryContribution {
  modules: StudyBuildRegistryModule[];
  checks: StudyBuildRegistryCheck[];
  capabilityRequests: StudyBuildCapabilityRequest[];
}

export const EMPTY_STUDY_BUILD_CONTRIBUTION: StudyBuildRegistryContribution = {
  modules: [],
  checks: [],
  capabilityRequests: [],
};

export function contribution(
  value: Partial<StudyBuildRegistryContribution>,
): StudyBuildRegistryContribution {
  return {
    modules: value.modules ?? [],
    checks: value.checks ?? [],
    capabilityRequests: value.capabilityRequests ?? [],
  };
}
