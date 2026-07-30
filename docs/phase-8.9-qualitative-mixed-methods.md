# Phase 8.9 — Qualitative and Mixed-Methods Lane

Status: implemented on 2026-07-30.

## Purpose

Phase 8.9 adds a separate qualitative and mixed-methods workspace at:

`/qualitative-analysis/[projectId]`

It is appended to Stage 06 with the stable step ID
`stage-06-qualitative-analysis`. Existing persisted Stage 06 step IDs are not
renumbered.

The lane is deliberately separate from the quantitative execution interface.
Qualitative inquiry is not represented as a statistical method, transcript
segments are not treated as quantitative rows, code frequencies are not
presented as inferential results, and mixed-method integration does not make
one strand a validity check for the other.

A quantitative-only project can choose `not-applicable`, record a substantive
rationale, confirm that decision, and export a checksummed lane-decision
record. This preserves an explicit Stage 06 decision without forcing
qualitative procedures onto every project.

## Standards basis

The implementation follows the distinct reporting needs described by the APA
Journal Article Reporting Standards for qualitative and mixed-methods
research:

- the approach to inquiry, researcher positioning, source context, recording
  and transcription process, unit of analysis, coding procedure, and analytic
  rationale remain explicit;
- findings are grounded through linked segments and safe reporting excerpts;
- contradictions and disconfirming evidence require review rather than silent
  removal;
- analytic and reflexive memos preserve an audit trail;
- triangulation and data displays are documented as optional integrity
  procedures rather than universal validity tests; and
- mixed-method work keeps qualitative analysis, quantitative analysis, and
  integration distinct, with an explicit design and joint display.

The reporting standards also emphasize methodological pluralism. The
completion gate therefore checks that decisions are documented; it does not
prescribe one epistemology, require code frequencies, demand inter-rater
reliability, or certify methodological integrity.

Primary references:

