# Phase 8 — Prepare and Analyze

Status:

- Phase 8.0 analysis-contract and provenance foundation implemented on
  2026-07-28.
- Phase 8.1 release-bound Analysis Plan Editor implemented on 2026-07-28.
- Phase 8.2 local Data Intake and Audit implemented on 2026-07-28.
- Phase 8.3 local Reproducible Preparation implemented on 2026-07-28.
- Phase 8.4 local Analysis Execution implemented on 2026-07-29.
- Phase 8.5 aggregate Results and Interpretation implemented on 2026-07-29.
- Phase 8.6 local Reproducibility Package implemented on 2026-07-29.
- Phase 8.7A reviewed Robustness and Sensitivity implemented on 2026-07-29.
- Phase 8.7B local Data-Quality and Descriptive Review implemented on
  2026-07-29.
- Phase 8.7C Quantitative Engine Expansion batch 1 implemented on 2026-07-29.
- Phase 8.7D Data Quality and Preparation Expansion batch 1 implemented on
  2026-07-29.

Phase 8 maps to **Stage 06: Prepare and Analyze** in the Research Path. It does
not replace Stage 08, which is the later review, sharing, and preservation
stage. Phase 8.6 connects the analysis record to that later Stage 08
preservation work; Phase 8.7A fills the dedicated Stage 06 robustness step.
Phase 8.7B replaces the remaining generic Stage 06 quality-check canvas while
preserving its persisted step ID.
Phase 8.7C expands the existing Phase 8.4 execution and Phase 8.7A robustness
registries without adding or renumbering a Research Path step.
Phase 8.7D expands the existing Phase 8.3 preparation and Phase 8.7B quality
contracts without adding or renumbering a Research Path step.

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

## Phase 8.4 outcome

Phase 8.4 adds a dedicated full-width Analysis Execution workspace at
`/analysis-execution/[projectId]` and links it from the Stage 06 primary-analysis
step. It requires a ready Phase 8.1 plan and a reviewed/exported Phase 8.3
preparation document for the same immutable release.

The researcher must re-select the exact Phase 8.3 derived JSON package. The
browser validates its release identity, plan identity, operation fingerprint,
row and column bounds, and independent response, trial, and package checksums.
Any changed cell, checksum, release, or preparation receipt fails closed.

### Reviewed method registry

The initial bounded registry contained four methods. Phase 8.7C expands the
same registry to six:

- descriptive summary with a Student-t confidence interval for the mean;
- Pearson correlation with a Fisher-z confidence interval;
- Spearman rank correlation with deterministic average ranks and a
  Bonett–Wright Fisher-z interval;
- a two-group raw mean difference using Welch inference, plus Hedges g;
- a paired-samples raw mean difference with a Student-t interval and Cohen’s
  dz when estimable; and
- simple ordinary-least-squares regression with an unstandardized slope
  interval and R-squared.

Each enabled research question records a reviewed method, outcome, optional
predictor or grouping variable, confidence level, and—when the configuration
differs from the frozen plan—a required deviation rationale. Variables can be
selected only from the frozen plan or the verified derived package. The engine
does not execute user-authored formulas, scripts, SQL, Python, R, network code,
or model-generated code.

Every result includes:

- the complete-case sample size and excluded missing or invalid count;
- a primary estimate, bounded supporting metrics, and an interval;
- explicit assumptions and computation notes;
- method-specific blocking or advisory diagnostics; and
- an alignment status tied to the frozen analysis plan.

Blocking diagnostics prevent the review/export gate. Advisory diagnostics
remain visible and require researcher judgment; they are not silently
corrected. The completion gate requires a current deterministic run, no
blocking diagnostic, explicit review of estimates, intervals, assumptions and
diagnostics, and export of the aggregate results package.

### Local execution and persistence boundary

Prepared participant response rows are held only in the current browser tab's
memory. They are never persisted to Local Storage, Supabase, Azure, OpenAI,
OpenRouter, application logs, or the aggregate results package. Local Storage
contains only:

- bounded method configuration;
- frozen release, plan, and preparation provenance;
- source and result checksums;
- aggregate run counts and diagnostic counts; and
- review/export timestamps.

