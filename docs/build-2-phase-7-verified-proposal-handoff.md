# Build 2 Phase 7 — Verified Proposal Handoff

## Outcome

Phase 7 replaces the former Stage 2 verification preview with a functional, checksum-bound handoff product. The product binds the exact reviewed proposal, Stage 1 pathway, project evidence decisions, Proposed Study Contract, route, and explicit Stage 3 responsibilities into an immutable `proposal-handoff` artifact.

This is an internal-consistency and provenance product. It does not claim factual correctness, novelty, methodological validity, ethics or legal approval, preregistration, submission compliance, funding approval, or authorization to collect data.

## Researcher workflow

1. Cerise derives seven independent verification lanes from the current upstream artifacts.
2. Cerise derives implementation responsibilities from question uncertainty, feasibility, access, ethics/sensitivity, unresolved proposal support, and open proposal questions.
3. The researcher must disposition every responsibility:
   - carry it into a named Stage 3 product;
   - preserve it as a proposal limitation;
   - mark it not applicable with a rationale; or
   - return it to Stage 2 for resolution.
4. Any `unreviewed` or `resolve-in-stage2` item blocks freezing.
5. A successful freeze creates a new immutable revision and checksum.
6. The frozen JSON can be exported locally.
7. Stage 3 design, measures, and participant/source planning display the exact frozen revision, inherit its research questions, and expose the responsibilities assigned to that product.

Stage 3 planning cannot be marked complete without a verified handoff package. Draft Stage 1 questions remain visible as recovery context when no package exists, but they are explicitly labelled as draft-only.

## Artifact contract

The `proposal-handoff` payload contains:

- exact proposal and pathway references;
- the selected project route;
- question text plus Proposed Study Contract fields;
- an evidence manifest containing each assessment checksum and evidence-source reference;
- the six canonical proposal section IDs;
- the reviewed responsibility ledger;
- seven successful verification receipts;
- immutable revision and freeze time;
- `participantDataIncluded: false`;
- the explicit authority-boundary claim.

The artifact identity uses only the exact proposal and pathway references as its source fingerprint. Evidence assessment and evidence-source checksums remain payload-bound so large evidence ledgers do not exceed the canonical identity source limit. This also avoids a proposal self-checksum cycle.

## Revision and conflict behavior

- Proposal, pathway, assessment, evidence-source, or responsibility-source changes make an earlier handoff stale.
- A changed source statement resets only its associated responsibility decision; unaffected decisions remain intact.
- Device and secure copies are reconciled by checksum.
- Independent edits require an explicit researcher choice.
- Choosing the device version rebases its decisions as a new revision above the secure version. It never overwrites an equal revision.
- A frozen revision remains readable after a later revision is created.

## Persistence and security

The additive migration creates:

- `research_proposal_handoffs` for the current checksum-bound package;
- `research_proposal_handoff_revisions` for append-only history;
- forced row-level security with project-owner checks;
- no anonymous access;
- no client delete path;
- optimistic checksum updates;
- a trigger-only history writer whose function execution is revoked from clients;
- 2 MB package limits and database checks for project, schema, revision, freeze time, proposal checksum, identity checksum, and participant-data exclusion.

The application validates the complete package checksum again on every load. Secure persistence is fail-open to the device cache when the additive table is not yet available; the UI does not claim secure storage in that state.

## Verification

Run:

```bash
npm run verify:build2-phase7
npx tsx --test src/lib/research/proposalHandoffPhase7.test.ts src/lib/research/researchArtifactGraph.test.ts
```

The deterministic report covers 20 acceptance checks and all 12 canonical research routes. Generated reports:

- `output/build-2-phase-7-verification.json`
- `output/build-2-phase-7-verification.md`

## Activation boundary

- The migration is generated but has not been applied.
- No deployment has been requested or performed.
- The verified handoff works locally through device storage without the migration.
- Browser interaction QA remains separate from deterministic verification and must be completed when the browser-control runtime is available.

## Principal implementation surfaces

- `src/lib/research/proposalHandoffPhase7.ts`
- `src/lib/research/proposalHandoffCache.ts`
- `src/lib/research/proposalHandoffPersistence.ts`
- `src/components/research-path/ProposalHandoffStudio.tsx`
- `src/components/research-path/Stage2ProposalHandoffPhase7.module.css`
- `src/components/research-path/Stage2ProposalStudio.tsx`
- `src/components/research-path/Stage3StudyPlanner.tsx`
- `src/components/research-path/ResearchPathWorkspace.tsx`
- `supabase/migrations/20260805233000_build2_phase7_proposal_handoff.sql`
- `scripts/verify-build-2-phase-7.ts`
