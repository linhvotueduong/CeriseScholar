import assert from "node:assert/strict";
import test from "node:test";
import { GENERIC_US_CONSENT_AUTHORITY_MANIFEST } from "./consentAuthority";
import {
  createConsentAssistantContext,
  createConsentAssistantDecisionRecord,
  normalizeConsentAssistantRequest,
  parseConsentAssistantResponse,
  readConsentAssistantDecisions,
  redactConsentAssistantText,
  writeConsentAssistantDecisions,
  type ConsentAssistantDecisionRecord,
} from "./consentAssistant";
import {
  createConsentPhase5Document,
  updateConsentPhase5Clause,
  updateConsentPhase5Inputs,
  type ConsentPhase5Document,
} from "./consentPhase5";
import { createExperimentStudioDocument } from "./experimentStudio";
import { EMPTY_RESEARCH_PATH_DRAFT } from "./researchPathDraft";
import { createStudyDesignDocument } from "./studyDesign";

const PROJECT_ID = "phase-9-consent-assistant-fixture";
const NOW = "2026-08-01T16:00:00.000Z";

async function fixtureDocument(): Promise<ConsentPhase5Document> {
  const design = createStudyDesignDocument(PROJECT_ID, EMPTY_RESEARCH_PATH_DRAFT);
  design.spec.design = {
    ...design.spec.design,
    goal: "describe-pattern",
    setting: "online",
    selectedDesign: "cross-sectional-survey",
    selectionRationale: "An online survey matches the descriptive question.",
    approved: true,
  };
  design.spec.participants = {
    ...design.spec.participants,
    targetPopulation: "Adults age 18 or older",
    samplingStrategy: "Volunteer sample",
    inclusionCriteria: "Age 18 or older",
    exclusionCriteria: "Under age 18",
    recruitmentChannel: "Online participant pool",
    plannedSampleSize: "120",
    sampleSizeRationale: "Defined by the analysis plan",
    approved: true,
  };
  const studio = createExperimentStudioDocument(PROJECT_ID, design);
  studio.title = "Online information evaluation study";
  let document = await createConsentPhase5Document(
    PROJECT_ID,
    design,
    studio,
    GENERIC_US_CONSENT_AUTHORITY_MANIFEST,
    NOW,
  );
  document = updateConsentPhase5Inputs(document, {
    studyPurpose: "This study examines how adults evaluate public information.",
    duration: "about 15 minutes.",
    risksAndDiscomforts: "Some questions may feel personal.",
    benefits: "There may be no direct benefit.",
    alternatives: "The alternative is not to take part.",
    compensationAndCosts: "There is no payment or cost.",
    privacyProtections: "Responses use a coded identifier.",
    dataAccess: "The research team can access coded information.",
    dataRetention: "Information is retained for five years.",
    withdrawalMethod: "Close the survey to stop.",
    withdrawalBoundary: "Submitted anonymous information cannot be located.",
    studyContact: "Dr. Jane Researcher, jane.researcher@example.edu, (415) 555-1212",
    rightsContact: "UCSF IRB protocol IRB-2048, 123 Main Street",
    identifiability: "confidential",
    futureUsePlan: "will-not-use-for-future-research",
    recordingPurpose: "",
    recordingAccessAndUse: "",
    recordingRetention: "",
  }, NOW);
  return document;
}

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

test("context construction sends only the selected scope and redacts contact and institutional identity", async () => {
  const document = await fixtureDocument();
  const contacts = document.forms[0].clauses.find((clause) => clause.kind === "contacts");
  assert.ok(contacts);
  document.authorityAttachment = {
    filename: "Dr Jane approval correspondence.pdf",
    mediaType: "application/pdf",
    byteLength: 2_048,
    checksum: `sha256:${"a".repeat(64)}`,
    importedAt: NOW,
    contentsStored: false,
  };
  document.governance.institutionReference = "IRB-SECRET-2048";
  const context = await createConsentAssistantContext(
    document,
    "explain-simplify",
    "form-main",
    contacts.id,
  );
  assert.ok(context);
  assert.equal(context.form.clauses.length, 1);
  assert.equal(context.form.clauses[0].text, "[CONTACT OR SIGNATURE DETAILS REDACTED]");
  assert.equal(context.redactionSummary.contactClause, 1);
  assert.equal(JSON.stringify(context).includes("jane.researcher@example.edu"), false);
  assert.equal(JSON.stringify(context).includes("IRB-SECRET-2048"), false);
  assert.equal(JSON.stringify(context).includes("approval correspondence"), false);
  assert.deepEqual(context.excludedContent, [
    "participant-data",
    "uploaded-files",
    "approval-correspondence",
    "governance-decisions",
    "authority-identifiers",
  ]);
});

