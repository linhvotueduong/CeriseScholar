# Phase 8.7B — Data-Quality and Descriptive Review

Status: implemented on 2026-07-29.

## Purpose

Phase 8.7B closes the remaining generic quality-check step in Stage 06. It
provides a bounded, deterministic review of the exact dataset produced by
Phase 8.3 before the researcher interprets primary analyses.

The full-width workspace is available at:

`/data-quality-review/[projectId]`

It replaces the generic canvas behind the existing Stage 06 quality-check step.
The persisted step ID remains `stage-06-step-02`.

This phase describes the derived dataset. It does not silently clean it, select
an analysis, fit an inferential model, or decide whether a finding is
scientifically acceptable.

## Exact input and fail-closed verification

The researcher must re-select the exact exported Phase 8.3 derived-data JSON
package. Cerise reuses the Phase 8.4 input verifier to confirm:

- selected project, immutable release, and release checksum;
- independently checksummed Phase 8.0 analysis contract;
- ready Phase 8.1 plan identity and update timestamp;
- ready Phase 8.3 preparation receipt, operation fingerprint, and package
  checksum;
- response and trial column dictionaries and bounded scalar row shapes;
- unique bounded session identifiers inside the in-memory package;
- response-table checksum;
- trial-table checksum; and
- complete derived-package checksum.

A changed participant value, row, column, source identity, operation record, or
checksum fails closed before the quality engine runs.

The browser implementation accepts only the existing Phase 8.3 bound of 36 MB,
up to 20,000 response rows, 250,000 trial rows, and the existing bounded
analysis-column dictionary. It does not silently sample a larger package.

## Deterministic aggregate registry

### Preparation bridge

The report repeats the Phase 8.3 aggregate input/output boundary:

- completed production rows entering preparation;
- derived response rows;
- explicitly excluded rows;
- missing cells before and after preparation; and
- trial rows before and after preparation.

These counts describe operations already recorded in Phase 8.3. Phase 8.7B
does not rerun, add, remove, or reinterpret those operations automatically.

### Response coverage

Across non-metadata response columns, the engine reports:

- total, complete, and incomplete derived rows;
- total missing cells;
- rows beyond the first occurrence of an identical response pattern; and
- frozen-condition counts plus rows with missing or unexpected condition IDs.

Repeated patterns are aggregate review cues. The report never identifies the
matching participants and never treats duplication as an exclusion rule.

### Variable profiles

For each frozen or derived analysis column, the engine reports:

- frozen or derived provenance;
- response type and planned roles when frozen;
- required status;
- observed and missing counts and missing rate;
- numeric, text, and Boolean counts;
- distinct-level count;
- count of levels observed once;
- largest observed level count; and
- for consistently numeric variables only: minimum, first quartile, median,
  third quartile, maximum, mean, and sample standard deviation.

Observed category labels, free-text responses, media references, and
participant-level value lists are not shown or exported. A numeric summary is
withheld when observed values mix scalar types or include nonnumeric values.
Numeric minima, maxima, and other aggregates can still be sensitive—especially
at small counts—and are not an anonymization mechanism.

The deterministic cues include no observed values, planned-variable
missingness, mixed scalar types, no observed variation, single-occurrence
levels, and other bounded structural conditions. Cerise does not introduce an
outlier cutoff, missingness tolerance, allocation-imbalance threshold, or
distributional pass/fail rule.

### Trial profile

When trial rows exist, the report includes aggregate counts for:

- practice and production rows;
- missing trial responses;
- known, correct, and incorrect scoring;
- exceeded response deadlines;
- non-positive numeric reaction times;
- rows beyond the first occurrence of the same bounded trial key; and
- positive browser-measured reaction-time count, quartiles, range, mean, and
  sample standard deviation.

This does not certify physical stimulus onset, input-device latency, clock
accuracy, trial independence, or fitness for a specific model.

## Researcher decision gate

Every deterministic finding receives one of five explicit dispositions:

