# AI usage card — "usage speed health" states

**Date:** 2026-07-07 · **Status:** shipped (data engine `src/lib/ai/usagePace.ts`, card `DashboardExactTemplate.tsx`).

The dashboard's AI usage card (third tile in the top row, `Card className="h-[186px] p-[14px]"`) shows not just
"how much have I used" but "am I moving at a healthy speed" — so a user can tell, at a glance, whether they're
on track to comfortably last until the next reset, or heading for a wall. All logic lives in the pure engine
`deriveAiUsagePace` (`src/lib/ai/usagePace.ts`); the card is a thin renderer over its output.

## Lane / quota semantics

| Lane | Quota | Cycle | Resets |
| --- | --- | --- | --- |
| **Included** (`lane: "default"`) — no OpenRouter key connected | 150 requests/month (`INCLUDED_MONTHLY_ALLOWANCE`, env override `NEXT_PUBLIC_INCLUDED_MONTHLY_ALLOWANCE`) | Calendar month (UTC) | 1st of next month, 00:00 UTC |
| **BYOK** (`lane: "byok"`) — user's own OpenRouter key connected | 1,000 free requests/day (env override `NEXT_PUBLIC_BYOK_DAILY_FREE_LIMIT`) | Calendar day (UTC) | Next midnight UTC |

The lane is decided by whether the user has a connected key (`aiUsage.keyLast4` truthy → byok). The "used" figure
fed into the pace engine differs by lane: Included uses `usedThisMonth` (this month's default-lane count); BYOK
uses `usedToday` (today's count, any lane — a BYOK user's calls are effectively always byok-lane).

Note: this v1 paces against **request count only**. OpenRouter also exposes a live credit balance
(`GET https://openrouter.ai/api/v1/key`) — pacing against remaining *credit* (not just request count) is a
plausible follow-up once BYOK spend tracking matters more, but is out of scope for v1.

## The 8 states

States are evaluated in priority order — the first matching rule wins. Named thresholds live in
`src/lib/ai/usagePace.ts` (`MIN_SAMPLE_REQUESTS`, `MIN_ELAPSED_FRACTION`, `ALMOST_FULL_PERCENT`,
`HIGH_PACE_RATIO`, `LIGHT_PACE_RATIO`, `SPIKE_MIN_USED_TODAY`, `SPIKE_MULTIPLIER`).

### 1. Paused
- **Chip:** "Paused" · **Tone:** neutral (grey)
- **Trigger:** `used >= quota` (checked first — overrides every other rule, including an active spike alert).
- **Notice:** "Quota reached" / "Usage is paused until the reset."
- **Plain language:** the cycle's quota is fully used up; nothing more will go through until the reset.

### 2. Ready
- **Chip:** "Ready" · **Tone:** neutral (grey)
- **Trigger:** `used === 0` (checked before every pace/spike rule).
- **Notice:** "No usage yet" / "Once you start using Cerise, pace shows here."
- For the Included lane with **no key connected and no usage yet**, this is also the "AI — Setup pending" title
  state, and the notice's second line is replaced with a "Set up OpenRouter key →" link to `/settings/ai`
  instead of the pace body.

### 3. Refill soon
- **Chip:** "Refill soon" · **Tone:** red
- **Trigger:** `percent >= 90` **and** the projected burn rate would exhaust the remaining quota before the
  cycle resets (`willRunOutBeforeReset`).
- **Notice:** "Almost exhausted" / "At this speed you may hit the limit before reset."
- **Plain language:** not just almost full — moving fast enough that it will likely run dry before the reset.

### 4. Almost full
- **Chip:** "Almost full" · **Tone:** amber
- **Trigger:** `percent >= 90` but the pace is on track to last until the reset (the "refill soon" run-out check
  did not trigger).
- **Notice:** "Quota is almost full" / "Pace is healthy, but little balance remains before reset."
- **Plain language:** little balance left, but at the current (healthy) pace it should still make it to the reset.

### 5. Alert
- **Chip:** "Alert" · **Tone:** red
- **Trigger:** guardrails' "unusual spike" alert is enabled (`spikeAlertEnabled`) **and**
  `usedToday >= max(20, 3 × priorDailyAverage)` **and** `priorDailyAverage > 0`. Checked only once the quota isn't
  already ≥90% used (states 3/4 take priority over a spike at high utilization).
- **Notice:** "Unusual activity" / "Usage is far above your normal pattern. Review in Settings." — the whole
  notice box is a link to `/settings/ai`.
- **Plain language:** today's usage is at least 20 requests and at least 3× the user's own recent daily average —
  a real behavior change, not just a big number in isolation.

### 6. High pace
- **Chip:** "High pace" · **Tone:** amber
- **Trigger:** `paceRatio >= 1.5`, where `paceRatio = used / (quota × cycleElapsedFraction)` — i.e. using at
  least 50% faster than a perfectly even pace would predict by this point in the cycle. Only evaluated once
  there's enough signal: `used >= 5` **and** `cycleElapsedFraction >= 0.05` (the "min-sample guard" — a handful
  of early requests never reads as a dramatic spike).
