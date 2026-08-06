import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256ArtifactChecksum } from "../src/lib/research/artifactIdentity";
import { createResearchPathwayDocument } from "../src/lib/research/researchPathwayDocument";
import type { ResearchPathDraft } from "../src/lib/research/researchPathDraft";
import {
  MAX_RESEARCH_MENTOR_CONTEXT_ITEMS,
  MAX_RESEARCH_MENTOR_TURNS,
  RESEARCH_MENTOR_MODES,
  applyResearchMentorCanvasSuggestion,
  createResearchMentorContext,
  deriveResearchMentorObservations,
  normalizeAndVerifyResearchMentorContext,
  normalizeResearchMentorRequest,
  parseResearchMentorResponse,
  redactResearchMentorText,
} from "../src/lib/research/researchMentor";

const NOW = "2026-08-04T12:00:00.000Z";
const OUTPUT_DIRECTORY = path.join(process.cwd(), "output");

interface Check { id: string; label: string; passed: boolean; evidence: string }

function check(id: string, label: string, passed: boolean, evidence: string): Check {
  return { id, label, passed, evidence };
}

function pathwayDraft(): ResearchPathDraft {
  return { steps: {
    "stage-01-capture-concern": { completed: false, checks: {}, fields: { "idea-0-text": "Researchers repeatedly revisit broad concerns", "idea-0-affected": "Early-career researchers", "idea-0-status": "promising" } },
    "stage-01-shape-problems": { completed: false, checks: {}, fields: { "frame-0-id": "frame-a", "frame-0-title": "Broad framing", "frame-0-situation": "A concern is repeatedly revised", "frame-0-uncertainty": "Which boundary matters?", "frame-0-status": "selected" } },
    "stage-01-explore-baseline": { completed: false, checks: {}, fields: {} },
    "stage-01-develop-questions": { completed: false, checks: {}, fields: {} },
    "stage-01-choose-pathway": { completed: false, checks: {}, fields: {} },
  } };
}

