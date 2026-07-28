# Phase 8 — Prepare and Analyze

Status:

- Phase 8.0 analysis-contract and provenance foundation implemented on
  2026-07-28.
- Phase 8.1 release-bound Analysis Plan Editor implemented on 2026-07-28.
- Phase 8.2 local Data Intake and Audit implemented on 2026-07-28.
- Phase 8.3 local Reproducible Preparation implemented on 2026-07-28.
- Statistical execution, results interpretation, and publication outputs are
  later approval boundaries.

Phase 8 maps to **Stage 06: Prepare and Analyze** in the Research Path. It does
not replace Stage 08, which is the later review, sharing, and preservation
stage.

## Phase 8.0 outcome

Every new immutable Experimental Studio release now freezes a versioned
`analysisContract` inside its release manifest. The contract records what the
researcher had specified before analysis:

- stable research-question IDs and wording;
- hypotheses and current primary/secondary/exploratory designation;
- constructs, operational definitions, measures, and expected direction;
- mappings from each question to outcome, predictor, and covariate variables;
- study design, target population, planned sample size, alpha, and power;
- unit of analysis;
- planned method, effect-size target, missing-data strategy, exclusions,
  transformations, multiplicity strategy, and sensitivity analyses;
- provenance linking the Study Design and Experimental Studio schema versions
  and update timestamps;
- an explicit data-access declaration.

Phase 8.0 does not invent missing scientific decisions. Fields that do not yet
have a dedicated planning interface remain empty or `unspecified`, and the
contract records bounded warnings. These warnings are advisory during Phase
8.0 so the existing collection workflow remains usable. A later analysis-plan
review phase can turn the relevant warnings into an explicit researcher gate.

## Integrity chain

New releases use experiment release format version 5:

1. Browser or network state is normalized and bounded.
2. The Study Design and Studio specification are converted to analysis-contract
   schema version 1.
3. The contract receives its own canonical SHA-256 checksum.
4. The contract, checksum, and schema version are frozen inside the immutable
   release manifest.
5. The complete release receives the existing release checksum.
6. A Local Research Host bundle repeats the contract identity in its codebook
   and receives the whole-bundle checksum.
7. The Swift host independently verifies the contract, release, and bundle
   checksums before accepting the package.

The chain is:

`analysis contract → release → local-host bundle`

Changing a research question, variable mapping, planned method, or any other
contract field invalidates both the contract checksum and the enclosing release
checksum.

## Compatibility

- Release formats 1–4 remain readable and keep their original checksum shape.
- Local Research Host bundle formats 1–4 remain importable.
- New web exports use release format 5 and host bundle format 5.
- Runner package version remains 6; Phase 8.0 changes provenance, not
  participant execution behavior.
- No new Supabase table or remote migration is required. The bounded contract is
  stored within the existing immutable `manifest` JSONB column.
- Old releases are not backfilled with a contract, because doing so would alter
  their checksums and falsely imply that an analysis plan existed when they were
  frozen.

## Native export

The Local Research Host now includes `analysis-contract.json` beside:

- `release.json`;
- `codebook.json`;
- mode-separated `production/` and `pilot/` data;
- `audit/all-responses.sqlite`.

This file is planning and provenance metadata. It contains no participant
responses. The production dataset remains local to the researcher’s Mac.

## Scientific boundaries

Phase 8.0 is not:

- a preregistration service;
- proof that analysis decisions were made before seeing the data;
- an amendment ledger;
- an automated statistical recommendation;
- a statistical engine;
- a validity, ethics, or reproducibility certification.

The current `dataAccessDeclaration` is deliberately `not-declared`. Cerise must
not infer that a plan was prospective. A later amendment boundary should record
researcher attestations, timestamps, reasons, and the frozen contract checksum
without mutating the original release.

## Phase 8.1 outcome

Phase 8.1 adds a dedicated full-width Analysis Plan Editor at
`/analysis-plan/[projectId]` and links it from the first Stage 06 step. The
editor:

- opens only a verified release that contains a Phase 8.0 analysis contract;
- keeps one versioned local draft per project and release ID;
- preserves the frozen research-question wording, variable names, response
  types, release checksum, and contract checksum;
- supports primary, secondary, and exploratory designation;
- records estimand population, exposure or intervention, comparator, outcome,
  summary measure, and timepoint;
- maps outcome, predictor, and covariate variables only from the frozen data
  dictionary;
- records unit of analysis, planned method, effect size, missing-data strategy,
  exclusions, transformations, multiplicity, and sensitivity analyses;
- classifies frozen variables into analysis or administrative roles;
- records study-wide analysis decisions;
- requires an explicit declaration of whether participant data was accessed
  before planning;
- recomputes readiness from normalized content instead of trusting stored
  client status; and
- exports a clearly labelled editable draft for review.

The editor autosaves to bounded, validated browser storage. It intentionally
does not create a Supabase table, upload participant data, mutate a release,
or claim that the draft is immutable or preregistered. Remote persistence and
an amendment/freeze ledger require their own approved architecture boundary.

### Phase 8.1 readiness gate

For each research question, the editor checks eight required decisions:

1. designation;
2. estimand population;
3. estimand outcome;
4. frozen outcome-variable mapping;
5. planned method;
6. unit of analysis;
7. missing-data strategy; and
8. multiplicity strategy.

