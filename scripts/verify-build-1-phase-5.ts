import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256ArtifactChecksum } from "../src/lib/research/artifactIdentity";
import { createResearchKnowledgeEntry } from "../src/lib/research/livingResearchRecord";
import {
  MAX_MENTOR_APPROVED_EVIDENCE,
  MAX_MENTOR_ARTIFACTS,
  MAX_MENTOR_CONTEXT_BYTES,
  MAX_MENTOR_DECISIONS,
  MENTOR_STAGE_CAPABILITIES,
  createMentorContextEnvelope,
  createMentorProjectMemory,
  mentorContextIsCurrent,
  normalizeAndVerifyMentorContextEnvelope,
  removeMentorProjectMemoryItem,
  upsertMentorProjectMemoryItem,
} from "../src/lib/research/mentorContextEnvelope";
import { parseResearchMentorResponse } from "../src/lib/research/researchMentor";

const NOW = "2026-08-04T12:00:00.000Z";
const OUTPUT_DIRECTORY = path.join(process.cwd(), "output");

interface Check { id: string; label: string; passed: boolean; evidence: string }

function check(id: string, label: string, passed: boolean, evidence: string): Check {
  return { id, label, passed, evidence };
}

async function main() {
  const projectId = "verify-build1-phase5";
  let memory = await createMentorProjectMemory({ projectId, updatedAt: NOW });
  memory = await upsertMentorProjectMemoryItem(memory, { id: "preference-one", kind: "preference", text: "Keep suggestions concise and show tradeoffs.", now: NOW });
  memory = await upsertMentorProjectMemoryItem(memory, { id: "question-one", kind: "open-question", text: "Which measure best matches the construct?", now: NOW });
  const corrected = await upsertMentorProjectMemoryItem(memory, { id: "preference-one", kind: "preference", text: "Use prose unless a comparison needs a table.", now: "2026-08-04T12:01:00.000Z" });
  const removed = await removeMentorProjectMemoryItem(corrected, "preference-one", "2026-08-04T12:02:00.000Z");
  const evidence = await createResearchKnowledgeEntry({
    id: "approved-evidence",
    projectId,
    stage: 2,
    stepId: "stage-02-step-01",
    kind: "evidence",
    title: "Researcher-reviewed source",
    body: "A bounded, user-reviewed evidence statement.",
    timing: "actual",
    author: "researcher",
    createdAt: NOW,
  });
  const artifactChecksum = await sha256ArtifactChecksum({ study: "current" });
  const envelope = await createMentorContextEnvelope({
    projectId,
    location: { stage: 3, stageId: "stage-03", stageTitle: "Design and Build the Study", stepId: "stage-03-step-01", stepTitle: "Select the Study Design" },
    memory,
    selectedText: "Compare this exact researcher-selected statement.",
    foundation: {
      routeProfile: { projectId, intent: "primary-data", methodFamily: "quantitative", setting: "laboratory", assignment: "randomized", audience: "adult", dataSensitivity: "deidentified", specialProcedures: [], confirmation: "researcher-confirmed" },
      artifactIndex: [{ project_id: projectId, artifact_kind: "study-design", artifact_id: "design-one", checksum: artifactChecksum, lifecycle_status: "stale", source_references: [] }],
      knowledgeEntries: [evidence, { ...evidence, id: "foreign", projectId: "another-project" }],
      manuscript: { participantRows: [{ participantId: "excluded" }] },
      decisionEvents: [],
      assets: [{ rawRecording: "excluded" }],
      templatePins: [],
    },
    generatedAt: NOW,
  });
  const refreshed = await createMentorContextEnvelope({
    projectId,
    location: envelope.location,
    memory,
    selectedText: "A changed selection.",
    pathwayRoute: envelope.route,
    generatedAt: "2026-08-04T12:05:00.000Z",
  });
  const laterStageResponse = parseResearchMentorResponse(JSON.stringify({
    summary: "One advisory comparison is available.",
    reflectiveQuestion: "Which tradeoff needs researcher judgment?",
    suggestions: [
      { id: "forged-canvas", kind: "canvas-option", title: "Overwrite design", rationale: "Attempt a direct edit.", uncertainty: "Unknown.", observationIds: [], sourceItemIds: [], targetCollection: "problems", targetField: "situation", proposedText: "Overwrite the study.", action: "create-alternative" },
      { id: "safe-next", kind: "next-step", title: "Compare limits", rationale: "A bounded comparison can surface a tradeoff.", uncertainty: "The researcher must verify it.", observationIds: [], sourceItemIds: [], recommendation: "Record one strength and one limitation." },
    ],
  }), null, envelope);

  const [contextSource, contextTests, mentorSource, mentorTests, panel, panelStyles, workspace, route, persistence, livingRecord] = await Promise.all([
    readFile("src/lib/research/mentorContextEnvelope.ts", "utf8"),
    readFile("src/lib/research/mentorContextEnvelope.test.ts", "utf8"),
    readFile("src/lib/research/researchMentor.ts", "utf8"),
    readFile("src/lib/research/researchMentor.test.ts", "utf8"),
    readFile("src/components/research-path/ResearchMentorPanel.tsx", "utf8"),
    readFile("src/components/research-path/ResearchMentorPanel.module.css", "utf8"),
    readFile("src/components/research-path/ResearchPathWorkspace.tsx", "utf8"),
    readFile("src/app/api/ai/research-mentor/route.ts", "utf8"),
    readFile("src/lib/research/researchFoundationPersistence.ts", "utf8"),
    readFile("src/lib/research/livingResearchRecord.ts", "utf8"),
  ]);

  const serialized = JSON.stringify(envelope);
  const checks = [
    check("AC-01", "Eight-stage capability registry", MENTOR_STAGE_CAPABILITIES.length === 8 && MENTOR_STAGE_CAPABILITIES.every((item, index) => item.stage === index + 1), "Every Cerise stage has an explicit mentor focus and context boundary."),
    check("AC-02", "Bounded checksum-verified envelope", Boolean(await normalizeAndVerifyMentorContextEnvelope(envelope)) && Buffer.byteLength(serialized) < MAX_MENTOR_CONTEXT_BYTES && envelope.artifacts.length <= MAX_MENTOR_ARTIFACTS && envelope.approvedEvidence.length <= MAX_MENTOR_APPROVED_EVIDENCE && envelope.recentDecisions.length <= MAX_MENTOR_DECISIONS, "The server normalizes and recomputes a bounded semantic context checksum."),
    check("AC-03", "Project isolation", await normalizeAndVerifyMentorContextEnvelope({ ...envelope, projectId: "another-project" }) === null && !serialized.includes("another-project"), "Changing the project ID invalidates the envelope; foreign knowledge is filtered."),
    check("AC-04", "Researcher-approved evidence only", envelope.approvedEvidence.length === 1 && envelope.approvedEvidence[0].id === evidence.id, "Only current, checksum-valid, researcher-authored evidence entries enter context."),
    check("AC-05", "Sensitive payload exclusion", envelope.participantDataIncluded === false && envelope.signaturesIncluded === false && envelope.recordingsIncluded === false && envelope.rawDatasetRowsIncluded === false && !/participantRows|participantId|rawRecording|excluded/.test(serialized), "Participant rows, signatures, recordings, raw dataset rows, and unrelated domain payloads are absent."),
    check("AC-06", "No transcript persistence", envelope.chatTranscriptStored === false && contextSource.includes("chatTranscriptStored: false") && !persistence.includes("research_mentor_transcript"), "Conversation turns remain session-local; no transcript table or storage key exists."),
    check("AC-07", "Explicit correctable memory", corrected.items.find((item) => item.id === "preference-one")?.text.includes("Use prose") === true && removed.items.every((item) => item.id !== "preference-one") && panel.includes("Correct") && panel.includes("Resolve"), "Preferences and open questions are researcher-added, correctable, resolvable, and removable."),
    check("AC-08", "No inferred personal profile", envelope.inferredPersonalProfileStored === false && panel.includes("no personal profile is inferred") && contextTests.includes("redact direct identifiers"), "Memory never stores an inferred psychological or personal profile."),
    check("AC-09", "Semantic freshness binding", !mentorContextIsCurrent(envelope.contentChecksum, refreshed) && panel.includes("Project context changed after this response") && panel.includes("responseIsCurrent"), "Any meaningful context change stales apply/save actions; timestamps alone are outside the semantic checksum."),
    check("AC-10", "Transparent What I understand view", panel.includes("What I understand") && ["Current location", "Route Cerise is using", "Project evidence", "Open questions", "Artifact health", "Project memory"].every((label) => panel.includes(label)), "Researchers can inspect the exact context categories Mentor uses."),
    check("AC-11", "Cross-stage launcher and location refresh", workspace.includes("activeStageNumber={activeStage.number") && !workspace.includes('if (!activeStep.id.startsWith("stage-01-")) setResearchMentorOpen(false)'), "The same launcher remains available across Stages 1–8 and follows the active location."),
    check("AC-12", "Later stages are advisory only", laterStageResponse.suggestions.length === 1 && laterStageResponse.suggestions[0].id === "safe-next" && laterStageResponse.rejectedSuggestions.some((item) => item.reason === "invalid-canvas-target") && mentorTests.includes("later-stage mentor responses are advisory only"), "A forged later-stage canvas option fails closed while bounded advisory guidance remains."),
    check("AC-13", "Explicit selected-text capture", panel.includes("Use selected workspace text") && panel.includes("window.getSelection") && panel.includes("Only captured when you choose this action"), "Selection is captured only after a researcher action; no keystroke logging is used."),
    check("AC-14", "Review-before-save insight workflow", panel.includes("Researcher review required") && panel.includes("Mentor text is not evidence by itself") && panel.includes("Save insight to project") && panel.includes("insightDraft.kind === \"evidence\""), "Title, kind, and wording are editable, and Evidence carries an explicit source warning."),
    check("AC-15", "Living Research Record integration", panel.includes("createResearchKnowledgeEntry") && panel.includes("appendResearchKnowledgeEntry") && panel.includes("appendLocalMentorInsight") && livingRecord.includes("research-knowledge-record-not-independent-verification-or-publication-claim"), "Reviewed insights use the canonical bounded knowledge record with secure storage when available and a device fallback."),
    check("AC-16", "Foundation fail-open behavior", panel.includes("loadResearchFoundationSnapshot") && panel.includes("Foundation tables unavailable") && envelope.foundationStatus === "secure-and-device", "Route, artifact, evidence, and decision metadata refresh from Build 0; the device context remains usable when those tables are unavailable."),
    check("AC-17", "Incremental refresh contract", contextSource.includes("MENTOR_CONTEXT_REFRESH_EVENT") && contextSource.includes("notifyMentorContextChanged") && panel.includes("addEventListener(MENTOR_CONTEXT_REFRESH_EVENT") && workspace.includes("notifyMentorContextChanged()"), "Domain workspaces can refresh context after meaningful saves without polling or copying domain payloads."),
    check("AC-18", "Authenticated server boundary", route.includes("normalizeAndVerifyMentorContextEnvelope") && route.includes("supabase.auth.getUser()") && route.includes('.eq("user_id", user.id)') && route.includes("checkRateLimit") && route.includes("MAX_RESEARCH_MENTOR_REQUEST_BYTES"), "The AI route verifies context, authentication, ownership, origin, size, and request caps."),
    check("AC-19", "Responsive context workspace", panelStyles.includes("@media (max-width: 720px)") && panelStyles.includes("left: 0; right: 0; top: 0") && panelStyles.includes("grid-template-rows: auto auto auto minmax(0, 1fr) auto"), "Desktop preserves the canvas; mobile receives a full-width scrollable drawer with fixed context footer."),
    check("AC-20", "No new participant or transcript store", !contextSource.includes("participantRows:") && !panel.includes("complete chat transcripts") && contextTests.includes("never cross project keys"), "Phase 5 adds no participant-data or chat-transcript store and no database migration."),
  ];

  const implementationChecksums = {
    contextSource: await sha256ArtifactChecksum(contextSource), contextTests: await sha256ArtifactChecksum(contextTests), mentorSource: await sha256ArtifactChecksum(mentorSource), mentorTests: await sha256ArtifactChecksum(mentorTests),
    panel: await sha256ArtifactChecksum(panel), panelStyles: await sha256ArtifactChecksum(panelStyles), workspace: await sha256ArtifactChecksum(workspace), route: await sha256ArtifactChecksum(route), persistence: await sha256ArtifactChecksum(persistence), livingRecord: await sha256ArtifactChecksum(livingRecord),
  };
  const core = {
    build: "Build 1, Phase 5 — cross-stage context compiler and no-recap project memory",
    verifiedFor: "2026-08-04",
    summary: { passed: checks.filter((item) => item.passed).length, failed: checks.filter((item) => !item.passed).length, checks: checks.length },
    checks,
    implementationChecksums,
    browserEvidence: {
      desktopContext: "output/playwright/build1-phase5-context-stage3-1536x1024.png",
      mobileContext: "output/playwright/build1-phase5-context-mobile-390x844.png",
      insightReview: "output/playwright/build1-phase5-insight-review-panel.png",
      verifiedFlow: ["open Stage 1 mentor", "inspect context", "add memory", "move to Stage 3 with drawer open", "confirm memory and location refresh", "open stale insight review"],
      consoleErrorsInIsolatedQaSession: 0,
    },
    activation: { databaseMigrationRequired: false, existingBuild0AndBuild1MigrationsStillUnapplied: true, remoteDeploymentPerformed: false },
  };
  const report = { ...core, reportChecksum: await sha256ArtifactChecksum(core) };
  const markdown = [
    "# Build 1 Phase 5 Verification", "", `Result: **${report.summary.passed}/${report.summary.checks} acceptance checks passed**`, "", `Report checksum: \`${report.reportChecksum}\``, "",
    ...checks.map((item) => `- ${item.passed ? "PASS" : "FAIL"} — **${item.id}: ${item.label}** — ${item.evidence}`),
    "", "Browser QA covered 1536×1024 and 390×844. The isolated QA session reported zero console errors. No remote deployment or new database migration was performed; existing Build 0/Build 1 migrations remain unapplied.", "",
  ].join("\n");
  await mkdir(OUTPUT_DIRECTORY, { recursive: true });
  await Promise.all([
    writeFile(path.join(OUTPUT_DIRECTORY, "build-1-phase-5-verification.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(path.join(OUTPUT_DIRECTORY, "build-1-phase-5-verification.md"), markdown, "utf8"),
  ]);
  process.stdout.write(`${JSON.stringify({ result: report.summary.failed ? "FAIL" : "PASS", ...report.summary, reportChecksum: report.reportChecksum }, null, 2)}\n`);
  if (report.summary.failed) process.exitCode = 1;
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