The exported package contains aggregate statistical output, the normalized
method configuration and registry metadata, the source preparation checksum,
and independent result/package checksums. Aggregate results may still be
sensitive and must be stored in a researcher-approved location.

Phase 8.4 is not:

- general statistical software;
- support for multilevel, longitudinal, repeated-measures, survival, Bayesian,
  psychometric, qualitative, or custom models;
- an automatic method recommender or substitute for statistical expertise;
- a preregistration or prospective-plan proof;
- an amendment ledger;
- a causal-inference, validity, reproducibility, or publication certification;
  or
- permission for AI to inspect participant-level data.

## Phase 8.5 outcome

Phase 8.5 adds a dedicated full-width Results and Interpretation workspace at
`/analysis-results/[projectId]` and links it from the final Stage 06 Results
Record step. It accepts only the exported Phase 8.4 aggregate-results package
and independently verifies the complete release → contract → plan →
preparation → result checksum chain before enabling interpretation.

Each primary research question, and each non-primary question with an executed
result, receives a bounded researcher-authored record containing:

- a direct evidence-linked answer;
- separate statistical and practical meaning;
- a claim and claim-strength classification;
- limitations and boundary conditions;
- responses to Phase 8.4 advisory diagnostics;
- explicit robustness or sensitivity status and evidence;
- frozen-plan divergence impact;
- an approved aggregate table; and
- an approved confidence-interval figure.

The robustness boundary is deliberately researcher-authored. Phase 8.5 records
whether relevant checks were performed outside Cerise, were not performed, or
were not applicable with a rationale. It does not run a sensitivity,
reliability, robustness, or triangulation analysis, and it does not
automatically complete the separate Stage 06 Robustness step.

The optional Results Interpretation assistant uses the researcher's OpenRouter
key and receives only the active reviewed aggregate result, bounded frozen-plan
context, and current draft. It cannot change estimates, intervals, methods,
variables, checksums, divergence records, or invent p-values or new analyses.
Suggestions remain in memory and require an explicit researcher action before
entering the editable draft.

Browser storage contains bounded interpretation, result IDs, provenance,
checksums, approval flags, and review/export timestamps—not the aggregate
result payload or participant rows. The exported Results Record includes the
reviewed aggregate output, interpretations, tables, figures, divergence
register, and independent checksums, and explicitly records
`participantRowsIncluded: false`.

See `phase-8.5-results-interpretation.md` for the complete integrity, privacy,
AI, robustness, export, and completion-gate contract.

## Phase 8.6 outcome

Phase 8.6 adds a dedicated full-width Reproducibility Package workspace at
`/reproducibility-package/[projectId]` and links it from a new final Stage 08
step without shifting the IDs of the four existing Stage 08 steps.

The researcher must re-select the exact exported Phase 8.5 Results Record.
Cerise verifies the complete Phase 8.0–8.5 local identity and checksum chain
before allowing archive construction. The workspace then creates a
deterministic 14-file USTAR package containing the reader guide, frozen release
metadata, data dictionary, analysis contract and plan, aggregate intake audit,
preparation operation log, Phase 8.4 method/configuration index, full aggregate
Results Record, divergence register, environment and schema versions, bounded
restricted-material references, verification report, and machine-readable
manifest.

Participant and derived rows, raw media, and the combined SQLite database are
never embedded. The complete frozen Studio specification and embedded media
are also excluded; the release checksum is verified locally before packaging,
but its metadata-only archive file cannot reconstruct that checksum.
Researcher-selected external locations are descriptive references that Cerise
does not open or validate.

Each non-manifest file has a raw-byte SHA-256 checksum. Before export is
enabled, Cerise parses the completed TAR again and verifies its headers, fixed
file set, sizes, manifest, file checksums, embedded Results Record checksum,
privacy declarations, and selected release identity. The recorded browser and
device context describes archive construction, not the earlier Phase 8.4
execution environment.

This is a locally verifiable preservation handoff, not a signature, trusted
timestamp, scientific-reproducibility finding, validity certification,
repository deposit, venue-compliance result, or submission package. Nothing
is uploaded automatically. Phase 8.6 adds no Supabase migration, AI call,
participant-data network path, or cost-bearing infrastructure.

