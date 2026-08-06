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
  createConsentPhase5Document,
  normalizeConsentPhase5Document,
  type ConsentPhase5Document,
} from "./consentPhase5";
import {
  collectConsentPhase6Issues,
  collectConsentPhase6Suggestions,
  createPhase6OptionalChoice,
  reviewConsentPhase6Artifact,
  updateConsentPhase6State,
} from "./consentPhase6";

const PROJECT_ID = "phase-6-consent-fixture";
const NOW = "2026-07-31T20:00:00.000Z";

function fixtureDesign(
  design: StudyDesignDocument["spec"]["design"]["selectedDesign"] = "randomized-between",
  setting: StudyDesignDocument["spec"]["design"]["setting"] = "laboratory",
): StudyDesignDocument {
  const document = createStudyDesignDocument(PROJECT_ID, EMPTY_RESEARCH_PATH_DRAFT);
  document.updatedAt = NOW;
  document.spec.design = {
    ...document.spec.design,
    goal: "test-causal-effect",
    selectedDesign: design,
    setting,
    selectionRationale: "The study tests a causal effect in a controlled setting.",
    approved: true,
  };
  document.spec.participants.targetPopulation = "Adults age 18 or older";
  return document;
}

function fixtureStudio(design = fixtureDesign()): ExperimentStudioDocument {
  const studio = createExperimentStudioDocument(PROJECT_ID, design);
  studio.updatedAt = NOW;
  studio.assignment.method = "random";
  studio.conditions = [
    { id: "condition-a", name: "Condition A", weight: 1 },
    { id: "condition-b", name: "Condition B", weight: 1 },
  ];
  return studio;
}

async function fixtureDocument(): Promise<ConsentPhase5Document> {
  const design = fixtureDesign();
  return createConsentPhase5Document(PROJECT_ID, design, fixtureStudio(design), GENERIC_US_CONSENT_AUTHORITY_MANIFEST, NOW);
}

function applyDisclosure(document: ConsentPhase5Document): ConsentPhase5Document {
  return updateConsentPhase6State(document, (state) => ({
    ...state,
    disclosure: {
      ...state.disclosure,
      applicability: "applicable",
      determinationSource: "researcher",
      authorityReference: "Protocol draft section 4",
      mode: "deception-proposed",
      scientificNecessity: "Prior disclosure would invalidate the behavioral measure.",
      alternativesConsidered: "A fully disclosed task and delayed measurement were considered.",
      withheldInformation: "The true comparison between condition labels.",
      undisclosedRiskDeclaration: "no-undisclosed-risk",
      willingnessImpactDeclaration: "does-not-affect-willingness",
      waiverOrAlterationStatus: "requested",
      approvalReference: "",
      debrief: {
        ...state.disclosure.debrief,
        determination: "required",
        timing: "immediate",
        deliveryMethod: "An on-screen debrief immediately after the task.",
        participantText: "The task did not fully describe its comparison before participation. This was necessary to preserve the measure.",
        dataUseChoice: "offer-after-debrief",
      },
    },
  }), NOW);
}

function markAllPhase6ArtifactsReviewed(document: ConsentPhase5Document): ConsentPhase5Document {
  return document.phase6.artifacts.reduce(
    (current, artifact) => reviewConsentPhase6Artifact(current, artifact.id, "human-reviewed", NOW),
    document,
  );
}

function assertNoPhase6Blockers(document: ConsentPhase5Document): void {
  assert.deepEqual(
    collectConsentPhase6Issues(document).filter((issue) => issue.severity === "blocking"),
    [],
  );
}

test("an experiment design suggests behavioral review but never enables deception", async () => {
  const document = await fixtureDocument();
  assert.ok(collectConsentPhase6Suggestions(document).includes("behavioral"));
  assert.equal(document.phase6.disclosure.applicability, "not-configured");
  assert.equal(document.phase6.disclosure.mode, "full-disclosure");
  assert.equal(document.phase6.disclosure.waiverOrAlterationStatus, "not-requested");
});

test("interactive module updates preserve researcher spacing while remaining bounded", async () => {
  const document = updateConsentPhase6State(await fixtureDocument(), (state) => ({
    ...state,
    behavioral: { ...state.behavioral, researcherRationale: "Why this applies " },
  }), NOW);
  assert.equal(document.phase6.behavioral.researcherRationale, "Why this applies ");
});

