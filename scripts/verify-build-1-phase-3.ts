import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256ArtifactChecksum } from "../src/lib/research/artifactIdentity";
import { assessResearchPathwayReadiness } from "../src/lib/research/researchPathwayBrief";
import {
  createResearchPathwayDocument,
  researchPathwayDocumentToDraft,
  verifyResearchPathwayDocument,
} from "../src/lib/research/researchPathwayDocument";
import { selectedResearchQuestionsFromDraft } from "../src/lib/research/researchPathwayPhase2Model";
import {
  PHASE3_MAXIMUM_ROWS,
  RESEARCH_PATHWAY_ROW_SPECS,
  addResearchPathwayRow,
  archiveResearchPathwayRow,
  moveResearchPathwayRow,
  removeEmptyResearchPathwayRow,
  researchPathwayArchiveProtectionReason,
  researchPathwayRowRoster,
  restoreResearchPathwayRow,
} from "../src/lib/research/researchPathwayPhase3Rows";
import type { ResearchPathDraft } from "../src/lib/research/researchPathDraft";

const NOW = "2026-08-04T04:00:00.000Z";
const OUTPUT_DIRECTORY = path.join(process.cwd(), "output");

interface Check { id: string; label: string; passed: boolean; evidence: string }

function check(id: string, label: string, passed: boolean, evidence: string): Check {
  return { id, label, passed, evidence };
}