See `phase-8.6-reproducibility-package.md` for the complete file, integrity,
privacy, environment, and completion-gate contract.

## Phase 8.7A outcome

Phase 8.7A adds a dedicated full-width Reviewed Robustness and Sensitivity
workspace at `/analysis-robustness/[projectId]`. It replaces the generic
canvas behind the existing Stage 06 robustness step without changing the
persisted `stage-06-step-04` ID.

The researcher must re-select the exact Phase 8.3 derived-data package and the
exact Phase 8.4 aggregate-results package. Cerise verifies their complete
source chain, confirms that they share the same preparation checksum, and
independently recomputes every Phase 8.4 primary estimate and complete-case
sample size before producing a comparison.

The bounded registry adds:

- median, 20% trimmed mean, and leave-one-out mean checks for descriptive
  analyses;
- Spearman rank correlation and a leave-one-out Pearson range for correlation;
- median-difference, trimmed-mean-difference, and leave-one-out raw
  mean-difference checks for two-group analyses; and
- an HC3 slope interval and leave-one-out OLS slope range for simple
  regression.

The checks never automatically exclude an observation. The researcher must
classify the impact on each conclusion, write an interpretation and remaining
limits, acknowledge every assessment, confirm the overall record, and export
it before the Stage 06 step can be completed.

Participant rows remain in the active tab only. Browser storage and the
exported robustness record contain bounded provenance, aggregate outputs,
reviews, timestamps, and checksums—not participant rows. Phase 8.7A uses no AI,
adds no migration or cloud participant-data path, and is not proof of
robustness, validity, causal identification, or reproducibility.

The Phase 8.6 archive remains the approved fixed 14-file format. The separate
Phase 8.7A export is not silently inserted into it; a future archive integration
requires an explicit versioned update.

See `phase-8.7a-reviewed-robustness.md` for the complete method, integrity,
privacy, review, export, and scientific-boundary contract.

## Phase 8.7B outcome

Phase 8.7B adds a dedicated full-width Data-Quality and Descriptive Review
workspace at `/data-quality-review/[projectId]`. It replaces the generic
canvas behind the existing Stage 06 quality-check step without changing the
persisted `stage-06-step-02` ID.

The researcher re-selects the exact exported Phase 8.3 derived-data package.
Cerise independently verifies the complete release, contract, plan,
preparation, response, trial, and package checksum chain before aggregating
anything. Participant response and trial rows remain in the active tab only.

The bounded deterministic engine reports:

- response-row completeness across the derived analysis columns;
- per-variable observed, missing, scalar-type, distinct-level, singleton-level,
  and consistently numeric center/spread/range summaries;
- repeated response-pattern counts without exposing the matching rows;
- frozen-condition allocation counts and unexpected or missing condition IDs;
- preparation input/output, explicit-exclusion, missing-cell, and trial-row
  deltas; and
- aggregate practice/production, response, correctness, deadline, duplicate-key,
  and positive browser-measured reaction-time summaries for trial rows.

No observed category or free-text value, participant identifier, trial value,
or row preview is rendered or exported. Numeric summaries are produced only
when every observed value in a variable is already numeric. Review cues are
descriptive conditions, not automatic scientific thresholds.

Every deterministic finding requires a researcher disposition, explanation,
and acknowledgment. The researcher must also record the study-level quality
conclusion and remaining limitations, confirm the complete review, and export
an independently reconstructed aggregate quality record before the Stage 06
step can be completed.

Browser storage contains only source identity, checksums, aggregate run counts,
finding IDs, researcher-authored decisions, timestamps, and the export receipt.
The exported record explicitly declares that it includes no participant rows
or participant-level value lists and applies no automatic corrections or
exclusions. It contains no
inferential statistics and uses no AI.

Phase 8.7B does not make Phase 8.4 a general statistics system or silently
change its package checksum. Direct Phase 8.4 verification remains compatible
with existing reviewed Phase 8.3 exports; the Research Path separately gates
the quality-review step. The fixed Phase 8.6 14-file archive also remains
unchanged. Adding the separate 8.7B record to a future preservation archive
requires an explicit versioned archive update.

See `phase-8.7b-data-quality-review.md` for the complete aggregation, integrity,
privacy, decision, export, and scientific-boundary contract.

