# User Portal Readiness Audit — 2026-07-07

Four parallel audits (dashboard, Research Desk, Courses/Schedule, Help/Settings/Auth)
checked every page of the User Dashboard for three things: **real data** (not demo
numbers), a **real measurement system** behind the numbers, and a **complete
workflow** (every visible button leads somewhere).

Verdicts: ✅ READY · 🟡 PARTIAL · 🔴 FAKE/BROKEN · ⬜ MISSING

---

## Scoreboard

### /dashboard (cards page)

| Card | Verdict | Notes |
|---|---|---|
| Today's Target | ✅ | Real 1000-point pace model, settings persist, tested |
| Research Readiness (Focus) | ✅ | v2.5 check ledger fully wired, honest fallbacks |
| AI usage card | ✅ | New 8-state pace engine (2026-07-07), tested |
| Recent Changes | ✅ | Real activity events, honest empty state |
| Continue Learning | ✅ | Real course progress (demo-tagged only while catalog is empty) |
| Today's Schedule | 🟡 | Real recommender engine + persistence; dead "All" filter button |
| Current Project | 🟡 | Real project data, but "Current section" can only ever say Literature Review or Meta-analysis |
| Research Sections | 🟡 | Real 4-layer progress model; decorative "Today ▾" pill looks clickable, isn't |
| Today's Plan mini-calendar | 🔴 | Hardcoded "May 2024" picture; ←/→ arrows and "…" menu do nothing; only "+ Add task" is real |
| Weekly Activity | ⬜ | The math is computed every load but no card renders it |

### Research Desk

| Surface | Verdict | Notes |
|---|---|---|
| Workspace (PDF viewer, highlights, sticky notes, codes) | ✅ | Strongest surface in the app; full loop works |
| Literature Review table + CSV export | ✅ | All columns editable, syncs both ways with sticky notes |
| Upload page (two-path flow) | ✅ | Built exactly to the v3 spec, journey continues into Workspace |
| Meta-analysis wizard | ✅ | Persisted steps real; browser-only stats honestly labeled in-UI |
| Paper Writer | ✅/🟡 | Sync/Insert works; no export exists; tip references a "Methodology Guide" tab that was never built |
| ScholarAsk | 🟡 | Full UX works; conversations are localStorage-only; "AI ready" badge is hardcoded (lies when allowance is gone); panel "Save" writes to a localStorage list that only feeds the fake /research-desk page |
| Generate APA (per-row) | 🟡 | Backend `generate_apa` task fully built in /api/ai — **zero UI callers**; table cell has no button |
| **/research-desk sidebar page** | 🔴 | **Entirely fictional**: 4 fake projects, fake stats/evidence, ~6 inert buttons; unrelated to the user's real projects |
| Research Pathway card (spec §6.3) | ⬜ | Approved + spec'd, never built (needs `projects.research_question` migration) |
| Per-source Finish button (spec §7) | ⬜ | Approved + spec'd, never built (needs `pdfs.finished_at` migration) |

### Courses & Schedule

| Surface | Verdict | Notes |
|---|---|---|
| /courses/learn lesson player | ✅ | Watch → mark watched → notes → progress: all real |
| /my-learning + notes | ✅ | Real streaks/aggregation; only "Export as PDF" honestly labeled coming-soon |
| /admin/courses | ✅ | Real founder CRUD (YouTube-unlisted workflow); **catalog has no content until you add it** |
| /courses landing page | 🔴 | Static mock: fake course titles, fake 75% widget contradicting the real dashboard card, `|| 21` fillers dress up an empty catalog, dead Export/Settings buttons |
| **/dashboard/schedule full page** | 🔴 | 100% hardcoded, frozen at "May 2024"; every button a no-op — yet it's where "Open full schedule" sends users. Real task engine exists and is simply not connected |

### Help, Settings, Account, Auth

