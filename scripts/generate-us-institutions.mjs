import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";

const inputPath = process.argv[2];
if (!inputPath) {
  throw new Error("Usage: node scripts/generate-us-institutions.mjs /path/to/HD2024.csv");
}

const csv = fs.readFileSync(path.resolve(inputPath), "utf8").replace(/^\uFEFF/, "");
const { data, errors } = Papa.parse(csv, { header: true, skipEmptyLines: true });
if (errors.length) {
  throw new Error(`IPEDS CSV parsing failed: ${errors[0].message}`);
}

const institutionsById = new Map();
for (const row of data) {
  if (row.CYACTIVE !== "1" || row.POSTSEC !== "1") continue;
  const unitId = Number(row.UNITID);
  const name = row.INSTNM?.trim();
  const state = row.STABBR?.trim();
  if (!Number.isInteger(unitId) || !name || !state) continue;
  institutionsById.set(unitId, [unitId, name, state]);
}

const institutions = [...institutionsById.values()].sort((left, right) =>
  left[1].localeCompare(right[1]) || left[0] - right[0]
);
const output = {
  source: "U.S. Department of Education NCES/IPEDS HD2024",
  sourceUrl: "https://nces.ed.gov/ipeds/datacenter/data/HD2024.zip",
  dataYear: 2024,
  institutions,
};
const outputPath = path.resolve("src/data/us-institutions.min.json");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(output)}\n`, "utf8");

console.log(`Wrote ${institutions.length} active U.S. institutions to ${outputPath}`);
