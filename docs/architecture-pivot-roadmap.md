# Architecture Pivot Roadmap — Local-Agent BYOK → OpenRouter

**Date:** 2026-07-02
**Status:** Decisions locked with founder. Implementation not started.
**Relationship to other work:** The Research Readiness effort (`docs/research-readiness-handoff.md`) is separate and unaffected — it uses zero AI. Its uncommitted work must be checkpointed before pivot demolition begins (see Phase 0).

---

## 1. Decisions (locked 2026-07-02)

| Question | Decision |
|---|---|
| AI provider | **OpenRouter, dual-lane.** Lane A (default): founder's OpenRouter key restricted to cheap models (DeepSeek / free-tier models), per-user monthly allowance, hard caps. Lane B (BYOK): users paste their own OpenRouter key in settings — any model they want, their bill, no caps from us. |
| Cost tracking | **Both layers.** Key-level spending cap on the OpenRouter dashboard (circuit breaker for total spend) AND in-app per-user usage recording + allowance enforcement (fairness + statistics). Key-cap alone is one shared bucket — one heavy user could drain it for everyone with no record of who or why. |
| Auth + database | **Keep Supabase.** It is already the delegated service (login, DB, RLS security walls, storage). Clerk + Neon rebuild rejected: 8–12 weeks, ~48 files, 82 hand-rewritten security rules, no user-visible gain. |
| File storage | **Cloud-only (Supabase Storage), retire the local vault.** The local-first storage strategy dies with the local agent. Vault docs/code get archived, not deleted. |
| Hosting | **Stay on Azure Static Web Apps** (already runs the server API routes OpenRouter needs; Vercel free tier would break the 5-minute OCR route). Revisit only at scale. |
| Users today | Founder only → **aggressive demolition is safe.** No migration ceremony. |
| Local agent | **Retire, don't fix.** Root causes of the failed test are documented in §2 — they validate retiring it. |

## 2. Why the local agent failed (diagnosis, 2026-07-02)

Diagnosed on the founder's Mac while the agent was running and "healthy":

1. **Browser security (the big one).** Modern Chrome/Edge enforce *Private Network Access*: a public HTTPS site (app.cerisescholar.com) calling a program on the user's own machine (http://127.0.0.1:43110) must receive an `Access-Control-Allow-Private-Network: true` response header from that program. `scripts/local-agent.mjs` never sends it → the browser silently blocks every request from the deployed site. Local dev (localhost → localhost) works, production fails. Doctor script can't catch this (it tests server-to-server, not browser-to-server).
2. **Tiny model.** Installed model is `llama3.2:1b` — a 1-billion-parameter model, far too small for research synthesis. Even with connectivity fixed, answers would be poor.
3. **Manual lifecycle.** The agent only runs while `npm run local-agent` is kept alive in a terminal; nothing auto-starts it. Any test without it running fails.

Lesson recorded: this architecture breaks silently and differently on every user's machine — the core reason for the pivot.

## 3. Phases and checkpoints

### Phase 0 — Clean the workbench
- Checkpoint the uncommitted Research Readiness + Codex card work first (per handoff: Codex does the Edge browser check, then both checkpoint together).
- Create a dedicated pivot branch from the clean tree.
- **Done when:** `git status` is clean and the pivot branch exists.

### Phase 1 — New AI engine (server side)
- **Engine selected 2026-07-05** (research: `docs/ai-engine-selection.md`): free-first via OpenRouter — free model primary (Gemma 4 31B / Nemotron 120B, config-driven) with paid Qwen3 32B fallback via OpenRouter's native `models` array; one-time $10 credit unlocks 1,000 free req/day; ZDR enabled on the account. Founder cost ≈ $10 once + ~$1/month. Subscription-token routes verified dead (Claude OAuth banned in third-party apps since 2026-04; ChatGPT Plus has no API path). Gemini free tier rejected (trains on user content).
- Create `src/lib/server/openrouter.ts` modeled on `src/lib/server/ollama.ts` (OpenAI-compatible chat call, Bearer `OPENROUTER_API_KEY`, model list from env).
- Point `/api/ai` and `/api/research` at it. Delete the hardcoded-email bypass (`src/lib/ai/hostedBypass.ts`) — all signed-in users get AI.
- Hidden AI call site found 2026-07-02: `src/hooks/useHighlights.ts:99-131` fire-and-forget auto-generates an APA citation via the local agent on EVERY highlight creation (silently failing today). Per the founder's readiness decision: REMOVE the auto-fire; replace with a per-row "Generate APA" button in Lit Review calling `/api/ai` (task `generate_apa`) — never mass-generate the whole table.
- While touching `/api/research`: add ONE line logging a `research_query_submitted` activity event (existing `dashboard_activity_events` table — no schema change) with mode + journey intent in details. This unblocks the readiness "Theme clarity" check (`docs/research-readiness-checklist-model.md` §3.1) — today ScholarAsk leaves zero DB trace.
- Remove the mobile AI block in `src/hooks/useLocalAgentStatus.ts` usage paths (cloud AI works on phones).
- **Done when:** ScholarAsk, paper analysis, APA generator, and Cerise Coach all answer via OpenRouter on the dev server — from a laptop AND a phone.

