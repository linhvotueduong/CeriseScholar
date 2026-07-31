import assert from "node:assert/strict";
import test from "node:test";
import { createResearchArtifactSourceFingerprint, sha256ArtifactChecksum } from "./artifactIdentity";
import {
  collectConsentProtocolFoundationIssues,
  normalizeConsentProtocolDraft,
  type ConsentProtocolDraft,
} from "./consentProtocol";
import { UCSF_2026_CONSENT_AUTHORITY_MANIFEST } from "./consentAuthority";
import {
  collectStudyBuildProfileReadiness,
  normalizeStudyBuildProfile,
  type StudyBuildProfile,
} from "./studyBuildProfile";

async function sourceFingerprint() {
  return createResearchArtifactSourceFingerprint([{
    artifactKind: "study-design",
    artifactId: "design-1",
    schemaVersion: 1,
    checksum: await sha256ArtifactChecksum({ design: "survey" }),
  }]);
}

test("Study Build Profile schema is project-scoped, bounded, and derives readiness", async () => {
  const profile: StudyBuildProfile = {
    schemaVersion: 1,
    compilerVersion: 1,
    projectId: "project-1",
    sourceFingerprint: await sourceFingerprint(),
    designKind: "cross-sectional-survey",
    setting: "online",
    methodLanes: ["quantitative"],
    capabilities: [{ id: "online-survey", status: "supported", rationale: "The current runner supports this slice." }],
    modules: [],
    requiredChecks: [],
    recommendedChecks: [],
    capabilityFindings: [{
      id: "mobile-review",
      capability: "mobile-layout",
      status: "supported-with-limits",
      severity: "warning",
      message: "Review every planned viewport.",
      repairTarget: "studio",
    }],
    conflicts: [],
    rationales: [],
  };
  const normalized = normalizeStudyBuildProfile({ ...profile, ignored: "discard me" }, "project-1");
  assert.ok(normalized);
  assert.equal("ignored" in normalized, false);
  assert.equal(collectStudyBuildProfileReadiness(normalized).status, "review");
  assert.equal(normalizeStudyBuildProfile(profile, "different-project"), null);

  const duplicate = structuredClone(profile);
  duplicate.capabilities.push(structuredClone(duplicate.capabilities[0]));
  assert.equal(normalizeStudyBuildProfile(duplicate, "project-1"), null);
});

test("Consent Protocol schema preserves declarations while deterministic issues prevent inferred approval", async () => {
  const draft: ConsentProtocolDraft = {
    schemaVersion: 1,
    projectId: "project-1",
    authorityManifestId: UCSF_2026_CONSENT_AUTHORITY_MANIFEST.id,
    authorityProfileVersion: UCSF_2026_CONSENT_AUTHORITY_MANIFEST.profileVersion,
    sourceFingerprint: await sourceFingerprint(),
    governance: {
      pathway: "not-yet-determined",
      decisionSource: "none",
      institutionReference: "",
      documentationMethod: "not-yet-determined",
      waiverOrAlteration: null,
    },
    participantGroups: [{
      id: "adult-en",
      audience: "adult-participant",
      language: "en-US",
      description: "Adults participating in English.",
    }],
    formRequirements: [{
      id: "adult-standard",
      family: "standard-plain-language",
      participantGroupId: "adult-en",
      capabilityMode: "authoring-export-only",
      rationale: "Initial adult authoring package.",
    }],
    procedureModules: [],
    researcherNotes: "",
    updatedAt: "2026-07-31T12:00:00.000Z",
  };
  const normalized = normalizeConsentProtocolDraft({ ...draft, ready: true }, "project-1");
  assert.ok(normalized);
  assert.equal("ready" in normalized, false);
  const issues = collectConsentProtocolFoundationIssues(normalized, UCSF_2026_CONSENT_AUTHORITY_MANIFEST);
  assert.ok(issues.some((issue) => issue.id === "governance-pathway-undetermined" && issue.severity === "blocking"));
  assert.ok(issues.some((issue) => issue.id === "documentation-method-undetermined" && issue.severity === "blocking"));

  const invalidFormReference = structuredClone(draft);
  invalidFormReference.formRequirements[0].participantGroupId = "missing-group";
  assert.equal(normalizeConsentProtocolDraft(invalidFormReference, "project-1"), null);
});

test("waiver of signed documentation remains blocked until human approval evidence is recorded", async () => {
  const draft = {
    schemaVersion: 1,
    projectId: "project-1",
    authorityManifestId: UCSF_2026_CONSENT_AUTHORITY_MANIFEST.id,
    authorityProfileVersion: UCSF_2026_CONSENT_AUTHORITY_MANIFEST.profileVersion,
    sourceFingerprint: await sourceFingerprint(),
    governance: {
      pathway: "expedited-or-full",
      decisionSource: "institution",
      institutionReference: "IRB determination record",
      documentationMethod: "implied",
      waiverOrAlteration: { status: "requested", approvalReference: "" },
    },
    participantGroups: [{ id: "adult-en", audience: "adult-participant", language: "en-US", description: "Adults" }],
    formRequirements: [],
    procedureModules: [],
    researcherNotes: "",
    updatedAt: "2026-07-31T12:00:00.000Z",
  };
  const normalized = normalizeConsentProtocolDraft(draft, "project-1");
  assert.ok(normalized);
  assert.ok(collectConsentProtocolFoundationIssues(normalized, UCSF_2026_CONSENT_AUTHORITY_MANIFEST)
    .some((issue) => issue.id === "waiver-documentation-not-approved"));

  normalized.governance.waiverOrAlteration = { status: "approved", approvalReference: "IRB-2026-001" };
  assert.equal(collectConsentProtocolFoundationIssues(normalized, UCSF_2026_CONSENT_AUTHORITY_MANIFEST)
    .some((issue) => issue.id === "waiver-documentation-not-approved"), false);

  normalized.governance.pathway = "documented-exempt";
  normalized.governance.waiverOrAlteration = null;
  assert.equal(collectConsentProtocolFoundationIssues(normalized, UCSF_2026_CONSENT_AUTHORITY_MANIFEST)
    .some((issue) => issue.id === "waiver-documentation-not-approved"), false);
});
