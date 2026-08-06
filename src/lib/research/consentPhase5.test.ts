import assert from "node:assert/strict";
import test from "node:test";
import { EMPTY_RESEARCH_PATH_DRAFT } from "./researchPathDraft";
import { GENERIC_US_CONSENT_AUTHORITY_MANIFEST } from "./consentAuthority";
import { createStudyDesignDocument, type StudyDesignDocument } from "./studyDesign";
import {
  createExperimentBlock,
  createExperimentStudioDocument,
  type ExperimentStudioDocument,
} from "./experimentStudio";
import {
  addConsentPhase5Version,
  buildConsentPhase5ReviewPackage,
  changeConsentPhase5FormKind,
  collectConsentPhase5Issues,
  compileConsentPhase5Source,
  createConsentPhase5Document,
  isConsentPhase5Ready,
  normalizeConsentPhase5Document,
  participantConsentPreview,
  reconcileConsentPhase5Document,
  recordConsentPhase5Export,
  updateConsentPhase5Clause,
  updateConsentPhase5Inputs,
  type ConsentPhase5Document,
  type ConsentResearcherInputs,
} from "./consentPhase5";

const PROJECT_ID = "phase-5-consent-fixture";
const NOW = "2026-07-31T16:00:00.000Z";

function fixtureDesign(
  design: StudyDesignDocument["spec"]["design"]["selectedDesign"] = "cross-sectional-survey",
  setting: StudyDesignDocument["spec"]["design"]["setting"] = "online",
): StudyDesignDocument {
  const document = createStudyDesignDocument(PROJECT_ID, EMPTY_RESEARCH_PATH_DRAFT);
  document.updatedAt = NOW;
  document.spec.design = {
    ...document.spec.design,
    goal: design === "qualitative" ? "explore-experience" : "describe-pattern",
    setting,
    selectedDesign: design,
    selectionRationale: "The selected design matches the research question and participant setting.",
    approved: true,
  };
  document.spec.participants = {
    ...document.spec.participants,
    targetPopulation: "English-speaking adults age 18 or older",
    samplingStrategy: "Volunteer convenience sample",
    inclusionCriteria: "Age 18 or older and able to provide consent",
    exclusionCriteria: "Unable to complete the study in English",
    recruitmentChannel: "Research participant pool",
    plannedSampleSize: "120",
    sampleSizeRationale: "Planned from the analysis contract",
    approved: true,
  };
  return document;
}

function fixtureStudio(design = fixtureDesign()): ExperimentStudioDocument {
  const studio = createExperimentStudioDocument(PROJECT_ID, design);
  studio.updatedAt = NOW;
  studio.title = "Online attitudes study";
  const rating = studio.blocks.find((block) => block.type === "rating");
  if (rating) {
    rating.title = "Attitude rating";
    rating.heading = "Attitudes";
    rating.prompt = "How strongly do you agree?";
    rating.variableName = "attitude_score";
  }
  return studio;
}

const COMPLETE_INPUTS: ConsentResearcherInputs = {
  studyPurpose: "This study examines how adults evaluate public information.",
  duration: "about 20 minutes.",
  risksAndDiscomforts: "Some questions may feel personal. Participants may skip a question or stop.",
  benefits: "There may be no direct benefit to participants.",
  alternatives: "The alternative is not to take part.",
  compensationAndCosts: "There is no payment and no expected cost.",
  privacyProtections: "Responses are stored under a coded study identifier and access is limited.",
  dataAccess: "The approved research team can access study information.",
  dataRetention: "Study information will be retained for five years and then deleted.",
  withdrawalMethod: "Close the study or contact the study team to stop.",
  withdrawalBoundary: "Anonymous information cannot be located after submission; coded information can be removed before de-identification.",
  studyContact: "Principal investigator, research@example.edu",
  rightsContact: "Applicable institutional participant-rights office",
  identifiability: "confidential",
  futureUsePlan: "will-not-use-for-future-research",
  recordingPurpose: "Recordings support accurate transcription.",
  recordingAccessAndUse: "Only the approved research team may access recordings for transcription.",
  recordingRetention: "Recordings will be destroyed after transcripts are verified.",
};