- [APA qualitative and mixed-methods reporting standards](https://doi.org/10.1037/amp0000151)
- [NIH best practices for mixed methods research](https://obssr.od.nih.gov/research-resources/mixed-methods-research)
- [HHS de-identification guidance](https://www.hhs.gov/hipaa/for-professionals/special-topics/de-identification/index.html)

The HHS source informs the conservative quotation boundary but does not imply
that a Cerise redaction decision satisfies HIPAA, another privacy regime, an
IRB, or a consent agreement. De-identification is contextual and can retain
residual re-identification risk.

## Local source boundary

The browser accepts bounded UTF-8:

- `.txt`;
- `.md`;
- `.srt`; and
- `.vtt`.

Each file is limited to 5 MB and two million characters. Import produces:

- a normalized source label;
- original filename;
- file type;
- byte and character counts;
- SHA-256 checksum;
- optional collection context;
- an optional media reference label;
- consent/quotation scope; and
- local import time.

The source text itself remains in the active browser tab. It is not written to
Local Storage, Supabase, Azure, OpenAI, OpenRouter, logs, or the Phase 8.9
export. After reload, the researcher must re-select the exact file; byte count,
character count, and checksum must match.

The web workspace does not open audio or video. A media reference is a
researcher-authored label only. Automatic transcription is not included.
Distribution as a separately packaged native local host remains a later
boundary; the current Phase 8.9 implementation uses the same browser-local
file-processing pattern as the approved Phase 8.2–8.4 workflows.

## Manual segment coding

The researcher selects text in a read-only transcript view. A coded segment
stores:

- source ID;
- start and end character offsets;
- a checksum of the selected text;
- current code IDs;
- optional researcher-entered media start/end references;
- an analytic note;
- quotation-use decision;
- redaction-review decision;
- an optional researcher-approved reporting excerpt; and
- creation/update times.

The selected raw text is not stored with the segment. When the exact transcript
is loaded in the active tab, the workspace reconstructs the view from the
stored offsets.

Phase 8.9 does not automatically select passages, create codes, infer themes,
classify emotion, identify faces, infer personality, infer behavior, score
sentiment, or summarize participant speech.

## Versioned codebooks

Every current code records:

- name;
- definition;
- inclusion criteria;
- exclusion criteria;
- a-priori or emergent origin;
- display color; and
- creation/update times.

Freezing the codebook creates an immutable in-document snapshot with a
sequential version, rationale, timestamp, complete code definitions, and
SHA-256 checksum. Changing a current definition makes the latest snapshot
stale and blocks completion until a new version is frozen. Prior snapshots are
not mutated.

This is a local audit history, not a cryptographic signature, trusted
timestamp, preregistration, multi-user consensus mechanism, or independent
proof that coding was prospective.

## Memos, themes, and negative cases

Memos can be scoped to the study, source, segment, or theme. The completion
gate requires at least one study-level analytic or reflexive memo. Researchers
are warned not to copy direct identifiers or unreviewed quotations into memo
text because memos persist locally and enter the export.

Every theme requires:

- title;
- evidence-backed theme statement;
- boundary and context;
- at least one current code;
- at least one supporting segment;
- optional linked negative/disconfirming segments; and
- a written negative-case review even when no formal negative case was found.

The deterministic code-by-source matrix counts coded segments by current code
and source. It is a navigational display, not a prevalence estimate,
inferential result, reliability score, saturation test, or substitute for
interpretation.

## Quotation, consent, and redaction

Each source requires one of these researcher decisions:

- analysis only;
- analysis plus anonymized reporting; or
- restricted, no quotation.

Each segment separately requires a quotation-use and redaction-review
decision. A reporting excerpt is allowed only when:

1. quotation use is `direct-quote-approved`;
2. the source scope permits analysis plus anonymized reporting;
3. a researcher-authored reporting excerpt is present; and
4. redaction has been reviewed.

Non-approved segments cannot retain a reporting excerpt. These controls record
researcher decisions; they do not independently establish consent, anonymity,
de-identification, ethical approval, or legal compliance. Approved reporting
excerpts can remain identifiable and the export is therefore classified as
potentially identifiable local research material.

## Triangulation

The triangulation ledger supports:

- comparison across sources;
- comparison across methods;
- comparison across investigators;
- participant feedback;
- negative-case review; and
- an explicit single-source, cross-source-not-applicable boundary.

Every record identifies the sources/themes considered, convergent evidence,
contradictory or absent evidence, researcher resolution, limitations, and a
review confirmation. The lane does not treat triangulation, member checking,
inter-rater reliability, or any other check as a universal gold standard.

## Mixed-method integration

Mixed-method mode requires:

- a named design: convergent, explanatory sequential, exploratory sequential,
  embedded, multiphase, or researcher-described other;
- a rationale for needing and integrating both strands;
- at least one researcher-verified aggregate quantitative finding with an
  exact source reference and limitations; and
- at least one reviewed joint-display record.

A joint-display record links one qualitative theme to one aggregate
quantitative finding and records:

- convergence, complementarity, divergence, expansion, or silence;
- an integrated interpretation;
- a meta-inference;
- integration limitations; and
- researcher review.

The Phase 8.9 workspace does not execute statistics and does not independently
verify an external quantitative record. The researcher must cite the exact
Results Record checksum/analysis ID or another traceable aggregate source and
attest that the wording was checked against that source. This preserves the
separation between qualitative, quantitative, and mixed-method analyses.

## Local persistence and export

Browser storage contains the bounded project record:

- inquiry and reflexive scope;
- source metadata and checksums;
- current codes and frozen codebook versions;
- segment offsets and selected-text checksums;
- quotation/redaction decisions and approved reporting excerpts;
- memos;
- themes and negative-case reviews;
- quantitative aggregate references;
- joint displays;
- triangulation records;
- conclusions and limitations; and
- review/export receipts.

The `cerise-qualitative-analysis-package` export contains the same reviewed
record plus:

- a deterministic code-by-source matrix;
- separate source-catalog, codebook-ledger, analysis-ledger, and
  integration-ledger checksums;
- an overall package checksum; and
- explicit false declarations for raw transcript inclusion, raw media
  inclusion, automatic transcription, automatic inference, and quantitative
  statistical execution.

The verifier reconstructs the project record, rechecks relationship bounds and
the completion gate, recomputes every codebook-version checksum, recomputes all
ledger/package checksums, and rejects transcript-like raw-text fields.

## Completion gate

For qualitative or mixed-method work, Stage 06 can be marked complete only
after:

1. inquiry, researcher positioning, and manual analytic procedure are
   documented;
2. at least one transcript source is imported and every consent scope is
   reviewed;
3. current codes are fully defined and a matching codebook version is frozen;
4. at least one segment is coded and every segment has quotation/redaction
   decisions;
5. a study-level analytic or reflexive memo exists;
6. every theme is evidence linked, bounded, and negative-case reviewed;
7. triangulation or a documented single-source boundary is reviewed;
8. mixed-method projects additionally complete a design, integration
   rationale, aggregate quantitative reference, and joint display;
9. the researcher records the conclusion and remaining limitations;
10. the researcher confirms the complete record; and
11. the checksummed package is exported.

Passing this gate means only that a reviewable local analysis record was
completed. It is not proof of consent, de-identification, saturation,
methodological integrity, transferability, validity, reproducibility,
causality, or publication readiness.

## Scientific and product exclusions

Phase 8.9 does not add:

- automatic transcription;
- audio or video playback;
- cloud transcript storage;
- AI access to transcripts, segments, excerpts, media, or memos;
- automatic emotion, face, personality, sentiment, or behavioral inference;
- automatic coding, topic modeling, theme generation, or quotation selection;
- code-frequency hypothesis testing;
- inter-rater reliability computation;
- automatic saturation decisions;
- automatic consent, redaction, or de-identification claims;
- a collaborative multi-coder merge service;
- arbitrary scripts, formulas, paths, SQL, Python, or R;
- a Supabase migration or paid infrastructure; or
- changes to the fixed Phase 8.6 fourteen-file reproducibility archive.

Adding automatic local transcription, multi-coder adjudication, richer
qualitative methods, verified Results Record import, or a new archive format
requires a separately approved versioned boundary.
