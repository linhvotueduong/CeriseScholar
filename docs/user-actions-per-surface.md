# USER ACTIONS PER SURFACE — Ground Truth Map

**Date:** 2026-07-02 (full code re-audit by three explorer agents, ordered by founder)
**Supersedes:** §4 of `docs/research-readiness-handoff.md`. If they disagree, THIS doc wins.
**Purpose:** the complete list of what a user can actually DO on each surface and exactly what each action saves. The Research Readiness checklist model (`docs/research-readiness-checklist-model.md`) must only ever measure signals listed here.

---

## 1. Dashboard & Project Settings (`/dashboard`)

| User action | What it saves | Where |
|---|---|---|
| Create project (name, description) | new project row | `projects` (name, description, color) |
| Switch active project | nothing | UI state only |
| Today's Target 3-dot menu → set **Deadline** | target date | `dashboard_project_settings.target_completion_date` |
| → choose **Pace** (Low / Moderate / High) | pace | `dashboard_project_settings.pace` |
| → Optional: work days/week (4–7), daily minutes (45/60/90/120), manual override % | schedule prefs | `dashboard_project_settings.work_weekdays`, `.preferred_daily_minutes`, `.manual_target_percent` |
| → **Project Model**: project type, quality level, complexity, **expected sources**, expected pages, meta-analysis-required checkbox | project model | `dashboard_project_settings.project_type` + `.project_scope` (JSON) |
| Add / complete schedule task | task row / status | `dashboard_tasks` (+ `dashboard_task_completed` event) |
| Rate section progress ("Too high / About right / Too low") | calibration feedback | dashboard feedback table |

**Readiness gold:** `project_scope` contains the user's OWN declared expected sources/pages — thresholds can scale from what the user said their project needs, instead of arbitrary small/medium/large buckets.

## 2. Upload (`/dashboard/upload`)

| User action | What it saves | Where |
|---|---|---|
| Drag-drop or pick a PDF → upload | file + metadata | Supabase Storage `pdfs/{userId}/{fileId}.pdf` + `pdfs` row (display_name, pdf_author, pdf_title, page_count, ocr_status) + `source_uploaded` event |
| (automatic) background OCR | extracted text | `pdfs.ocr_status`, `pdfs.ocr_text` — **system behavior, not a user action** |
| Delete a document | removes file + row | Storage + `pdfs` |

## 3. Workspace — project page + PDF viewer

The reading-and-evidence surface. **The single most important mechanic in the product:**

**Highlight flow:** enable highlight mode → select text → **"Add a Note" modal** opens offering (a) color picker, (b) **code selector dropdown**, (c) **note textarea**, (d) Save / Skip. On save, ONE user gesture writes up to FOUR places:

1. `highlights` row (text, page, color, code_id) + `highlight_created` event
2. **AUTO-CREATED `literature_review_entries` row** (`useHighlights.ts:85`) carrying source, page, quoted text, `code_name`, note → `user_notes`, and an **auto-stubbed `apa_reference`** from PDF metadata
3. `annotations` row if a note was written (+ `note_created` event)
4. (currently broken, silent) fire-and-forget local-agent call to upgrade the APA stub (`useHighlights.ts:99-131`) — being replaced by a per-row Generate APA button per founder decision

| Other user action | What it saves | Where |
|---|---|---|
| Edit a note inline (sidebar) | note text, synced BOTH ways | `annotations.content` + `literature_review_entries.user_notes` |
| Delete highlight | removes highlight AND its lit row | `highlights` + `literature_review_entries` |
| Code System panel: create / rename / recolor / delete codes | code rows | `codes` — **WARNING: default codes are auto-inserted if none exist** (`useCodes.ts`) — "has codes" does NOT mean the user made them |
| Assign highlight → code | code link | `highlights.code_id` (mirrors into row `code_name`) |
| Read aloud | nothing | TTS, ephemeral |
| **PDF Chat** (ask questions about this PDF) | **NOTHING** | ephemeral — no DB, no localStorage |

## 4. ScholarAsk (`/dashboard/project/[projectId]/scholar-ask`)

Two modes (toggle on the input box) + journey starter types:

- **"Research Answer" (normal mode):** question → 6 auto-generated search queries → OpenAlex (up to ~28 deduped papers) → AI synthesizes a structured evidence answer (Summary, Key Mechanisms, Evidence Map table, What the Evidence Suggests, Limitations, Confidence, 3 follow-ups) with clickable [n] citations.
- **"Research Journey" (mentor mode):** research-pathway guidance for solving research blocks. Three starter TYPES (buttons): **"Find the bridge"** (connect a raw idea to concepts/literatures/search terms when direct sources are scarce), **"Narrow my question"** (rough idea → researchable questions/variables/scope), **"Map the evidence"** (direct vs adjacent evidence, gaps, safe claims) — plus a default open-mentor mode when the user types their own journey question. Output: Research Readiness stage, Literature Fit, Diagnosis, Concept Bridge, Evidence Map, Strategy, 3 Pathways, Next Best Step, Reflective Question.

| User action | What it saves | Where |
|---|---|---|
| Submit question / follow-up (either mode) | conversation | **localStorage ONLY** (`cerise_ask_${projectId}`) |
| Click starter type button | prefills query + sets mode/intent | localStorage (as part of conversation) |
| Click citation [n] / reference → paper panel opens, AI writes "how this paper connects" | analysis | in-memory only — lost on reload |
| "Read paper ↗" | nothing | external DOI link |
| Copy response / show references / retry / new research / delete conversation | conversation list changes | localStorage only |