- accept and document;
- addressed in preparation;
- carry into sensitivity review;
- not applicable; or
- not reviewed.

Completion requires every finding to have a non-default disposition, a written
decision note, and an acknowledgment. The researcher must also record:

- an overall data-quality conclusion; and
- remaining unresolved limitations.

After confirming the complete review, the researcher exports and independently
verifies the aggregate quality record. Only then is the Stage 06 step ready.

This is a documentation and provenance gate. A ready status does not mean the
dataset is clean, missingness is ignorable, exclusions are justified, the
sample is representative, measurements are valid, or the planned analysis is
correct.

## Local persistence and participant-data boundary

Phase 8.3 response and trial rows remain only in memory in the active browser
tab. Replacing the selected package, selecting another release, or closing the
tab clears that working boundary.

Participant rows and participant-level value lists are never written to:

- Local Storage;
- Supabase;
- Azure;
- OpenAI or OpenRouter;
- application logs; or
- the Phase 8.7B export.

Browser storage uses:

`cerise-data-quality-review:<projectId>:<releaseId>:v1`

It contains only:

- frozen release, plan, and preparation identity;
- source and aggregate-report checksums;
- aggregate row, trial, variable, and finding counts;
- finding IDs and researcher-authored dispositions;
- study-level conclusion and remaining-limit text;
- run, review, and export timestamps; and
- the final aggregate export checksum.

Stored state is bounded to 512 KB and treated as untrusted when read. It is
editable local workflow state, not a signed audit trail or trusted timestamp.

## Aggregate export and integrity

The `cerise-data-quality-record-package` contains:

- source provenance and the exact Phase 8.3 package checksum;
- the deterministic aggregate report;
- finding dispositions and researcher notes;
- the study-level conclusion and remaining limitations;
- an independent aggregate-report checksum; and
- a complete package checksum.

Before download, Cerise rebuilds the report from the still-selected Phase 8.3
rows, reconstructs the export, verifies every checksum, and compares the
canonical package with the candidate export. The package explicitly records:

- `participantRowsIncluded: false`;
- `participantLevelValuesIncluded: false`;
- `automaticExclusionsApplied: false`;
- `automaticCorrectionsApplied: false`;
- `inferentialStatisticsIncluded: false`; and
- `aiProcessingUsed: false`.

Aggregate output may still be sensitive and must be stored in a
researcher-approved location.

## Scientific exclusions

Phase 8.7B does not add:

- automatic outlier detection or deletion;
- imputation or missing-data mechanism tests;
- scale scoring, reliability, factor analysis, or measurement invariance;
- distribution-fit tests or arbitrary normality cutoffs;
- inferential p-values, confidence intervals for study effects, or model
  selection;
- clustered, repeated-measures, multilevel, longitudinal, survival, Bayesian,
  qualitative, or causal analyses;
- arbitrary formulas, SQL, Python, R, or generated code;
- an automatic method or exclusion recommender; or
- AI access to participant or aggregate quality data.

Those capabilities require separate scientific and engineering approval.

## Relationship to Phases 8.4, 8.7A, and 8.6

The Stage 06 order places 8.7B after reproducible preparation and before primary
analysis. The Research Path gates completion of the quality-check step on the
verified aggregate record.

Phase 8.4 keeps its approved Phase 8.3 input and result checksum contracts so
existing direct workflows remain compatible. Phase 8.7B does not mutate a
Phase 8.3 package or alter Phase 8.4 results.

Findings that require sensitivity review can inform the separate Phase 8.7A
researcher assessment, but the two exports are not silently merged.

Phase 8.6 retains its fixed deterministic 14-file archive. Phase 8.7B does not
add a fifteenth file or change the archive checksum shape. Including the
quality record in a future reproducibility archive requires an explicitly
versioned Phase 8.6 update.

No Supabase migration, deployment, cloud participant-data path, AI call, or new
cost-bearing service is introduced.
