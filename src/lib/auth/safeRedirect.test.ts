import assert from "node:assert/strict";
import test from "node:test";
import { safeInternalPath } from "./safeRedirect";

test("accepts account callback paths and preserves their query", () => {
  assert.equal(
    safeInternalPath("/settings/account?email=verified"),
    "/settings/account?email=verified",
  );
});

test("rejects external and scheme-relative callback destinations", () => {
  assert.equal(safeInternalPath("https://example.com"), null);
  assert.equal(safeInternalPath("//example.com"), null);
  assert.equal(safeInternalPath("/\\example.com"), null);
});
