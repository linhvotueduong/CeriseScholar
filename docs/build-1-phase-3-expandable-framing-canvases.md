# Build 1 Phase 3 — Expandable Research-framing Canvases

Status: implemented and verified locally on 2026-08-04. No remote deployment was performed. This phase uses the existing checksum-bound research pathway schema v2 and requires no new database migration.

## Researcher outcome

Stage 1 no longer limits researchers to the Phase 2 starter rows. Idea sparks, parking thoughts, problem frames, baseline entries, and candidate research questions now support adding, reordering, archiving, restoring, and—only while genuinely empty—removing rows.

Every collection starts with a small useful canvas and is bounded at 40 total active-plus-archived rows. The tables and card selectors keep fixed internal scrolling, so a long exploration does not stretch the full page. Stable item IDs survive reordering and round-trips; visible numbers such as “RQ2” describe the current display order rather than becoming permanent identity.

## Safety and knowledge preservation

Content-bearing rows are archived, not deleted. Selected rows cannot be archived until their status changes. Problem frames linked from baseline entries or questions, and baseline entries linked from questions, expose the dependency that must be resolved. Archived material stays checksum-bound and restorable, but it cannot satisfy active readiness or appear in the accepted Stage 2 handoff.

Malformed local roster metadata fails safely to one usable row. Invalid slot names are ignored. The phase adds no participant records, chat transcript, prompt store, remote AI call, or approval claim.

## Downstream contract

The canonical document compiler and rehydration path preserve active and archived roster order. Stage 2 now receives every selected research question in exact active order instead of silently stopping at four or six. The roadmap tabs use horizontal scrolling when the selected-question set is wide.

Phase 2’s verification item AC-12 documented fixed starter rows and assigned expansion to Phase 3. This implementation intentionally supersedes that historical UI assertion while preserving the same fixed-height workspace requirement.

## Researcher-visible verification

1. Open each of the first four Stage 1 steps and use **Add** to create an alternative.
2. Move a row up or down and confirm its content stays unchanged.
3. Remove an empty row; enter text in another row and confirm its action changes to **Archive**.
4. Archive populated work, open the archived shelf, restore it, and confirm all content returns.
5. Mark a row selected and confirm archive is disabled with an explanation.
6. Link a problem frame or baseline entry downstream and confirm its archive action is protected.
7. Add and select more than six questions; Stage 2 must show all of them in the same order.
8. At desktop and phone widths, confirm the canvas scrolls internally without widening or lengthening the whole page.

## Verification

Run:

```bash
npm run verify:build1-phase3
npx tsx --test src/lib/research/researchPathwayPhase3.test.ts
npm test
npm run build
```

Deterministic reports are written to `output/build-1-phase-3-verification.json` and `output/build-1-phase-3-verification.md`.
