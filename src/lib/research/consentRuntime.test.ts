import assert from "node:assert/strict";
import test from "node:test";
import { sha256ArtifactChecksum } from "./artifactIdentity";
import { GENERIC_US_CONSENT_AUTHORITY_MANIFEST } from "./consentAuthority";
import {
  addConsentPhase5Version,
  buildConsentPhase5ReviewPackage,
  compileConsentPhase5Source,
  createConsentPhase5Document,
  recordConsentPhase5Export,
  updateConsentPhase5Clause,
  updateConsentPhase5Inputs,
  type ConsentPhase5Document,
  type ConsentResearcherInputs,
} from "./consentPhase5";
import {
  bindConsentRuntimeToStudio,
  buildConsentRuntimeArtifact,
  collectConsentRuntimeIssues,
  consentRuntimeArtifactMatchesReference,
  createConsentRuntimeSessionState,
  createLocalConsentReceipt,
  createWithdrawalReceipt,
  participantConsentCopy,
  scrubSessionForRefusalOrWithdrawal,
  transitionConsentRuntimeSession,
  verifyConsentRuntimeArtifact,
} from "./consentRuntime";
import {
  createExperimentBlock,
  createExperimentStudioDocument,
  validateExperimentStudio,
  type ExperimentStudioDocument,
} from "./experimentStudio";
import { buildExperimentRunnerPackage, canBuildExperimentRunnerPackage } from "./experimentRunnerPackage";
import { createStudyDesignDocument, type StudyDesignDocument } from "./studyDesign";
import { EMPTY_RESEARCH_PATH_DRAFT } from "./researchPathDraft";

const PROJECT_ID = "phase-10-runtime-fixture";
const NOW = "2026-08-01T16:00:00.000Z";

const INPUTS: ConsentResearcherInputs = {
  studyPurpose: "This research examines how adults evaluate public information.",
  duration: "about 20 minutes.",
  risksAndDiscomforts: "Some questions may feel personal. You may skip a question or stop.",
  benefits: "There may be no direct benefit.",
  alternatives: "The alternative is not to participate.",
  compensationAndCosts: "There is no payment and no expected cost.",
  privacyProtections: "Responses use a coded local session identifier.",
  dataAccess: "Only the approved research team may access study information.",
  dataRetention: "Coded study information is retained for five years.",
  withdrawalMethod: "Use Stop or withdraw in the study, or contact the study team.",
  withdrawalBoundary: "The provisional local session can be removed before completion. Information already de-identified or included in completed analyses may no longer be identifiable for deletion.",
  studyContact: "Study team at research@example.edu",
  rightsContact: "Applicable institutional participant-rights office",
  identifiability: "confidential",
  futureUsePlan: "will-not-use-for-future-research",
  recordingPurpose: "Audio is used for accurate transcription.",
  recordingAccessAndUse: "Only the approved research team may access recordings.",
  recordingRetention: "Recordings are destroyed after transcription checks.",
};

function design(): StudyDesignDocument {
  const document = createStudyDesignDocument(PROJECT_ID, EMPTY_RESEARCH_PATH_DRAFT);
  document.updatedAt = NOW;
  document.spec.design = {
    ...document.spec.design,
    goal: "describe-pattern",
    setting: "online",
    selectedDesign: "cross-sectional-survey",
    selectionRationale: "A home survey fits the descriptive question.",
    approved: true,
  };
  document.spec.participants = {
    ...document.spec.participants,
    targetPopulation: "English-speaking adults age 18 or older",
    samplingStrategy: "Volunteer sample",
    inclusionCriteria: "Adult and able to provide self-consent in English",
    exclusionCriteria: "Protected-audience consent path required",
    recruitmentChannel: "Approved participant pool",
    plannedSampleSize: "120",
    sampleSizeRationale: "Analysis-plan target",
    approved: true,
  };
  return document;
}

function studio(studyDesign = design(), recording = false, legacySchema = false): ExperimentStudioDocument {
  const document = createExperimentStudioDocument(PROJECT_ID, studyDesign);
  document.updatedAt = NOW;
  document.title = "Public information survey";
  if (recording) {
    const audioConsent = createExperimentBlock("audio-consent", "block-audio-consent");
    const audio = createExperimentBlock("audio-response", "block-audio-response");
    audio.audio!.consentBlockId = audioConsent.id;
    document.blocks.splice(-1, 0, audioConsent, audio);
    const mainConsent = document.blocks.find((block) => block.type === "consent");
    if (mainConsent) mainConsent.nextBlockId = audioConsent.id;
    audioConsent.nextBlockId = audio.id;
  }
  if (legacySchema) document.schemaVersion = 8 as never;
  return document;
}

