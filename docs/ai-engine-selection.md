# AI Engine Selection — Phase 1 Research (2026-07-05)

**Method:** three parallel research agents with live web verification (AI pricing/terms change monthly — nothing below is from stale memory). Full citations in each section.
**Status:** recommendation presented; awaiting founder go. Slots into `docs/architecture-pivot-roadmap.md` Phase 1.

---

## Option 3 — Use own subscriptions (ChatGPT Plus / Codex / Claude): ❌ CLOSED

Verified July 2026, per-provider:

| Subscription | Founder's sub → power the app for all users? | Each user's own sub → power their own usage? |
|---|---|---|
| ChatGPT Plus/Pro | **No** — zero API credits included | **No** — "Sign in with ChatGPT" quota-passthrough was explored (2025 DevDay demos) but NEVER formally shipped; Codex CLI linking gives only a one-time credit gift |
| OpenAI Codex | **No** — account pooling violates ToS | **Gray** — undocumented backend endpoint, personal-use-only informal tolerance; can break overnight; not for production |
| Claude Pro/Max | **No** | **No — explicitly BANNED**: Anthropic prohibited subscription OAuth in ALL third-party tools (policy Feb 2026, full enforcement 2026-04-04; only Claude Code CLI + claude.ai exempt) |
| GitHub Copilot | **No** | **Gray** — Copilot SDK (GA June 2026) does bill each user's own sub, but scope is coding tools; an academic app is outside intent |
| Google AI Pro/Ultra | **No** | **No** — chat-only subs, zero API |

**Verdict:** no compliant path. Any gray route risks account bans and overnight breakage. Sources: OpenAI Help Center; The Register 2026-02-20; winbuzzer 2026-02-19; github.blog changelogs 2026-06-02/23.

## Option 1 — Free tiers: ✅ VIABLE, generous headroom

Cerise beta scale ≈ 50 requests/day (1,500/month). Free capacity available:

| Provider | Best free models | Free req/day | Commercial OK | Trains on data? |
|---|---|---|---|---|
| **OpenRouter `:free`** | Nemotron 3 Super 120B, GPT-OSS 120B, Gemma 4 31B, Llama 3.3 70B, Qwen3 | 50 → **1,000 with one-time $10 credit deposit** (20 RPM) | Yes | **No** |
| Groq | Llama 3.3 70B, GPT-OSS 120B (very fast LPU) | 1,000 (8B model: 14,400) | Yes | No |
| Google Gemini | 2.5 Flash | 1,500 | Yes (no SLA) | **YES on free tier — disqualifying for users' academic PDFs/abstracts** |
| Mistral Experiment | Large | ~2 RPM only | Eval only | opt-in terms |
| Cerebras / GitHub Models / Cloudflare | various | ~1,000 / 150–1,000 / small | mixed | mostly no |

Key facts: OpenRouter free limits are PER KEY (founder key = shared pool for all users; BYOK users each get their own pool). OpenRouter does not train on requests; its **ZDR (Zero Data Retention) setting** restricts routing to no-training providers. Sources: openrouter.ai/docs/api/reference/limits, console.groq.com/docs/rate-limits, ai.google.dev rate-limit docs.

## Option 2 — Paid, top-5 ranked (all on OpenRouter; monthly cost @ 6M in + 1.5M out)

| # | Model | $/1M in | $/1M out | Context | Est./month | Note |
|---|---|---|---|---|---|---|
| 1 | DeepSeek V4 Flash | $0.09 | $0.18 | 1M | **$0.81** | Strong (#9 AA Index) but verbose — output bloat raises real cost |
| 2 | **Qwen3 32B** | $0.08 | $0.28 | 32K native/131K | **$0.90** | ArenaHard 93.8; excellent instruction-following for structured synthesis |
| 3 | Mistral Small 4 | $0.15 | $0.60 | 262K | $1.80 | Cleanest data policy (EU/GDPR, no training) |
| 4 | GPT-5-mini | $0.25 | $2.00 | 400K | $4.50 | Best guaranteed schema/format compliance |
| 5 | Claude Haiku 4.5 | $1.00 | $5.00 | 200K | $13.50 | Near-frontier IF quality; premium option |

China-routing concern for DeepSeek/Qwen is mitigated by OpenRouter ZDR (forces US hosts with no-storage agreements). Sources: direct openrouter.ai model-page fetches July 2026; artificialanalysis.ai; Qwen3 tech report (arXiv 2505.09388).

---

## RECOMMENDED ENGINE (combines options 1+2 in ONE integration)

Free-first with a pennies-priced paid safety net, all through OpenRouter's single OpenAI-compatible endpoint — no architecture change from the locked dual-lane plan:

1. **Default lane (founder key):**
   - One-time **$10 OpenRouter credit deposit** → unlocks 1,000 free req/day permanently (credits also fund the fallback).
   - **Primary: a free model** (start: Gemma 4 31B or Nemotron 120B for synthesis; config-driven model id).
   - **Fallback: Qwen3 32B (paid)** via OpenRouter's native `models` fallback array — fires only when the free pool 429s. Worst case ≈ **$0.90/month** at full beta usage.
   - **Enable ZDR** on the OpenRouter account (academic-content privacy).
   - Per-user in-app allowance (roadmap Phase 2) still applies — protects the shared 1,000/day pool from one heavy user.
2. **BYOK lane:** unchanged — users paste their own OpenRouter key; their models, their limits, their bill.
3. **Explicitly rejected:** Gemini free tier (trains on user content); all subscription-token routes (banned/gray); multi-provider direct integrations for now (Groq direct fallback is an optional ~40-line resilience add-on later — keep one integration while small).
4. **Later, optional:** Claude Haiku 4.5 as a "premium mode" toggle; revisit defaults when usage stats (Phase 2 metering) exist.

**Founder's total AI bill: $10 once, then ~$0–1/month at beta scale.**