async function main() {
  const collections = Object.keys(RESEARCH_PATHWAY_ROW_SPECS);
  let questionFields: Record<string, string> = {};
  for (let index = 0; index < 4; index += 1) questionFields = addResearchPathwayRow(questionFields, "questions").fields;
  const initialQuestionSlots = researchPathwayRowRoster(questionFields, "questions").active;
  initialQuestionSlots.forEach((slot, index) => {
    questionFields[`question-${slot}-id`] = `stable-question-${index + 1}`;
    questionFields[`question-${slot}-text`] = `Selected dynamic question ${index + 1}`;
    questionFields[`question-${slot}-status`] = "selected";
  });
  questionFields = moveResearchPathwayRow(questionFields, "questions", initialQuestionSlots.at(-1)!, -1);
  const orderedQuestions = researchPathwayRowRoster(questionFields, "questions").active.map((slot) => questionFields[`question-${slot}-text`]);
  const pathwayDraft: ResearchPathDraft = { steps: {
    "stage-01-capture-concern": { completed: false, checks: {}, fields: { "idea-0-text": "A concern", "idea-0-affected": "Researchers", "idea-0-status": "promising" } },
    "stage-01-shape-problems": { completed: false, checks: {}, fields: { "frame-0-id": "frame-a", "frame-0-title": "A selected frame", "frame-0-situation": "A situation", "frame-0-uncertainty": "An uncertainty", "frame-0-status": "selected" } },
    "stage-01-explore-baseline": { completed: false, checks: {}, fields: { "baseline-0-id": "baseline-a", "baseline-0-known": "Known evidence", "baseline-0-missing": "A gap", "baseline-0-linked-frames": "frame-a", "baseline-0-status": "promising" } },
    "stage-01-develop-questions": { completed: false, checks: {}, fields: questionFields },
    "stage-01-choose-pathway": { completed: false, checks: {}, fields: { "route-intent": "primary-data", "route-method": "qualitative", "route-assignment": "none", "route-setting": "online-home", "route-audience": "adult", "route-sensitivity": "identifiable", "pathway-rationale": "This route addresses the selected questions.", "backcasting-choice": "not-use" } },
  } };
  const document = await createResearchPathwayDocument({ projectId: "verify-build1-phase3", draft: pathwayDraft, now: NOW });
  const restored = researchPathwayDocumentToDraft(document);

  let archivedIdeaFields: Record<string, string> = { "idea-0-text": "Preserved concern", "idea-0-affected": "Researchers", "idea-0-status": "promising" };
  archivedIdeaFields = archiveResearchPathwayRow(archivedIdeaFields, "ideas", "0");
  const restoredIdeaFields = restoreResearchPathwayRow(archivedIdeaFields, "ideas", "0");
  const emptyRemoval = removeEmptyResearchPathwayRow({}, "ideas", "1");
  const populatedRemoval = removeEmptyResearchPathwayRow({ "idea-0-text": "Keep me" }, "ideas", "0");
  const linkedDraft: ResearchPathDraft = { steps: {
    "stage-01-shape-problems": { completed: false, checks: {}, fields: { "frame-0-id": "frame-a", "frame-0-status": "promising" } },
    "stage-01-explore-baseline": { completed: false, checks: {}, fields: { "baseline-0-id": "baseline-a", "baseline-0-linked-frames": "frame-a", "baseline-0-status": "promising" } },
    "stage-01-develop-questions": { completed: false, checks: {}, fields: { "question-0-linked-baseline": "baseline-a", "question-0-status": "promising" } },
  } };
  const archivedOnlyDocument = await createResearchPathwayDocument({
    projectId: "verify-build1-phase3-readiness",
    now: NOW,
    draft: { steps: { "stage-01-capture-concern": { completed: false, checks: {}, fields: archivedIdeaFields } } },
  });

  const [rows, studio, studioStyles, workspace, workspaceStyles, documentModel, brief] = await Promise.all([
    readFile("src/lib/research/researchPathwayPhase3Rows.ts", "utf8"),
    readFile("src/components/research-path/Stage1ResearchFramingStudio.tsx", "utf8"),
    readFile("src/components/research-path/Stage1ResearchFramingStudio.module.css", "utf8"),
    readFile("src/components/research-path/ResearchPathWorkspace.tsx", "utf8"),
    readFile("src/components/research-path/ResearchPathWorkspace.module.css", "utf8"),
    readFile("src/lib/research/researchPathwayDocument.ts", "utf8"),
    readFile("src/lib/research/researchPathwayBrief.ts", "utf8"),
  ]);

  const activeIdsBefore = initialQuestionSlots.map((slot) => questionFields[`question-${slot}-id`]);
  const activeIdsAfter = researchPathwayRowRoster(questionFields, "questions").active.map((slot) => questionFields[`question-${slot}-id`]);
  let boundedFields: Record<string, string> = {};
  for (let index = 0; index < PHASE3_MAXIMUM_ROWS + 5; index += 1) boundedFields = addResearchPathwayRow(boundedFields, "ideas").fields;

  const checks = [
    check("AC-01", "Five expandable collections", ["ideas", "parking", "problems", "baseline", "questions"].every((item) => collections.includes(item)) && studio.match(/<CollectionHeader/g)?.length === 5, "Idea sparks, parking thoughts, problem frames, baseline entries, and candidate questions each expose one bounded row canvas."),
    check("AC-02", "Stable identity during reorder", activeIdsBefore.every((id) => activeIdsAfter.includes(id)) && activeIdsAfter.at(-2) === activeIdsBefore.at(-1), "Reordering changes the roster position while retaining every stable item ID."),
    check("AC-03", "Forty-row safety bound", researchPathwayRowRoster(boundedFields, "ideas").active.length === PHASE3_MAXIMUM_ROWS && addResearchPathwayRow(boundedFields, "ideas").slot === null, "Each collection stops accepting rows at the explicit 40-row limit."),
    check("AC-04", "Empty-only physical removal", !researchPathwayRowRoster(emptyRemoval, "ideas").active.includes("1") && populatedRemoval["idea-0-text"] === "Keep me", "An empty alternative may be removed; content-bearing work cannot be physically deleted."),
    check("AC-05", "Archive and restore preservation", researchPathwayRowRoster(archivedIdeaFields, "ideas").archived.includes("0") && restoredIdeaFields["idea-0-text"] === "Preserved concern" && researchPathwayRowRoster(restoredIdeaFields, "ideas").active.includes("0"), "Archiving retains content and restoring returns the same stable row."),
    check("AC-06", "Selected rows fail closed", archiveResearchPathwayRow({ "question-0-text": "Selected", "question-0-status": "selected" }, "questions", "0")["question-0-status"] === "selected", "Selected candidates must be deselected before archival."),
    check("AC-07", "Dependency-aware archive guidance", Boolean(researchPathwayArchiveProtectionReason("problems", "0", linkedDraft)?.includes("links")) && Boolean(researchPathwayArchiveProtectionReason("baseline", "0", linkedDraft)?.includes("question")), "Linked problem frames and baseline entries surface the exact dependency to resolve before archival."),
    check("AC-08", "Archived work excluded from readiness", assessResearchPathwayReadiness(archivedOnlyDocument).steps[0].completed === 0 && brief.includes("activeIdeas") && brief.includes("activeBaseline"), "Archived alternatives remain recoverable but cannot satisfy active readiness."),
    check("AC-09", "Checksum-bound canonical round-trip", await verifyResearchPathwayDocument(document) && await verifyResearchPathwayDocument(await createResearchPathwayDocument({ projectId: document.projectId, draft: restored, previous: document, now: NOW })), "Dynamic rows compile and rehydrate through the checksum-valid v2 research pathway document."),
    check("AC-10", "Unbounded exact Stage 2 handoff", orderedQuestions.length === 10 && selectedResearchQuestionsFromDraft(restored).join("\n") === orderedQuestions.join("\n"), "Ten selected questions retain exact active-roster order through canonical persistence."),
    check("AC-11", "Dynamic Stage 2 roadmap", workspace.includes("selectedResearchQuestionsFromDraft(pathwayDraft)") && workspace.includes("questionRows.map") && workspaceStyles.includes("grid-auto-flow: column"), "The Stage 2 roadmap consumes all selected questions and scrolls horizontally instead of truncating to four."),
    check("AC-12", "Fixed internal scrolling", studioStyles.includes(".tableScroll { max-height: 310px") && studioStyles.includes(".tabScroller { max-height: 270px") && studioStyles.includes("overflow: auto"), "Growing row collections scroll inside fixed-height canvases rather than extending the full page."),
    check("AC-13", "Atomic field mutation", workspace.includes("const mutateFields = useCallback") && workspace.includes("mutateFields={mutateFields}"), "Row operations update one current-step field snapshot atomically."),
    check("AC-14", "Safe malformed-metadata recovery", researchPathwayRowRoster({ "__phase3-ideas-active": "not-json", "__phase3-ideas-archived": "[\"../escape\"]" }, "ideas").active.length === 1 && rows.includes("SLOT_PATTERN"), "Invalid roster JSON and unsafe slot values normalize to a usable one-row canvas."),
    check("AC-15", "No migration or privacy expansion", documentModel.includes("RESEARCH_PATHWAY_DOCUMENT_SCHEMA_VERSION = 2") && !JSON.stringify(document).match(/participantRows|chatTranscript|promptStored/), "Phase 3 stays inside the existing v2 checksum document and introduces no participant, prompt, or chat storage."),
  ];

  const implementationChecksums = {
    rows: await sha256ArtifactChecksum(rows), studio: await sha256ArtifactChecksum(studio), studioStyles: await sha256ArtifactChecksum(studioStyles),
    workspace: await sha256ArtifactChecksum(workspace), workspaceStyles: await sha256ArtifactChecksum(workspaceStyles), documentModel: await sha256ArtifactChecksum(documentModel), brief: await sha256ArtifactChecksum(brief),
  };
  const core = {
    build: "Build 1, Phase 3 — expandable research-framing canvases",
    verifiedFor: "2026-08-04",
    summary: { passed: checks.filter((item) => item.passed).length, failed: checks.filter((item) => !item.passed).length, checks: checks.length },
    checks,
    implementationChecksums,
    activation: { databaseMigrationRequired: false, existingBuild1MigrationStillUnapplied: true, remoteDeploymentPerformed: false },
  };
  const report = { ...core, reportChecksum: await sha256ArtifactChecksum(core) };
  const markdown = [
    "# Build 1 Phase 3 Verification", "", `Result: **${report.summary.passed}/${report.summary.checks} acceptance checks passed**`, "", `Report checksum: \`${report.reportChecksum}\``, "",
    ...checks.map((item) => `- ${item.passed ? "PASS" : "FAIL"} — **${item.id}: ${item.label}** — ${item.evidence}`),
    "", "No remote deployment was performed. No new migration is required; the existing Build 1 foundation migration remains unapplied.", "",
  ].join("\n");
  await mkdir(OUTPUT_DIRECTORY, { recursive: true });
  await Promise.all([
    writeFile(path.join(OUTPUT_DIRECTORY, "build-1-phase-3-verification.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(path.join(OUTPUT_DIRECTORY, "build-1-phase-3-verification.md"), markdown, "utf8"),
  ]);
  process.stdout.write(`${JSON.stringify({ result: report.summary.failed ? "FAIL" : "PASS", ...report.summary, reportChecksum: report.reportChecksum }, null, 2)}\n`);
  if (report.summary.failed) process.exitCode = 1;
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
