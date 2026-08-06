import assert from "node:assert/strict";
import test from "node:test";
import {
  assignExperimentCondition,
  collectExperimentVariables,
  createExperimentBranchRule,
  createExperimentBlock,
  createExperimentCondition,
  createExperimentStudioDocument,
  experimentStudioSpecSize,
  isExperimentStudioReady,
  normalizeExperimentStudioDocument,
  previewExperimentAssignments,
  readExperimentStudioDocument,
  resolveExperimentNextBlockId,
  validateExperimentStudio,
  writeExperimentStudioDocument,
  MAX_EXPERIMENT_SPEC_BYTES,
  EXPERIMENT_STUDIO_SCHEMA_VERSION,
  normalizeExperimentBlockMedia,
} from "./experimentStudio";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

test("a new Experimental Studio draft provides a safe five-screen study flow", () => {
  const document = createExperimentStudioDocument("project-1");

  assert.equal(document.schemaVersion, EXPERIMENT_STUDIO_SCHEMA_VERSION);
  assert.deepEqual(document.trialTables, []);
  assert.equal(document.timingDiagnostic, null);
  assert.deepEqual(document.blocks.map((block) => block.type), [
    "welcome",
    "consent",
    "instructions",
    "rating",
    "debrief",
  ]);
  assert.equal(isExperimentStudioReady(document), true);
  assert.equal(validateExperimentStudio(document).filter((issue) => issue.severity === "error").length, 0);
});

test("older drafts upgrade to the media-capable schema without losing blocks", () => {
  const normalized = normalizeExperimentStudioDocument({
    schemaVersion: 1,
    title: "Existing study",
    blocks: [{
      id: "legacy-question",
      type: "rating",
      title: "Legacy rating",
      internalName: "legacy_rating",
      heading: "A legacy heading",
      prompt: "A legacy question",
      responseType: "likert",
      variableName: "legacy_rating",
      required: true,
      scaleMin: 1,
      scaleMax: 5,
    }],
  }, "project-1");

  assert.equal(normalized.schemaVersion, EXPERIMENT_STUDIO_SCHEMA_VERSION);
  assert.equal(normalized.blocks[0].title, "Legacy rating");
  assert.equal(normalized.blocks[0].displayDurationMs, 0);
  assert.equal(normalized.conditions[0].name, "All participants");
  assert.equal(normalized.assignment.method, "single");
  assert.deepEqual(normalized.branchRules, []);
  assert.equal(normalized.blocks[0].media, null);
  assert.deepEqual(normalized.trialTables, []);
  assert.equal(normalized.timingDiagnostic, null);
});

test("screen images allow only compact raster data URLs", () => {
  assert.deepEqual(normalizeExperimentBlockMedia({
    kind: "image",
    dataUrl: "data:image/webp;base64,AAAA",
    altText: "Neutral geometric stimulus",
    source: "upload",
  }), {
    kind: "image",
    dataUrl: "data:image/webp;base64,AAAA",
    altText: "Neutral geometric stimulus",
    source: "upload",
  });
  assert.equal(normalizeExperimentBlockMedia({
    kind: "image",
    dataUrl: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
  }), null);
});

test("untrusted study data is normalized, bounded, and locked to the requested project", () => {
  const normalized = normalizeExperimentStudioDocument({
    projectId: "another-project",
    title: "x".repeat(300),
    blocks: [{
      id: "unsafe id<script>",
      type: "rating",
      title: "Rating",
      prompt: "Question",
      responseType: "likert",
      variableName: "rating_1",
      choices: Array.from({ length: 50 }, (_, index) => `Choice ${index}`),
      scaleMin: -100,
      scaleMax: 100,
    }],
  }, "project-1");

  assert.equal(normalized.projectId, "project-1");
  assert.equal(normalized.title.length, 160);
  assert.match(normalized.blocks[0].id, /^[A-Za-z0-9_-]+$/);
  assert.equal(normalized.blocks[0].choices.length, 20);
  assert.equal(normalized.blocks[0].scaleMin, 0);
  assert.equal(normalized.blocks[0].scaleMax, 20);
});

test("variables and completion checks detect duplicate or malformed analysis names", () => {
  const document = createExperimentStudioDocument("project-1");
  document.blocks[1].variableName = "duplicate_name";
  document.blocks[3].variableName = "duplicate_name";

  assert.equal(collectExperimentVariables(document).length, 2);
  assert.equal(isExperimentStudioReady(document), false);
  assert.ok(validateExperimentStudio(document).some((issue) => issue.id.endsWith("duplicate-variable")));

  document.blocks[3].variableName = "1_invalid";
  assert.ok(validateExperimentStudio(document).some((issue) => issue.id.endsWith("-variable")));
});

