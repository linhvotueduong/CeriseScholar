# Phase 6 — Behavioral, remote, and lifecycle consent variants

Implementation date: July 31, 2026

Status: complete

## Outcome

The Stage 03 consent workspace now compiles special participant-flow modules
into the same project-scoped, checksum-bound protocol introduced in Phase 5.
It does not maintain a second collection of disconnected forms. Phase 6 adds a
sixth workspace view, **Protocol modules**, between **Study facts** and
**Form**, so the workflow is now:

1. identify the applicable authority and governance path;
2. reconcile the implemented study and researcher-confirmed facts;
3. configure special participant-flow modules;
4. compile the main and supplemental forms or scripts;
5. preview every participant artifact;
6. resolve human-review issues and export one versioned review package.

The implementation remains authoring and export support. It does not decide
whether a waiver, alteration, deception plan, no-debrief exception, recording
release, notification, addendum, or renewed-consent process is legally or
institutionally sufficient.

## Scholarly and regulatory basis

The design was checked against current primary materials on July 31, 2026:

- [45 CFR 46.116](https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-A/part-46/subpart-A/section-46.116)
  and [45 CFR 46.117](https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-A/part-46/subpart-A/section-46.117)
  provide the federal consent and documentation baseline when applicable.
- The [OHRP Informed Consent FAQs](https://www.hhs.gov/ohrp/regulations-and-policy/guidance/faq/informed-consent/index.html)
  describe consent as an ongoing process and identify significant new
  information as relevant to continued willingness.
- The SACHRP discussion of [new information and re-consent](https://www.hhs.gov/ohrp/sachrp-committee/recommendations/april-7-2020-attachment-a/index.html)
  describes multiple human-selected responses—revised consent, addendum, oral
  notification, or another appropriate mechanism—rather than one universal
  software rule.
- [NIH IRBO deception guidance](https://irbo.nih.gov/confluence/download/attachments/38962257/IRB%20Review%20of%20Research%20Involving%20Deception-October%202023.pdf?api=v2&modificationDate=1695736025742&version=1)
  informed the separate necessity, alternatives, undisclosed-risk,
  willingness, approval, debrief, and post-debrief data-choice gates.
- UCSF's [social and behavioral research guidance](https://irb.ucsf.edu/social-and-behavioral-research)
  distinguishes waivers of signed documentation from waivers of consent,
  describes telephone/online consent expectations, addresses recording and
  deception, and explains that researchers cannot guarantee that focus-group
  members will keep discussion private.
- UCSF's specific guidance on [verbal, electronic, or implied consent and
  waiver of signed consent](https://irb.ucsf.edu/verbal-electronic-or-implied-consent-waiver-signed-consent)
  informed the separate documentation-waiver fields, copy/question plan, and
  consent-discussion record.
- UCSF's [exempt consent template index](https://irb.ucsf.edu/exempt-consent-templates-and-guidance)
  confirms separate focus-group and verbal-script families, while its main
  [consent and assent template index](https://irb.ucsf.edu/consent-and-assent-form-templates)
  lists separate telephone screening, telephone main-study, and addendum
  resources.

The authority registry stores these as source metadata and links. It does not
redistribute institutional template language.

## Module architecture

Seven bounded modules are persisted under `document.phase6`:

| Module | Responsibility | Principal safety boundary |
| --- | --- | --- |
| Behavioral task and randomization | Assignment disclosure, task risks, pause/stop rules | Design facts may suggest it but do not finalize participant wording |
| Focus-group confidentiality | Researcher safeguards, participant reminder, group limit | Cannot promise that other participants will maintain confidentiality |
| Incomplete disclosure and debrief | Necessity, alternatives, withheld information, approvals, debrief plan | Experiment design never authorizes deception or incomplete disclosure |
| Recording boundaries | Research use, access, retention/destruction, non-research use | Teaching, presentation, or public use needs a separate-release determination |
| Telephone consent | Eligibility screening and main-study consent | The two decisions and their data contracts remain separate |
| Recontact and changed information | Ongoing willingness, change triggers, human disposition | Cerise never decides which reconsent mechanism is legally required |
| Optional sub-studies | Separate activities and ancillary data choices | Independent refusal does not become main-study refusal |

Each module has an explicit applicability status, determination source,
authority or protocol reference, and researcher rationale. `not-configured`,
`not-applicable`, and `applicable` are distinct states. Suggestions are derived
from implemented facts and shown as suggestions only; they do not mutate
applicability.

## Incomplete disclosure, deception, and debriefing

The disclosure module starts in full-disclosure mode even for randomized
experiments. A researcher must explicitly choose a proposed incomplete-
disclosure or deception mode. The authoring gate then requires:

- scientific necessity;
- less-restrictive alternatives considered;
- the information withheld or altered;
- a determination that no undisclosed risk remains;
- a determination about whether the withheld information affects willingness;
- approved waiver/alteration status and a human approval reference;
- a debrief-required or no-debrief human determination;
- when debriefing is required, timing, delivery, participant text, and the
  post-debrief data-use decision;
- when debriefing is not required, a separate authority reference and
  exception rationale.

`requested`, `not requested`, and a missing approval reference all remain
blocking. A no-debrief selection cannot bypass the gate.

The module also stores **waiver of the consent process** separately from the
Phase 5 **waiver of signed documentation** field. Approval of one never counts
as approval of the other.

## Telephone flows

Telephone eligibility screening and main-study consent are independent
pathways and produce different artifacts:

- eligibility-screening script, purpose, retention, and deletion handling;
- main-study telephone consent script;
- agreement before substantive screening or research questions;
- participant question opportunity;
- delivery of the current information or consent copy;
- documentation of the discussion, questions, version, and agreement.

Selecting both pathways produces two artifacts. Cerise does not combine the
screening agreement into main-study consent or silently reuse screening data
under the main-study contract.

## Focus groups, recording, and optional choices

Focus-group compilation always inserts a non-editable realistic limitation:
the team can request privacy but cannot guarantee the behavior of other group
members. The issue engine additionally rejects researcher text that appears to
promise participant-to-participant confidentiality.

Recording separates research use, access, and retention/destruction from
teaching, presentation, and public use. Any non-research use requires the
researcher to record that a separate release is required and provide the
determination reference. The protocol also records whether a participant may
decline recording and continue the main study. Those bounded decisions compile
into the existing Phase 5 audio/video participant form, so the protocol module
and participant-facing recording choice do not become disconnected sources of
truth.

Optional sub-studies compile as `separate-optional-choice` artifacts. Their
purpose, participant text, data use, retention/destruction, decline outcome,
authority reference, and review state remain independent of the main consent.

## Changed information and renewed consent

The lifecycle module records recontact purpose/method, ongoing willingness,
changed-information text, and bounded change triggers. Each trigger records:

- category and description;
- affected participants;
- urgency;
- one human disposition: notification, changed-information addendum, full
  renewed consent, or documented no-renewed-consent determination;
- the authority reference for that disposition.

An addendum disposition compiles an addendum artifact. A full-renewed-consent
disposition additionally compiles a renewed-consent artifact. Draft changed-
information text alone does not compile either artifact before a human
disposition selects that path. The artifacts carry the triggering disposition
reference rather than only the general lifecycle reference. Source changes
still invalidate the overall Phase 5/6 source fingerprint and force
reconciliation; Cerise does not automatically claim that every source change
requires reconsent.

## Artifact, review, version, and migration behavior

Phase 6 artifacts are deterministic outputs of the module state. Researcher
review survives recompilation only while participant text and artifact
provenance remain unchanged. Changed text, decision mode, source module, or
authority reference returns the artifact to `human-review-required`. Every
included artifact must be explicitly human reviewed before export.

The consent document schema moves from version 1 to version 2. The normalizer
accepts a bounded legacy version-1 Phase 5 document, preserves its authority,
facts, forms, versions, and exports, and adds a safe default Phase 6 state. New
module decisions clear obsolete versions and export receipts. The current
review package includes the complete Phase 6 state and artifacts in both the
document checksum and package checksum.

No new database table or remote migration is required. Phase 6 remains within
the existing 512 KiB `consent_protocols.spec` JSON object and inherits the
Phase 5 row-level security and project-ownership policies. Current Supabase
changelog and RLS documentation were reviewed; none of the current breaking
changes alters this persisted JSON/RLS design.

## Main implementation files

- `src/lib/research/consentPhase6Model.ts`
- `src/lib/research/consentPhase6.ts`
- `src/lib/research/consentPhase6.test.ts`
- `src/lib/research/consentPhase5.ts`
- `src/lib/research/consentAuthority.ts`
- `src/components/research-path/ConsentPhase6Workspace.tsx`
- `src/components/research-path/ConsentPhase6Workspace.module.css`
- `src/components/research-path/ConsentWorkspace.tsx`
- `src/components/research-path/ConsentWorkspace.module.css`
