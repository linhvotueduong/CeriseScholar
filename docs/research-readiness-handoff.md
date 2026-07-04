# Research Readiness — Session Handoff

**Date:** 2026-07-02
**Branch:** `codex/recover-real-cerise-scholar`
**Status:** Mid-brainstorm. Working code exists but is **NOT checkpointed**. The user paused to re-explore intention and direction before approving the next model revision.

**FOUNDER RULING 2026-07-02 (later session): do NOT checkpoint yet.** The implemented map misreads the Workspace ↔ Lit Review flow. Corrections are marked below in §4 and §5.1; they must be designed in before any revision ships.

---

## 1. Where the dashboard stands (committed work — done and safe)

All `/dashboard` cards now show honest, real data. Recent commits, newest first:

| Commit | What it did |
|---|---|
| `ed91f49` | Permanent evergreen hero subtitle (motivational line; error/demo sublines preserved) |
| `d7ba34c` | Phase G — Continue Learning from real course data (published-only math, earned badges, Sample tag) |
| `5d6ceca` | Phase E — Research Focus from real section scores (bottleneck model, since superseded by Readiness work) |
| `50f8351` | Fix sample-data flash on load/auth/project transitions (`stale` gate in useDashboardState) |
| `c7362f2` | Phase F — real Activity Log + Greeting + Current Project |
| `d703426` | tsx devDependency + `npm test` script |

Earlier: 1000-point Today's Target model, research-quality section progress (milestone caps + meaningful-work gate), deterministic AI quality evaluator, AI evaluation storage + feedback buttons, per-card sample tags, RLS hardening (migration 020).

**Test suite:** `npm test` → 89 pass (tsx + node:test, `src/lib/dashboard/*.test.ts`).

---

## 2. Uncommitted work in the tree (IMPORTANT — mixed ownership)

### Claude's Research Readiness work (working, tested, NOT committed)
- `src/lib/dashboard/researchReadiness.ts` — NEW. Pure, deterministic, table-driven helper:
  micro-checks (`CHECK_META`) + readiness ladder (`READINESS_LADDER`) + `computeResearchReadiness(signals)`.
  Output: `{ microChecks[], readinessStageId, readinessSummary, healthRows[4], currentStatus, nextBestMove, nextMoveSurface, nextMoveSectionId, reason }`.
- `src/lib/dashboard/researchReadiness.test.ts` — NEW. 18 tests, all passing.
- `src/lib/dashboard/deriveDashboardState.ts` — EDIT: builds `ReadinessSignals` from real counts, calls the helper, maps result onto `researchFocus` (card contract). Also `TodayTargetContext.hasPersistedTarget?`.
- `src/hooks/useDashboardState.ts` — EDIT: threads `hasPersistedTarget: persistedSettingsRef.current !== null`.

### Codex's parallel uncommitted work (DO NOT revert/overwrite)
- `src/components/dashboard/DashboardExactTemplate.tsx` — card renamed "Research Readiness", renders readinessSummary/health/currentStatus/nextBestMove; routes Start-next-move via `researchFocus.bottleneckSection` (= readiness `nextMoveSectionId`).
- `src/components/app-shell/AppIcons.tsx`, `AppShell.tsx`, `AppSidebar.tsx` — unrelated app-shell work.
- `src/lib/dashboard/buildDashboardSnapshot.ts`, `types.ts`, `researchFocus.test.ts` — adjusted for the evolving card.

### Protected files (NEVER stage or edit — Codex owns these)
- `src/app/layout.tsx`, `src/middleware.ts`, `.vibeyardignore`

---

## 3. Current readiness model (as implemented right now)

**Copy rule (user-approved):** Current status = noun-style macro area (2-3 words). Next move = verb-style micro action (2-3 words). No snake_case in UI. No gerunds in status.

Current ladder (first phase with an unmet required check wins):

| Stage id | Current status | Next move | Surface → section route |
|---|---|---|---|
| not_started | Not started | Name your project | project_setup → workspace |
| building_foundation | Research plan | Set target date | project_setup → workspace |
| topic_forming | Research topic | Add topic description | scholarask → workspace (fallback) |
| gathering_sources | Evidence base | Upload a source | workspace |
| reviewing_sources | Source review | Review sources | workspace |
| structuring_evidence | Evidence table | Add lit rows | literature_review |
| building_themes | Theme clarity | Add codes & themes | literature_review |
| strengthening_claims | Claim support | Link evidence | literature_review (never meta) |
| synthesizing | Synthesis | Synthesize findings | workspace (**WRONG — see §5.2**) |
| drafting | Paper draft | Fill evidence gaps | literature_review |
| ready_to_export | Ready to export | Generate report | export → draft |