test("requested incomplete disclosure remains blocked until human approval evidence is recorded", async () => {
  let document = applyDisclosure(await fixtureDocument());
  let issues = collectConsentPhase6Issues(document);
  assert.ok(issues.some((issue) => issue.id === "phase6-disclosure-approval" && issue.severity === "blocking"));

  document = updateConsentPhase6State(document, (state) => ({
    ...state,
    disclosure: { ...state.disclosure, waiverOrAlterationStatus: "approved", approvalReference: "IRB-2026-041 alteration determination" },
  }), NOW);
  issues = collectConsentPhase6Issues(document);
  assert.ok(!issues.some((issue) => issue.id === "phase6-disclosure-approval"));
});

test("a no-debrief path requires its own human determination and rationale", async () => {
  let document = applyDisclosure(await fixtureDocument());
  document = updateConsentPhase6State(document, (state) => ({
    ...state,
    disclosure: {
      ...state.disclosure,
      waiverOrAlterationStatus: "approved",
      approvalReference: "IRB-2026-041",
      debrief: { ...state.disclosure.debrief, determination: "not-required-by-human-authority", determinationReference: "", exceptionRationale: "" },
    },
  }), NOW);
  assert.ok(collectConsentPhase6Issues(document).some((issue) => issue.id === "phase6-debrief-exception-reference"));
});

test("focus-group artifacts state realistic confidentiality limits and reject group guarantees", async () => {
  let document = await fixtureDocument();
  document = updateConsentPhase6State(document, (state) => ({
    ...state,
    focusGroup: {
      ...state.focusGroup,
      applicability: "applicable",
      determinationSource: "researcher",
      authorityReference: "Focus group protocol",
      researcherSafeguards: "The research team limits transcript access to approved staff.",
      participantReminder: "Please respect group privacy.",
      confidentialityLimitAcknowledged: true,
    },
  }), NOW);
  assert.match(document.phase6.artifacts.find((artifact) => artifact.kind === "focus-group-information")?.participantText ?? "", /cannot guarantee/i);

  document = updateConsentPhase6State(document, (state) => ({ ...state, focusGroup: { ...state.focusGroup, participantReminder: "We guarantee every participant will keep the group confidential." } }), NOW);
  assert.ok(collectConsentPhase6Issues(document).some((issue) => issue.id === "phase6-focus-group-false-guarantee"));
});

test("telephone screening and main-study consent compile as separate artifacts and contracts", async () => {
  let document = await fixtureDocument();
  document = updateConsentPhase6State(document, (state) => ({
    ...state,
    telephone: {
      ...state.telephone,
      applicability: "applicable",
      determinationSource: "institution",
      authorityReference: "IRB telephone determination",
      pathways: ["eligibility-screening", "main-study"],
      screeningPurpose: "Determine basic eligibility before inviting study participation.",
      screeningDataRetention: "Eligibility notes are retained for 30 days.",
      screeningDataDeletion: "Ineligible and declining contacts are deleted after 30 days.",
      screeningScript: "May I ask a few questions to determine whether this study may be suitable for you?",
      mainStudyScript: "I will now explain the main study, its risks, and your choices.",
      agreementBeforeSubstantiveQuestions: true,
      questionOpportunity: "The caller pauses and invites questions before agreement.",
      copyDeliveryPlan: "Offer secure email or postal delivery of the current information sheet.",
      discussionDocumentationPlan: "Record date, caller, version, questions, and agreement without storing a signature.",
    },
  }), NOW);
  assert.deepEqual(document.phase6.artifacts.filter((artifact) => artifact.sourceModuleId === "telephone").map((artifact) => artifact.kind), ["telephone-screening-script", "telephone-main-study-script"]);
  assert.ok(!collectConsentPhase6Issues(document).some((issue) => issue.id.includes("screen-retention")));
});

test("declining optional recording or sub-study can preserve the main-study path", async () => {
  let document = await fixtureDocument();
  document = updateConsentPhase6State(document, (state) => {
    const choice = { ...createPhase6OptionalChoice(1), title: "Optional follow-up interview", purpose: "Invite a separate interview.", participantText: "You may join an optional follow-up interview.", dataUse: "Interview data are analyzed separately.", retentionOrDestruction: "Interview data follow the approved five-year retention period.", declineOutcome: "continue-main-study" as const };
    return {
      ...state,
      recording: { ...state.recording, applicability: "applicable", determinationSource: "researcher", authorityReference: "Protocol recording section", researchUse: "Research transcription only.", accessPlan: "Approved study staff.", retentionOrDestruction: "Destroy after transcript verification.", mayDeclineAndContinueMainStudy: "yes" },
      optionalChoices: { ...state.optionalChoices, applicability: "applicable", determinationSource: "researcher", authorityReference: "Protocol optional activities", choices: [choice] },
    };
  }, NOW);
  assert.equal(document.phase6.recording.mayDeclineAndContinueMainStudy, "yes");
  assert.equal(document.phase6.optionalChoices.choices[0].declineOutcome, "continue-main-study");
  assert.equal(document.phase6.artifacts.find((artifact) => artifact.kind === "optional-choice")?.decisionMode, "separate-optional-choice");
});

