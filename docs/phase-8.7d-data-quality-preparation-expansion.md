# Phase 8.7D — Data Quality and Preparation Expansion, Batch 1

Implemented: 2026-07-29

## Outcome

Phase 8.7D expands the existing Phase 8.3 Reproducible Preparation and Phase
8.7B Data-Quality and Descriptive Review workspaces. It does not add or
renumber a Research Path step.

The batch adds:

1. an explicit participant trial-accuracy transformation;
2. an explicit participant reaction-time transformation;
3. a checksummed participant-inclusion ledger;
4. a checksummed participant behavioral-summary dataset; and
5. aggregate-only quality findings for inclusion and behavioral review.

All additions remain deterministic, local, bounded, and researcher controlled.
Cerise does not choose a transformation, threshold, exclusion, or validity
decision.

## Trial-accuracy transformation

`Compute trial accuracy` creates one derived response variable per completed
production session.

The researcher records:

- the new variable name;
- whether practice trials are included;
- the minimum number of scored trials required; and
- a scientific or procedural rationale.

The output is the number of eligible trials with `correct: true` divided by
the number of eligible trials with known Boolean scoring. Trials with unknown
scoring are not placed in the denominator. When the minimum scored-trial count
is not met, the derived value is missing.

The output is a proportion from zero to one. Cerise does not apply a pass
threshold. A later exclusion can use the derived value only when the
researcher adds a separate ordered exclusion operation and rationale.

## Reaction-time transformation

`Summarize reaction time` creates one derived response variable per completed
production session.

The researcher records:

- mean or median;
- whether practice trials are included;
- whether only correctly scored trials are eligible;
- whether deadline-exceeded trials are excluded;
- inclusive minimum and maximum millisecond bounds;
- the minimum number of eligible trials required;
- the new variable name; and
- a scientific or procedural rationale.

A trial is eligible only when its browser-measured RT is finite and within the
declared inclusive bounds, in addition to the selected practice, scoring, and
deadline rules. When too few eligible trials remain, the derived value is
missing.

No default is presented as universally correct. The editor initially proposes
a median over correct, non-practice, non-deadline trials from 100 through
3,000 ms so every consequential choice is visible and editable before the run.

