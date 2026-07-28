import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeInstitutionQuery,
  searchUsInstitutions,
  type UsInstitutionDirectoryEntry,
} from "./institutions";

const directory: readonly UsInstitutionDirectoryEntry[] = [
  [100654, "Alabama A & M University", "AL"],
  [132903, "University of Central Florida", "FL"],
  [133872, "College of Central Florida", "FL"],
  [166027, "Harvard University", "MA"],
];

test("normalizes punctuation, accents, and ampersands for local matching", () => {
  assert.equal(normalizeInstitutionQuery("  Alabama A & M  "), "alabama a and m");
  assert.equal(normalizeInstitutionQuery("Université"), "universite");
});

test("ranks an exact U.S. institution name before partial matches", () => {
  const result = searchUsInstitutions(directory, "University of Central Florida");

  assert.equal(result[0].unitId, "132903");
  assert.equal(result[0].name, "University of Central Florida");
  assert.equal(result[0].state, "FL");
});

test("matches words in any order and limits local results", () => {
  const result = searchUsInstitutions(directory, "Florida Central", 1);

  assert.equal(result.length, 1);
  assert.equal(result[0].name, "College of Central Florida");
});

test("does not search until two normalized characters are present", () => {
  assert.deepEqual(searchUsInstitutions(directory, "u"), []);
});
