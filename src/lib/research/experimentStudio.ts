import type { StudyDesignDocument } from "./studyDesign";
import { EXPERIMENT_MEDIA_MAX_BYTES } from "./experimentMedia";
import {
  normalizeExperimentTimingDiagnosticSummary,
  type ExperimentTimingDiagnosticSummary,
} from "./experimentTimingDiagnostics";

export const EXPERIMENT_STUDIO_SCHEMA_VERSION = 9 as const;
export const EXPERIMENT_STUDIO_STORAGE_VERSION = 1 as const;
export const MAX_EXPERIMENT_BLOCKS = 100;
export const MAX_EXPERIMENT_CONDITIONS = 12;
export const MAX_EXPERIMENT_BRANCH_RULES = 100;
export const MAX_EXPERIMENT_SPEC_BYTES = 480 * 1024;
export const MAX_EXPERIMENT_TIMING_MS = 60 * 60 * 1_000;
export const MAX_EXPERIMENT_TRIAL_TABLES = 12;
export const MAX_EXPERIMENT_TRIAL_ROWS = 5_000;
export const MAX_EXPERIMENT_TRIAL_COLUMNS = 40;
export const MAX_EXPERIMENT_TRIAL_CELL_LENGTH = 4_000;
export const MAX_EXPERIMENT_RUNTIME_TRIALS = 10_000;
export const MIN_EXPERIMENT_AUDIO_DURATION_SECONDS = 5;
export const MAX_EXPERIMENT_AUDIO_DURATION_SECONDS = 5 * 60;
export const MIN_EXPERIMENT_AUDIO_RESPONSE_BYTES = 256 * 1024;
export const MAX_EXPERIMENT_AUDIO_RESPONSE_BYTES = 25 * 1024 * 1024;
export const DEFAULT_EXPERIMENT_AUDIO_DURATION_SECONDS = 2 * 60;
export const DEFAULT_EXPERIMENT_AUDIO_RESPONSE_BYTES = 10 * 1024 * 1024;
export const MIN_EXPERIMENT_VIDEO_DURATION_SECONDS = 5;
export const MAX_EXPERIMENT_VIDEO_DURATION_SECONDS = 5 * 60;
export const MIN_EXPERIMENT_VIDEO_RESPONSE_BYTES = 1024 * 1024;
export const MAX_EXPERIMENT_VIDEO_RESPONSE_BYTES = 100 * 1024 * 1024;
export const DEFAULT_EXPERIMENT_VIDEO_DURATION_SECONDS = 60;
export const DEFAULT_EXPERIMENT_VIDEO_RESPONSE_BYTES = 25 * 1024 * 1024;

export type ExperimentBlockType =
  | "welcome"
  | "consent"
  | "consent-form"
  | "audio-consent"
  | "video-consent"
  | "instructions"
  | "rating"
  | "single-choice"
  | "text"
  | "stimulus"
  | "fixation"
  | "keyboard-response"
  | "audio-response"
  | "video-response"
  | "trial-loop"
  | "attention-check"
  | "debrief";

export type ExperimentResponseType =
  | "none"
  | "consent"
  | "likert"
  | "single-choice"
  | "keyboard"
  | "audio"
  | "video"
  | "long-text";

export type ExperimentAssignmentMethod = "single" | "random";

export type ExperimentBranchOperator =
  | "equals"
  | "not-equals"
  | "greater-than-or-equal"
  | "less-than-or-equal"
  | "answered"
  | "not-answered";

export interface ExperimentCondition {
  id: string;
  name: string;
  weight: number;
}

export interface ExperimentBranchRule {
  id: string;
  sourceBlockId: string;
  operator: ExperimentBranchOperator;
  value: string;
  targetBlockId: string;
  conditionId: string;
}

export interface ExperimentAssignmentSettings {
  method: ExperimentAssignmentMethod;
  previewSeed: number;
}

export interface ExperimentExecutionSettings {
  allowBackNavigation: boolean;
  requireFullscreen: boolean;
  logFocusChanges: boolean;
}

export interface ExperimentBlockMedia {
  kind: "image";
  dataUrl: string;
  altText: string;
  source: "upload";
}

export type ExperimentTrialOrder = "fixed" | "shuffle" | "rotate";

export interface ExperimentTrialTable {
  id: string;
  name: string;
  sourceFilename: string;
  sourceChecksum: string;
  importedAt: string;
  columns: string[];
  rows: string[][];
}

export interface ExperimentTrialLoopConfig {
  tableId: string;
  trialIdColumn: string;
  stimulusColumn: string;
  correctAnswerColumn: string;
  allowedKeysColumn: string;
  responseDeadlineColumn: string;
  conditionColumn: string;
  practiceColumn: string;
  order: ExperimentTrialOrder;
  repetitions: number;
}

export interface ExperimentAudioResponseConfig {
  consentBlockId: string;
  maxDurationSeconds: number;
  maxBytes: number;
  requireMicrophoneCheck: true;
}

export interface ExperimentVideoResponseConfig {
  consentBlockId: string;
  includeAudio: boolean;
  audioConsentBlockId: string;
  maxDurationSeconds: number;
  maxBytes: number;
  cameraFacing: "user" | "environment";
  requireCameraCheck: true;
}

export interface ExperimentConsentFormReference {
  consentProtocolId: string;
  consentProtocolChecksum: string;
  consentArtifactChecksum: string;
  formId: string;
  formChecksum: string;
  language: "en-US";
  audience: "adult-participant";
  decisionVariableName: "consent_receipt";
  decisionIds: string[];
}

export interface ExperimentBlock {
  id: string;
  type: ExperimentBlockType;
  title: string;
  internalName: string;
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
  nextBlockId: string;
  displayDurationMs: number;
  responseDeadlineMs: number;
  media: ExperimentBlockMedia | null;
  allowedKeys?: string[];
  correctAnswer?: string;
  practice?: boolean;
  randomizeChoices?: boolean;
  trialLoop?: ExperimentTrialLoopConfig | null;
  audio?: ExperimentAudioResponseConfig | null;
  video?: ExperimentVideoResponseConfig | null;
  consentForm?: ExperimentConsentFormReference | null;
}

export interface ExperimentStudioDocument {
  schemaVersion: typeof EXPERIMENT_STUDIO_SCHEMA_VERSION;
  projectId: string;
  title: string;
  updatedAt: string;
  blocks: ExperimentBlock[];
  conditions: ExperimentCondition[];
  assignment: ExperimentAssignmentSettings;
  branchRules: ExperimentBranchRule[];
  execution: ExperimentExecutionSettings;
  trialTables: ExperimentTrialTable[];
  timingDiagnostic: ExperimentTimingDiagnosticSummary | null;
}

export interface ExperimentValidationIssue {
  id: string;
  severity: "error" | "warning";
  message: string;
  blockId?: string;
}

export interface ExperimentVariable {
  name: string;
  blockId: string;
  blockTitle: string;
  responseType: ExperimentResponseType;
  required: boolean;
}

export const EXPERIMENT_BLOCK_OPTIONS: ReadonlyArray<{
  type: ExperimentBlockType;
  label: string;
  description: string;
}> = [
  { type: "welcome", label: "Welcome", description: "Introduce the study and set expectations." },
  { type: "consent", label: "Consent", description: "Record an explicit participation decision." },
  { type: "consent-form", label: "Reviewed consent form", description: "Present an exact checksum-bound consent artifact before any study activity." },
  { type: "audio-consent", label: "Audio recording consent", description: "Collect a separate decision before any voice recording." },
  { type: "video-consent", label: "Video recording consent", description: "Collect a separate decision before any camera recording." },
  { type: "instructions", label: "Instructions", description: "Explain what the participant should do." },
  { type: "rating", label: "Rating scale", description: "Collect a 1–7 Likert-style response." },
  { type: "single-choice", label: "Single choice", description: "Ask the participant to choose one option." },
  { type: "text", label: "Text response", description: "Collect a written answer." },
  { type: "stimulus", label: "Stimulus screen", description: "Present text and one compact image in the local runner." },
  { type: "fixation", label: "Fixation", description: "Present a timed fixation screen before a behavioral trial." },
  { type: "keyboard-response", label: "Keyboard response", description: "Capture a browser-measured key response and reaction time." },
  { type: "audio-response", label: "Audio response", description: "Capture one bounded voice response in the same-Mac Local Research Host." },
  { type: "video-response", label: "Video response", description: "Capture one bounded camera response in the same-Mac Local Research Host." },
  { type: "trial-loop", label: "Trial loop", description: "Run a deterministic sequence imported from a CSV trial table." },
  { type: "attention-check", label: "Attention check", description: "Add an explicitly scored data-quality check." },
  { type: "debrief", label: "Debrief", description: "Close the study and explain next steps." },
];

