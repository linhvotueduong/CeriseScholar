import assert from "node:assert/strict";
import test from "node:test";
import { EMPTY_RESEARCH_PATH_DRAFT } from "./researchPathDraft";
import { GENERIC_US_CONSENT_AUTHORITY_MANIFEST } from "./consentAuthority";
import { createStudyDesignDocument } from "./studyDesign";
import { createExperimentStudioDocument } from "./experimentStudio";
import {
  createConsentPhase5Document,
  addConsentPhase5Version,
  normalizeConsentPhase5Document,
  updateConsentPhase5Inputs,
  type ConsentPhase5Document,
} from "./consentPhase5";
import {
  collectConsentPhase7Issues,
  recordConsentPhase7QualifiedReview,
  reviewConsentPhase7Artifact,
  updateConsentPhase7State,
} from "./consentPhase7";

const PROJECT_ID = "phase-7-consent-fixture";
const NOW = "2026-08-01T14:00:00.000Z";

async function fixtureDocument(): Promise<ConsentPhase5Document> {
  const design = createStudyDesignDocument(PROJECT_ID, EMPTY_RESEARCH_PATH_DRAFT);
  design.updatedAt = NOW;
  design.spec.design = { ...design.spec.design, goal: "test-causal-effect", selectedDesign: "randomized-between", setting: "laboratory", selectionRationale: "Controlled behavioral experiment.", approved: true };
  design.spec.participants.targetPopulation = "Participants defined by the approved protocol";
  const studio = createExperimentStudioDocument(PROJECT_ID, design);
  studio.updatedAt = NOW;
  return createConsentPhase5Document(PROJECT_ID, design, studio, GENERIC_US_CONSENT_AUTHORITY_MANIFEST, NOW);
}

function configureProfile(document: ConsentPhase5Document, requiredPackages: ConsentPhase5Document["phase7"]["profile"]["requiredPackages"]): ConsentPhase5Document {
  return updateConsentPhase7State(document, (state) => ({ ...state, profile: { determinationSource: "institution", authorityReference: "IRB protocol P7 and local policy", jurisdiction: "Applicable state and federal law", requiredPackages, localContacts: "IRB and participant-rights office; qualified language services", runtimeBoundaryAcknowledged: true } }), NOW);
}

function configurePermissionAndAssent(document: ConsentPhase5Document): ConsentPhase5Document {
  let next = configureProfile(document, ["parental-permission", "assent"]);
  next = updateConsentPhase7State(next, (state) => ({
    ...state,
    parentalPermission: { ...state.parentalPermission, applicability: "applicable", determinationSource: "institution", authorityReference: "IRB P7 children determination", participantGroup: "Parents or legal guardians identified under local policy", permissionRule: "one-parent-by-human-determination", permissionRuleReference: "IRB P7 section 6", permissionProcess: "A trained researcher discusses the separate permission form and documents the approved decision.", childPrivacyPlan: "The child is spoken with separately when appropriate and their wishes are shared only under the approved safety plan.", participantText: "Your child is invited to take part in a research study. Taking part is voluntary, and you and your child may ask questions or stop." },
    assent: { ...state.assent, applicability: "applicable", determinationSource: "institution", authorityReference: "IRB P7 assent determination", participantGroup: "Children whom the study team determines can provide assent", developmentalDescription: "The study team selects words and presentation supports based on the child's communication and developmental needs.", capabilityAssessmentPlan: "A trained researcher confirms that the child can understand the study choice at the level needed for assent.", assentProcess: "The researcher asks for an affirmative answer after explanation and questions; silence is not assent.", dissentHandling: "Words, behavior, resistance, or a request to stop pause participation and are escalated under the approved plan.", documentationMethod: "Document assent using the IRB-approved method for the individual child.", linkedParentPermissionArtifactId: "phase7-parental-permission", ageOfMajorityPlan: "The team monitors participants who may reach legal adulthood and obtains direct consent before continued participation when required.", ageOfMajorityRuleReference: "Local age-of-majority law and IRB P7 section 9", participantText: "This study is your choice. You can ask questions, say no, or stop at any time." },
  }), NOW);
  for (const artifact of next.phase7.artifacts) next = reviewConsentPhase7Artifact(next, artifact.id, "human-reviewed", NOW);
  return next;
}