test("common direct identifiers are replaced before model context leaves the app", () => {
  const redacted = redactConsentAssistantText(
    "Contact Dr. Jane Researcher at jane@example.edu, 415-555-1212, 123 Main Street. Protocol IRB-2048.",
  );
  assert.doesNotMatch(redacted, /Jane Researcher|jane@example\.edu|415-555-1212|123 Main Street|IRB-2048/);
  assert.match(redacted, /\[NAME REDACTED\]/);
  assert.match(redacted, /\[INSTITUTIONAL IDENTIFIER REDACTED\]/);
});

test("request normalization rejects absent targets and prevents implicit full-form review", async () => {
  const document = await fixtureDocument();
  const clauseId = document.forms[0].clauses[0].id;
  const valid = normalizeConsentAssistantRequest({
    projectId: PROJECT_ID,
    mode: "draft-clause",
    prompt: "Clarify this clause",
    formId: "form-main",
    clauseId,
    explicitFullFormReview: false,
    document,
  });
  assert.ok(valid);
  assert.equal(valid.clauseId, clauseId);
  assert.equal(normalizeConsentAssistantRequest({ ...valid, clauseId: "missing-clause" }), null);
  assert.equal(normalizeConsentAssistantRequest({
    ...valid,
    mode: "final-review",
    clauseId: null,
    explicitFullFormReview: false,
  }), null);
  assert.equal(normalizeConsentAssistantRequest({
    ...valid,
    mode: "draft-clause",
    explicitFullFormReview: true,
  }), null);
});

test("structured responses keep only same-form editable clause proposals and server-owned current text", async () => {
  const document = await fixtureDocument();
  const purpose = document.forms[0].clauses.find((clause) => clause.kind === "purpose");
  assert.ok(purpose);
  const context = await createConsentAssistantContext(
    document,
    "draft-clause",
    "form-main",
    purpose.id,
  );
  assert.ok(context);
  const parsed = parseConsentAssistantResponse(JSON.stringify({
    summary: "One wording option for review.",
    suggestions: [{
      id: "purpose-option",
      kind: "clause-patch",
      title: "Clarify the purpose",
      rationale: "Uses the implemented study purpose.",
      uncertainty: "Confirm this matches the protocol.",
      potentialConflict: "Institutional wording may differ.",
      formId: "form-main",
      clauseId: purpose.id,
      factIds: ["fact-design"],
      currentText: "MODEL-CONTROLLED FALSE CURRENT TEXT",
      proposedText: "This research examines how adults evaluate public information.",
    }],
  }), context);
  assert.equal(parsed.suggestions.length, 1);
  const suggestion = parsed.suggestions[0];
  assert.equal(suggestion.kind, "clause-patch");
  if (suggestion.kind === "clause-patch") {
    assert.equal(suggestion.currentText, purpose.text);
    assert.equal(suggestion.proposedText, "This research examines how adults evaluate public information.");
  }
  assert.equal(document.forms[0].clauses.find((clause) => clause.id === purpose.id)?.text, purpose.text);
});

