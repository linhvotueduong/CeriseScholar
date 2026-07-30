# Phase 8.7C — Quantitative Engine Expansion, Batch 1

Implemented: 2026-07-29

## Outcome

Phase 8.7C adds the first separately reviewed expansion batch to Cerise
Scholar’s deterministic local quantitative engine:

1. Spearman rank correlation.
2. Paired-samples mean difference.

Both methods run inside the existing full-width Analysis Execution workspace
at `/analysis-execution/[projectId]`. The existing Stage 06 primary-analysis
step, persisted step ID, Phase 8.3 input, Phase 8.4 result package, Phase 8.5
Results Record, and Phase 8.7A robustness workflow remain the surrounding
contract.

The batch is deliberately narrow. It does not turn Cerise into general-purpose
statistical software.

## Researcher benefit

The original four-method registry could not directly represent two common
prespecified designs:

- a monotonic association analyzed through ranks rather than raw linear
  values; and
- two measurements paired within the same participant or other declared unit
  of analysis.

Researchers no longer need to mislabel those plans as Pearson correlation,
independent-group comparison, or simple regression. The workspace uses
method-specific variable labels and keeps the existing frozen-plan deviation
gate.

## Input and integrity boundary

The researcher still re-selects the exact exported Phase 8.3 derived-data JSON.
Before execution, Cerise verifies:

- immutable release, project, and contract identity;
- release, contract, plan, and preparation provenance;
- operation fingerprint;
- response and trial column dictionaries and bounds;
- response, trial, and whole-package SHA-256 checksums; and
- the reviewed/exported Phase 8.3 preparation receipt.

A changed participant value, checksum, release identity, or preparation
receipt fails closed before either new method runs.

## Spearman rank correlation

### Computation

For complete numeric pairs, the engine:

1. sorts each variable deterministically by numeric value and original index;
2. assigns average ranks to tied values;
3. calculates Pearson correlation between the two rank vectors;
4. reports Spearman rho;
5. calculates the Bonett–Wright Fisher-z interval using
   `sqrt((1 + rho² / 2) / (n - 3))` on the transformed scale; and
6. reports the corresponding approximate standard error on the rho scale.

The selected variables must have non-zero rank variance and at least four
complete pairs. Missing values are removed in pairs. Non-missing non-numeric
values block execution and must be handled explicitly in Phase 8.3.

### Diagnostics and interpretation

The result reports:

- complete-pair and missing/invalid counts;
- deterministic tie handling;
- non-zero rank variance;
- a monotonicity and influence advisory; and
- an interval-approximation advisory when the sample is small or observed
  `|rho|` is near one.

Spearman rho describes monotonic rank association. It is not automatically a
linear, causal, untied-rank, clustered, repeated-measures, or confounding-
adjusted estimate.

The confidence interval follows Bonett and Wright’s approximation and is
matched to the official R `statpsych::ci.spear` reference example:

- [R `statpsych::ci.spear` documentation](https://search.r-project.org/CRAN/refmans/statpsych/html/ci.spear.html)
- [Bonett and Wright (2000)](https://doi.org/10.1007/BF02294183)

## Paired-samples mean difference

### Computation

For complete numeric within-row pairs, the engine:

1. calculates `outcome variable − paired variable` for each complete row;
2. reports the mean paired difference;
3. uses the sample standard deviation of the paired differences;
4. reports a two-sided Student-t interval with `n − 1` degrees of freedom;
5. reports the paired t statistic without calculating a p-value; and
6. reports Cohen’s dz as the mean paired difference divided by the sample
   standard deviation of paired differences when that denominator is non-zero.

At least two complete pairs are required. Missingness removes the complete
pair, not one measurement independently. Zero difference variance leaves the
raw difference visible, omits Cohen’s dz and the t statistic, and produces an
explicit degenerate-interval advisory.

### Diagnostics and interpretation

Cerise cannot infer whether two columns are scientifically valid paired
measurements. The researcher must verify:

- each row contains the intended matched measurements;
- pairs are independent across the declared units of analysis;
- timing, ordering, carryover, and repeated-measure structure are appropriate;
- the paired-difference distribution supports the intended inference; and
- any clustering, multiplicity, or missing-data mechanism is handled outside
  this bounded method when required.

The golden fixture uses R’s documented paired `stats::t.test` workflow on the
canonical `sleep` dataset:

- [R `stats::t.test` documentation](https://stat.ethz.ch/R-manual/R-devel/library/stats/html/t.test.html)
- [R `sleep` dataset documentation](https://stat.ethz.ch/R-manual/R-devel/library/datasets/help/sleep.html)

## Independent golden-result validation

The frozen fixture is:

`docs/fixtures/phase-8.7c-quantitative-engine-reference-v1.json`

It records:

- the independent implementation and version;
- the exact reference command;
- the complete input vectors;
- confidence level;
- expected sample size;
- expected estimate and interval; and
- method-specific standard error, t statistic, degrees of freedom, and
  effect-size components.

Automated tests verify the complete local package boundary, execute the current
registry method, and compare numerical output to the frozen independent result
within a `1e-6` tolerance. Separate edge and workflow tests continue to cover
missingness, non-numeric blocking, checksum tampering, plan inference,
aggregate-only export, and storage privacy.

Passing golden tests means the implemented calculations agree with those
specific reviewed reference results. It does not prove every possible input is
correct, validate the researcher’s design, or replace statistical review.

## Robustness integration

Phase 8.7A now accepts both new method IDs:

- A Spearman primary result is independently recomputed and compared with
  Pearson correlation on the same complete pairs. A rank-specific influence
  analysis is not included in this batch and remains a required limitation.
- A paired primary result is independently recomputed and compared with the
  median and 20% trimmed mean of the same signed paired differences. A
  leave-one-pair-out mean-difference range is also reported.

No comparison automatically changes, excludes, or approves an observation.
Every robustness result still requires a researcher-authored impact
classification, interpretation, limitation, acknowledgment, overall
conclusion, and export.

## Privacy and security boundary

- Participant rows remain only in the current browser tab’s memory.
- Participant rows are not written to Local Storage, Supabase, Azure,
  OpenRouter, OpenAI, application logs, or aggregate exports.
- Browser storage retains only bounded method configuration, provenance,
  checksums, aggregate run counts, and review/export timestamps.
- Imported JSON is size-bounded, shape-validated, and checksum-verified.
- No arbitrary formula, JavaScript, SQL, Python, R, generated code, dynamic
  execution, or participant-data network request is introduced.
- Aggregate results may still be sensitive and require researcher-approved
  storage.

## Compatibility

- Analysis Execution schema remains version 1.
- Aggregate Analysis Results package remains version 1.
- Existing four-method execution documents and packages remain readable.
- Phase 8.5 accepts the expanded registry through its existing verified
  aggregate-result contract.
- Phase 8.6 retains its fixed deterministic 14-file archive.
- Phase 8.7A export shape remains version 1 while its reviewed registry accepts
  the two new method IDs.
- No release format, Local Host bundle, participant runner, Supabase schema,
  migration, cloud path, or billing surface changes.

## Deliberate exclusions

Batch 1 does not add:

- p-values or significance-threshold decisions;
- Wilcoxon signed-rank tests;
- Kendall correlation;
- factorial, repeated-measures ANOVA, or MANOVA;
- multiple, generalized, mixed, multilevel, longitudinal, survival, Bayesian,
  psychometric, mediation, moderation, or causal models;
- automatic multiplicity adjustment, imputation, outlier deletion, or method
  selection;
- arbitrary user-authored or AI-generated executable code; or
- scientific-validity, robustness, reproducibility, ethics, or publication
  certification.

Each future method family requires another bounded approval, method contract,
independent reference fixture, edge-case suite, robustness decision, and
compatibility review.
