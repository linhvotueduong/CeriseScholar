# Phase 8.7A — Reviewed Robustness and Sensitivity

Status: implemented on 2026-07-29.

## Purpose

Phase 8.7A provides a bounded, deterministic challenge to the primary
estimates produced in Phase 8.4. It independently reproduces each primary
estimate from the exact Phase 8.3 derived rows, computes a reviewed
method-specific comparison and leave-one-out influence range, and requires the
researcher to explain what the observed differences mean.

The full-width workspace is available at:

`/analysis-robustness/[projectId]`

It replaces the generic canvas behind the existing Stage 06 robustness step.
The persisted step ID remains `stage-06-step-04`.

## Exact inputs and fail-closed verification

The researcher must re-select both:

- the exact exported Phase 8.3 derived-data package; and
- the exact exported Phase 8.4 aggregate-results package.

Cerise independently verifies the release, contract, plan, preparation,
execution, configuration, result, and package checksums. It also confirms that
both selected packages share the same Phase 8.3 package checksum.

Before any robustness output is accepted, the browser recomputes every Phase
8.4 primary estimate and complete-case sample size from the selected derived
rows. A changed participant value, source checksum, method result, sample size,
or provenance field fails closed.

## Reviewed method-specific registry

Phase 8.7A supports only the four Phase 8.4 registry methods:

- **Descriptive mean:** observed median, 20% trimmed mean, and leave-one-out
  mean range.
- **Pearson correlation:** Spearman correlation using deterministic average
  ranks and a leave-one-out Pearson-correlation range.
- **Two-group Welch analysis:** group median difference, group 20% trimmed-mean
  difference, and a leave-one-out raw mean-difference range. Group order
  remains the deterministic lexical order used for the primary estimate.
- **Simple OLS regression:** the same OLS slope with an HC3
  leverage-adjusted heteroskedasticity-consistent interval and a leave-one-out
  OLS slope range.

Leave-one-out values are aggregate influence summaries. They do not expose
which participant was omitted, and they do not delete or mutate a source row.
The engine uses one-pass deletion updates rather than copying the full dataset
for each omission.

The comparisons intentionally have different interpretive boundaries:

- median and trimmed-mean checks change the center estimand;
- Spearman correlation changes linear association to monotonic rank
  association;
- HC3 changes the estimated slope variance, not the fitted OLS slope; and
- leave-one-out ranges describe observed single-row influence, not a rule for
  excluding observations.

Phase 8.7A reports direction or interval-zero-boundary differences as review
cues. It does not calculate new p-values or turn a numeric threshold into a
scientific pass/fail decision.

## Researcher review and completion gate

For every executed analysis, the researcher must:

1. classify the conclusion impact as unchanged, weakened, strengthened,
   changed, or inconclusive;
2. write an interpretation of the method-specific comparison;
3. record remaining limitations;
4. explicitly acknowledge the assessment; and
5. confirm a study-level conclusion and the checks that were not performed.

The Stage 06 robustness step can be marked complete only after the exact
source pair is verified, all assessments are acknowledged, the overall review
is confirmed, and the aggregate robustness record is exported.

This is a documentation and provenance gate. It does not establish that a
result is robust, valid, reproducible, causal, or publication-ready.

## Local persistence and export boundary

Phase 8.3 participant rows remain only in the active browser tab. They are
never written to Local Storage, Supabase, Azure, OpenAI, OpenRouter,
application logs, or the Phase 8.7A export.

Browser storage contains only:

- frozen source identities and checksums;
- researcher-authored assessments and remaining-limit notes;
- run, review, and export timestamps;
- a deterministic aggregate-check checksum; and
- the final export receipt.

The exported `cerise-robustness-record-package` contains aggregate primary
estimates, aggregate alternatives, interval records, influence ranges,
researcher assessments, registry boundaries, provenance, and independent
checksums. It explicitly records:

- `participantRowsIncluded: false`; and
- `automaticExclusionsApplied: false`.

The export is independently reconstructed and verified against the exact
Phase 8.3 and Phase 8.4 packages before download. Aggregate output may still be
sensitive and must be stored in a researcher-approved location.

## Deliberate exclusions

Phase 8.7A is not general statistical software. It does not add:

- alternative missing-data mechanisms or imputation;
- automatic outlier or exclusion thresholds;
- alternate scale scoring or psychometric reliability;
- multiplicity corrections;
- clustered, repeated-measures, multilevel, longitudinal, survival, Bayesian,
  qualitative, or causal models;
- arbitrary formulas, Python, R, SQL, or generated code;
- an automatic method recommender; or
- AI access to participant or aggregate robustness data.

Those methods require separate scientific and engineering approval rather than
being inferred from the current four-method registry.

## Relationship to Phase 8.5 and Phase 8.6

Phase 8.5 continues to hold a researcher-authored robustness evidence field.
The researcher may cite the separately exported Phase 8.7A record there, but
Phase 8.7A is not automatically merged into an existing Results Record.

Phase 8.6 retains its approved deterministic 14-file archive contract. Phase
8.7A does not silently add a fifteenth file or change the archive checksum
shape. Including the robustness record in a future reproducibility archive
requires an explicitly versioned Phase 8.6 archive update.

No Supabase migration, cloud participant-data path, AI call, deployment, or
new cost-bearing service is introduced.
