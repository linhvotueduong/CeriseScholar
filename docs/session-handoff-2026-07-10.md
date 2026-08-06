# Session Handoff — 2026-07-10

**Purpose:** let the founder continue with Claude in a fresh session without content drift.
**New session: read this file first, then `~/.claude/.../memory/MEMORY.md` (cerise-scholar-ai-pivot + fable-orchestrator-workflow), then `docs/portal-readiness-audit-2026-07-07.md` if deeper context is needed.**

## Who / how we work (standing agreements)

- Founder is non-technical; designs UIs himself (sends mockup screenshots), delegates all
  technical decisions. Plain language, define jargon, lead with why, ONE recommendation.
- **Claude (Fable) = orchestrator/architect ONLY.** All token-heavy work (research, builds,
  audits) is delegated to sonnet subagents — founder is usage-limited.
- Checkpoints saved as markdown in `docs/`. Commits and deploys only with founder approval.
  Deploy = push to `main` (Azure SWA auto-deploys); feature-branch pushes are safe backups.
- Codex (OpenAI CLI) is a second worker in this repo. Coordinate via handoff docs in `docs/`.
- The founder will NOT fund users' AI beyond ~$10 one-time OpenRouter credit. Dual-lane AI:
  Included (founder key, 150/month allowance) + BYOK (user's OpenRouter key). Never re-litigate.

## Repo state (as of last session, 2026-07-07)

- Path: `~/Documents/CeriseScholar`. Branch: **`pivot/openrouter-phase-1`**, latest commit
  **`d082bf7`** ("portal: full readiness push"), **pushed to GitHub**. 119 files, bundles
  Codex's Phase 4 local-agent demolition + the 11-agent portal readiness build.
- NOT merged to `main` / NOT deployed. Local `main` is 36 commits behind `origin/main`
  (stale local ref only — run `git pull` on main before any merge work).
- Tests **176/176**, `tsc` clean, `npm run check:legacy` clean (script now also catches
  "local agent / ollama / local-first" content drift).
- Supabase migrations **001–028 ALL APPLIED to production** (founder pasted 024–028 on
  2026-07-07, confirmed "Success. No rows returned").

## What exists now (built 2026-07-06/07, all live in the branch)

- **AI engine:** OpenRouter dual-lane; BYOK popup + Settings→AI (key vault AES-256-GCM);
  usage metering + 150/mo allowance; 8-state usage-pace card on dashboard
  (`src/lib/ai/usagePace.ts`, `docs/ai-usage-card-states.md`); guardrails (Codex).
- **Research Desk** rebuilt on real data + **Evidence Library v2** (table `evidence_library`,
  ScholarAsk Save→cloud, post-OCR AI analysis doc_type/evidence/caveat, retry endpoint,
  5-row scrolling card + full subpage `/research-desk/evidence-library`) + **Research
  Assistant chat** (status copilot, task `research_assistant` in `/api/ai`).
- **Personalization:** behavior profile engine → profile-aware daily task recommender →
  once-daily AI guidance note (table `ai_behavior_insights`, task `behavior_insight`),
  surfaced on Research Focus card + Project Overview; Project Overview unified onto the
  same sectionProgress/tasks engines as the dashboard.
- **Research systems:** Research Pathway (question/approach/hypothesis on projects + chip),
  per-source Finish button + toasts; readiness ledger consumes both as primary signals.
- **Honesty pass everywhere:** real schedule page, real courses page, Settings rewrite
  (real account deletion via `delete_my_account()` RPC, sign-out-all-devices, fake toggles
  removed), stale local-agent copy purged from auth/legal/help surfaces.
- Full inventory: `docs/portal-readiness-audit-2026-07-07.md` (built) — plus everything
  in `git show d082bf7 --stat`.

## Open items (the actual to-do list)

1. **Codex: backup-folder cleanup** — handoff ready at `docs/backup-folder-cleanup-handoff.md`
   (move 10 redundant folders ~7.1GB to Trash; iCloud "needs to be downloaded" workaround
   inside; founder empties Trash himself). Status: NOT yet executed as of 2026-07-07.
2. **Website folder assets** — `~/Documents/Website` (KEEP, quarantined) holds unique brand
   assets (cherry-character PNGs ×3, `exports/` background video ~34M) existing nowhere
   else. Future task: copy into main repo `public/brand/` with founder approval.
3. **OPENROUTER_API_KEY still missing from `.env.local`** — the Included lane (founder-funded
   allowance) is UNTESTED. Founder task: create a key at openrouter.ai and add the line.
   BYOK lane is fully verified live (founder's own key, sk-or-••••c0e6, $10 credits).
4. **Merge to main + deploy** — pending founder decision. Protocol: preview locally, founder
   approval, `npm run check:legacy` + `check:storage-strategy`, Azure free-tier check.
   At deploy time also remove dead `OLLAMA_API_KEY`/`OLLAMA_MODEL` secrets from
   `.github/workflows/azure-static-web-apps-*.yml` (deploy-config = needs founder OK).
5. **RESEND_API_KEY / RESEND_FROM_EMAIL unset** — help contact form degrades to a mailto
   link until configured (free Resend account works).
6. Small knowns: `ai_behavior_insights.day` written UTC but read by local day (rare
   midnight-UTC miss); Settings→Account still has decorative "Account Preferences"/Username
   rows; older dashboard spec docs carry stale pre-pivot content (allowlisted in
   check:legacy with TODOs); one transient `/api/ai` 502 from OpenRouter observed 2026-07-07
   — all AI features fail gracefully, watch for repeats.

## Dev-server recipes (port 3020 is this workflow's port)

- Start: `cd ~/Documents/CeriseScholar && npm run dev -- --port 3020` (background, log to
  scratchpad). Browser error "localhost refused to connect" = server not running → restart.
- Browser "ChunkLoadError … (stale)" or infinite spinner with a wrong Log In header =
  stale build/session: kill port 3020, `rm -rf .next` (safe generated cache), restart,
  then founder does **Cmd+Shift+R** and signs in again.
- Never stop another session's preview server (multi-session rule in AGENTS.md).

## Founder's most recent context (last messages of prior session)

Dev-server access issue was fixed (stale chunk cache + stale session); founder was about to
hard-refresh and sign back in. No unresolved question was pending. Next likely moves, in
rough priority: verify everything visually in the browser (his call), have Codex run the
trash-cleanup handoff, add OPENROUTER_API_KEY, then discuss merge/deploy.