**CRITICAL FOR READINESS — CORRECTION 2026-07-07:** the claim below that ScholarAsk writes nothing at all is now FALSE. `/api/research` (`src/app/api/research/route.ts`) fire-and-forget inserts one `dashboard_activity_events` row (`event_type: "research_query_submitted"`, `section_id: "scholarask"`) per question/journey answer — added in AI-pivot Phase 1 specifically so this "Theme clarity" check would stop being unmeasurable. The readiness engine (`src/lib/dashboard/researchReadiness.ts`, `src/lib/dashboard/deriveDashboardState.ts`) consumes this event to satisfy checklist item 3.1 ("Pathways explored") in `docs/research-readiness-checklist-model.md`. Everything else in this section still stands: the conversation content itself still saves nowhere but **localStorage ONLY** (`cerise_ask_${projectId}`) — there is still no save-to-lit-review path, and no other ScholarAsk action persists server-side.

<details><summary>Original 2026-07-02 claim (superseded above)</summary>

ScholarAsk writes **NOTHING to the database. Not even an activity event** — the `research_query_submitted` event mentioned in older docs DOES NOT EXIST in code. There is no save-to-lit-review path. Every ScholarAsk check is therefore unmeasurable → advisory only, forever, until the product changes.

</details>

## 5. Literature Review (`/dashboard/project/[projectId]/literature-review`)

7-column table; **rows are born in the Workspace** (auto-created per highlight) and **enriched here**:

| Column | Editable? | Saves to |
|---|---|---|
| Document Name | no (links to viewer) | — |
| APA Reference | **yes** (paste/type; saves on blur) | `apa_reference` — starts as an auto-stub; **no Generate button exists yet** (planned: per-row click-generate, never table-wide) |
| Section / Code | **yes** | `code_name` |
| Quotes from Sources | no | — (from highlight) |
| My Insights / Notes | **yes** | `user_notes` + syncs to `annotations` |
| Synthesis Paragraph | **yes** — the analysis paragraph written from that row's quote + note, reused later in Paper Writer | `synthesis_paragraph` |
| Delete row | button | deletes the row |

Every cell edit logs a `literature_row_saved` event. Also: filters/search (client-only), Load more pagination, **"Export CSV"** button (downloads the table — client-only).

## 6. Paper Writer (`/dashboard/project/[projectId]/paper-writer`)

8 fixed sections (abstract, introduction, literature_review, methodology, results, discussion, conclusion, references).

| User action | What it saves | Where |
|---|---|---|
| Type in a section | content, auto-saved 1s after typing stops | `paper_sections.content` + `paper_draft_saved` event |
| **"Sync Materials"** button | **NOTHING by itself** — opens a preview panel of synthesis paragraphs (grouped by code) + APA references pulled from the Lit Review | reads `literature_review_entries` |
| "Insert" / "Insert all into Lit Review" / "Insert all into References" (in that panel) | appends text into the active section → triggers autosave | `paper_sections.content` |
| Section navigation, word counts, Show/Hide Tips | nothing | UI only |

**There is NO export / download / "Generate report" action anywhere for the paper.** The only exports in the whole app: Lit Review CSV and Meta-analysis plot SVGs. Any readiness move called "Generate report" is fake.

## 7. Meta-analysis (`/dashboard/project/[projectId]/meta-analysis`) — 5-step wizard

**LANDMINE: the `meta_analyses` row is auto-created the first time the page is OPENED** (empty fields). Row existence ≠ meta lane started. Gate on row CONTENT.

| Step | User actions | Persisted? |
|---|---|---|
| 1. Define | research question, hypothesis, hypothesis type (5 cards) | **YES** → `research_question`, `hypothesis`, `hypothesis_type` (debounced 600ms) |
| 2. Upload data | CSV/TSV/SAV upload, sample data | **NO — client-side only; gone on reload** |
| 3. Analyze | descriptives, correlations, t-test dropdowns | NO — computed live |
| 4. Effect sizes | map 15 columns (auto-guessed, user-overridable) | **YES** → `column_mapping` (JSON); computed effects NOT persisted |
| 5. Results canvas | add/remove plots (forest, funnel, bubble, Baujat, radial, L'Abbé, drapery, influence), export SVGs; forest plot auto-seeds on first entry | **YES** → `canvas_blocks` (JSON); method toggle + exports not persisted |

Each persist logs `meta_analysis_updated`.

---

## 8. Cross-surface facts

**Activity events that actually exist:** `project_opened`, `source_uploaded`, `highlight_created`, `note_created`, `literature_row_saved`, `paper_draft_saved`, `meta_analysis_updated`, `dashboard_task_completed`, `dashboard_schedule_updated`, `research_focus_opened`. (**`research_query_submitted` does NOT exist.**)

**Actions that leave NO trace (never measurable):** everything in ScholarAsk, PDF Chat, meta-analysis dataset uploads and computed statistics, read-aloud, filters/search, Sync Materials preview (until Insert is clicked).

**Auto-behaviors that can fool honesty checks:**
1. Every highlight auto-creates a lit row → "has rows" just means "has highlights".
2. Every row auto-gets a stub `apa_reference` → "APA non-empty" self-ticks.
3. Default codes auto-inserted → "has codes" self-ticks.
4. `meta_analyses` row auto-created on page visit → "row exists" self-ticks.
5. Forest plot auto-seeds on step-5 entry → "has a plot" partially self-ticks (only after reaching step 5 with 2+ effects, which does require real work).

**Moves that must NEVER appear in readiness (not product actions):** "Add lit rows", "Link evidence", "Strengthen claims", "Generate report", "Save to lit review" (from ScholarAsk), "Upload data" as a persisted meta check.