## Phase 8.7C outcome

Phase 8.7C is the first bounded Quantitative Engine Expansion batch. It extends
the existing `/analysis-execution/[projectId]` workspace rather than adding a
new route or Research Path step.

The Phase 8.4 reviewed registry now adds:

- **Spearman rank correlation:** complete numeric pairs are converted to
  deterministic average ranks, including ties. The engine reports Spearman
  rho and the Bonett–Wright large-sample Fisher-z interval without producing a
  p-value. Small samples and correlations near ±1 remain explicit interval
  advisories.
- **Paired-samples mean difference:** the engine forms complete within-row
  differences in the signed order `outcome − paired variable`, then reports
  the raw paired mean difference, Student-t interval, paired-difference sample
  standard deviation, paired t statistic, and Cohen’s dz when the difference
  variance is non-zero.

Plan-method inference distinguishes Spearman from generic Pearson wording and
paired/dependent/within-subject wording from independent-group comparisons.
Any selected method or variable that does not align with the frozen plan still
requires a written deviation rationale.

Phase 8.7A is extended at the same time so the new primary methods do not break
the Stage 06 robustness workflow:

- Spearman receives an independently recomputed primary estimate and a
  same-pair Pearson comparison. Rank-specific influence analysis remains an
  explicit unperformed limitation in this batch.
- The paired method receives median and 20% trimmed paired-difference
  comparisons plus a leave-one-pair-out mean-difference range.

Golden-result tests use a frozen R `statpsych::ci.spear` example and R’s
documented paired `stats::t.test` example on the `sleep` dataset. The fixture
records the reference commands, inputs, versions, and expected estimates,
standard errors, intervals, t statistic, degrees of freedom, and effect-size
components. These engineering checks establish agreement for the reviewed
fixtures; they are not a scientific validation of a researcher’s design or
data.

The existing Phase 8.3 verification, Phase 8.4 result-package schema, browser
storage boundary, aggregate-only export, Phase 8.5 interpretation flow, and
Phase 8.6 fixed archive contract remain unchanged. Participant rows stay in
the active tab and are never sent to AI or cloud storage. Phase 8.7C adds no
Supabase migration, new infrastructure, arbitrary code, p-value search,
automatic method selection, or cost-bearing service.

See `phase-8.7c-quantitative-engine-expansion.md` for the complete method,
reference-validation, robustness, privacy, compatibility, and exclusion
boundary.

## Phase 8.7D outcome

Phase 8.7D is the first bounded Data Quality and Preparation Expansion batch.
It extends the existing `/data-preparation/[projectId]` and
`/data-quality-review/[projectId]` workspaces.

Phase 8.3 adds two ordered, rationalized operations:

- a participant scored-trial accuracy proportion with an explicit practice
  choice and minimum scored-trial count; and
- a participant browser-measured RT mean or median with explicit practice,
  correctness, deadline, inclusive millisecond-bound, and minimum eligible
  trial choices.

Each new package also carries a checksummed inclusion ledger and a checksummed
behavioral-summary dataset. The ledger links each completed production session
to final inclusion and explicit exclusion-operation IDs. Behavioral rows
derive frozen attention-check results, focus-loss events, accuracy, deadline
counts, and positive RT summaries without preserving response values or event
timestamps in the summary.

Phase 8.7B aggregates the expanded datasets for the included analysis
population and requires explicit researcher decisions for the new inclusion
and behavioral findings. It still makes no automatic correction, exclusion,
threshold, validity decision, or inferential claim.

The package version remains version 1 with optional additive fields, so older
version-1 Phase 8.3 packages remain verifiable. Expanded packages additionally
verify their dataset dictionaries, row shapes, cross-dataset identities,
inclusion state, and independent SHA-256 checksums. Participant-level expanded
rows stay in tab memory and the classified local export; browser storage and
the Phase 8.7B export remain aggregate-only.

See `phase-8.7d-data-quality-preparation-expansion.md` for the complete
transformation, ledger, behavioral, quality-review, integrity, privacy,
compatibility, and scientific-exclusion boundary.

The fixture at `docs/fixtures/phase-8-analysis-contract-v1.json` documents the
minimum schema shape used for cross-runtime review.