export const EXPERIMENT_BRANCH_OPERATOR_OPTIONS: ReadonlyArray<{
  value: ExperimentBranchOperator;
  label: string;
}> = [
  { value: "equals", label: "Response equals" },
  { value: "not-equals", label: "Response does not equal" },
  { value: "greater-than-or-equal", label: "Response is at least" },
  { value: "less-than-or-equal", label: "Response is at most" },
  { value: "answered", label: "Response is answered" },
  { value: "not-answered", label: "Response is unanswered" },
];

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
const ASSIGNMENT_METHODS: readonly ExperimentAssignmentMethod[] = ["single", "random"];
const TRIAL_ORDERS: readonly ExperimentTrialOrder[] = ["fixed", "shuffle", "rotate"];
const BRANCH_OPERATORS: readonly ExperimentBranchOperator[] = [
  "equals",
  "not-equals",
  "greater-than-or-equal",
  "less-than-or-equal",
  "answered",
  "not-answered",
];

const BLOCK_DEFAULTS: Record<ExperimentBlockType, Omit<ExperimentBlock, "id">> = {
  welcome: {
    type: "welcome",
    title: "Welcome",
    internalName: "welcome",
    heading: "Welcome to this study",
    prompt: "Thank you for your interest. Please read each screen carefully before continuing.",
    responseType: "none",
    variableName: "",
    required: false,
    choices: [],
    scaleMin: 1,
    scaleMax: 7,
    minLabel: "",
    maxLabel: "",
    nextBlockId: "",
    displayDurationMs: 0,
    responseDeadlineMs: 0,
    media: null,
  },
  consent: {
    type: "consent",
    title: "Consent",
    internalName: "consent",
    heading: "Consent to participate",
    prompt: "I have read the study information and voluntarily agree to participate.",
    responseType: "consent",
    variableName: "consent_given",
    required: true,
    choices: ["I agree to participate", "I do not agree"],
    scaleMin: 1,
    scaleMax: 2,
    minLabel: "",
    maxLabel: "",
    nextBlockId: "",
    displayDurationMs: 0,
    responseDeadlineMs: 0,
    media: null,
  },
  "consent-form": {
    type: "consent-form",
    title: "Reviewed consent form",
    internalName: "reviewed_consent_form",
    heading: "Consent to participate",
    prompt: "Bind the reviewed consent artifact in Stage 03 before participant testing.",
    responseType: "none",
    variableName: "",
    required: false,
    choices: [],
    scaleMin: 1,
    scaleMax: 2,
    minLabel: "",
    maxLabel: "",
    nextBlockId: "",
    displayDurationMs: 0,
    responseDeadlineMs: 0,
    media: null,
    consentForm: null,
  },
  "audio-consent": {
    type: "audio-consent",
    title: "Audio recording consent",
    internalName: "audio_recording_consent",
    heading: "Consent to audio recording",
    prompt: "This study will record your voice and store the recording only on the researcher's Mac. I understand the recording may be identifying and voluntarily agree to this audio collection.",
    responseType: "consent",
    variableName: "audio_recording_consent",
    required: true,
    choices: ["I agree to audio recording", "I do not agree"],
    scaleMin: 1,
    scaleMax: 2,
    minLabel: "",
    maxLabel: "",
    nextBlockId: "",
    displayDurationMs: 0,
    responseDeadlineMs: 0,
    media: null,
  },
  "video-consent": {
    type: "video-consent",
    title: "Video recording consent",
    internalName: "video_recording_consent",
    heading: "Consent to video recording",
    prompt: "This study will record video from your camera and store the recording only on the researcher's Mac. I understand that my face, surroundings, or bystanders may be identifying and voluntarily agree to this video collection.",
    responseType: "consent",
    variableName: "video_recording_consent",
    required: true,
    choices: ["I agree to video recording", "I do not agree"],
    scaleMin: 1,
    scaleMax: 2,
    minLabel: "",
    maxLabel: "",
    nextBlockId: "",
    displayDurationMs: 0,
    responseDeadlineMs: 0,
    media: null,
  },
  instructions: {
    type: "instructions",
    title: "Instructions",
    internalName: "instructions",
    heading: "Before you begin",
    prompt: "Complete the study in a quiet place and respond as accurately as you can.",
    responseType: "none",
    variableName: "",
    required: false,
    choices: [],
    scaleMin: 1,
    scaleMax: 7,
    minLabel: "",
    maxLabel: "",
    nextBlockId: "",
    displayDurationMs: 0,
    responseDeadlineMs: 0,
    media: null,
  },
  rating: {
    type: "rating",
    title: "Rating question",
    internalName: "rating_question",
    heading: "How would you rate the statement below?",
    prompt: "Please indicate the extent to which you agree or disagree with the following statement.",
    responseType: "likert",
    variableName: "rating_q1",
    required: true,
    choices: [],
    scaleMin: 1,
    scaleMax: 7,
    minLabel: "Strongly disagree",
    maxLabel: "Strongly agree",
    nextBlockId: "",
    displayDurationMs: 0,
    responseDeadlineMs: 0,
    media: null,
  },
  "single-choice": {
    type: "single-choice",
    title: "Single-choice question",
    internalName: "single_choice",
    heading: "Choose one answer",
    prompt: "Select the option that best represents your answer.",
    responseType: "single-choice",
    variableName: "choice_q1",
    required: true,
    choices: ["Option one", "Option two", "Option three"],
    scaleMin: 1,
    scaleMax: 3,
    minLabel: "",
    maxLabel: "",
    nextBlockId: "",
    displayDurationMs: 0,
    responseDeadlineMs: 0,
    media: null,
  },
  text: {
    type: "text",
    title: "Text response",
    internalName: "text_response",
    heading: "Share your response",
    prompt: "Write your answer in the space below.",
    responseType: "long-text",
    variableName: "text_q1",
    required: true,
    choices: [],
    scaleMin: 1,
    scaleMax: 7,
    minLabel: "",
    maxLabel: "",
    nextBlockId: "",
    displayDurationMs: 0,
    responseDeadlineMs: 0,
    media: null,
  },
  stimulus: {
    type: "stimulus",
    title: "Stimulus",
    internalName: "stimulus",
    heading: "Study material",
    prompt: "Present the text participants should review before continuing.",
    responseType: "none",
    variableName: "",
    required: false,
    choices: [],
    scaleMin: 1,
    scaleMax: 7,
    minLabel: "",
    maxLabel: "",
    nextBlockId: "",
    displayDurationMs: 0,
    responseDeadlineMs: 0,
    media: null,
  },
  fixation: {
    type: "fixation",
    title: "Fixation",
    internalName: "fixation",
    heading: "+",
    prompt: "Keep your eyes on the center of the screen.",
    responseType: "none",
    variableName: "",
    required: false,
    choices: [],
    scaleMin: 1,
    scaleMax: 7,
    minLabel: "",
    maxLabel: "",
    nextBlockId: "",
    displayDurationMs: 500,
    responseDeadlineMs: 0,
    media: null,
  },
  "keyboard-response": {
    type: "keyboard-response",
    title: "Keyboard trial",
    internalName: "keyboard_trial",
    heading: "Respond as quickly and accurately as you can",
    prompt: "Press F for the left response or J for the right response.",
    responseType: "keyboard",
    variableName: "keyboard_q1",
    required: true,
    choices: [],
    scaleMin: 1,
    scaleMax: 2,
    minLabel: "",
    maxLabel: "",
    nextBlockId: "",
    displayDurationMs: 0,
    responseDeadlineMs: 2_000,
    media: null,
    allowedKeys: ["f", "j"],
    correctAnswer: "",
    practice: false,
  },
  "audio-response": {
    type: "audio-response",
    title: "Audio response",
    internalName: "audio_response",
    heading: "Record your response",
    prompt: "Run the microphone check, then record your response. Stop the recording when you are finished.",
    responseType: "audio",
    variableName: "audio_response_1",
    required: true,
    choices: [],
    scaleMin: 1,
    scaleMax: 7,
    minLabel: "",
    maxLabel: "",
    nextBlockId: "",
    displayDurationMs: 0,
    responseDeadlineMs: 0,
    media: null,
    audio: {
      consentBlockId: "",
      maxDurationSeconds: DEFAULT_EXPERIMENT_AUDIO_DURATION_SECONDS,
      maxBytes: DEFAULT_EXPERIMENT_AUDIO_RESPONSE_BYTES,
      requireMicrophoneCheck: true,
    },
  },
  "video-response": {
    type: "video-response",
    title: "Video response",
    internalName: "video_response",
    heading: "Record your video response",
    prompt: "Run the camera check, review the preview, then record your response. Stop the recording when you are finished.",
    responseType: "video",
    variableName: "video_response_1",
    required: true,
    choices: [],
    scaleMin: 1,
    scaleMax: 7,
    minLabel: "",
    maxLabel: "",
    nextBlockId: "",
    displayDurationMs: 0,
    responseDeadlineMs: 0,
    media: null,
    video: {
      consentBlockId: "",
      includeAudio: false,
      audioConsentBlockId: "",
      maxDurationSeconds: DEFAULT_EXPERIMENT_VIDEO_DURATION_SECONDS,
      maxBytes: DEFAULT_EXPERIMENT_VIDEO_RESPONSE_BYTES,
      cameraFacing: "user",
      requireCameraCheck: true,
    },
  },
  "trial-loop": {
    type: "trial-loop",
    title: "Trial loop",
    internalName: "trial_loop",
    heading: "Respond as quickly and accurately as you can",
    prompt: "Import and map a trial table in the Trials section.",
    responseType: "keyboard",
    variableName: "trial_response",
    required: true,
    choices: [],
    scaleMin: 1,
    scaleMax: 2,
    minLabel: "",
    maxLabel: "",
    nextBlockId: "",
    displayDurationMs: 0,
    responseDeadlineMs: 2_000,
    media: null,
    allowedKeys: ["f", "j"],
    correctAnswer: "",
    practice: false,
    trialLoop: {
      tableId: "",
      trialIdColumn: "",
      stimulusColumn: "",
      correctAnswerColumn: "",
      allowedKeysColumn: "",
      responseDeadlineColumn: "",
      conditionColumn: "",
      practiceColumn: "",
      order: "shuffle",
      repetitions: 1,
    },
  },
  "attention-check": {
    type: "attention-check",
    title: "Attention check",
    internalName: "attention_check",
    heading: "Please answer this check",
    prompt: "To confirm that you are reading carefully, select Agree.",
    responseType: "single-choice",
    variableName: "attention_check_1",
    required: true,
    choices: ["Agree", "Disagree"],
    scaleMin: 1,
    scaleMax: 2,
    minLabel: "",
    maxLabel: "",
    nextBlockId: "",
    displayDurationMs: 0,
    responseDeadlineMs: 0,
    media: null,
    correctAnswer: "Agree",
    randomizeChoices: false,
  },
  debrief: {
    type: "debrief",
    title: "Debrief",
    internalName: "debrief",
    heading: "Thank you",
    prompt: "Your preview is complete. Add the approved debriefing information before launch.",
    responseType: "none",
    variableName: "",
    required: false,
    choices: [],
    scaleMin: 1,
    scaleMax: 7,
    minLabel: "",
    maxLabel: "",
    nextBlockId: "__end__",
    displayDurationMs: 0,
    responseDeadlineMs: 0,
    media: null,
  },
};

