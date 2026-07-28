export interface StepDraft {
  completed: boolean;
  fields: Record<string, string>;
  checks: Record<string, boolean>;
}

export interface ResearchPathDraft {
  steps: Record<string, StepDraft>;
}

export const EMPTY_RESEARCH_PATH_DRAFT: ResearchPathDraft = { steps: {} };

export function readStepDraft(draft: ResearchPathDraft, stepId: string): StepDraft {
  return draft.steps[stepId] ?? { completed: false, fields: {}, checks: {} };
}

function stringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

function booleanRecord(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean"),
  );
}

/**
 * Browser storage is user-editable and can contain stale or malformed data.
 * Normalize it before the research workspace renders or persists it again.
 */
export function normalizeResearchPathDraft(value: unknown): ResearchPathDraft {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return EMPTY_RESEARCH_PATH_DRAFT;
  }

  const stepsValue = "steps" in value ? value.steps : undefined;
  if (!stepsValue || typeof stepsValue !== "object" || Array.isArray(stepsValue)) {
    return EMPTY_RESEARCH_PATH_DRAFT;
  }

  const steps: Record<string, StepDraft> = {};
  for (const [stepId, rawStep] of Object.entries(stepsValue)) {
    if (!rawStep || typeof rawStep !== "object" || Array.isArray(rawStep)) continue;

    steps[stepId] = {
      completed: "completed" in rawStep && rawStep.completed === true,
      fields: stringRecord("fields" in rawStep ? rawStep.fields : undefined),
      checks: booleanRecord("checks" in rawStep ? rawStep.checks : undefined),
    };
  }

  return { steps };
}