async function completeDocument(
  design = fixtureDesign(),
  studio = fixtureStudio(design),
): Promise<{ document: ConsentPhase5Document; studio: ExperimentStudioDocument }> {
  let document = await createConsentPhase5Document(
    PROJECT_ID,
    design,
    studio,
    GENERIC_US_CONSENT_AUTHORITY_MANIFEST,
    NOW,
  );
  document = updateConsentPhase5Inputs(document, COMPLETE_INPUTS, NOW);
  document = {
    ...document,
    authorityApplicabilityConfirmed: true,
    governance: {
      pathway: "expedited-or-full",
      decisionSource: "institution",
      institutionReference: "IRB protocol fixture-001",
      documentationMethod: "signed-electronic",
      waiverOrAlteration: null,
    },
  };
  for (const clause of document.forms.flatMap((form) => form.clauses)) {
    document = updateConsentPhase5Clause(document, clause.id, { reviewState: "human-reviewed" }, NOW).document;
  }
  return { document, studio };
}

test("compiler binds consent facts to the implemented design and Studio without approval claims", async () => {
  const design = fixtureDesign("randomized-between", "laboratory");
  const studio = fixtureStudio(design);
  studio.assignment.method = "random";
  studio.conditions = [
    { id: "condition-a", name: "Message A", weight: 1 },
    { id: "condition-b", name: "Message B", weight: 1 },
  ];
  const compiled = await compileConsentPhase5Source(design, studio);
  const document = await createConsentPhase5Document(PROJECT_ID, design, studio, GENERIC_US_CONSENT_AUTHORITY_MANIFEST, NOW);

  assert.match(compiled.facts.find((fact) => fact.id === "fact-assignment")?.value ?? "", /Random assignment/);
  assert.equal(document.formKind, "adult-standard");
  assert.ok(document.forms[0].clauses.some((clause) => clause.kind === "key-information"));
  assert.ok(document.forms[0].clauses.some((clause) => clause.kind === "voluntary-participation" && clause.editPolicy === "locked"));
  assert.equal(document.authorityManifest.claimBoundary, "authoring-consistency-support-not-irb-legal-ethics-or-compliance-approval");
});

test("anonymous form claims are blocked when implemented data are identifying or recorded", async () => {
  const design = fixtureDesign();
  const studio = fixtureStudio(design);
  const audio = createExperimentBlock("audio-response", "block-audio");
  audio.variableName = "interview_audio";
  studio.blocks.splice(-1, 0, audio);
  let document = await createConsentPhase5Document(PROJECT_ID, design, studio, GENERIC_US_CONSENT_AUTHORITY_MANIFEST, NOW);
  document = changeConsentPhase5FormKind(document, "anonymous-survey-information", NOW);
  document = updateConsentPhase5Inputs(document, { ...COMPLETE_INPUTS, identifiability: "anonymous" }, NOW);
  const issues = collectConsentPhase5Issues(document);

  assert.ok(issues.some((issue) => issue.id === "anonymous-claim-conflicts-with-implemented-data" && issue.severity === "blocking"));
  assert.ok(document.forms.some((form) => form.kind === "audio-recording-choice"));
});

