# Phase 4 — Reconciliation and remaining Study Builder materializers

Implementation date: July 31, 2026

Status: complete

## Outcome

Stage 03 Step 04 now covers the complete eight-design × four-setting option
space. Twenty-eight combinations produce validated, bounded Experimental Studio
starting documents. The four longitudinal combinations produce an explicit
authoring/export-only result because Cerise does not yet provide a
privacy-reviewed cross-session identity service, scheduling, reminders, or
governed recontact.

The two Phase 3 slices remain intact:

- cross-sectional survey + online/home;
- randomized between-groups + laboratory.

All other currently runnable combinations use a composable Phase 4 materializer
that combines common participant safeguards, one design module, and one setting
overlay. The materializer does not use AI or network access.

## Design materializers

### Within-subjects

- requires at least two named conditions and an explicit order or
  counterbalancing source;
- creates a stable explicit condition sequence;
- gives every repeated response a stable research-question × condition
  identity;
- records the current general-counterbalancing capability limit instead of
  inventing an unsupported assignment mode.

### Quasi-experimental

- requires at least two named naturally occurring groups or exposure states;
- records group identity as evidence rather than assigning a condition;
- creates source-linked baseline/covariate blocks;
- uses `assignment.method = "single"` and never claims randomization.

### Cross-sectional survey

- creates source-linked survey sections in laboratory, field, and hybrid
  settings as well as the Phase 3 online/home slice;
- keeps optional and refusal-safe behavior explicit;
- combines the survey with setting-specific setup and privacy requirements.

### Observational

- creates minimum-necessary observation-context capture;
- creates source-linked event, behavior, or interval coding fields;
- states that multi-observer identity and reliability remain bounded analysis
  workflows.

### Qualitative

- creates participant-controlled skip, pause, and stop guidance;
- creates long-text prompts from qualitative concepts without quantitative
  outcome requirements;
- reserves recording as a later consent-bound choice rather than enabling
  capture from an unreviewed placeholder;
- preserves transcription, quotation, retention, and access as explicit
  protocol requirements.

### Mixed methods

- requires at least one quantitative construct and one qualitative concept;
- creates visibly separate participant-procedure lanes;
- preserves sequence, priority, linkage, and integration as analysis metadata
  rather than claiming that the participant runner performs integration.

### Longitudinal

- compiles the complete source-linked profile and bounded alternative;
- does not create a runnable multi-wave Studio document;
- cannot be represented as runnable until reviewed identity, scheduling,
  reminder, and recontact capabilities exist.

## Setting overlays

### Online/home

Adds responsive behavior, shared-device/privacy guidance, participant exit, and
same-browser checkpoint boundaries. Fullscreen and focus monitoring remain off
by default. No cross-device or durable offline claim is made.

### Laboratory

Adds researcher setup/handoff, equipment and room readiness, accommodation
checks, participant-controlled stop behavior, and session reset rehearsal.

### Field

Adds battery, storage, permission, connectivity, interruption, bystander,
third-party, minimum-location, and safe-stop boundaries. It supports only a
verified connected workflow or an approved external alternative; no offline
replication claim is made.

### Hybrid

Step 01 now requires the researcher to choose at least two concrete settings
from online/home, laboratory, and field. Step 04 creates:

- a shared protocol core;
- one named entry branch per selected setting;
- one explicit setting-specific deviation block per branch;
- stable shared measure identities;
- a separate rehearsal and release boundary for every selected setting.

Hybrid selection is now part of the normalized Study Design source and its
fingerprint. Changing the setting or hybrid membership invalidates the prior
Step 01 approval.

## Stable source-link architecture

Every new Study Builder creation now writes a `StudioSourceLink` beside the
Studio document and creation receipt. The link contains:

- source-fingerprint and profile checksums;
- the last synchronized Studio checksum;
- accepted recommendation IDs and exact recommendation decisions;
- stable bindings for blocks, conditions, branches, assignment, execution, and
  title;
- the last synchronized candidate used as the three-way merge base;
- researcher override rationales;
- an explicit integrity-only claim.

Documents created before this source link remain readable and protected, but
Cerise will not guess which legacy elements were generated versus manually
edited.

## Three-way reconciliation

When Steps 01–03 change, Step 04 compares:

1. the last synchronized candidate;
2. the current Experimental Studio document;
3. the newly compiled candidate.

Each semantic change is classified as:

- **safe** — current Studio still equals the old generated element;
- **researcher-owned** — current Studio differs from the old generated element.

Safe updates default to `Apply update`. Researcher-owned changes remain
unresolved until the researcher chooses `Apply update` or `Keep current` and
records the required rationale. Applying a source over researcher-owned content
also requires a rationale.

Manual elements that were never part of the generated baseline remain outside
the update set and are preserved. A checksum check immediately before writing
stops the operation if Studio changed during review. The UI also uses the Web
Locks API when available and writes a bounded recovery snapshot during the
local two-artifact update.

## Alternate draft action

`Rebuild as new draft` creates a checksum-derived alternate draft key and source
link without replacing the active Experimental Studio document. Its integrity
claim explicitly states that it is a separate candidate, not a promotion or
approval.

## Consent boundary

Phase 4 still authors no consent language. Every runnable scaffold contains
only a refusal-safe Step 05 binding point. Recording modules remain disabled
until their separate reviewed choices and use/retention facts are bound.

## Main implementation files

- `src/lib/research/studyBuildMaterializer.ts`
- `src/lib/research/studyBuildReconciliation.ts`
- `src/lib/research/studyBuildPhase4.test.ts`
- `src/components/research-path/StudyBuildReconciliationPanel.tsx`
- `src/components/research-path/ExperimentStudioLauncher.tsx`
- `src/components/research-path/StudyBuildProfile.module.css`
- `src/components/research-path/Stage3StudyPlanner.tsx`
- `src/lib/research/studyDesign.ts`