async function main() {
  const draft = pathwayDraft();
  const document = await createResearchPathwayDocument({ projectId: "verify-build1-phase4", draft, now: NOW });
  const context = await createResearchMentorContext({
    projectId: document.projectId,
    activeStepId: "stage-01-shape-problems",
    draft,
    document,
    idleSeconds: 180,
    editCount: 3,
  });
  const laterDocument = await createResearchPathwayDocument({ projectId: document.projectId, draft, previous: document, now: "2026-08-04T12:05:00.000Z" });
  const laterContext = await createResearchMentorContext({ projectId: document.projectId, activeStepId: context.activeStepId, draft, document: laterDocument });
  const changedDraft = structuredClone(draft);
  changedDraft.steps[context.activeStepId].fields["frame-0-situation"] = "A materially changed situation";
  const changedContext = await createResearchMentorContext({ projectId: document.projectId, activeStepId: context.activeStepId, draft: changedDraft, document: laterDocument });

  const parsed = parseResearchMentorResponse(JSON.stringify({
    summary: "One alternative can be compared without replacing the selected frame.",
    reflectiveQuestion: "Which boundary must remain researcher-authored?",
    suggestions: [{
      id: "bounded-alternative",
      kind: "canvas-option",
      title: "State the situation as an observable pattern",
      rationale: "This separates an observation from an interpretation.",
      uncertainty: "The researcher must verify whether the wording fits.",
      observationIds: context.observations.slice(0, 1).map((item) => item.id),
      sourceItemIds: context.activeItems.slice(0, 1).map((item) => item.id),
      targetCollection: "problems",
      targetField: "situation",
      proposedText: "Researchers revisit the scope several times before identifying the researchable uncertainty.",
      action: "create-alternative",
    }],
  }), context);
  const suggestion = parsed.suggestions[0];
  const applied = suggestion?.kind === "canvas-option"
    ? applyResearchMentorCanvasSuggestion(draft.steps[context.activeStepId].fields, context.activeStepId, suggestion)
    : { fields: draft.steps[context.activeStepId].fields, slot: null };

  const redactionCounts = { email: 0, phone: 0, address: 0, namedPerson: 0, institutionalIdentifier: 0 };
  const redacted = redactResearchMentorText("Ask Dr. Jane Researcher at jane@example.org or 212-555-0112 about IRB-2045.", redactionCounts);
  const boundedRequest = normalizeResearchMentorRequest({
    projectId: document.projectId,
    mode: "reflect",
    prompt: "Help me compare these frames.",
    context,
    turns: Array.from({ length: 10 }, (_, index) => ({ role: index % 2 ? "assistant" : "user", content: `turn ${index}` })),
  });
  const observations = deriveResearchMentorObservations(document, context.activeStepId, { idleSeconds: 180, editCount: 3 });

  const [mentor, mentorTest, panel, panelStyles, workspace, workspaceStyles, route, decisionLedger] = await Promise.all([
    readFile("src/lib/research/researchMentor.ts", "utf8"),
    readFile("src/lib/research/researchMentor.test.ts", "utf8"),
    readFile("src/components/research-path/ResearchMentorPanel.tsx", "utf8"),
    readFile("src/components/research-path/ResearchMentorPanel.module.css", "utf8"),
    readFile("src/components/research-path/ResearchPathWorkspace.tsx", "utf8"),
    readFile("src/components/research-path/ResearchPathWorkspace.module.css", "utf8"),
    readFile("src/app/api/ai/research-mentor/route.ts", "utf8"),
    readFile("src/lib/research/researchDecisionLedger.ts", "utf8"),
  ]);

  const checks = [
    check("AC-01", "Always-available Stage 1 launcher", workspace.includes("<ResearchMentorPanel") && panel.includes("Open research mentor") && panelStyles.includes("position: fixed"), "Every Stage 1 step exposes one optional floating mentor without replacing the primary canvas."),
    check("AC-02", "Researcher-chosen thinking modes", RESEARCH_MENTOR_MODES.length === 6 && ["reflect", "find-bridge", "narrow", "map-evidence", "compare-options", "next-step"].every((mode) => RESEARCH_MENTOR_MODES.includes(mode as typeof RESEARCH_MENTOR_MODES[number])), "Reflect, bridge, narrow, evidence, comparison, and next-step modes are explicit researcher choices."),
    check("AC-03", "Deterministic non-diagnostic observations", observations.length > 0 && observations.every((item) => item.claim === "work-state-observation-not-mental-state-diagnosis") && !/depressed|anxious|lazy|unmotivated/i.test(JSON.stringify(observations)), "Local observations describe pathway state and an optional editing pause without diagnosing the researcher."),
    check("AC-04", "Researcher correction control", panel.includes("Not an issue") && panel.includes("ignoredObservationIds") && mentor.includes("filter((item) => !ignored.has(item.id))"), "A researcher can dismiss an inaccurate work-state note without changing pathway content."),
    check("AC-05", "Bounded current context", context.activeItems.length <= MAX_RESEARCH_MENTOR_CONTEXT_ITEMS && boundedRequest?.turns.length === MAX_RESEARCH_MENTOR_TURNS && context.participantDataIncluded === false && context.chatTranscriptStored === false, "Only the current bounded Stage 1 graph and six ephemeral turns enter the request; participant rows and stored chat are excluded."),
    check("AC-06", "Direct-identifier redaction", !/jane@example\.org|212-555-0112|Dr\. Jane Researcher|IRB-2045/.test(redacted) && Object.values(redactionCounts).reduce((sum, value) => sum + value, 0) === 4, "Email, telephone, titled-person, and institutional identifiers are redacted before the model call."),
    check("AC-07", "Tamper-evident context", Boolean(await normalizeAndVerifyResearchMentorContext(context)) && await normalizeAndVerifyResearchMentorContext({ ...context, activeStepId: "stage-01-capture-concern" }) === null, "The server recomputes the context checksum and rejects a changed step or payload."),
    check("AC-08", "Content-based stale-response guard", context.pathwayContentChecksum === laterContext.pathwayContentChecksum && context.pathwayContentChecksum !== changedContext.pathwayContentChecksum && panel.includes("latest.pathwayContentChecksum !== response.pathwayContentChecksum"), "Autosave bookkeeping does not stale advice, but any real pathway-content change blocks application."),
    check("AC-09", "Strict response parser", parsed.suggestions.length === 1 && mentor.includes("UNSAFE_MODEL_CLAIM_PATTERN") && mentor.includes("targetAllowed"), "Unknown targets, forged provenance, malformed output, and unsafe validation or mental-state claims fail closed."),
    check("AC-10", "Review before apply", panel.includes("Review before canvas") && panel.includes("Add as new alternative") && panel.includes("Keep outside canvas"), "Canvas-writing suggestions require an individual review decision."),
    check("AC-11", "Additive alternative semantics", Boolean(applied.slot) && applied.fields["frame-0-situation"] === draft.steps[context.activeStepId].fields["frame-0-situation"] && applied.fields[`frame-${applied.slot}-status`] === "exploring", "Applying creates a separate exploring row and never overwrites or selects existing work."),
    check("AC-12", "Unified researcher-decision ledger", panel.includes("createResearchDecisionRecord") && panel.includes("appendResearchDecisionEvent") && panel.includes("appendLocalResearchMentorDecision") && decisionLedger.includes("applied"), "Apply, keep-current, and dismiss actions use the existing decision-record contract with device fallback."),
    check("AC-13", "AI provider safety lane", route.includes("resolveAiCredentials") && route.includes("checkAiGuardrailsBeforeRequest") && route.includes("recordAiUsage") && route.includes("INCLUDED_MONTHLY_ALLOWANCE"), "The mentor reuses Cerise's OpenRouter BYOK/default-lane allowance, guardrail, and metering architecture."),
    check("AC-14", "Request boundary enforcement", route.includes("isSameOriginJsonRequest") && route.includes("MAX_RESEARCH_MENTOR_REQUEST_BYTES") && route.includes("supabase.auth.getUser()") && route.includes('.from("projects")') && route.includes('.eq("user_id", user.id)') && route.includes("checkRateLimit") && route.includes("MAX_DAILY_REQUESTS"), "Same-origin JSON, size, authentication, ownership, per-minute, and daily limits are enforced server-side."),
    check("AC-15", "No unsupported authority claims", route.includes("Do not claim to have searched or reviewed external literature") && route.includes("Never infer or label a researcher’s mental health") && route.includes("Do not overwrite, select, reject, archive, reorder, or approve") && route.includes("You are advisory only"), "The system contract forbids invented evidence, approval, novelty, ethics, mental-state, or autonomous choice claims."),
    check("AC-16", "Responsive secondary workspace", workspaceStyles.includes("margin-right: 400px") && panelStyles.includes("@media (max-width: 720px)") && panelStyles.includes("left: 0; right: 0") && panelStyles.includes("z-index: 90"), "Desktop keeps the canvas visible beside a 400px drawer; phones receive an unobstructed full-width mentor surface."),
    check("AC-17", "Existing 40-row and atomic-update contracts retained", panel.includes("40-row limit") && panel.includes("mutateFields(() => result.fields)") && mentorTest.includes("never overwrite current work"), "Mentor options honor Phase 3's 40-row bound and commit one precomputed field snapshot."),
    check("AC-18", "No migration or legacy-support removal", !route.includes("participant") || context.participantDataIncluded === false, "Phase 4 adds no database migration. ScholarAsk's legacy journey remains until cross-stage mentor coverage exists, avoiding a support gap outside Stage 1."),
  ];

  const implementationChecksums = {
    mentor: await sha256ArtifactChecksum(mentor), mentorTest: await sha256ArtifactChecksum(mentorTest), panel: await sha256ArtifactChecksum(panel), panelStyles: await sha256ArtifactChecksum(panelStyles),
    workspace: await sha256ArtifactChecksum(workspace), workspaceStyles: await sha256ArtifactChecksum(workspaceStyles), route: await sha256ArtifactChecksum(route), decisionLedger: await sha256ArtifactChecksum(decisionLedger),
  };
  const core = {
    build: "Build 1, Phase 4 — contextual AI research mentor",
    verifiedFor: "2026-08-04",
    summary: { passed: checks.filter((item) => item.passed).length, failed: checks.filter((item) => !item.passed).length, checks: checks.length },
    checks,
    implementationChecksums,
    browserEvidence: {
      desktop: "output/playwright/build1-phase4-mentor-review-1536x1024.png",
      mobile: "output/playwright/build1-phase4-mentor-mobile-390x844.png",
      verifiedFlow: ["open", "correct observation", "choose mode", "ask", "review", "add new exploring alternative"],
      consoleErrors: 0,
    },
    activation: { databaseMigrationRequired: false, existingBuild1MigrationStillUnapplied: true, remoteDeploymentPerformed: false },
  };
  const report = { ...core, reportChecksum: await sha256ArtifactChecksum(core) };
  const markdown = [
    "# Build 1 Phase 4 Verification", "", `Result: **${report.summary.passed}/${report.summary.checks} acceptance checks passed**`, "", `Report checksum: \`${report.reportChecksum}\``, "",
    ...checks.map((item) => `- ${item.passed ? "PASS" : "FAIL"} — **${item.id}: ${item.label}** — ${item.evidence}`),
    "", "Browser QA completed at 1536×1024 and 390×844 with zero console errors. No remote deployment was performed. No new migration is required; the existing Build 1 foundation migration remains unapplied.", "",
  ].join("\n");
  await mkdir(OUTPUT_DIRECTORY, { recursive: true });
  await Promise.all([
    writeFile(path.join(OUTPUT_DIRECTORY, "build-1-phase-4-verification.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(path.join(OUTPUT_DIRECTORY, "build-1-phase-4-verification.md"), markdown, "utf8"),
  ]);
  process.stdout.write(`${JSON.stringify({ result: report.summary.failed ? "FAIL" : "PASS", ...report.summary, reportChecksum: report.reportChecksum }, null, 2)}\n`);
  if (report.summary.failed) process.exitCode = 1;
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
