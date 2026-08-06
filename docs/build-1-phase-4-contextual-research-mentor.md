# Build 1 Phase 4 — Contextual AI Research Mentor

Status: implemented and verified locally on 2026-08-04. No remote deployment was performed. This phase requires no new database migration; it can use the optional Build 0 decision-event table after that existing migration is applied.

## Researcher outcome

Every Stage 1 step now has a small, always-available mentor button. Opening it reveals a secondary thinking workspace while the research canvas remains the primary product. Cerise summarizes only visible work-state gaps, lets the researcher mark an inaccurate observation as **Not an issue**, and offers six researcher-chosen modes: reflect, find a conceptual bridge, narrow, map evidence, compare options, or identify a next step.

The mentor reads the current project pathway automatically, so the researcher does not need to recap it. It can distinguish recorded observations, interpretations, evidence gaps, alternatives, selected items, unresolved route decisions, and—after at least two edits—an unfinished point that has been quiet for two minutes. Pause wording is deliberately tentative: quiet may mean reflection, and the mentor never infers motivation, personality, distress, or mental health.

## Agency-preserving AI workflow

The request contains a bounded, redacted snapshot of active Stage 1 items, selected links, the provisional route, unresolved questions, deterministic observations, and at most six ephemeral conversation turns. Participant data is excluded and no mentor transcript is saved.

The server accepts a strict advisory JSON package. Suggestions with unknown targets, forged item references, malformed shapes, or claims such as approval, validation, guaranteed compliance, definite novelty, or mental-state diagnosis are rejected. A model may propose an observation, a next action, or a canvas option only for the currently open Stage 1 step.

Nothing enters the pathway automatically. The researcher reviews one canvas option at a time and chooses **Add as new alternative** or **Keep outside canvas**. Adding creates a separate `exploring` row; it cannot overwrite, select, link, reject, or archive existing work. If pathway content changed since the response was generated, application is blocked and the researcher must ask again. This comparison is content-based, so ordinary autosave version updates do not create false stale warnings.

## Privacy, security, and cost boundaries

- Same-origin JSON, a 128 KB body limit, authenticated project ownership, eight requests per minute, and sixty requests per day are enforced server-side.
- Emails, telephone numbers, postal addresses, titled personal names, and protocol-style institutional identifiers are redacted before the provider call.
- The existing OpenRouter provider architecture is reused: a connected user key when present, otherwise Cerise's included allowance with monthly checks. AI guardrails and usage metering remain active.
- The model is instructed not to browse, invent citations, claim literature was reviewed, decide the pathway, determine validity or novelty, approve ethics, or diagnose the researcher.
- Apply, keep-current, and dismiss decisions use the unified research decision record. A bounded project-scoped device ledger is the fallback when the optional Build 0 cloud event store is unavailable.

## Architecture

1. `researchMentor.ts` is the deterministic compiler and trust boundary: observations, redaction, bounded context, content checksum, strict response parser, safe additive application, and device-ledger fallback.
2. `/api/ai/research-mentor` authenticates and owns the provider boundary. It verifies the client context checksum before calling OpenRouter and validates model output before returning it.
3. `ResearchMentorPanel` owns the researcher interaction: correct an observation, choose a thinking mode, ask, review, apply or keep outside, and see the no-transcript/redaction boundary.
4. `ResearchPathWorkspace` supplies the live draft, canonical document, current step, edit count, and last-edit time. On desktop it makes room for a 400 px drawer; on phones the drawer becomes a full-width surface above workspace controls.

## Researcher-visible verification

1. Open any Stage 1 step and confirm the floating mentor is available without waiting for Cerise to interrupt.
2. Open the mentor and inspect **What Cerise notices**. Use **Not an issue** and confirm the note disappears without changing pathway rows.
3. Confirm all six thinking modes are present and selecting one changes the suggested prompt.
4. Ask the mentor and confirm the response does not alter the canvas.
5. Choose **Review for canvas** and confirm the review explains that a new exploring alternative will be created.
6. Add it and confirm the original row is unchanged, a new row appears, its status is `exploring`, and the suggestion shows **Added by researcher**.
7. Ask again, edit the pathway, then attempt to apply the old option; it must be rejected as stale.
8. At desktop width, confirm the canvas remains visible beside the drawer. At phone width, confirm the drawer fills the usable viewport and its close button is unobstructed.

## Deliberate transition boundary

This phase establishes the mentor for Stage 1 and a reusable cross-stage contract. It does not yet remove ScholarAsk's older Research Journey mode because users outside Stage 1 would lose support before later stages adopt the mentor. Deprecation should occur only after cross-stage coverage and migration guidance are delivered.

## Verification commands

```bash
npm run verify:build1-phase4
npx tsx --test src/lib/research/researchMentor.test.ts src/lib/research/researchPathwayPhase3.test.ts
npm test
npm run build
```

Deterministic reports are written to `output/build-1-phase-4-verification.json` and `output/build-1-phase-4-verification.md`. Browser evidence is stored in `output/playwright/build1-phase4-mentor-review-1536x1024.png` and `output/playwright/build1-phase4-mentor-mobile-390x844.png`.