async function reviewedRuntimeFixture(recording = false, legacySchema = false): Promise<{
  document: ConsentPhase5Document;
  studio: ExperimentStudioDocument;
  design: StudyDesignDocument;
}> {
  const studyDesign = design();
  const experiment = studio(studyDesign, recording, legacySchema);
  let document = await createConsentPhase5Document(
    PROJECT_ID,
    studyDesign,
    experiment,
    GENERIC_US_CONSENT_AUTHORITY_MANIFEST,
    NOW,
  );
  document = updateConsentPhase5Inputs(document, INPUTS, NOW);
  document = {
    ...document,
    authorityApplicabilityConfirmed: true,
    governance: {
      pathway: "expedited-or-full",
      decisionSource: "institution",
      institutionReference: "Institutional protocol runtime-fixture",
      documentationMethod: "electronic-acknowledgement",
      waiverOrAlteration: {
        status: "approved",
        approvalReference: "Institutional waiver-of-documentation fixture",
      },
    },
  };
  for (const clause of document.forms.flatMap((form) => form.clauses)) {
    document = updateConsentPhase5Clause(document, clause.id, { reviewState: "human-reviewed" }, NOW).document;
  }
  document = await addConsentPhase5Version(document, NOW);
  const reviewPackage = await buildConsentPhase5ReviewPackage(document, document.sourceFingerprint, NOW);
  document = recordConsentPhase5Export(document, reviewPackage);
  return { document, studio: experiment, design: studyDesign };
}

test("reviewed English adult acknowledgement compiles into a bounded checksum-verifiable runtime artifact", async () => {
  const fixture = await reviewedRuntimeFixture();
  assert.deepEqual(collectConsentRuntimeIssues(fixture.document, fixture.document.sourceFingerprint), []);
  const artifact = await buildConsentRuntimeArtifact(fixture.document, fixture.document.sourceFingerprint);

  assert.equal(await verifyConsentRuntimeArtifact(artifact), true);
  assert.equal(artifact.form.audience, "adult-participant");
  assert.equal(artifact.form.language, "en-US");
  assert.equal(artifact.decisions[0].id, "main-participation");
  assert.equal(artifact.documentation.claim, "local-decision-receipt-not-signature-identity-proof-or-approval");
  assert.match(participantConsentCopy(artifact), new RegExp(artifact.form.checksum));
});

test("signed, protected-audience, regulated, and broad-consent execution paths fail closed", async () => {
  const fixture = await reviewedRuntimeFixture();
  const signed = { ...fixture.document, governance: { ...fixture.document.governance, documentationMethod: "signed-electronic" as const } };
  assert.ok(collectConsentRuntimeIssues(signed, signed.sourceFingerprint).some((issue) => issue.code === "unsupported-documentation"));

  const protectedAudience = structuredClone(fixture.document);
  protectedAudience.phase7.profile.requiredPackages = ["assent"];
  assert.ok(collectConsentRuntimeIssues(protectedAudience, protectedAudience.sourceFingerprint).some((issue) => issue.code === "unsupported-protected-audience"));

  const regulated = structuredClone(fixture.document);
  regulated.governance.pathway = "fda-regulated";
  assert.ok(collectConsentRuntimeIssues(regulated, regulated.sourceFingerprint).some((issue) => issue.code === "unsupported-regulated-process"));

  const broad = structuredClone(fixture.document);
  broad.phase8.artifacts.push({
    id: "broad-consent-fixture",
    kind: "broad-consent-form",
    moduleId: "broad-consent",
    title: "Broad consent",
    decisionMode: "dedicated-broad-consent",
    participantText: "Fixture",
    sourceFactIds: [],
    protocolProcedureReference: "Fixture",
    authorityReference: "Fixture",
    protectedElements: [],
    externalAddendumIds: [],
    sourceIdentity: `sha256:${"a".repeat(64)}`,
    reviewState: "human-reviewed",
    specialistReview: {
      state: "human-reviewed",
      reviewerName: "Reviewer",
      reviewerRoleOrCredentials: "Institutional reviewer",
      reviewReference: "Fixture",
      sourceIdentity: `sha256:${"b".repeat(64)}`,
    },
    runtimeMode: "authoring-export-only",
  });
  assert.ok(collectConsentRuntimeIssues(broad, broad.sourceFingerprint).some((issue) => issue.code === "unsupported-broad-consent"));
});

