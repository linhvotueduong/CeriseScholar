import type { StudyDesignDocument } from "./studyDesign";
import {
  EXPERIMENT_BLOCK_OPTIONS,
  type ExperimentBlock,
  type ExperimentBlockType,
  type ExperimentResponseType,
  type ExperimentStudioDocument,
} from "./experimentStudio";

export const MAX_EXPERIMENT_ASSISTANT_PROMPT_LENGTH = 2_000;
export const MAX_EXPERIMENT_ASSISTANT_HISTORY = 6;
export const MAX_EXPERIMENT_ASSISTANT_SUGGESTIONS = 6;

export type ExperimentAssistantRole = "user" | "assistant";

export interface ExperimentAssistantMessage {
  role: ExperimentAssistantRole;
  content: string;
}

export interface ExperimentAssistantBlockContext {
  id: string;
  type: ExperimentBlockType;
  title: string;
  heading: string;
  prompt: string;
  responseType: ExperimentResponseType;
  variableName: string;
  required: boolean;
  choices: string[];
  scaleMin: number;
  scaleMax: number;
  minLabel: string;
  maxLabel: string;
  displayDurationMs: number;
  responseDeadlineMs: number;
  hasImage: boolean;
  allowedKeys: string[];
  correctAnswer: string;
  practice: boolean;
  randomizeChoices: boolean;
}

export interface ExperimentAssistantResearchContext {
  goal: string;
  setting: string;
  selectedDesign: string;
  constraints: string;
  targetPopulation: string;
  researchQuestions: Array<{
    id: string;
    question: string;
    hypothesis: string;
    construct: string;
    measure: string;
  }>;
}

export interface ExperimentAssistantContext {
  title: string;
  activeBlockId: string;
  blocks: ExperimentAssistantBlockContext[];
  conditions: string[];
  research: ExperimentAssistantResearchContext;
}

export type ExperimentAssistantBlockPatch = Partial<Pick<
  ExperimentBlock,
  | "title"
  | "heading"
  | "prompt"
  | "responseType"
  | "variableName"
  | "required"
  | "choices"
  | "scaleMin"
  | "scaleMax"
  | "minLabel"
  | "maxLabel"
  | "displayDurationMs"
  | "responseDeadlineMs"
>>;

export type ExperimentAssistantSuggestion =
  | {
      id: string;
      kind: "block-update";
      title: string;
      rationale: string;
      targetBlockId: string;
      patch: ExperimentAssistantBlockPatch;
    }
  | {
      id: string;
      kind: "block-add";
      title: string;
      rationale: string;
      blockType: ExperimentBlockType;
      patch: ExperimentAssistantBlockPatch;
    }
  | {
      id: string;
      kind: "study-note";
      title: string;
      rationale: string;
      note: string;
    }
  | {
      id: string;
      kind: "image-plan";
      title: string;
      rationale: string;
      recommendation: string;
      totalImages: number;
      imageSetStructure: string;
      sharedRequirements: string;
      presentationPlan: string;
      qualityChecks: string[];
      images: Array<{
        id: string;
        label: string;
        purpose: string;
        condition: string;
        screenPlacement: string;
        matchedWith: string;
        technicalSpec: string;
        heldConstant: string;
        manipulatedElements: string;
        prompt: string;
        negativePrompt: string;
        altText: string;
        reviewChecks: string;
      }>;
    };

export interface ExperimentAssistantResponse {
  reply: string;
  suggestions: ExperimentAssistantSuggestion[];
}

export interface ExperimentAssistantRequest {
  projectId: string;
  prompt: string;
  history: ExperimentAssistantMessage[];
  context: ExperimentAssistantContext;
}

