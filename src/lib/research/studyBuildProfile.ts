import {
  canonicalArtifactJson,
  normalizeResearchArtifactReference,
  normalizeResearchArtifactSourceFingerprint,
  type ResearchArtifactReference,
  type ResearchArtifactSourceFingerprint,
} from "./artifactIdentity";
import {
  STUDY_DESIGN_OPTIONS,
  type StudyDesignKind,
  type StudySetting,
} from "./studyDesign";

export const STUDY_BUILD_PROFILE_SCHEMA_VERSION = 1 as const;
export const MAX_STUDY_BUILD_PROFILE_BYTES = 512 * 1024;
export const MAX_STUDY_BUILD_PROFILE_ITEMS = 300;

export type StudyCapabilityStatus =
  | "supported"
  | "supported-with-limits"
  | "authoring-export-only"
  | "unsupported";
export type StudyBuildRecommendationStatus = "required" | "recommended" | "optional" | "unsupported";

export interface StudyBuildCapabilitySelection {
  id: string;
  status: StudyCapabilityStatus;
  rationale: string;
}

export interface StudyBuildModuleRecommendation {
  id: string;
  moduleKind: string;
  status: StudyBuildRecommendationStatus;
  sourceReferences: ResearchArtifactReference[];
  proposedBlockRoles: string[];
  proposedVariableRoles: string[];
  rationale: string;
}

export interface StudyBuildCheck {
  id: string;
  level: "required" | "recommended";
  repairTarget: "design" | "measures" | "participants" | "studio";
  message: string;
}

export interface StudyCapabilityFinding {
  id: string;
  capability: string;
  status: StudyCapabilityStatus;
  severity: "blocking" | "warning";
  message: string;
  repairTarget: "design" | "measures" | "participants" | "studio";
}

export interface StudyBuildConflict {
  id: string;
  message: string;
  sourceReferences: ResearchArtifactReference[];
}

export interface StudyBuildRationale {
  id: string;
  recommendationId: string;
  explanation: string;
  sourceReferences: ResearchArtifactReference[];
}

export interface StudyBuildProfile {
  schemaVersion: typeof STUDY_BUILD_PROFILE_SCHEMA_VERSION;
  compilerVersion: number;
  projectId: string;
  sourceFingerprint: ResearchArtifactSourceFingerprint;
  designKind: Exclude<StudyDesignKind, "">;
  setting: Exclude<StudySetting, "">;
  methodLanes: Array<"quantitative" | "qualitative">;
  capabilities: StudyBuildCapabilitySelection[];
  modules: StudyBuildModuleRecommendation[];
  requiredChecks: StudyBuildCheck[];
  recommendedChecks: StudyBuildCheck[];
  capabilityFindings: StudyCapabilityFinding[];
  conflicts: StudyBuildConflict[];
  rationales: StudyBuildRationale[];
}

export interface StudyBuildProfileReadiness {
  status: "blocked" | "review" | "ready";
  blocking: number;
  warning: number;
}

const DESIGNS = STUDY_DESIGN_OPTIONS.map((option) => option.id);
const SETTINGS = ["online", "laboratory", "field", "hybrid"] as const;
const CAPABILITY_STATUSES = ["supported", "supported-with-limits", "authoring-export-only", "unsupported"] as const;
const RECOMMENDATION_STATUSES = ["required", "recommended", "optional", "unsupported"] as const;
const REPAIR_TARGETS = ["design", "measures", "participants", "studio"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && allowed.includes(value as T) ? value as T : null;
}

function token(value: unknown, maximum = 160): string | null {
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9._:-]*$/.test(value) || value.length > maximum) return null;
  return value;
}

function text(value: unknown, maximum = 2_000): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ").slice(0, maximum);
  return normalized || null;
}

function tokens(value: unknown, maximum = 100): string[] | null {
  if (!Array.isArray(value) || value.length > maximum) return null;
  const normalized = value.map((item) => token(item));
  return normalized.some((item) => item === null) || new Set(normalized).size !== normalized.length
    ? null
    : normalized as string[];
}

