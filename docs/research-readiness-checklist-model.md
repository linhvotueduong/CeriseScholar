# Research Readiness — Checklist Model v2.4

**Date:** 2026-07-02 (v2.1 — founder resolved decisions + remapped areas; v2.2 — §5 presentation logic; v2.3 — §6 entry-point behavior analysis + Research Pathway home; v2.4 — §7 completion signals & moment-of-completion nudges, resolving the founder's "how do we know it's time to review rows?" question. ALL design questions now closed.)
**Supersedes:** §3 and §5.1 of `docs/research-readiness-handoff.md`, and v2 of this doc.
**Ground truth:** every check below measures ONLY signals listed in `docs/user-actions-per-surface.md`.
**Status:** design settled except one founder confirmation (see §4). No code rewritten yet; v1 `researchReadiness.ts` (18 tests) stays untouched in the working tree until the go.

**Copy rules (founder-approved):** Current status = noun-style macro area (2–3 words). Next move = verb-style micro action (2–3 words). No snake_case in UI, no gerunds in status. Status stays put while Next move walks that area's checklist; first macro area with an unmet required check wins. **Readiness summaries must fit TWO lines on the card, never spilling a word to a third (founder rule 2026-07-02): hard cap `READINESS_SUMMARY_MAX = 64` chars (the card's designed placeholder is 62), enforced by a unit test.**

**v2.5 display rules (founder browser feedback, 2026-07-02):**
- The readiness summary is the friendly WHY behind the suggested move — it explains the benefit ("A few more sources will give your review a stronger base."), never restates the command, never robotic. One why-line per micro-check in `CHECK_META`, all under the 2-line cap, test-enforced.
- Health rows never show check fractions ("5/8" reads as PDFs). **Evidence base** shows the COUNT of finish-reviewed sources ("2 finished"; proxy until the Finish button ships: sources with insights) and reads "Strong" only when every source is finished AND the capture checklist is done. The other three pillars use words only: Strong / In progress / Needs work / Not started.
- Start-next-move routing: `upload` is now a real dashboard section — "Upload a source"/"Add more sources" navigate to `/dashboard/upload` instead of the project workspace.

## Resolved decisions (founder, 2026-07-02)

- **A. Thresholds:** scale from the user's OWN declared plan (`project_scope` expected-sources etc.), with sensible fallbacks when unset. No fixed small/medium/large buckets.
- **B. Codes:** anyOf — creating/assigning codes in the Workspace panel OR typing a theme directly into the row's Section/Code column both count.
- **C. APA gate:** genuine-APA shape heuristic (author names + "(year)" pattern) — auto-stubs never pass; hand-pasted real references and the future per-row Generate button both pass.
- **D. Macro areas:** keep 9 + meta lane, with the founder's REMAP: **Theme clarity = ScholarAsk Research Journey work** (not coding); **coding work belongs to Evidence base** (Workspace capture); **Source review = reviewing annotations/rows in the Lit Review** (recommended by Claude, pending founder confirmation — see §4).

---

## 1. Macro areas and micro-checks (ordered)

### 1. Research plan — route: dashboard project settings
| # | Check | Signal | Move copy |
|---|---|---|---|
| 1.1 | Project named | `projects.name` meaningful (placeholder-gated) | "Name your project" |
| 1.2 | Target date set | `dashboard_project_settings.target_completion_date` | "Set target date" |
| 1.3 | Pace chosen | `.pace` set | "Choose work pace" |
| 1.4 | Project model picked | `.project_type` + `.project_scope` present | "Pick project type" |

Escape hatch (kept from v1): real work (sources, highlights) satisfies 1.1–1.2.

### 2. Research topic — route: workspace (description)
| # | Check | Signal | Move copy |
|---|---|---|---|
| 2.1 | Topic described | `projects.description` meaningful; literature rows also satisfy (escape hatch) | "Add topic description" |

### 3. Theme clarity — route: ScholarAsk (`/dashboard/project/[projectId]/scholar-ask`)
Founder remap: this area = exploring research pathways in ScholarAsk **Research Journey** mode (Find the bridge / Narrow my question / Map the evidence / open mentor).

| # | Check | Signal | Move copy |
|---|---|---|---|
| 3.1 | Pathways explored | ≥ 1 `research_query_submitted` activity event with journey mode — **DEPENDS on the one-line server-side event log added in AI-pivot Phase 1** (see `docs/architecture-pivot-roadmap.md`); until that ships, this check is advisory | "Explore research pathways" |
| 3.A | *Advisory:* try the journey starter types for angle/strategy | unmeasurable detail (conversation content never persists) | never gates |

