import assert from "node:assert/strict";
import test from "node:test";
import { PROJECT_ROUTE_VERIFICATION_FIXTURES } from "./projectRouteProfile";
import {
  PROPOSAL_AUTHORITY_REGISTRY_ACCESSED_AT,
  PROPOSAL_REQUIREMENT_AUTHORITIES,
  assessProposalRequirementAuthorityDrift,
  compileProposalRequirements,
  createDefaultProposalRequirementDraft,
  proposalRequirementDraftFromProfile,
  proposalRequirementTemplateIdFromProfile,
  recommendProposalRequirementTemplates,
  type ProposalRequirementTemplateId,
} from "./proposalRequirementsCompiler";
import {
  createResearchProposalDocument,
  verifyResearchProposalDocument,
} from "./researchProposalDocument";

function routeForFixture(fixture: (typeof PROJECT_ROUTE_VERIFICATION_FIXTURES)[number]) {
  return { intent: fixture.input.intent, methodFamily: fixture.input.methodFamily };
}

test("the requirements compiler produces a valid, route-aware profile for all 12 canonical research routes", async () => {
  assert.equal(PROJECT_ROUTE_VERIFICATION_FIXTURES.length, 12);
  for (const fixture of PROJECT_ROUTE_VERIFICATION_FIXTURES) {
    const route = routeForFixture(fixture);
    const draft = createDefaultProposalRequirementDraft(route);
    draft.researcherConfirmed = true;
    const compiled = compileProposalRequirements({ projectId: fixture.input.projectId, route, draft });
    assert.equal(compiled.ready, true, fixture.id);
    assert.equal(compiled.profile.route.intent, route.intent, fixture.id);
    assert.equal(compiled.profile.route.methodFamily, route.methodFamily, fixture.id);
    assert.ok(compiled.profile.requirements.length > 0, fixture.id);
    const proposal = await createResearchProposalDocument({
      projectId: fixture.input.projectId,
      requirements: compiled.profile,
      now: "2026-08-05T00:00:00.000Z",
    });
    assert.equal(await verifyResearchProposalDocument(proposal), true, fixture.id);
  }
});

test("evidence-synthesis profiles never force participant-study language", () => {
  const route = { intent: "evidence-synthesis" as const, methodFamily: "evidence-synthesis" as const };
  const draft = createDefaultProposalRequirementDraft(route);
  draft.researcherConfirmed = true;
  const compiled = compileProposalRequirements({ projectId: "fixture-review", route, draft });
  const language = compiled.profile.requirements.map((item) => `${item.label} ${item.description}`).join(" ");
  assert.doesNotMatch(language, /\bparticipants?\b/i);
  assert.equal(draft.templateId, "prisma-p-2015");
});

test("qualitative profiles do not force variable or hypothesis fields", () => {
  const route = { intent: "primary-data" as const, methodFamily: "qualitative" as const };
  const draft = createDefaultProposalRequirementDraft(route);
  draft.researcherConfirmed = true;
  const compiled = compileProposalRequirements({ projectId: "fixture-qual", route, draft });
  const language = compiled.profile.requirements.map((item) => `${item.label} ${item.description}`).join(" ");
  assert.doesNotMatch(language, /\bvariables?\b|\bhypoth(?:esis|eses)\b/i);
  assert.equal(draft.templateId, "jars-qual-2018");
});

test("funder profiles require a deliberate authority choice and preserve opportunity override warnings", () => {
  const route = { intent: "primary-data" as const, methodFamily: "quantitative" as const };
  assert.deepEqual(recommendProposalRequirementTemplates(route, "funder"), ["nih-forms-i", "nsf-pappg-24-1", "researcher-defined"]);
  for (const templateId of ["nih-forms-i", "nsf-pappg-24-1"] as const) {
    const draft = { ...createDefaultProposalRequirementDraft(route), purpose: "funder" as const, templateId, researcherConfirmed: true };
    const compiled = compileProposalRequirements({ projectId: `fixture-${templateId}`, route, draft });
    assert.equal(compiled.ready, true);
    assert.ok(compiled.issues.some((issue) => issue.severity === "advisory" && /opportunity|solicitation/i.test(issue.message)));
    assert.ok(compiled.profile.authorities.length > 0);
  }
});

