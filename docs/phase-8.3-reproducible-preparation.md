# Phase 8.3 — Reproducible Preparation

Status: implemented on 2026-07-28.

## Purpose

Phase 8.3 creates a deterministic derived-data boundary between the reviewed
Phase 8.2 intake audit and later statistical execution. It lets a researcher
record exactly how an analysis-ready copy was produced without changing the
Local Research Host export.

The full-width workspace is available at `/data-preparation/[projectId]` and is
linked from the third Stage 06 step.

## Source verification and memory boundary

The researcher must re-select the same complete Local Research Host export
folder reviewed in Phase 8.2. Cerise independently hashes the same five files
and requires every role, byte size, and SHA-256 checksum to match the reviewed
intake receipt:

- `release.json`;
- `codebook.json`;
- `analysis-contract.json`;
- `production/responses.json`; and
- `pilot/responses.json`.

Only the production response export enters the preparation engine. The fixed
input boundary admits completed production sessions. Pilot, withdrawn, and
incomplete sessions do not enter the derived response table. Trial rows are
kept only for included completed sessions.

Raw response and trial rows live only in an in-memory React ref while the tab is
open. They are never written to Local Storage, Supabase, Azure, OpenAI, or
OpenRouter. Replacing the source or closing the tab clears that memory boundary.

## Safe operation registry

Phase 8.3 does not execute arbitrary JavaScript, SQL, Python, expressions, or
uploaded formulas. The initial allowlist contained six declarative operations:

1. map exact declared literals to missing;
2. trim surrounding text whitespace;
3. convert canonical numeric strings, making invalid conversions missing;
4. create a reverse-scored variable using `minimum + maximum − value`;
5. create a mean or sum with an explicit minimum-valid-input rule; and
6. exclude a record with one explicit comparison.

Phase 8.7D adds two bounded operations to this same ordered registry:

7. create a participant scored-trial accuracy proportion with an explicit
   practice choice and minimum scored-trial count; and
8. create a participant RT mean or median with explicit practice, correctness,
   deadline, inclusive millisecond-bound, and minimum eligible-trial choices.

Operations are ordered and rerun from a fresh clone of the imported completed
production rows. Every enabled operation requires a rationale. Derived-variable
names are conservative identifiers, cannot overwrite a frozen or prior derived
column, and cannot use Cerise's reserved metadata prefix.

The registry deliberately excludes automatic outlier deletion, imputation,
free-form coding, transcription, model fitting, inferential statistics, and AI
access to participant values.

## Aggregate review

The interface shows only bounded aggregate impact:

- input and output record counts;
- explicit exclusion count;
- input and output column counts;
- missing-cell counts over analysis variables;
- input and output trial-row counts;
- per-operation affected-cell, excluded-row, and created-variable counts; and
- response, trial, and complete-package checksums.

It does not show response values, session IDs, trial values, free text, media,
or participant-level previews.

## Derived package

After confirming review, the researcher exports one local JSON package
containing:

- release and analysis-contract identity;
- the Phase 8.2 source-file checksum manifest;
- the fixed input-boundary declaration;
- normalized operation definitions and aggregate operation log;
- a derived response table;
- included trial rows;
- an additive checksummed inclusion ledger for every completed production
  session;
- an additive checksummed participant behavioral-summary dataset;
- response, trial, and complete-package SHA-256 checksums;
- an explicit potentially-identifying-data classification; and
- a declaration that the raw source was not mutated.

The package is not uploaded or persisted by Cerise. The researcher is
responsible for storing it in an approved research-data location.

## Local receipt and Stage 06 gate

Browser storage contains only:

- release, contract, audit, and production-file identity;
- the operation definitions and rationales;
- aggregate run summaries;
- integrity checksums;
- review and export timestamps; and
- recomputed readiness.

The Stage 06 step can be marked complete only after:

1. Phase 8.2 is ready;
2. the exact source is re-verified;
3. all enabled operations are valid and rationalized;
4. the deterministic operation log is executed;
5. the researcher confirms the aggregate review; and
6. the derived local package is exported.

The receipt is editable local workflow state, not a signed audit trail, trusted
timestamp, preregistration, or proof that the researcher used the exported
package in a later analysis.

## Scientific boundaries

Passing Phase 8.3 means only that Cerise deterministically produced and exported
a derived copy from the reviewed local source under the recorded operations. It
does not mean:

- an exclusion or transformation is scientifically justified;
- missingness is ignorable;
- an outlier rule is valid;
- a composite has acceptable reliability;
- timing is certified;
- the sample is representative;
- the protocol or consent was followed; or
- any statistical conclusion is correct.

Those responsibilities remain with the researcher and the approved protocol.