Escape hatch: real evidence work (uploads/highlights) satisfies 3.1 — doers who skip ScholarAsk are never trapped.

### 4. Evidence base — routes: Upload + Workspace (ALL capture work, per founder remap)
| # | Check | Signal | Move copy |
|---|---|---|---|
| 4.1 | First source uploaded | `pdfs` ≥ 1 | "Upload a source" |
| 4.2 | Source base built | `pdfs` count vs the user's own declared expected-sources (Decision A; fallback default when unset) | "Add more sources" |
| 4.3 | Sources readable | `pdfs.ocr_status` — system check; surfaces a move only on failure | "Check source text" |
| 4.4 | First highlight | `highlights` ≥ 1 | "Highlight a passage" |
| 4.5 | Notes captured | meaningful `annotations.content` OR row `user_notes` (anyOf — synced) | "Add sticky notes" |
| 4.6 | Codes created | user-touched codes ≥ 2 (exclude auto-inserted defaults) OR themes typed in row `code_name` (Decision B anyOf) | "Create your codes" |
| 4.7 | Highlights coded | fraction of highlights with `code_id` ≡ rows with `code_name` ≥ threshold | "Code your highlights" |

*(v1 "breadth / source balance" check remains DELETED per founder.)*

### 5. Source review — route: Literature Review (per founder question + Claude recommendation: reviewing the annotations FROM the sources, in the table)
| # | Check | Signal | Move copy |
|---|---|---|---|
| 5.1 | First insight refined | ≥ 1 row with meaningful `user_notes` beyond placeholder | "Review your rows" |
| 5.2 | Insights across sources | fraction of rows with meaningful `user_notes` ≥ threshold | "Write insights" |

### 6. Claim support — route: Literature Review (now purely references, matching founder's click-generate definition)
| # | Check | Signal | Move copy |
|---|---|---|---|
| 6.1 | References real | fraction of rows passing the genuine-APA shape gate (Decision C) ≥ threshold | "Add APA references" (→ "Generate APA" once the per-row button ships) |

### 7. Synthesis — route: Literature Review (v1 workspace routing = bug, fixed)
| # | Check | Signal | Move copy |
|---|---|---|---|
| 7.1 | First synthesis written | ≥ 1 meaningful `synthesis_paragraph` | "Write a synthesis" |
| 7.2 | Sources synthesized | synthesis coverage over FINISHED sources' rows (per-source ripening, §7.3; hatch until `finished_at` ships: rows with insights are ripe) ≥ threshold | "Synthesize your sources" |
| 7.3 | Synthesis quality | deterministic evaluator (no AI calls) | "Deepen your synthesis" |

### 8. Paper draft — route: Paper Writer (order follows product guidance)
| # | Check | Signal | Move copy |
|---|---|---|---|
| 8.1 | Lit review section first | `paper_sections.literature_review` meaningful | "Draft literature review" |
| 8.2 | Core sections drafted | intro, methodology, results, discussion meaningful | "Draft core sections" |
| 8.3 | References synced | `paper_sections.references` non-empty (real action: Sync Materials → Insert all into References) | "Sync references" |
| 8.4 | Abstract + conclusion last | both meaningful | "Write abstract last" |

### 9. Final review — terminal status (honest: NO paper export exists in the product)
Status **"Draft complete"** · Move **"Review full draft"** → Paper Writer. Becomes "Export your paper" only if an export feature ships.

### M. Meta-analysis lane — parallel, optional; never blocks the main ladder
Activates only on row CONTENT (question / hypothesis / mapping / canvas non-empty) or `project_scope` meta-required — never on row existence (auto-created on page visit).
| # | Check | Signal | Move copy |
|---|---|---|---|
| M.1 | Question + hypothesis defined | `research_question`, `hypothesis`, `hypothesis_type` all set | "Define your hypothesis" |
| M.2 | Data mapped | `column_mapping` non-empty | "Map your data" |
| M.3 | Results built | `canvas_blocks` ≥ 1 | "Build your plots" |

*(Dataset uploads are never persisted — never a check.)*

---

## 2. Honesty rules (v1 kept + map-derived)

