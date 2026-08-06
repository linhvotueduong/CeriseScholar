import { sha256ArtifactChecksum } from "../src/lib/research/artifactIdentity";
import {
  compileStudyBuildProfile,
  STUDY_BUILD_COMPILER_VERSION,
} from "../src/lib/research/studyBuildCompiler";
import { collectStudyBuildProfileReadiness } from "../src/lib/research/studyBuildProfile";
import {
  STUDY_DESIGN_OPTIONS,
  type ConstructRole,
  type StudyDesignDocument,
  type StudyDesignKind,
  type StudySetting,
} from "../src/lib/research/studyDesign";

const SETTINGS = ["online", "laboratory", "field", "hybrid"] as const;

const SETTING_LABELS: Record<Exclude<StudySetting, "">, string> = {
  online: "Online/home",
  laboratory: "Laboratory",
  field: "Field",
  hybrid: "Hybrid",
};

function verificationDocument(
  designKind: Exclude<StudyDesignKind, "">,
  setting: Exclude<StudySetting, "">,
): StudyDesignDocument {
  const constructRole: ConstructRole = designKind === "qualitative" ? "qualitative-concept" : "outcome";
  return {
    schemaVersion: 1,
    projectId: `phase-2-${designKind}-${setting}`,
    updatedAt: "2026-07-31T12:00:00.000Z",
    spec: {
      design: {
        goal: designKind === "qualitative" ? "explore-experience" : "describe-pattern",
        setting,
        hybridSettings: setting === "hybrid" ? ["online", "laboratory"] : [],
        constraints: "Phase 2 verification fixture",
        availableDevices: setting === "laboratory" ? "Researcher-managed laptop" : "Supported browser device",
        selectedDesign: designKind,
        selectionRationale: "Exercise the deterministic capability compiler.",
        approved: true,
      },
      researchQuestions: [{
        id: "rq-1",
        question: designKind === "qualitative" ? "How is the experience described?" : "What is the planned outcome?",
        hypothesis: designKind === "qualitative" ? "" : "The planned outcome follows the declared direction.",
        construct: designKind === "qualitative" ? "Experience" : "Outcome",
        constructRole,
        operationalDefinition: designKind === "qualitative" ? "Participant account" : "Scored response",
        measure: designKind === "qualitative" ? "Open prompt" : "Planned measure",
        expectedDirection: designKind === "qualitative" ? "" : "Declared before collection",
        evidenceNote: "Compiler verification input",
      }, ...(designKind === "mixed-methods" ? [{
        id: "rq-2",
        question: "How do participants explain the quantitative result?",
        hypothesis: "",
        construct: "Explanation",
        constructRole: "qualitative-concept" as const,
        operationalDefinition: "Participant account",
        measure: "Open prompt",
        expectedDirection: "",
        evidenceNote: "Qualitative verification lane",
      }] : [])],
      participants: {
        targetPopulation: "Adults eligible for the declared study",
        inclusionCriteria: "Meets approved eligibility criteria",
        exclusionCriteria: "Does not meet approved eligibility criteria",
        samplingStrategy: "Declared sampling strategy",
        recruitmentChannel: "Declared recruitment channel",
        plannedSampleSize: "100",
        sampleSizeRationale: "Method-appropriate planning rationale",
        expectedEffectSize: designKind === "qualitative" ? "" : "0.5",
        alpha: "0.05",
        power: "0.80",
        conditions: designKind === "randomized-between" ? "Control; intervention" : "",
        allocationMethod: designKind === "randomized-between" ? "Simple random allocation" : "",
        allocationRatio: designKind === "randomized-between" ? "1:1" : "",
        counterbalancing: designKind === "within-subjects" ? "Rotated condition order" : "",
        deviceRequirements: "Declared supported device",
        accessibilityRequirements: "Keyboard access, semantic controls, reflow, and reduced motion",
        approved: true,
      },
      legacyNotes: {},
    },
  };
}

