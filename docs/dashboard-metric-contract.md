# Cerise Scholar — Dashboard Metric Contract (Phase 3)

**Created:** 2026-06-15 · **Status:** DRAFT for your review · **Maintained by:** Claude (architect role)
**Companion to:** `docs/backend-foundation-roadmap.md` (this is Phase 3's deliverable)
**See also:** `docs/dashboard-master-functional-spec-v2.md` (the technical spec/source of truth) and `docs/dashboard-technical-appendix.md` (the buildable TypeScript/Supabase translation). The v2 spec already settles Decisions **2** (Today's Target → pace + deadline model), **6** (Cerise Support stays static), and **7** (demo explicit, real-wins, never persisted); Decisions **1, 4, 5** remain yours to confirm.

---

## What this document is (plain language)

Before we wire your dashboard cards to real data (Phase 5), we need to agree on **what each number actually means**. Otherwise the numbers are just vibes — they'd look real but no one could explain them.

This file is the "contract." For each of your 13 dashboard cards it states four things:

1. **Plain meaning** — what the card is telling you, in one sentence.
2. **Exact formula** — precisely how the number is calculated (plain English + the real math).
3. **Where the data comes from** — which database table(s) feed it.
4. **Empty account** — what a brand-new user (no data yet) sees.

Where there's a decision for **you** to make, I've written **🔵 DECISION** with my one recommended answer. Your job in Phase 3 is to read each card and either say "approve" or tell me what to change.

> **How to read the math:** all the formulas already live in `src/lib/dashboard/deriveDashboardState.ts` — this document just translates them into English and proposes adjustments. Numbers are clamped to sensible ranges (e.g. a percentage can never go below 0 or above 100).

---

## The two building blocks behind several cards

A few cards are built from two shared ideas. Agreeing these once settles half the dashboard.

### A. "Activity points" (the weight table)

Every meaningful action you take is logged as an **activity event** and given a point value based on how much real research effort it represents. A click is worth little; uploading a source or saving a draft is worth a lot.

| Action | Points | Why |
|---|---|---|
| Open project / open research focus / edit schedule | 1 | Light navigation |
| Create a highlight | 2 | Small unit of evidence |
| Create a note | 2 | Small unit of thinking |
| Complete a planned task | 3 | Finished intention |
| Upload a source | 4 | Brings new material in |
| Save a literature-review row | 4 | Structured evidence |
| Update the meta-analysis | 5 | Heavy analytical work |
| Save a paper draft section | 5 | Heavy writing work |

These points feed **Weekly Activity**, **Total Progress** (its little "+x" delta), and **Today's Target**.

**🔵 DECISION 1 — Activity weights.** *Recommendation: approve as-is.* These weights are sensible (writing/analysis count most, clicks count least). If you feel a particular action is over- or under-valued, tell me the new number.

### B. "Section progress" (the 6 research stages)

Your project is measured across 6 stages, each scored 0–100%. These power the **Research Sections**, **Section Details**, **Total Progress**, and **Research Focus** cards.

| Stage | What drives its % toward 100 |
|---|---|
| **Workspace** | Having ≥1 PDF (25), highlights (up to 25), notes (up to 25), codes (up to 25) |
| **Literature Review** | Having sources (25), evidence rows (up to 25), coded rows (up to 25), synthesis paragraphs (up to 25) |
| **Meta-analysis** | Research question (20), hypothesis (20), test type (15), mapped columns (up to 20), forest plot (25) |
| **Paper Draft** | Sections with content (up to 60), substantial sections >120 chars (up to 25), imported syntheses (up to 15) |
| **Citations** | APA-ready references (up to 60), references with author+year (up to 25), 80%+ APA-complete bonus (15) |
| **Cerise readiness** | Project exists (25), workspace started (25), literature started (25), local AI connected (25) |

---

## The 13 cards

### ✅ = already real · ⚠️ = partly real (has fake fallback) · ❌ = currently fake

---

### 1. Current Project ✅
- **Plain meaning:** Your active project, what stage it's at, and how recently you touched it.
- **Exact formula:** Title = project name. Tag = "Literature sprint" if you have ≥1 literature row, else "Project setup". Current section = "Meta-analysis" if meta-analysis progress ≥ literature progress, else "Literature Review Table". Last opened = friendly time since your most recent activity event (e.g. "2h ago", "Yesterday").
- **Data from:** `projects`, `dashboard_activity_events`.
- **Empty account:** Shows the project name with tag "Project setup" and "Not opened yet".
- **Fix needed:** remove the hardcoded `"Last opened 2h ago"` / `"Literature sprint"` fallbacks so it can never show fiction.

### 2. Today's Target ✅ (formula rough — proposed redefinition)
- **Plain meaning:** A small daily goal and how much of it you've done today.
- **Current formula (rough):** target = a number from 6–18 that grows as more of your project remains; "done" is a separate 0–100% blend of completed tasks + today's activity points. *Problem: the goal (6–18) and the progress (0–100%) are on different scales, so "remaining" doesn't read cleanly.*
- **🔵 DECISION 2 — How should "Today's Target" be defined?** *Recommendation: switch it to a real daily commitment.* We already have an unused table (`dashboard_project_settings`) with two perfect fields: **preferred daily minutes** and a **target completion date**. Proposed: you set a daily goal (e.g. "30 focused minutes" or "40 activity points") once; the card then shows **today's progress toward that goal** plus **days left until your target date**. Clean, honest, and yours to set.
- **Data from:** `dashboard_project_settings` (your goal), `dashboard_tasks` + `dashboard_activity_events` (today's progress).
- **Empty account:** "Set a daily goal" prompt (until you pick one) — no fake number.
- **Fix needed:** remove `target ?? 6 / done ?? 3 / remaining ?? 3` fallbacks; wire the settings table.

### 3. Today's Tasks ⚠️→❌
- **Plain meaning:** Three suggested concrete moves for today, sized to your project's current gaps.
- **Exact formula:** "N literature rows" (N = 1–4, based on how many rows you're short of your target), "M highlights" (M = 1–3, based on PDFs vs. highlights), and "1 synthesis paragraph" (currently always 1).
- **Data from:** `literature_review_entries`, `pdfs`, `highlights` (via the derived suggestions).
- **Empty account:** Suggests starter amounts (e.g. "2 literature rows, 3 highlights, 1 synthesis paragraph").
- **🔵 DECISION 3 — Keep these as smart *suggestions*, or make them your real to-dos?** *Recommendation: keep as auto-suggestions* (they nudge without nagging). The editable to-do list already lives in **Today's Schedule** (card 11). Fix needed: make the third item ("synthesis paragraph") adapt too, and drop the hardcoded fallback strings.

### 4. Local Setup ✅
- **Plain meaning:** Whether your laptop's private research tools (local AI agent, Ollama, folder access, safety gate) are connected.
- **Exact formula:** Counts how many of the 4 checks are ready; percent = ready ÷ 4 × 100.
- **Data from:** live local-agent status (not the database).
- **Empty account:** Same — reflects whatever is actually connected (0/4 if nothing).
- **Fix needed:** remove the hardcoded `92%` / `4/4` fallbacks so an unconnected laptop never shows "92% ready".

### 5. Weekly Activity ✅
- **Plain meaning:** How active you've been this week, as a percentage, with a 7-day mini-graph and a vs-last-week change.
- **Exact formula:** Add up this week's activity points (see block A). 100% = **45 points in a week** (the soft "a full, productive week" mark). Delta = % change vs. the previous 7 days. Mini-graph = each of the last 7 days' points.
- **Data from:** `dashboard_activity_events`.
- **Empty account:** 0% with a flat graph.
- **🔵 DECISION 4 — Is "45 points = a full week (100%)" the right bar?** *Recommendation: keep 45 to start*, then tune after you've used it for a week. Fix needed: remove the `58` / `[2,3,3,5,4,5,5]` fallbacks.

### 6. Total Progress ✅
- **Plain meaning:** One overall "how far along is this whole project" percentage.
- **Exact formula:** A weighted blend of the 6 stages — **Literature 25%, Draft 25%, Meta-analysis 20%, Workspace 15%, Citations 10%, Cerise readiness 5%**. The little "+x" is a momentum nudge (today's completed tasks + a third of this week's points, capped at 20).
- **Data from:** all research tables (`pdfs`, `highlights`, `annotations`, `literature_review_entries`, `paper_sections`, `meta_analyses`, `codes`).
- **Empty account:** 0%.
- **🔵 DECISION 5 — Are these blend weights right?** *Recommendation: approve.* They reflect that literature + writing are the heart of the work. Tell me if you'd reweight (e.g. value meta-analysis more). Fix needed: remove the `64` fallback.

### 7. Today's Plan ❌ (fully fake today)
- **Plain meaning:** A small month calendar with today highlighted and days that have scheduled tasks marked.
- **Current state:** hardcoded to **"May 2024"** with day **15** always highlighted — purely decorative.
- **Proposed formula:** show the real current month/year, highlight today's real date, and dot any day that has scheduled tasks.
- **Data from:** the device clock (for the month) + `dashboard_tasks` (for marked days).
- **Empty account:** Real current month with today highlighted; no task dots.
- **Fix needed:** replace the static calendar entirely.

### 8. Research Sections ⚠️
- **Plain meaning:** An at-a-glance list of the 6 stages with each one's progress %.
- **Exact formula:** the section-progress %s from block B.
- **Data from:** all research tables.
- **Empty account:** all stages at low/0% (real), not the demo template.
- **Fix needed:** the component currently falls back to hardcoded percentages (72/58/41/22/80/34) when data isn't passed — ensure every % comes only from derived data.

### 9. Section Details ⚠️
- **Plain meaning:** A drill-down of one selected stage — its 4 key stats, its current bottleneck, and the recommended next step.
- **Exact formula:** per-stage stats (e.g. Literature shows Sources / Evidence rows / Syntheses / Rows left) plus a bottleneck + next-step message chosen by simple rules (e.g. "some rows still need synthesis paragraphs").
- **Data from:** same research tables as the section it's showing.
- **Empty account:** real zeros with "get started" guidance.
- **Fix needed:** same as card 8 — numbers from derived data only, never the template.

### 10. Research Focus ✅
- **Plain meaning:** Cerise's single recommended focus right now, plus 4 quick health indicators and a rough time estimate.
- **Exact formula:** Recommendation depends on which stage is furthest along. Health chips: Evidence balance (Good if literature ≥45%), Citation coverage (Good if citations ≥70%), Theme clarity (Strong if ≥3 coded rows), Draft readiness (Ready if draft ≥60%). Time estimate = "25–35 min" if local setup complete, else "10–15 min".
- **Data from:** the research tables + local setup status.
- **Empty account:** "Add your first source to begin" style guidance with all chips "Needs work".
- **Fix needed:** remove the hardcoded `"Notes in 3 papers."` / `"25-35 min"` fallbacks.

### 11. Today's Schedule ⚠️
- **Plain meaning:** Your real, editable list of today's tasks (with times) — you can complete, edit, add, and delete them.
- **Exact formula:** today's tasks from the database, sorted by order. New accounts get 4 sensible starter tasks created automatically.
- **Data from:** `dashboard_tasks`.
- **Empty account:** the 4 auto-created starter tasks (or a clean empty state once you clear them).
- **Fix needed:** replace the hardcoded fallback task list with the real tasks + a proper "no tasks yet" empty state.

### 12. Continue Learning ⚠️
- **Plain meaning:** Your progress through the Cerise video courses, with current lesson and counts.
- **Exact formula:** progress = lessons watched ÷ total lessons × 100. Stats = modules / lessons done / notes created / lessons remaining.
- **Data from:** `course_modules`, `course_videos`, `course_progress`, `course_notes`.
- **Empty account:** "Start your first lesson" with 0% — **not** the demo "68%".
- **Fix needed:** the lesson title/description ("Evidence synthesis…") is currently hardcoded; make it reflect your actual current lesson, and drop the `["4","12","8","3"]` / `68%` fallbacks.

### 13. Cerise Support ❌ (static by design)
- **Plain meaning:** Help and support links (FAQs, contact, guides).
- **Current state:** static links — no live data.
- **🔵 DECISION 6 — Keep Cerise Support as static help links?** *Recommendation: yes, keep it static.* It's a help menu, not a statistic; making it dynamic adds complexity with little payoff. We can revisit later.
- **Empty account:** identical (it's the same for everyone).

---

## Cross-cutting decision (affects Phase 4)

**🔵 DECISION 7 — Demo/sample data mixing policy.** When an account is empty, the dashboard shows realistic *sample* data so it isn't blank. *Recommendation: all-or-nothing per project* — never blend sample research data with your real course progress or real tasks. The moment a project has any real data, samples disappear for that project. (This is what Phase 4 will enforce and label with a "Sample data" badge.)

---

## Summary of decisions for you

| # | Decision | My recommendation |
|---|---|---|
| 1 | Activity point weights | Approve as-is |
| 2 | "Today's Target" definition | Redefine around a daily-minutes/points goal + target date you set |
| 3 | "Today's Tasks" = suggestions or to-dos | Keep as auto-suggestions (real to-dos live in Today's Schedule) |
| 4 | Weekly Activity "100% = 45 pts/week" | Keep 45, tune later |
| 5 | Total Progress blend weights | Approve as-is |
| 6 | Cerise Support card | Keep static |
| 7 | Sample-data mixing policy | All-or-nothing per project |

**Once you approve (or adjust) these, Phase 3 is done** and we move to Phase 4 (honest sample-data badge) and Phase 5 (wiring each card). You don't need to read any code — just react to the meanings and the 7 decisions above.
