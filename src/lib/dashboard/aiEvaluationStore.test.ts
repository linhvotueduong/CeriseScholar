import { test } from "node:test";
import assert from "node:assert/strict";
import { isProgressFeedbackVerdict } from "./aiEvaluationStore";

test("only the three valid verdicts are accepted", () => {
  for (const v of ["too_high", "about_right", "too_low"]) {
    assert.equal(isProgressFeedbackVerdict(v), true, v);
  }
  for (const v of ["", "high", "ok", "TOO_HIGH", null, undefined, 1, {}]) {
    assert.equal(isProgressFeedbackVerdict(v), false, String(v));
  }
});