**ORDER CHANGE (founder, 2026-07-05): Phase 3 (BYOK intake) is being built BEFORE Phase 2** — the old local-agent popup was still appearing and actively advertising the dead architecture, and the founder wants the paste-key door open now. Safe to flip: BYOK reduces default-lane load, and metering must still land before outside beta users get Included-lane access. Also: the $10 OpenRouter deposit is DEFERRED — solo testing fits the 50 req/day free tier; deposit only when real users join the Included lane.

### Phase 2 — Usage meter + caps (before anyone else gets access)
- New table `ai_usage_events` (user_id, route, model, input_tokens, output_tokens, estimated_cost, created_at) + RLS. *(The "no new tables" guardrail belonged to the readiness effort, not this one.)*
- Record every AI call; enforce a per-user monthly allowance in the AI routes; friendly "allowance used" message in the UI.
- Manual step: set a hard monthly spending cap on the OpenRouter dashboard key.
- **Done when:** usage rows appear per call; a test allowance blocks correctly; total cost is queryable.

### Phase 3 — BYOK lane + onboarding replacement
**Full UI + key-processing design: `docs/byok-intake-design.md` (2026-07-05)** — two-path welcome popup (replaces the local-agent wizard), Settings → AI page, `/api/ai/key` validate-encrypt-store route, `user_ai_settings` table (AES-256-GCM, server-held secret), and the `resolveAiCredentials` lane resolver whose socket is built in Phase 1.
- Replace the "Local Setup" settings page with an "AI Provider" page: paste your own OpenRouter key → validated with a test call → stored server-side encrypted (never exposed to the browser). Shows current plan ("Included — free, fair-use allowance" with usage meter) vs "Your own key — unlimited".
- **Replace the post-signup local-agent setup popup (LocalSetupOnboarding) with near-nothing** (founder-confirmed 2026-07-05): new users need ZERO AI setup — AI works immediately on the default lane. Only a small dismissible welcome card: "AI is included free (fair-use allowance). Connect your own key anytime in Settings → AI." No blocking wizard.
- User-facing choice is TWO lanes only (Included vs Own key). Subscription-connect (ChatGPT/Claude) must NEVER be offered — legally banned/gray for third-party apps (see docs/ai-engine-selection.md Option 3).
- Routing rule: user has own key → use it (their models, no allowance); otherwise → default lane with allowance.
- **Done when:** a fresh signup reaches a working ScholarAsk with zero setup steps; an account with its own key and one without both work; removing the key falls back cleanly.

### Phase 4 — Demolition
- Remove: `scripts/local-agent*.mjs`, `scripts/mock-local-agent.mjs`, `scripts/local-ollama-security.mjs`, `scripts/local-permission-contract.mjs`, `scripts/local-vault-contract.mjs`, `scripts/check-ollama-security-gate.mjs`; `src/lib/local-agent/`, `src/hooks/useLocalAgentStatus.ts`, `src/components/local-agent/*`, `src/app/settings/local-setup/`; related package.json scripts and `LOCAL_AGENT_*` / `OLLAMA_*` env vars.
- Archive (move to `docs/archive/`): `local-first-agent-migration.md`, `local-agent-installer-plan.md`, `local-file-storage-strategy.md`.
- Update `AGENTS.md`: the storage rule currently pushes new files AWAY from Supabase Storage toward the vault — now inverted; cloud-only is the strategy. Retire or invert `check:storage-strategy` accordingly.
- **Done when:** `npm test`, `npx tsc --noEmit`, eslint, and `npm run check:legacy` all pass, and no live code references local-agent/Ollama/vault.

### Phase 5 — Ship
- Preview locally → Codex Edge browser check → founder approval (per standing deploy rules).
- Add `OPENROUTER_API_KEY` to Azure config; remove old Ollama vars. Verify Azure SWA Free limits still respected.
- **Done when:** ScholarAsk works on app.cerisescholar.com — including from a phone.

## 4. Later / explicitly not now
- Per-feature model routing (founder question, 2026-07-06): today one auto-selected chain serves all AI features (uniform task shape; free models handle all well). The engine already labels each request by feature (`route` param), so per-feature model choices (e.g. faster model for coach, strongest for synthesis) can be tuned server-side later with ZERO user-facing change — model selection is always the system's job, never the user's, on both lanes.
- Client-side OCR in the browser (WebAssembly Tesseract): each user's own device does its OCR — no server load, no queues, no limits, infinite scale. Interim shipped 2026-07-04: server-side OCR fixed (the `canvas` stub in next.config was silently breaking it), one-at-a-time queue replaces the 5/hour quota, 100/day abuse brake, graceful embedded-text fallback, per-document Retry button. NOTE: verify OCR live on Azure after next deploy — native canvas there is unproven; the fallback keeps documents honest if it fails.
- Paid plans / billing (use a merchant-of-record like Polar or Lemon Squeezy when the time comes — handles global sales tax for a solo founder). Revisit once real usage statistics from Phase 2 exist.
- Data-access layer cleanup (148 scattered queries) — hygiene, not urgent.
- Multi-admin support / un-hardcode `cerisescholar@gmail.com` (quick win, can ride along with any phase).
