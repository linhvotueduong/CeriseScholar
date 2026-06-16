# Cerise Scholar — Dashboard Technical Appendix

**Created:** 2026-06-16 · **Status:** DRAFT — design only, nothing here is implemented yet · **Maintained by:** Claude (architect role)

## What this document is

This is the **buildable translation** of `docs/dashboard-master-functional-spec-v2.md` into exact TypeScript types, the source-data → snapshot → UI pipeline, the Supabase fields we need, and a strictly phased task list. It exists so we never "build the whole dashboard in one giant pass" — each phase below is a small, verifiable slice.

Three companion docs, three altitudes:
- **`dashboard-master-functional-spec-v2.md`** — the spec (the *why* and the formulas). Source of truth.
- **`dashboard-metric-contract.md`** — plain-language card meanings (the *what*, for the non-technical owner).
- **this file** — the engineering contract (the *how*, in code shapes).

> **"dashboard" vs "User Dashboard":** per `AGENTS.md`, everything here is the single `/dashboard` cards page, not the whole User Dashboard umbrella.

---

## 1. Architecture (the spec's three rules, in code terms)

```
Supabase rows + local-agent status        ← truth
        │
        ▼
DashboardSourceData                        (raw rows; already exists in deriveDashboardState.ts)
        │   pure, deterministic, acyclic
        ▼
DashboardSnapshot                          (NEW: every card as CardState<T> + meta)
        │
        ▼
UI props (DashboardExactTemplate, …)       ← display only; no formulas in components
```

Spec rule mapping:
1. **DB + formulas = truth.** All numbers come from pure functions over `DashboardSourceData`. No card component computes a metric.
2. **AI never produces numbers.** AI only writes wording (greeting, task titles) and stores *structured signals* that formulas count. AI lives behind cached `project_ai_signals` rows (deferred, Phase H).
3. **Every card has a `dataState`.** Demo values never persist.

---

## 2. Core shared types (NEW — proposed `src/lib/dashboard/types.ts`)

```ts
/** A score in the inclusive range 0..1. */
export type Score01 = number;

/** Every card declares which kind of value it is showing. */
export type DataState = "real" | "empty" | "demo" | "upcoming" | "stale" | "error";

/**
 * Uniform wrapper for every card. `data` is ALWAYS present — for empty/error/upcoming
 * states it holds a deterministic fallback payload so the UI never crashes or shows fiction.
 */
export type CardState<T> = {
  dataState: DataState;
  data: T;
  /** Human-facing note for empty/upcoming/stale/error (e.g. "Add your first source"). */
  message?: string;
  /** For AI-influenced cards only (Greeting). Pure-formula cards omit it / use 1. */
  confidence?: Score01;
  lastComputedAt: string; // ISO
};

/** Helper builders keep dataState handling consistent. */
export const realCard  = <T,>(data: T, at: string): CardState<T> => ({ dataState: "real",  data, lastComputedAt: at });
export const emptyCard = <T,>(data: T, at: string, message?: string): CardState<T> => ({ dataState: "empty", data, message, lastComputedAt: at });
export const demoCard  = <T,>(data: T, at: string): CardState<T> => ({ dataState: "demo",  data, lastComputedAt: at });
```

Reuse, don't reinvent: `DashboardSourceData`, `DashboardSectionData`, `DashboardTask`, `DashboardActivityEvent`, `DashboardSectionId` already exist in `src/lib/dashboard/deriveDashboardState.ts` and stay as the input shapes. `DashboardTargetSettings` / `DashboardPaceMode` already exist in `src/lib/dashboard/targetPace.ts` and become the persisted settings shape (Phase B).

---

## 3. Per-card payload types (from the spec's "State contract" lines)

