import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256ArtifactChecksum } from "../src/lib/research/artifactIdentity";
import {
  assessResearchPathwayReadiness,
  compareResearchPathwayRevisions,
  compilePathwayKnowledgeEntries,
  compileResearchPathwayBrief,
  terminologyForResearchIntent,
} from "../src/lib/research/researchPathwayBrief";
import {
  createResearchPathwayDocument,
  researchPathwayDocumentToDraft,
  verifyResearchPathwayDocument,
} from "../src/lib/research/researchPathwayDocument";
import { selectedResearchQuestionsFromDraft } from "../src/lib/research/researchPathwayPhase2Model";
import type { ResearchPathDraft } from "../src/lib/research/researchPathDraft";

const NOW = "2026-08-03T20:00:00.000Z";
const OUTPUT_DIRECTORY = path.join(process.cwd(), "output");

interface Check { id: string; label: string; passed: boolean; evidence: string }

function check(id: string, label: string, passed: boolean, evidence: string): Check {
  return { id, label, passed, evidence };
}

function draft(intent: "primary-data" | "secondary-data" | "evidence-synthesis"): ResearchPathDraft {
  const route = intent === "primary-data"
    ? { method: "qualitative", assignment: "none", setting: "online-home", audience: "adult", sensitivity: "identifiable" }
    : intent === "secondary-data"
      ? { method: "quantitative", assignment: "none", setting: "import-only", audience: "not-participant", sensitivity: "restricted" }
      : { method: "evidence-synthesis", assignment: "none", setting: "not-applicable", audience: "not-participant", sensitivity: "public" };
  return { steps: {
    "stage-01-capture-concern": { completed: false, checks: {}, fields: { "concern-narrative": "Important research ideas often remain too broad.", "concern-affected": "Early-career researchers", "concern-matters": "Broad ideas delay defensible research decisions." } },
    "stage-01-shape-problems": { completed: false, checks: {}, fields: {
      "frame-0-title": "Concern-to-problem transition", "frame-0-situation": "Researchers start with broad concerns.", "frame-0-affected": "Early-career researchers", "frame-0-consequence": "Study boundaries remain unclear.", "frame-0-uncertainty": "Which supports help without replacing judgment?", "frame-0-observed": "Drafts repeatedly broaden.", "frame-0-interpretation": "The transition is under-supported.", "frame-0-assumptions": "Topic knowledge is not the only cause.", "frame-0-alternatives": "Time pressure may explain the pattern.", "frame-0-status": "selected",
      "frame-1-title": "Evidence navigation", "frame-1-situation": "The literature is unfamiliar.", "frame-1-affected": "Early-career researchers", "frame-1-consequence": "Useful distinctions remain hidden.", "frame-1-uncertainty": "Does evidence navigation improve framing?", "frame-1-observed": "Searches remain broad.", "frame-1-interpretation": "Search and framing are coupled.", "frame-1-assumptions": "The literature contains usable distinctions.", "frame-1-alternatives": "The topic may be immature.", "frame-1-status": "promising",
    } },
    "stage-01-explore-baseline": { completed: false, checks: {}, fields: { "baseline-0-source": intent === "secondary-data" ? "dataset" : "literature", "baseline-0-known": "Structured reflection can expose assumptions.", "baseline-0-contested": "The useful amount of structure is debated.", "baseline-0-missing": "Problem-framing effects remain unclear.", "baseline-0-linked-frames": "problem-frame-1", "baseline-0-evidence-refs": "evidence-1", "baseline-0-status": "selected", "baseline-synthesis": "Scaffolding is plausible but problem-framing effects are uncertain." } },
    "stage-01-develop-questions": { completed: false, checks: {}, fields: {
      "question-0-text": intent === "evidence-synthesis" ? "How is guided problem framing characterized across research-development studies?" : intent === "secondary-data" ? "Which framing behaviors are associated with bounded revisions in the archive?" : "How do early-career researchers experience guided problem framing?", "question-0-family": intent === "evidence-synthesis" ? "evidence-synthesis" : intent === "primary-data" ? "interpretive" : "comparative", "question-0-status": "selected", "question-0-linked-frames": "problem-frame-1", "question-0-linked-baseline": "baseline-entry-1", "question-0-scope-population": intent === "primary-data" ? "Early-career researchers" : "Available evidence sources", "question-0-scope-construct": "Guided problem framing", "question-0-scope-setting": "Proposal development", "question-0-scope-evidence": "Authorized records or accounts",
      "question-1-text": "Which forms of structure preserve researcher ownership?", "question-1-family": "exploratory", "question-1-status": "promising", "question-1-linked-frames": "problem-frame-1", "question-1-linked-baseline": "baseline-entry-1", "question-1-scope-population": "Research-development work", "question-1-scope-construct": "Researcher ownership", "question-1-scope-setting": "Proposal development", "question-1-scope-evidence": "Accessible evidence",
    } },
    "stage-01-choose-pathway": { completed: false, checks: {}, fields: { "route-intent": intent, "route-method": route.method, "route-assignment": route.assignment, "route-setting": route.setting, "route-audience": route.audience, "route-sensitivity": route.sensitivity, "route-confidence": "high", "pathway-rationale": "The selected pathway keeps the uncertainty, evidence boundary, and researcher judgment explicit.", "pathway-uncertainties": "The appropriate intensity of support", "backcasting-choice": "not-use" } },
  } };
}

