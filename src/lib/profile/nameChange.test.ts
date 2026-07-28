import assert from "node:assert/strict";
import test from "node:test";
import { displayRequestedName, validateNameChangeDraft } from "./nameChange";

test("requires a meaningful reason and first/last name", () => {
  assert.equal(
    validateNameChangeDraft({ firstName: "", middleName: "", lastName: "Vo", reason: "A sufficiently long reason" }),
    "First and last name are required.",
  );
  assert.equal(
    validateNameChangeDraft({ firstName: "Tue", middleName: "", lastName: "Vo", reason: "Too short" }),
    "Please explain the reason in at least 20 characters.",
  );
});

test("normalizes the requested display name", () => {
  assert.equal(
    displayRequestedName({ firstName: "  Tue ", middleName: " Linh   Duong ", lastName: " Vo " }),
    "Tue Linh Duong Vo",
  );
});