test("completion checks reject broken consent options and branching loops", () => {
  const document = createExperimentStudioDocument("project-1");
  document.blocks[1].choices = ["I agree"];
  document.blocks[2].nextBlockId = document.blocks[3].id;
  document.blocks[3].nextBlockId = document.blocks[2].id;

  const issues = validateExperimentStudio(document);
  assert.ok(issues.some((issue) => issue.id.endsWith("-choices")));
  assert.ok(issues.some((issue) => issue.id.endsWith("-branch-cycle")));
  assert.equal(isExperimentStudioReady(document), false);
});

test("condition assignment is deterministic and respects the saved seed", () => {
  const document = createExperimentStudioDocument("project-1");
  document.conditions = [
    createExperimentCondition("control", "Control"),
    createExperimentCondition("intervention", "Intervention"),
  ];
  document.assignment = { method: "random", previewSeed: 42 };

  const first = previewExperimentAssignments(document, 20).map((condition) => condition.id);
  const second = previewExperimentAssignments(document, 20).map((condition) => condition.id);
  assert.deepEqual(first, second);
  assert.equal(assignExperimentCondition(document, "participant-7").id, assignExperimentCondition(document, "participant-7").id);
  assert.ok(new Set(first).size > 1);
});

test("response branches use the first matching condition-aware rule", () => {
  const document = createExperimentStudioDocument("project-1");
  const rating = document.blocks.find((block) => block.type === "rating");
  const instructions = document.blocks.find((block) => block.type === "instructions");
  assert.ok(rating);
  assert.ok(instructions);
  document.conditions = [
    createExperimentCondition("control", "Control"),
    createExperimentCondition("intervention", "Intervention"),
  ];
  const rule = createExperimentBranchRule("rule-1", rating.id, instructions.id);
  rule.operator = "greater-than-or-equal";
  rule.value = "4";
  rule.conditionId = "intervention";
  document.branchRules = [rule];

  assert.equal(resolveExperimentNextBlockId(document, rating.id, { [rating.id]: "5" }, "intervention"), instructions.id);
  assert.notEqual(resolveExperimentNextBlockId(document, rating.id, { [rating.id]: "5" }, "control"), instructions.id);
});

test("Phase 3 checks reject invalid randomization and branch configurations", () => {
  const document = createExperimentStudioDocument("project-1");
  document.assignment.method = "random";
  assert.ok(validateExperimentStudio(document).some((issue) => issue.id === "random-needs-conditions"));

  const rating = document.blocks.find((block) => block.type === "rating");
  assert.ok(rating);
  const rule = createExperimentBranchRule("rule-1", rating.id, rating.id);
  rule.operator = "greater-than-or-equal";
  rule.value = "4";
  document.branchRules = [rule];
  const issues = validateExperimentStudio(document);
  assert.ok(issues.some((issue) => issue.id === "rule-1-self-loop"));
  assert.ok(issues.some((issue) => issue.id.endsWith("branch-cycle")));
});

test("behavioral response blocks require auditable key and attention-check scoring", () => {
  const document = createExperimentStudioDocument("project-1");
  const keyboard = createExperimentBlock("keyboard-response", "keyboard-1");
  keyboard.allowedKeys = ["f", "F"];
  keyboard.correctAnswer = "j";
  const attention = createExperimentBlock("attention-check", "attention-1");
  attention.correctAnswer = "Missing option";
  document.blocks.splice(3, 0, keyboard, attention);

  const issues = validateExperimentStudio(document);
  assert.ok(issues.some((issue) => issue.id === "keyboard-1-duplicate-keys"));
  assert.ok(issues.some((issue) => issue.id === "keyboard-1-correct-key"));
  assert.ok(issues.some((issue) => issue.id === "attention-1-correct-answer-option"));
});

test("audio responses require separate preceding recording consent and bounded limits", () => {
  const document = createExperimentStudioDocument("project-1");
  const audioConsent = createExperimentBlock("audio-consent", "audio-consent-1");
  const audio = createExperimentBlock("audio-response", "audio-response-1");
  assert.ok(audio.audio);
  document.blocks.splice(2, 0, audioConsent, audio);

  assert.ok(validateExperimentStudio(document).some((issue) => issue.id === "audio-response-1-audio-consent"));

  audio.audio.consentBlockId = audioConsent.id;
  document.blocks[2] = audio;
  document.blocks[3] = audioConsent;
  assert.ok(validateExperimentStudio(document).some((issue) => issue.id === "audio-response-1-audio-consent-order"));

  document.blocks = document.blocks.filter((block) => block.id !== audio.id && block.id !== audioConsent.id);
  document.blocks.splice(2, 0, audioConsent, audio);
  assert.equal(validateExperimentStudio(document).some((issue) => issue.blockId === audio.id && issue.severity === "error"), false);
});

