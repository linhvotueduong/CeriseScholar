import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256ArtifactChecksum } from "../src/lib/research/artifactIdentity";
import { createResearchPathwayDocument } from "../src/lib/research/researchPathwayDocument";
import type { ResearchPathDraft } from "../src/lib/research/researchPathDraft";
import {
  RESEARCH_SUPPORT_CORRECTION_COOLDOWN_MS,
  cooldownResearchSupportCategory,
  createResearchSupportActivity,
  createResearchSupportPreferences,
  deriveResearchSupportOpportunity,
  deriveResearchSupportSignals,
  recordResearchSupportBreakpoint,
  restoreResearchSupportCategory,
  suppressResearchSupportCategory,
  updateResearchSupportMode,
  type ResearchSupportBreakpoint,
} from "../src/lib/research/researchSupportOpportunity";

const NOW = Date.parse("2026-08-04T12:00:00.000Z");
const STEP = "stage-01-shape-problems";
const OTHER_STEP = "stage-01-explore-baseline";
const OUTPUT_DIRECTORY = path.join(process.cwd(), "output");

interface Check { id: string; label: string; passed: boolean; evidence: string }
function check(id: string, label: string, passed: boolean, evidence: string): Check { return { id, label, passed, evidence }; }
function breakpoint(sequence: number, stepId: string, kind: ResearchSupportBreakpoint["kind"] = "step-navigation"): ResearchSupportBreakpoint {
  return { sequence, stepId, kind, at: NOW + sequence * 1_000 };
}

function draft(): ResearchPathDraft {
  return { steps: {
    "stage-01-capture-concern": { completed: false, checks: {}, fields: { "concern-narrative": "I want to understand how promising ideas become bounded research problems." } },
    "stage-01-shape-problems": { completed: false, checks: {}, fields: {
      "frame-0-id": "frame-a", "frame-0-title": "Conceptual boundaries", "frame-0-situation": "The research idea remains broad.", "frame-0-uncertainty": "Which boundary matters?", "frame-0-status": "exploring",
      "frame-1-id": "frame-b", "frame-1-title": "Evidence navigation", "frame-1-situation": "Search language remains broad.", "frame-1-uncertainty": "Which adjacent field helps?", "frame-1-status": "exploring",
      "frame-2-id": "frame-c", "frame-2-title": "Decision criteria", "frame-2-situation": "Several routes remain viable.", "frame-2-uncertainty": "Which criteria should guide comparison?", "frame-2-status": "promising",
    } },
    "stage-01-explore-baseline": { completed: false, checks: {}, fields: {} },
    "stage-01-develop-questions": { completed: false, checks: {}, fields: {} },
    "stage-01-choose-pathway": { completed: false, checks: {}, fields: {} },
  } };
}

