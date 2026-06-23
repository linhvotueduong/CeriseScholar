import { test } from "node:test";
import assert from "node:assert/strict";
import { applyDemoDashboardFallback } from "./demoDashboardData";
import type { DashboardSourceData, DashboardTask } from "./deriveDashboardState";

const params = { userId: "u1", projectId: "p1", now: new Date(2026, 5, 17) };

function blank(over: Partial<DashboardSourceData> = {}): DashboardSourceData {
  return {
    pdfs: [], highlights: [], annotations: [], literatureEntries: [], paperSections: [],
    metaAnalysis: null, codes: [], courseModules: [], courseVideos: [], courseProgress: [],
    courseNotes: [], tasks: [], activityEvents: [], ...over,
  };
}

const completedTask = (): DashboardTask => ({
  id: "t1", user_id: "u1", project_id: "p1", task_date: "2026-06-17", scheduled_time: "09:00",
  title: "x", subtitle: "", section_id: "literature-review", status: "completed", sort_order: 0,
  generation_key: "recommended:p1:2026-06-17:h:0", deleted_at: null, completed_at: "2026-06-17",
  created_at: "2026-06-17", updated_at: "2026-06-17",
});
const realActivity = () => ({ id: "a1", user_id: "u1", project_id: "p1", event_type: "source_uploaded", section_id: "workspace", label: "Added source", created_at: "2026-06-17" });

test("real project with real tasks/activity -> nothing is demo (real wins)", () => {
  const res = applyDemoDashboardFallback(blank({ pdfs: [{}], tasks: [completedTask()], activityEvents: [realActivity()] }), params);
  assert.deepEqual(res.demo, { usingDemo: false, research: false, schedule: false, activity: false });
  assert.equal(res.data.tasks.length, 1); // real task kept, not replaced
});

test("real project, no tasks/activity -> only schedule + activity are demo; research stays real", () => {
  const res = applyDemoDashboardFallback(blank({ pdfs: [{}], literatureEntries: [{}] }), params);
  assert.deepEqual(res.demo, { usingDemo: true, research: false, schedule: true, activity: true });
  assert.ok(res.data.tasks.length > 0); // filled with demo tasks
});

test("real project with activity signal but no tasks -> NOT demo (preserves prior behavior)", () => {
  const res = applyDemoDashboardFallback(blank({ pdfs: [{}], activityEvents: [realActivity()] }), params);
  assert.equal(res.usingDemo, false);
  assert.deepEqual(res.demo, { usingDemo: false, research: false, schedule: false, activity: false });
});

test("empty project -> full demo (research + schedule + activity)", () => {
  const res = applyDemoDashboardFallback(blank(), params);
  assert.deepEqual(res.demo, { usingDemo: true, research: true, schedule: true, activity: true });
});

test("empty project but user has a real task -> research+activity demo, schedule real (real wins)", () => {
  const res = applyDemoDashboardFallback(blank({ tasks: [completedTask()] }), params);
  assert.equal(res.demo.research, true);
  assert.equal(res.demo.schedule, false); // real task kept
  assert.equal(res.demo.activity, true);
  assert.ok(res.data.tasks.some((t) => t.completed_at)); // the real task survived
});

test("usingDemo equals OR of the three source flags", () => {
  for (const data of [blank(), blank({ pdfs: [{}] }), blank({ pdfs: [{}], tasks: [completedTask()], activityEvents: [realActivity()] })]) {
    const { demo } = applyDemoDashboardFallback(data, params);
    assert.equal(demo.usingDemo, demo.research || demo.schedule || demo.activity);
  }
});