export function createExperimentBlock(type: ExperimentBlockType, id: string): ExperimentBlock {
  return {
    id,
    ...BLOCK_DEFAULTS[type],
    choices: [...BLOCK_DEFAULTS[type].choices],
    allowedKeys: [...(BLOCK_DEFAULTS[type].allowedKeys ?? [])],
    trialLoop: BLOCK_DEFAULTS[type].trialLoop ? { ...BLOCK_DEFAULTS[type].trialLoop } : null,
    audio: BLOCK_DEFAULTS[type].audio ? { ...BLOCK_DEFAULTS[type].audio } : null,
    video: BLOCK_DEFAULTS[type].video ? { ...BLOCK_DEFAULTS[type].video } : null,
    consentForm: BLOCK_DEFAULTS[type].consentForm
      ? { ...BLOCK_DEFAULTS[type].consentForm, decisionIds: [...BLOCK_DEFAULTS[type].consentForm.decisionIds] }
      : null,
  };
}

export function createExperimentCondition(id: string, name = "New condition"): ExperimentCondition {
  return { id, name, weight: 1 };
}

export function createExperimentBranchRule(
  id: string,
  sourceBlockId: string,
  targetBlockId: string,
): ExperimentBranchRule {
  return {
    id,
    sourceBlockId,
    operator: "equals",
    value: "",
    targetBlockId,
    conditionId: "",
  };
}