1. Unmeasurable = advisory only; never `done`, never gates. Includes all ScholarAsk conversation content and PDF Chat. (Check 3.1 becomes measurable ONLY via the pivot Phase 1 event log.)
2. Placeholder text never counts as meaningful.
3. Escape hatches: real work satisfies setup checks (1.1–1.2, 3.1); lit rows satisfy topic (2.1).
4. Auto-behavior gates: auto-stub APA ≠ reference; auto-default codes ≠ created codes; auto-created meta row ≠ meta started; auto-created lit rows ≠ separate "add rows" work.
5. Moves must be real product actions with real routes; ScholarAsk routes to its real URL (v1 workspace fallback = bug). Banned fake moves: "Add lit rows", "Link evidence", "Strengthen claims", "Generate report", "Upload data" (meta), "Save to lit review" (ScholarAsk).
6. Pure deterministic helpers, no AI calls, inject `now`.

## 3. Implementation notes (when founder gives the go)
- Rewrite `src/lib/dashboard/researchReadiness.ts` + tests: `anyOf` groups, per-check thresholds (fractions + plan-scaled counts from `project_scope`), exclusion filters (default codes, APA stub shape, empty meta rows), move-sequence tests per area.
- `deriveDashboardState.ts`: extend `ReadinessSignals` (project_scope numbers, ocr_status, code ownership, APA shape counts, paper section keys, meta content flags, journey-event count).
- Surface→URL map in dashboard page.tsx (ScholarAsk real route).
- Coordinate with Codex's card rendering (readinessSummary/health/currentStatus/nextBestMove contract unchanged).