test("untrusted audio settings are normalized to the local safety bounds", () => {
  const normalized = normalizeExperimentStudioDocument({
    blocks: [{
      id: "audio-1",
      type: "audio-response",
      title: "Voice response",
      internalName: "voice_response",
      heading: "Record",
      prompt: "Speak",
      responseType: "audio",
      variableName: "voice_response",
      required: true,
      audio: {
        consentBlockId: "../../unsafe",
        maxDurationSeconds: 50_000,
        maxBytes: 999_999_999,
        requireMicrophoneCheck: false,
      },
    }],
  }, "project-1");

  assert.equal(normalized.blocks[0].audio?.consentBlockId, "unsafe");
  assert.equal(normalized.blocks[0].audio?.maxDurationSeconds, 300);
  assert.equal(normalized.blocks[0].audio?.maxBytes, 25 * 1024 * 1024);
  assert.equal(normalized.blocks[0].audio?.requireMicrophoneCheck, true);
});

test("video responses require separate preceding video consent and optional audio consent", () => {
  const document = createExperimentStudioDocument("project-1");
  const videoConsent = createExperimentBlock("video-consent", "video-consent-1");
  const audioConsent = createExperimentBlock("audio-consent", "audio-consent-1");
  const video = createExperimentBlock("video-response", "video-response-1");
  assert.ok(video.video);
  document.blocks.splice(2, 0, videoConsent, audioConsent, video);

  assert.ok(validateExperimentStudio(document).some((issue) => issue.id === "video-response-1-video-consent"));

  video.video.consentBlockId = videoConsent.id;
  video.video.includeAudio = true;
  assert.ok(validateExperimentStudio(document).some((issue) => issue.id === "video-response-1-video-audio-consent"));

  video.video.audioConsentBlockId = audioConsent.id;
  assert.equal(
    validateExperimentStudio(document).some((issue) => issue.blockId === video.id && issue.severity === "error"),
    false,
  );

  document.blocks = document.blocks.filter((block) => block.id !== videoConsent.id);
  document.blocks.splice(4, 0, videoConsent);
  assert.ok(validateExperimentStudio(document).some((issue) => issue.id === "video-response-1-video-consent-order"));
});

test("untrusted video settings are normalized to local capture limits", () => {
  const normalized = normalizeExperimentStudioDocument({
    blocks: [{
      id: "video-1",
      type: "video-response",
      title: "Camera response",
      internalName: "camera_response",
      heading: "Record",
      prompt: "Respond on camera",
      responseType: "video",
      variableName: "camera_response",
      required: true,
      video: {
        consentBlockId: "../../video-consent",
        includeAudio: true,
        audioConsentBlockId: "../../audio-consent",
        maxDurationSeconds: 50_000,
        maxBytes: 999_999_999,
        cameraFacing: "invalid",
        requireCameraCheck: false,
      },
    }],
  }, "project-1");

  assert.equal(normalized.blocks[0].video?.consentBlockId, "video-consent");
  assert.equal(normalized.blocks[0].video?.audioConsentBlockId, "audio-consent");
  assert.equal(normalized.blocks[0].video?.includeAudio, true);
  assert.equal(normalized.blocks[0].video?.maxDurationSeconds, 300);
  assert.equal(normalized.blocks[0].video?.maxBytes, 100 * 1024 * 1024);
  assert.equal(normalized.blocks[0].video?.cameraFacing, "user");
  assert.equal(normalized.blocks[0].video?.requireCameraCheck, true);
});

test("local versioned persistence round-trips and malformed JSON fails open", () => {
  const storage = memoryStorage();
  const document = createExperimentStudioDocument("project-1");
  writeExperimentStudioDocument(storage, document);

  assert.equal(readExperimentStudioDocument(storage, "project-1").blocks.length, 5);
  storage.setItem("cerise-experiment-studio:project-1:v1", "{bad-json");
  assert.equal(readExperimentStudioDocument(storage, "project-1").blocks.length, 5);
});

test("the specification-size guard stays below the database row limit", () => {
  const document = createExperimentStudioDocument("project-1");
  assert.ok(experimentStudioSpecSize(document) < MAX_EXPERIMENT_SPEC_BYTES);

  document.blocks[0].prompt = "x".repeat(MAX_EXPERIMENT_SPEC_BYTES);
  assert.ok(validateExperimentStudio(document).some((issue) => issue.id === "spec-too-large"));
  assert.equal(isExperimentStudioReady(document), false);
});