Reaction-time preprocessing choices can materially affect results and false
positive rates. The implementation therefore exposes one declared pipeline and
preserves its rationale rather than searching multiple pipelines for favorable
results. See the peer-reviewed multiverse study
[Flexibility in reaction time analysis: many roads to a false positive?](https://pmc.ncbi.nlm.nih.gov/articles/PMC7062108/).

## Ordered-operation behavior

Both transformations participate in the existing Phase 8.3 ordered allowlist.
Their derived variables become available to later composite, transformation,
and exclusion operations in the same log.

Every run starts from a fresh clone of the reviewed source. A transformation
placed after an exclusion runs only for records still present at that point.
An exclusion placed after an accuracy or RT transformation may reference the
new variable. Disabled operations remain in provenance but do not alter rows.

No arbitrary formula, JavaScript, SQL, Python, R, generated code, imputation,
automatic outlier deletion, p-value, model fitting, or AI processing is added.

## Inclusion ledger

Every new Phase 8.3 package contains a checksummed inclusion ledger with one row
for every completed production session admitted by the fixed input boundary.
Each row records:

- session ID;
- frozen condition ID;
- final included/excluded state; and
- the ordered IDs of explicit exclusion operations that removed the session.

Included rows cannot name an exclusion operation. Excluded rows must name at
least one. Ledger state must match the derived response table exactly before
Phase 8.4 or Phase 8.7B can use the package.

Operation rationales stay in the existing operation definitions, so the ledger
connects a decision to its reviewable rule without duplicating free text per
participant.

The ledger does not include pilot, withdrawn, or incomplete sessions because
those records remain outside the fixed Phase 8.3 input boundary. Their
aggregate count remains in the preparation receipt.

Transparent inclusion and exclusion records support the reporting expectations
in the American Psychological Association’s
[JARS–Quant reporting standards](https://journals.sagepub.com/pb-assets/cmscontent/joa/JARS-Quant-1724099515.pdf).
The ledger is implementation provenance, not proof that a criterion is
scientifically justified.

## Behavioral-summary dataset

Every new package also contains one checksummed behavioral-summary row for each
completed production session. It records only derived counts and summaries:

- final inclusion state and condition ID;
- expected, observed, correct, and incorrect frozen attention checks;
- visibility-hidden, window-blur, and combined focus-loss event counts;
- practice and production trial counts;
- scored, correct, and incorrect production trial counts;
- deadline-exceeded production trial counts;
- positive browser-measured production RT count; and
- participant mean and median positive browser-measured production RT.

Attention-check correctness is recomputed from the frozen release block and
the recorded response. It does not depend on a mutable client-provided scoring
claim. Focus loss counts only runner events explicitly recorded as
`visibility-hidden` or `window-blur`; the two event types may describe the same
interruption and must not be interpreted as unique causal incidents.

The dataset includes completed sessions later excluded in preparation so the
local package preserves the full decision trail. Phase 8.7B behavioral
aggregates use only rows whose final ledger state is included, matching the
derived analysis population.

These fields are review cues. They do not establish participant attention,
fraud, device quality, physical stimulus timing, measurement validity, or
protocol compliance.

## Expanded Phase 8.7B review

The aggregate quality report now adds two required findings:

- **Inclusion ledger:** completed, included, and excluded session counts plus
  aggregate counts by exclusion operation ID.
- **Behavioral checks:** attention-check completeness/correctness, sessions
  with focus-loss events, sessions with deadline-exceeded production trials,
  correct scored-trial counts, overall scored-trial accuracy, participant
  accuracy distribution, and participant median-RT distribution.

The report never renders or exports a ledger session ID, participant behavioral
row, response value, trial value, category label, or event timestamp. Each new
finding uses the existing disposition, explanation, acknowledgment, overall
conclusion, limitation, review, and export gate.

Incorrect or missing attention checks, focus-loss events, and deadline events
raise a review cue. They do not cause an exclusion, correction, failed study,
or automatic sensitivity analysis.

## Integrity and compatibility

The Phase 8.3 package version remains version 1. The two expanded datasets are
additive optional fields so previously exported version-1 packages remain
verifiable.

For a new expanded package, verification requires:

- exact dataset column dictionaries;
- bounded row counts and field shapes;
- unique session IDs;
- internally consistent counts;
- ledger, behavioral-summary, response, trial, and whole-package SHA-256
  checksums;
- exact agreement between ledger inclusion and response-row presence;
- exact agreement between ledger and behavioral identity/inclusion state;
- no trial row for an excluded or unknown response session; and
- agreement with any expanded checksums in the local Phase 8.3 receipt.

The local Phase 8.3 receipt stores only expanded dataset checksums and row
counts. Its normalizer copies an explicit allowlist of summary fields so
untrusted extra values cannot enter browser persistence.

The Phase 8.7B engine, document, and aggregate export remain version 1. Existing
Phase 8.4 analysis execution, Phase 8.5 interpretation, Phase 8.7A robustness,
and Phase 8.6 fixed archive contracts remain compatible.

## Privacy and security boundary

- Raw response, trial, event, inclusion-ledger, and behavioral-summary rows
  stay in the current tab’s memory.
- The researcher may export them only inside the explicitly classified local
  derived-data package.
- Local Storage receives operations, rationales, aggregate counts, checksums,
  and workflow timestamps—not participant IDs or participant-level values.
- Phase 8.7B persists and exports aggregate findings only.
- Participant data is not sent to Supabase, Azure, OpenAI, OpenRouter, logs, or
  any other network service.
- Imported rows remain size-bounded, shape-validated, release-bound, and
  checksum-verified.

The local derived package remains potentially identifying research data and
must be stored in a researcher-approved location. Aggregate output can also be
sensitive, especially for small samples.

## Deliberate exclusions

Batch 1 does not add:

- an attention-check failure threshold;
- an accuracy exclusion threshold;
- adaptive, percentile, standard-deviation, or median-absolute-deviation RT
  trimming;
- winsorization or automatic outlier flags;
- device fingerprinting or bot/fraud classification;
- duration-based rushing rules;
- duplicate-participant identity detection;
- missing-data imputation or mechanism tests;
- psychometric reliability or factor models;
- trial-level inferential models;
- multiplicity adjustment, p-values, or automatic method selection; or
- scientific-validity, data-quality, reproducibility, ethics, or publication
  certification.

Each further data-quality or preparation method requires another bounded
scientific review, explicit parameters, reference-result tests where
applicable, privacy review, and compatibility decision.
