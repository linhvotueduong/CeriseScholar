# Claude Code Directive: Cerise Dashboard Foundation

Date: 2026-06-14
Repo: `/Users/mrperfect/Documents/CeriseScholar`

## Role

You are assisting with the Cerise Scholar dashboard foundation. Treat this as architecture and implementation coordination, not visual redesign.

The current goal is real per-user dashboard statistics. The dashboard should eventually show what the signed-in user has done today, their tasks, project progress, learning progress, setup status, and recent activity. Before wiring complex card metrics, first make sure the auth/profile/database foundation is real and verified.

## Non-Negotiables

- Read existing code before changing anything.
- Preserve the locked design baseline in `docs/design-phase-storage-protocol.md`.
- Do not reshape dashboard cards, app shell, dark mode, spacing, full-screen layout, or half-screen layout while doing foundation work.
- Do not use `git add .`, broad checkout/reset commands, or destructive commands.
- Do not claim a Supabase table exists until a verify query proves it.
- Do not put formulas inside visual card components unless purely presentational.
- Keep the data pipeline: `DashboardSourceData -> DashboardDerivedState -> UI props`.
- Real user data wins. Demo/fallback data may help validate empty accounts, but must not overwrite meaningful real records.

## What Codex Already Audited

The app already has:

- Supabase Auth email/password login.
- Google OAuth login.
- Browser and server Supabase clients.
- Middleware protecting `/dashboard`, `/research-desk`, `/settings`, and `/admin`.
- User-owned tables in local migrations: `projects`, `pdfs`, `highlights`, `annotations`, `literature_review_entries`, `codes`, `paper_sections`, `meta_analyses`, course tables, and dashboard tables.
- Dashboard code that fetches project-scoped data and derives card values.

Important gap:

- There does not appear to be a first-class `public.profiles` table yet.
- Signup profile details are currently stored in Supabase Auth `user_metadata`.
- Settings/preferences pages are mostly designed UI, not fully persistent user settings yet.

Known live database issue from the screenshot:

The verify query returned `false` for:

- `public.dashboard_tasks`
- `public.dashboard_activity_events`
- `public.dashboard_project_settings`

That means the local migration exists in the repo, but the live Supabase project has not successfully applied those dashboard tables yet.

Local migration to inspect first:

- `supabase/migrations/011_dashboard_functionality.sql`

## Phase 0: Orientation

Before running or editing anything:

1. Confirm you are in `/Users/mrperfect/Documents/CeriseScholar`.
2. Read:
   - `docs/design-phase-storage-protocol.md`
   - `supabase/migrations/011_dashboard_functionality.sql`
   - `src/middleware.ts`
   - `src/lib/supabase/client.ts`
   - `src/lib/supabase/server.ts`
   - `src/app/dashboard/page.tsx`
   - `src/hooks/useDashboardState.ts`
   - `src/lib/dashboard/deriveDashboardState.ts`
   - `src/lib/dashboard/demoDashboardData.ts`
3. Report the exact next action before changing files or live DB state.

## Phase 1: Dashboard Table Foundation

Goal: make the existing dashboard foundation tables exist in the live Supabase project.

Preferred path:

1. Use the existing SQL from `supabase/migrations/011_dashboard_functionality.sql`.
2. Apply it to the intended Supabase project only.
3. If you have Supabase MCP/CLI access, verify commands with `--help` first and use the safest available execution path.
4. If you cannot execute SQL directly, provide the user one exact SQL block to paste into Supabase SQL Editor.

After applying, run this verify query:

```sql
select 'dashboard_tasks' as table_name, (to_regclass('public.dashboard_tasks') is not null) as exists
union all
select 'dashboard_activity_events', (to_regclass('public.dashboard_activity_events') is not null)
union all
select 'dashboard_project_settings', (to_regclass('public.dashboard_project_settings') is not null);
```

Success condition:

- All three rows return `true`.

If any row returns `false`, stop and inspect the exact SQL error or migration application path. Do not proceed to dashboard wiring while these are missing.

## Phase 2: Profile Architecture Design

Goal: design the first-class profile foundation before implementing it.

Audit:

- `src/components/auth/SignupForm.tsx`
- `src/app/auth/complete-profile/page.tsx`
- `src/app/settings/account/page.tsx`
- `src/app/dashboard/account/page.tsx`
- any code reading `user.user_metadata`

Design proposal should include:

- `public.profiles`
- optional `public.user_preferences`
- optional `public.user_consents` or consent fields if needed
- which signup fields remain in Auth metadata vs move to app tables
- RLS policies with user ownership
- indexes on `user_id` or profile id as needed
- migration plan
- backfill plan from existing Auth metadata if practical

Do not implement the profile migration until the user approves the schema, unless the user explicitly asks you to proceed.

## Phase 3: Dashboard Metric Contract

Goal: define each dashboard card metric before touching the UI deeply.

For each card, document:

- purpose
- visible slots
- raw source tables
- formula
- empty-state behavior
- demo fallback behavior
- user action that updates it

Cards:

- Current Project
- Today's Target
- Today's Tasks
- Local Setup
- Weekly Activity
- Total Progress
- Today's Plan
- Research Sections
- Section Details
- Research Focus
- Today's Schedule
- Continue Learning
- Cerise Support

Use existing source tables when possible:

- `projects`
- `pdfs`
- `highlights`
- `annotations`
- `literature_review_entries`
- `codes`
- `paper_sections`
- `meta_analyses`
- `course_modules`
- `course_videos`
- `course_progress`
- `course_notes`
- `dashboard_tasks`
- `dashboard_activity_events`
- `dashboard_project_settings`

Do not invent fake API/table names from preview boards as implementation truth.

## Phase 4: Implementation Slices

Only after Phases 1-3:

1. Wire one metric group at a time.
2. Keep formulas in `src/lib/dashboard/deriveDashboardState.ts` or nearby pure helpers.
3. Keep fetching/persistence in hooks.
4. Keep card components mostly rendering props.
5. Preserve all existing dashboard design.

Recommended order:

1. Dashboard tables verified.
2. Profile/preferences schema approved.
3. Profile/preferences implemented.
4. Dashboard metric contract written.
5. Current Project + Today's Tasks.
6. Today's Target + Weekly Activity.
7. Research Sections + Section Details.
8. Continue Learning + Schedule.
9. Empty/sparse/demo/real-data-wins validation.

## Verification

After code edits, run focused checks on changed files:

```bash
npx eslint <changed files>
git diff --check -- <changed files>
```

For TypeScript-wide validation when useful:

```bash
npx tsc --noEmit --pretty false
```

For local preview:

```bash
PORT=3020 npm run dev -- --hostname 127.0.0.1 --port 3020
```

Then verify:

- logged-out routes redirect to `/login`
- logged-in dashboard loads
- empty account behavior is understandable
- sparse account behavior does not fake real history
- demo frequent-user fallback is deterministic
- real user data overrides demo fallback
- dark mode remains readable
- half-screen layout remains intact

## Suggested Message To User At Each Gate

After Phase 1:

> Dashboard foundation tables are verified in Supabase. Next I recommend designing the profile/preferences schema before wiring more metrics.

After Phase 2:

> Profile architecture is ready for approval. I have not implemented it yet because it changes how account data is stored.

After Phase 3:

> The metric contract is ready. The next implementation can be sliced card-by-card without redesigning the dashboard.
