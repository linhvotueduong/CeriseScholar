# Build 1 Phase 1 — Research Pathway Foundation

Status: implemented and verified locally on 2026-08-03. The Supabase migration has been created but was not applied, and no remote deployment was performed.

## User outcome

Stage 1 now has one canonical `ResearchPathwayDocument` instead of relying on three unrelated stores. Researchers can continue working with device storage while offline or before the migration is activated. When secure and device versions differ, Cerise Scholar preserves both and asks the researcher which one should become current.

## Canonical contract

The schema owns:

- stable problem-frame, baseline-entry, idea, and research-question identities;
- the current provisional research decision and backcasting notes;
- Stage 1 completion/check states;
- fields from the v1/v2 workspace that do not yet have a canonical mapping;
- migration sources, revision number, artifact identity, SHA-256 checksum, and update time;
- an explicit `participantDataIncluded: false` privacy assertion.

The contract deliberately does not claim novelty, methodological validity, ethical approval, or publication readiness. Those decisions remain with the researcher and later verified products.

## Migration and compatibility behavior

On workspace load, the client:

1. Reads the existing v2 workspace or falls back to the v1 draft reader.
2. Reads the checksum-validated canonical device cache.
3. Reads the owner-isolated secure pathway and legacy `projects.research_*` fields when authenticated.
4. Compiles current compatibility fields into the canonical model while preserving canonical-only items.
5. Reconciles the sources by content and last-synced checksum.
6. Installs a current source, queues a safe unsynced edit, or stops for explicit conflict review.

During the compatibility period every accepted secure save also projects the main question, approach, and hypothesis back into the legacy project columns. The existing v2 workspace continues to save locally. No old columns, entries, or storage keys are deleted.

## Persistence and concurrency

The migration adds:

- `research_pathway_documents` for the current document;
- `research_pathway_revisions` for append-only accepted history;
- authenticated owner/project RLS policies and explicit table grants;
- an increasing-revision trigger and automatic history-capture trigger;
- the `pathway` domain in the Build 0 researcher decision ledger.

Secure updates compare the client’s expected cloud checksum. A changed checksum or insert race becomes a conflict instead of a last-write-wins overwrite. Choosing the device version rebases it as a new revision; choosing the secure version installs the exact secured payload.

## Activation boundary

The migration file is `supabase/migrations/20260803185913_build1_phase1_research_pathway.sql`. It was generated with the Supabase CLI. Local database application could not be exercised because Docker was not running. Apply it only after reviewing the verification report and using the normal separately approved migration workflow.

Before migration activation, Stage 1 remains usable through its canonical device cache and legacy v1/v2 store. Secure canonical saves fail closed to the device rather than discarding work.

## Verification

Run:

```bash
npm run verify:build1-phase1
npx tsx --test src/lib/research/researchPathwayDocument.test.ts
```

The deterministic report is written to:

- `output/build-1-phase-1-verification.json`
- `output/build-1-phase-1-verification.md`

The report covers deterministic identity, v1/v2 migration, project-column compatibility, unknown-field preservation, validated cache behavior, checksum tamper rejection, conflict classification, optimistic concurrency, append-only history, RLS, rollback safety, privacy boundaries, decision-ledger scope, and the researcher-facing conflict controls.
