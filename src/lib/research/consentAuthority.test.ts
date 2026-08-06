import assert from "node:assert/strict";
import test from "node:test";
import {
  applyConsentClausePatch,
  collectConsentAuthoritySafetyIssues,
  compareConsentAuthorityManifests,
  createConsentClauseDraft,
  GENERIC_US_CONSENT_AUTHORITY_MANIFEST,
  getBundledConsentAuthorityManifest,
  listBundledConsentAuthorityManifests,
  normalizeConsentAuthorityManifest,
  UCSF_2026_CONSENT_AUTHORITY_MANIFEST,
  type ConsentClauseDefinition,
} from "./consentAuthority";

test("bundled authority manifests are bounded metadata profiles, not approval claims", () => {
  const manifests = listBundledConsentAuthorityManifests();
  const ucsf = manifests.find((manifest) => manifest.id === "ucsf-hrpp-consent-2026");

  assert.equal(manifests.length, 2);
  assert.ok(ucsf);
  assert.equal(ucsf.redistribution.status, "metadata-only");
  assert.equal(ucsf.redistribution.allowsBundledSourceText, false);
  assert.equal(ucsf.claimBoundary, "authoring-consistency-support-not-irb-legal-ethics-or-compliance-approval");
  assert.ok(ucsf.clauseDefinitions.every((clause) => clause.sourceText === ""));
  assert.equal(
    ucsf.sources.find((source) => source.id === "ucsf-plain-language-template-2026")?.snapshotChecksum,
    "sha256:6baad0e127ff0ddb4b7a27077694750ce84d2d74c39ce732cfc0934ed17a6a5b",
  );
  assert.equal(
    ucsf.sources.find((source) => source.id === "ucsf-plain-language-companion-2026")?.snapshotChecksum,
    "sha256:289acc2155ec6a6fb0d49541cb0ea13a1f511ef92a9d9005ef0d180c88e5f003",
  );
  assert.ok(ucsf.capabilities.every((capability) => capability.mode !== "runtime-supported"));
});

test("registry returns normalized copies and does not expose mutable bundled state", () => {
  const first = getBundledConsentAuthorityManifest("ucsf-hrpp-consent-2026");
  const second = getBundledConsentAuthorityManifest("ucsf-hrpp-consent-2026");
  assert.ok(first && second);
  first.displayName = "Changed locally";
  assert.notEqual(second.displayName, first.displayName);
  assert.equal(getBundledConsentAuthorityManifest("unknown"), null);
});

test("authority import rejects duplicate IDs, non-HTTPS sources, and oversized payloads", () => {
  const duplicate = structuredClone(UCSF_2026_CONSENT_AUTHORITY_MANIFEST);
  duplicate.sources.push(structuredClone(duplicate.sources[0]));
  assert.equal(normalizeConsentAuthorityManifest(duplicate), null);

  const unsafeUrl = structuredClone(UCSF_2026_CONSENT_AUTHORITY_MANIFEST);
  unsafeUrl.sources[0].url = "http://example.com/template";
  assert.equal(normalizeConsentAuthorityManifest(unsafeUrl), null);

  const oversized = structuredClone(GENERIC_US_CONSENT_AUTHORITY_MANIFEST) as typeof GENERIC_US_CONSENT_AUTHORITY_MANIFEST & { ignored?: string };
  oversized.ignored = "x".repeat(600 * 1024);
  assert.equal(normalizeConsentAuthorityManifest(oversized), null);
});

test("safety checks block unlicensed embedded source text", () => {
  const unsafe = structuredClone(UCSF_2026_CONSENT_AUTHORITY_MANIFEST);
  unsafe.clauseDefinitions[0].sourceText = "Institutional source text should not be bundled here.";
  const issues = collectConsentAuthoritySafetyIssues(unsafe);
  assert.ok(issues.some((issue) => issue.id === "metadata-profile-contains-source-text" && issue.severity === "blocking"));
});

function definition(policy: ConsentClauseDefinition["policy"]): ConsentClauseDefinition {
  return {
    id: `${policy}-fixture`,
    purpose: "Policy enforcement fixture",
    sourceId: "fixture-source",
    sourceLocator: "Fixture section",
    policy,
    sourceText: "Approved {studyName} wording",
    allowedPlaceholders: ["studyName"],
  };
}

test("clause policies enforce locked, fill-only, conditional, and human-review boundaries", () => {
  const locked = definition("locked");
  const lockedDraft = createConsentClauseDraft(locked);
  assert.equal(applyConsentClausePatch(locked, lockedDraft, { text: "Rewritten" }).ok, false);
  assert.equal(applyConsentClausePatch(locked, { ...lockedDraft, definitionId: "other" }, {}).ok, false);

  const fillOnly = definition("fill-only");
  const fillDraft = { ...createConsentClauseDraft(fillOnly), reviewState: "human-reviewed" as const };
  const filled = applyConsentClausePatch(fillOnly, fillDraft, { placeholderValues: { studyName: "Memory Study" } });
  assert.equal(filled.ok, true);
  if (filled.ok) {
    assert.equal(filled.clause.placeholderValues.studyName, "Memory Study");
    assert.equal(filled.clause.reviewState, "not-reviewed");
  }
  assert.equal(applyConsentClausePatch(fillOnly, fillDraft, { text: "Rewritten" }).ok, false);
  assert.equal(applyConsentClausePatch(fillOnly, fillDraft, { placeholderValues: { unknown: "value" } }).ok, false);

  const conditional = definition("conditional");
  const conditionalDraft = createConsentClauseDraft(conditional);
  const included = applyConsentClausePatch(conditional, conditionalDraft, { applicability: "included" });
  assert.equal(included.ok, true);
  assert.equal(applyConsentClausePatch(conditional, conditionalDraft, { text: "Changed" }).ok, false);

  const reviewRequired = definition("institution-review-required");
  const reviewedDraft = { ...createConsentClauseDraft(reviewRequired), reviewState: "human-reviewed" as const };
  const changed = applyConsentClausePatch(reviewRequired, reviewedDraft, { text: "Researcher revision" });
  assert.equal(changed.ok, true);
  if (changed.ok) assert.equal(changed.clause.reviewState, "human-review-required");
});

test("authority updates create reconciliation evidence without mutating the old profile", () => {
  const previous = structuredClone(UCSF_2026_CONSENT_AUTHORITY_MANIFEST);
  const current = structuredClone(previous);
  current.profileVersion = "2026.08.01";
  current.sources[0].version = "current-2026-08-01";
  const summary = compareConsentAuthorityManifests(previous, current);

  assert.equal(summary.status, "source-updated");
  assert.deepEqual(summary.changedSourceIds, ["ucsf-consent-template-index"]);
  assert.equal(previous.profileVersion, "2026.07.01");
});
