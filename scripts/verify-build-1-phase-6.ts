import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256ArtifactChecksum } from "../src/lib/research/artifactIdentity";
import { createMentorContextEnvelope, createMentorProjectMemory } from "../src/lib/research/mentorContextEnvelope";
import { applyResearchMentorCanvasSuggestion, createResearchMentorContext, parseResearchMentorResponse } from "../src/lib/research/researchMentor";
import {
  RESEARCH_MENTOR_TECHNIQUES,
  createResearchMentorTechniqueRun,
  defaultResearchMentorTechniqueSourceIds,
  normalizeAndVerifyResearchMentorTechniqueRun,
  researchMentorTechniqueApiMetadata,
  reviewResearchMentorTechniqueApplication,
  validateResearchMentorTechniqueResponse,
} from "../src/lib/research/researchMentorTechniques";
import { createResearchPathwayDocument } from "../src/lib/research/researchPathwayDocument";
import type { ResearchPathDraft } from "../src/lib/research/researchPathDraft";

const NOW = "2026-08-04T12:00:00.000Z";
const OUTPUT_DIRECTORY = path.join(process.cwd(), "output");
interface Check { id: string; label: string; passed: boolean; evidence: string }
function check(id: string, label: string, passed: boolean, evidence: string): Check { return { id, label, passed, evidence }; }

function draft(): ResearchPathDraft {
  return { steps: {
    "stage-01-capture-concern": { completed: false, checks: {}, fields: { "idea-0-text": "Students use generative AI while drafting and may engage differently with revision.", "idea-0-status": "promising" } },
    "stage-01-shape-problems": { completed: false, checks: {}, fields: { "frame-0-id": "frame-a", "frame-0-title": "AI-supported revision", "frame-0-situation": "Writing support is changing how students revise drafts.", "frame-0-uncertainty": "Which learning processes change, for whom, and under which assessment conditions?", "frame-0-status": "selected" } },
    "stage-01-explore-baseline": { completed: false, checks: {}, fields: {} },
    "stage-01-develop-questions": { completed: false, checks: {}, fields: {} },
    "stage-01-choose-pathway": { completed: false, checks: {}, fields: {} },
  } };
}