test("custom funder profiles fail closed until their source and requirements are recorded", () => {
  const route = { intent: "primary-data" as const, methodFamily: "mixed-methods" as const };
  const draft = {
    ...createDefaultProposalRequirementDraft(route),
    purpose: "funder" as const,
    templateId: "researcher-defined" as const,
    researcherConfirmed: true,
  };
  const blocked = compileProposalRequirements({ projectId: "fixture-custom-funder", route, draft });
  assert.equal(blocked.ready, false);
  assert.ok(blocked.issues.some((issue) => issue.id === "custom-authority-required"));
  assert.ok(blocked.issues.some((issue) => issue.id === "custom-requirement-required"));

  const ready = compileProposalRequirements({
    projectId: "fixture-custom-funder",
    route,
    draft: {
      ...draft,
      customAuthorityName: "Example opportunity",
      customAuthorityVersion: "2026-01",
      customAuthorityUrl: "https://example.edu/opportunity/2026-01",
      customRequirementLines: ["Project summary", "Research plan"],
    },
  });
  assert.equal(ready.ready, true);
  assert.equal(ready.profile.authorities[0].kind, "researcher-defined");
});

test("profiles round-trip to editable drafts without inventing requirements", () => {
  const route = { intent: "secondary-data" as const, methodFamily: "quantitative" as const };
  const draft = { ...createDefaultProposalRequirementDraft(route), researcherConfirmed: true, maximumWords: 8_000 };
  const first = compileProposalRequirements({ projectId: "fixture-roundtrip", route, draft });
  const restored = proposalRequirementDraftFromProfile(first.profile);
  const second = compileProposalRequirements({ projectId: "fixture-roundtrip", route, draft: restored, previous: first.profile });
  assert.equal(proposalRequirementTemplateIdFromProfile(first.profile), draft.templateId);
  assert.deepEqual(second.profile, first.profile);
});

test("authority snapshots are versioned, HTTPS-only, and drift detectable", () => {
  assert.equal(PROPOSAL_AUTHORITY_REGISTRY_ACCESSED_AT, "2026-08-05T00:00:00.000Z");
  assert.ok(PROPOSAL_REQUIREMENT_AUTHORITIES.every((item) => item.sourceUrl.startsWith("https://") && item.version.length > 0));
  const route = { intent: "primary-data" as const, methodFamily: "quantitative" as const };
  const draft = {
    ...createDefaultProposalRequirementDraft(route),
    purpose: "funder" as const,
    templateId: "nih-forms-i" as ProposalRequirementTemplateId,
    researcherConfirmed: true,
  };
  const compiled = compileProposalRequirements({ projectId: "fixture-drift", route, draft });
  assert.deepEqual(assessProposalRequirementAuthorityDrift(compiled.profile), []);
  const changed = {
    ...compiled.profile,
    authorities: compiled.profile.authorities.map((item, index) => index === 0 ? { ...item, version: "older-version" } : item),
  };
  assert.ok(assessProposalRequirementAuthorityDrift(changed).some((issue) => issue.id.startsWith("authority-drift-")));
});

test("the compiler never represents compliance or approval", () => {
  const route = { intent: "primary-data" as const, methodFamily: "quantitative" as const };
  const draft = { ...createDefaultProposalRequirementDraft(route), researcherConfirmed: true };
  const compiled = compileProposalRequirements({ projectId: "fixture-boundary", route, draft });
  assert.match(compiled.claim, /not-compliance-approval-submission/);
  assert.match(compiled.profile.claim, /not-compliance-approval-or-submission/);
  assert.equal(Object.prototype.hasOwnProperty.call(compiled.profile, "approved"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(compiled.profile, "compliant"), false);
});

test("invalid word limits and oversized labels fail closed without creating an invalid profile", () => {
  const route = { intent: "primary-data" as const, methodFamily: "quantitative" as const };
  const compiled = compileProposalRequirements({
    projectId: "fixture-bounds",
    route,
    draft: {
      ...createDefaultProposalRequirementDraft(route),
      language: "x".repeat(36),
      citationStyle: "x".repeat(161),
      maximumWords: 2_000_001,
      researcherConfirmed: true,
    },
  });
  assert.equal(compiled.ready, false);
  assert.equal(compiled.profile.maximumWords, null);
  assert.ok(compiled.issues.some((issue) => issue.id === "language-too-long"));
  assert.ok(compiled.issues.some((issue) => issue.id === "citation-style-too-long"));
  assert.ok(compiled.issues.some((issue) => issue.id === "maximum-words-invalid"));
});