test("binding replaces legacy consent choices, moves exact consent first, and avoids a checksum cycle", async () => {
  const fixture = await reviewedRuntimeFixture(true, true);
  const artifact = await buildConsentRuntimeArtifact(fixture.document, fixture.document.sourceFingerprint);
  const before = await compileConsentPhase5Source(fixture.design, fixture.studio);
  const audioResponseId = fixture.studio.blocks.find((block) => block.type === "audio-response")?.id;
  const bound = await bindConsentRuntimeToStudio(fixture.studio, artifact, NOW);
  const after = await compileConsentPhase5Source(fixture.design, bound);
  const block = bound.blocks[0];

  assert.equal(block.type, "consent-form");
  assert.equal(bound.blocks.some((candidate) => ["consent", "audio-consent", "video-consent"].includes(candidate.type)), false);
  assert.equal(consentRuntimeArtifactMatchesReference(artifact, block.consentForm), true);
  assert.equal(before.sourceFingerprint.checksum, after.sourceFingerprint.checksum);
  assert.equal(validateExperimentStudio(bound).some((issue) => issue.severity === "error"), false);
  assert.equal(block.nextBlockId, audioResponseId);
  assert.equal(bound.blocks.find((candidate) => candidate.type === "audio-response")?.audio?.consentBlockId, block.id);
});

test("tampering, stale references, and a missing runtime artifact block packaging", async () => {
  const fixture = await reviewedRuntimeFixture();
  const artifact = await buildConsentRuntimeArtifact(fixture.document, fixture.document.sourceFingerprint);
  const bound = await bindConsentRuntimeToStudio(fixture.studio, artifact, NOW);
  assert.equal(canBuildExperimentRunnerPackage(bound), false);
  assert.equal(canBuildExperimentRunnerPackage(bound, artifact), true);

  const tampered = structuredClone(artifact);
  tampered.form.sections[0].text = "Altered after review";
  assert.equal(await verifyConsentRuntimeArtifact(tampered), false);
  assert.equal(canBuildExperimentRunnerPackage(bound, tampered), true, "shape matching is followed by in-runner cryptographic verification");
  const runner = buildExperimentRunnerPackage(bound, { consentRuntimeArtifact: tampered, nonce: "0123456789abcdef0123456789abcdef" });
  assert.match(runner.html, /reviewed consent artifact is missing, stale, inapplicable, or has been altered/i);

  const stale = structuredClone(bound);
  stale.blocks[0].consentForm!.formChecksum = `sha256:${"f".repeat(64)}`;
  assert.equal(canBuildExperimentRunnerPackage(stale, artifact), false);

  const decisionDrift = structuredClone(bound);
  decisionDrift.blocks[0].consentForm!.decisionIds = ["main-participation", "unexpected-choice"];
  assert.equal(consentRuntimeArtifactMatchesReference(artifact, decisionDrift.blocks[0].consentForm), false);
  assert.equal(canBuildExperimentRunnerPackage(decisionDrift, artifact), false);
});