Honesty rules in the helper (keep them):
- Unmeasurable ScholarAsk checks (missing angles/perspectives/strategy) are advisory: `measurable: false`, never `done`, never gate.
- Placeholder titles ("Untitled", "New project", demo text…) don't count as meaningful.
- Escape hatches: real work (sources etc.) satisfies title/target checks so active projects are never trapped in setup; literature rows satisfy topic.
- Meta-analysis lane only when a `meta_analyses` row exists; claim support routes to Literature Review, never Meta-analysis.

---

## 4. Ground truth: the real product (Explore-agent audit, 2026-07-02)

An agent read every surface's code. Key facts the next session MUST respect:

- **Upload** (`/dashboard/upload`): PDF → `pdfs` row (+ OCR status).
- **Workspace** (`/dashboard/project/[id]` + viewer): highlight → `highlights`; sticky notes → `annotations`; Code System panel → `codes`; assign highlight→code → `highlights.code_id`. **CORRECTION 2026-07-02: NOT a reading-only surface — every highlight AUTO-CREATES a `literature_review_entries` row** (`src/hooks/useHighlights.ts:85`) carrying source, page, quoted text, `code_name`, sticky-note content as `user_notes`, and an auto-stubbed `apa_reference` from PDF metadata. A fire-and-forget local-agent call then tries to upgrade the stub to a real APA (`useHighlights.ts:99-131` — currently silently failing since the local agent is broken in production; also an AI-pivot touchpoint, see `docs/architecture-pivot-roadmap.md`). Note edits sync both ways (`src/hooks/useAnnotations.ts:74-81`).
- **ScholarAsk** (`/dashboard/project/[id]/scholar-ask`): REAL route (chat, citations, paper panel) but **persists NOTHING to the DB** — conversations are localStorage only. Only trace: activity event `research_query_submitted`. No save-to-lit-review flow exists.
- **Literature Review**: 6-column editable table = the core evidence surface. Row columns: source, `apa_reference`, `code_name`, quoted `highlighted_text`, `user_notes` (insights), `synthesis_paragraph`. **CORRECTION 2026-07-02: rows are NOT hand-added — they are auto-created by Workspace highlighting (see above), then enriched by hand:** `user_notes` and `synthesis_paragraph` are human-written; `apa_reference` starts as an auto-stub and is meant to become **click-generated per row** (planned per-row Generate button; founder decision: never mass auto-generate the whole table). Rows sync notes back to annotations.
- **Meta-analysis**: 5-step wizard, one `meta_analyses` row/project: research_question + hypothesis(+type) → upload CSV/SAV → client-side stats → `column_mapping` (effect sizes) → `canvas_blocks` (forest/funnel/etc plots). Optional lane; does NOT create lit rows.
- **Paper Writer**: 8 fixed `paper_sections` (`abstract, introduction, literature_review, methodology, results, discussion, conclusion, references`), manual typing, auto-save, word counts. "Sync Materials" copies synthesis paragraphs + APA refs from Lit Review into sections. Guidance: draft Literature Review first, abstract last, references via sync.
- **No stored** research goal/question outside `meta_analyses`; no perspectives/source-type field (so true "perspective balance" is unmeasurable today).
- `dashboard_project_settings` holds per-project: `target_completion_date`, `preferred_daily_minutes`, `project_type`, `project_scope`, `current_section_id` — all real fields usable as separate micro-checks.

---

## 5. The agreed direction that is NOT yet implemented

