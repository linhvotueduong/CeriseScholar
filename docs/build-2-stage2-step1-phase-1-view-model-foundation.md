# Build 2 — Stage 2 Step 1 — Phase 1 View-Model Foundation

Status: implemented and verified locally on 2026-08-06. This phase adds the backward-compatible decision, preference, and view-model foundation required by the approved Step 1 redesign. It does not replace the live interface, apply a database migration, or deploy remotely.

## Outcome

Later interface phases can now render Stage 2 Step 1 from one deterministic view model rather than reinterpreting proposal readiness inside React components. The model joins exact Stage 1 provenance, the canonical requirements compiler, authority drift, device/secure conflict facts, proposal setup decisions, and presentation preferences into a stable screen contract.

The compatibility rule is strict: opening an existing proposal does not add fields, increment a revision, or change a checksum. Existing profiles without a setup decision remain valid and are adapted in memory. A setup decision joins the canonical proposal profile only when a researcher deliberately supplies and saves it.

## Structured proposal setup decision

`ProposalRequirementsProfile` now permits an optional `setupDecision`. It records:

- destination category;
- destination name where applicable;
- whether the instruction source is registered, researcher-defined, not required, not yet provided, or provisional;
- whether the researcher accepted a recommendation, overrode it with a rationale, has not reviewed it, or is viewing a legacy decision whose rationale was never structured;
- selection rationale;
- unresolved requirement questions;
- an explicit non-certification claim.

The field is optional within the existing requirements schema version. This is deliberate: adding an empty default to every loaded profile would invalidate historical checksums. Structural validation is bounded, and compiler semantics fail closed for unreviewed recommendations, provisional sources, missing registered sources, inconsistent authority status, and overrides without a rationale.

## Legacy adapter

Existing profiles are never mutated. The view model derives a temporary display decision:

- funder and coursework purposes receive only the obvious destination category;
- attached authorities are represented as registered sources;
- a previously confirmed profile without an authority is treated as a legacy no-external-source selection for continuity;
- a previously confirmed template is labelled `legacy-unspecified`, because Cerise cannot invent a historical recommendation rationale;
- unconfirmed profiles remain unreviewed.

The adapter output is not persisted automatically and does not affect the proposal checksum.

## Presentation preferences

Guidance level and information density use the separate versioned device key:

```text
cerise:stage2-step1:experience:v1
```

Allowed combinations are Guided, Balanced, or Concise with Comfortable or Dense. Unknown, corrupt, or future-version values return to Balanced and Comfortable. This store contains no project content, proposal decisions, source material, readiness, identity, or participant data.

## Deterministic view model

The view-model builder consumes readiness facts owned by existing canonical systems:

- compiled Research Pathway Brief or incomplete Stage 1 availability;
- compiled proposal requirements and compiler issues;
- optional structured setup decision;
- authority-drift findings;
- exact source-change state;
- device/secure version conflict state;
- whether the compiled profile has been persisted;
- presentation preferences.

It returns:

- primary and scholarly copy from Phase 0;
- exact Stage 1 revision, checksum, selected problem, questions, rationale, and uncertainty;
- selected and recommended templates plus all comparison candidates;
- grouped blocking and advisory issues;
- requirements and authority counts;
- six decision-section statuses;
- three-phase progress;
- the Phase 0 experience state and exact recovery action;
- canonical facts separated from presentation preferences;
- technical provenance for the expandable Technical details surface.

The view model does not compile requirements, infer methodological validity, confirm the researcher’s decision, write storage, or create proposal revisions.

## Readiness and source rules

- A version conflict has the highest recovery priority.
- Stage 1 changes and authority drift reset the completion path.
- Missing Stage 1 readiness links to `stage-01-choose-pathway`.
- Unreviewed recommendations remain blocking once a structured setup decision exists.
- Overrides require a researcher rationale.
- `not-provided` and `provisional` instruction states cannot complete the step.
- Registered and researcher-defined source states must match attached authority provenance.
- Presentation preferences can never change the canonical view-model facts.
- Profiles without the new optional decision retain the previous compiler behavior and twelve-route coverage.

## Activation boundary

Phase 1 changes no React component, CSS module, route, Supabase table, RLS policy, migration, API, or remote environment. No current profile is rewritten. The live Step 1 keeps using the existing interface until the separately approved responsive screen-shell phase consumes this view model.

Because `setupDecision` is stored inside the already versioned proposal JSON document, no table migration is needed for the optional compatibility field. A deliberately saved setup decision creates the normal checksum-bound proposal revision through existing persistence.

## Verification

Run:

```bash
npm run verify:build2-step1-phase1
npx tsx --test src/lib/research/stage2Step1ExperienceContract.test.ts src/lib/research/stage2Step1ViewModel.test.ts src/lib/research/proposalRequirementsCompiler.test.ts src/lib/research/researchProposalDocument.test.ts
```

Generated reports:

- `output/build-2-stage2-step1-phase-1-verification.json`
- `output/build-2-stage2-step1-phase-1-verification.md`

Phase 2 may now build the responsive screen shell against this model without duplicating compiler, authority, reconciliation, or readiness logic.