The plan also requires the data-access declaration and flags every unassigned
frozen variable. The Stage 06 step can be marked complete only when the local
draft reports no unresolved readiness issue. This is a completeness gate, not
a scientific-validity certification.

## Security and privacy boundaries

- Untrusted browser/network JSON is bounded before it can enter a frozen
  release.
- Contract size is capped at 256 KB.
- Research-question, variable, and rule counts are capped.
- IDs are normalized, unique, and limited to a conservative character set.
- Variable references must resolve to frozen Studio variables.
- Stored readiness metadata is recomputed during normalization, preventing a
  client from forging a `ready` status.
- No dynamic code, formulas, credentials, model prompts, or participant data
  are executed or embedded by the contract.
- AI is not given local participant responses in Phase 8.0.

## Phase 8.2 outcome

Phase 8.2 adds a dedicated full-width Data Intake and Audit workspace at
`/data-intake/[projectId]` and links it from the second Stage 06 step. It accepts
the complete Local Research Host export folder and reads exactly five bounded
JSON files:

- `release.json`;
- `codebook.json`;
- `analysis-contract.json`;
- `production/responses.json`; and
- `pilot/responses.json`.

The browser independently verifies the frozen release, analysis-contract
checksum, codebook identity, response-export identity, and execution mode. It
then computes aggregate production/pilot counts, completion states, condition
allocation, duplicate IDs, timestamp consistency, withdrawal erasure,
unexpected or never-observed variables, required-response missingness, and
planned primary-outcome missingness.

Participant rows are never written to Local Storage, Supabase, Azure, OpenAI,
or OpenRouter. They are parsed locally to produce bounded aggregates and then
discarded. Only an aggregate audit receipt is kept on the device. The receipt
contains provenance, filenames, file sizes and checksums, field names, counts,
rates, and review issues—never session IDs or participant values.

Phase 8.2 requires a ready Phase 8.1 plan for the same release before the file
picker is enabled. The receipt records the plan update time, prior data-access
declaration, and a device-reported local intake timestamp without mutating the
plan or claiming trusted preregistration.

The Stage 06 Data Intake step can be marked complete only after:

1. the release, contract, and codebook match;
2. production and pilot files prove their frozen execution modes;
3. no session ID appears in both modes;
4. there is at least one completed production session;
5. no blocking structural or withdrawal-erasure issue remains; and
6. the researcher explicitly reviews any non-blocking findings.

Review findings may be acknowledged so Phase 8.3 can make an explicit,
reproducible decision about them. Blocking identity or structural issues cannot
be acknowledged away.

Phase 8.2 is not:

- a raw-data repository;
- a transformation engine;
- a statistics engine;
- a preregistration or trusted timestamping service;
- proof that the analysis plan was prospective;
- a scientific-validity, ethics, timing, or data-quality certification; or
- permission for AI to inspect participant responses.

## Phase 8.3 outcome

Phase 8.3 adds a dedicated full-width Reproducible Preparation workspace at
`/data-preparation/[projectId]` and links it from the third Stage 06 step. It
requires the researcher to re-select the exact five-file Local Research Host
export reviewed in Phase 8.2 and fails closed when any role, size, or SHA-256
checksum differs.

The deterministic engine starts from completed production sessions only. Pilot,
withdrawn, and incomplete sessions remain outside the derived response table.
It applies an ordered allowlist of explicit missing-value recodes, text
trimming, numeric coercion, reverse scoring, composite scoring, and
single-comparison exclusions. Operations run on cloned rows, never overwrite
the source, and remove trial rows only when their parent session is explicitly
excluded.

The workspace shows aggregate before/after effects and retains only operation
metadata, counts, integrity checksums, and review/export events. Raw and derived
participant rows remain in memory until the tab closes or source is replaced.
They are not stored in Local Storage, Supabase, Azure, OpenAI, or OpenRouter.

The derived JSON package contains response and trial tables, frozen
provenance, the normalized operation log, and independent response, trial, and
package checksums. It is labelled potentially identifying local research data
and must be stored by the researcher in an approved location.

Phase 8.3 does not provide arbitrary code, free-form formulas, automatic
outlier deletion, imputation, transcription, inferential statistics, or AI
access to participant data. Its completion gate records a local review and
export event; it is not a signed audit trail, preregistration, validity
certification, or proof that the exported package was later analyzed.

## Recommended next boundaries

Each boundary should be approved, built, and verified separately:

1. **Phase 8.4 — Analysis Execution**

   A small reviewed method registry with assumptions, effect sizes, confidence
   intervals, diagnostics, and deterministic outputs. No arbitrary remote code.
2. **Phase 8.5 — Results and Interpretation**

   RQ-linked tables, figures, claims, limitations, and divergence from the
   frozen plan. AI may explain reviewed outputs but must not silently run or
   change analyses.
3. **Phase 8.6 — Reproducibility Package**

   Data dictionary, contract, amendment log, operation log, results, figures,
   environment/version metadata, and a machine-readable manifest.

The fixture at `docs/fixtures/phase-8-analysis-contract-v1.json` documents the
minimum schema shape used for cross-runtime review.