test("audio and video procedures produce separate recording decisions and explicit retention gates", async () => {
  const design = fixtureDesign("qualitative", "online");
  const studio = fixtureStudio(design);
  studio.blocks.splice(-1, 0,
    createExperimentBlock("audio-response", "block-audio"),
    createExperimentBlock("video-response", "block-video"),
  );
  let document = await createConsentPhase5Document(PROJECT_ID, design, studio, GENERIC_US_CONSENT_AUTHORITY_MANIFEST, NOW);
  let issues = collectConsentPhase5Issues(document);
  assert.deepEqual(document.forms.map((form) => form.kind), ["adult-interview", "audio-recording-choice", "video-recording-choice"]);
  assert.ok(issues.some((issue) => issue.id === "input-recordingRetention-missing"));

  document = updateConsentPhase5Inputs(document, {
    recordingPurpose: COMPLETE_INPUTS.recordingPurpose,
    recordingAccessAndUse: COMPLETE_INPUTS.recordingAccessAndUse,
    recordingRetention: COMPLETE_INPUTS.recordingRetention,
  }, NOW);
  issues = collectConsentPhase5Issues(document);
  assert.ok(!issues.some((issue) => issue.id === "input-recordingRetention-missing"));
});

test("governance, participant facts, and per-clause human review are blocking authoring gates", async () => {
  const document = await createConsentPhase5Document(
    PROJECT_ID,
    fixtureDesign(),
    fixtureStudio(),
    GENERIC_US_CONSENT_AUTHORITY_MANIFEST,
    NOW,
  );
  const issueIds = new Set(collectConsentPhase5Issues(document).map((issue) => issue.id));
  assert.ok(issueIds.has("authority-applicability-unconfirmed"));
  assert.ok(issueIds.has("governance-pathway-undetermined"));
  assert.ok(issueIds.has("input-studyPurpose-missing"));
  assert.ok([...issueIds].some((id) => id.startsWith("clause-review-")));
});

test("locked participant-rights wording cannot be silently rewritten", async () => {
  const document = await createConsentPhase5Document(
    PROJECT_ID,
    fixtureDesign(),
    fixtureStudio(),
    GENERIC_US_CONSENT_AUTHORITY_MANIFEST,
    NOW,
  );
  const clause = document.forms[0].clauses.find((candidate) => candidate.editPolicy === "locked");
  assert.ok(clause);
  const result = updateConsentPhase5Clause(document, clause.id, { text: "Participation is mandatory." }, NOW);
  assert.deepEqual(result.issues, ["locked-clause-text"]);
  assert.equal(result.document.forms[0].clauses.find((candidate) => candidate.id === clause.id)?.text, clause.text);
});

test("editable clauses cannot pass with exculpatory, coercive, or software-approval claims", async () => {
  let document = await createConsentPhase5Document(
    PROJECT_ID,
    fixtureDesign(),
    fixtureStudio(),
    GENERIC_US_CONSENT_AUTHORITY_MANIFEST,
    NOW,
  );
  const purpose = document.forms[0].clauses.find((clause) => clause.kind === "purpose");
  const risks = document.forms[0].clauses.find((clause) => clause.kind === "risks");
  const privacy = document.forms[0].clauses.find((clause) => clause.kind === "confidentiality");
  assert.ok(purpose && risks && privacy);
  document = updateConsentPhase5Clause(document, purpose.id, { text: "Participation is mandatory because Cerise AI approved this study." }, NOW).document;
  document = updateConsentPhase5Clause(document, risks.id, { text: "By participating, you waive your legal rights and release the researchers from negligence." }, NOW).document;
  document = updateConsentPhase5Clause(document, privacy.id, { text: "Your information has guaranteed confidentiality with zero privacy risk." }, NOW).document;
  const issueIds = new Set(collectConsentPhase5Issues(document).map((issue) => issue.id));
  assert.ok(issueIds.has(`clause-coercive-${purpose.id}`));
  assert.ok(issueIds.has(`clause-false-approval-${purpose.id}`));
  assert.ok(issueIds.has(`clause-exculpatory-${risks.id}`));
  assert.ok(issueIds.has(`clause-absolute-privacy-${privacy.id}`));
});

