# Build 2 Phase 1 — Proposal Domain and Migration Foundation

Status: implemented and verified locally on 2026-08-04. The Supabase migration was created but not applied, no remote deployment was performed, and the Stage 2 interface was not replaced in this phase.

## User outcome

Cerise Scholar now has a canonical Stage 2 product boundary: a research proposal is a versioned, checksum-bound proposal artifact rather than six unrelated Paper Writer strings or an early copy of the final manuscript. Existing proposal text remains recoverable and editable through the current interface until the separately approved Stage 2 shell is built.

The source library and the researcher's project-specific judgment are also separate. A source can exist globally while each project independently records whether it is a candidate, included, excluded, or awaiting review, with rationale, route-appropriate appraisal details, caveats, and exact source provenance.

## Canonical contracts

`ResearchProposalDocument` owns:

- proposal title, language, revision, revision lineage, and SHA-256 artifact identity;
- a versioned Proposal Requirements Profile;
- the Evidence Strategy foundation;
- a Claim–Evidence Map;
- the Proposed Study Contract;
- structured proposal sections with citation, knowledge, and asset references;
- unresolved questions and compatibility metadata;
- exact source references for the selected Stage 1 pathway and later evidence assessments;
- explicit participant-data exclusion and non-approval claims.

`ProjectEvidenceAssessment` owns:

- stable project, assessment, and evidence-source identities;
- candidate, included, excluded, or awaiting-review status;
- decision rationale, linked questions and claims, appraisal responses, caveats, and notes;
- an exact checksum reference to one matching Evidence Library artifact;
- revision, review time, checksum, and participant-data exclusion.

Included or excluded source decisions require a researcher rationale and review time. The model deliberately does not produce one universal quality score and cannot represent a truth or novelty certification.

## Stage boundary

The Proposed Study Contract records Stage 2 intent only. It may later map each question to its purpose, evidence need, proposed source or population, method direction, analysis direction, and uncertainty. Its schema explicitly defers runnable implementation to Stage 3; it cannot claim that a study is built, methodologically valid, ethically approved, compliant, or ready for submission.

The canonical manuscript remains a separate Build 0 / Stage 8 product. Proposal sections can inform it later through the Living Research Record without turning the proposal into the final paper.

## Legacy migration behavior

The importer reads the six existing proposal section keys:

- `proposal_background`
- `proposal_problem_statement`
- `proposal_literature_review`
- `proposal_current_study`
- `proposal_method_materials`
- `proposal_references`

Every bounded legacy string is stored and exported without trimming, concatenating, summarizing, or changing whitespace. Canonical proposal saves dual-write these six rows to `paper_sections` during the compatibility period. No legacy proposal or Evidence Library table is deleted or rewritten by the migration.

## Persistence and concurrency

The migration adds four tables:

- `research_proposals` — current accepted proposal per project;
- `research_proposal_revisions` — append-only proposal history;
- `project_evidence_assessments` — current project/source judgment;
- `project_evidence_assessment_revisions` — append-only assessment history.

All four tables use authenticated owner/project RLS, forced RLS, explicit least-privilege grants, indexed foreign keys and common access paths, JSON size constraints, row-to-payload identity checks, and participant-data exclusion checks.

Current-document updates compare the caller's expected checksum. A concurrent change or insertion race returns a conflict rather than overwriting another device's work. Database triggers require increasing revisions and capture every accepted current value into history; authenticated clients cannot update or delete revision rows.

The unified researcher decision ledger now recognizes `proposal` and `evidence` domains while retaining its existing rule that prompts and chat transcripts are never stored in decision records.

## Artifact lineage

The Build 0 registry now includes `project-evidence-assessment`. The cross-stage graph is:

```text
Research Pathway ──► Evidence Library selection
        │                    │
        └─────────────► Project Evidence Assessment ──► Research Proposal ──► Stage 3 products
```

A changed source checksum makes its project assessment stale. That staleness then propagates to the proposal so cited claims can be reconciled before Stage 3 continues.

## Activation boundary

The migration file is `supabase/migrations/20260804230000_build2_phase1_proposal_foundation.sql`. It has not been applied to a local or remote database. Apply it only through the normal separately reviewed Supabase migration workflow.

Before activation, the current Stage 2 interface continues to use `paper_sections`. Phase 2 will build the new route-aware Stage 2 shell and requirements compiler on top of these contracts; Phase 1 intentionally makes no user-interface replacement.

## Verification

Run:

```bash
npm run verify:build2-phase1
npx tsx --test src/lib/research/researchProposalDocument.test.ts
npx tsc --noEmit
```

The deterministic verification report is written to:

- `output/build-2-phase-1-verification.json`
- `output/build-2-phase-1-verification.md`

The report covers lossless six-section migration, deterministic identities, revision lineage, tamper and cross-project rejection, source/assessment separation, stale propagation, Stage 2/3 boundaries, non-approval claims, participant-data exclusion, optimistic concurrency, compatibility dual-write, owner/project RLS, append-only history, indexes, additive rollback safety, registry ownership, acyclic lineage, and bounded payloads.