function configureTranslation(document: ConsentPhase5Document, method: ConsentPhase5Document["phase7"]["translatedVariant"]["translationMethod"] = "ai-assisted-draft"): ConsentPhase5Document {
  let next = configureProfile(document, ["translated-variant"]);
  next = updateConsentPhase7State(next, (state) => ({ ...state, translatedVariant: { ...state.translatedVariant, applicability: "applicable", determinationSource: "institution", authorityReference: "IRB language-access plan", participantGroup: "Participants who prefer Spanish", sourceArtifactId: "form-main", sourceLanguage: "en-US", targetLanguage: "es-US", translationMethod: method, translatorQualifications: method === "ai-assisted-draft" ? "AI draft logged for qualified human review" : "Professional research-consent translator", participantText: "Texto traducido para revisión humana calificada." } }), NOW);
  return next;
}

function configureShortForm(document: ConsentPhase5Document): ConsentPhase5Document {
  let next = configureProfile(document, ["short-form"]);
  next = updateConsentPhase7State(next, (state) => ({ ...state, shortForm: { ...state.shortForm, applicability: "applicable", determinationSource: "institution", authorityReference: "IRB short-form procedure", researcherRationale: "", participantGroup: "An unexpectedly encountered participant who prefers Spanish", useRationale: "The IRB approved this procedure for occasional unexpected enrollment; anticipated enrollment uses the fully translated form.", sourceLanguage: "en-US", targetLanguage: "es-US", summaryArtifactId: "form-main", approvalStatus: "approved", approvalReference: "IRB P7 approval 2026-08-01", interpreterPlan: "A qualified interpreter presents the full summary and supports questions.", witnessPlan: "A witness who understands both languages observes the full presentation and signs under the approved process.", signatureResponsibilityPlan: "The participant or representative signs the short form; the person obtaining consent signs the summary; the witness signs both.", copyDeliveryPlan: "Provide copies of the signed short form and signed summary.", participantText: "Formulario breve aprobado en español.", summaryText: "The full consent information is presented orally in language understandable to the participant." } }), NOW);
  for (const artifact of next.phase7.artifacts) next = reviewConsentPhase7Artifact(next, artifact.id, "human-reviewed", NOW);
  return next;
}

test("study design never auto-enables protected-audience packages or universal age rules", async () => {
  const document = await fixtureDocument();
  assert.deepEqual(document.phase7.profile.requiredPackages, []);
  assert.ok([document.phase7.parentalPermission, document.phase7.assent, document.phase7.larSurrogate, document.phase7.accessibleOral, document.phase7.translatedVariant, document.phase7.shortForm].every((item) => item.applicability === "not-configured"));
  assert.equal(document.phase7.parentalPermission.permissionRule, "not-determined");
  assert.equal(document.phase7.assent.participantGroup, "");
});

test("parent permission and child assent compile as distinct linked artifacts", async () => {
  const document = configurePermissionAndAssent(await fixtureDocument());
  assert.deepEqual(document.phase7.artifacts.map((item) => item.kind), ["parent-permission", "assent"]);
  assert.equal(document.phase7.artifacts.find((item) => item.kind === "assent")?.sourceArtifactId, "phase7-parental-permission");
  assert.deepEqual(collectConsentPhase7Issues(document), []);
});

test("a required audience cannot pass when its package is not applicable", async () => {
  const document = configureProfile(await fixtureDocument(), ["assent"]);
  assert.ok(collectConsentPhase7Issues(document).some((issue) => issue.id === "phase7-required-assent"));
});

test("assent requires affirmative agreement, dissent handling, and age-of-majority planning", async () => {
  let document = configurePermissionAndAssent(await fixtureDocument());
  document = updateConsentPhase7State(document, (state) => ({ ...state, assent: { ...state.assent, assentProcess: "", dissentHandling: "", ageOfMajorityPlan: "" } }), NOW);
  const ids = collectConsentPhase7Issues(document).map((issue) => issue.id);
  assert.ok(ids.includes("phase7-assent-process"));
  assert.ok(ids.includes("phase7-assent-dissent"));
  assert.ok(ids.includes("phase7-assent-majority-plan"));
});