const BLOCK_TYPES = EXPERIMENT_BLOCK_OPTIONS.map((option) => option.type);
const RESPONSE_TYPES: readonly ExperimentResponseType[] = [
  "none",
  "consent",
  "likert",
  "single-choice",
  "keyboard",
  "audio",
  "video",
  "long-text",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeString(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function safeNumber(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function safeEnum<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === "string" && allowed.includes(value as T) ? value as T : undefined;
}

function sanitizeVariableName(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().slice(0, 80).replace(/[^A-Za-z0-9_]/g, "_");
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(normalized)) return undefined;
  return normalized;
}

export function createExperimentAssistantContext(
  studio: ExperimentStudioDocument,
  activeBlockId: string,
  studyDesign: StudyDesignDocument | null,
): ExperimentAssistantContext {
  return {
    title: studio.title.slice(0, 160),
    activeBlockId,
    blocks: studio.blocks.slice(0, 60).map((block) => ({
      id: block.id,
      type: block.type,
      title: block.title,
      heading: block.heading,
      prompt: block.prompt,
      responseType: block.responseType,
      variableName: block.variableName,
      required: block.required,
      choices: block.choices.slice(0, 20),
      scaleMin: block.scaleMin,
      scaleMax: block.scaleMax,
      minLabel: block.minLabel,
      maxLabel: block.maxLabel,
      displayDurationMs: block.displayDurationMs,
      responseDeadlineMs: block.responseDeadlineMs,
      hasImage: Boolean(block.media),
      allowedKeys: (block.allowedKeys ?? []).slice(0, 12),
      correctAnswer: block.correctAnswer ?? "",
      practice: block.practice === true,
      randomizeChoices: block.randomizeChoices === true,
    })),
    conditions: studio.conditions.slice(0, 12).map((condition) => condition.name.slice(0, 100)),
    research: {
      goal: studyDesign?.spec.design.goal ?? "",
      setting: studyDesign?.spec.design.setting ?? "",
      selectedDesign: studyDesign?.spec.design.selectedDesign ?? "",
      constraints: (studyDesign?.spec.design.constraints ?? "").slice(0, 1_000),
      targetPopulation: (studyDesign?.spec.participants.targetPopulation ?? "").slice(0, 1_000),
      researchQuestions: (studyDesign?.spec.researchQuestions ?? [])
        .filter((question) => question.question.trim())
        .slice(0, 8)
        .map((question) => ({
          id: question.id.slice(0, 80),
          question: question.question.slice(0, 1_000),
          hypothesis: question.hypothesis.slice(0, 1_000),
          construct: question.construct.slice(0, 500),
          measure: question.measure.slice(0, 500),
        })),
    },
  };
}

function normalizeBlockContext(value: unknown, index: number): ExperimentAssistantBlockContext | null {
  if (!isRecord(value)) return null;
  const type = safeEnum(value.type, BLOCK_TYPES);
  const responseType = safeEnum(value.responseType, RESPONSE_TYPES);
  const id = safeString(value.id, 80).replace(/[^A-Za-z0-9_-]/g, "");
  if (!type || !responseType || !id) return null;
  return {
    id,
    type,
    title: safeString(value.title, 120) || `Block ${index + 1}`,
    heading: safeString(value.heading, 200),
    prompt: safeString(value.prompt, 2_000),
    responseType,
    variableName: safeString(value.variableName, 80),
    required: value.required === true,
    choices: Array.isArray(value.choices)
      ? value.choices.slice(0, 20).map((choice) => safeString(choice, 200)).filter(Boolean)
      : [],
    scaleMin: safeNumber(value.scaleMin, 0, 20) ?? 1,
    scaleMax: safeNumber(value.scaleMax, 1, 20) ?? 7,
    minLabel: safeString(value.minLabel, 100),
    maxLabel: safeString(value.maxLabel, 100),
    displayDurationMs: safeNumber(value.displayDurationMs, 0, 3_600_000) ?? 0,
    responseDeadlineMs: safeNumber(value.responseDeadlineMs, 0, 3_600_000) ?? 0,
    hasImage: value.hasImage === true,
    allowedKeys: Array.isArray(value.allowedKeys)
      ? value.allowedKeys.slice(0, 12).map((key) => safeString(key, 20).toLocaleLowerCase()).filter(Boolean)
      : [],
    correctAnswer: safeString(value.correctAnswer, 200),
    practice: value.practice === true,
    randomizeChoices: value.randomizeChoices === true,
  };
}

function normalizeResearchContext(value: unknown): ExperimentAssistantResearchContext {
  const record = isRecord(value) ? value : {};
  const questions = Array.isArray(record.researchQuestions) ? record.researchQuestions : [];
  return {
    goal: safeString(record.goal, 100),
    setting: safeString(record.setting, 100),
    selectedDesign: safeString(record.selectedDesign, 100),
    constraints: safeString(record.constraints, 1_000),
    targetPopulation: safeString(record.targetPopulation, 1_000),
    researchQuestions: questions.slice(0, 8).flatMap((value, index) => {
      if (!isRecord(value)) return [];
      const question = safeString(value.question, 1_000);
      if (!question) return [];
      return [{
        id: safeString(value.id, 80) || `rq-${index + 1}`,
        question,
        hypothesis: safeString(value.hypothesis, 1_000),
        construct: safeString(value.construct, 500),
        measure: safeString(value.measure, 500),
      }];
    }),
  };
}

export function normalizeExperimentAssistantRequest(value: unknown): ExperimentAssistantRequest | null {
  if (!isRecord(value) || !isRecord(value.context)) return null;
  const projectId = safeString(value.projectId, 80).replace(/[^A-Za-z0-9_-]/g, "");
  const prompt = safeString(value.prompt, MAX_EXPERIMENT_ASSISTANT_PROMPT_LENGTH);
  if (!projectId || !prompt) return null;

  const rawBlocks = Array.isArray(value.context.blocks) ? value.context.blocks : [];
  const blocks = rawBlocks.slice(0, 60).flatMap((block, index) => {
    const normalized = normalizeBlockContext(block, index);
    return normalized ? [normalized] : [];
  });
  if (blocks.length === 0) return null;

  const rawHistory = Array.isArray(value.history) ? value.history : [];
  const history = rawHistory.slice(-MAX_EXPERIMENT_ASSISTANT_HISTORY).flatMap((message) => {
    if (!isRecord(message)) return [];
    const role = safeEnum(message.role, ["user", "assistant"] as const);
    const content = safeString(message.content, MAX_EXPERIMENT_ASSISTANT_PROMPT_LENGTH);
    return role && content ? [{ role, content }] : [];
  });

  const activeBlockId = safeString(value.context.activeBlockId, 80).replace(/[^A-Za-z0-9_-]/g, "");
  return {
    projectId,
    prompt,
    history,
    context: {
      title: safeString(value.context.title, 160) || "Untitled experimental study",
      activeBlockId: blocks.some((block) => block.id === activeBlockId) ? activeBlockId : blocks[0].id,
      blocks,
      conditions: Array.isArray(value.context.conditions)
        ? value.context.conditions.slice(0, 12).map((condition) => safeString(condition, 100)).filter(Boolean)
        : [],
      research: normalizeResearchContext(value.context.research),
    },
  };
}

export function normalizeExperimentAssistantPatch(value: unknown): ExperimentAssistantBlockPatch {
  if (!isRecord(value)) return {};
  const patch: ExperimentAssistantBlockPatch = {};
  const title = safeString(value.title, 120);
  const heading = safeString(value.heading, 200);
  const prompt = safeString(value.prompt, 2_000);
  const responseType = safeEnum(value.responseType, RESPONSE_TYPES);
  const variableName = sanitizeVariableName(value.variableName);
  const scaleMin = safeNumber(value.scaleMin, 0, 20);
  const scaleMax = safeNumber(value.scaleMax, 1, 20);
  const displayDurationMs = safeNumber(value.displayDurationMs, 0, 3_600_000);
  const responseDeadlineMs = safeNumber(value.responseDeadlineMs, 0, 3_600_000);

  if (title) patch.title = title;
  if (typeof value.heading === "string") patch.heading = heading;
  if (typeof value.prompt === "string") patch.prompt = prompt;
  if (responseType) patch.responseType = responseType;
  if (variableName) patch.variableName = variableName;
  if (typeof value.required === "boolean") patch.required = value.required;
  if (Array.isArray(value.choices)) {
    patch.choices = value.choices.slice(0, 20).map((choice) => safeString(choice, 200)).filter(Boolean);
  }
  if (scaleMin !== undefined) patch.scaleMin = scaleMin;
  if (scaleMax !== undefined) patch.scaleMax = scaleMax;
  if (typeof value.minLabel === "string") patch.minLabel = safeString(value.minLabel, 100);
  if (typeof value.maxLabel === "string") patch.maxLabel = safeString(value.maxLabel, 100);
  if (displayDurationMs !== undefined) patch.displayDurationMs = displayDurationMs;
  if (responseDeadlineMs !== undefined) patch.responseDeadlineMs = responseDeadlineMs;
  return patch;
}

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

export function parseExperimentAssistantResponse(
  raw: string,
  context: ExperimentAssistantContext,
): ExperimentAssistantResponse {
  const parsed = extractJsonObject(raw);
  if (!isRecord(parsed)) {
    return { reply: safeString(raw, 2_000) || "I could not create a structured suggestion. Please try again.", suggestions: [] };
  }
  const reply = safeString(parsed.reply, 2_000) || "Review the suggestions below before changing your study.";
  const existingIds = new Set(context.blocks.map((block) => block.id));
  const rawSuggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
  const suggestions: ExperimentAssistantSuggestion[] = rawSuggestions
    .slice(0, MAX_EXPERIMENT_ASSISTANT_SUGGESTIONS)
    .flatMap((value, index): ExperimentAssistantSuggestion[] => {
    if (!isRecord(value)) return [];
    const kind = safeEnum(value.kind, ["block-update", "block-add", "study-note", "image-plan"] as const);
    const id = safeString(value.id, 80).replace(/[^A-Za-z0-9_-]/g, "") || `suggestion-${index + 1}`;
    const title = safeString(value.title, 140) || "Suggested change";
    const rationale = safeString(value.rationale, 700) || "Review this suggestion against your protocol before applying it.";
    if (kind === "block-update") {
      const targetBlockId = safeString(value.targetBlockId, 80).replace(/[^A-Za-z0-9_-]/g, "");
      const patch = normalizeExperimentAssistantPatch(value.patch);
      if (!existingIds.has(targetBlockId) || Object.keys(patch).length === 0) return [];
      return [{ id, kind, title, rationale, targetBlockId, patch } satisfies ExperimentAssistantSuggestion];
    }
    if (kind === "block-add") {
      const blockType = safeEnum(value.blockType, BLOCK_TYPES);
      const patch = normalizeExperimentAssistantPatch(value.patch);
      if (!blockType) return [];
      return [{ id, kind, title, rationale, blockType, patch } satisfies ExperimentAssistantSuggestion];
    }
    if (kind === "study-note") {
      const note = safeString(value.note, 1_200);
      if (!note) return [];
      return [{ id, kind, title, rationale, note } satisfies ExperimentAssistantSuggestion];
    }
    if (kind === "image-plan") {
      const rawImages = Array.isArray(value.images) ? value.images : [];
      const images = rawImages.slice(0, 20).flatMap((image, imageIndex) => {
        if (!isRecord(image)) return [];
        const prompt = safeString(image.prompt, 2_000);
        if (!prompt) return [];
        return [{
          id: safeString(image.id, 80).replace(/[^A-Za-z0-9_-]/g, "") || `image-${imageIndex + 1}`,
          label: safeString(image.label, 140) || `Image ${imageIndex + 1}`,
          purpose: safeString(image.purpose, 700),
          condition: safeString(image.condition, 300),
          screenPlacement: safeString(image.screenPlacement, 300),
          matchedWith: safeString(image.matchedWith, 300),
          technicalSpec: safeString(image.technicalSpec, 500),
          heldConstant: safeString(image.heldConstant, 700),
          manipulatedElements: safeString(image.manipulatedElements, 700),
          prompt,
          negativePrompt: safeString(image.negativePrompt, 1_000),
          altText: safeString(image.altText, 240),
          reviewChecks: safeString(image.reviewChecks, 700),
        }];
      });
      if (images.length === 0) return [];
      return [{
        id,
        kind,
        title,
        rationale,
        recommendation: safeString(value.recommendation, 1_000),
        totalImages: images.length,
        imageSetStructure: safeString(value.imageSetStructure, 1_000),
        sharedRequirements: safeString(value.sharedRequirements, 1_200),
        presentationPlan: safeString(value.presentationPlan, 1_000),
        qualityChecks: Array.isArray(value.qualityChecks)
          ? value.qualityChecks.slice(0, 12).map((check) => safeString(check, 300)).filter(Boolean)
          : [],
        images,
      } satisfies ExperimentAssistantSuggestion];
    }
    return [];
    });
  return { reply, suggestions };
}