test("recording boundaries compile into the existing participant recording form and preserve the refusal path", async () => {
  const design = fixtureDesign();
  const studio = fixtureStudio(design);
  studio.blocks.splice(-1, 0, createExperimentBlock("audio-response", "audio-response-1"));
  let document = await createConsentPhase5Document(PROJECT_ID, design, studio, GENERIC_US_CONSENT_AUTHORITY_MANIFEST, NOW);
  document = updateConsentPhase6State(document, (state) => ({
    ...state,
    behavioral: { ...state.behavioral, applicability: "not-applicable" },
    recording: {
      ...state.recording,
      applicability: "applicable",
      determinationSource: "researcher",
      authorityReference: "Protocol recording section",
      researchUse: "The recording is used to transcribe the interview.",
      accessPlan: "Only approved study staff can access the recording.",
      retentionOrDestruction: "The recording is destroyed after transcript verification.",
      nonResearchUse: "none",
      mayDeclineAndContinueMainStudy: "yes",
    },
  }), NOW);

  const form = document.forms.find((item) => item.kind === "audio-recording-choice");
  assert.ok(form);
  assert.equal(form.decisionMode, "separate-optional-choice");
  assert.match(form.clauses[0].text, /transcribe the interview/i);
  assert.match(form.clauses[0].text, /decline recording and still continue the main study/i);
  assert.equal(document.inputs.recordingRetention, "The recording is destroyed after transcript verification.");
  assert.equal(collectConsentPhase6Issues(document).filter((issue) => issue.severity === "blocking").length, 0);
});

test("waiver of consent and waiver of signed documentation remain separate approval gates", async () => {
  let document = await fixtureDocument();
  document = updateConsentPhase6State(document, (state) => ({
    ...state,
    disclosure: {
      ...state.disclosure,
      applicability: "applicable",
      determinationSource: "researcher",
      authorityReference: "Protocol consent process",
      consentProcess: "waiver-of-consent-proposed",
      consentWaiverStatus: "requested",
    },
  }), NOW);
  document.governance.documentationMethod = "signed-written";
  document.governance.waiverOrAlteration = null;
  assert.ok(collectConsentPhase6Issues(document).some((issue) => issue.id === "phase6-consent-waiver-approval"));
  assert.equal(document.governance.waiverOrAlteration, null);
});

test("changed-information triggers require a human disposition and can compile addendum and reconsent artifacts", async () => {
  let document = await fixtureDocument();
  document = updateConsentPhase6State(document, (state) => ({
    ...state,
    lifecycle: {
      ...state.lifecycle,
      applicability: "applicable",
      determinationSource: "institution",
      authorityReference: "IRB continuing review record",
      recontactPlan: "Recontact enrolled participants when relevant new information arises.",
      recontactMethod: "Secure message or telephone.",
      ongoingWillingnessCheck: "Confirm willingness before each follow-up session.",
      changedInformationText: "A new risk has been identified. Please review this information before deciding whether to continue.",
      triggers: [{ id: "new-risk-1", category: "new-risk", description: "A new task risk", affectedParticipants: "All enrolled participants", urgency: "before-next-procedure", humanDisposition: "not-determined", authorityReference: "" }],
    },
  }), NOW);
  assert.ok(collectConsentPhase6Issues(document).some((issue) => issue.id === "phase6-lifecycle-trigger-new-risk-1"));
  assert.ok(!document.phase6.artifacts.some((artifact) => artifact.kind === "changed-information-addendum"));

  document = updateConsentPhase6State(document, (state) => ({ ...state, lifecycle: { ...state.lifecycle, triggers: state.lifecycle.triggers.map((trigger) => ({ ...trigger, humanDisposition: "full-reconsent", authorityReference: "IRB amendment 2" })) } }), NOW);
  assert.equal(document.phase6.artifacts.find((artifact) => artifact.kind === "changed-information-addendum")?.authorityReference, "IRB amendment 2");
  assert.equal(document.phase6.artifacts.find((artifact) => artifact.kind === "reconsent")?.authorityReference, "IRB amendment 2");
});

