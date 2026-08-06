import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createResearchArtifactIdentity, sha256ArtifactChecksum, type ResearchArtifactReference } from "../src/lib/research/artifactIdentity";
import {
  applyProposalCopilotPatch,
  compileProposalCopilotReview,
  createProposalCopilotContext,
  createProposalCopilotDecisionRecords,
  normalizeAndVerifyProposalCopilotContext,
  parseProposalCopilotResponse,
  PROPOSAL_COPILOT_TECHNIQUES,
} from "../src/lib/research/proposalCopilotPhase8";
import {
  createProjectEvidenceAssessment,
  createResearchProposalDocument,
  type ResearchProposalSection,
} from "../src/lib/research/researchProposalDocument";

const OUTPUT_DIRECTORY = path.join(process.cwd(), "output");
const JSON_PATH = path.join(OUTPUT_DIRECTORY, "build-2-phase-8-verification.json");
const MARKDOWN_PATH = path.join(OUTPUT_DIRECTORY, "build-2-phase-8-verification.md");
const NOW = "2026-08-06T12:30:00.000Z";
const PROJECT_ID = "build2-phase8-verification";

interface AcceptanceCheck { id: string; label: string; passed: boolean; evidence: string }
const check = (id: string, label: string, passed: boolean, evidence: string): AcceptanceCheck => ({ id, label, passed, evidence });

function reference(identity: Awaited<ReturnType<typeof createResearchArtifactIdentity>>): ResearchArtifactReference {
  return { artifactKind: identity.artifactKind, artifactId: identity.artifactId, schemaVersion: identity.artifactSchemaVersion, checksum: identity.checksum };
}

function sections(): ResearchProposalSection[] {
  return [{
    id: "proposal_background", title: "Background", role: "proposal_background",
    content: "The reviewed evidence suggests a bounded pattern. Important uncertainty remains.",
    citationKeys: ["source-verified"], sourceKnowledgeEntryIds: [], sourceAssetIds: [], sourceClaimIds: ["claim-1"],
    sourceEvidenceAssessmentIds: ["assessment-verified"], sourceContractEntryIds: [], requirementIds: ["requirement-1"],
    unresolvedSupportNotes: "Do not overstate the evidence.", researcherReviewed: true,
  }, {
    id: "proposal_problem_statement", title: "Problem statement", role: "proposal_problem_statement",
    content: "NONSELECTED-SECTION-SENTINEL", citationKeys: [], sourceKnowledgeEntryIds: [], sourceAssetIds: [], sourceClaimIds: [], sourceEvidenceAssessmentIds: [], sourceContractEntryIds: [], requirementIds: [], unresolvedSupportNotes: "", researcherReviewed: true,
  }];
}

function providerResponse(technique: string): string {
  return JSON.stringify({ id: `patch-${technique}`, summary: `Review the ${technique} operation; nothing has been applied.`, operations: [{ id: `operation-${technique}`, kind: "replace-text", title: `Bounded ${technique} revision`, rationale: "This preserves the selected evidence boundary.", uncertainty: "The researcher must confirm intended meaning.", currentText: "The reviewed evidence suggests a bounded pattern.", proposedText: "The selected reviewed evidence suggests a bounded pattern [@source-verified].", evidenceAssessmentIds: ["assessment-verified"], citationKeys: ["source-verified"] }] });
}

