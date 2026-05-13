import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourceRoot = path.join(root, "src");

const allowedTransitionalCloudStorageFiles = new Set([
  "src/app/api/ocr/route.ts",
  "src/app/dashboard/page.tsx",
  "src/app/dashboard/project/[projectId]/page.tsx",
  "src/app/dashboard/project/[projectId]/viewer/[id]/page.tsx",
  "src/app/dashboard/upload/page.tsx",
  "src/app/dashboard/viewer/[id]/page.tsx",
  "src/components/pdf/DocumentPanel.tsx",
]);

const storageNeedles = [
  "supabase.storage",
  ".storage.from(",
  ".createSignedUrl(",
  ".createSignedUrls(",
  ".download(",
  ".upload(",
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

const files = await collectFiles(sourceRoot);
const hits = [];

for (const file of files) {
  const relativeFile = path.relative(root, file);
  const text = await fs.readFile(file, "utf8").catch(() => "");
  if (!text) continue;

  const matchedNeedles = storageNeedles.filter((needle) => text.includes(needle));
  if (matchedNeedles.length && !allowedTransitionalCloudStorageFiles.has(relativeFile)) {
    hits.push(`${relativeFile} contains ${matchedNeedles.join(", ")}`);
  }
}

if (hits.length) {
  console.error("New cloud source-file storage references found outside the approved transitional allowlist:");
  for (const hit of hits) console.error(`- ${hit}`);
  console.error("");
  console.error("Step 5 policy: new source-file workflows must use the Cerise Scholar Local Agent/vault path.");
  console.error("If this is an intentional transitional exception, update docs/local-file-storage-strategy.md first.");
  process.exit(1);
}

console.log("No unapproved cloud source-file storage references found.");
console.log("Approved transitional cloud storage files:");
for (const file of [...allowedTransitionalCloudStorageFiles].sort()) {
  console.log(`- ${file}`);
}
