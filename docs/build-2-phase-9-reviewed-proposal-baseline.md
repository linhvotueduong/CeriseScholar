# Build 2 Phase 9 — Reviewed Proposal Baseline

## Outcome

Phase 9 adds the missing human-review and portable-release layer above the deterministic Phase 7 proposal handoff. It does not rebuild Phase 7 readiness. A researcher now reviews one exact handoff checksum, records a bounded review statement, optionally binds real advisor/funder/supervisor/peer feedback, writes Stage 2 knowledge into the Living Research Record, and creates an immutable `reviewed-proposal-baseline` artifact.

Stage 3 still inherits its questions, method intent, and responsibility ledger from the functional `proposal-handoff`. Stage 3 completion additionally requires a current reviewed baseline that references that exact handoff checksum. Proposal or evidence changes preserve older baselines as history and require reconciliation; they never rewrite Stage 3 silently.

## Artifact boundary

- `proposal-handoff` remains the Phase 7 machine-verifiable implementation contract.
- `reviewed-proposal-baseline` is the Phase 9 human-review receipt and release identity.
- The baseline references, rather than duplicates, the technical handoff and proposal.
- The portable export is intentionally self-contained: it includes the full canonical proposal, full project-specific evidence assessment manifest, reviewed baseline, and three Living Research Record entries.
- Original evidence files, external review file bytes, and participant-level rows are excluded.

This separation avoids two editable proposal copies while still giving Stage 3 an inspectable human-review checkpoint.

## Derived verification

Readiness is computed from seven lanes:

1. current checksum-valid Phase 7 handoff;
2. canonical proposal identity;
3. claim, evidence, citation, and References provenance closure;
4. research question → reviewed gap → one Proposed Study Contract entry → proposed method and analysis direction;
5. route and researcher-confirmed requirements-profile alignment;
6. dispositioned open-risk and uncertainty ledger;
7. a bounded researcher review record.

The UI does not use a manual “verification complete” checkbox. The freeze action becomes available only after the compiler has no blocking issue and the researcher has recorded a concrete review statement.

## Researcher and external review semantics

The researcher selects their role and records what they inspected. “Researcher reviewed” never means institutional, ethics, legal, methodological, funder, publication, submission, or collection approval.

External review is optional. A receipt records:

- advisor, funder, supervisor, peer, or other advisory role;
- a permitted reviewer label and optional organization;
- comments, requested changes, or no requested changes;
- a bounded summary and date;
- optional SHA-256 file metadata for a PDF, DOCX, or text file.

Review file bytes are not uploaded or stored. The receipt is bound to the exact handoff checksum and labelled advisory-only. Adding, removing, or changing a receipt requires a new reviewed-baseline revision.

## Living Research Record

Each successful freeze produces three checksum-valid Stage 2 entries:

- reviewed research direction and questions;
- reviewed evidence and bounded gap;
- proposed method, analysis direction, and carried limitations.

Entries use the exact handoff as provenance and target later introduction, literature review, methods, discussion, and supplement composition. Device copies are available immediately; signed-in workflows also append them to the owner-scoped Build 0 research-knowledge store.

## Persistence and conflict behavior

The additive migration creates current and append-only revision tables for reviewed proposal baselines. It provides:

- project-owner row-level security with forced RLS;
- no anonymous or client delete access;
- optimistic updates against the expected checksum;
- explicit device/secure conflict review;
- trigger-only immutable history;
- 2 MB baseline limits and database checks for project, revision, checksums, freeze time, identity, and participant-data exclusion.

The migration is generated but has not been applied. Until it is applied, the workflow remains functional on the device and does not claim secure cloud storage.

## Portable review export

The export contains:

- the reviewed-baseline artifact and checksum;
- the complete canonical proposal revision;
- every checksum-valid project evidence assessment in the frozen manifest;
- the three Stage 2 Living Research Record entries;
- an export-level SHA-256 checksum;
- explicit participant-data and source-file exclusions.

It is a review and handoff package, not a submission package or certification.

## Researcher verification

1. Freeze a current Phase 7 handoff. Leave the Phase 9 review statement empty and confirm review freeze remains blocked.
2. Enter a concrete review statement. Confirm all seven integrity lanes pass and create the baseline.
3. Open Stage 3. Confirm it shows the exact proposal revision, reviewed-baseline revision, and checksum.
4. Change and save the proposal. Confirm the older baseline remains visible as history but Stage 3 calls for review reconciliation.
5. Add an advisor receipt with a small PDF, DOCX, or text file. Confirm only filename, type, size, and checksum appear; the file is not stored.
6. Confirm external review remains optional and every label states advisory rather than institutional approval.
7. Export the package. Inspect that it contains the full proposal, assessment manifest, three knowledge entries, and no participant rows or original files.
8. Simulate independent device and secure edits. Confirm neither overwrites the other and the UI requires an explicit choice.

## Automated verification

Run:

```bash
npm run verify:build2-phase9
npx tsx --test src/lib/research/proposalReviewPhase9.test.ts src/lib/research/researchArtifactGraph.test.ts
npm run build
npm run lint
```

Generated verification reports:

- `output/build-2-phase-9-verification.json`
- `output/build-2-phase-9-verification.md`

## Activation boundary

- No Supabase migration has been applied.
- No deployment has been requested or performed.
- External review files are fingerprinted locally and not uploaded.
- Browser interaction QA passed at 1440 × 1000 and 390 × 844 with no runtime errors.
- The QA export downloaded successfully with the proposal, evidence manifest, baseline, and three knowledge entries; it declared both participant-data and source-file exclusion.