## 4. Founder confirmations — ALL RESOLVED 2026-07-02
1. ✅ **Source review = Lit Review** ("review the annotations from the sources"); all Workspace capture = Evidence base. Founder's timing concern ("how do we know when it's time to go row by row?") resolved by §7 completion signals.
2. ✅ **Research Pathway home = project-level card in the Workspace** (§6.3), three entry routes, Paper Writer pulls it into Introduction guidance later.
3. ✅ **Per-source "Finish" button + moment-of-completion nudges** (founder's own proposal, refined in §7).

---

## 5. Presentation logic v2.2 — status follows the user (non-linear usage)

**Founder requirement (2026-07-02):** users do NOT research linearly. Someone may work in the Workspace, hit a block, jump BACK to ScholarAsk Research Journey to re-brainstorm the pathway, then return. A fixed "first unmet area wins" ladder would nag such users. The model must present status promptly and accurately for real usage styles, not enforce a fixed format.

### 5.1 The three things the card must not conflate
1. **What the project HAS** — the ~27 checks, evaluated order-independently at all times (a ledger, not a ladder).
2. **Where the user IS** — their recent activity (already recorded per-surface in `dashboard_activity_events` with timestamps).
3. **What helps MOST next** — the recommendation (Next best move).

v1/v2.1 derived all three from ladder order. v2.2 separates them.

### 5.2 Expected user styles (design targets)
| Style | Behavior | What the card must do |
|---|---|---|
| **Planner** (linear novice) | follows the intended path start→finish | ladder order works as-is; teaches the method |
| **Collector** (sources-first) | dumps many PDFs before naming/describing anything | escape hatches (kept) — status = Evidence base, never "Name your project" |
| **Jumper** (iterative) | Workspace → block → ScholarAsk journey to re-brainstorm → back, possibly new uploads | status FOLLOWS them to Theme clarity while they brainstorm; no insight-nagging mid-exploration |
| **Early writer** (writes to think) | drafts paper sections on a thin evidence base | status = Paper draft (where they are); move may bridge to the foundational gap, phrased as help not scolding |
| **Meta-analyst** (quant-first) | goes to the wizard early | meta lane can BE the active status while worked on; never blocks otherwise |
| **Returner** (idle > window) | comes back after weeks | falls back to ladder bottleneck — the most foundational gap |

### 5.3 Status selection algorithm (deterministic; inject `now`)
1. Evaluate ALL checks (ledger).
2. Determine the **active area** = macro area of the MOST RECENT activity event within the recency window (default 7 days; tie-break by ladder order). Event→area map: `source_uploaded`/`highlight_created`/`note_created` → Evidence base; `research_query_submitted` (journey) → Theme clarity; `literature_row_saved` → earliest incomplete of {Source review, Claim support, Synthesis} (events don't say which column was edited — the checks' own state disambiguates); `paper_draft_saved` → Paper draft; `meta_analysis_updated` → Meta lane; settings changes → Research plan.
3. **Active area has unmet checks** → status = active area; move = its first unmet check. *(Help them finish what they're doing.)*
4. **Active area complete** → status = active area with completion tone ("Evidence base — solid"); move = BRIDGE to the earliest unmet area in ladder order, with reason copy. *(Foundations first, but only when they're between things.)*
5. **No recent activity** (new project / returner) → v2.1 fallback: first unmet area in ladder order wins.
6. Advisory checks never appear as the move; meta lane never captures status via fallback (only via active work).

### 5.4 Anti-nag guarantees (testable)
- Status NEVER points at an area the user is not in while they have recent activity elsewhere with unmet checks there.
- A completed area is never the move target.
- Jump-backs are legitimate: revisiting Theme clarity after Evidence base work re-anchors status there — no "you already did this" logic.
- Fraction checks may honestly regress when the denominator grows (new uploads dilute coded-fraction) — that is new work existing, not lost progress; copy must never accuse ("Code new sources", not "Code your highlights ✗").
- Same inputs (incl. injected `now`) → same outputs; tests assert each style row in §5.2 gets the documented behavior.

### 5.5 Card rendering (macro vs micro, contract unchanged)
- **Current status** (noun) = active area. **Next best move** (verb) = selected micro-check's move copy.
- **Checklist position** ("3 of 7") may show within the status chip — micro progress inside the macro.
- **Health rows [4]** = pillar ledger view, order-free: Plan (areas 1–3), Evidence (4), Review & support (5–6), Writing (7–9); meta lane appears only when active. Each row shows its areas' check counts — this is where the order-independent ledger is visible regardless of where status sits.

---

## 6. Entry-point behavior analysis v2.3 — recognizing progress the system can't see

**Founder challenge (2026-07-02):** "Jumper" was too simple. What about users who run the meta-analysis BEFORE lit review or workspace? What about users who already HAVE their research pathway and never use ScholarAsk — where does the system recognize that? Plan for pre-expected user behavior so the system reflects TRUE progress.

### 6.1 The core discovery
The model measures **artifacts**. But users arrive with work already done in their heads or elsewhere, and some of that work has **no home in the product** — most critically the **research pathway** (question + angle): outside the meta wizard, there is nowhere in Cerise Scholar to state your research question at all (`docs/user-actions-per-surface.md` confirms; the old audit noted "no stored research goal/question outside meta_analyses"). A system cannot recognize what it gives users no place to say.

**Principle hierarchy:** a HOME (a place to state what you have → recognized progress) beats a HATCH (silently skipping a check → unexplained skip) beats a NAG (asking users to redo work they did elsewhere). v1/v2.1 only had hatches.

### 6.2 Entry-point archetypes (first meaningful work × what they arrive with)
| Archetype | Arrives with | First work | What must happen |
|---|---|---|---|
| **Blank-page explorer** | vague interest, no question | ScholarAsk Research Journey | pathway forms in ScholarAsk → needs a SAVE path into the pathway home (see 6.3) |
| **Assigned-question student** | pathway from supervisor/proposal | Upload | must be able to STATE the pathway in 30 seconds (home), not be nagged to "explore pathways" they already have |
| **Data-first analyst** (founder's case) | dataset + hypothesis | Meta wizard step 1 | meta `research_question`+`hypothesis` IS their pathway → **cross-lane recognition: M.1 satisfies Theme clarity**; status = Meta lane while active; bridge later to Evidence base for the narrative lit review |
| **Collector** | folder of PDFs | Upload ×N | escape hatches (kept) — straight to Evidence base status |
| **Write-to-think drafter** | half a draft / thinks by writing | Paper Writer | status follows them; pathway home available; bridge moves phrased as help |
| **Oscillator / Jumper** | mid-project blocks | any → ScholarAsk → back | §5 status-follows-user |
| **Returner** | stale memory | none recently | ladder fallback = most foundational gap |
| **Minimalist** | wants the least ceremony | anything | the card is a MIRROR, never a GATE — readiness never locks any surface |

*(Note: "lit-review-first" cannot exist — rows are only born from highlights; there is no add-row action.)*

### 6.3 The Research Pathway home (product addition — NEEDS FOUNDER GO)
Recommendation: make the pathway a first-class per-project artifact with ONE storage home and THREE entry routes:

- **Home:** a small "Research Pathway" card at the project level, visible in the Workspace header area (day-one visibility for every archetype). Fields: research question (main), approach/angle (optional), working hypothesis (optional).
  - *Founder's alternative considered — a tab in Paper Writer:* recommended AGAINST as the home (Paper Writer is the LAST room users visit; the pathway is needed on day one, and novices — who need it most — would never find it there). Instead, Paper Writer's tips/synced panel later PULLS the pathway in for the Introduction section — the founder's instinct honored where it pays off.
- **Entry route 1 — type it:** assigned-question students paste what they already have. Recognized instantly.
- **Entry route 2 — save from ScholarAsk:** a "Save as my pathway" button on Research Journey answers (which literally output "Possible Research Pathways"). This is ScholarAsk's FIRST real bridge into the database — strictly better than the activity event alone (keep the event too; it powers §5 status-following).
- **Entry route 3 — recognized from meta:** meta wizard step 1 (question + hypothesis) auto-satisfies the pathway. Data-first analysts never asked twice.
- **Storage decision (founder):** cleanest = tiny migration adding `projects.research_question` (+ optional approach column); zero-migration alternative = keys inside `dashboard_project_settings.project_scope` JSON. The "no migrations" guardrail belonged to the pure readiness-model effort; a deliberate product feature may justify one.

### 6.4 Check revisions this forces
- **Theme clarity 3.1 becomes a recognition SET (anyOf):** meaningful pathway text (any entry route) OR meta M.1 complete OR ≥1 journey event; escape hatch (evidence work) retained as last resort. Move copy adapts: "State your pathway" (home exists, empty) vs "Explore research pathways" (blank-page explorer).
- **Meta-first bridging:** when meta lane is the active area and M.1–M.3 are complete, the bridge move points to Evidence base ("Upload your sources") with reason copy about grounding the narrative review — never backwards to ScholarAsk.

### 6.5 Design principles (P1–P5, testable)
1. **P1 — Progress = artifacts, never sequence.** Any check may complete in any order; ladder order exists only for cold-start fallback and bridge suggestions.
2. **P2 — Homes beat hatches beat nags.** Every "arrived-with" must map to a home or an explicit hatch; nagging users to redo recognized work is a bug.
3. **P3 — Loops are first-class.** Revisiting earlier areas is normal research; status follows; only honest fraction dilution may lower numbers, with non-accusatory copy.
4. **P4 — Mirror, not gate.** Readiness never locks or orders the product's surfaces.
5. **P5 — When the system can't see, believe the user.** `manual_target_percent` already exists as an override valve; the pathway home extends the same philosophy.
6. **P6 — Declare only the invisible; observe everything else.** Completion of READING/capture is invisible (a PDF may honestly yield 3 highlights or 40) → user declares it with a Finish button. Completion of WRITING (insights, synthesis, sections) is visible in the artifacts → never ask for a button-click the text already proves. Guards against checkbox fatigue.

---

## 7. Completion signals & moment-of-completion nudges v2.4 (founder-proposed, refined)

**The problem (founder, 2026-07-02):** Source review = going row by row through a source's quotes — but the right TIME for that is "after finishing capture on that PDF," and no algorithm can detect that moment. Only the user knows.

### 7.1 The mechanism
- **Per-source Finish button — "Mark source finished."** Lives where the finishing happens: the PDF viewer header + the document panel (NOT the Lit Review — you finish a source while reading it). Writes `pdfs.finished_at` (small migration; rides together with the pathway migration) + logs a new `source_review_finished` activity event (existing events table, no schema change).
- **Moment-of-completion toast (founder's "small pop up reminder at the right corner"):** on finish-click, a corner toast: *"[Source] finished 🎉 — recommended: review its rows before your next move"* with a link into the Lit Review **pre-filtered to that source** (needs a URL param for the existing Source filter — small addition). The toast's recommendation comes from the SAME pure readiness engine (`nextBestMove`) — no second brain; readiness guidance now appears in-product at the right moments, not only on the dashboard card.
- **All-sources milestone (founder's second trigger):** automatic — when the LAST unfinished source is marked finished, a bigger toast: *"All sources captured — time to review the whole table"*. No separate button needed; the system can observe "every PDF has finished_at".

### 7.2 How it feeds the model
- **Evidence base gains a final check 4.8 — "Sources finished":** fraction of PDFs with `finished_at` (plan-scaled like 4.2). Move: "Finish a source".
- **Source review timing:** the §5 status algorithm treats `source_review_finished` as activity → immediately after a finish-click, status/move flow into "Review [source]'s rows". Check 5.1/5.2 completion is still measured by OBSERVED insights (P6) — the button drives *timing*, artifacts drive *truth*.
- **Escape hatch (minimalists, P2):** users who never click Finish are still fully measured — meaningful insights on a source's rows implies that source is finished. The button is a timing aid, NEVER a gate (P4).

### 7.3 Synthesis readiness (founder-corrected) — no button, FINISHED SOURCES ripen
Writing speaks for itself (P6), so synthesis needs no Finish button. The ripening unit is the **finished source**: once a PDF is finish-analyzed (its highlights, sticky notes, and section codes captured), its rows become ready — and the engine reminds the user to **write the synthesis column for that source's rows, based on each row's sticky-note material (highlight + note + section code)**. Move copy: "Synthesize [source]'s rows". Check 7.2 is measured over finished sources' rows only, so users are never prompted to synthesize a source they haven't finished analyzing. Until `finished_at` ships, the hatch proxy: a row is ripe when its insights are written. The all-sources milestone plus full synthesis coverage bridges status into Paper draft; the deterministic quality evaluator (7.3) still measures depth.

### 7.4 Build items this adds (product work, founder-approved in principle)
1. `pdfs.finished_at` column (migration — bundle with `projects.research_question`).
2. Finish button in viewer header + document panel; un-finish (undo) supported.
3. Toast component (corner, Paper design system) fed by the readiness engine; per-source + all-sources variants.
4. Lit Review source-filter URL param for toast deep-links.
5. New activity event type `source_review_finished` (string only — no schema change).

---

## 8. Next-move destination system v3 (designed + built 2026-07-03)

**Founder requirement:** every micro-status's Start-next-move must land somewhere real, and flows must CONTINUE (upload → workspace, not a dead end). Built:

| Moves | Destination | Continuation |
|---|---|---|
| Explore research pathways / State your pathway | **ScholarAsk real route** (`/dashboard/project/[id]/scholar-ask`) — new `scholarask` section id; v1's workspace-fallback bug CLOSED | later: "Save as my pathway" (§6.3) |
| Upload a source / Add more sources / Check source text | **Upload page WITH project context** (`/dashboard/upload?project=[id]`) | after upload → **that project's Workspace**; PDF now saved WITH `project_id` (was silently null from this page — fixed); page is now two-path: upload OR "find sources first" panel linking to ScholarAsk (founder request) |
| Highlight / sticky notes / codes / code highlights / finish sources | project Workspace | Finish button ships later (§7) |
| Review rows / insights / APA / synthesis moves | Literature Review table | later: source-filter deep-link (§7.4.4) |
| Draft moves / Review full draft | Paper Writer | later enhancement: `?section=` to open the exact section |
| Meta moves | Meta-analysis wizard (shows its own step state) | — |
| Name project / topic description | **Project identity editor — BUILT 2026-07-03:** the project name in the Workspace sub-nav is click-to-edit (✎), opening a paper-style popover with Project name + Topic description, saving to `projects.name`/`.description` | this is now the REAL destination for `plan.title` and `topic.described`; the Research Pathway field (§6.3) joins this popover once its migration lands |
| Set target date / pace / project type | currently Workspace (interim) | **CODEX SPEC — see §8.1** |

Notes (updated 2026-07-03): `/dashboard/upload` now SELF-RESOLVES its project when entered without `?project=` (e.g. via the sidebar): param → else the user's most-recently-updated project (the same default the dashboard uses) → else legacy behavior. Upload attaches the PDF and continues to that project's Workspace from ANY entry point. `recommendSchedule.ts` gained passive `upload` + `scholarask` templates (only used if those sections are ever scheduled).

### 8.1 Spec: Today's Target modal deep-open (the one Codex-side addition)

Goal: "Set target date / Choose work pace / Pick project type" moves open the Today's Target settings modal directly.

- **Codex's side (one small addition to `DashboardExactTemplate.tsx`):** accept a new optional prop `openTargetSettingsOnLoad?: boolean`. When it is true on mount (or when it turns true), open the SAME settings modal as the Today's Target 3-dot menu, once. No other behavior changes.
- **Claude's side (ready to build the same day Codex lands the prop):**
  1. `src/app/dashboard/page.tsx` reads `useSearchParams().get("panel") === "target"`, passes `openTargetSettingsOnLoad`, then `router.replace("/dashboard")` to clear the param so refresh doesn't re-open.
  2. Add section id `"settings"` to `DashboardSectionId`; route it to `/dashboard?panel=target` in `handleOpenResearchSection`; add a passive `recommendSchedule` template entry.
  3. In `researchReadiness.ts`, retarget `plan.target_date` / `plan.pace` / `plan.project_model` from `project_setup` to the new `settings` surface.
- **Why this shape:** the modal state lives inside Codex's template, so a one-way "open once" prop is the smallest possible contract; the URL param makes the destination routable like every other move — one system, no special cases.
