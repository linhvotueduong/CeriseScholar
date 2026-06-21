import { test } from "node:test";
import assert from "node:assert/strict";
import { isMeaningfulText, isPlaceholderText, isMeaningfulLabel, isMeaningfulEvidenceNote } from "./meaningfulWork";

test("placeholder/test text is detected", () => {
  for (const t of ["", "  ", "hello", "hi", "hello hi", "test", "asdf", "asdfasdf", "aaaa", "....", "n/a", "todo", "a b c"]) {
    assert.equal(isPlaceholderText(t), true, `expected placeholder: "${t}"`);
  }
});

test("real research text is not placeholder", () => {
  for (const t of [
    "The study found a significant correlation between stress and procrastination.",
    "Method: randomized controlled trial with 240 participants over 12 weeks.",
  ]) {
    assert.equal(isPlaceholderText(t), false, `expected meaningful: "${t}"`);
  }
});

test("placeholder notes count as 0 meaningful work", () => {
  assert.equal(isMeaningfulText("hello hi"), false);
  assert.equal(isMeaningfulText("test"), false);
  assert.equal(isMeaningfulText("asdf"), false);
  assert.equal(isMeaningfulText(""), false);
  assert.equal(isMeaningfulText(null), false);
});

test("meaningful text needs enough length and words", () => {
  assert.equal(isMeaningfulText("ok good"), false); // too short
  assert.equal(isMeaningfulText("This is a real evidence note about the finding."), true);
});

test("a note counts only when meaningful AND source-linked", () => {
  const note = "This source argues that uncertainty increases avoidance behavior.";
  assert.equal(isMeaningfulEvidenceNote(note, false), false); // not linked
  assert.equal(isMeaningfulEvidenceNote(note, true), true); // linked + meaningful
  assert.equal(isMeaningfulEvidenceNote("hello hi", true), false); // linked but placeholder
});

test("labels (codes/themes) reject placeholder/blank", () => {
  assert.equal(isMeaningfulLabel("c"), false);
  assert.equal(isMeaningfulLabel("test"), false);
  assert.equal(isMeaningfulLabel("Avoidance Coping"), true);
});