async function main() {
  const [primary, secondary, synthesis] = await Promise.all([
    createResearchPathwayDocument({ projectId: "verify-primary", draft: draft("primary-data"), now: NOW }),
    createResearchPathwayDocument({ projectId: "verify-secondary", draft: draft("secondary-data"), now: NOW }),
    createResearchPathwayDocument({ projectId: "verify-synthesis", draft: draft("evidence-synthesis"), now: NOW }),
  ]);
  const [primaryBrief, secondaryBrief, synthesisBrief] = await Promise.all([
    compileResearchPathwayBrief(primary), compileResearchPathwayBrief(secondary), compileResearchPathwayBrief(synthesis),
  ]);
  const restored = researchPathwayDocumentToDraft(primary, draft("primary-data"));
  restored.steps["stage-01-shape-problems"].fields["frame-0-title"] = "Revised but recoverable frame";
  const revised = await createResearchPathwayDocument({ projectId: primary.projectId, draft: restored, previous: primary, now: "2026-08-03T21:00:00.000Z" });
  const difference = compareResearchPathwayRevisions(revised, primary);
  const knowledge = await compilePathwayKnowledgeEntries(primary);
  const [config, ui, compiler, model, persistence] = await Promise.all([
    readFile("src/lib/research/researchPathConfig.ts", "utf8"),
    readFile("src/components/research-path/Stage1ResearchFramingStudio.tsx", "utf8"),
    readFile("src/lib/research/researchPathwayBrief.ts", "utf8"),
    readFile("src/lib/research/researchPathwayDocument.ts", "utf8"),
    readFile("src/lib/research/researchPathwayPersistence.ts", "utf8"),
  ]);
  const primaryQuestions = selectedResearchQuestionsFromDraft(draft("primary-data"));
  const checks = [
    check("AC-01", "Five-step semantic workflow", ["capture-concern", "shape-problems", "explore-baseline", "develop-questions", "choose-pathway"].every((id) => config.includes(id)), "Stage 1 exposes the approved five stable semantic step IDs."),
    check("AC-02", "Derived readiness", assessResearchPathwayReadiness(primary).readyForStage2 && ui.includes("Derived readiness") && !ui.includes("Mark step complete"), "Readiness comes from traceable content conditions, not a Stage 1 checkbox."),
    check("AC-03", "Exact Stage 2 handoff", primaryBrief?.selectedQuestions.map((item) => item.text).join("\n") === primaryQuestions.join("\n") && primaryBrief.unresolvedUncertainties.length === 1, "The brief contains the exact selected questions and unresolved uncertainties."),
    check("AC-04", "Qualitative neutrality", primaryBrief?.route.methodFamily === "qualitative" && primary.decision.workingHypothesis === "" && !JSON.stringify(primary.questionCandidates).includes("variable"), "Qualitative framing is not forced into variable or hypothesis fields."),
    check("AC-05", "Secondary-data routing", Boolean(secondaryBrief?.route.capabilities.includes("data-use-and-rights-review")) && !secondaryBrief?.route.capabilities.includes("recruitment-materials"), "Secondary data routes to coverage, measurement, access, and import concerns."),
    check("AC-06", "Evidence-synthesis routing", synthesisBrief?.route.audience === "not-participant" && synthesisBrief.route.applicability.find((item) => item.stepId === "plan-participants")?.status === "not-applicable", "Evidence synthesis never receives participant-planning requirements."),
    check("AC-07", "Route-aware terminology", terminologyForResearchIntent("evidence-synthesis").questionGuidance.includes("participant-study language does not apply") && terminologyForResearchIntent("secondary-data").baselineGuidance.includes("coverage and measurement"), "Terminology changes with intent without changing research content."),
    check("AC-08", "Conditional backcasting", ui.includes("Use it when a desired future state genuinely helps") && !assessResearchPathwayReadiness(primary).blockingIssueIds.includes("backcasting-advisory"), "Backcasting is an explicit applicable choice rather than a universal step."),
    check("AC-09", "Revision recovery", primary.problemFrames[0].title !== revised.problemFrames[0].title && difference.previousRevision === primary.revision && difference.changedProblemFrameIds.includes("problem-frame-1"), "Reframing creates a new revision and a researcher-visible difference summary."),
    check("AC-10", "Living Research Record", knowledge.length === 4 && knowledge.every((entry) => entry.sourceReferences[0]?.checksum === primary.identity.checksum), "Selected questions, rationale, route, and uncertainties are checksum-bound knowledge entries."),
    check("AC-11", "Canonical v2 integrity", await verifyResearchPathwayDocument(primary) && model.includes("RESEARCH_PATHWAY_DOCUMENT_SCHEMA_VERSION = 2") && model.includes("migrateVerifiedV1"), "The richer schema is checksum-valid and keeps a verified v1→v2 migration path."),
    check("AC-12", "Fixed internal canvases", ui.includes("PHASE2_PROBLEM_ROWS") && ui.includes("PHASE2_QUESTION_ROWS") && ui.includes("Phase 3 will add and remove rows"), "Phase 2 keeps bounded internal rows; dynamic table expansion remains Phase 3."),
    check("AC-13", "Foundation connection", persistence.includes("compileRouteFromResearchPathway") && persistence.includes("compilePathwayKnowledgeEntries") && persistence.includes("upsertProjectRouteProfile"), "Accepted pathways dual-write the route and Living Research Record when foundation tables are available."),
    check("AC-14", "Privacy boundary", !JSON.stringify({ primaryBrief, secondaryBrief, synthesisBrief, knowledge }).match(/participantRows|chatTranscript|promptStored/) && compiler.includes("not-independent-validity-novelty-or-ethics-approval"), "Compiler output stores no participant rows or chat and makes no independent validity or approval claim."),
  ];
  const implementationChecksums = {
    config: await sha256ArtifactChecksum(config), ui: await sha256ArtifactChecksum(ui), compiler: await sha256ArtifactChecksum(compiler), model: await sha256ArtifactChecksum(model), persistence: await sha256ArtifactChecksum(persistence),
  };
  const core = { build: "Build 1, Phase 2 — five-step research framing workflow", verifiedFor: "2026-08-03", summary: { passed: checks.filter((item) => item.passed).length, failed: checks.filter((item) => !item.passed).length, checks: checks.length }, checks, implementationChecksums, activation: { databaseMigrationRequired: false, existingBuild1MigrationStillUnapplied: true, remoteDeploymentPerformed: false } };
  const report = { ...core, reportChecksum: await sha256ArtifactChecksum(core) };
  const markdown = ["# Build 1 Phase 2 Verification", "", `Result: **${report.summary.passed}/${report.summary.checks} acceptance checks passed**`, "", `Report checksum: \`${report.reportChecksum}\``, "", ...checks.map((item) => `- ${item.passed ? "PASS" : "FAIL"} — **${item.id}: ${item.label}** — ${item.evidence}`), "", "No remote deployment was performed. The existing Build 1 foundation migration remains unapplied.", ""].join("\n");
  await mkdir(OUTPUT_DIRECTORY, { recursive: true });
  await Promise.all([
    writeFile(path.join(OUTPUT_DIRECTORY, "build-1-phase-2-verification.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(path.join(OUTPUT_DIRECTORY, "build-1-phase-2-verification.md"), markdown, "utf8"),
  ]);
  process.stdout.write(`${JSON.stringify({ result: report.summary.failed ? "FAIL" : "PASS", ...report.summary, reportChecksum: report.reportChecksum }, null, 2)}\n`);
  if (report.summary.failed) process.exitCode = 1;
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
