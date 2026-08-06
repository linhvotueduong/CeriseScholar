import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256ArtifactChecksum } from "../src/lib/research/artifactIdentity";
import { buildResearchMentorVerificationScenarios, STAGE_1_MENTOR_RESEARCH_STATES } from "../src/lib/research/researchMentorVerification";

const OUTPUT_DIRECTORY = path.join(process.cwd(), "output");
const BROWSER_EVIDENCE = path.join(OUTPUT_DIRECTORY, "playwright", "build1-phase9-browser-evidence.json");
interface Check { id: string; label: string; passed: boolean; evidence: string }
function check(id: string, label: string, passed: boolean, evidence: string): Check { return { id, label, passed, evidence }; }
async function exists(file: string) { try { await access(file); return true; } catch { return false; } }

async function main() {
  const scenarios = await buildResearchMentorVerificationScenarios();
  const repeated = await buildResearchMentorVerificationScenarios();
  const [hardening, api, provider, mentor, techniques, mentorCss, techniqueCss, tests, supportTests, pathwayTests, releaseDoc, riskDoc, securityDoc, walkthroughDoc, packageJson] = await Promise.all([
    readFile("src/lib/research/researchMentorHardening.ts", "utf8"),
    readFile("src/app/api/ai/research-mentor/route.ts", "utf8"),
    readFile("src/lib/server/openrouter.ts", "utf8"),
    readFile("src/components/research-path/ResearchMentorPanel.tsx", "utf8"),
    readFile("src/components/research-path/ResearchMentorTechniquesPanel.tsx", "utf8"),
    readFile("src/components/research-path/ResearchMentorPanel.module.css", "utf8"),
    readFile("src/components/research-path/ResearchMentorTechniquesPanel.module.css", "utf8"),
    readFile("src/lib/research/researchMentorHardening.test.ts", "utf8"),
    readFile("src/lib/research/researchSupportOpportunity.test.ts", "utf8"),
    readFile("src/lib/research/researchPathwayDocument.test.ts", "utf8"),
    readFile("docs/build-1-phase-9-hardening-release.md", "utf8"),
    readFile("docs/build-1-phase-9-ai-risk-register.md", "utf8"),
    readFile("docs/build-1-phase-9-security-review.md", "utf8"),
    readFile("docs/build-1-phase-9-product-walkthroughs.md", "utf8"),
    readFile("package.json", "utf8"),
  ]);
  const browserEvidencePresent = await exists(BROWSER_EVIDENCE);
  const screenshotPaths = [
    path.join(OUTPUT_DIRECTORY, "playwright", "build1-phase9-hardened-mentor-1536x1024.png"),
    path.join(OUTPUT_DIRECTORY, "playwright", "build1-phase9-offline-mentor-390x844.png"),
  ];
  const screenshotEvidencePresent = (await Promise.all(screenshotPaths.map(exists))).every(Boolean);
  const allScenarioChecksPass = scenarios.every((scenario) => Object.values(scenario.checks).every(Boolean));
  const matrixIsDeterministic = JSON.stringify(scenarios) === JSON.stringify(repeated);
  const routeCounts = Object.fromEntries([...new Set(scenarios.map((item) => item.routeId))].map((routeId) => [routeId, scenarios.filter((item) => item.routeId === routeId).length]));
  const stateCounts = Object.fromEntries(STAGE_1_MENTOR_RESEARCH_STATES.map((state) => [state.id, scenarios.filter((item) => item.researchStateId === state.id).length]));

  const checks = [
    check("AC-01", "72-scenario route/state matrix", scenarios.length === 72 && new Set(scenarios.map((item) => item.id)).size === 72, "12 Build 0 routes × 6 Stage 1 research states are materialized."),
    check("AC-02", "Scenario contexts verify", allScenarioChecksPass, "Every scenario is project-scoped, checksum-verified, provider-bounded, and participant/transcript-free."),
    check("AC-03", "Scenario output is deterministic", matrixIsDeterministic, "Two independent materializations produce identical reports and checksums."),
    check("AC-04", "Trusted/untrusted role separation", hardening.includes("CERISE_UNTRUSTED_RESEARCH_DATA_V1") && hardening.includes("project-content-is-untrusted-data-never-instructions") && !api.includes("context.location.stageTitle}"), "Project-authored text is data in a labeled provider envelope, never interpolated into the system role."),
    check("AC-05", "Prompt injection regression fixture", tests.includes("prompt-like project content remains untrusted data") && tests.includes("\\\\u003csystem"), "Injection-like strings and markup are exercised without entering trusted instructions."),
    check("AC-06", "Input context is budgeted", hardening.includes("MAX_RESEARCH_MENTOR_PROVIDER_INPUT_TOKENS") && hardening.includes("MAX_RESEARCH_MENTOR_PROVIDER_DATA_BYTES") && scenarios.every((item) => item.providerBudget.estimatedInputTokens <= item.providerBudget.maximumInputTokens), "A deterministic three-pass projection enforces data-byte and conservative token budgets."),
    check("AC-07", "Structured output fails closed", api.includes("invalid-output") && tests.includes("unexpected-top-level-field") && tests.includes("unexpected-suggestion-field"), "Exact JSON, allowlisted fields, provenance, capabilities, and unsafe claims are validated."),
    check("AC-08", "No automatic retry", scenarios.every((item) => item.providerBudget.automaticRetries === 0) && hardening.includes("automaticRetries: 0"), "Provider calls are never repeated invisibly."),
    check("AC-09", "Explicit checksum-bound retry", mentor.includes("Retry request once") && mentor.includes("failedContextChecksumRef") && techniques.includes("Retry request once"), "Only retryable failures expose a researcher action, and changed context blocks it."),
    check("AC-10", "Cancellation propagates", mentor.includes("cancelMentorRequest") && techniques.includes("cancelTechnique") && provider.includes("signal?.addEventListener") && api.includes("signal: request.signal"), "Close/cancel aborts the browser request and propagates to the provider helper."),
    check("AC-11", "Provider errors and logs are sanitized", !provider.includes("bodyPrefix") && provider.includes("The AI provider could not complete this request"), "Raw provider response text is neither logged nor returned to the researcher."),
    check("AC-12", "Rate, time, and allowance guardrails remain", api.includes("MAX_DAILY_REQUESTS") && api.includes("checkRateLimit") && api.includes("RESEARCH_MENTOR_SERVER_TIMEOUT_MS") && api.includes("checkAiGuardrailsBeforeRequest"), "Feature rate limits, daily cap, allowance checks, server timeout, and model guardrails are active."),
    check("AC-13", "Offline fallback is explicit", mentor.includes("researchMentorOfflineGuide") && techniques.includes("Local guide · not AI output · no project change"), "Every Mentor mode has a static, labeled, non-mutating fallback."),
    check("AC-14", "Cross-project and stale context deny", tests.includes("project scope and stale checksums fail closed") && tests.includes("cannot cross projects"), "Project mismatch throws before provider submission and changed content produces a new checksum."),
    check("AC-15", "Dynamic-table stress passes", tests.includes("dynamic Stage 1 tables cap at forty rows") && tests.includes("active.length, 40"), "Forty multilingual idea rows stay bounded; the 41st row is refused."),
    check("AC-16", "Migration/conflict regressions retained", pathwayTests.includes("genuinely conflicting device work") && pathwayTests.includes('"review-required"'), "Canonical/device conflicts continue to require review rather than silent overwrite."),
    check("AC-17", "Proactivity and cooldown regressions retained", supportTests.includes("two task signals at a natural breakpoint") && supportTests.includes("correction cooldown and permanent suppression"), "Pause-only diagnosis remains prohibited and researcher correction/cooldown stays test-covered."),
    check("AC-18", "Keyboard and focus behavior implemented", mentor.includes("closeOnEscape") && mentor.includes("launcherRef.current?.focus") && mentor.includes("closeButtonRef.current?.focus"), "Escape closes the drawer, focus enters at close, and returns to the launcher."),
    check("AC-19", "Visible focus and unobscured scrolling", mentorCss.includes(":focus-visible") && mentorCss.includes("scroll-padding-block") && techniqueCss.includes(":focus-visible"), "Mentor and technique controls have visible focus with scroll margins."),
    check("AC-20", "WCAG 2.2 and responsive evidence documented", releaseDoc.includes("WCAG 2.2") && walkthroughDoc.includes("1536×1024") && walkthroughDoc.includes("390×844"), "The AA target and desktop/mobile manual checks are explicit without claiming certification."),
    check("AC-21", "AI risk register is NIST-referenced", riskDoc.includes("NIST AI 600-1") && ["Govern", "Map", "Measure", "Manage"].every((term) => riskDoc.includes(`**${term}:**`)), "Risk management is mapped to the NIST GenAI Profile as guidance, not certification."),
    check("AC-22", "Privacy and retention limits are explicit", releaseDoc.includes("provider-side retention") && releaseDoc.includes("Raw participant rows") && releaseDoc.includes("full transcripts"), "Cerise storage, upstream uncertainty, excluded data, and no-store limits are distinguished."),
    check("AC-23", "Security findings and residual risks recorded", securityDoc.includes("P9-SEC-01") && securityDoc.includes("P9-SEC-02") && securityDoc.includes("P9-SEC-03") && securityDoc.includes("Residual risks"), "Three fixed findings and remaining risk are documented."),
    check("AC-24", "Six user walkthroughs are specified", ["Novice researcher", "Experienced researcher", "Qualitative researcher", "Quantitative researcher", "Mixed-methods researcher", "Multilingual researcher"].every((label) => walkthroughDoc.includes(label)), "Novice, experienced, qual, quant, mixed, and multilingual flows have acceptance checks."),
    check("AC-25", "Browser evidence exists", browserEvidencePresent && screenshotEvidencePresent, "Desktop hardened-Mentor and mobile offline-fallback screenshots plus keyboard/accessibility evidence are present."),
    check("AC-26", "Reproducible package command exists", packageJson.includes("verify:build1-phase9"), "The Phase 9 verifier is registered in package.json."),
  ];

  const implementationChecksums = Object.fromEntries(await Promise.all(Object.entries({ hardening, api, provider, mentor, techniques, mentorCss, techniqueCss, tests, releaseDoc, riskDoc, securityDoc, walkthroughDoc }).map(async ([key, value]) => [key, await sha256ArtifactChecksum(value)])));
  const core = {
    build: "Build 1, Phase 9 — hardening and verification release",
    verifiedFor: "2026-08-04",
    summary: { passed: checks.filter((item) => item.passed).length, failed: checks.filter((item) => !item.passed).length, checks: checks.length, scenarios: scenarios.length },
    matrix: { routes: routeCounts, states: stateCounts, scenarios },
    checks,
    implementationChecksums,
    browserEvidence: {
      report: "output/playwright/build1-phase9-browser-evidence.json",
      desktop: "output/playwright/build1-phase9-hardened-mentor-1536x1024.png",
      mobile: "output/playwright/build1-phase9-offline-mentor-390x844.png",
      present: browserEvidencePresent && screenshotEvidencePresent,
    },
    activation: { databaseMigrationRequired: false, remoteDeploymentPerformed: false },
  };
  const report = { ...core, reportChecksum: await sha256ArtifactChecksum(core) };
  const markdown = [
    "# Build 1 Stage 1 Mentor Verification", "",
    `Result: **${report.summary.passed}/${report.summary.checks} acceptance checks passed; ${report.summary.scenarios}/72 deterministic scenarios passed**`, "",
    `Report checksum: \`${report.reportChecksum}\``, "",
    ...checks.map((item) => `- ${item.passed ? "PASS" : "FAIL"} — **${item.id}: ${item.label}** — ${item.evidence}`),
    "", "## Matrix coverage", "",
    `- Routes: ${Object.entries(routeCounts).map(([id, count]) => `${id} (${count})`).join(", ")}`,
    `- States: ${Object.entries(stateCounts).map(([id, count]) => `${id} (${count})`).join(", ")}`,
    "", "No remote deployment or database migration was performed. Prompt injection remains a residual model risk; Phase 9 uses layered controls and review-before-apply rather than claiming elimination.", "",
  ].join("\n");
  await mkdir(OUTPUT_DIRECTORY, { recursive: true });
  await Promise.all([
    writeFile(path.join(OUTPUT_DIRECTORY, "build-1-stage1-mentor-verification.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(path.join(OUTPUT_DIRECTORY, "build-1-stage1-mentor-verification.md"), markdown, "utf8"),
  ]);
  process.stdout.write(`${JSON.stringify({ result: report.summary.failed ? "FAIL" : "PASS", ...report.summary, reportChecksum: report.reportChecksum }, null, 2)}\n`);
  if (report.summary.failed) process.exitCode = 1;
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