- **Notice:** "Usage speed is high" / "At this pace you may run out in about {N hours/days/weeks/months}."
  The duration is the projected time-to-exhaustion at the current burn rate, humanized (hours below 36h, days
  below 14d, weeks below 8w, months otherwise — e.g. "about 9 months").

### 7. Light (Active)
- **Chip:** "Active" · **Tone:** green
- **Trigger:** `paceRatio <= 0.5` — using well under half of what an even pace would predict by now.
- **Notice:** "Usage is light" / "At this pace your quota lasts well past the reset."

### 8. Active (normal)
- **Chip:** "Active" · **Tone:** green
- **Trigger:** none of the above — pace ratio is between 0.5 and 1.5, a healthy middle.
- **Notice:** "Usage speed is normal" / "At this pace you'll stay comfortably within the quota."

## Card layout

Fixed vertical rhythm inside the unchanged `h-[186px] p-[14px]` card slot (158px inner height):
1. Title (`AI — OpenRouter key` / `AI — Included` / `AI — Setup pending`) + status chip.
2. Large percent (`{percent}%`, red when tone is red).
3. Meta line: `Used {used} · Left {left} · {resetsLabel}`.
4. Progress bar (track `#eee7de`; fill colored by tone, minimum 2% width once `used > 0`).
5. Notice box (title + 2-line-clamped body), tone-colored background; wrapped in a link to `/settings/ai` for
   the Alert state, or showing a "Set up OpenRouter key →" link in place of the body for the Setup-pending state.

## Data sources

- **Pure engine:** `src/lib/ai/usagePace.ts` (`deriveAiUsagePace`) — zero server imports, fully unit tested
  (`usagePace.test.ts`).
- **Server counts:** `src/lib/server/aiUsage.ts` — `getMonthlyDefaultLaneUsage`, `getMonthlyTotalUsage`,
  `getDailyUsage`, `getPriorDailyAverage` (all fail-open: a query error warns and returns 0, never throws).
- **Guardrails:** `src/lib/server/aiGuardrails.ts` (`getAiUsageGuardrails().unusualSpikeAlert`), defaulting to
  `true` on any failure.
- **API route:** `GET /api/ai/usage` (`src/app/api/ai/usage/route.ts`) returns the full contract — original
  fields (`lane`, `used`, `usedThisMonthTotal`, `allowance`) plus `usedToday`, `priorDailyAverage`, `quota`,
  `cycle`, `cycleElapsedFraction`, `cycleRemainingMs`, `spikeAlertEnabled`.
- **Dashboard plumbing:** `useDashboardState.ts` fetches usage directly from Supabase (not via the API route,
  following its existing pattern) and passes it through `deriveDashboardState.ts` → `aiUsage` →
  `buildDashboardSnapshot.ts`'s `cards.aiUsage`.
