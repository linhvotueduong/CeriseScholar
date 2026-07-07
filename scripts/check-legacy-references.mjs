import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const activeTargets = [
  ".github/workflows",
  "src",
  "package.json",
  "next.config.ts",
  "middleware.ts",
  "public",
];

// Additional targets scanned ONLY by the case-insensitive content-drift check below,
// not by the exact-string wrong-app-name `forbidden` check above. docs/ legitimately
// contains historical mentions of the old wrong-app name (quarantine/transfer notes),
// so it stays out of that check's scope; it's only added for retired-architecture
// content drift, which has its own historical-reference allowlist.
const contentDriftOnlyTargets = ["docs"];

const block = (...parts) => parts.join("");

const forbidden = [
  block("Sch", "olara"),
  block("sch", "olara_"),
  block("Cerise", "ScholarApp"),
  block("Sch", "olaraApp"),
  block("icy", "-sky"),
  block("/Users/mrperfect/Documents/", "Website"),
  block("linhvotueduong/", "cerise-scholar"),
];

// Case-insensitive content-drift check: catches stale copy/config/docs that still
// describe the retired local-agent / local-first / Ollama architecture (retired in
// the 2026-07 OpenRouter pivot, see docs/architecture-pivot-roadmap.md). Matched
// case-insensitively because drift shows up in prose with inconsistent casing
// ("Local AI", "local ai", etc.), unlike the exact-string `forbidden` list above.
const contentDriftPatterns = [
  "local agent",
  "local ai",
  "local-first",
  "ollama",
  "desktop helper",
  "local vault",
];

// Docs whose entire purpose is documenting the retired architecture's history
// (pivot rationale, quarantine/transfer notes, or audits of this exact drift) are
// expected to mention these terms. That's not content drift, so they're exempt.
const historicalReferenceAllowlist = new Set([
  "docs/architecture-pivot-roadmap.md",
  "docs/ai-usage-card-spec.md",
  "docs/legacy-vite-quarantine.md",
  "docs/legacy-vite-transfer-manifest.md",
  "docs/research-readiness-handoff.md",
  "docs/portal-readiness-audit-2026-07-07.md",
  // "Local AI Voice" here names a proposed Kokoro TTS voice option, unrelated to the
  // retired local-agent architecture - not drift, just a naming collision.
  "docs/kokoro-tts-handoff.md",
]);

// TEMPORARY allowlist added 2026-07-07 while extending this content-drift check.
// These files have real stale local-agent/local-first/Ollama references but are out
// of scope for this pass: src/components/auth/* and src/app/settings/* are being
// edited concurrently by other agents right now; the rest (other src/app pages, the
// dashboard spec/contract docs, and the Azure deploy workflow's OLLAMA_* secrets) are
// outside this task's listed file scope. Fix the underlying copy/config, then remove
// the entry so the check actually covers the file again.
// TODO: remove each entry as its file is corrected.
const temporaryContentDriftAllowlist = new Set([
  "src/app/page.tsx",
  "src/app/research-desk/page.tsx",
  "src/app/dashboard/account/page.tsx",
  "src/app/settings/privacy-security/page.tsx",
  "src/components/auth/SignupForm.tsx",
  "src/components/auth/LoginForm.tsx",
  "docs/backend-foundation-roadmap.md",
  "docs/dashboard-technical-appendix.md",
  "docs/dashboard-master-functional-spec-v2.md",
  "docs/dashboard-metric-contract.md",
  ".github/workflows/azure-static-web-apps-thankful-desert-03241fd0f.yml",
]);

const ignoredDirectories = new Set(["node_modules", ".next", ".git", "archive"]);
const ignoredExtensions = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".mp4", ".webm", ".woff", ".woff2"]);

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function collectFiles(target, files = []) {
  const stat = await fs.stat(target);
  if (stat.isFile()) {
    files.push(target);
    return files;
  }

  if (!stat.isDirectory()) return files;

  const entries = await fs.readdir(target, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const entryPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(entryPath, files);
    } else if (!ignoredExtensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(entryPath);
    }
  }
  return files;
}

const files = [];
for (const relativeTarget of activeTargets) {
  const absoluteTarget = path.join(root, relativeTarget);
  if (await exists(absoluteTarget)) {
    await collectFiles(absoluteTarget, files);
  }
}

const contentDriftOnlyFiles = [];
for (const relativeTarget of contentDriftOnlyTargets) {
  const absoluteTarget = path.join(root, relativeTarget);
  if (await exists(absoluteTarget)) {
    await collectFiles(absoluteTarget, contentDriftOnlyFiles);
  }
}

const hits = [];
for (const file of files) {
  const text = await fs.readFile(file, "utf8").catch(() => "");
  if (!text) continue;
  const relativePath = path.relative(root, file);

  for (const needle of forbidden) {
    if (text.includes(needle)) {
      hits.push(`${relativePath} contains ${needle}`);
    }
  }

  if (historicalReferenceAllowlist.has(relativePath) || temporaryContentDriftAllowlist.has(relativePath)) {
    continue;
  }

  const lowerText = text.toLowerCase();
  for (const needle of contentDriftPatterns) {
    if (lowerText.includes(needle)) {
      hits.push(`${relativePath} contains retired-architecture reference "${needle}"`);
    }
  }
}

for (const file of contentDriftOnlyFiles) {
  const text = await fs.readFile(file, "utf8").catch(() => "");
  if (!text) continue;
  const relativePath = path.relative(root, file);

  if (historicalReferenceAllowlist.has(relativePath) || temporaryContentDriftAllowlist.has(relativePath)) {
    continue;
  }

  const lowerText = text.toLowerCase();
  for (const needle of contentDriftPatterns) {
    if (lowerText.includes(needle)) {
      hits.push(`${relativePath} contains retired-architecture reference "${needle}"`);
    }
  }
}

if (hits.length) {
  console.error("Legacy wrong-app references found in active production paths:");
  for (const hit of hits) console.error(`- ${hit}`);
  process.exit(1);
}

console.log("No legacy wrong-app references found in active production paths.");
