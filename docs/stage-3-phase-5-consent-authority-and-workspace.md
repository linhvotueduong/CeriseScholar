# Phase 5 — Consent authority, fact compiler, and base workspace

Implementation date: July 31, 2026

Status: complete

## Outcome

Stage 03 now has an explicit **Design Consent and Participant Rights** step
after **Build Study** and before **Define the Procedure, Data, and Analysis**.
The inserted step uses the new persisted ID `stage-03-consent`; the previous
Step 05 and Step 06 retain their existing persisted IDs and move visibly to
Step 06 and Step 07.

Phase 5 is an adult consent-authoring and consistency workflow. It is not a
legal service, an IRB determination, an ethics approval, a pilot approval, or a
participant-signature runtime. Completion means that the researcher resolved
deterministic authoring blockers, explicitly reviewed every included clause,
and exported a checksum-bound local review package against the current Study
Design and Experimental Studio sources.

## Research basis and current-source posture

The implementation was checked against current primary materials on July 31,
2026:

- UCSF's [Consent and Assent Form Templates](https://irb.ucsf.edu/consent-and-assent-form-templates)
  page states that new expedited and full-review studies use its 2026 Plain
  Language Consent Template and Companion beginning July 1, 2026.
- UCSF maintains separate [exempt consent templates and guidance](https://irb.ucsf.edu/exempt-consent-templates-and-guidance)
  for anonymous and confidential surveys, interviews, focus groups, and verbal
  processes.
- UCSF's [social and behavioral research guidance](https://irb.ucsf.edu/social-and-behavioral-research)
  requires recording details such as use and retention and cautions against
  overpromising confidentiality in group settings.
- [45 CFR 46.116](https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-A/part-46/subpart-A/section-46.116)
  establishes the reasonable-person, key-information, voluntariness, basic-
  element, and no-exculpatory-language baseline when that regulation applies.
- Joint [OHRP/FDA electronic informed-consent guidance](https://www.hhs.gov/ohrp/regulations-and-policy/guidance/use-electronic-informed-consent-questions-and-answers/index.html)
  treats electronic consent as an ongoing process and keeps responsibility
  with the investigator rather than the electronic system.
- The [OHRP Consent Form Checklist](https://www.hhs.gov/ohrp/consent-form-check-list.html)
  recommends audience-centered common language, short sentences, headings,
  and substantive review rather than reliance on a readability score alone.

The bundled authority registry stores only normalized metadata, source URLs,
versions, checksums where independently captured, clause policies, and explicit
capability boundaries. UCSF template text is not redistributed. A researcher
must obtain the current applicable source from the institution and can attach
only its filename, media type, byte size, and local SHA-256 identity; Cerise
does not copy the uploaded file contents into the consent protocol.

## Implemented form families

Phase 5 compiles these initial adult English families:

- standard adult research consent;
- anonymous survey information and consent;
- confidential survey information and consent;
- adult interview consent;
- separate optional audio-recording decision;
- separate optional video-recording decision.

The main form includes key information, purpose, implemented procedures,
reasonably foreseeable risks or discomforts, benefits, alternatives where
applicable, privacy and future-use information, payment/costs, voluntary
participation, withdrawal boundaries, and study/participant-rights contacts.
Recording forms are separate artifacts, not a sentence hidden in the main
form.

Phase 6 now implements focus groups, deception/incomplete disclosure,
debriefing, telephone flows, lifecycle addenda, renewed consent, and optional
sub-studies. Phase 7 and Phase 8 own protected audiences, language packages,
surrogate consent, and biomedical or specimen-specific families. Phase 10 owns
legally reviewed participant presentation, acceptance, refusal, copies,
signatures where applicable, and withdrawal behavior.

## Deterministic source compiler

The Phase 5 compiler reads the exact current:

1. normalized Stage 03 Study Design document; and
2. saved Experimental Studio document.

It computes checksums for both and emits one ordered source fingerprint. It
then derives participant-facing evidence for:

- design and setting;
- planned participant population;
- implemented procedure blocks;
- implemented response variables;
- random condition assignment, when present;
- audio/video recording behavior;
- implemented timing minimum.

Researcher-confirmed facts remain explicit inputs because they cannot be
safely inferred from screens: purpose, total duration, risks, benefits,
payment/costs, privacy limits, authorized access, retention, withdrawal and
deletion boundaries, contacts, identifiability, future use, and recording use
and destruction.

If either source changes, the prior review package becomes stale. Reconciliation
recompiles derived text, preserves researcher-edited clauses, clears export
readiness, and marks every source-affected clause for renewed human review.

## Authority and governance controls

Cerise does not select an exemption or review pathway from the design. The
workspace requires the researcher to record:

- the authority profile;
- confirmation that it applies and that the current template was obtained;
- the declared governance pathway;
- whether that declaration came from the researcher or institution;
- the institutional determination, protocol, or review reference;
- the consent-documentation process;
- the human approval reference for any declared waiver or alteration that
  requires it.

Verbal, implied, or acknowledgement-based documentation cannot be represented
as approved merely because the researcher selected that method. Where the
current pathway requires waiver evidence, `requested` and `not requested`
remain blocking.

## Authoring and review workflow

The Phase 5 workspace originally shipped with five views. Phase 6 extends it
to six by inserting **Protocol modules** between facts and forms:

1. **Authority** — source profile, governance declaration, source links,
   template identity, and applicability confirmation.
2. **Study facts** — compiler-derived facts beside researcher-confirmed facts.
3. **Protocol modules** — special behavioral, remote, recording, and lifecycle
   decisions compiled by Phase 6.
4. **Form** — form family, clause outline, provenance, edit policy,
   participant-facing text, human-review state, and exact repair targets.
5. **Participant preview** — a plain-language reading view for each compiled
   artifact.
6. **Review & export** — consolidated issue center, version ledger, source
   checksum, and local review-package export.

Every clause records its compiler source, source locator, applicable study fact
IDs, last compiled text, researcher-edit status, edit policy, and human-review
state. Locked wording rejects text changes at the domain layer. Editing an
editable clause or changing its source invalidates its prior human review.

Warnings and source advisories remain visible after blockers are resolved.
They do not falsely prevent readiness, and the ready state still says that it
is an authoring gate rather than an approval.

## Blocking consistency checks

Export and Stage-step completion remain disabled while any of these are
unresolved:

- authority applicability;
- governance owner, pathway, reference, or documentation process;
- required human waiver/alteration evidence;
- stale Study Design or Studio source fingerprint;
- required participant facts;
- anonymous claims that conflict with identifying variables or recording;
- missing recording purpose, access/use, or retention/destruction;
- unresolved participant-facing placeholders;
- an included clause without explicit human review.

Information-sheet families outside a documented-exempt pathway produce a
warning because Cerise cannot infer whether the family is institutionally
appropriate.

## Integrity and persistence

Each authoring version stores a checksum of the protocol content without its
mutable version/export ledger. A review package stores the same document
checksum, the current source fingerprint, authority identity, issue state, and
its own package checksum. Stage completion requires a matching latest version
and export receipt. Checksums prove identity and consistency only.

Local device persistence is available immediately. Authenticated cloud
persistence uses the project-owned `consent_protocols` table. The migration:

- limits each structured protocol to 512 KiB;
- enables row-level security;
- revokes anonymous access;
- grants only authenticated CRUD;
- checks both `user_id = auth.uid()` and ownership of the referenced project;
- applies both `USING` and `WITH CHECK` to updates.

The migration intentionally stores no participant decisions, signatures,
participant responses, or uploaded authority-file contents. It was generated
locally and validated with the application; it has not been applied to a
remote environment because deployment was not part of this phase approval.

## Main implementation files

- `src/lib/research/consentPhase5.ts`
- `src/lib/research/consentPhase5Persistence.ts`
- `src/lib/research/consentPhase5.test.ts`
- `src/components/research-path/ConsentWorkspace.tsx`
- `src/components/research-path/ConsentWorkspace.module.css`
- `src/lib/research/researchPathConfig.ts`
- `src/components/research-path/ResearchPathWorkspace.tsx`
- `supabase/migrations/20260801013113_phase5_consent_protocols.sql`