test("source reconciliation preserves researcher edits and forces renewed human review", async () => {
  const design = fixtureDesign();
  const studio = fixtureStudio(design);
  let document = await createConsentPhase5Document(PROJECT_ID, design, studio, GENERIC_US_CONSENT_AUTHORITY_MANIFEST, NOW);
  const procedure = document.forms[0].clauses.find((clause) => clause.kind === "procedures");
  assert.ok(procedure);
  const edited = "Researcher-authored procedure text that must survive recompilation.";
  document = updateConsentPhase5Clause(document, procedure.id, { text: edited, reviewState: "human-reviewed" }, NOW).document;
  const changedStudio = structuredClone(studio);
  const rating = changedStudio.blocks.find((block) => block.type === "rating");
  if (rating) rating.heading = "A changed implemented procedure heading";
  document = await reconcileConsentPhase5Document(document, design, changedStudio, "2026-07-31T17:00:00.000Z");
  const reconciled = document.forms[0].clauses.find((clause) => clause.id === procedure.id);
  assert.equal(reconciled?.text, edited);
  assert.equal(reconciled?.researcherEdited, true);
  assert.equal(reconciled?.reviewState, "human-review-required");
});

test("normalization stores only bounded attachment metadata and rejects embedded contents", async () => {
  const { document } = await completeDocument();
  const valid = {
    ...document,
    authorityAttachment: {
      filename: "current-template.docx",
      mediaType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      byteLength: 24_000,
      checksum: `sha256:${"a".repeat(64)}`,
      importedAt: NOW,
      contentsStored: false,
    },
  };
  assert.equal(normalizeConsentPhase5Document(valid, PROJECT_ID)?.authorityAttachment?.contentsStored, false);
  assert.equal(normalizeConsentPhase5Document({
    ...valid,
    authorityAttachment: { ...valid.authorityAttachment, contentsStored: true, contents: "official source text" },
  }, PROJECT_ID), null);
});

test("review packages and completion remain checksum-bound to current study sources", async () => {
  const design = fixtureDesign();
  const completed = await completeDocument(design, fixtureStudio(design));
  assert.equal(collectConsentPhase5Issues(completed.document).filter((issue) => issue.severity === "blocking").length, 0);
  const versioned = await addConsentPhase5Version(completed.document, NOW);
  const reviewPackage = await buildConsentPhase5ReviewPackage(versioned, versioned.sourceFingerprint, NOW);
  const exported = recordConsentPhase5Export(versioned, reviewPackage);
  assert.equal(isConsentPhase5Ready(exported, exported.sourceFingerprint), true);
  assert.equal(reviewPackage.schemaVersion, 4);
  assert.equal(reviewPackage.phase7.schemaVersion, 1);
  assert.equal(reviewPackage.phase8.schemaVersion, 1);
  assert.equal(reviewPackage.claim, "review-package-not-irb-legal-ethics-compliance-or-release-approval");
  assert.match(participantConsentPreview(exported), /Taking part is your choice/);

  const changedStudio = fixtureStudio(design);
  changedStudio.title = "Changed source";
  changedStudio.updatedAt = "2026-07-31T18:00:00.000Z";
  const changedSource = await compileConsentPhase5Source(design, changedStudio);
  assert.equal(isConsentPhase5Ready(exported, changedSource.sourceFingerprint), false);
  assert.ok(collectConsentPhase5Issues(exported, changedSource.sourceFingerprint).some((issue) => issue.id === "study-source-stale"));
});

test("the initial Phase 5 form-family matrix compiles the intended family", async () => {
  const document = await createConsentPhase5Document(
    PROJECT_ID,
    fixtureDesign(),
    fixtureStudio(),
    GENERIC_US_CONSENT_AUTHORITY_MANIFEST,
    NOW,
  );
  for (const formKind of [
    "adult-standard",
    "anonymous-survey-information",
    "confidential-survey-information",
    "adult-interview",
  ] as const) {
    const changed = changeConsentPhase5FormKind(document, formKind, NOW);
    assert.equal(changed.forms[0].kind, formKind);
    assert.ok(changed.forms[0].clauses.length >= 10);
  }
});