test("locked, fact-sensitive, cross-form, approval, contact, and new-placeholder patches fail closed", async () => {
  const document = await fixtureDocument();
  const purpose = document.forms[0].clauses.find((clause) => clause.kind === "purpose");
  const voluntary = document.forms[0].clauses.find((clause) => clause.kind === "voluntary-participation");
  const risks = document.forms[0].clauses.find((clause) => clause.kind === "risks");
  assert.ok(purpose && voluntary && risks);
  const context = await createConsentAssistantContext(
    document,
    "final-review",
    "form-main",
    purpose.id,
    true,
  );
  assert.ok(context);
  const base = {
    kind: "clause-patch",
    title: "Unsafe",
    rationale: "Unsafe test",
    uncertainty: "Unknown",
    potentialConflict: "Potential conflict",
    formId: "form-main",
    factIds: [],
  };
  const parsed = parseConsentAssistantResponse(JSON.stringify({
    summary: "Adversarial batch",
    suggestions: [
      { ...base, id: "locked", clauseId: voluntary.id, proposedText: "Participation is required." },
      { ...base, id: "risk", clauseId: risks.id, proposedText: "There are no risks." },
      { ...base, id: "cross-form", formId: "form-other", clauseId: purpose.id, proposedText: "Text" },
      { ...base, id: "approval", clauseId: purpose.id, proposedText: "The IRB approved and certified this study." },
      { ...base, id: "contact", clauseId: purpose.id, proposedText: "Email invented@example.edu or call 415-555-9999." },
      { ...base, id: "placeholder", clauseId: purpose.id, proposedText: "This research studies [INVENTED CLAIM]." },
      { ...base, id: "unknown", clauseId: purpose.id, factIds: ["fact-does-not-exist"], proposedText: "Text" },
    ],
  }), context);
  assert.equal(parsed.suggestions.length, 0);
  assert.deepEqual(parsed.rejectedSuggestions.map((item) => item.reason), [
    "protected-clause",
    "fact-sensitive-clause",
    "cross-form-target",
    "unsafe-proposed-text",
    "unsafe-proposed-text",
    "unsafe-proposed-text",
    "unknown-fact-reference",
  ]);
});

test("redaction markers can never be written back into participant-facing text", async () => {
  let document = await fixtureDocument();
  const purpose = document.forms[0].clauses.find((clause) => clause.kind === "purpose");
  assert.ok(purpose);
  document = updateConsentPhase5Clause(document, purpose.id, {
    text: "Dr. Jane Researcher leads this study of public information.",
  }, NOW).document;
  const context = await createConsentAssistantContext(
    document,
    "explain-simplify",
    "form-main",
    purpose.id,
  );
  assert.ok(context);
  assert.match(context.form.clauses[0].text, /\[NAME REDACTED\]/);
  const parsed = parseConsentAssistantResponse(JSON.stringify({
    summary: "Unsafe redaction echo",
    suggestions: [{
      id: "redaction-echo",
      kind: "plain-language-alternative",
      title: "Echo redacted name",
      rationale: "Test",
      uncertainty: "Unknown",
      potentialConflict: "Check source",
      formId: "form-main",
      clauseId: purpose.id,
      factIds: ["fact-design"],
      proposedText: "[NAME REDACTED] leads this study of public information.",
    }],
  }), context);
  assert.equal(parsed.suggestions.length, 0);
  assert.equal(parsed.rejectedSuggestions[0]?.reason, "unsafe-proposed-text");
});

test("malformed and oversized model output stays bounded", async () => {
  const document = await fixtureDocument();
  const purpose = document.forms[0].clauses.find((clause) => clause.kind === "purpose");
  assert.ok(purpose);
  const context = await createConsentAssistantContext(
    document,
    "final-review",
    "form-main",
    purpose.id,
    true,
  );
  assert.ok(context);
  const malformed = parseConsentAssistantResponse("not json", context);
  assert.equal(malformed.suggestions.length, 0);
  assert.equal(malformed.rejectedSuggestions[0]?.reason, "malformed");

  const oversized = parseConsentAssistantResponse(JSON.stringify({
    summary: "Bound the response",
    suggestions: [
      {
        id: "oversized-patch",
        kind: "clause-patch",
        title: "Oversized",
        rationale: "Test",
        uncertainty: "Unknown",
        potentialConflict: "Check source",
        formId: "form-main",
        clauseId: purpose.id,
        factIds: ["fact-design"],
        proposedText: "x".repeat(20_001),
      },
      ...Array.from({ length: 12 }, (_, index) => ({
        id: `finding-${index}`,
        kind: "finding",
        category: "clarity",
        title: `Finding ${index}`,
        rationale: "Test",
        uncertainty: "Unknown",
        potentialConflict: "Check source",
        formId: "form-main",
        clauseId: purpose.id,
        factIds: [],
        observation: "Observed wording.",
        recommendation: "Review it.",
      })),
    ],
  }), context);
  assert.equal(oversized.rejectedSuggestions[0]?.reason, "unsafe-proposed-text");
  assert.equal(oversized.suggestions.length, 7);
});