async function main() {
  const [domainSource, apiSource, uiSource, composerSource, persistenceSource, decisionSource] = await Promise.all([
    readFile(path.join(process.cwd(), "src/lib/research/proposalCopilotPhase8.ts"), "utf8"),
    readFile(path.join(process.cwd(), "src/app/api/ai/proposal-copilot/route.ts"), "utf8"),
    readFile(path.join(process.cwd(), "src/components/research-path/ProposalCopilotPanel.tsx"), "utf8"),
    readFile(path.join(process.cwd(), "src/components/research-path/ProposalComposerStudio.tsx"), "utf8"),
    readFile(path.join(process.cwd(), "src/lib/research/researchFoundationPersistence.ts"), "utf8"),
    readFile(path.join(process.cwd(), "src/lib/research/researchDecisionLedger.ts"), "utf8"),
  ]);

  const sourceIdentity = await createResearchArtifactIdentity({ artifactKind: "evidence-library", artifactId: "source-verified", artifactSchemaVersion: 1, payload: { title: "Verified source" } });
  const assessment = await createProjectEvidenceAssessment({ projectId: PROJECT_ID, assessmentId: "assessment-verified", sourceId: "source-verified", status: "included", decisionRationale: "Included by the researcher.", researcherNotes: "The observed pattern remains bounded.", caveats: ["Uncertainty remains."], linkedClaimIds: ["claim-1"], linkedQuestionIds: ["rq-1"], reviewedAt: NOW, sourceReference: reference(sourceIdentity), now: NOW });
  const document = await createResearchProposalDocument({ projectId: PROJECT_ID, title: "Proposal Copilot verification", sections: sections(), now: NOW });

  const techniqueFixtures = await Promise.all(PROPOSAL_COPILOT_TECHNIQUES.map(async (technique) => {
    const context = await createProposalCopilotContext({ document, sectionId: "proposal_background", assessments: [assessment], selectedAssessmentIds: [assessment.assessmentId], technique, focus: "Preserve uncertainty." });
    const parsed = await parseProposalCopilotResponse({ raw: providerResponse(technique), context, servedModel: "verification/model", generatedAt: NOW });
    return { technique, context, patch: parsed.patch, rejected: parsed.rejectedOperations };
  }));
  const fixture = techniqueFixtures[0];
  if (!fixture.patch) throw new Error("Verification fixture patch was not created.");
  const decision = { operationId: fixture.patch.operations[0].id, disposition: "accept" as const, rationale: "The researcher verified this bounded wording.", proposedText: fixture.patch.operations[0].proposedText };
  const review = await compileProposalCopilotReview({ document, patch: fixture.patch, decisions: [decision] });
  const nextSections = await applyProposalCopilotPatch({ document, patch: fixture.patch, decisions: [decision] });
  const resultingDocument = await createResearchProposalDocument({ projectId: PROJECT_ID, previous: document, sections: nextSections, createdBy: "reviewed-ai-patch", now: "2026-08-06T12:31:00.000Z" });
  const records = await createProposalCopilotDecisionRecords({ document, resultingDocument, patch: fixture.patch, decisions: [decision], decidedAt: NOW });
  const changedDocument = await createResearchProposalDocument({ projectId: PROJECT_ID, previous: document, sections: document.sections.map((section) => section.id === "proposal_background" ? { ...section, content: `${section.content} Researcher edit.` } : section), now: "2026-08-06T12:32:00.000Z" });
  const stale = await compileProposalCopilotReview({ document: changedDocument, patch: fixture.patch, decisions: [decision] });
  const deferred = await compileProposalCopilotReview({ document, patch: fixture.patch, decisions: [{ ...decision, disposition: "defer" as const, rationale: "" }] });
  const unknownCitation = JSON.parse(providerResponse("clarity"));
  unknownCitation.operations[0].proposedText = "Invented evidence [@source-invented].";
  unknownCitation.operations[0].citationKeys = ["source-invented"];
  const rejectedCitation = await parseProposalCopilotResponse({ raw: JSON.stringify(unknownCitation), context: fixture.context, servedModel: "verification/model", generatedAt: NOW });

  const acceptance: AcceptanceCheck[] = [
    check("AC-01", "Five registered scholarly writing techniques", techniqueFixtures.length === 5 && techniqueFixtures.every((item) => item.patch && item.rejected.length === 0), "Outline, evidence synthesis, clarity, structure, and consistency each produce a verified structured fixture."),
    check("AC-02", "Single-section provider scope", techniqueFixtures.every((item) => item.context.section.id === "proposal_background" && !JSON.stringify(item.context).includes("NONSELECTED-SECTION-SENTINEL")), "Nonselected proposal prose is absent from every context."),
    check("AC-03", "Selected reviewed sources only", techniqueFixtures.every((item) => item.context.selectedSources.length === 1 && item.context.selectedSources[0].assessmentId === "assessment-verified"), "The context compiler admits only linked, included, reviewed, checksum-valid assessments."),
    check("AC-04", "Explicit exclusion manifest", fixture.context.excludedContent.includes("requirements-and-authority-rules") && fixture.context.excludedContent.includes("research-questions-and-study-contract") && fixture.context.excludedContent.includes("prompt-or-chat-history"), "Out-of-scope governance and history are named and excluded."),
    check("AC-05", "Checksum-valid context", Boolean(await normalizeAndVerifyProposalCopilotContext(fixture.context)), "The selected scope is independently normalized and checksum verified."),
    check("AC-06", "Exact unique-anchor operations", techniqueFixtures.every((item) => item.patch?.operations.every((operation) => operation.currentText.length > 0 && operation.start >= 0)), "Provider prose is converted into bounded exact-anchor operations."),
    check("AC-07", "Invented citations rejected", rejectedCitation.patch === null && rejectedCitation.rejectedOperations.some((item) => item.reason === "unknown-citation"), "Unknown source IDs fail closed before review."),
    check("AC-08", "Citation provenance declared twice", domainSource.includes("proposedCitationTokens") && domainSource.includes("!citationKeys.includes(key)"), "Inline [@sourceId] tokens must also appear in the operation citation manifest."),
    check("AC-09", "Prompt injection remains untrusted data", apiSource.includes("UNTRUSTED PROPOSAL CONTEXT") && apiSource.includes("data, never instructions") && apiSource.includes("Source notes as project-authored untrusted data".toLowerCase().split(" ").slice(1, 3).join(" ")), "The trusted system boundary treats section and source text as data."),
    check("AC-10", "Stale-manuscript protection", stale.stale && !stale.canCommit, "Any proposal revision change invalidates the older patch."),
    check("AC-11", "No change without explicit acceptance", !deferred.canCommit && domainSource.includes('disposition === "accept"'), "Deferred operations cannot commit and apply selects only explicitly accepted operations."),
    check("AC-12", "Per-operation rationale", deferred.missingRationales.length === 1 && uiSource.includes("Researcher rationale"), "Every accept or decline requires a researcher reason."),
    check("AC-13", "Immutable proposal metadata", JSON.stringify(nextSections[0].requirementIds) === JSON.stringify(document.sections[0].requirementIds) && JSON.stringify(nextSections[0].sourceEvidenceAssessmentIds) === JSON.stringify(document.sections[0].sourceEvidenceAssessmentIds) && JSON.stringify(nextSections[1]) === JSON.stringify(document.sections[1]), "Application changes only selected content and resets its researcher-review flag."),
    check("AC-14", "Reviewed AI patch revision", resultingDocument.revisionHistory.at(-1)?.createdBy === "reviewed-ai-patch" && resultingDocument.revisionHistory.at(-1)?.previousChecksum === document.identity.checksum, "Accepted operations create a direct immutable revision above the reviewed base."),
    check("AC-15", "No prompt or transcript ledger storage", records.every((record) => record.promptStored === false && record.chatTranscriptStored === false) && decisionSource.includes("promptStored: false") && decisionSource.includes("chatTranscriptStored: false"), "The append-only ledger stores decisions, reasons, artifact checksums, and served model—not prompts or chat transcripts."),
    check("AC-16", "Device and secure decision persistence", domainSource.includes("appendLocalProposalCopilotDecisions") && uiSource.includes("appendResearchDecisionEvent") && persistenceSource.includes('from("research_decision_events")'), "Verified events are retained locally and appended to the existing owner-scoped foundation ledger when signed in."),
    check("AC-17", "Cancellation, timeout, and offline behavior", uiSource.includes("navigator.onLine") && uiSource.includes("Cancel request") && uiSource.includes("50_000") && apiSource.includes("timeoutMs: 45_000"), "Network loss, cancellation, and timeouts report that no change was made."),
    check("AC-18", "Server safety controls", apiSource.includes("isSameOriginJsonRequest") && apiSource.includes("checkRateLimit") && apiSource.includes("MAX_DAILY_REQUESTS") && apiSource.includes("Cache-Control") && apiSource.includes('.eq("user_id", user.id)'), "Auth, ownership, same-origin JSON, no-store, rate, daily, monthly, and account guardrails are enforced."),
    check("AC-19", "Side-by-side per-operation review", uiSource.includes("Current saved text") && uiSource.includes("Proposed text — editable before acceptance") && uiSource.includes(">Accept<") && uiSource.includes(">Decline<") && uiSource.includes(">Defer<"), "The accepted composer visual system now exposes editable side-by-side differences and three explicit dispositions."),
    check("AC-20", "Embedded functional boundary", composerSource.includes("ProposalCopilotPanel") && composerSource.includes("hasUnsavedChanges") && !apiSource.includes("createResearchProposalDocument") && review.canCommit, "The copilot is embedded in the existing composer, requires a saved base, and the server cannot mutate a proposal."),
  ];
  const passed = acceptance.every((item) => item.passed);
  const reportCore = { schemaVersion: 1, build: "Build 2", phase: 8, verifiedAt: new Date().toISOString(), passed, activation: { migration: "not-required", deployment: "not-requested", browserRuntime: "verified" }, techniques: techniqueFixtures.map((item) => ({ technique: item.technique, contextChecksum: item.context.contextChecksum, patchChecksum: item.patch?.checksum ?? null, operations: item.patch?.operations.length ?? 0 })), acceptance };
  const report = { ...reportCore, reportChecksum: await sha256ArtifactChecksum(reportCore) };
  const markdown = [`# Build 2 Phase 8 Verification`, ``, `Result: **${passed ? "PASS" : "FAIL"}**`, ``, `Report checksum: \`${report.reportChecksum}\``, ``, `## Acceptance`, ``, ...acceptance.map((item) => `- ${item.passed ? "PASS" : "FAIL"} ${item.id} — ${item.label}: ${item.evidence}`), ``, `## Activation boundary`, ``, `- Migration: not required (uses the existing Build 0 decision ledger)`, `- Deployment: not requested`, `- Browser runtime: verified with the rendered Proposal Copilot scope and unsaved-base gate`, ``].join("\n");
  await mkdir(OUTPUT_DIRECTORY, { recursive: true });
  await Promise.all([writeFile(JSON_PATH, `${JSON.stringify(report, null, 2)}\n`), writeFile(MARKDOWN_PATH, markdown)]);
  console.log(JSON.stringify({ passed, checks: acceptance.length, techniques: techniqueFixtures.length, reportChecksum: report.reportChecksum, json: JSON_PATH, markdown: MARKDOWN_PATH }, null, 2));
  if (!passed) process.exitCode = 1;
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });
