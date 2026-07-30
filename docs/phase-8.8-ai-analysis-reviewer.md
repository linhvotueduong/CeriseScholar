# Phase 8.8 — AI Analysis Reviewer

Status: implemented on 2026-07-29.

## Purpose

Phase 8.8 adds AI only after Cerise Scholar's deterministic planning,
preparation, execution, robustness, and interpretation records are complete. It
is a bounded reviewer of frozen aggregate evidence, not an autonomous analyst
or scientific-validity gate.

The full-width workspace is available at:

`/analysis-review/[projectId]`

It is appended to Stage 06 with the stable step ID
`stage-06-ai-reviewer`. Existing persisted Stage 06 step IDs are not
renumbered.

The narrow optional wording helper inside Phase 8.5 remains compatible. That
helper can draft editable language for one result; Phase 8.8 is the separate
cross-record review and decision-ledger workflow required by the original
Phase 8 blueprint.

## Required records and provenance

The workspace requires ready local receipts for the same immutable release and
asks the researcher to re-select:

- the exported Phase 8.5 Results Record; and
- the exported Phase 8.7A aggregate Robustness Record.

Cerise verifies the Results Record against its local release, plan,
preparation, execution, and interpretation receipts. The aggregate Robustness
Record is checked against its local review/export checksum, source identities,
primary-result checksum, review checksum, and package checksum. A mismatch
fails closed.

The review source chain is:

`release → plan → prepared evidence → primary aggregate result → Results Record + Robustness Record → AI decision ledger`

Participant rows are not needed to verify or run Phase 8.8.

## One-question aggregate context

Each request contains one executed research question and only its bounded:

- frozen question, hypothesis, designation, estimand, variable mappings, unit,
  planned method, missing-data strategy, exclusions, transformations,
  multiplicity strategy, and sensitivity plan;
- reviewed execution specification, estimate, interval, sample count,
  missing/invalid count, metrics, assumptions, computation notes, and
  diagnostics;
- researcher-approved interpretation, claim boundary, limitation,
  diagnostic responses, and recorded deviations;
- deterministic robustness alternatives, influence summary, researcher review,
  and remaining limitations; and
- allowlisted evidence IDs that the response must cite.

The request excludes participant rows, session identifiers, response and trial
values, local filenames and paths, media, source files, API-key material, other
research questions, and arbitrary code.

## Allowed reviewer tasks

The reviewer may:

- review research-question-to-analysis alignment;
- flag variable or model compatibility concerns visible in the supplied
  records;
- explain diagnostics in plain language;
- suggest prospective sensitivity analyses;
- point out causal overclaims;
- compare primary and reviewed robustness results;
- draft bounded results wording;
- recommend aggregate figure choices; and
- explain why the current registry or evidence may not support an analysis.

The reviewer may not:

- exclude participants or invent data;
- change hypotheses, designations, plans, variables, methods, estimates,
  intervals, diagnostics, results, interpretations, or checksums;
- search alternate models for significance;
- execute code or request participant-level data;
- convert exploratory findings into confirmatory findings; or
- certify validity, causality, ethics, preregistration, reproducibility,
  generalizability, significance, or publication readiness.

## Evidence-linked response contract

The authenticated API route accepts same-origin JSON only and normalizes every
request before provider use. The model returns a bounded JSON response with:

- one summary;
- up to 12 suggestions;
- an allowlisted category and priority;
- an observation, recommendation, and limitation; and
- at least one evidence reference that must exactly match the request's
  evidence index.

Unknown categories, invented evidence references, extra estimate or p-value
fields, and malformed suggestions are dropped. The reference boundary is
covered by
`docs/fixtures/phase-8.8-ai-reviewer-reference-v1.json`.

The route uses the researcher's OpenRouter key, no-store responses, a six
request-per-minute burst limit, a 30-request daily safety cap, the shared
provider-spending guardrails, and bounded request/response sizes. Research
payloads and API-key material are not logged.

## Researcher-owned decision ledger

Every response creates a checksum-linked batch receipt containing the research
question, provider model, generation time, request checksum, response checksum,
summary, and suggestion IDs.

Every suggestion begins as `pending`. The researcher must:

1. accept or decline it;
2. record a rationale; and
3. confirm the overall conclusion and remaining limitations.

Accepted advice enters the ledger but never applies itself to an Analysis Plan,
preparation operation, exclusion, execution specification, result,
interpretation, or robustness record. Changing the ledger clears its prior
review/export confirmation.

## Local persistence and export

Browser storage contains only bounded aggregate-review provenance, summaries,
suggestions, researcher decisions, rationales, timestamps, and checksums. The
two imported aggregate packages remain in the active tab and must be
re-selected after reload.

The `cerise-ai-analysis-review-package` export contains:

- frozen release and plan identity;
- Results Record and Robustness Record checksums;
- the complete AI batch and researcher decision ledger;
- the researcher's conclusion and remaining limitations;
- independent source, ledger, and package checksums; and
- explicit declarations that participant rows are absent, upstream records
  were not changed, and AI validity certification is false.

## Completion gate

The Stage 06 AI Reviewer step can be marked complete only after:

1. both aggregate records are re-selected and verified;
2. every executed research question has at least one reviewer pass;
3. every returned suggestion is accepted or declined with a rationale;
4. the researcher records an overall conclusion and remaining limitations;
5. the researcher confirms the complete review; and
6. the aggregate decision ledger is exported.

Passing this gate means only that an evidence-linked AI review was completed
and documented. It is not proof of scientific validity, causality,
reproducibility, or publication readiness.

## Design basis

The ledger preserves the connection between plans, evidence, deviations, and
findings described by the
[Center for Open Science Lifecycle Open Science](https://www.cos.io/lifecycle-open-science)
model. The explicit AI/researcher role boundary and documented human oversight
also follow the governance direction in the
[NIST AI Risk Management Framework Core](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/).
