# Cerise Scholar — Live Database Schema Snapshot

**Captured:** 2026-06-14
**Source:** Read-only query against the live Supabase project `cerise-scholar` (ref `gowhkjnrioevudzphoht`, East US), run in the dashboard SQL Editor.
**Status:** Reflects the LIVE production database, compared against `supabase/migrations/001–011`. No writes were made to produce this.

## Headline

The drift runs in **three directions**, and the live database — not the migration files — is the real source of truth:

1. **Live has 5 columns the migration files don't document** → the app works in production; the blueprint is just behind.
2. **Live has 4 tables the migration files don't create** → added directly, not represented in the repo.
3. **The migration files define 3 tables the live database does NOT have** → migration `011` was never applied to production. **This is the key blocker for the dashboard-statistics goal.**

## Drift columns — ALL PRESENT in live ✅

| Column | In live DB? |
|---|---|
| `pdfs.pdf_author` | ✅ present |
| `pdfs.pdf_title` | ✅ present |
| `pdfs.pdf_subject` | ✅ present |
| `literature_review_entries.apa_reference` | ✅ present |
| `literature_review_entries.synthesis_paragraph` | ✅ present |

**Meaning:** these features are NOT broken in production — the columns were added to the live DB directly at some point. Phase 1's job is to *document* them in a migration (so a rebuilt database matches production), not to add them.

## Storage

| Bucket | Exists | Privacy |
|---|---|---|
| `pdfs` | ✅ yes | **private** (correct & safe) |

## Tables in live (public schema) — 19 total

**Match the migrations (15):** `projects`, `pdfs`, `highlights`, `annotations`, `literature_review_entries`, `codes`, `paper_sections`, `meta_analyses`, `course_modules`, `course_videos`, `course_progress`, `course_notes`, `space_posts`, `space_comments`, `space_upvotes`.

**In live but NOT in any repo migration (4):**
- `beta_waitlist_applications`
- `beta_waitlist_activity_events`
- `legal_documents`
- `user_consents`

→ Likely added directly for the public-beta signup / legal-consent flow. Their definitions must be captured into migration files in Phase 1 so the repo represents production.

**In repo migration `011` but MISSING from live (3):** ⚠️ CRITICAL
- `dashboard_tasks`
- `dashboard_activity_events`
- `dashboard_project_settings`

→ Migration `011_dashboard_functionality.sql` has **not** been applied to production. The dashboard's task/activity/schedule code queries these tables; in production those queries have nothing to read (they error or fall back to sample data). **Creating these tables in live is a prerequisite for any real dashboard statistics (Phase 5).**

## Implications for Phase 1

1. **(Highest priority)** Apply migration `011` to live — additive and safe (3 new tables + RLS + indexes; touches no existing data), but a production write, so needs explicit approval + a careful method. Unblocks the dashboard goal.
2. Write migration `012` documenting the 5 live-only columns (`IF NOT EXISTS` → no-op against live) + the 3 missing `user_id` indexes.
3. Capture the 4 undocumented live tables into migration files.
4. Before applying anything, check the migration-tracking state (`supabase_migrations.schema_migrations`) to choose a safe apply method.

## Not yet captured (Phase 1 prep)
- Exact column definitions + RLS of the 4 undocumented tables.
- The recorded migration history (`supabase_migrations.schema_migrations`).
- Whether the 3 missing `user_id` indexes already exist in live.
