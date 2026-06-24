import { test } from "node:test";
import assert from "node:assert/strict";
import { computeContinueLearning } from "./deriveDashboardState";

type Row = Record<string, unknown>;
const mod = (id: string, order: number, isPublished = true): Row => ({ id, title: `Module ${id}`, module_order: order, is_published: isPublished });
const vid = (id: string, moduleId: string, order: number, title = `Lesson ${id}`): Row => ({ id, module_id: moduleId, title, video_order: order });
const watched = (videoId: string): Row => ({ video_id: videoId, watched_at: "2026-06-01" });
const note = (videoId: string): Row => ({ video_id: videoId });
const run = (modules: Row[], videos: Row[], progress: Row[] = [], notes: Row[] = []) =>
  computeContinueLearning({ modules, videos, progress, notes });

test("no catalog -> no_catalog, 0% progress, honest copy", () => {
  const r = run([], []);
  assert.equal(r.status, "no_catalog");
  assert.equal(r.progress, 0);
  assert.match(r.lesson, /no lessons available/i);
  assert.deepEqual(r.stats[3], ["0", "Earned badges", "earned"]);
});

test("real catalog + 0 watched -> not_started, 0%, first lesson, UNTAGGED honest empty", () => {
  const r = run([mod("m1", 1)], [vid("v1", "m1", 1), vid("v2", "m1", 2)]);
  assert.equal(r.status, "not_started");
  assert.equal(r.progress, 0);
  assert.equal(r.lesson, "Lesson v1");
  assert.equal(r.lessonNumber, "1.1.1");
  assert.equal(r.lessonTitle, "Lesson v1");
  assert.equal(r.sectionLabel, "Section 1.1 — Module m1");
  assert.equal(r.moduleLabel, "Module 1 — Module m1");
  assert.equal(r.outputLabel, "Output — Save this lesson artifact");
  assert.match(r.body, /2 lessons available/);
  assert.equal(r.statusLabel, "Not started");
  assert.deepEqual(r.stats[1], ["0", "Lessons", "done"]);
  assert.deepEqual(r.stats[3], ["0", "Earned badges", "earned"]);
});

test("current lesson hierarchy prefers explicit course-section metadata when present", () => {
  const r = run(
    [mod("m9", 9)],
    [
      {
        ...vid("v9", "m9", 2, "APA Reference From Lit Review Table"),
        lesson_number: "9.1.2",
        section_number: "9.1",
        section_title: "APA and References",
        student_output: "APA reference from Lit Review Table",
      },
    ]
  );
  assert.equal(r.lessonNumber, "9.1.2");
  assert.equal(r.lessonTitle, "APA Reference From Lit Review Table");
  assert.equal(r.sectionLabel, "Section 9.1 — APA and References");
  assert.equal(r.moduleLabel, "Module 9 — Module m9");
  assert.equal(r.outputLabel, "Output — APA reference from Lit Review Table");
});

test("partial progress -> in_progress, correct %, next unwatched lesson", () => {
  const r = run(
    [mod("m1", 1)],
    [vid("v1", "m1", 1), vid("v2", "m1", 2), vid("v3", "m1", 3)],
    [watched("v1")],
    [note("v1")]
  );
  assert.equal(r.status, "in_progress");
  assert.equal(r.progress, 33);
  assert.equal(r.lesson, "Lesson v2");
  assert.match(r.body, /1 of 3 lessons complete/);
  assert.deepEqual(r.stats[1], ["1", "Lessons", "done"]);
  assert.deepEqual(r.stats[2], ["1", "Notes", "created"]);
  assert.deepEqual(r.stats[3], ["0", "Earned badges", "earned"]);
  assert.equal(r.stats[0][0], "0"); // module not fully watched
});

test("all published watched (no upcoming) -> complete, 100%, module counts as completed", () => {
  const r = run([mod("m1", 1)], [vid("v1", "m1", 1), vid("v2", "m1", 2)], [watched("v1"), watched("v2")]);
  assert.equal(r.status, "complete");
  assert.equal(r.progress, 100);
  assert.match(r.body, /completed every published lesson/i);
  assert.equal(r.stats[0][0], "1");
  assert.deepEqual(r.stats[3], ["1", "Earned badges", "earned"]);
});

test("upcoming-only (no published lessons) -> coming_soon, 0%, no earned badges", () => {
  const r = run([], [vid("u1", "m_future", 1)]);
  assert.equal(r.status, "coming_soon");
  assert.equal(r.progress, 0);
  assert.match(r.lesson, /coming soon/i);
  assert.deepEqual(r.stats[3], ["0", "Earned badges", "earned"]);
  assert.equal(r.stats[0][0], "0");
});

test("mixed published/upcoming -> upcoming never counts toward progress or earned badges", () => {
  const r = run(
    [mod("m1", 1)],
    [vid("v1", "m1", 1), vid("v2", "m1", 2), vid("u1", "m_future", 1), vid("u2", "m_future", 2), vid("u3", "m_future", 3)],
    [watched("v1")]
  );
  assert.equal(r.status, "in_progress");
  assert.equal(r.progress, 50); // 1 of 2 published, NOT 1 of 5
  assert.deepEqual(r.stats[3], ["0", "Earned badges", "earned"]);
});

test("caught up on published but upcoming exists -> 'caught up, coming soon' and badge earned", () => {
  const r = run([mod("m1", 1)], [vid("v1", "m1", 1), vid("v2", "m1", 2), vid("u1", "m_future", 1)], [watched("v1"), watched("v2")]);
  assert.equal(r.status, "complete");
  assert.equal(r.progress, 100);
  assert.match(r.body, /caught up\. New lessons are coming soon/i);
  assert.deepEqual(r.stats[3], ["1", "Earned badges", "earned"]);
});

test("modules completed counts only fully-watched modules", () => {
  const r = run(
    [mod("m1", 1), mod("m2", 2)],
    [vid("v1", "m1", 1), vid("v2", "m1", 2), vid("v3", "m2", 1), vid("v4", "m2", 2)],
    [watched("v1"), watched("v2"), watched("v3")] // m1 fully watched, m2 partial
  );
  assert.equal(r.stats[0][0], "1");
});

test("current lesson respects module order then lesson order", () => {
  const r = run(
    [mod("m1", 2), mod("m2", 1)],
    [vid("v1", "m1", 1, "From M1"), vid("v2", "m2", 1, "From M2")]
  );
  assert.equal(r.lesson, "From M2"); // m2 has the lower module_order
});
