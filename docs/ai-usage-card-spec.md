# Spec for Codex: repaint the dashboard "Local Setup" card as the AI usage card

**Date:** 2026-07-06 · **Status:** data side being built by Claude (Phase 2, `docs/architecture-pivot-roadmap.md`); this spec is Codex's half.
**Founder requirement:** SAME card slot, SAME size — content only changes.

## What changes
The dashboard card that currently renders local-agent readiness (Agent / Ollama / Folder / Safety checks from `localSetup`) becomes the **AI usage card**. The local-agent concept is retired (OpenRouter pivot, Phase 1 shipped).

## Data contract (Claude's side — will exist on `DashboardDerivedState`)
```ts
aiUsage: {
  lane: "default" | "byok";        // Included lane vs user's own key
  usedThisMonth: number;            // AI requests this calendar month (UTC)
  allowance: number | null;         // e.g. 150 for default lane; null for byok (unlimited)
  keyLast4: string | null;          // masked key suffix when connected, else null
}
```
The old `localSetup` field stays populated during the transition (don't break compile order); switch the card to `aiUsage`, after which Claude removes `localSetup` in the Phase 4 demolition.

## Rendering (paper design, same tokens as the card uses today)
- **Included lane (`lane: "default"`):** title "AI — Included (free)". Meter: "`{usedThisMonth}` of `{allowance}` requests this month" + a slim progress bar (fraction = used/allowance, cap 1; tone shifts amber ≥80%, red at 100%). Sub-line CTA when ≥80%: "Connect your own key for unlimited → Settings → AI" (link `/settings/ai`).
- **BYOK lane (`lane: "byok"`):** title "AI — Your own key". Line: "Unlimited · `sk-or-••••{keyLast4}`". Stat: "`{usedThisMonth}` requests this month".
- Keep the card's existing height/position/typography scale; no icons beyond what the card family already uses.

## Also for Codex (separate, related)
- The uncommitted working-tree change shrinking the "Start next move" button (`DashboardExactTemplate.tsx`, 7px text) looks like an accidental regression vs the committed enlargement — please confirm intent; if unintended, `git restore` it.