test("compiled Phase 6 artifacts are review-gated and reviewed state survives deterministic recompilation", async () => {
  let document = applyDisclosure(await fixtureDocument());
  document = updateConsentPhase6State(document, (state) => ({ ...state, disclosure: { ...state.disclosure, waiverOrAlterationStatus: "approved", approvalReference: "IRB-2026-041" } }), NOW);
  const artifact = document.phase6.artifacts.find((item) => item.kind === "debrief");
  assert.ok(artifact);
  assert.ok(collectConsentPhase6Issues(document).some((issue) => issue.id === `phase6-artifact-${artifact.id}-review`));
  document = reviewConsentPhase6Artifact(document, artifact.id, "human-reviewed", NOW);
  assert.equal(document.phase6.artifacts.find((item) => item.id === artifact.id)?.reviewState, "human-reviewed");

  document = updateConsentPhase6State(document, (state) => ({
    ...state,
    disclosure: { ...state.disclosure, approvalReference: "IRB-2026-042" },
  }), NOW);
  assert.equal(document.phase6.artifacts.find((item) => item.id === artifact.id)?.reviewState, "human-review-required");
});

test("adult behavioral, deception/debrief, focus-group, telephone, recording, and reconsent fixtures pass their complete inspection contracts", async (t) => {
  await t.test("behavioral", async () => {
    let document = updateConsentPhase6State(await fixtureDocument(), (state) => ({
      ...state,
      behavioral: {
        ...state.behavioral,
        applicability: "applicable",
        determinationSource: "researcher",
        authorityReference: "Protocol randomization and task-risk sections",
        assignmentDisclosure: "Participants are assigned by chance to one of two task conditions.",
        taskRisks: "The timed task may cause mild frustration or fatigue.",
        stoppingRules: "Participants may pause, skip a question, or stop without penalty.",
      },
    }), NOW);
    document = markAllPhase6ArtifactsReviewed(document);
    assert.equal(document.phase6.artifacts[0]?.kind, "behavioral-disclosure");
    assert.match(document.phase6.artifacts[0]?.participantText ?? "", /assigned by chance/i);
    assertNoPhase6Blockers(document);
  });

  await t.test("deception and debrief", async () => {
    let document = applyDisclosure(await fixtureDocument());
    document = updateConsentPhase6State(document, (state) => ({
      ...state,
      behavioral: { ...state.behavioral, applicability: "not-applicable" },
      disclosure: {
        ...state.disclosure,
        waiverOrAlterationStatus: "approved",
        approvalReference: "IRB-2026-041 alteration determination",
      },
    }), NOW);
    document = markAllPhase6ArtifactsReviewed(document);
    assert.equal(document.phase6.artifacts[0]?.kind, "debrief");
    assert.equal(document.phase6.artifacts[0]?.authorityReference, "IRB-2026-041 alteration determination");
    assertNoPhase6Blockers(document);
  });

  await t.test("focus group", async () => {
    let document = updateConsentPhase6State(await fixtureDocument(), (state) => ({
      ...state,
      behavioral: { ...state.behavioral, applicability: "not-applicable" },
      focusGroup: {
        ...state.focusGroup,
        applicability: "applicable",
        determinationSource: "researcher",
        authorityReference: "Approved focus-group protocol",
        researcherSafeguards: "Only approved staff can access the coded transcript.",
        participantReminder: "Please respect group privacy and do not repeat what others say.",
        confidentialityLimitAcknowledged: true,
      },
    }), NOW);
    document = markAllPhase6ArtifactsReviewed(document);
    const artifact = document.phase6.artifacts[0];
    assert.equal(artifact?.kind, "focus-group-information");
    assert.match(artifact?.participantText ?? "", /cannot guarantee/i);
    assertNoPhase6Blockers(document);
  });

  await t.test("telephone screening and main-study consent", async () => {
    let document = updateConsentPhase6State(await fixtureDocument(), (state) => ({
      ...state,
      behavioral: { ...state.behavioral, applicability: "not-applicable" },
      telephone: {
        ...state.telephone,
        applicability: "applicable",
        determinationSource: "institution",
        authorityReference: "IRB telephone determination",
        pathways: ["eligibility-screening", "main-study"],
        screeningPurpose: "Determine whether the study may be suitable before enrollment.",
        screeningDataRetention: "Screening notes are retained for 30 days.",
        screeningDataDeletion: "Ineligible and declining contacts are deleted after 30 days.",
        screeningScript: "Before screening, may I ask questions to determine whether this study may be suitable for you?",
        mainStudyScript: "I will explain the main study, its risks, alternatives, and your choices before asking whether you agree.",
        agreementBeforeSubstantiveQuestions: true,
        questionOpportunity: "The caller pauses for questions before each agreement.",
        copyDeliveryPlan: "Offer secure email or postal delivery of the current information sheet.",
        discussionDocumentationPlan: "Record the caller, date, version, questions, and agreement.",
      },
    }), NOW);
    document = markAllPhase6ArtifactsReviewed(document);
    assert.deepEqual(
      document.phase6.artifacts.map((artifact) => [artifact.kind, artifact.decisionMode]),
      [
        ["telephone-screening-script", "separate-optional-choice"],
        ["telephone-main-study-script", "main-participation"],
      ],
    );
    assertNoPhase6Blockers(document);
  });

  await t.test("recording", async () => {
    const design = fixtureDesign();
    const studio = fixtureStudio(design);
    studio.blocks.splice(-1, 0, createExperimentBlock("audio-response", "audio-response-1"));
    let document = await createConsentPhase5Document(PROJECT_ID, design, studio, GENERIC_US_CONSENT_AUTHORITY_MANIFEST, NOW);
    document = updateConsentPhase6State(document, (state) => ({
      ...state,
      behavioral: { ...state.behavioral, applicability: "not-applicable" },
      recording: {
        ...state.recording,
        applicability: "applicable",
        determinationSource: "institution",
        authorityReference: "IRB recording determination",
        researchUse: "The recording is used for research transcription and coding.",
        accessPlan: "Only approved study staff can access the recording.",
        retentionOrDestruction: "Destroy the recording after transcript verification.",
        nonResearchUse: "presentation",
        separateReleaseRequired: true,
        separateReleaseReference: "IRB separate recording release",
        mayDeclineAndContinueMainStudy: "yes",
      },
    }), NOW);
    const form = document.forms.find((item) => item.kind === "audio-recording-choice");
    assert.equal(form?.decisionMode, "separate-optional-choice");
    assert.match(form?.clauses[0]?.text ?? "", /separate participant release/i);
    assert.match(form?.clauses[0]?.text ?? "", /decline recording and still continue/i);
    assertNoPhase6Blockers(document);
  });

  await t.test("changed information and reconsent", async () => {
    let document = updateConsentPhase6State(await fixtureDocument(), (state) => ({
      ...state,
      behavioral: { ...state.behavioral, applicability: "not-applicable" },
      lifecycle: {
        ...state.lifecycle,
        applicability: "applicable",
        determinationSource: "institution",
        authorityReference: "Approved lifecycle plan",
        recontactPlan: "Recontact enrolled participants when relevant new information arises.",
        recontactMethod: "Secure message or telephone.",
        ongoingWillingnessCheck: "Confirm willingness before each follow-up session.",
        changedInformationText: "A new risk has been identified. Review it before deciding whether to continue.",
        triggers: [{
          id: "new-risk-1",
          category: "new-risk",
          description: "A newly identified task risk",
          affectedParticipants: "All enrolled participants",
          urgency: "before-next-procedure",
          humanDisposition: "full-reconsent",
          authorityReference: "IRB amendment 2",
        }],
      },
    }), NOW);
    document = markAllPhase6ArtifactsReviewed(document);
    assert.deepEqual(document.phase6.artifacts.map((artifact) => artifact.kind), ["changed-information-addendum", "reconsent"]);
    assert.ok(document.phase6.artifacts.every((artifact) => artifact.authorityReference === "IRB amendment 2"));
    assertNoPhase6Blockers(document);
  });
});

test("legacy Phase 5 documents migrate to the bounded Phase 6 default without losing their consent content", async () => {
  const document = await fixtureDocument();
  const legacy = structuredClone(document) as unknown as Record<string, unknown>;
  legacy.schemaVersion = 1;
  delete legacy.phase6;
  const normalized = normalizeConsentPhase5Document(legacy, PROJECT_ID);
  assert.ok(normalized);
  assert.equal(normalized.schemaVersion, 4);
  assert.equal(normalized.phase6.schemaVersion, 1);
  assert.equal(normalized.forms[0].id, document.forms[0].id);
});