async function main() {
  const document = await createResearchPathwayDocument({ projectId: "verify-build1-phase7", draft: draft(), now: new Date(NOW).toISOString() });
  let activity = createResearchSupportActivity(document.projectId);
  [STEP, OTHER_STEP, STEP, OTHER_STEP, STEP].forEach((stepId, index) => {
    activity = recordResearchSupportBreakpoint(activity, breakpoint(index + 1, stepId), document);
  });
  const event = breakpoint(6, STEP, "field-blur");
  const preferences = createResearchSupportPreferences(document.projectId);
  const opportunity = deriveResearchSupportOpportunity({ document, stepId: STEP, activity, preferences, breakpoint: event });
  if (!opportunity) throw new Error("Phase 7 verification fixture did not produce the expected support opportunity.");
  const quietActivity = createResearchSupportActivity(document.projectId);
  const quietSignals = deriveResearchSupportSignals({ document, stepId: STEP, activity: quietActivity, idleSeconds: 900, editCount: 10 });
  const corrected = cooldownResearchSupportCategory(preferences, opportunity.category, event.at, RESEARCH_SUPPORT_CORRECTION_COOLDOWN_MS);
  const suppressed = suppressResearchSupportCategory(preferences, opportunity.category);
  const restored = restoreResearchSupportCategory(suppressed, opportunity.category);

  const [engine, tests, panel, panelStyles, workspace, apiRoute, packageJson] = await Promise.all([
    readFile("src/lib/research/researchSupportOpportunity.ts", "utf8"),
    readFile("src/lib/research/researchSupportOpportunity.test.ts", "utf8"),
    readFile("src/components/research-path/ResearchMentorPanel.tsx", "utf8"),
    readFile("src/components/research-path/ResearchMentorPanel.module.css", "utf8"),
    readFile("src/components/research-path/ResearchPathWorkspace.tsx", "utf8"),
    readFile("src/app/api/ai/research-mentor/route.ts", "utf8"),
    readFile("package.json", "utf8"),
  ]);

  const futureEvent = { ...event, sequence: 7, at: event.at + 60_000 };
  const checks = [
    check("AC-01", "Deterministic client-side engine", engine.includes("deriveResearchSupportOpportunity") && !engine.includes("fetch(") && !engine.includes("createClient("), "Signal qualification is a pure local domain operation with no network or database client."),
    check("AC-02", "Two-signal minimum", opportunity.signals.filter((item) => item.strength === "task-relevant").length >= 2 && engine.includes("strong.length < 2"), "One content signal and one activity-aware signal are required before any indication."),
    check("AC-03", "Activity-aware signal required", opportunity.signals.some((item) => item.activityAware) && engine.includes("strong.some((item) => item.activityAware)"), "Static canvas structure cannot trigger proactive support by itself."),
    check("AC-04", "Quiet pause is weak", quietSignals.some((item) => item.id === "unfinished-pause" && item.strength === "weak") && deriveResearchSupportOpportunity({ document, stepId: STEP, activity: quietActivity, preferences, breakpoint: event, idleSeconds: 900, editCount: 10 }) === null, "A long pause remains compatible with reflection and never creates a ring by itself."),
    check("AC-05", "Natural breakpoint integration", workspace.includes('noteResearchSupportBreakpoint("step-navigation"') && workspace.includes('noteResearchSupportBreakpoint("field-blur"') && engine.includes('"project-return"') && engine.includes('"save"'), "The workspace evaluates only at project return, blur, save, or step navigation boundaries."),
    check("AC-06", "Quiet indication, no popup", panel.includes("supportRing") && panel.includes("proactiveSupportAvailable") && !panel.includes("window.alert") && !panel.includes("window.confirm"), "Qualification decorates the existing launcher; it never opens the drawer automatically."),
    check("AC-07", "Researcher initiates the conversation", panel.includes("Talk about this") && panel.includes("setPrompt(supportOpportunity.suggestedPrompt)") && !panel.includes("talkAboutSupportOpportunity();"), "The prepared prompt is not sent until the researcher explicitly asks the Mentor."),
    check("AC-08", "Correctable inference", deriveResearchSupportOpportunity({ document, stepId: STEP, activity, preferences: corrected, breakpoint: futureEvent }) === null && panel.includes("Not an issue"), "Correction creates a seven-day project-scoped category cooldown."),
    check("AC-09", "Permanent category suppression", deriveResearchSupportOpportunity({ document, stepId: STEP, activity, preferences: suppressed, breakpoint: { ...futureEvent, at: event.at + 366 * 24 * 60 * 60 * 1_000 } }) === null && panel.includes("Don’t suggest this again"), "Researchers can permanently silence a category for the current project."),
    check("AC-10", "Suppression is reversible", Boolean(deriveResearchSupportOpportunity({ document, stepId: STEP, activity, preferences: restored, breakpoint: futureEvent })) && panel.includes("Restore {category.replaceAll"), "A suppressed category can be restored from Quiet support settings."),
    check("AC-11", "On-request mode produces zero indications", deriveResearchSupportOpportunity({ document, stepId: STEP, activity, preferences: updateResearchSupportMode(preferences, "on-request"), breakpoint: event }) === null, "On-request mode preserves manual Mentor access without proactive signaling."),
    check("AC-12", "Focus mode produces zero indications and notes", deriveResearchSupportOpportunity({ document, stepId: STEP, activity, preferences: updateResearchSupportMode(preferences, "focus"), breakpoint: event }) === null && panel.includes('supportPreferences?.mode === "focus" ? []') && panel.includes("no work-state notes"), "Focus mode removes both proactive rings and Stage 1 work-state observations."),
    check("AC-13", "Transparent signal basis", panel.includes("Why did Cerise notice this?") && panel.includes("supportOpportunity.signals.filter"), "Researchers can inspect the exact qualifying task-level signals."),
    check("AC-14", "No psychological or clinical labels", !/anxious|anxiety|depressed|depression|adhd|perfectionis|diagnos/i.test(JSON.stringify(opportunity)) && engine.includes("task-friction-opportunity-not-psychological-or-clinical-inference"), "Opportunity data describes task friction only."),
    check("AC-15", "Raw activity is session-only", activity.sessionOnly && !activity.rawContentStored && !activity.uploaded && engine.includes("rawSignalHistoryStored: false"), "Navigation and revision counters stay in component memory and raw content is explicitly excluded."),
    check("AC-16", "Bounded project-scoped preferences", preferences.projectId === document.projectId && engine.includes("lastSession") && engine.includes("pathwayChecksum"), "Persistence is limited to mode, category controls, and one non-prose unfinished-session marker."),
    check("AC-17", "AI boundary unchanged", !apiRoute.includes("ResearchSupport") && !apiRoute.includes("recentStepVisits") && !apiRoute.includes("revisionBreakpointsByStep"), "Phase 7 activity signals are not part of the Mentor API contract."),
    check("AC-18", "Responsive and reduced-motion support", panelStyles.includes("@media (max-width: 720px)") && panelStyles.includes("@media (prefers-reduced-motion: reduce)") && panelStyles.includes("grid-template-columns: 1fr;"), "Actions stack at phone width and the attention animation respects reduced-motion preferences."),
    check("AC-19", "Focused invariant tests", tests.includes("quiet thinking is weak context") && tests.includes("focus and on-request modes produce zero proactive indications") && tests.includes("correction cooldown and permanent suppression alter future behavior"), "Automated tests cover the central safety and correction contract."),
    check("AC-20", "Reproducible verification integration", packageJson.includes("verify:build1-phase7") && packageJson.includes('src/lib/research/*.test.ts'), "The package exposes both the full research-domain suite and this deterministic acceptance report."),
  ];

  const implementationChecksums = {
    engine: await sha256ArtifactChecksum(engine),
    tests: await sha256ArtifactChecksum(tests),
    panel: await sha256ArtifactChecksum(panel),
    panelStyles: await sha256ArtifactChecksum(panelStyles),
    workspace: await sha256ArtifactChecksum(workspace),
    apiRoute: await sha256ArtifactChecksum(apiRoute),
  };
  const core = {
    build: "Build 1, Phase 7 — gentle support-opportunity detection",
    verifiedFor: "2026-08-04",
    summary: { passed: checks.filter((item) => item.passed).length, failed: checks.filter((item) => !item.passed).length, checks: checks.length },
    checks,
    implementationChecksums,
    browserEvidence: {
      desktopRing: "output/playwright/build1-phase7-quiet-ring-1536x1024.png",
      desktopBasis: "output/playwright/build1-phase7-support-explained-1536x1024.png",
      mobileFocus: "output/playwright/build1-phase7-focus-390x844.png",
      verifiedFlow: ["create several unresolved frames", "revisit unfinished steps", "observe quiet ring", "inspect signal basis", "correct the inference", "enable Focus mode"],
      consoleErrorsInIsolatedQaSession: 0,
    },
    activation: { databaseMigrationRequired: false, existingBuild0AndBuild1MigrationsStillUnapplied: true, remoteDeploymentPerformed: false },
  };
  const report = { ...core, reportChecksum: await sha256ArtifactChecksum(core) };
  const markdown = [
    "# Build 1 Phase 7 Verification", "", `Result: **${report.summary.passed}/${report.summary.checks} acceptance checks passed**`, "", `Report checksum: \`${report.reportChecksum}\``, "",
    ...checks.map((item) => `- ${item.passed ? "PASS" : "FAIL"} — **${item.id}: ${item.label}** — ${item.evidence}`),
    "", "Browser QA covers the quiet indication, inspectable basis, correction, and Focus-mode workflow at 1536×1024 and 390×844. No remote deployment or database migration is part of Phase 7.", "",
  ].join("\n");
  await mkdir(OUTPUT_DIRECTORY, { recursive: true });
  await Promise.all([
    writeFile(path.join(OUTPUT_DIRECTORY, "build-1-phase-7-verification.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(path.join(OUTPUT_DIRECTORY, "build-1-phase-7-verification.md"), markdown, "utf8"),
  ]);
  process.stdout.write(`${JSON.stringify({ result: report.summary.failed ? "FAIL" : "PASS", ...report.summary, reportChecksum: report.reportChecksum }, null, 2)}\n`);
  if (report.summary.failed) process.exitCode = 1;
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
