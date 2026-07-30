# Phase 8.5 — Results and Interpretation

Status: implemented on 2026-07-29.

## Purpose

Phase 8.5 turns the reviewed aggregate output from Phase 8.4 into an
evidence-linked Results Record without reopening participant-level data or
silently running another analysis.

The full-width workspace is available at:

`/analysis-results/[projectId]`

It is linked from Stage 06's “Produce Tables, Figures, and a Results Record”
step.

## Required input and integrity chain

The researcher must re-select the exported
`cerise-analysis-results-package`. Before interpretation fields are enabled,
Cerise independently verifies:

- the immutable release and analysis-contract checksum;
- the release, project, and contract identity repeated by the package;
- the ready Phase 8.1 Analysis Plan timestamp;
- the Phase 8.3 preparation package checksum and operation fingerprint;
- the Phase 8.4 enabled method configuration and configuration fingerprint;
- every aggregate result's bounded schema and frozen research-question wording;
- the aggregate result checksum;
- the whole Phase 8.4 package checksum; and
- the Phase 8.4 execution receipt's review/export gate.

Packages containing extra top-level fields, participant rows, changed
estimates, changed intervals, changed methods, blocking diagnostics, or
provenance drift fail closed.

## Research-question record

Each frozen research question receives one bounded record. Every primary
question, and every non-primary question with an executed result, requires:

- a direct answer linked to the reviewed aggregate result;
- separate statistical and practical meaning;
- an evidence-backed claim and claim-strength classification;
- a question-specific limitation record;
- explicit robustness or sensitivity status;
- an evidence or rationale note for that robustness status;
- a response to every Phase 8.4 advisory diagnostic;
- an approved aggregate table title and caption;
- an approved confidence-interval figure title and caption; and
- explicit researcher confirmation.

Causal wording is not treated as an ordinary claim-strength option. Selecting
the causal boundary requires an external design justification because the
Phase 8.4 engine is not a causal-inference system.

The study-level record also requires limitations, boundary conditions, and
either recorded unexpected findings or an explicit confirmation that none were
identified.

## Robustness and sensitivity decision

Phase 8.5 addresses the Stage 06 robustness decision with a
researcher-authored evidence boundary; it does not automatically mark the
separate robustness work complete.

It does **not** run sensitivity, reliability, robustness, or triangulation
analyses. It records one of:

- not performed;
- performed outside Cerise; or
- not applicable with a written rationale.

The researcher must identify the external evidence when a check was performed,
or state the limitation when it was not. The separate Stage 06 Robustness step
remains a guided researcher workflow and is not automatically completed by
Phase 8.4 or Phase 8.5. A future reviewed sensitivity registry remains a
separate scientific approval boundary.

## Tables, figures, and export

The workspace renders only aggregate values already contained in the verified
Phase 8.4 package. It creates:

- one structured table per required research-question record; and
- one machine-readable confidence-interval figure specification per required
  record.

The exported `cerise-results-record-package` contains:

- the complete release → contract → plan → preparation → aggregate-results
  provenance chain;
- the reviewed Phase 8.4 method specifications, registry metadata, and
  aggregate results;
- researcher-authored RQ answers, claims, limitations, robustness evidence, and
  diagnostic responses;
- the frozen-plan divergence register;
- approved table and figure records;
- an interpretation checksum; and
- a whole-package SHA-256 checksum.

The package explicitly records:

`participantRowsIncluded: false`

Aggregate output and interpretation may still be sensitive. The package is
downloaded locally and must be stored in a researcher-approved location.

## Optional AI boundary

The active research question may be sent to the Results Interpretation
assistant through the researcher's own OpenRouter key. The bounded request
contains only:

- frozen RQ planning context;
- one active reviewed aggregate result;
- its aggregate result checksum; and
- the researcher's current bounded draft.

It excludes participant rows, session identifiers, response values, trial
rows, media, local files, other research questions, and API-key material.

The assistant may suggest clearer direct-answer, statistical-meaning,
practical-meaning, claim, and limitation wording. It cannot return replacement
estimates, intervals, methods, variables, checksums, p-values, new analyses,
robustness results, or causal wording. Suggestions remain in memory and change
the record only when the researcher explicitly chooses “Use as editable
draft.” Applying a suggestion clears prior approvals so the output must be
reviewed again.

The authenticated route accepts same-origin JSON only, applies bounded request
normalization, returns no-store responses, enforces burst and 40-request daily
caps, and logs no research payload or API-key material.

OpenRouter use may incur cost on the researcher's provider account. Cerise adds
no new cost-bearing infrastructure and requires a provider-side spending limit
for a paid model.

## Local persistence boundary

Browser storage contains only:

- release, contract, plan, preparation, result, and package provenance;
- bounded researcher-authored interpretation fields;
- aggregate result IDs, not aggregate result payloads;
- table and figure titles, captions, and approval flags;
- divergence and diagnostic-response records;
- readiness state recomputed from normalized content; and
- review/export timestamps.

The aggregate Phase 8.4 result payload is held only in the current tab after
file selection and must be re-selected after reload. Participant rows never
enter Phase 8.5.

## Completion gate

The Stage 06 Results Record step can be marked complete only after:

1. the exact Phase 8.4 package is verified;
2. every primary and executed RQ record is complete;
3. advisories and plan divergences are addressed;
4. study-level limitations and boundaries are explicit;
5. table and figure outputs are approved;
6. the researcher confirms the complete interpretation; and
7. the aggregate Results Record is exported.

## Scientific boundaries

Passing Phase 8.5 means only that Cerise verified the aggregate provenance
chain and the researcher completed and exported a bounded interpretation
record. It is not:

- a new statistical analysis or method recommendation;
- proof that sensitivity or robustness testing occurred;
- a causal-inference system;
- a preregistration or trusted amendment ledger;
- a scientific-validity, ethics, reproducibility, or publication
  certification;
- a manuscript-writing replacement for Stage 07; or
- permission for AI to inspect participant-level data.

No Supabase migration or participant-data cloud path is introduced by Phase
8.5.
