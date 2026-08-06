# BYOK Key Intake — UI + Processing Architecture (designed 2026-07-05)

**Purpose:** full design for how users provide their own OpenRouter API key — the redesigned post-signup popup, the Settings page, and the server-side system that validates, stores, and uses the key. Referenced by `docs/architecture-pivot-roadmap.md` Phases 1 & 3. Founder-requested before Phase 1 construction so the engine is built with the right socket from day one.

---

## 1. The three UI surfaces (paper design system)

### 1a. Post-signup welcome popup (REPLACES the local-agent setup wizard)
One screen, skippable in one click, two-path layout (same pattern as the Add sources page):

```
┌──────────────────────────────────────────────────────┐
│  Welcome to Cerise Scholar ✨                         │
│  Your AI research assistant is ready to use.          │
│                                                       │
│  ┌────────────────────┐   ┌─────────────────────────┐ │
│  │ INCLUDED AI        │   │ YOUR OWN KEY (optional) │ │
│  │ Free · no setup    │   │ Unlimited · ~2 minutes  │ │
│  │ Fair-use monthly   │   │ [ sk-or-…  paste key ]  │ │
│  │ allowance          │   │ [ Connect key ]         │ │
│  │                    │   │ Get one free at         │ │
│  │ [Start researching]│   │ openrouter.ai ↗         │ │
│  └────────────────────┘   └─────────────────────────┘ │
│                                                       │
│  You can switch anytime in Settings → AI       [skip] │
└──────────────────────────────────────────────────────┘
```

Rules: "Start researching" (primary, left) simply closes — the default lane needs ZERO setup. The key field validates inline on Connect (spinner → green "Connected — unlimited AI ✓" → closes). Popup shows ONCE (flag in localStorage or profile); never blocks; Escape/skip always available. Never mention ChatGPT/Claude subscriptions (banned path).

### 1b. Settings → AI page (permanent home; replaces Local Setup page)
- **Your AI plan** card: either "Included — free" + usage meter (allowance/used, Phase 2 data) or "Your own key — unlimited" + masked key `sk-or-••••…{last4}`.
- **Connect / manage key** card: paste field + Connect; when connected: preferred-model dropdown (optional; default = our chain), Disconnect button.
- Copy stays warm and 2-line-friendly per readiness copy rules.

### 1c. Allowance-reached moment (the natural conversion point)
When a default-lane user exhausts the monthly allowance, the friendly error includes: "Connect your own key for unlimited — takes 2 minutes → Settings → AI".

## 2. The processing pipeline (server side)

```
paste → POST /api/ai/key ──▶ validate live against OpenRouter ──▶ encrypt ──▶ store row
                                                                    │
every AI request ──▶ resolveAiCredentials(userId) ──▶ byok? decrypt just-in-time, user's models
                                                  └─▶ default? founder key + allowance check
```

### 2a. New API route `src/app/api/ai/key/route.ts`
- `POST {key}`: auth required → rate-limited (abuse brake, e.g. 10/day) → live validation against OpenRouter (`GET /api/v1/key` for validity/limits; fallback probe = 1-token completion on a **:free model** so validation costs the user $0) → on success: encrypt + upsert, return `{connected: true, last4}`. On failure: clear reason (invalid / no credits).
- `DELETE`: removes the row (Disconnect).
- Key is NEVER echoed back; responses carry `last4` only. Redact key from all logs/error messages.

### 2b. Storage: table `user_ai_settings` (migration — bundle with `projects.research_question` + `pdfs.finished_at`)
| column | type | note |
|---|---|---|
| user_id | uuid PK → auth.users | one row per user |
| provider | text default 'openrouter' | future-proof |
| encrypted_key | text | AES-256-GCM ciphertext (iv+tag+data, base64) |
| key_last4 | text | display only |
| preferred_model | text null | optional BYOK model choice |
| created_at / updated_at | timestamptz | |

- RLS: owner-only (all ops `auth.uid() = user_id`) — same pattern as every other table.
- **Encryption model:** ciphertext is useless without `BYOK_ENCRYPTION_KEY`, a server-only env secret (set in Azure config; never `NEXT_PUBLIC_`). Even though the owner could SELECT their own ciphertext via RLS, they cannot decrypt it — and the plaintext never reaches any browser. Encrypt/decrypt helpers in `src/lib/server/keyVault.ts` (Node `crypto`, AES-256-GCM, random IV per write).

### 2c. Lane resolver `src/lib/server/aiCredentials.ts` (built IN Phase 1 as the socket)
```ts
resolveAiCredentials(userId) → {
  lane: 'byok' | 'default',
  apiKey,                       // decrypted user key | env OPENROUTER_API_KEY
  models: string[],             // byok: [preferred_model] or default chain
                                // default: [FREE_PRIMARY, PAID_FALLBACK] (OpenRouter native fallback array)
  enforceAllowance: boolean     // default lane only
}
```
`/api/ai` and `/api/research` call this once per request. Phase 1 ships it with the default lane only (byok branch returns nothing until Phase 3 lands the table) — zero rework later.

### 2d. Failure semantics (honest, no silent spending)
- BYOK key declined at request time (revoked/out of credits): return a clear, actionable error — "Your OpenRouter key was declined (out of credits or revoked). Fix it in Settings → AI." **NO silent fallback to the founder key** (would spend founder budget invisibly and surprise the user). One-click path back: Disconnect → default lane resumes with allowance.
- Default-lane free model exhausted: OpenRouter's `models` array falls to paid Qwen3 32B automatically (pennies); allowance still gates totals.

## 3. Build order impact
- **Phase 1** builds `openrouter.ts` + `aiCredentials.ts` (default lane live, byok branch stubbed) — the socket.
- **Phase 3** builds table + `/api/ai/key` + popup redesign + Settings page — the plug. No engine rework.
- Migration bundle now contains: `projects.research_question`, `pdfs.finished_at`, `user_ai_settings`.

## 4. Security checklist (review gate for Phase 3)
- [ ] Key travels browser→server exactly once (POST body over HTTPS), never stored client-side, input cleared after submit
- [ ] AES-256-GCM with env-held secret; unique IV per encryption; secret set in Azure config, absent from repo
- [ ] No key material in logs, error messages, or API responses (last4 only)
- [ ] Validation endpoint rate-limited; validation probe uses a free model (costs user $0)
- [ ] Disconnect deletes the row (no soft-delete of secrets)
- [ ] RLS owner-only on `user_ai_settings`; `check:legacy` + storage guardrails still pass
