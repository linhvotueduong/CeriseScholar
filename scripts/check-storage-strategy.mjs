import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const scanRoots = ["src", "scripts", "package.json", "AGENTS.md"];

const retiredNeedles = [
  ["LOCAL", "AGENT_"].join("_"),
  ["NEXT_PUBLIC_LOCAL", "AGENT"].join("_"),
  ["OLL", "AMA_"].join(""),
  ["local", "agent"].join("-"),
  ["Local", "Agent"].join(" "),
  ["Oll", "ama"].join(""),
  ["local", "vault"].join(" "),
  ["Local", "vault"].join(" "),
  ["local", "first", "agent", "migration"].join("-"),
  ["local", "agent", "installer", "plan"].join("-"),
  ["local", "file", "storage", "strategy"].join("-"),
];

const ignoredDirectories = new Set(["node_modules", ".next", ".git"]);
const ignoredExtensions = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".mp4",
  ".webm",
  ".woff",
  ".woff2",
]);

async function collectFiles(target, files = []) {
  const stats = await fs.stat(target).catch(() => null);
  if (!stats) return files;
  if (stats.isFile()) {
    if (!ignoredExtensions.has(path.extname(target).toLowerCase())) files.push(target);
    return files;
  }

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
for (const scanRoot of scanRoots) {
  await collectFiles(path.join(root, scanRoot), files);
}
const hits = [];

for (const file of files) {
  const relativeFile = path.relative(root, file);
  const text = await fs.readFile(file, "utf8").catch(() => "");
  if (!text) continue;

  const matchedNeedles = retiredNeedles.filter((needle) => text.includes(needle));
  if (matchedNeedles.length) hits.push(`${relativeFile} contains ${matchedNeedles.join(", ")}`);
}

if (hits.length) {
  console.error("Retired desktop-helper/storage references found in active code or contributor guidance:");
  for (const hit of hits) console.error(`- ${hit}`);
  console.error("");
  console.error("Phase 4 policy: source-file workflows are cloud-only through the hosted app and Supabase-backed storage.");
  console.error("Move historical notes to docs/archive/ and keep active code free of retired desktop AI paths.");
  process.exit(1);
}

console.log("Cloud-only storage strategy check passed.");
console.log("No active retired desktop-helper, desktop-model, or desktop-vault references found.");