test("findings and questions remain advisory and cannot carry governance mutations", async () => {
  const document = await fixtureDocument();
  const purpose = document.forms[0].clauses.find((clause) => clause.kind === "purpose");
  assert.ok(purpose);
  const context = await createConsentAssistantContext(
    document,
    "missing-facts",
    "form-main",
    purpose.id,
  );
  assert.ok(context);
  const parsed = parseConsentAssistantResponse(JSON.stringify({
    summary: "Human decisions remain.",
    readiness: "approved",
    governance: { pathway: "exempt" },
    suggestions: [
      {
        id: "question-1",
        kind: "question",
        title: "Confirm purpose wording",
        rationale: "The participant-facing purpose should match the protocol.",
        uncertainty: "The assistant cannot verify the protocol.",
        potentialConflict: "Use the institution's current template.",
        formId: "form-main",
        clauseId: purpose.id,
        factIds: ["fact-design"],
        question: "Does this wording match the approved protocol purpose?",
        whyNeeded: "A researcher must establish factual accuracy.",
        setApproved: true,
      },
      {
        id: "finding-1",
        kind: "finding",
        category: "clarity",
        title: "Dense sentence",
        rationale: "Long sentences can reduce comprehension.",
        uncertainty: "Participant testing may be needed.",
        potentialConflict: "Required wording may constrain edits.",
        formId: "form-main",
        clauseId: purpose.id,
        factIds: [],
        observation: "The purpose sentence contains several ideas.",
        recommendation: "Consider shorter sentences after institutional review.",
      },
    ],
  }), context);
  assert.deepEqual(parsed.suggestions.map((item) => item.kind), ["question", "finding"]);
  assert.equal("readiness" in parsed, false);
  assert.equal("governance" in parsed, false);
  assert.equal("setApproved" in parsed.suggestions[0], false);
});

test("base revision checksums become stale after a researcher applies a clause edit", async () => {
  const document = await fixtureDocument();
  const purpose = document.forms[0].clauses.find((clause) => clause.kind === "purpose");
  assert.ok(purpose);
  const before = await createConsentAssistantContext(document, "draft-clause", "form-main", purpose.id);
  const updated = updateConsentPhase5Clause(document, purpose.id, {
    text: "This study examines how adults understand public information.",
  }, NOW).document;
  const after = await createConsentAssistantContext(updated, "draft-clause", "form-main", purpose.id);
  assert.ok(before && after);
  assert.notEqual(before.baseRevisionChecksum, after.baseRevisionChecksum);
});

test("decision ledger stores bounded researcher actions and checksums without chat transcripts", async () => {
  const document = await fixtureDocument();
  const purpose = document.forms[0].clauses.find((clause) => clause.kind === "purpose");
  assert.ok(purpose);
  const context = await createConsentAssistantContext(document, "draft-clause", "form-main", purpose.id);
  assert.ok(context);
  const response = parseConsentAssistantResponse(JSON.stringify({
    summary: "Review one option.",
    suggestions: [{
      id: "purpose-option",
      kind: "clause-patch",
      title: "Purpose option",
      rationale: "Clarity",
      uncertainty: "Confirm accuracy",
      potentialConflict: "Check template",
      formId: "form-main",
      clauseId: purpose.id,
      factIds: ["fact-design"],
      proposedText: "This study examines how adults evaluate public information.",
    }],
  }), context);
  const suggestion = response.suggestions[0];
  assert.ok(suggestion);
  const record = await createConsentAssistantDecisionRecord({
    projectId: PROJECT_ID,
    suggestion,
    mode: "draft-clause",
    action: "applied",
    baseRevisionChecksum: context.baseRevisionChecksum,
    proposedText: suggestion.kind === "clause-patch" ? suggestion.proposedText : null,
    resultingText: suggestion.kind === "clause-patch" ? suggestion.proposedText : null,
    servedModel: "test/model",
    decidedAt: NOW,
  });
  const storage = memoryStorage();
  writeConsentAssistantDecisions(storage, PROJECT_ID, [record]);
  const loaded = readConsentAssistantDecisions(storage, PROJECT_ID);
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].action, "applied");
  assert.match(loaded[0].proposedTextChecksum ?? "", /^sha256:/);
  assert.equal(JSON.stringify(loaded).includes("This study examines"), false);
  assert.equal("chat" in loaded[0], false);

  const oversized = Array.from({ length: 205 }, (_, index) => ({
    ...record,
    id: `decision-${index}`,
  })) as ConsentAssistantDecisionRecord[];
  writeConsentAssistantDecisions(storage, PROJECT_ID, oversized);
  assert.equal(readConsentAssistantDecisions(storage, PROJECT_ID).length, 200);
});
