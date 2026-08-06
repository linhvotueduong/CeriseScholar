# Phase 3 — First two Study Builder slices

Implementation date: July 31, 2026

Status: complete

## Outcome

Stage 03 Step 04 is now a source-linked proposal and review workflow instead
of a generic link into Experimental Studio. It materializes only the two
approved Phase 3 slices:

1. cross-sectional survey in an online/home setting;
2. randomized between-groups experiment in a laboratory setting.

Every other design and setting still receives its honest Phase 2 capability
profile, but materialization fails closed with a Phase 4 boundary.

## Researcher workflow

The visible workflow is:

`Steps 01–03 sources → profile variant → explicit module decisions → exact
semantic preview → one new Studio draft → protected existing-study state`

The researcher can select Guided, Minimal compatible, or Blank. Every module
requires one explicit `accept`, `modify`, `decline`, or `defer` decision. A
modified module also requires a note. Required modules cannot be declined or
deferred when creating the bounded starting study. Unsupported modules cannot
be accepted.

`Apply profile suggestions` is a review accelerator only. It populates the
deterministic profile defaults but neither creates nor persists anything.

## Materialized online survey

The online survey materializer can create:

- welcome, voluntary exit, and support placeholders;
- a later-bound Stage 03 Step 05 consent binding point;
- shared-device and home-privacy guidance;
- an eligibility handoff without inventing screening criteria;
- survey instructions and one source-linked measure block per populated
  research question;
- a configurable skip-logic question and deterministic branch;
- an optional demographic placeholder only when accepted;
- debrief and study-close placeholders;
- home-safe execution defaults: back navigation available, fullscreen off,
  and focus-change monitoring off;
- a release-bound checkpoint/recovery requirement without claiming durable
  offline synchronization.

## Materialized laboratory experiment

The randomized laboratory materializer can create:

- a laboratory welcome and participant-controlled stop path;
- researcher setup, eligibility confirmation, and participant handoff;
- a later-bound Stage 03 Step 05 consent binding point;
- room, equipment, calibration, and accommodation checks;
- named conditions and allocation weights from the approved participant plan;
- deterministic random assignment and condition-aware routing;
- editable condition-specific procedure instructions;
- a bounded keyboard task-trial starter;
- an optional manipulation check when accepted;
- one comparable source-linked outcome block per populated research question;
- debrief, researcher return, and session-reset requirements;
- conservative execution defaults with fullscreen and focus monitoring off.

## Consent boundary

Phase 3 does not author a consent form. It adds a clearly labeled binding point
whose first choice is `Continue after the approved form is bound` and whose
second choice is `Do not participate`. The existing runner's consent refusal
behavior ends the study and clears in-progress responses. Stage 03 Step 05 must
bind and verify the applicable reviewed consent or information form before a
pilot candidate can be exported.

## Exact-preview and persistence boundary

The materializer builds an immutable candidate in memory, validates it with
the existing Studio validator, calculates its SHA-256 checksum, and shows a
semantic ledger before creation. Creation writes:

- one new versioned Experimental Studio document; and
- one creation receipt containing the source-fingerprint checksum, profile
  checksum, candidate checksum, exact module decisions, and semantic changes.

The checksum claim proves content identity only. It does not prove scientific,
ethics, pilot, or release approval.

Before the write, the UI checks the Studio storage key again. If a document
appeared during review, creation stops. After a document exists, Step 04 shows
only the protected existing-study state and the link to continue in Studio.
There is no regenerate-over-existing action in Phase 3.

## Responsive interaction architecture

Desktop uses an open module list plus a persistent rationale inspector. Mobile
uses the same list with the selected rationale expanded inline. The profile
facts become a 2 × 2 summary, the three profile variants stay visible, decision
controls retain 44-pixel mobile targets, and the creation gate remains sticky.
The implementation preserves the existing Cerise project shell and Stage 3
navigation instead of introducing a second navigation system.

## Deliberate Phase 4 boundaries

Phase 3 does not reconcile new upstream sources into an edited Studio document.
It also does not materialize the remaining six designs or field/hybrid
settings. Phase 4 owns stable source links, selective reconciliation,
researcher override preservation, and the remaining materializers.
