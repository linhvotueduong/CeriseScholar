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

const ignoredDirectories = new Set(["node_modules", ".next", ".git"]);
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

const hits = [];
for (const file of files) {
  const text = await fs.readFile(file, "utf8").catch(() => "");
  if (!text) continue;
  for (const needle of forbidden) {
    if (text.includes(needle)) {
      hits.push(`${path.relative(root, file)} contains ${needle}`);
    }
  }
}

if (hits.length) {
  console.error("Legacy wrong-app references found in active production paths:");
  for (const hit of hits) console.error(`- ${hit}`);
  process.exit(1);
}

console.log("No legacy wrong-app references found in active production paths.");