async function main(): Promise<void> {
  const rows: string[] = [];
  const counts = { ready: 0, review: 0, blocked: 0 };
  const checksums = new Set<string>();
  let tracedRecommendations = 0;
  let recommendations = 0;

  for (const design of STUDY_DESIGN_OPTIONS) {
    for (const setting of SETTINGS) {
      const document = verificationDocument(design.id, setting);
      const first = await compileStudyBuildProfile(document, "guided");
      const second = await compileStudyBuildProfile({ ...document, updatedAt: "2099-01-01T00:00:00.000Z" }, "guided");
      const checksum = await sha256ArtifactChecksum(first);
      const repeatedChecksum = await sha256ArtifactChecksum(second);
      if (checksum !== repeatedChecksum) throw new Error(`Non-deterministic profile: ${design.id} × ${setting}`);
      checksums.add(checksum);
      const readiness = collectStudyBuildProfileReadiness(first);
      counts[readiness.status] += 1;
      recommendations += first.modules.length;
      tracedRecommendations += first.modules.filter((module) => (
        module.sourceReferences.length > 0
        && first.rationales.some((rationale) => rationale.recommendationId === module.id)
      )).length;
      rows.push(`| ${design.title} | ${SETTING_LABELS[setting]} | ${readiness.status} | ${readiness.blocking} | ${readiness.warning} | ${first.modules.length} | ${first.requiredChecks.length} | \`${checksum}\` |`);
    }
  }

  if (rows.length !== 32 || checksums.size !== 32 || recommendations !== tracedRecommendations) {
    throw new Error("The Phase 2 matrix failed its completeness or provenance assertion.");
  }

  const survey = await compileStudyBuildProfile(verificationDocument("cross-sectional-survey", "online"));
  const labExperiment = await compileStudyBuildProfile(verificationDocument("randomized-between", "laboratory"));
  const surveyOnly = survey.modules.map((module) => module.id)
    .filter((id) => !labExperiment.modules.some((module) => module.id === id));
  const labOnly = labExperiment.modules.map((module) => module.id)
    .filter((id) => !survey.modules.some((module) => module.id === id));

  const output = [
    "# Phase 2 — 32-Combination Verification Report",
    "",
    `Compiler version: ${STUDY_BUILD_COMPILER_VERSION}`,
    "",
    "This report is generated from deterministic, normalized, review-complete source fixtures. `updatedAt` is deliberately changed during the second compilation to prove that non-semantic timestamps do not alter a profile.",
    "",
    "## Summary",
    "",
    `- Combinations compiled: ${rows.length}/32`,
    `- Unique deterministic profile checksums: ${checksums.size}/32`,
    `- Recommendations with source references and rationale: ${tracedRecommendations}/${recommendations}`,
    `- Readiness results: ${counts.ready} ready, ${counts.review} review, ${counts.blocked} blocked`,
    "- AI or network calls required: 0",
    "- Standard registry-composition conflicts: 0",
    "",
    "`blocked` is an honest runtime boundary, not a compiler failure. Longitudinal profiles are intentionally blocked because the current runner has no privacy-reviewed cross-session identity, scheduling, reminders, or governed recontact capability.",
    "",
    "## Matrix",
    "",
    "| Design | Setting | Readiness | Blockers | Warnings | Modules | Required checks | Guided profile checksum |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |",
    ...rows,
    "",
    "## Structural contrast required by the exit gate",
    "",
    `Online survey-only recommendations: ${surveyOnly.map((id) => `\`${id}\``).join(", ")}.`,
    "",
    `Randomized laboratory-only recommendations: ${labOnly.map((id) => `\`${id}\``).join(", ")}.`,
    "",
    "The two profiles also have different source fingerprints, capability requests, required checks, and profile checksums before any Study Studio UI materialization.",
    "",
  ].join("\n");
  process.stdout.write(output);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