export function createExperimentStudioDocument(
  projectId: string,
  studyDesign?: StudyDesignDocument | null,
): ExperimentStudioDocument {
  const blocks = [
    createExperimentBlock("welcome", "block-welcome"),
    createExperimentBlock("consent", "block-consent"),
    createExperimentBlock("instructions", "block-instructions"),
    createExperimentBlock("rating", "block-rating-1"),
    createExperimentBlock("debrief", "block-debrief"),
  ];
  const firstQuestion = studyDesign?.spec.researchQuestions.find((question) => question.question.trim());
  const rating = blocks[3];
  if (firstQuestion && rating) {
    rating.heading = firstQuestion.construct.trim() || rating.heading;
    rating.prompt = firstQuestion.question.trim();
    rating.variableName = firstQuestion.id.replaceAll("-", "_");
  }

  return {
    schemaVersion: EXPERIMENT_STUDIO_SCHEMA_VERSION,
    projectId,
    title: "Untitled experimental study",
    updatedAt: new Date().toISOString(),
    blocks,
    conditions: [{ id: "condition-all", name: "All participants", weight: 1 }],
    assignment: { method: "single", previewSeed: 492_810 },
    branchRules: [],
    execution: { allowBackNavigation: true, requireFullscreen: false, logFocusChanges: true },
    trialTables: [],
    timingDiagnostic: null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeString(value: unknown, maxLength = 500): string {
  return typeof value === "string" ? value.slice(0, maxLength) : "";
}

function safeNumber(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === "number" && Number.isInteger(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function safeId(value: unknown, fallback: string): string {
  const id = safeString(value, 80).replace(/[^a-zA-Z0-9_-]/g, "");
  return id || fallback;
}

function safeEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && allowed.includes(value as T) ? value as T : fallback;
}

function experimentImageDataBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return Number.POSITIVE_INFINITY;
  const base64 = dataUrl.slice(comma + 1);
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

export function normalizeExperimentBlockMedia(value: unknown): ExperimentBlockMedia | null {
  if (!isRecord(value) || value.kind !== "image") return null;
  const dataUrl = safeString(value.dataUrl, Math.ceil(EXPERIMENT_MEDIA_MAX_BYTES * 1.4) + 100);
  if (!/^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/i.test(dataUrl)) return null;
  if (experimentImageDataBytes(dataUrl) > EXPERIMENT_MEDIA_MAX_BYTES) return null;
  return {
    kind: "image",
    dataUrl,
    altText: safeString(value.altText, 240) || "Study stimulus",
    source: "upload",
  };
}

function normalizeExperimentTrialLoop(value: unknown): ExperimentTrialLoopConfig | null {
  if (!isRecord(value)) return null;
  return {
    tableId: safeId(value.tableId, ""),
    trialIdColumn: safeString(value.trialIdColumn, 80),
    stimulusColumn: safeString(value.stimulusColumn, 80),
    correctAnswerColumn: safeString(value.correctAnswerColumn, 80),
    allowedKeysColumn: safeString(value.allowedKeysColumn, 80),
    responseDeadlineColumn: safeString(value.responseDeadlineColumn, 80),
    conditionColumn: safeString(value.conditionColumn, 80),
    practiceColumn: safeString(value.practiceColumn, 80),
    order: safeEnum(value.order, TRIAL_ORDERS, "shuffle"),
    repetitions: safeNumber(value.repetitions, 1, 1, 100),
  };
}

function normalizeExperimentAudioResponse(
  value: unknown,
  fallback: ExperimentAudioResponseConfig,
): ExperimentAudioResponseConfig {
  const record = isRecord(value) ? value : {};
  return {
    consentBlockId: safeId(record.consentBlockId, ""),
    maxDurationSeconds: safeNumber(
      record.maxDurationSeconds,
      fallback.maxDurationSeconds,
      MIN_EXPERIMENT_AUDIO_DURATION_SECONDS,
      MAX_EXPERIMENT_AUDIO_DURATION_SECONDS,
    ),
    maxBytes: safeNumber(
      record.maxBytes,
      fallback.maxBytes,
      MIN_EXPERIMENT_AUDIO_RESPONSE_BYTES,
      MAX_EXPERIMENT_AUDIO_RESPONSE_BYTES,
    ),
    requireMicrophoneCheck: true,
  };
}

function normalizeExperimentVideoResponse(
  value: unknown,
  fallback: ExperimentVideoResponseConfig,
): ExperimentVideoResponseConfig {
  const record = isRecord(value) ? value : {};
  return {
    consentBlockId: safeId(record.consentBlockId, ""),
    includeAudio: record.includeAudio === true,
    audioConsentBlockId: safeId(record.audioConsentBlockId, ""),
    maxDurationSeconds: safeNumber(
      record.maxDurationSeconds,
      fallback.maxDurationSeconds,
      MIN_EXPERIMENT_VIDEO_DURATION_SECONDS,
      MAX_EXPERIMENT_VIDEO_DURATION_SECONDS,
    ),
    maxBytes: safeNumber(
      record.maxBytes,
      fallback.maxBytes,
      MIN_EXPERIMENT_VIDEO_RESPONSE_BYTES,
      MAX_EXPERIMENT_VIDEO_RESPONSE_BYTES,
    ),
    cameraFacing: record.cameraFacing === "environment" ? "environment" : "user",
    requireCameraCheck: true,
  };
}

function normalizeExperimentConsentFormReference(
  value: unknown,
): ExperimentConsentFormReference | null {
  if (!isRecord(value)) return null;
  const checksum = (candidate: unknown) => (
    typeof candidate === "string" && /^sha256:[a-f0-9]{64}$/.test(candidate)
      ? candidate
      : ""
  );
  const decisionIds = Array.isArray(value.decisionIds)
    ? value.decisionIds.slice(0, 24).map((id) => safeId(id, "")).filter(Boolean)
    : [];
  const reference: ExperimentConsentFormReference = {
    consentProtocolId: safeId(value.consentProtocolId, ""),
    consentProtocolChecksum: checksum(value.consentProtocolChecksum),
    consentArtifactChecksum: checksum(value.consentArtifactChecksum),
    formId: safeId(value.formId, ""),
    formChecksum: checksum(value.formChecksum),
    language: value.language === "en-US" ? "en-US" : "en-US",
    audience: value.audience === "adult-participant" ? "adult-participant" : "adult-participant",
    decisionVariableName: "consent_receipt",
    decisionIds: [...new Set(decisionIds)],
  };
  return reference.consentProtocolId
    && reference.consentProtocolChecksum
    && reference.consentArtifactChecksum
    && reference.formId
    && reference.formChecksum
    && reference.decisionIds.includes("main-participation")
    ? reference
    : null;
}

function normalizeExperimentTrialTable(value: unknown, index: number): ExperimentTrialTable | null {
  if (!isRecord(value)) return null;
  const rawColumns = Array.isArray(value.columns)
    ? value.columns.slice(0, MAX_EXPERIMENT_TRIAL_COLUMNS)
    : [];
  const columns = rawColumns.map((column) => safeString(column, 80).trim()).filter(Boolean);
  if (columns.length === 0 || new Set(columns).size !== columns.length) return null;
  const rows = Array.isArray(value.rows)
    ? value.rows.slice(0, MAX_EXPERIMENT_TRIAL_ROWS).flatMap((row) => (
        Array.isArray(row)
          ? [columns.map((_, columnIndex) => safeString(row[columnIndex], MAX_EXPERIMENT_TRIAL_CELL_LENGTH))]
          : []
      ))
    : [];
  return {
    id: safeId(value.id, `trial-table-${index + 1}`),
    name: safeString(value.name, 120) || `Trial table ${index + 1}`,
    sourceFilename: safeString(value.sourceFilename, 180),
    sourceChecksum: /^sha256:[a-f0-9]{64}$/.test(safeString(value.sourceChecksum, 80))
      ? safeString(value.sourceChecksum, 80)
      : "",
    importedAt: safeString(value.importedAt, 40),
    columns,
    rows,
  };
}

export function normalizeExperimentStudioDocument(
  value: unknown,
  projectId: string,
  studyDesign?: StudyDesignDocument | null,
): ExperimentStudioDocument {
  const fallback = createExperimentStudioDocument(projectId, studyDesign);
  if (!isRecord(value)) return fallback;

  const rawBlocks = Array.isArray(value.blocks) ? value.blocks.slice(0, MAX_EXPERIMENT_BLOCKS) : [];
  const seenIds = new Set<string>();
  const blocks = rawBlocks.flatMap((candidate, index) => {
    if (!isRecord(candidate)) return [];
    const type = safeEnum(candidate.type, BLOCK_TYPES, "instructions");
    const defaults = createExperimentBlock(type, `block-${index + 1}`);
    let id = safeId(candidate.id, defaults.id);
    if (seenIds.has(id)) id = `${id}-${index + 1}`;
    seenIds.add(id);

    return [{
      ...defaults,
      id,
      title: safeString(candidate.title, 120) || defaults.title,
      internalName: safeString(candidate.internalName, 80) || defaults.internalName,
      heading: safeString(candidate.heading, 200),
      prompt: safeString(candidate.prompt, 2_000),
      responseType: safeEnum(candidate.responseType, RESPONSE_TYPES, defaults.responseType),
      variableName: safeString(candidate.variableName, 80),
      required: candidate.required === true,
      choices: Array.isArray(candidate.choices)
        ? candidate.choices.slice(0, 20).map((choice) => safeString(choice, 200)).filter(Boolean)
        : defaults.choices,
      scaleMin: safeNumber(candidate.scaleMin, defaults.scaleMin, 0, 20),
      scaleMax: safeNumber(candidate.scaleMax, defaults.scaleMax, 1, 20),
      minLabel: safeString(candidate.minLabel, 100),
      maxLabel: safeString(candidate.maxLabel, 100),
      nextBlockId: safeString(candidate.nextBlockId, 80),
      displayDurationMs: safeNumber(candidate.displayDurationMs, 0, 0, MAX_EXPERIMENT_TIMING_MS),
      responseDeadlineMs: safeNumber(candidate.responseDeadlineMs, 0, 0, MAX_EXPERIMENT_TIMING_MS),
      media: normalizeExperimentBlockMedia(candidate.media),
      allowedKeys: Array.isArray(candidate.allowedKeys)
        ? candidate.allowedKeys.slice(0, 12).map((key) => safeString(key, 20).toLocaleLowerCase()).filter(Boolean)
        : defaults.allowedKeys,
      correctAnswer: safeString(candidate.correctAnswer, 200),
      practice: candidate.practice === true,
      randomizeChoices: candidate.randomizeChoices === true,
      trialLoop: type === "trial-loop"
        ? normalizeExperimentTrialLoop(candidate.trialLoop) ?? defaults.trialLoop ?? null
        : null,
      audio: type === "audio-response" && defaults.audio
        ? normalizeExperimentAudioResponse(candidate.audio, defaults.audio)
        : null,
      video: type === "video-response" && defaults.video
        ? normalizeExperimentVideoResponse(candidate.video, defaults.video)
        : null,
      consentForm: type === "consent-form"
        ? normalizeExperimentConsentFormReference(candidate.consentForm)
        : null,
    } satisfies ExperimentBlock];
  });

  const tableIds = new Set<string>();
  const trialTables = (Array.isArray(value.trialTables) ? value.trialTables : [])
    .slice(0, MAX_EXPERIMENT_TRIAL_TABLES)
    .flatMap((candidate, index) => {
      const table = normalizeExperimentTrialTable(candidate, index);
      if (!table || tableIds.has(table.id)) return [];
      tableIds.add(table.id);
      return [table];
    });

  const rawConditions = Array.isArray(value.conditions)
    ? value.conditions.slice(0, MAX_EXPERIMENT_CONDITIONS)
    : [];
  const conditionIds = new Set<string>();
  const conditions = rawConditions.flatMap((candidate, index) => {
    if (!isRecord(candidate)) return [];
    let id = safeId(candidate.id, `condition-${index + 1}`);
    if (conditionIds.has(id)) id = `${id}-${index + 1}`;
    conditionIds.add(id);
    return [{
      id,
      name: safeString(candidate.name, 100) || `Condition ${index + 1}`,
      weight: safeNumber(candidate.weight, 1, 1, 100),
    } satisfies ExperimentCondition];
  });
  const normalizedConditions = conditions.length > 0 ? conditions : fallback.conditions;

  const rawAssignment = isRecord(value.assignment) ? value.assignment : {};
  const rawExecution = isRecord(value.execution) ? value.execution : {};
  const rawRules = Array.isArray(value.branchRules)
    ? value.branchRules.slice(0, MAX_EXPERIMENT_BRANCH_RULES)
    : [];
  const ruleIds = new Set<string>();
  const branchRules = rawRules.flatMap((candidate, index) => {
    if (!isRecord(candidate)) return [];
    let id = safeId(candidate.id, `rule-${index + 1}`);
    if (ruleIds.has(id)) id = `${id}-${index + 1}`;
    ruleIds.add(id);
    return [{
      id,
      sourceBlockId: safeString(candidate.sourceBlockId, 80),
      operator: safeEnum(candidate.operator, BRANCH_OPERATORS, "equals"),
      value: safeString(candidate.value, 200),
      targetBlockId: safeString(candidate.targetBlockId, 80),
      conditionId: safeString(candidate.conditionId, 80),
    } satisfies ExperimentBranchRule];
  });

  return {
    schemaVersion: EXPERIMENT_STUDIO_SCHEMA_VERSION,
    projectId,
    title: safeString(value.title, 160) || fallback.title,
    updatedAt: safeString(value.updatedAt, 40) || fallback.updatedAt,
    blocks: blocks.length > 0 ? blocks : fallback.blocks,
    conditions: normalizedConditions,
    assignment: {
      method: safeEnum(rawAssignment.method, ASSIGNMENT_METHODS, fallback.assignment.method),
      previewSeed: safeNumber(rawAssignment.previewSeed, fallback.assignment.previewSeed, 0, 2_147_483_647),
    },
    branchRules,
    execution: {
      allowBackNavigation: rawExecution.allowBackNavigation !== false,
      requireFullscreen: rawExecution.requireFullscreen === true,
      logFocusChanges: rawExecution.logFocusChanges !== false,
    },
    trialTables,
    timingDiagnostic: normalizeExperimentTimingDiagnosticSummary(value.timingDiagnostic),
  };
}

export function updateExperimentStudioDocument(
  document: ExperimentStudioDocument,
  updater: (current: ExperimentStudioDocument) => ExperimentStudioDocument,
): ExperimentStudioDocument {
  return { ...updater(document), updatedAt: new Date().toISOString() };
}

export function collectExperimentVariables(document: ExperimentStudioDocument): ExperimentVariable[] {
  return document.blocks.flatMap((block) => (
    block.type !== "trial-loop" && block.responseType !== "none" && block.variableName.trim()
      ? [{
          name: block.variableName.trim(),
          blockId: block.id,
          blockTitle: block.title,
          responseType: block.responseType,
          required: block.required,
        }]
      : []
  ));
}

function hashAssignmentKey(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function seededUnitInterval(seed: number): number {
  let value = seed + 0x6d2b79f5;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
}

export function assignExperimentCondition(
  document: ExperimentStudioDocument,
  participantKey: string,
): ExperimentCondition {
  const fallback = document.conditions[0] ?? createExperimentCondition("condition-all", "All participants");
  if (document.assignment.method === "single" || document.conditions.length <= 1) return fallback;

  const totalWeight = document.conditions.reduce((sum, condition) => sum + Math.max(1, condition.weight), 0);
  const random = seededUnitInterval(hashAssignmentKey(`${document.assignment.previewSeed}:${participantKey}`));
  let cursor = random * totalWeight;
  for (const condition of document.conditions) {
    cursor -= Math.max(1, condition.weight);
    if (cursor < 0) return condition;
  }
  return fallback;
}

export function previewExperimentAssignments(
  document: ExperimentStudioDocument,
  count = 20,
): ExperimentCondition[] {
  const safeCount = Math.min(200, Math.max(0, Math.trunc(count)));
  return Array.from({ length: safeCount }, (_, index) => assignExperimentCondition(document, String(index + 1)));
}

function branchRuleMatches(rule: ExperimentBranchRule, response: string | undefined): boolean {
  const normalizedResponse = response?.trim() ?? "";
  if (rule.operator === "answered") return normalizedResponse.length > 0;
  if (rule.operator === "not-answered") return normalizedResponse.length === 0;
  if (rule.operator === "equals") return normalizedResponse === rule.value.trim();
  if (rule.operator === "not-equals") return normalizedResponse !== rule.value.trim();

  const responseNumber = Number(normalizedResponse);
  const ruleNumber = Number(rule.value.trim());
  if (!Number.isFinite(responseNumber) || !Number.isFinite(ruleNumber)) return false;
  return rule.operator === "greater-than-or-equal"
    ? responseNumber >= ruleNumber
    : responseNumber <= ruleNumber;
}

export function resolveExperimentNextBlockId(
  document: ExperimentStudioDocument,
  blockId: string,
  responses: Readonly<Record<string, string>>,
  conditionId: string,
): string {
  const index = document.blocks.findIndex((block) => block.id === blockId);
  const block = document.blocks[index];
  if (!block) return "__end__";
  if (block.responseType === "consent" && responses[block.id] === block.choices[1]) return "__end__";

  const rule = document.branchRules.find((candidate) => (
    candidate.sourceBlockId === block.id
    && (!candidate.conditionId || candidate.conditionId === conditionId)
    && branchRuleMatches(candidate, responses[block.id])
  ));
  if (rule) return rule.targetBlockId || "__end__";
  if (block.nextBlockId) return block.nextBlockId;
  return document.blocks[index + 1]?.id ?? "__end__";
}

export function resolveExperimentNextBlockIndex(
  document: ExperimentStudioDocument,
  blockId: string,
  responses: Readonly<Record<string, string>>,
  conditionId: string,
): number {
  const nextId = resolveExperimentNextBlockId(document, blockId, responses, conditionId);
  if (nextId === "__end__") return document.blocks.length;
  const index = document.blocks.findIndex((block) => block.id === nextId);
  return index >= 0 ? index : document.blocks.length;
}

export function experimentStudioSpecSize(document: ExperimentStudioDocument): number {
  return new TextEncoder().encode(JSON.stringify({
    title: document.title,
    blocks: document.blocks,
    conditions: document.conditions,
    assignment: document.assignment,
    branchRules: document.branchRules,
    execution: document.execution,
    trialTables: document.trialTables,
    timingDiagnostic: document.timingDiagnostic,
  })).byteLength;
}

export function validateExperimentStudio(document: ExperimentStudioDocument): ExperimentValidationIssue[] {
  const issues: ExperimentValidationIssue[] = [];
  const ids = new Set(document.blocks.map((block) => block.id));
  const internalNames = new Map<string, string>();
  const variableNames = new Map<string, string>();
  const conditionIds = new Set(document.conditions.map((condition) => condition.id));
  const blockIndexes = new Map(document.blocks.map((block, index) => [block.id, index]));
  let runtimeTrialUpperBound = 0;

  if (document.blocks.length > MAX_EXPERIMENT_BLOCKS) {
    issues.push({ id: "too-many-blocks", severity: "error", message: `Keep the study at or below ${MAX_EXPERIMENT_BLOCKS} blocks.` });
  }
  if (experimentStudioSpecSize(document) > MAX_EXPERIMENT_SPEC_BYTES) {
    issues.push({ id: "spec-too-large", severity: "error", message: "The study specification is too large to sync. Shorten prompts or remove an image or unused block." });
  }

  if (document.conditions.length === 0) {
    issues.push({ id: "missing-condition", severity: "error", message: "Add at least one participant condition." });
  }
  if (document.conditions.length > MAX_EXPERIMENT_CONDITIONS) {
    issues.push({ id: "too-many-conditions", severity: "error", message: `Keep the study at or below ${MAX_EXPERIMENT_CONDITIONS} conditions.` });
  }
  const conditionNames = new Set<string>();
  for (const condition of document.conditions) {
    const normalizedName = condition.name.trim().toLocaleLowerCase();
    if (!normalizedName) {
      issues.push({ id: `${condition.id}-name`, severity: "error", message: "Every participant condition needs a name." });
    } else if (conditionNames.has(normalizedName)) {
      issues.push({ id: `${condition.id}-duplicate-name`, severity: "error", message: `Condition name “${condition.name.trim()}” is used more than once.` });
    } else {
      conditionNames.add(normalizedName);
    }
    if (!Number.isInteger(condition.weight) || condition.weight < 1 || condition.weight > 100) {
      issues.push({ id: `${condition.id}-weight`, severity: "error", message: `${condition.name || "A condition"} needs an allocation weight from 1 to 100.` });
    }
  }
  if (document.assignment.method === "random" && document.conditions.length < 2) {
    issues.push({ id: "random-needs-conditions", severity: "error", message: "Random assignment needs at least two participant conditions." });
  }
  if (document.branchRules.length > MAX_EXPERIMENT_BRANCH_RULES) {
    issues.push({ id: "too-many-branch-rules", severity: "error", message: `Keep the study at or below ${MAX_EXPERIMENT_BRANCH_RULES} branching rules.` });
  }
  if (document.trialTables.length > MAX_EXPERIMENT_TRIAL_TABLES) {
    issues.push({ id: "too-many-trial-tables", severity: "error", message: `Keep the study at or below ${MAX_EXPERIMENT_TRIAL_TABLES} trial tables.` });
  }

  for (const table of document.trialTables) {
    if (table.columns.length === 0 || table.columns.length > MAX_EXPERIMENT_TRIAL_COLUMNS) {
      issues.push({ id: `${table.id}-columns`, severity: "error", message: `${table.name} needs between 1 and ${MAX_EXPERIMENT_TRIAL_COLUMNS} unique columns.` });
    }
    if (new Set(table.columns).size !== table.columns.length) {
      issues.push({ id: `${table.id}-duplicate-columns`, severity: "error", message: `${table.name} contains duplicate column names.` });
    }
    if (table.rows.length === 0 || table.rows.length > MAX_EXPERIMENT_TRIAL_ROWS) {
      issues.push({ id: `${table.id}-rows`, severity: "error", message: `${table.name} needs between 1 and ${MAX_EXPERIMENT_TRIAL_ROWS.toLocaleString()} trial rows.` });
    }
    if (!/^sha256:[a-f0-9]{64}$/.test(table.sourceChecksum)) {
      issues.push({ id: `${table.id}-checksum`, severity: "error", message: `${table.name} must be re-imported so its source checksum can be verified.` });
    }
  }

  if (!document.blocks.some((block) => block.type === "consent" || block.type === "consent-form")) {
    issues.push({ id: "missing-consent", severity: "warning", message: "Add a consent block or document why consent is not required." });
  }
  if (!document.blocks.some((block) => block.type === "debrief")) {
    issues.push({ id: "missing-debrief", severity: "warning", message: "Add a debrief block before participant testing." });
  }

  for (const block of document.blocks) {
    if (block.type === "consent-form") {
      const semanticConsentCount = document.blocks.filter((candidate) => candidate.type === "consent-form").length;
      if (semanticConsentCount !== 1) {
        issues.push({ id: `${block.id}-unique-consent-form`, blockId: block.id, severity: "error", message: "Use exactly one checksum-bound reviewed consent form in a supported participant flow." });
      }
      if (document.blocks[0]?.id !== block.id) {
        issues.push({ id: `${block.id}-consent-form-first`, blockId: block.id, severity: "error", message: "The reviewed consent form must be the first runnable screen so no study response, timing, event, or assignment is collected beforehand." });
      }
      if (!block.consentForm) {
        issues.push({ id: `${block.id}-consent-form-reference`, blockId: block.id, severity: "error", message: "Bind an exact reviewed consent artifact before participant testing." });
      }
      if (
        block.responseType !== "none"
        || block.variableName
        || block.displayDurationMs !== 0
        || block.responseDeadlineMs !== 0
        || block.media
      ) {
        issues.push({ id: `${block.id}-consent-form-semantics`, blockId: block.id, severity: "error", message: "The reviewed consent block stores its decision in a metadata-minimal receipt, not as a study response, timed task, or media prompt." });
      }
    }
    if (block.type === "trial-loop") {
      const loop = block.trialLoop;
      const table = document.trialTables.find((candidate) => candidate.id === loop?.tableId);
      if (!loop || !table) {
        issues.push({ id: `${block.id}-trial-table`, blockId: block.id, severity: "error", message: `${block.title} needs an imported trial table.` });
      } else {
        runtimeTrialUpperBound += table.rows.length * loop.repetitions;
        const requiredMappings = [
          ["trial ID", loop.trialIdColumn],
          ["stimulus", loop.stimulusColumn],
        ] as const;
        for (const [label, column] of requiredMappings) {
          if (!column || !table.columns.includes(column)) {
            issues.push({ id: `${block.id}-${label.replace(" ", "-")}-column`, blockId: block.id, severity: "error", message: `${block.title} needs a valid ${label} column mapping.` });
          }
        }
        for (const column of [loop.correctAnswerColumn, loop.allowedKeysColumn, loop.responseDeadlineColumn, loop.conditionColumn, loop.practiceColumn]) {
          if (column && !table.columns.includes(column)) {
            issues.push({ id: `${block.id}-mapped-column-${column}`, blockId: block.id, severity: "error", message: `${block.title} refers to a trial column that no longer exists.` });
          }
        }
        if (loop.trialIdColumn && table.columns.includes(loop.trialIdColumn)) {
          const trialIdIndex = table.columns.indexOf(loop.trialIdColumn);
          const trialIds = table.rows.map((row) => row[trialIdIndex]?.trim() ?? "");
          if (trialIds.some((trialId) => !trialId) || new Set(trialIds).size !== trialIds.length) {
            issues.push({ id: `${block.id}-trial-ids`, blockId: block.id, severity: "error", message: `${table.name} needs a unique, non-empty trial ID in every row.` });
          }
        }
        if (loop.conditionColumn && table.columns.includes(loop.conditionColumn)) {
          const conditionIndex = table.columns.indexOf(loop.conditionColumn);
          for (const condition of document.conditions) {
            const hasEligibleRow = table.rows.some((row) => {
              const value = (row[conditionIndex] ?? "").trim().toLocaleLowerCase();
              return !value
                || value === condition.id.toLocaleLowerCase()
                || value === condition.name.trim().toLocaleLowerCase();
            });
            if (!hasEligibleRow) {
              issues.push({ id: `${block.id}-condition-${condition.id}`, blockId: block.id, severity: "error", message: `${table.name} has no eligible trial row for ${condition.name}.` });
            }
          }
        }
      }
    }
    if (block.type === "audio-response") {
      if (block.responseType !== "audio") {
        issues.push({
          id: `${block.id}-audio-response-type`,
          blockId: block.id,
          severity: "error",
          message: `${block.title} must use the audio response type.`,
        });
      }
      if (block.responseDeadlineMs !== 0) {
        issues.push({
          id: `${block.id}-audio-response-deadline`,
          blockId: block.id,
          severity: "error",
          message: `${block.title} cannot use an automatic response deadline. Its bounded recording duration controls when capture stops.`,
        });
      }
      if (!block.audio) {
        issues.push({
          id: `${block.id}-audio-settings`,
          blockId: block.id,
          severity: "error",
          message: `${block.title} needs bounded local audio settings.`,
        });
      } else {
        const consent = document.blocks.find((candidate) => candidate.id === block.audio?.consentBlockId);
        if (!consent || (consent.type !== "audio-consent" && consent.type !== "consent-form")) {
          issues.push({
            id: `${block.id}-audio-consent`,
            blockId: block.id,
            severity: "error",
          message: `${block.title} needs a linked audio recording decision in the reviewed consent runtime or a legacy audio-consent block.`,
          });
        } else if ((blockIndexes.get(consent.id) ?? Number.POSITIVE_INFINITY) >= (blockIndexes.get(block.id) ?? -1)) {
          issues.push({
            id: `${block.id}-audio-consent-order`,
            blockId: block.id,
            severity: "error",
            message: `${consent.title} must appear before ${block.title}.`,
          });
        }
        if (
          !Number.isInteger(block.audio.maxDurationSeconds)
          || block.audio.maxDurationSeconds < MIN_EXPERIMENT_AUDIO_DURATION_SECONDS
          || block.audio.maxDurationSeconds > MAX_EXPERIMENT_AUDIO_DURATION_SECONDS
        ) {
          issues.push({
            id: `${block.id}-audio-duration`,
            blockId: block.id,
            severity: "error",
            message: `${block.title} needs a maximum duration from ${MIN_EXPERIMENT_AUDIO_DURATION_SECONDS} to ${MAX_EXPERIMENT_AUDIO_DURATION_SECONDS} seconds.`,
          });
        }
        if (
          !Number.isInteger(block.audio.maxBytes)
          || block.audio.maxBytes < MIN_EXPERIMENT_AUDIO_RESPONSE_BYTES
          || block.audio.maxBytes > MAX_EXPERIMENT_AUDIO_RESPONSE_BYTES
        ) {
          issues.push({
            id: `${block.id}-audio-size`,
            blockId: block.id,
            severity: "error",
            message: `${block.title} needs a maximum file size from 256 KB to 25 MB.`,
          });
        }
      }
    } else if (block.responseType === "audio") {
      issues.push({
        id: `${block.id}-audio-block-type`,
        blockId: block.id,
        severity: "error",
        message: `${block.title} can collect audio only when it uses the Audio response block type.`,
      });
    }
    if (block.type === "video-response") {
      if (block.responseType !== "video") {
        issues.push({
          id: `${block.id}-video-response-type`,
          blockId: block.id,
          severity: "error",
          message: `${block.title} must use the video response type.`,
        });
      }
      if (block.responseDeadlineMs !== 0) {
        issues.push({
          id: `${block.id}-video-response-deadline`,
          blockId: block.id,
          severity: "error",
          message: `${block.title} cannot use an automatic response deadline. Its bounded recording duration controls when capture stops.`,
        });
      }
      if (!block.video) {
        issues.push({
          id: `${block.id}-video-settings`,
          blockId: block.id,
          severity: "error",
          message: `${block.title} needs bounded local video settings.`,
        });
      } else {
        const consent = document.blocks.find((candidate) => candidate.id === block.video?.consentBlockId);
        if (!consent || (consent.type !== "video-consent" && consent.type !== "consent-form")) {
          issues.push({
            id: `${block.id}-video-consent`,
            blockId: block.id,
            severity: "error",
            message: `${block.title} needs a linked video recording decision in the reviewed consent runtime or a legacy video-consent block.`,
          });
        } else if ((blockIndexes.get(consent.id) ?? Number.POSITIVE_INFINITY) >= (blockIndexes.get(block.id) ?? -1)) {
          issues.push({
            id: `${block.id}-video-consent-order`,
            blockId: block.id,
            severity: "error",
            message: `${consent.title} must appear before ${block.title}.`,
          });
        }
        if (block.video.includeAudio) {
          const audioConsent = document.blocks.find(
            (candidate) => candidate.id === block.video?.audioConsentBlockId,
          );
          if (!audioConsent || (audioConsent.type !== "audio-consent" && audioConsent.type !== "consent-form")) {
            issues.push({
              id: `${block.id}-video-audio-consent`,
              blockId: block.id,
              severity: "error",
              message: `${block.title} includes microphone audio and therefore needs a linked audio recording consent block.`,
            });
          } else if ((blockIndexes.get(audioConsent.id) ?? Number.POSITIVE_INFINITY) >= (blockIndexes.get(block.id) ?? -1)) {
            issues.push({
              id: `${block.id}-video-audio-consent-order`,
              blockId: block.id,
              severity: "error",
              message: `${audioConsent.title} must appear before ${block.title}.`,
            });
          }
        }
        if (
          !Number.isInteger(block.video.maxDurationSeconds)
          || block.video.maxDurationSeconds < MIN_EXPERIMENT_VIDEO_DURATION_SECONDS
          || block.video.maxDurationSeconds > MAX_EXPERIMENT_VIDEO_DURATION_SECONDS
        ) {
          issues.push({
            id: `${block.id}-video-duration`,
            blockId: block.id,
            severity: "error",
            message: `${block.title} needs a maximum duration from ${MIN_EXPERIMENT_VIDEO_DURATION_SECONDS} to ${MAX_EXPERIMENT_VIDEO_DURATION_SECONDS} seconds.`,
          });
        }
        if (
          !Number.isInteger(block.video.maxBytes)
          || block.video.maxBytes < MIN_EXPERIMENT_VIDEO_RESPONSE_BYTES
          || block.video.maxBytes > MAX_EXPERIMENT_VIDEO_RESPONSE_BYTES
        ) {
          issues.push({
            id: `${block.id}-video-size`,
            blockId: block.id,
            severity: "error",
            message: `${block.title} needs a maximum file size from 1 MB to 100 MB.`,
          });
        }
      }
    } else if (block.responseType === "video") {
      issues.push({
        id: `${block.id}-video-block-type`,
        blockId: block.id,
        severity: "error",
        message: `${block.title} can collect video only when it uses the Video response block type.`,
      });
    }
    if (block.type === "audio-consent" && block.responseType !== "consent") {
      issues.push({
        id: `${block.id}-audio-consent-response`,
        blockId: block.id,
        severity: "error",
        message: `${block.title} must collect an explicit agree or decline decision.`,
      });
    }
    if (block.type === "video-consent" && block.responseType !== "consent") {
      issues.push({
        id: `${block.id}-video-consent-response`,
        blockId: block.id,
        severity: "error",
        message: `${block.title} must collect an explicit agree or decline decision.`,
      });
    }
    if (block.media && experimentImageDataBytes(block.media.dataUrl) > EXPERIMENT_MEDIA_MAX_BYTES) {
      issues.push({
        id: `media-too-large-${block.id}`,
        severity: "error",
        blockId: block.id,
        message: `${block.title} has an image that exceeds the compact study-media limit.`,
      });
    }
    const internalName = block.internalName.trim();
    if (!internalName) {
      issues.push({ id: `${block.id}-internal-name`, blockId: block.id, severity: "error", message: `${block.title} needs an internal name.` });
    } else if (internalNames.has(internalName)) {
      issues.push({ id: `${block.id}-duplicate-internal`, blockId: block.id, severity: "error", message: `Internal name “${internalName}” is used by more than one block.` });
    } else {
      internalNames.set(internalName, block.id);
    }

    if (!block.heading.trim() && !block.prompt.trim()) {
      issues.push({ id: `${block.id}-content`, blockId: block.id, severity: "error", message: `${block.title} needs participant-facing content.` });
    }

    if (block.responseType !== "none") {
      const variable = block.variableName.trim();
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(variable)) {
        issues.push({ id: `${block.id}-variable`, blockId: block.id, severity: "error", message: `${block.title} needs a variable beginning with a letter and containing only letters, numbers, or underscores.` });
      } else if (variableNames.has(variable)) {
        issues.push({ id: `${block.id}-duplicate-variable`, blockId: block.id, severity: "error", message: `Variable “${variable}” is produced by more than one block.` });
      } else {
        variableNames.set(variable, block.id);
      }
    }

    if ((block.responseType === "single-choice" || block.responseType === "consent") && block.choices.length < 2) {
      issues.push({ id: `${block.id}-choices`, blockId: block.id, severity: "error", message: `${block.title} needs at least two response options.` });
    }
    if (block.responseType === "likert" && block.scaleMax <= block.scaleMin) {
      issues.push({ id: `${block.id}-scale`, blockId: block.id, severity: "error", message: `${block.title} needs a scale maximum greater than its minimum.` });
    }
    if (block.responseType === "keyboard") {
      const keys = (block.allowedKeys ?? []).map((key) => key.trim().toLocaleLowerCase()).filter(Boolean);
      if (keys.length === 0) {
        issues.push({ id: `${block.id}-allowed-keys`, blockId: block.id, severity: "error", message: `${block.title} needs at least one allowed response key.` });
      }
      if (new Set(keys).size !== keys.length) {
        issues.push({ id: `${block.id}-duplicate-keys`, blockId: block.id, severity: "error", message: `${block.title} contains a duplicate response key.` });
      }
      if (block.correctAnswer && !keys.includes(block.correctAnswer.trim().toLocaleLowerCase())) {
        issues.push({ id: `${block.id}-correct-key`, blockId: block.id, severity: "error", message: `${block.title} has a correct key that is not in its allowed-key list.` });
      }
    }
    if (block.type === "attention-check") {
      if (!block.correctAnswer?.trim()) {
        issues.push({ id: `${block.id}-correct-answer`, blockId: block.id, severity: "error", message: `${block.title} needs an expected answer for scoring.` });
      } else if (!block.choices.some((choice) => choice.toLocaleLowerCase() === block.correctAnswer?.trim().toLocaleLowerCase())) {
        issues.push({ id: `${block.id}-correct-answer-option`, blockId: block.id, severity: "error", message: `${block.title} has an expected answer that is not one of its choices.` });
      }
    }
    if (block.nextBlockId && block.nextBlockId !== "__end__" && !ids.has(block.nextBlockId)) {
      issues.push({ id: `${block.id}-branch`, blockId: block.id, severity: "error", message: `${block.title} points to a block that no longer exists.` });
    }
    if (block.displayDurationMs < 0 || block.displayDurationMs > MAX_EXPERIMENT_TIMING_MS) {
      issues.push({ id: `${block.id}-display-duration`, blockId: block.id, severity: "error", message: `${block.title} has an invalid display duration.` });
    }
    if (block.responseDeadlineMs < 0 || block.responseDeadlineMs > MAX_EXPERIMENT_TIMING_MS) {
      issues.push({ id: `${block.id}-response-deadline`, blockId: block.id, severity: "error", message: `${block.title} has an invalid response deadline.` });
    }
  }

  if (runtimeTrialUpperBound > MAX_EXPERIMENT_RUNTIME_TRIALS) {
    issues.push({ id: "too-many-runtime-trials", severity: "error", message: `Keep the worst-case materialized study at or below ${MAX_EXPERIMENT_RUNTIME_TRIALS.toLocaleString()} trials across all loops and repetitions.` });
  }

  for (const rule of document.branchRules) {
    const source = document.blocks.find((block) => block.id === rule.sourceBlockId);
    if (!source) {
      issues.push({ id: `${rule.id}-source`, severity: "error", message: "A branching rule refers to a source block that no longer exists." });
      continue;
    }
    if (source.responseType === "none") {
      issues.push({ id: `${rule.id}-source-response`, blockId: source.id, severity: "error", message: `${source.title} cannot branch by response because it does not collect one.` });
    }
    if (source.type === "trial-loop") {
      issues.push({ id: `${rule.id}-trial-loop-source`, blockId: source.id, severity: "error", message: `${source.title} cannot be the response source for a branch. Branch before or after the complete loop.` });
    }
    if (!rule.targetBlockId || (rule.targetBlockId !== "__end__" && !ids.has(rule.targetBlockId))) {
      issues.push({ id: `${rule.id}-target`, blockId: source.id, severity: "error", message: `A branching rule from ${source.title} needs a valid destination.` });
    }
    if (rule.conditionId && !conditionIds.has(rule.conditionId)) {
      issues.push({ id: `${rule.id}-condition`, blockId: source.id, severity: "error", message: `A branching rule from ${source.title} refers to a condition that no longer exists.` });
    }
    if (rule.operator !== "answered" && rule.operator !== "not-answered" && !rule.value.trim()) {
      issues.push({ id: `${rule.id}-value`, blockId: source.id, severity: "error", message: `A branching rule from ${source.title} needs a comparison value.` });
    }
    if ((rule.operator === "greater-than-or-equal" || rule.operator === "less-than-or-equal") && source.responseType !== "likert") {
      issues.push({ id: `${rule.id}-numeric-source`, blockId: source.id, severity: "error", message: `Numeric branching from ${source.title} requires a rating-scale response.` });
    }
    if (rule.sourceBlockId === rule.targetBlockId) {
      issues.push({ id: `${rule.id}-self-loop`, blockId: source.id, severity: "error", message: `${source.title} cannot branch back to itself.` });
    }
  }

  const edges = new Map<string, string[]>();
  document.blocks.forEach((block, index) => {
    const sequentialTarget = block.nextBlockId || document.blocks[index + 1]?.id || "__end__";
    const ruleTargets = document.branchRules
      .filter((rule) => rule.sourceBlockId === block.id)
      .map((rule) => rule.targetBlockId)
      .filter((target) => target && target !== "__end__");
    edges.set(block.id, [sequentialTarget, ...ruleTargets].filter((target) => target !== "__end__"));
  });
  const visiting = new Set<string>();
  const visited = new Set<string>();
  let cycleStart = "";
  function visit(blockId: string): boolean {
    if (visiting.has(blockId)) {
      cycleStart = blockId;
      return true;
    }
    if (visited.has(blockId)) return false;
    visiting.add(blockId);
    const hasCycle = (edges.get(blockId) ?? []).some((target) => visit(target));
    visiting.delete(blockId);
    visited.add(blockId);
    return hasCycle;
  }
  if (document.blocks.some((block) => visit(block.id))) {
    const block = document.blocks.find((candidate) => candidate.id === cycleStart);
    issues.push({
      id: `${cycleStart || "study"}-branch-cycle`,
      blockId: block?.id,
      severity: "error",
      message: `${block?.title ?? "The study"} belongs to a branching loop that may prevent participants from finishing.`,
    });
  }

  return issues;
}

export function isExperimentStudioReady(document: ExperimentStudioDocument): boolean {
  return document.blocks.length > 0 && !validateExperimentStudio(document).some((issue) => issue.severity === "error");
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function experimentStudioStorageKey(projectId: string): string {
  return `cerise-experiment-studio:${projectId}:v${EXPERIMENT_STUDIO_STORAGE_VERSION}`;
}

export function readExperimentStudioDocument(
  storage: StorageLike,
  projectId: string,
  studyDesign?: StudyDesignDocument | null,
): ExperimentStudioDocument {
  const stored = storage.getItem(experimentStudioStorageKey(projectId));
  if (!stored) return createExperimentStudioDocument(projectId, studyDesign);
  try {
    return normalizeExperimentStudioDocument(JSON.parse(stored), projectId, studyDesign);
  } catch {
    return createExperimentStudioDocument(projectId, studyDesign);
  }
}

export function writeExperimentStudioDocument(storage: StorageLike, document: ExperimentStudioDocument): void {
  storage.setItem(experimentStudioStorageKey(document.projectId), JSON.stringify(document));
}