function references(value: unknown): ResearchArtifactReference[] | null {
  if (!Array.isArray(value) || value.length > 64) return null;
  const normalized = value.map(normalizeResearchArtifactReference);
  return normalized.some((item) => item === null) ? null : normalized as ResearchArtifactReference[];
}

function normalizeCapabilities(value: unknown): StudyBuildCapabilitySelection[] | null {
  if (!Array.isArray(value) || value.length > MAX_STUDY_BUILD_PROFILE_ITEMS) return null;
  const normalized = value.map((item) => {
    if (!isRecord(item)) return null;
    const id = token(item.id);
    const status = enumValue(item.status, CAPABILITY_STATUSES);
    const rationale = text(item.rationale);
    return id && status && rationale ? { id, status, rationale } : null;
  });
  return normalized.some((item) => item === null) ? null : normalized as StudyBuildCapabilitySelection[];
}

function normalizeModules(value: unknown): StudyBuildModuleRecommendation[] | null {
  if (!Array.isArray(value) || value.length > MAX_STUDY_BUILD_PROFILE_ITEMS) return null;
  const normalized = value.map((item) => {
    if (!isRecord(item)) return null;
    const id = token(item.id);
    const moduleKind = token(item.moduleKind);
    const status = enumValue(item.status, RECOMMENDATION_STATUSES);
    const sourceReferences = references(item.sourceReferences);
    const proposedBlockRoles = tokens(item.proposedBlockRoles);
    const proposedVariableRoles = tokens(item.proposedVariableRoles);
    const rationale = text(item.rationale);
    return id && moduleKind && status && sourceReferences && proposedBlockRoles && proposedVariableRoles && rationale
      ? { id, moduleKind, status, sourceReferences, proposedBlockRoles, proposedVariableRoles, rationale }
      : null;
  });
  return normalized.some((item) => item === null) ? null : normalized as StudyBuildModuleRecommendation[];
}

function normalizeChecks(value: unknown, expectedLevel: StudyBuildCheck["level"]): StudyBuildCheck[] | null {
  if (!Array.isArray(value) || value.length > MAX_STUDY_BUILD_PROFILE_ITEMS) return null;
  const normalized = value.map((item) => {
    if (!isRecord(item) || item.level !== expectedLevel) return null;
    const id = token(item.id);
    const repairTarget = enumValue(item.repairTarget, REPAIR_TARGETS);
    const message = text(item.message);
    return id && repairTarget && message ? { id, level: expectedLevel, repairTarget, message } : null;
  });
  return normalized.some((item) => item === null) ? null : normalized as StudyBuildCheck[];
}

function normalizeFindings(value: unknown): StudyCapabilityFinding[] | null {
  if (!Array.isArray(value) || value.length > MAX_STUDY_BUILD_PROFILE_ITEMS) return null;
  const normalized = value.map((item) => {
    if (!isRecord(item)) return null;
    const id = token(item.id);
    const capability = token(item.capability);
    const status = enumValue(item.status, CAPABILITY_STATUSES);
    const severity = enumValue(item.severity, ["blocking", "warning"] as const);
    const message = text(item.message);
    const repairTarget = enumValue(item.repairTarget, REPAIR_TARGETS);
    return id && capability && status && severity && message && repairTarget
      ? { id, capability, status, severity, message, repairTarget }
      : null;
  });
  return normalized.some((item) => item === null) ? null : normalized as StudyCapabilityFinding[];
}

function normalizeConflicts(value: unknown): StudyBuildConflict[] | null {
  if (!Array.isArray(value) || value.length > MAX_STUDY_BUILD_PROFILE_ITEMS) return null;
  const normalized = value.map((item) => {
    if (!isRecord(item)) return null;
    const id = token(item.id);
    const message = text(item.message);
    const sourceReferences = references(item.sourceReferences);
    return id && message && sourceReferences ? { id, message, sourceReferences } : null;
  });
  return normalized.some((item) => item === null) ? null : normalized as StudyBuildConflict[];
}