test("accepted, refused, withdrawn, and amended consent receipts follow the explicit state machine", async () => {
  const fixture = await reviewedRuntimeFixture();
  const artifact = await buildConsentRuntimeArtifact(fixture.document, fixture.document.sourceFingerprint);
  const accepted = await createLocalConsentReceipt(artifact, {
    sessionId: "session-accepted",
    releaseId: "release-1",
    releaseChecksum: `sha256:${"c".repeat(64)}`,
    decisions: { main: "accepted", optional: {} },
    presentedAt: NOW,
    decidedAt: "2026-08-01T16:03:00.000Z",
  });
  let state = transitionConsentRuntimeSession(createConsentRuntimeSessionState(artifact), {
    type: "record-decision",
    receipt: accepted,
  });
  assert.equal(state.status, "active");
  assert.equal(accepted.decisionBasis, "main-accepted");

  const amended = { ...artifact, artifactChecksum: `sha256:${"d".repeat(64)}` as const };
  state = transitionConsentRuntimeSession(state, { type: "require-reconsent", artifactChecksum: amended.artifactChecksum });
  assert.equal(state.status, "reconsent-required");
  assert.throws(() => transitionConsentRuntimeSession(state, { type: "record-decision", receipt: accepted }));

  const refused = await createLocalConsentReceipt(artifact, {
    sessionId: "session-refused",
    decisions: { main: "refused", optional: {} },
    presentedAt: NOW,
    decidedAt: "2026-08-01T16:04:00.000Z",
  });
  assert.equal(refused.decision, "refused");
  assert.deepEqual(refused.optionalDecisions, []);
  assert.equal(transitionConsentRuntimeSession(createConsentRuntimeSessionState(artifact), { type: "record-decision", receipt: refused }).status, "refused");

  const amendedCore = {
    ...accepted,
    artifactChecksum: amended.artifactChecksum,
    decision: "reconsented" as const,
    decidedAt: "2026-08-01T16:06:00.000Z",
    priorReceiptChecksum: accepted.receiptChecksum,
  };
  const { receiptChecksum: priorVersionChecksum, ...amendedReceiptCore } = amendedCore;
  assert.equal(priorVersionChecksum, accepted.receiptChecksum);
  const amendedReceipt = {
    ...amendedReceiptCore,
    receiptChecksum: await sha256ArtifactChecksum(amendedReceiptCore, { maximumBytes: 64 * 1024 }),
  };
  state = transitionConsentRuntimeSession(state, { type: "record-reconsent", receipt: amendedReceipt });
  assert.equal(state.status, "active");
  assert.equal(state.artifactChecksum, amended.artifactChecksum);

  const withdrawn = await createWithdrawalReceipt(accepted, "2026-08-01T16:08:00.000Z");
  assert.equal(withdrawn.priorReceiptChecksum, accepted.receiptChecksum);
  assert.equal(transitionConsentRuntimeSession(
    transitionConsentRuntimeSession(createConsentRuntimeSessionState(artifact), { type: "record-decision", receipt: accepted }),
    { type: "withdraw", receipt: withdrawn },
  ).status, "withdrawn");

  const recordingFixture = await reviewedRuntimeFixture(true);
  const recordingArtifact = await buildConsentRuntimeArtifact(
    recordingFixture.document,
    recordingFixture.document.sourceFingerprint,
  );
  const refusalWithoutOptionalChoices = await createLocalConsentReceipt(recordingArtifact, {
    sessionId: "session-recording-refusal",
    decisions: { main: "refused", optional: {} },
    presentedAt: NOW,
    decidedAt: "2026-08-01T16:09:00.000Z",
  });
  assert.deepEqual(refusalWithoutOptionalChoices.optionalDecisions, []);
});

test("refusal and withdrawal scrubbing retains only the metadata-minimal receipt", async () => {
  const fixture = await reviewedRuntimeFixture();
  const artifact = await buildConsentRuntimeArtifact(fixture.document, fixture.document.sourceFingerprint);
  const refused = await createLocalConsentReceipt(artifact, {
    sessionId: "session-refused",
    decisions: { main: "refused", optional: {} },
    presentedAt: NOW,
    decidedAt: "2026-08-01T16:04:00.000Z",
  });
  const scrubbed = scrubSessionForRefusalOrWithdrawal(refused);
  assert.deepEqual(scrubbed.responses, {});
  assert.deepEqual(scrubbed.audioResponses, {});
  assert.deepEqual(scrubbed.videoResponses, {});
  assert.deepEqual(scrubbed.timings, []);
  assert.deepEqual(scrubbed.events, []);
  assert.deepEqual(scrubbed.trials, []);
  assert.equal(scrubbed.consentReceipt?.formChecksum, artifact.form.checksum);
  assert.equal("participantName" in refused, false);
  assert.equal("signature" in refused, false);
});

test("the generated participant runner exposes semantic review, correction, copy, refusal, and withdrawal controls without pre-consent logging", async () => {
  const fixture = await reviewedRuntimeFixture();
  const artifact = await buildConsentRuntimeArtifact(fixture.document, fixture.document.sourceFingerprint);
  const bound = await bindConsentRuntimeToStudio(fixture.studio, artifact, NOW);
  const runner = buildExperimentRunnerPackage(bound, {
    consentRuntimeArtifact: artifact,
    nonce: "0123456789abcdef0123456789abcdef",
  });

  assert.match(runner.html, /Review my decisions/);
  assert.match(runner.html, /Go back and correct/);
  assert.match(runner.html, /Save a copy/);
  assert.match(runner.html, /Leave without deciding/);
  assert.match(runner.html, /Stop or withdraw/);
  assert.match(runner.html, /Separate optional choices are not recorded when the main study is declined/);
  assert.doesNotMatch(runner.html, /consentSelections\[item\.id\]\|\|"declined"/);
  assert.match(runner.html, /if\(hasStructuredConsent&&!consentReceipt/);
  assert.match(runner.html, /condition=hasStructuredConsent\?\{id:"pending-consent"/);
  assert.match(runner.html, new RegExp(artifact.form.checksum));
});
