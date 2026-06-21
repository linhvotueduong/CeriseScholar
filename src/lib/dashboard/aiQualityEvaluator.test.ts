import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateResearchQuality, needsAiReview, type ResearchTextSample } from "./aiQualityEvaluator";

const note = (text: string, sourceLinked = true): ResearchTextSample => ({ text, kind: "note", sourceLinked });
const synth = (text: string): ResearchTextSample => ({ text, kind: "synthesis" });

test("longer fake notes are flagged placeholder / low quality", () => {
  const fakes = ["this is a test note", "testing the note feature here", "just trying this out to see"];
  const s = evaluateResearchQuality(fakes.map((t) => note(t)));
  assert.equal(s.isPlaceholder, true);
  assert.ok((s.noteMeaningfulness ?? 1) < 0.3, `noteMeaningfulness ${s.noteMeaningfulness}`);
});

test("genuine source-grounded notes (method/finding/limitation) are not penalized", () => {
  const real = [
    note("The study found a strong, significant correlation between uncertainty and avoidance coping (p < 0.05)."),
    note("Method: randomized controlled trial with 240 participants over 12 weeks; results suggest a clear effect."),
    note("This source argues perceived uncertainty increases procrastination; a key limitation is the small sample."),
  ];
  const s = evaluateResearchQuality(real);
  assert.equal(s.isPlaceholder, false);
  assert.ok((s.noteMeaningfulness ?? 0) >= 0.7, `noteMeaningfulness ${s.noteMeaningfulness}`);
});

test("ANTI-GAMING: keyword stuffing (research words, no coherent claim) stays low", () => {
  const s = evaluateResearchQuality([
    note("study research evidence data finding method analysis significant correlation effect hypothesis"),
  ]);
  assert.ok(s.isPlaceholder === true || (s.noteMeaningfulness ?? 1) < 0.3, `noteMeaningfulness ${s.noteMeaningfulness}`);
});

test("ANTI-GAMING: academic-sounding but UNLINKED note is penalized via source grounding", () => {
  const linked = evaluateResearchQuality([note("The study demonstrates a significant effect of uncertainty on behavior.", true)]);
  const unlinked = evaluateResearchQuality([note("The study demonstrates a significant effect of uncertainty on behavior.", false)]);
  assert.equal(unlinked.sourceGrounded, 0);
  assert.equal(linked.sourceGrounded, 1);
});

test("ANTI-GAMING: source-linked but thin/vague note gets reduced (mid quality, flags review)", () => {
  const s = evaluateResearchQuality([note("This one is interesting and seems relevant to my topic.", true)]);
  assert.ok((s.noteMeaningfulness ?? 1) < 0.6, `should be mid/low: ${s.noteMeaningfulness}`);
  assert.equal(needsAiReview(s), true); // borderline -> candidate for a future Claude pass
});

test("genuine synthesis comparing two sources scores high", () => {
  const weak = evaluateResearchQuality([synth("just trying the synthesis box")]);
  assert.ok((weak.synthesisReadiness ?? 1) < 0.3);
  const strong = evaluateResearchQuality([
    synth("Compared across two studies, the evidence converges: Smith (2021) and Lee (2022) both find avoidance mediates the effect of uncertainty on delay."),
  ]);
  assert.ok((strong.synthesisReadiness ?? 0) >= 0.7, `synthesisReadiness ${strong.synthesisReadiness}`);
});

test("ANTI-GAMING: mostly-junk corpus with one real note stays conservative (placeholder)", () => {
  const s = evaluateResearchQuality([
    note("this is a test note"),
    note("testing"),
    note("just trying this out"),
    note("The study found a significant effect on outcomes."),
  ]);
  assert.equal(s.isPlaceholder, true); // 3 of 4 are junk
});

test("empty input never inflates: neutral low-confidence signals", () => {
  const s = evaluateResearchQuality([]);
  assert.equal(s.confidence, 0);
  assert.equal(s.isPlaceholder, undefined);
  assert.equal(s.noteMeaningfulness, undefined);
});
