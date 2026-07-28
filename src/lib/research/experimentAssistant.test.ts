import assert from "node:assert/strict";
import test from "node:test";
import {
  createExperimentAssistantContext,
  normalizeExperimentAssistantRequest,
  parseExperimentAssistantResponse,
} from "./experimentAssistant";
import { createExperimentStudioDocument } from "./experimentStudio";

test("assistant requests contain bounded study context without embedded media", () => {
  const studio = createExperimentStudioDocument("project-1");
  studio.blocks[0].media = {
    kind: "image",
    dataUrl: "data:image/webp;base64,AAAA",
    altText: "Stimulus",
    source: "upload",
  };
  const context = createExperimentAssistantContext(studio, studio.blocks[0].id, null);
  const request = normalizeExperimentAssistantRequest({
    projectId: "project-1<script>",
    prompt: "Review this screen",
    history: [{ role: "user", content: "Earlier question" }],
    context,
  });

  assert.ok(request);
  assert.equal(request.projectId, "project-1script");
  assert.equal(request.context.blocks[0].hasImage, true);
  assert.equal("media" in request.context.blocks[0], false);
});

test("assistant output keeps only reviewable suggestions for existing blocks", () => {
  const studio = createExperimentStudioDocument("project-1");
  const context = createExperimentAssistantContext(studio, studio.blocks[0].id, null);
  const response = parseExperimentAssistantResponse(JSON.stringify({
    reply: "Review these changes.",
    suggestions: [
      {
        id: "valid-update",
        kind: "block-update",
        title: "Clarify wording",
        rationale: "Reduce ambiguity.",
        targetBlockId: studio.blocks[0].id,
        patch: { prompt: "Please read the following information.", nextBlockId: "unsafe-target" },
      },
      {
        id: "invalid-update",
        kind: "block-update",
        title: "Unknown target",
        rationale: "Should be rejected.",
        targetBlockId: "missing-block",
        patch: { prompt: "Unsafe" },
      },
    ],
  }), context);

  assert.equal(response.suggestions.length, 1);
  const suggestion = response.suggestions[0];
  assert.equal(suggestion.kind, "block-update");
  if (suggestion.kind === "block-update") {
    assert.equal(suggestion.patch.prompt, "Please read the following information.");
    assert.equal("nextBlockId" in suggestion.patch, false);
  }
});

test("image planning returns detailed copy-ready prompts instead of generated files", () => {
  const studio = createExperimentStudioDocument("project-1");
  const context = createExperimentAssistantContext(studio, studio.blocks[0].id, null);
  const response = parseExperimentAssistantResponse(JSON.stringify({
    reply: "Use two matched images.",
    suggestions: [{
      id: "image-plan-1",
      kind: "image-plan",
      title: "Matched workspace stimuli",
      rationale: "The manipulation depends on visible clutter.",
      recommendation: "Use one matched image per condition.",
      totalImages: 2,
      imageSetStructure: "One control image and one treatment image.",
      sharedRequirements: "Same camera angle, lighting, and room.",
      presentationPlan: "Show one image after instructions using random condition assignment.",
      qualityChecks: ["Confirm that only desk organization differs."],
      images: [
        {
          id: "control",
          label: "Organized workspace",
          purpose: "Control condition",
          condition: "Control",
          screenPlacement: "Control stimulus screen",
          matchedWith: "Treatment cluttered-workspace image",
          technicalSpec: "Landscape 4:3, 1200 × 900 pixels, neutral photograph.",
          heldConstant: "Room, camera, lighting, desk, and objects.",
          manipulatedElements: "Desk organization only.",
          prompt: "A neutral university workspace photographed straight on, organized desk, no people, no logos.",
          negativePrompt: "No people, text, logos, dramatic lighting, or extra objects.",
          altText: "An organized university workspace.",
          reviewChecks: "Compare framing, object count, and brightness against the treatment image.",
        },
        {
          id: "treatment",
          label: "Cluttered workspace",
          purpose: "Treatment condition",
          condition: "Treatment",
          screenPlacement: "Treatment stimulus screen",
          matchedWith: "Control organized-workspace image",
          technicalSpec: "Landscape 4:3, 1200 × 900 pixels, neutral photograph.",
          heldConstant: "Room, camera, lighting, desk, and objects.",
          manipulatedElements: "Desk organization only.",
          prompt: "The same neutral university workspace photographed straight on, cluttered desk, no people, no logos.",
          negativePrompt: "No people, text, logos, dramatic lighting, or additional objects.",
          altText: "A cluttered university workspace.",
          reviewChecks: "Compare framing, object count, and brightness against the control image.",
        },
      ],
    }],
  }), context);

  assert.equal(response.suggestions[0]?.kind, "image-plan");
  if (response.suggestions[0]?.kind === "image-plan") {
    assert.equal(response.suggestions[0].totalImages, 2);
    assert.equal(response.suggestions[0].images[0].manipulatedElements, "Desk organization only.");
    assert.equal(response.suggestions[0].qualityChecks.length, 1);
  }
  assert.equal(JSON.stringify(response).includes("data:image"), false);
});