```ts
export type GreetingState        = { line1: string; line2: string; bestMove: string; avoidMove?: string };
export type CurrentProjectState  = { projectId: string; projectName: string; phaseBadge: string; currentSection: string; lastActivityAt: string | null; isPinned: boolean };
export type TodayTargetState     = { dailyTargetPercent: number; doneTodayPercent: number; remainingTodayPercent: number; ringProgress: Score01; deadlineAchievable: boolean; status: "on_track" | "behind" | "deadline_at_risk" | "complete"; daysLeft: number; expectedFinishLabel: string };
export type ActivityLogItem      = { id: string; title: string; subtitle: string; time: string; eventType: string };
export type ActivityLogState     = { items: ActivityLogItem[] };
export type LocalSetupState      = { readyCount: number; readyPercent: number; checks: Array<{ label: string; ready: boolean }>; deviceScoped: true; lastCheckedAt: string | null };
export type CalendarDay          = { day: string; isToday: boolean; isSelected: boolean; hasTasks: boolean; hasCheckpoint: boolean; inMonth: boolean };
export type ScheduleState        = { selectedDate: string; calendarDays: CalendarDay[]; recommendedTasks: DashboardTask[]; manualTasks: DashboardTask[]; deviceLaneTasks: DashboardTask[] };
export type SectionsState        = { selectedSection: DashboardSectionId; sections: DashboardSectionData[]; bottleneck: string[]; nextStep: string[]; route: string };
export type ResearchFocusState   = { recommendation: string; healthRows: Array<{ label: string; value: string; tone: "green" | "amber" | "purple" }>; watchPoint: string; estimatedMinutesRange: [number, number]; startNextMoveRoute: string };
export type ContinueLearningState= { courseStatus: "published" | "upcoming"; currentLesson: string; modulesCompleted: number; lessonsDone: number; notesCreated: number; lessonsRemaining: number; progressPercent: number; pace: "on_pace" | "behind" | "ahead" | "no_deadline" };
export type CeriseSupportState   = { requestSupportRoute: string; helpCenterRoute: string; currentContext?: string };
```

### The aggregate snapshot (NEW)

```ts
export type DashboardSnapshot = {
  projectId: string;
  computedAt: string;              // ISO
  usingDemo: boolean;              // true if ANY card is demo (drives the Phase-4 "Sample data" badge)
  projectProgress01: Score01;      // keystone, computed once and shared
  cards: {
    greeting:         CardState<GreetingState>;
    currentProject:   CardState<CurrentProjectState>;
    todayTarget:      CardState<TodayTargetState>;
    schedule:         CardState<ScheduleState>;       // Today's Plan + Today's Schedule
    activityLog:      CardState<ActivityLogState>;
    localSetup:       CardState<LocalSetupState>;
    sections:         CardState<SectionsState>;       // Research Sections + Section Details
    researchFocus:    CardState<ResearchFocusState>;
    continueLearning: CardState<ContinueLearningState>;
    support:          CardState<CeriseSupportState>;
  };
};
```

> The current `DashboardDerivedState` stays during migration; the snapshot is built *alongside* it first (Phase A), then cards switch over one at a time so nothing breaks.

---

## 4. Keystone + evaluation order (acyclic — no card reads a later card)

Implement as small pure helpers under `src/lib/dashboard/`, called in this exact order:

