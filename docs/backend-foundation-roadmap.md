# Cerise Scholar — Backend Foundation Roadmap

**Created:** 2026-06-12 · **Maintained by:** Claude (architect role)
**Purpose:** Checkpoint document for turning the dashboard into real, per-user statistics. Check items off as we complete them. To resume in any future session, open this file and say: *"Continue the roadmap from the first unchecked item."*

**House rules honored:** No UI redesign (design phase is locked). Data gets bound *into* existing card surfaces. New research source files follow the Local Agent/vault policy, not new Supabase Storage paths. Deployment only with explicit approval per `docs/azure-static-webapps-safety-protocol.md`.

---

## 1. The short version (plain language)

You were worried the app has no login and no database. **Good news: it has both, and they're built on solid patterns.** Login (email/password + Google) works, every database table has per-user security rules, and the dashboard already has a real data pipeline feeding about half the cards.

What actually stands between you and trustworthy per-user statistics is five things:

1. **The blueprint and the building disagree (schema drift).** The migration files (the database's "blueprint") are missing 5 columns the app actively reads and writes (PDF author/title/subject; APA reference and synthesis paragraph on literature rows). Either your live database was edited by hand and the blueprint fell behind, or those features quietly fail. We can't tell from the code alone — the repo isn't connected to your live Supabase project. **This must be resolved first.**
2. **No "profiles" table.** Your users' names, phone, address etc. live in Supabase's login metadata — fine for showing a name in the corner, wrong as a foundation for per-user features and stats. A proper `profiles` table is the standard fix.
3. **No password reset.** A user who forgets their password is locked out forever. The "Change Password" button in settings also does nothing.
4. **A chunk of the dashboard code isn't saved to version history.** The entire `src/lib/dashboard/` and `src/components/dashboard/` folders (plus ~26 other files) are untracked in git. One accident could erase that work.
5. **Cards are a mix of real, partly real, and decorative.** 6 cards show live data, 4 are partly real with hardcoded fallbacks, 3 are entirely fake (e.g., the calendar permanently shows "May 2024"). Each card needs an agreed definition — that's your "define each statistic slot" goal, and it's Phase 3.

**Plan in one sentence:** protect the work and connect to the live database (Phase 0), make blueprint match reality (1), build the profile + password foundation (2), agree on what every statistic means (3), make demo data honest (4), wire the cards one by one (5), prove it all works with real test accounts (6).

---

## 2. Mini glossary

| Term | Plain meaning |
|---|---|
| **Supabase** | The cloud service that stores your data and handles logins. |
| **Table** | A spreadsheet-like container in the database (e.g., `projects`, `pdfs`). |
| **Migration** | A numbered blueprint file that creates/changes tables. Your DB's build history. |
| **Schema drift** | When the live database and the blueprint files no longer match. |
| **RLS (Row-Level Security)** | Database rules ensuring users can only see *their own* rows. You have this — it's the most important security piece. |
| **`user_metadata`** | A small note pad attached to each login account. Your profile data lives here today. |
| **`profiles` table** | The standard "real" home for user info — queryable, extendable, joinable with stats. Missing today. |
| **Middleware** | A gatekeeper that checks "are you signed in?" before serving protected pages. Yours works, including in production on Azure. |
| **Demo fallback** | Fake-but-realistic sample data shown when an account is empty, so the dashboard isn't blank. |

---

## 3. Audit verdicts (vs. the Codex handoff)

| # | Codex hypothesis | Verdict |
|---|---|---|
| 1 | Auth/login exists | **Confirmed, ~85% complete.** Email+Google sign-in, logout, route protection all real and using current best-practice libraries (`@supabase/ssr`, `getUser()` validation). Missing: password reset (critical), change-password handler, complete-profile gating. Server-side auth **does** run in production (the app deploys as a real server, not a static site). |
| 2 | Database scaffold exists | **Confirmed.** 11 migrations, 17 tables, RLS enabled on all with sane owner-only policies, FKs cascade correctly, most indexes present (3 `user_id` indexes missing). |
| 3 | No `profiles` table; metadata-only | **Confirmed.** Zero references to a `profiles` table anywhere; signup stores ~13 profile fields into `user_metadata`; 4 components read it for display. |
| 4 | Dashboard pipeline started | **Confirmed, architecture is good.** Clean flow: Supabase → `useDashboardState` → `DashboardSourceData` → `deriveDashboardState()` → cards. Formulas centralized in the derive layer (right place). Card reality: 6 real / 4 partial / 3 fake (details §6). |
| 5 | Schema drift | **Confirmed, worse than suspected.** `pdfs` missing `pdf_author`, `pdf_title`, `pdf_subject`; `literature_review_entries` missing `apa_reference`, `synthesis_paragraph` — all 5 used in code, absent from migrations. Storage bucket `pdfs` never created by any migration (assumed hand-made). `dashboard_project_settings` table created but never used by code. Live DB state **unverified** — repo is not linked to the Supabase project. |

**Everything above is "confirmed in code/migrations" only.** Nothing has been verified against the live database yet — that's Phase 0's job.

---

## 4. Target architecture (the blueprint we're building toward)

```
Sign in (email or Google)
   │
   ▼
auth.users (Supabase-managed)──── trigger creates ───▶ profiles (NEW: name, institution,
   │                                                    field of study, onboarding state)
   ▼
projects (per user) ──▶ research data tables (pdfs, highlights, annotations,
   │                     literature rows, codes, paper sections, meta-analysis)
   │                     + dashboard_tasks + dashboard_activity_events
   │                     + dashboard_project_settings (daily-minutes & target-date → Today's Target)
   ▼
useDashboardState (fetch) ──▶ deriveDashboardState (ALL formulas live here,
   │                           per the approved Metric Contract)
   ▼
Dashboard cards (existing locked design — data bound in, no layout changes)

Empty account? ──▶ deterministic demo fallback, clearly badged "Sample data",
                   never written to the database, never mixed with real data.
```

Key decisions baked in:
- **`profiles` becomes the source of truth** for user info; `user_metadata` stays as the signup capture point and fallback. A database trigger auto-creates a profile row on signup; existing users get backfilled.
- **Keep `dashboard_project_settings`** (currently unused) — its `preferred_daily_minutes` and `target_completion_date` columns are exactly what the "Today's Target" card needs.
- **Files stay on the transitional path for now**: existing Supabase Storage PDF flow keeps working (15-file allowlist); the Local Agent vault is the future per `docs/local-file-storage-strategy.md`. This roadmap adds **no** new cloud-storage paths.

---

## 5. The roadmap

> Effort estimates are working sessions (one sitting each), and approximate.

### Phase 0 — Protect the work & connect to reality *(1 session)*

*Why first: ~28 untracked files (including the whole dashboard engine) could be lost in one accident, and we cannot fix drift while blind to the live database. This is "save your game before the boss fight."*

- [ ] Make a deliberate **checkpoint git commit** of the untracked/modified app work (scoped per the house rule in `docs/design-phase-storage-protocol.md` — no broad cleanup).
- [ ] Connect the repo to the live Supabase project (CLI link) **or** export the live schema from the Supabase dashboard.
- [ ] Produce a written **live-schema snapshot**: which tables/columns actually exist in production, saved as `docs/live-schema-snapshot.md`.
- [ ] Check in the live dashboard: does the `pdfs` storage bucket exist, and what are its access policies? Record findings.
- [ ] Confirm which of the 11 migrations have actually been applied to the live DB.

**Done when:** dashboard code is safely in git history, and we have a definitive list of where live DB ≠ migration files.

### Phase 1 — Make the blueprint match the building *(1 session)*

*Why: every later phase trusts the schema. An app that inserts into columns that may not exist is a time bomb.*

- [ ] Write migration `012_schema_reconciliation.sql` (guarded with `IF NOT EXISTS` so it's safe anywhere):
  - [ ] `pdfs`: add `pdf_author`, `pdf_title`, `pdf_subject`.
  - [ ] `literature_review_entries`: add `apa_reference`, `synthesis_paragraph`.
  - [ ] Add missing indexes: `highlights(user_id)`, `annotations(user_id)`, `literature_review_entries(user_id)`.
- [ ] If the live DB has hand-made changes the blueprint lacks, fold them into the migration too (decided from the Phase 0 snapshot).
- [ ] Document the `pdfs` bucket setup (and its policies) so it's reproducible — documentation only, no new storage code paths.
- [ ] Apply to live DB; re-snapshot; confirm blueprint == building.

**Done when:** a fresh database built from migrations 001–012 matches production exactly.

### Phase 2 — Identity & profile foundation *(1–2 sessions)*

*Why: this is the account foundation you suspected was missing. Stats are "per user" — the user needs a first-class home in the database.*

- [ ] Migration `013_profiles.sql`: `profiles` table (id = auth user id; full_name, first/last name, avatar_url, institution, field_of_study, onboarding/setup state, created/updated timestamps) + RLS (owner-only) + trigger that auto-creates a profile row on every new signup.
- [ ] Backfill: copy existing users' `user_metadata` into `profiles` (one-time script; metadata kept as fallback).
- [ ] Write path: signup/complete-profile and Settings → Account save to `profiles`.
- [ ] Read path: sidebar, top nav, and account pages read from `profiles` (fallback to metadata).
- [ ] **Password reset flow**: "Forgot password?" link → email → reset page. Wire the dead "Change Password" button (or remove it for now).
- [ ] Fix the Settings "About" textarea that currently saves nothing (persist to `profiles` or remove).
- [ ] Add `/auth/complete-profile` to protected routes.

**Done when:** a brand-new signup produces a `profiles` row automatically; editing your name in Settings persists and shows in the sidebar; password reset works on a test account.

### Phase 3 — The statistics contract *(1 session — mostly decisions, this is YOUR phase)*

*Why: "define each statistic slot" — before wiring, every card needs an agreed, plain-language definition. Otherwise the numbers are vibes.*

- [ ] Claude drafts `docs/dashboard-metric-contract.md`: for each of the 13 cards — plain-language meaning, exact formula, source tables, empty-account behavior. (Current formulas in `deriveDashboardState.ts` are the starting proposals.)
- [ ] You approve/adjust each definition (e.g., "Weekly Activity = your actions this week, where uploading a source counts 4× a click" — keep or change?).
- [ ] Decide the open product questions: §8 below.
- [ ] Wire `dashboard_project_settings` into the contract (daily minutes + target date feed "Today's Target").

**Done when:** every card has one approved sentence defining it, and the contract file is saved.

### Phase 4 — Honest demo fallback *(1 session)*

*Why: demo data already exists, is deterministic, and never writes fake rows to the database (verified — good design). But it can silently blend with real data and isn't labeled.*

- [ ] Add a visible **"Sample data" badge** when the dashboard is in demo mode (smallest possible UI addition; no layout reshaping).
- [ ] Enforce the mixing policy you choose in Phase 3 (recommended: all-or-nothing per project — never blend demo PDFs with real course progress).
- [ ] Keep the guarantees: deterministic, fallback-only, zero database writes.

**Done when:** a brand-new empty account sees a clearly-labeled sample dashboard; the moment real data exists, samples disappear.

### Phase 5 — Card-by-card wiring *(2–4 sessions; one checkpoint per card)*

*Why last among build phases: now the schema is trusted, users have profiles, and every number has an agreed meaning.*

Order of attack — fake cards first, then partials, then verify reals:

- [ ] **Today's Tasks** (fake): bind real task labels — the derive layer already computes `todayTaskLabels`; the component ignores it and shows 3 hardcoded strings.
- [ ] **Today's Plan** (fake): real calendar (today's date, not "May 2024" / day "15"), days with tasks marked.
- [ ] **Cerise Support** (static): per Phase 3 decision — likely stays as-is (it's just help links).
- [ ] **Today's Schedule** (partial): replace hardcoded fallback items with real `dashboard_tasks` + proper empty state.
- [ ] **Continue Learning** (partial): replace hardcoded lesson text and the `["4","12","8","3"]` stats fallback with real course progress + empty state.
- [ ] **Research Sections / Section Details** (partial): keep the visual template, ensure all *numbers* come from derived data, none from the fallback template.
- [ ] **Weekly Activity / Total Progress / Today's Target / Current Project / Research Focus / Local Setup** (real): remove hardcoded fallback numbers (58, 64, 92, sparkline `[2,3,3,5,4,5,5]`, `target ?? 6` etc.) so a card can never silently show fiction; confirm formulas match the contract.
- [ ] After each card: `npx eslint <changed files>` + visual check on the port-3020 preview (per house protocol).

**Done when:** with a real test account, every card's number can be explained by pointing at the user's actual data.

### Phase 6 — Prove it works *(1 session)*

- [ ] **Fresh-account walkthrough**: sign up new test user → profile created → labeled sample dashboard → add one PDF + tasks → samples vanish, real stats appear.
- [ ] **Two-account security check**: account B must see none of account A's data (RLS proof).
- [ ] **Password reset walkthrough** on a test account.
- [ ] Pre-deploy gates: `npm run check:legacy` and `npm run check:storage-strategy` pass.
- [ ] Deploy **only with your explicit approval**, per the Azure safety protocol.

**Done when:** you've personally clicked through a working, personalized dashboard on a fresh account.

---

## 6. Card reality check (audit snapshot, 2026-06-12)

| Card | Today | What it needs to be fully real |
|---|---|---|
| Current Project | ✅ Real | Nothing major — relies on activity events existing |
| Today's Target | ✅ Real (formula) | Contract sign-off; wire `dashboard_project_settings` |
| Today's Tasks | ❌ Fake (3 hardcoded strings) | Bind already-computed `todayTaskLabels` |
| Local Setup | ✅ Real (live agent status) | Remove `92%` hardcoded fallback |
| Weekly Activity | ✅ Real (weighted events) | Remove `58 / 5` fallbacks; approve weights |
| Total Progress | ✅ Real (weighted blend) | Remove `64 / 4` fallbacks; approve weights |
| Today's Plan | ❌ Fake ("May 2024", day 15) | Real calendar + task markers |
| Research Sections | ⚠️ Partial (template merge) | Numbers only from derived data |
| Section Details | ⚠️ Partial (same merge) | Same |
| Research Focus | ✅ Real | Contract sign-off |
| Today's Schedule | ⚠️ Partial (hardcoded fallback list) | Real tasks + empty state |
| Continue Learning | ⚠️ Partial (hardcoded text/stats) | Real course progress + empty state |
| Cerise Support | ❌ Static links | Probably fine as-is — your call (Phase 3) |

---

## 7. Key files map (for future sessions)

- **Auth:** `src/middleware.ts`, `src/components/auth/*`, `src/app/auth/callback/route.ts`, `src/app/auth/complete-profile/page.tsx`, `src/hooks/useUser.ts`, `src/lib/supabase/{client,server}.ts`
- **Database blueprint:** `supabase/migrations/001–011` (new work lands as 012+)
- **Dashboard engine:** `src/hooks/useDashboardState.ts`, `src/lib/dashboard/deriveDashboardState.ts` (all formulas), `src/lib/dashboard/{activity,demoDashboardData,localDay}.ts`
- **Dashboard UI (locked design):** `src/components/dashboard/DashboardExactTemplate.tsx`, `DashboardResearchSectionsExact.tsx`, `src/app/dashboard/page.tsx`
- **Profile readers today:** `src/components/app-shell/{AppSidebar,AppTopNav}.tsx`, `src/app/settings/account/page.tsx`, `src/app/dashboard/account/page.tsx`
- **House rules:** `docs/design-phase-storage-protocol.md`, `docs/azure-static-webapps-safety-protocol.md`, `docs/local-file-storage-strategy.md`, `docs/local-first-agent-migration.md`

---

## 8. Open decisions (yours — none block Phase 0–2)

1. **Is `/courses` meant to be public?** It's currently viewable without login (likely fine as a preview; everything personal is protected).
2. **Cerise Support card** — keep as static help links, or make it dynamic later?
3. **Demo mixing policy** — recommended: all-or-nothing (never blend sample research data with real course progress).
4. **Activity weights** — e.g., uploading a source counts 4 points, saving a draft 5. You'll approve these in Phase 3.

## 9. Deferred (noted, deliberately not now)

- Rename `middleware` → `proxy` (deprecated in Next.js 16, still works — bundle with a future maintenance pass).
- Admin access is hardcoded to one email — fine for beta; revisit before adding a second admin.
- Email change, account deletion, 2FA, real-time dashboard sync — post-foundation features.

## 10. Decision log

- **2026-06-12** — Audit completed (4 parallel code scouts + manual drift verification). Roadmap v1 saved. No code changed.