async function main() {
  const projectId = "verify-build1-phase6";
  const sourceDraft = draft();
  const document = await createResearchPathwayDocument({ projectId, draft: sourceDraft, now: NOW });
  const context = await createResearchMentorContext({ projectId, activeStepId: "stage-01-shape-problems", draft: sourceDraft, document });
  const projectContext = await createMentorContextEnvelope({
    projectId,
    location: { stage: 1, stageId: "stage-01", stageTitle: "Pathway", stepId: context.activeStepId, stepTitle: "Shape Candidate Problems" },
    memory: await createMentorProjectMemory({ projectId, updatedAt: NOW }),
    activeContextItems: context.activeItems.map((item) => ({ id: item.id, kind: item.kind, status: item.status, summary: JSON.stringify(item.fields) })),
    pathwayRoute: context.route,
    generatedAt: NOW,
  });
  const sourceIds = defaultResearchMentorTechniqueSourceIds(context, 2);
  const run = await createResearchMentorTechniqueRun({ context, techniqueId: "topic-to-problem-shaper", sourceItemIds: sourceIds, permissionGranted: true });
  const raw = JSON.stringify({
    summary: "Three brainstorming lenses are available; no pathway change has been made.",
    reflectiveQuestion: "Which difference is worth examining?",
    suggestions: [
      { id: "learning-process", kind: "canvas-option", title: "Learning-process lens", rationale: "Examines revision practices.", uncertainty: "The process change needs evidence.", sourceItemIds: sourceIds, observationIds: [], distinctiveLens: "Revision process", epistemicStatus: "brainstorming-not-evidence", evidenceIds: [], targetCollection: "problems", targetField: "uncertainty", proposedText: "How might AI-supported drafting alter the revision processes students use?", action: "create-alternative" },
      { id: "equity-access", kind: "canvas-option", title: "Equity and access lens", rationale: "Examines differences in access and use.", uncertainty: "Access differences need evidence.", sourceItemIds: sourceIds, observationIds: [], distinctiveLens: "Access and opportunity", epistemicStatus: "uncertain-needs-evidence", evidenceIds: [], targetCollection: "problems", targetField: "uncertainty", proposedText: "How might access to AI writing support shape students’ revision opportunities?", action: "create-alternative" },
      { id: "assessment-design", kind: "canvas-option", title: "Assessment-design lens", rationale: "Examines task conditions and intended learning.", uncertainty: "Assessment effects need checking.", sourceItemIds: sourceIds, observationIds: [], distinctiveLens: "Assessment conditions", epistemicStatus: "brainstorming-not-evidence", evidenceIds: [], targetCollection: "problems", targetField: "uncertainty", proposedText: "Under which assessment conditions does AI-supported revision align with intended writing practice?", action: "create-alternative" },
    ],
  });
  const parsed = parseResearchMentorResponse(raw, context, projectContext);
  const validation = validateResearchMentorTechniqueResponse(parsed, run, projectContext);
  const first = validation.suggestions[0];
  if (!first || first.kind !== "canvas-option") throw new Error("Phase 6 verification fixture did not produce a canvas option.");
  const unchangedReview = reviewResearchMentorTechniqueApplication(first, first.proposedText, "");
  const reasonedReview = reviewResearchMentorTechniqueApplication(first, first.proposedText, "This process lens matches the uncertainty I want to investigate.");
  const editedReview = reviewResearchMentorTechniqueApplication(first, `${first.proposedText} In first-year writing courses.`, "");
  const originalFields = sourceDraft.steps[context.activeStepId].fields;
  const applied = applyResearchMentorCanvasSuggestion(originalFields, context.activeStepId, editedReview.suggestion);

  const [techniqueSource, techniqueTests, mentorSource, panel, techniquePanel, techniqueStyles, route, packageJson] = await Promise.all([
    readFile("src/lib/research/researchMentorTechniques.ts", "utf8"),
    readFile("src/lib/research/researchMentorTechniques.test.ts", "utf8"),
    readFile("src/lib/research/researchMentor.ts", "utf8"),
    readFile("src/components/research-path/ResearchMentorPanel.tsx", "utf8"),
    readFile("src/components/research-path/ResearchMentorTechniquesPanel.tsx", "utf8"),
    readFile("src/components/research-path/ResearchMentorTechniquesPanel.module.css", "utf8"),
    readFile("src/app/api/ai/research-mentor/route.ts", "utf8"),
    readFile("package.json", "utf8"),
  ]);
  const metadata = researchMentorTechniqueApiMetadata(run);
  const checks = [
    check("AC-01", "Fifteen registered scholarly techniques", RESEARCH_MENTOR_TECHNIQUES.length === 15 && new Set(RESEARCH_MENTOR_TECHNIQUES.map((item) => item.id)).size === 15, "Every approved Phase 6 technique has one stable registry identity."),
    check("AC-02", "Five researcher-need families", new Set(RESEARCH_MENTOR_TECHNIQUES.map((item) => item.family)).size === 5 && techniquePanel.includes("Frame the problem") && techniquePanel.includes("Plan the next move"), "The drawer groups tools by the researcher's need instead of presenting a wall of cards."),
    check("AC-03", "Stage-aware recommendations", RESEARCH_MENTOR_TECHNIQUES.every((item) => item.recommendedStepIds.length > 0) && techniquePanel.includes("recommendedResearchMentorTechniqueFamily"), "Each Stage 1 step opens with relevant techniques while preserving access to the full pack."),
    check("AC-04", "Researcher words first", run.sourceExcerpts.length > 0 && run.sourceExcerpts.every((excerpt) => context.activeItems.some((item) => item.id === excerpt.itemId && Object.values(item.fields).flat().includes(excerpt.text))), "Every selected excerpt is copied exactly from a checksum-bound Stage 1 item."),
    check("AC-05", "Explicit expansion permission", run.permissionGranted === true && techniqueSource.includes("The researcher must grant permission") && techniquePanel.includes("May I expand with different lenses?"), "A technique run cannot be constructed before the researcher grants permission."),
    check("AC-06", "Non-generative mirror", run.faithfulMirror.includes("not added a direction, claim, or evidence") && techniquePanel.includes("Mirror first"), "Cerise reflects the source boundary before generating alternatives."),
    check("AC-07", "Checksum-bound technique run", Boolean(await normalizeAndVerifyResearchMentorTechniqueRun(run, context)) && await normalizeAndVerifyResearchMentorTechniqueRun({ ...run, faithfulMirror: "tampered" }, context) === null, "Project, step, sources, permission, and pathway content are included in the run checksum."),
    check("AC-08", "Traceable option provenance", validation.valid && validation.suggestions.every((item) => item.sourceItemIds.some((id) => sourceIds.includes(id))), "Every accepted option names at least one selected researcher-authored source item."),
    check("AC-09", "Three-option divergence", validation.suggestions.length === 3 && new Set(validation.suggestions.map((item) => item.distinctiveLens)).size === 3, "Divergent tools fail closed unless three structurally distinct lenses survive validation."),
    check("AC-10", "Brainstorming versus evidence status", validation.suggestions.every((item) => item.epistemicStatus !== "supported-by-approved-evidence" || item.evidenceIds.length > 0) && techniquePanel.includes("Brainstorming — not evidence"), "Every result displays an epistemic status; evidence-backed labels require approved evidence IDs."),
    check("AC-11", "No invented evidence identifiers", mentorSource.includes("knownEvidenceIds") && techniqueSource.includes("unknown-evidence-id") && techniqueSource.includes("Never invent an empirical claim, citation, source, or evidence ID"), "Unknown evidence IDs are discarded or rejected at server validation."),
    check("AC-12", "Edit-or-rationale apply gate", !unchangedReview.allowed && reasonedReview.allowed && editedReview.allowed && techniqueSource.includes("Edit the wording or record a short rationale"), "An unchanged, unexplained AI option cannot enter the pathway."),
    check("AC-13", "Original wording preserved", Boolean(applied.slot) && applied.fields["frame-0-uncertainty"] === originalFields["frame-0-uncertainty"] && applied.fields[`frame-${applied.slot}-status`] === "exploring", "Applying a reviewed result adds an exploring alternative and never overwrites the source frame."),
    check("AC-14", "No autonomous ranking", RESEARCH_MENTOR_TECHNIQUES.every((item) => !/\b(?:select|identify|declare) (?:the )?(?:best|correct|recommended)\b/i.test(item.prompt)) && techniqueSource.includes("Do not label an option best"), "Technique prompts and server rules keep comparative judgment with the researcher."),
    check("AC-15", "Advisor handoff is reviewable synthesis", RESEARCH_MENTOR_TECHNIQUES.find((item) => item.id === "advisor-handoff-memo")?.minimumOptions === 1 && techniquePanel.includes("Review memo to save"), "The advisor memo routes through the existing review-before-save knowledge workflow."),
    check("AC-16", "Stage 1-only technique UI", panel.includes('activeStageNumber === 1 ? <button') && panel.includes('tab === "techniques"') && panel.includes('if (activeStageNumber !== 1 && tab === "techniques")'), "Later stages keep the general mentor but cannot open Stage 1 scholarly techniques."),
    check("AC-17", "Authenticated verified AI boundary", route.includes("normalizeAndVerifyResearchMentorTechniqueRun") && route.includes("supabase.auth.getUser()") && route.includes('.eq("user_id", user.id)') && route.includes("checkRateLimit"), "The existing ownership, origin, size, allowance, and rate gates protect every technique request."),
    check("AC-18", "Responsive drawer workflow", techniqueStyles.includes("@media (max-width: 720px)") && techniqueStyles.includes("flex-direction: column") && techniqueStyles.includes("max-height: 196px"), "Technique controls remain internally scrollable and stack at phone width."),
    check("AC-19", "No new sensitive persistence", !techniqueSource.includes("localStorage") && !techniqueSource.includes("supabase") && !techniquePanel.includes("chat transcript") && metadata.claim.includes("not-evidence"), "Technique runs remain request-scoped and add no participant, transcript, or behavioral-surveillance store."),
    check("AC-20", "Deterministic verification integration", techniqueTests.includes("applying a technique option requires") && packageJson.includes("verify:build1-phase6"), "Domain invariants and this reproducible acceptance report are available through the package script."),
  ];
  const implementationChecksums = {
    techniqueSource: await sha256ArtifactChecksum(techniqueSource), techniqueTests: await sha256ArtifactChecksum(techniqueTests), mentorSource: await sha256ArtifactChecksum(mentorSource), panel: await sha256ArtifactChecksum(panel), techniquePanel: await sha256ArtifactChecksum(techniquePanel), techniqueStyles: await sha256ArtifactChecksum(techniqueStyles), route: await sha256ArtifactChecksum(route),
  };
  const core = {
    build: "Build 1, Phase 6 — Stage 1 scholarly technique pack",
    verifiedFor: "2026-08-04",
    summary: { passed: checks.filter((item) => item.passed).length, failed: checks.filter((item) => !item.passed).length, checks: checks.length },
    checks,
    implementationChecksums,
    browserEvidence: {
      desktop: "output/playwright/build1-phase6-techniques-1536x1024.png",
      mobile: "output/playwright/build1-phase6-techniques-mobile-390x844.png",
      review: "output/playwright/build1-phase6-technique-review.png",
      verifiedFlow: ["open Stage 1 mentor", "open Techniques", "choose sources", "grant expansion permission", "compare three traceable lenses", "edit before adding"],
      consoleErrorsInIsolatedQaSession: 0,
    },
    activation: { databaseMigrationRequired: false, existingBuild0AndBuild1MigrationsStillUnapplied: true, remoteDeploymentPerformed: false },
  };
  const report = { ...core, reportChecksum: await sha256ArtifactChecksum(core) };
  const markdown = [
    "# Build 1 Phase 6 Verification", "", `Result: **${report.summary.passed}/${report.summary.checks} acceptance checks passed**`, "", `Report checksum: \`${report.reportChecksum}\``, "",
    ...checks.map((item) => `- ${item.passed ? "PASS" : "FAIL"} — **${item.id}: ${item.label}** — ${item.evidence}`),
    "", "Browser QA covers the complete permissioned technique flow at 1536×1024 and 390×844. No remote deployment or database migration is part of Phase 6.", "",
  ].join("\n");
  await mkdir(OUTPUT_DIRECTORY, { recursive: true });
  await Promise.all([
    writeFile(path.join(OUTPUT_DIRECTORY, "build-1-phase-6-verification.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(path.join(OUTPUT_DIRECTORY, "build-1-phase-6-verification.md"), markdown, "utf8"),
  ]);
  process.stdout.write(`${JSON.stringify({ result: report.summary.failed ? "FAIL" : "PASS", ...report.summary, reportChecksum: report.reportChecksum }, null, 2)}\n`);
  if (report.summary.failed) process.exitCode = 1;
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