The user confirmed the current 1-check-per-phase ladder is too flat. The next revision (designed, awaiting the user's re-exploration + final go):

### 5.1 Multi-check checklists per macro status (~30 measurable checks)
Each macro area = ordered checklist; status stays put while Next move walks the checklist. Highlights:
- **Research plan** → 4 real checks from `dashboard_project_settings`: Set target date → Choose work pace → Pick project type → Pick scope.
- **Evidence base** → upload first source → add more (scope-scaled count) → OCR complete.
- **Source review** → first highlight → notes (annotations OR row insights = anyOf). ~~breadth ≥ ~60% of PDFs highlighted~~ **DELETED per founder 2026-07-02: "source balance" via highlight breadth is not a real product concept — do not resurrect it.**
- **Code system** → create ≥2 codes → assign highlights (fraction).
- **Evidence table** → **INVALID as designed (founder correction 2026-07-02): rows are AUTO-CREATED by Workspace highlighting — "add rows" is not a user action.** Enrichment checks fold into neighbors (code/theme fraction → Theme clarity; insights → Source review). Any row-creation move must route to the Workspace, not Literature Review.
- **Claim support** → founder direction 2026-07-02: readiness ticks as per-row APA references get **click-generated** (a per-row Generate button is the planned tool; never mass auto-generate the table). Honesty problem to solve: every row auto-gets a metadata stub in `apa_reference` at creation, so "non-empty" would self-tick — gate on genuine-APA shape (e.g. author + (year)) or a founder-chosen rule. Insights fraction (meaningful-text gated) may live here or in Source review. ("Strengthen claims" vs "Link evidence" remains a fake split — neither is a product feature.)
- **Synthesis** → first synthesis paragraph → per-theme coverage → quality (deterministic evaluator). **Route: Literature Review, NOT workspace** (fix needed — current code routes synthesis to workspace). Founder confirmed 2026-07-02: synthesis readiness comes from the `synthesis_paragraph` column — the analysis paragraph written from the row's highlight + note, reused later in Paper Writer.
- **Paper draft** → draft literature_review section first → core sections → sync references → abstract+conclusion (per product guidance order).
- **Meta lane** (parallel, only if started): question → hypothesis → map data → build plot.

### 5.2 Known bugs/mismatches in current implementation to fix in the revision
1. `workspace.synthesis_started` surface/route is **workspace** but synthesis lives in the **Literature Review** table (column F).
2. "Link evidence" move should be replaced by the real actions (Add APA references / Write insights).
3. ScholarAsk `SURFACE_SECTION` falls back to workspace — a real route exists: `/dashboard/project/[projectId]/scholar-ask`. Consider adding a proper surface→URL map in page.tsx instead of the section-id fallback.

### 5.3 Structural needs
- `requires` lists with multiple ordered checks (supported already), an `anyOf` group mechanism, per-check thresholds (fractions + scope-scaled counts), tests asserting the sequence of next moves within a phase.

### 5.4 OPEN DECISIONS the user has NOT yet answered
1. Scope-scaled thresholds (small ≈ 3 sources/8 rows; medium ≈ 6/15; large ≈ 10/25) — yes/no?
2. Code system strictness: required, or "code in Workspace OR theme directly in Lit Review rows" (anyOf)?
3. (Earlier, still open) Merge to 10 macro areas (fold Code system into Source review; fold References into Paper draft) or keep ~12? (2026-07-02: the Evidence-table area dissolving — rows auto-created — pushes toward the merge.)
4. (New 2026-07-02) APA claim-support gating: since every row auto-gets a stub reference, what counts as "APA created" — genuine-APA shape heuristic, any non-empty value, or advisory-only until the per-row Generate button ships?

**SUPERSEDED (2026-07-02, later session):** the full re-audit is DONE. `docs/user-actions-per-surface.md` supersedes §4 as ground truth (note: it corrects §4's claim about a `research_query_submitted` event — no such event exists; ScholarAsk saves nothing to the DB). `docs/research-readiness-checklist-model.md` (v2) supersedes §3/§5.1 as the model design, pending 4 open decisions listed there. Next session: read those two docs first.

---

## 6. Standing guardrails (apply to ALL future work in this effort)

- Pure deterministic helpers under `src/lib/dashboard` — no external AI, no `Date.now()` in pure fns (inject `now`).
- UI = renderer only. No layout redesign; Paper design system (warm amber chips `bg-[#f6efe4]` / `text-[#8f6132]`).
- Real-data-wins; honest empty states; never fake completion; unmeasurable = advisory only.
- No migrations, no new tables, no sample rows written.
- Stage ONLY the phase's files; never `src/app/layout.tsx`, `src/middleware.ts`, `.vibeyardignore`.
- STOP before checkpointing — Codex does a live Edge browser check (full width + half width) first.
- Commit messages end with: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>` (or current model equivalent).
- Explain in plain language for the user (non-technical founder); one clear recommendation, not menus.

## 7. Verification commands

```bash
npm test                                                    # all dashboard tests (89 passing)
npx tsx --test src/lib/dashboard/researchReadiness.test.ts  # readiness only (18 passing)
npx tsc --noEmit                                            # clean
npx eslint <changed files>                                  # clean
git diff --check                                            # clean
```

## 8. Suggested first steps for the next session

1. Read this doc + `src/lib/dashboard/researchReadiness.ts` and its test.
2. Ask the user where their re-exploration landed: keep the multi-check checklist direction (§5.1) or a new direction?
3. Get answers to the three open decisions (§5.4).
4. Fix §5.2 items as part of whatever revision is approved.
5. After implementation: full verification (§7), then STOP for Codex browser review before any checkpoint. The uncommitted readiness work + Codex's card rework should checkpoint together once approved.
