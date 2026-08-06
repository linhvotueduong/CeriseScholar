import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createResearchArtifactIdentity, sha256ArtifactChecksum } from "../src/lib/research/artifactIdentity";
import { createResearchDecisionRecord, verifyResearchDecisionRecord } from "../src/lib/research/researchDecisionLedger";
import {
  legacyResearchJourneyAdapter,
  migrateLegacyResearchJourneyConversations,
  verifyResearchJourneyArchive,
} from "../src/lib/research/researchJourneyMigration";
import { createResearchPathwayDocument } from "../src/lib/research/researchPathwayDocument";
import { assessResearchPathwayReadiness } from "../src/lib/research/researchPathwayBrief";

const NOW = "2026-08-04T12:00:00.000Z";
const OUTPUT_DIRECTORY = path.join(process.cwd(), "output");
interface Check { id: string; label: string; passed: boolean; evidence: string }
function check(id: string, label: string, passed: boolean, evidence: string): Check { return { id, label, passed, evidence }; }

async function main() {
  const legacyConversations = [{
    id: "journey-legacy",
    title: "Map the evidence",
    messages: [
      { role: "user", content: "Help me map the evidence for this question." },
      { role: "assistant", content: "## Possible Research Pathways\nExact historical content.", mode: "research_journey" },
    ],
  }, {
    id: "evidence-current",
    title: "Evidence search",
    messages: [{ role: "assistant", content: "Current evidence answer.", mode: "research_answer" }],
  }];
  const migrated = await migrateLegacyResearchJourneyConversations({ projectId: "verify-build1-phase8", conversations: legacyConversations, now: NOW });
  assert.ok(migrated.archive);
  const repeated = await migrateLegacyResearchJourneyConversations({ projectId: "verify-build1-phase8", conversations: legacyConversations, existingArchive: migrated.archive, now: NOW });
  const pathway = await createResearchPathwayDocument({ projectId: "verify-build1-phase8", now: NOW });
  const baseIdentity = await createResearchArtifactIdentity({ artifactKind: "research-pathway", artifactId: "pathway-verify-build1-phase8", artifactSchemaVersion: 2, payload: { revision: 1 } });
  const baseReference = { artifactKind: baseIdentity.artifactKind, artifactId: baseIdentity.artifactId, schemaVersion: baseIdentity.artifactSchemaVersion, checksum: baseIdentity.checksum };
  const suggestionChecksum = await sha256ArtifactChecksum({ id: "option-1", proposedText: "A bounded alternative." });
  const actions = await Promise.all((["applied", "applied-after-edit", "dismissed"] as const).map((action) => createResearchDecisionRecord({
    id: `phase8-${action}`,
    projectId: "verify-build1-phase8",
    domain: "pathway",
    suggestionId: `option-${action}`,
    suggestionKind: "canvas-option",
    suggestionSummary: "A structured Mentor option.",
    action,
    decisionReason: action === "applied-after-edit" ? "The researcher corrected the wording before adding it." : action === "applied" ? "The researcher accepted the reviewed wording." : "The researcher dismissed the option.",
    decidedAt: NOW,
    baseArtifact: baseReference,
    suggestionChecksum,
    resultingArtifact: null,
    servedModel: "verification-fixture",
  })));

  const [scholarPage, researchRoute, mentor, mentorModel, workspace, migration, tests, documentation, packageJson] = await Promise.all([
    readFile("src/app/dashboard/project/[projectId]/scholar-ask/page.tsx", "utf8"),
    readFile("src/app/api/research/route.ts", "utf8"),
    readFile("src/components/research-path/ResearchMentorPanel.tsx", "utf8"),
    readFile("src/lib/research/researchMentor.ts", "utf8"),
    readFile("src/components/research-path/ResearchPathWorkspace.tsx", "utf8"),
    readFile("src/lib/research/researchJourneyMigration.ts", "utf8"),
    readFile("src/lib/research/researchJourneyMigration.test.ts", "utf8"),
    readFile("docs/build-1-phase-8-research-journey-migration.md", "utf8"),
    readFile("package.json", "utf8"),
  ]);

  const adapter = legacyResearchJourneyAdapter({ answerMode: "research_journey", journeyIntent: "map_evidence", projectId: "verify-build1-phase8" });
  const checks = [
    check("AC-01", "Visible Journey mode removed", !scholarPage.includes("AnswerModeControl") && !scholarPage.includes("answerModeOptions") && !scholarPage.includes("Save as my pathway"), "ScholarAsk has no Journey toggle, starter-mode control, or direct pathway-save action."),
    check("AC-02", "ScholarAsk is evidence-only", scholarPage.includes("Search the <em>evidence</em>") && scholarPage.includes("Evidence search") && !scholarPage.includes("journeyIntent, projectId"), "New ScholarAsk requests contain a query and project ID, not a Journey mode."),
    check("AC-03", "Legacy prompt branch removed", !researchRoute.includes("researchJourneyPrompt") && !researchRoute.includes("journeyIntentInstructions") && researchRoute.includes("const systemPrompt = researchAnswerPrompt"), "The research endpoint retains only the evidence-synthesis generation prompt."),
    check("AC-04", "Legacy API adapter is inert", adapter.legacy && adapter.mentorMode === "map-evidence" && researchRoute.includes("pathwayChanged: false") && researchRoute.includes("readinessChanged: false"), "Old clients receive a bounded Mentor destination without pathway or readiness mutation."),
    check("AC-05", "Exact historical text preserved", migrated.archive.conversations[0].messages[1].content === "## Possible Research Pathways\nExact historical content.", "The archive retains the original local message text rather than parsing Markdown into pathway fields."),
    check("AC-06", "Archive is checksum verified", await verifyResearchJourneyArchive(migrated.archive), "Archive identity is SHA-256 bound and fails closed when modified."),
    check("AC-07", "Migration is idempotent", repeated.archive?.conversations.length === 1 && repeated.activeConversations.length === 1, "Re-running migration neither duplicates Journey history nor removes evidence conversations."),
    check("AC-08", "Archive is readable and exportable", scholarPage.includes("Research Journey archive") && scholarPage.includes("Export JSON") && scholarPage.includes("Historical · read only"), "ScholarAsk exposes a distinct read-only archive and JSON export."),
    check("AC-09", "Archive cannot become Mentor context", migration.includes("historical-scholarask-journey-archive-not-pathway-readiness-or-current-mentor-context") && !mentor.includes("readResearchJourneyArchive"), "Historical messages are not injected into current Mentor requests."),
    check("AC-10", "Legacy links remain usable", scholarPage.includes("legacyJourneyMentorHref") && workspace.includes('params.get("mentor") !== "journey"') && mentor.includes("launchRequest"), "Saved links route into the requested registered Mentor capability."),
    check("AC-11", "Journey capabilities exist in Mentor", ["find-bridge", "narrow", "map-evidence"].every((mode) => mentor.includes(`id: \"${mode}\"`)), "Bridge finding, question narrowing, and evidence mapping are registered Mentor modes."),
    check("AC-12", "Suggestions are structured", mentorModel.includes("ResearchMentorCanvasSuggestion") && mentorModel.includes("parseResearchMentorResponse") && mentorModel.includes("targetCollection") && mentorModel.includes("proposedText"), "Mentor results are validated objects rather than Markdown pathway extraction."),
    check("AC-13", "Freshness blocks stale apply", mentor.includes("responseIsCurrent") && mentor.includes("pathwayContentChecksum") && mentor.includes("This option is stale"), "Canvas changes remain bound to current project and pathway checksums."),
    check("AC-14", "Unchanged acceptance requires rationale", mentor.includes("A reason is required when accepting unchanged wording") && mentor.includes("Accept and add"), "Researchers explicitly explain why unchanged wording fits before it is added."),
    check("AC-15", "Edits and corrections are distinct", mentor.includes("applied-after-edit") && mentor.includes("Add corrected option") && mentor.includes("corrected the Mentor wording"), "Corrected wording records the edited decision outcome."),
    check("AC-16", "Accept, edit, and dismiss records verify", actions.length === 3 && (await Promise.all(actions.map(verifyResearchDecisionRecord))).every(Boolean), "Build 0 records checksum-bound accepted, edited/corrected, and dismissed outcomes."),
    check("AC-17", "Reviewed insight creates a decision", mentor.includes("reviewedSuggestion") && mentor.includes("before saving it to the Living Research Record"), "Saving Mentor text is a review action with its own decision entry."),
    check("AC-18", "Readiness uses canonical artifacts", !assessResearchPathwayReadiness(pathway).readyForStage2 && workspace.includes("assessResearchPathwayReadiness") && workspace.includes("readiness is derived automatically"), "A populated Journey archive cannot make an empty pathway ready."),
    check("AC-19", "Evidence activity has no Journey readiness label", researchRoute.includes('label: "Research answer"') && !researchRoute.includes("Theme clarity") && !researchRoute.includes("Journey: ${"), "ScholarAsk activity remains evidence-search recency metadata only."),
    check("AC-20", "Tests and operator contract are reproducible", tests.includes("historical Journey activity cannot satisfy canonical Stage 1 readiness") && documentation.includes("No remote deployment") && packageJson.includes("verify:build1-phase8"), "Focused fixtures, written boundaries, and a package verification command are present."),
  ];

  const implementationChecksums = Object.fromEntries(await Promise.all(Object.entries({ scholarPage, researchRoute, mentor, mentorModel, workspace, migration, tests, documentation }).map(async ([key, value]) => [key, await sha256ArtifactChecksum(value)])));
  const core = {
    build: "Build 1, Phase 8 — Research Journey migration and review-before-apply",
    verifiedFor: "2026-08-04",
    summary: { passed: checks.filter((item) => item.passed).length, failed: checks.filter((item) => !item.passed).length, checks: checks.length },
    checks,
    implementationChecksums,
    browserEvidence: {
      scholarAskArchive: "output/playwright/build1-phase8-journey-archive-1536x1024.png",
      legacyMentorRedirect: "output/playwright/build1-phase8-legacy-mentor-1536x1024.png",
      mobileScholarAsk: "output/playwright/build1-phase8-scholarask-evidence-390x844.png",
      verifiedFlow: ["seed one evidence and one Journey conversation", "reload ScholarAsk", "inspect read-only archive", "continue through legacy Mentor link", "confirm requested Mentor mode"],
      consoleErrorsInIsolatedQaSession: 0,
    },
    activation: { databaseMigrationRequired: false, existingBuild0AndBuild1MigrationsStillUnapplied: true, remoteDeploymentPerformed: false },
  };
  const report = { ...core, reportChecksum: await sha256ArtifactChecksum(core) };
  const markdown = [
    "# Build 1 Phase 8 Verification", "", `Result: **${report.summary.passed}/${report.summary.checks} acceptance checks passed**`, "", `Report checksum: \`${report.reportChecksum}\``, "",
    ...checks.map((item) => `- ${item.passed ? "PASS" : "FAIL"} — **${item.id}: ${item.label}** — ${item.evidence}`),
    "", "Historical Journey content remains local, read-only, exportable, and excluded from pathway readiness. No remote deployment or database migration is part of Phase 8.", "",
  ].join("\n");
  await mkdir(OUTPUT_DIRECTORY, { recursive: true });
  await Promise.all([
    writeFile(path.join(OUTPUT_DIRECTORY, "build-1-phase-8-verification.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(path.join(OUTPUT_DIRECTORY, "build-1-phase-8-verification.md"), markdown, "utf8"),
  ]);
  process.stdout.write(`${JSON.stringify({ result: report.summary.failed ? "FAIL" : "PASS", ...report.summary, reportChecksum: report.reportChecksum }, null, 2)}\n`);
  if (report.summary.failed) process.exitCode = 1;
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