| Surface | Verdict | Notes |
|---|---|---|
| Help Center + articles + legal pages | ✅ | Current, accurate, no local-agent residue |
| Settings → AI | ✅ | Fully wired: key vault, guardrails, live usage meter |
| Auth: login/signup/reset/callback | ✅ core / 🔴 copy | Flows work; **DEVICE_NOTICE on login & signup still tells users to use "the laptop where your local AI agent is set up"** |
| Settings → Account | 🟡 | Name/About/password-reset real; Change photo, Connections, Login history, Active sessions are decorative |
| Help contact form | 🟡 | Real Resend integration + mailto fallback, but RESEND_API_KEY not configured anywhere yet |
| Settings → Preferences | 🔴 | Static mockup; Save button does nothing |
| Settings → Notifications | 🔴 | Static mockup; Save button does nothing |
| Settings → Privacy & Security | 🔴 | **Whole page describes the deleted local-agent world** ("files stay on your device"); every toggle inert |
| Settings → Danger Zone | 🔴 | Stale local-file actions; **Delete Account button has no code behind it** |
| Account deletion backend | ⬜ | Missing entirely — Privacy Policy promises it (legal exposure) |
| Settings → Help & Support | 🟡 | Wrong support email (`support@cerisescholar.app` vs real gmail); advertises Live Chat/System Status that don't exist |

### Cleanup / hygiene (no user impact, prevents future mistakes)

- Dead files: `HelpContactForm 2.tsx` / `3.tsx`, abandoned `buildDashboardSnapshot.ts` snapshot machinery, 4 empty local-* directories.
- Stale docs: `user-actions-per-surface.md` + `research-readiness-checklist-model.md` claim `research_query_submitted` doesn't exist — it shipped; recommendSchedule header comment stale.
- `check:legacy` guardrail doesn't catch "local agent / local-first" content drift — extend its forbidden list.

---

## Ranked gaps (biggest lie → smallest)

1. `/research-desk` sidebar page — fictional portfolio, the app's main nav destination.
2. `/dashboard/schedule` — fake calendar page linked from a real card; real engine exists unconnected.
3. Settings Privacy & Security + Danger Zone — stale local-agent story, inert controls, missing Delete Account (legal promise).
4. Login/signup stale "local AI agent" device notice — every visitor sees it.
5. `/courses` landing page — fabricated stats + duplicate fake widget.
6. Settings Preferences/Notifications — Save buttons that save nothing.
7. Generate APA — backend done, button missing (quick win).
8. Today's Plan fake May-2024 calendar + dead buttons ("…", "All", "Today ▾").
9. Weekly Activity computed but never shown.
10. ScholarAsk honesty nits (hardcoded "AI ready" badge, localStorage-only saves), Paper Writer dead tip.
11. Research Pathway card + per-source Finish button (spec'd systems, need migrations).
12. Contact-form email env config; support-email inconsistency; hygiene cleanup above.

---

## Proposed build phases

- **Phase A — Truth pass (small, high value):** fix all stale copy (login/signup notice, dashboard/account line, support email), remove or disable every dead button, replace the fake May-2024 mini-calendar with a real current-month strip, retire the fake widgets on /courses, extend check:legacy against local-agent drift, delete dead files/dirs, update stale docs.
- **Phase B — Wire what already exists:** connect /dashboard/schedule to the real dashboard_tasks engine (real week view, working add/complete); rebuild /research-desk on real projects/data keeping the founder's layout; real stats on /courses; render the Weekly Activity card; add the Generate APA button to the lit-review table; fix "Current section" to reflect all sections; ScholarAsk "AI ready" badge reads real state.
- **Phase C — New systems:** account deletion (API + confirmations, fulfilling the Privacy Policy); honest rewrite of Privacy & Security + Danger Zone; make Preferences/Notifications persist (or hide until real); Research Pathway card + Finish button with their two migrations; contact-form email config.

Status: awaiting founder priority decisions (see session notes) before building.
