import {
  STAGE2_STEP1_PRESENTATION_OPTIONS,
  type Stage2Step1ExperiencePreferences,
  type Stage2Step1GuidanceLevel,
  type Stage2Step1InformationDensity,
} from "./stage2Step1ExperienceContract";

export const STAGE2_STEP1_EXPERIENCE_PREFERENCES_VERSION = 1 as const;
export const STAGE2_STEP1_EXPERIENCE_PREFERENCES_KEY = `cerise:stage2-step1:experience:v${STAGE2_STEP1_EXPERIENCE_PREFERENCES_VERSION}`;

export interface Stage2Step1ExperiencePreferencesEnvelope {
  version: typeof STAGE2_STEP1_EXPERIENCE_PREFERENCES_VERSION;
  preferences: Stage2Step1ExperiencePreferences;
}

const GUIDANCE_LEVELS = new Set<Stage2Step1GuidanceLevel>(STAGE2_STEP1_PRESENTATION_OPTIONS.guidanceLevels.map((option) => option.id));
const INFORMATION_DENSITIES = new Set<Stage2Step1InformationDensity>(STAGE2_STEP1_PRESENTATION_OPTIONS.informationDensities.map((option) => option.id));

export function defaultStage2Step1ExperiencePreferences(): Stage2Step1ExperiencePreferences {
  return { ...STAGE2_STEP1_PRESENTATION_OPTIONS.defaultPreferences };
}

export function normalizeStage2Step1ExperiencePreferences(value: unknown): Stage2Step1ExperiencePreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) return defaultStage2Step1ExperiencePreferences();
  const candidate = value as Partial<Stage2Step1ExperiencePreferences>;
  return {
    guidanceLevel: typeof candidate.guidanceLevel === "string" && GUIDANCE_LEVELS.has(candidate.guidanceLevel as Stage2Step1GuidanceLevel)
      ? candidate.guidanceLevel as Stage2Step1GuidanceLevel
      : STAGE2_STEP1_PRESENTATION_OPTIONS.defaultPreferences.guidanceLevel,
    informationDensity: typeof candidate.informationDensity === "string" && INFORMATION_DENSITIES.has(candidate.informationDensity as Stage2Step1InformationDensity)
      ? candidate.informationDensity as Stage2Step1InformationDensity
      : STAGE2_STEP1_PRESENTATION_OPTIONS.defaultPreferences.informationDensity,
  };
}

export function readStage2Step1ExperiencePreferences(storage: Pick<Storage, "getItem">): Stage2Step1ExperiencePreferences {
  try {
    const raw = storage.getItem(STAGE2_STEP1_EXPERIENCE_PREFERENCES_KEY);
    if (!raw) return defaultStage2Step1ExperiencePreferences();
    const envelope = JSON.parse(raw) as Partial<Stage2Step1ExperiencePreferencesEnvelope>;
    if (envelope.version !== STAGE2_STEP1_EXPERIENCE_PREFERENCES_VERSION) return defaultStage2Step1ExperiencePreferences();
    return normalizeStage2Step1ExperiencePreferences(envelope.preferences);
  } catch {
    return defaultStage2Step1ExperiencePreferences();
  }
}

export function writeStage2Step1ExperiencePreferences(
  storage: Pick<Storage, "setItem">,
  preferences: Stage2Step1ExperiencePreferences,
): Stage2Step1ExperiencePreferences {
  const normalized = normalizeStage2Step1ExperiencePreferences(preferences);
  const envelope: Stage2Step1ExperiencePreferencesEnvelope = {
    version: STAGE2_STEP1_EXPERIENCE_PREFERENCES_VERSION,
    preferences: normalized,
  };
  storage.setItem(STAGE2_STEP1_EXPERIENCE_PREFERENCES_KEY, JSON.stringify(envelope));
  return normalized;
}