function normalizeRationales(value: unknown): StudyBuildRationale[] | null {
  if (!Array.isArray(value) || value.length > MAX_STUDY_BUILD_PROFILE_ITEMS) return null;
  const normalized = value.map((item) => {
    if (!isRecord(item)) return null;
    const id = token(item.id);
    const recommendationId = token(item.recommendationId);
    const explanation = text(item.explanation);
    const sourceReferences = references(item.sourceReferences);
    return id && recommendationId && explanation && sourceReferences
      ? { id, recommendationId, explanation, sourceReferences }
      : null;
  });
  return normalized.some((item) => item === null) ? null : normalized as StudyBuildRationale[];
}

function uniqueIds(items: ReadonlyArray<{ id: string }>): boolean {
  return new Set(items.map((item) => item.id)).size === items.length;
}

export function normalizeStudyBuildProfile(value: unknown, projectId: string): StudyBuildProfile | null {
  try {
    canonicalArtifactJson(value, { maximumBytes: MAX_STUDY_BUILD_PROFILE_BYTES });
  } catch {
    return null;
  }
  if (!isRecord(value) || value.schemaVersion !== STUDY_BUILD_PROFILE_SCHEMA_VERSION) return null;
  const sourceFingerprint = normalizeResearchArtifactSourceFingerprint(value.sourceFingerprint);
  const designKind = enumValue(value.designKind, DESIGNS);
  const setting = enumValue(value.setting, SETTINGS);
  const methodLanes = Array.isArray(value.methodLanes)
    ? value.methodLanes.map((lane) => enumValue(lane, ["quantitative", "qualitative"] as const))
    : null;
  const capabilities = normalizeCapabilities(value.capabilities);
  const modules = normalizeModules(value.modules);
  const requiredChecks = normalizeChecks(value.requiredChecks, "required");
  const recommendedChecks = normalizeChecks(value.recommendedChecks, "recommended");
  const capabilityFindings = normalizeFindings(value.capabilityFindings);
  const conflicts = normalizeConflicts(value.conflicts);
  const rationales = normalizeRationales(value.rationales);
  if (
    value.projectId !== projectId
    || !Number.isSafeInteger(value.compilerVersion)
    || (value.compilerVersion as number) < 1
    || !sourceFingerprint
    || !designKind
    || !setting
    || !methodLanes
    || methodLanes.some((lane) => lane === null)
    || methodLanes.length === 0
    || new Set(methodLanes).size !== methodLanes.length
    || !capabilities
    || !modules
    || !requiredChecks
    || !recommendedChecks
    || !capabilityFindings
    || !conflicts
    || !rationales
    || !uniqueIds(capabilities)
    || !uniqueIds(modules)
    || !uniqueIds([...requiredChecks, ...recommendedChecks])
    || !uniqueIds(capabilityFindings)
    || !uniqueIds(conflicts)
    || !uniqueIds(rationales)
  ) return null;

  const normalized: StudyBuildProfile = {
    schemaVersion: STUDY_BUILD_PROFILE_SCHEMA_VERSION,
    compilerVersion: value.compilerVersion as number,
    projectId,
    sourceFingerprint,
    designKind,
    setting,
    methodLanes: methodLanes as Array<"quantitative" | "qualitative">,
    capabilities,
    modules,
    requiredChecks,
    recommendedChecks,
    capabilityFindings,
    conflicts,
    rationales,
  };
  try {
    canonicalArtifactJson(normalized, { maximumBytes: MAX_STUDY_BUILD_PROFILE_BYTES });
    return normalized;
  } catch {
    return null;
  }
}

export function collectStudyBuildProfileReadiness(profile: StudyBuildProfile): StudyBuildProfileReadiness {
  const blocking = profile.conflicts.length
    + profile.capabilityFindings.filter((finding) => finding.severity === "blocking").length;
  const warning = profile.capabilityFindings.filter((finding) => finding.severity === "warning").length;
  return {
    status: blocking > 0 ? "blocked" : warning > 0 ? "review" : "ready",
    blocking,
    warning,
  };
}
