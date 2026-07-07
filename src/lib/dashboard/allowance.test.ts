import { test } from "node:test";
import assert from "node:assert/strict";
import { INCLUDED_MONTHLY_ALLOWANCE, allowanceExceeded, monthStartUtcIso } from "@/lib/ai/allowance";

test("INCLUDED_MONTHLY_ALLOWANCE is a positive finite number", () => {
  assert.equal(typeof INCLUDED_MONTHLY_ALLOWANCE, "number");
  assert.ok(Number.isFinite(INCLUDED_MONTHLY_ALLOWANCE));
  assert.ok(INCLUDED_MONTHLY_ALLOWANCE > 0);
});

test("monthStartUtcIso returns midnight UTC on the 1st of the given month", () => {
  assert.equal(monthStartUtcIso(new Date("2026-07-15T13:45:30.000Z")), "2026-07-01T00:00:00.000Z");
  assert.equal(monthStartUtcIso(new Date("2026-01-01T00:00:00.000Z")), "2026-01-01T00:00:00.000Z");
});

test("monthStartUtcIso is stable across days within the same UTC month", () => {
  const first = monthStartUtcIso(new Date("2026-02-01T00:00:00.001Z"));
  const last = monthStartUtcIso(new Date("2026-02-28T23:59:59.999Z"));
  assert.equal(first, last);
});

test("allowanceExceeded is false below the allowance, true at and above it", () => {
  assert.equal(allowanceExceeded(0, 150), false);
  assert.equal(allowanceExceeded(149, 150), false);
  assert.equal(allowanceExceeded(150, 150), true);
  assert.equal(allowanceExceeded(151, 150), true);
});

test("allowanceExceeded defaults to INCLUDED_MONTHLY_ALLOWANCE when no allowance is given", () => {
  assert.equal(allowanceExceeded(0), false);
  assert.equal(allowanceExceeded(INCLUDED_MONTHLY_ALLOWANCE), true);
});

test("allowanceExceeded treats a zero allowance as always exceeded", () => {
  assert.equal(allowanceExceeded(0, 0), true);
});