| # | Function (proposed) | Produces |
|---|---|---|
| 1 | `projectFacts(settings, project, events)` | current section, last *meaningful* activity (excludes `project_opened`/`dashboard_loaded`) |
| 2 | `sectionProgress(source)` | per-section `Score01` (refactor of today's `workspaceProgress`, `literatureProgress`, … ) |
| 3 | `projectProgress01(sectionProgress, type, applicability)` | **keystone** (see spec §Keystone) |
| 4 | `researchHealth(source, sectionProgress)` | evidenceBalance / citationCoverage / themeClarity / draftReadiness |
| 5 | `researchFocus(health, sectionProgress, pace)` | bottleneck + best next move (**must not read schedule** — that back-edge is removed) |
| 6 | `recommendSchedule(...)` | exactly **4** recommended tasks; pace changes intensity, not count |
| 7 | `todayTarget(projectProgress01, settings, today)` | ring/target/status (see spec §Today's Target ts block) |
| 8 | `activityLog(events)` | top 4 meaningful, deduped in 30-min buckets |
| 9 | `greeting(snapshot)` + `continueLearning(courses)` | computed last (greeting summarizes the snapshot) |

`projectProgress01` per spec — implement verbatim, with weights keyed by project type and **applicability** so a non-meta project marks `meta-analysis` `not_applicable` and it's excluded from the denominator:

```ts
function projectProgress01(sectionProgress, type, applicability): Score01 {
  const weights = PROJECT_PROGRESS_WEIGHTS[type];
  const active = Object.entries(weights).filter(([id]) => applicability[id] !== false);
  const weightSum = active.reduce((s, [, w]) => s + w, 0);
  if (weightSum === 0) return 0;
  return active.reduce((s, [id, w]) => s + (sectionProgress[id] ?? 0) * (w / weightSum), 0);
}
```

**Open item (Phase D):** `projects` has no `type`/applicability field today. Options: add a `project_type` + `section_applicability` (JSONB) to `dashboard_project_settings`, or default every project to "all sections applicable" until project types exist. *Recommendation:* default-to-applicable now; add the field when project types are introduced.

---

## 5. Supabase changes (DRAFTS — not applied)

> **Apply via the dashboard SQL Editor, not `supabase db push`** (per `backend-foundation-roadmap.md` §caution — live migration history is reconciled but the safe path is the editor). Next free migration number is **016** (015 = profiles). All additive + idempotent.

### 5a. `dashboard_project_settings` — add pacing fields (Phase B)

Current columns (live): `current_section_id`, `preferred_daily_minutes` (=dailyWorkGoalMinutes), `target_completion_date` (=deadlineDate). Add:

```sql
-- 016_dashboard_target_pacing.sql (DRAFT)
ALTER TABLE public.dashboard_project_settings
  ADD COLUMN IF NOT EXISTS pace                  TEXT NOT NULL DEFAULT 'low'
    CHECK (pace IN ('low','moderate','high')),
  ADD COLUMN IF NOT EXISTS work_weekdays         SMALLINT[] NOT NULL DEFAULT '{1,2,3,4,5}', -- 0=Sun..6=Sat
  ADD COLUMN IF NOT EXISTS skipped_dates         DATE[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS manual_target_date    DATE,        -- override applies to ONE date only
  ADD COLUMN IF NOT EXISTS manual_target_percent NUMERIC;
```

**UI ↔ DB field mapping** (so `targetPace.ts` and the DB agree):

| `DashboardTargetSettings` (UI) | DB column | Note |
|---|---|---|
| `deadlineDate` | `target_completion_date` | rename in code or alias on read |
| `paceMode` | `pace` | ⚠️ UI default is `"high"`, spec/DB default is `"low"` — **pick one** (rec: keep UI's `high` as the *seed* but DB default `low`) |
| `workDaysPerWeek` (a count) | `work_weekdays` (array) | ⚠️ UI stores a count; spec wants specific weekdays for `skipped_dates` math — **rec: upgrade UI to the array** in Phase B |
| `dailyWorkGoalMinutes` | `preferred_daily_minutes` | already exists |
| `manualOverride` + `manualTargetPercent` | `manual_target_date` + `manual_target_percent` | add the date so override is per-day per spec |

### 5b. `dashboard_tasks` — recommendation fields (DEFERRED, Phase C)

```sql
-- DEFERRED until the schedule recommendation engine (Phase C)
ALTER TABLE public.dashboard_tasks
  ADD COLUMN IF NOT EXISTS task_weight                NUMERIC,
  ADD COLUMN IF NOT EXISTS counts_toward_daily_target BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS origin                     TEXT NOT NULL DEFAULT 'default', -- default|recommended|manual
  ADD COLUMN IF NOT EXISTS recommendation_run_id      UUID,
  ADD COLUMN IF NOT EXISTS input_hash                 TEXT,
  ADD COLUMN IF NOT EXISTS estimated_minutes          INT,
  ADD COLUMN IF NOT EXISTS difficulty                 TEXT;            -- easy|medium|hard
```
Manual tasks default `counts_toward_daily_target=false` unless the user opts in (spec §Schedule interactions).

### 5c. `project_ai_signals` — cached AI signals (DEFERRED, Phase H)

```sql
-- DEFERRED until AI phase (only after deterministic formulas work)
CREATE TABLE IF NOT EXISTS public.project_ai_signals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id    UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  signal_type   TEXT NOT NULL,   -- themeTags|methodLabels|weakRows|uncitedClaims|...
  payload       JSONB NOT NULL,
  confidence    NUMERIC,
  input_hash    TEXT,            -- reuse cached run when unchanged
  model_version TEXT,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- + ENABLE RLS, owner-only select/insert/update/delete, index (project_id, signal_type)
```

---

## 6. Demo / real invariants (must be enforced + testable)

- Demo rows are id-prefixed `demo-`; demo is built by `buildDemoDashboardSourceData` and passed through the **same** derivation path as real data.
- **Real always wins:** if `hasProjectDashboardData(real)` is true, demo never replaces real research metrics. Demo may *fill* genuinely empty sub-areas (tasks/activity) only when there is no real signal — which is what Codex's current `applyDemoDashboardFallback` does.
- Any demo-filled card must surface `dataState: "demo"` so the **Phase-4 "Sample data" badge** can show. (Today there is no `dataState`, so the badge can't exist yet — that's why CardState comes first.)
- Demo never writes to the database (`useDashboardState` already guards persistence behind `persistenceReady`/`usingDemo`).

---

## 7. Phased task list (each phase = one scoped, checkpointed slice)

Order follows the spec's "Implementation order" + the roadmap's Phases 4–5. **Do not combine phases.**

- **Phase A — Foundation types (no behavior change).** Add `src/lib/dashboard/types.ts` (`CardState`, `DataState`, `DashboardSnapshot`, payload types). Build the snapshot *alongside* the existing `DashboardDerivedState` from the same source data. Wire nothing into the UI yet. *Verify: `tsc`, `eslint`; dashboard renders identically.*
- **Phase B — Persist Today's Target + wire `dashboard_project_settings`.** Apply migration 016; read/write settings in `useDashboardState`; move `targetPace.ts` from UI-local state to persisted settings; compute `todayTarget` from `projectProgress01` + pace/deadline (replaces Codex's `todayWorkUnits/10*target` stopgap). *This is the smallest real per-user win.*
- **Phase C — Today's Schedule recommendation engine.** Apply 5b fields; `recommendSchedule()` returns exactly 4 tasks; pace changes intensity not count; reuse run when `input_hash` unchanged.
- **Phase D — Research Sections check catalog + bottleneck/nextStep engine.** Formal `SectionCheck` (0–1) catalog with `blocks` graph; `sectionProgress01`, `bottleneckScore`, `nextStepScore`; applicability handling.
- **Phase E — Research Focus from formula health scores.** Remove the schedule back-edge; health rows always render even if AI fails.
- **Phase F — Activity Log + Greeting + Current Project finalized on the snapshot.** 30-min dedupe; meaningful-event filter; replace Codex's hardcoded `RECENT_CHANGE_FALLBACKS` with a real empty state.
- **Phase G — Continue Learning published/upcoming.** Real course progress; unpublished → "Upcoming", no fake progress.
- **Phase H — AI cached signals.** `project_ai_signals` table; AI wording + tagging only; deterministic fallback when confidence < 0.60 or AI fails.

---

## 8. Reconciliation with what's already built (Codex's uncommitted work)

| Current code | Keep / change |
|---|---|
| `targetPace.ts` (pace math) | **Keep** — good foundation; needs persistence + snapshot integration (Phase B). Currently UI-local only. |
| Today's Target `todayWorkUnits/10*target` | **Replace** in Phase B with spec's `projectProgress01` + pace model. |
| `recentChanges` builder (Activity Log) | **Keep shape**; add `dataState`, 30-min dedupe, and a real empty state (drop `RECENT_CHANGE_FALLBACKS`) in Phase F. |
| `applyDemoDashboardFallback` granularity | **Keep**; surface `dataState:"demo"` for the badge (Phase A enables it, Phase 4/roadmap shows it). |
| `deriveDashboardState` monolith | **Wrap, don't rewrite** — emit a `DashboardSnapshot` next to it, migrate cards incrementally. |

### Metric-contract decisions the spec already answers
- **Decision 2 (Today's Target):** spec confirms the redefinition → pace + deadline + daily goal. ✅ adopt.
- **Decision 6 (Cerise Support):** spec confirms static routing card. ✅ keep static.
- **Decision 7 (demo mixing):** spec confirms explicit demo, real-wins, never persist. ✅ adopt.
- Decisions 1, 4, 5 (activity weights, weekly bar, blend weights) remain the owner's to confirm; the spec doesn't override them.

---

## 9. Verification protocol (every slice)

```bash
npx eslint <changed files>
git diff --check -- <changed files>
npx tsc --noEmit --pretty false        # for TypeScript changes
# preview: http://127.0.0.1:3020  (a dev server is already running on 3020)
```
Plus the spec's acceptance tests (§Acceptance tests) — especially: no project → honest empty states; new project → 4 foundation tasks; pace change keeps 4 tasks; local agent offline → no crash; AI fails → numbers still render; impossible deadline → "Deadline at risk".

**Worktree hygiene:** the tree is dirty (Codex dashboard edits + doc edits, interleaved). Only stage files for the active phase. **Never** `git add .`, `git reset --hard`, `git checkout --`, or broad cleanup.
