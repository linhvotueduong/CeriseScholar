import { test } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchProfile } from "@/lib/profile/profile";
import {
  deleteEvidenceLibraryRow,
  fetchEvidenceLibraryRows,
  fetchScholarAskDedupeKeys,
  saveScholarAskEvidence,
} from "@/lib/research/evidenceLibrary";
import { EMPTY_RESEARCH_PATH_DRAFT } from "@/lib/research/researchPathDraft";
import { createStudyDesignDocument } from "@/lib/research/studyDesign";
import { fetchStudyDesign, upsertStudyDesign } from "@/lib/research/studyDesignPersistence";
import { createExperimentStudioDocument } from "@/lib/research/experimentStudio";
import { fetchExperimentStudio, upsertExperimentStudio } from "@/lib/research/experimentStudioPersistence";

function offlineClient(): SupabaseClient {
  const failed = () => Promise.reject(new TypeError("Failed to fetch"));
  const builder: Record<string, unknown> = {};

  for (const method of ["delete", "eq", "insert", "order", "select", "upsert"]) {
    builder[method] = () => builder;
  }
  builder.maybeSingle = failed;
  builder.single = failed;
  builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    failed().then(resolve, reject);

  return { from: () => builder } as unknown as SupabaseClient;
}

test("optional profile data fails open when Supabase is unreachable", async () => {
  assert.equal(await fetchProfile(offlineClient(), "user-1"), null);
});

test("ScholarAsk evidence reads fail open when Supabase is unreachable", async () => {
  const client = offlineClient();

  assert.deepEqual(await fetchEvidenceLibraryRows(client, "user-1"), []);
  assert.deepEqual([...await fetchScholarAskDedupeKeys(client, "user-1")], []);
});

test("ScholarAsk evidence writes report failure when Supabase is unreachable", async () => {
  const client = offlineClient();

  assert.equal(
    await saveScholarAskEvidence(client, {
      userId: "user-1",
      projectId: "project-1",
      title: "Example paper",
    }),
    null
  );
  assert.equal(await deleteEvidenceLibraryRow(client, "evidence-1"), false);
});

test("study-design persistence fails open when Supabase is unreachable", async () => {
  const client = offlineClient();
  const document = createStudyDesignDocument("project-1", EMPTY_RESEARCH_PATH_DRAFT);

  assert.equal(
    await fetchStudyDesign(client, "user-1", "project-1", EMPTY_RESEARCH_PATH_DRAFT),
    null,
  );
  assert.equal(await upsertStudyDesign(client, "user-1", document), false);
});

test("Experimental Studio persistence fails open when Supabase is unreachable", async () => {
  const client = offlineClient();
  const document = createExperimentStudioDocument("project-1");

  assert.equal(await fetchExperimentStudio(client, "user-1", "project-1"), null);
  assert.equal(await upsertExperimentStudio(client, "user-1", document), false);
});
