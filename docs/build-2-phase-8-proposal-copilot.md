# Build 2 Phase 8 — Proposal Copilot

## Outcome

Phase 8 adds a review-before-apply Proposal Copilot inside the existing Stage 2 Source-linked Proposal Composer. It is not another Stage 2 step and it is not the Stage 8 publication writer.

The researcher saves a proposal revision, selects one section, chooses reviewed sources already linked to that section, and runs one registered technique. The AI provider receives only that bounded context. Its response must normalize into exact, nonoverlapping text operations. Every operation begins deferred and requires an explicit accept or decline plus researcher rationale before the patch can be committed.

Accepted operations create one new `reviewed-ai-patch` proposal revision. Declined operations change no prose. Both become append-only decision events. Prompts and chat transcripts are not stored in that ledger.

## Functional workflow

1. Save the current proposal draft. Unsaved text cannot be sent because no immutable checksum exists for it.
2. Open Proposal Copilot from the active section editor.
3. Choose one technique: outline, evidence synthesis, clarity, structure, or consistency.
4. Select up to 12 included, researcher-reviewed evidence assessments already linked to the active section.
5. Optionally provide a short focus statement.
6. Generate a patch. The request can be cancelled and times out without changing the project.
7. Review each operation side by side: current saved excerpt and editable proposed wording.
8. Accept, decline, or defer each operation. Record a rationale for every operation.
9. Resolve all deferrals. Applying accepted operations creates one proposal revision; an all-declined patch records decisions only.

## Architectural boundaries

- Provider context contains exactly one selected section and selected reviewed source assessments.
- Nonselected sections, nonselected sources, requirements, authority rules, research questions, study-contract content, participant data, prior prompts, and the decision ledger are excluded.
- Sources must already be linked to the selected section. AI cannot change source inclusion.
- Inline citations may use only exact `[@sourceId]` tokens from selected sources, and the same IDs must appear in the operation citation manifest.
- New author-year citations, unknown assessment IDs, unknown citation keys, HTML, redaction markers, duplicate anchors, overlapping operations, and malformed provider output fail closed.
- The route handler can generate a patch but cannot persist or mutate proposal content.
- Application preserves requirements, claims, evidence links, research-question and contract relationships, assets, and every nonselected section. It changes selected prose only and resets that section’s researcher-review flag.
- Any change to the proposal revision or selected section makes an older patch stale.
- The decision ledger stores bounded summaries, researcher reasons, artifact references, patch checksums, model identity, and actions. `promptStored` and `chatTranscriptStored` remain `false`.

## AI operations and reliability

- Provider: the existing server-side OpenRouter credential resolver, with included-lane or researcher BYOK behavior already configured by Cerise Scholar.
- Controls: authenticated ownership, same-origin JSON, request-size bounds, six requests per minute, a 40-request daily safety cap, monthly included-lane allowance, account guardrails, no-store responses, a 45-second server timeout, client cancellation, and offline messaging.
- Direct email addresses and phone numbers in the selected provider scope block the request. The project remains unchanged until the researcher removes them from that scope.
- Provider output is never applied automatically and never treated as evidence, approval, compliance, authorship, methodological validation, or publication readiness.

## Researcher verification

Verify these behaviors in the Stage 2 Proposal Composer:

1. Edit a section without saving. Opening Proposal Copilot should require saving before generation.
2. Save, open the copilot, and confirm only sources already linked, included, and reviewed are selectable.
3. Generate a clarity patch. Confirm current and proposed text appear side by side and the proposal editor has not changed.
4. Leave an operation deferred or omit its rationale. Commit must remain disabled.
5. Decline every operation. The decisions should record, while proposal revision and prose remain unchanged.
6. Accept one operation, optionally edit its proposed wording, resolve the remaining operations, and commit. Exactly one new proposal revision should appear with `createdBy: reviewed-ai-patch`.
7. Confirm requirement, claim, evidence, contract, citation, asset, and nonselected-section metadata remain unchanged.
8. Generate a patch, then save another proposal edit. The old patch must be stale and impossible to apply.
9. Disconnect the network or cancel an in-flight request. The UI must state that no project change occurred.
10. Inspect the decision records: reasons and checksums are present; prompt and chat content are absent.

## Automated verification

Run:

```bash
npm run verify:build2-phase8
npx tsx --test src/lib/research/proposalCopilotPhase8.test.ts
```

The reproducible reports are:

- `output/build-2-phase-8-verification.json`
- `output/build-2-phase-8-verification.md`

No database migration is required because Phase 8 reuses the Build 0 append-only `research_decision_events` foundation. No deployment is part of this phase.