test("AI-assisted translation cannot be promoted by ordinary artifact review", async () => {
  let document = configureTranslation(await fixtureDocument());
  document = reviewConsentPhase7Artifact(document, "phase7-translated-variant", "human-reviewed", NOW);
  assert.equal(document.phase7.artifacts[0]?.reviewState, "human-review-required");
  assert.ok(collectConsentPhase7Issues(document).some((issue) => issue.id === "phase7-translation-qualified-review"));
});

test("named qualified language review and separate artifact review are both required", async () => {
  let document = configureTranslation(await fixtureDocument(), "professional-service");
  document = recordConsentPhase7QualifiedReview(document, "María Reviewer", "ATA-certified Spanish translator; research-consent experience", NOW);
  assert.equal(document.phase7.translatedVariant.qualifiedReviewState, "qualified-human-reviewed");
  document = reviewConsentPhase7Artifact(document, "phase7-translated-variant", "human-reviewed", NOW);
  assert.deepEqual(collectConsentPhase7Issues(document), []);
});

test("editing a linked source invalidates prior translation review and source identity", async () => {
  let document = configureTranslation(await fixtureDocument(), "professional-service");
  document = recordConsentPhase7QualifiedReview(document, "María Reviewer", "Qualified Spanish language reviewer", NOW);
  document = reviewConsentPhase7Artifact(document, "phase7-translated-variant", "human-reviewed", NOW);
  const before = document.phase7.artifacts[0]?.sourceIdentity;
  document = updateConsentPhase5Inputs(document, { studyPurpose: "A materially revised participant-facing purpose." }, NOW);
  assert.notEqual(document.phase7.artifacts[0]?.sourceIdentity, before);
  assert.equal(document.phase7.artifacts[0]?.reviewState, "human-review-required");
});

test("short-form consent compiles separate short-form and summary artifacts with roles and copies", async () => {
  const document = configureShortForm(await fixtureDocument());
  assert.deepEqual(document.phase7.artifacts.map((item) => item.kind), ["short-form", "short-form-summary"]);
  assert.deepEqual(collectConsentPhase7Issues(document), []);
});

test("short-form procedure remains blocked without institutional approval evidence", async () => {
  let document = configureShortForm(await fixtureDocument());
  document = updateConsentPhase7State(document, (state) => ({ ...state, shortForm: { ...state.shortForm, approvalStatus: "requested", approvalReference: "" } }), NOW);
  assert.ok(collectConsentPhase7Issues(document).some((issue) => issue.id === "phase7-short-form-approval"));
});

test("schema 1 and 2 drafts migrate to schema 4 with inert Phase 7 and Phase 8 state", async () => {
  const current = await fixtureDocument();
  for (const schemaVersion of [1, 2] as const) {
    const legacy = structuredClone(current) as unknown as Record<string, unknown>;
    legacy.schemaVersion = schemaVersion;
    delete legacy.phase7;
    if (schemaVersion === 1) delete legacy.phase6;
    const normalized = normalizeConsentPhase5Document(legacy, PROJECT_ID);
    assert.ok(normalized);
    assert.equal(normalized.schemaVersion, 4);
    assert.equal(normalized.phase7.schemaVersion, 1);
    assert.deepEqual(normalized.phase7.artifacts, []);
    assert.deepEqual(normalized.phase8.artifacts, []);
  }
});

test("checksum-bound document versions include Phase 7 package state", async () => {
  const base = await fixtureDocument();
  const baseVersion = await addConsentPhase5Version(base, NOW);
  const configured = configurePermissionAndAssent(base);
  const configuredVersion = await addConsentPhase5Version(configured, NOW);
  assert.notEqual(baseVersion.versions[0]?.documentChecksum, configuredVersion.versions[0]?.documentChecksum);
});
