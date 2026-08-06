# Stage 3 Phase 7 — Protected-Audience and Language Consent Packages

## Delivered scope

Phase 7 adds governed authoring, review, freeze, and export support for:

- parent or guardian permission;
- child or adolescent assent, affirmative agreement, dissent, and age-of-majority transition;
- legally authorized representative (LAR) or surrogate consent;
- accessible oral or adapted presentation;
- source-bound translated consent variants; and
- institution-approved short-form oral consent with a separate full-information summary.

These are separate artifacts because the person receiving information, the person providing permission or consent, the decision being documented, and the required language can differ. Phase 7 never collapses child assent into parent permission or participant involvement into representative consent.

## Claim and execution boundary

Phase 7 is an authoring system, not an IRB, legal, clinical-capacity, language-certification, or legally effective consent system. It does not:

- decide whether an audience package applies;
- infer an assent age band, age of majority, one- or two-parent rule, LAR hierarchy, or short-form eligibility;
- establish decisional capacity, representative authority, interpreter qualification, witness impartiality, or signature identity;
- certify an AI-assisted translation as accurate;
- execute participant, parent, representative, interpreter, witness, or signature workflows.

Every applicable package must cite a researcher or institutional determination. Jurisdiction, the institutional profile, escalation contacts, and an explicit authoring-only acknowledgement are part of the export gate. Multi-actor runtime remains unavailable until identity, authority, signature, witness, audit, revocation, and custody controls have their own approved threat model and implementation.

## Source hierarchy

The architecture is informed by current primary sources, while institution-specific rules remain local profile data:

1. [45 CFR 46.102](https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-A/part-46/subpart-A/section-46.102) defines an LAR through applicable law and, in a bounded circumstance, institutional policy used outside research.
2. [45 CFR 46.116](https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-A/part-46/subpart-A/section-46.116) and [45 CFR 46.117](https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-A/part-46/subpart-A/section-46.117) govern the consent information and documentation baseline.
3. [45 CFR 46.408](https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-A/part-46/subpart-D/section-46.408) governs permission by parents or guardians and child assent for HHS-regulated research involving children.
4. [OHRP Informed Consent FAQs](https://www.hhs.gov/ohrp/regulations-and-policy/guidance/faq/informed-consent/index.html) clarify understandable language, LAR authority, short-form signatures, and the IRB's role in assent documentation.
5. [OHRP Research with Children FAQs](https://www.hhs.gov/ohrp/regulations-and-policy/guidance/faq/children-research/index.html) distinguish affirmative assent from silence and describe case-specific age, maturity, and psychological-state considerations. The page itself notes that parts predate later Common Rule changes, so it is treated as guidance and not a universal age table.
6. [OHRP non-English-speaker guidance](https://www.hhs.gov/ohrp/regulations-and-policy/guidance/obtaining-and-documenting-infomed-consent-non-english-speakers/index.html) distinguishes a fully translated form from the short-form oral process and identifies the short-form, summary, witness, signature, and copy roles.
7. [UCSF 2026 consent and assent templates](https://irb.ucsf.edu/consent-and-assent-form-templates), [non-English-speaker guidance](https://irb.ucsf.edu/consenting-non-english-speakers), [short-form update](https://irb.ucsf.edu/content/updated-requirements-for-short-form-consent-method), [children and minors guidance](https://irb.ucsf.edu/children-and-minors-research), [accessible-consent guidance](https://irb.ucsf.edu/enrolling-subjects-who-are-legally-blind-illiterate-or-cannot-talk-or-write), and [surrogate-consent guidance](https://irb.ucsf.edu/surrogate-consent) are registered as metadata for the UCSF profile. UCSF-specific recommendations are not applied to other institutions.

No external template wording is redistributed. Authority manifests store source identity, dates, capabilities, and claim boundaries only.

## Data and compiler architecture

`ConsentPhase5Document` now uses schema version 4 and includes bounded Phase 7 and Phase 8 state. Schema 1 and 2 drafts receive inert Phase 7 and Phase 8 state; schema 3 drafts preserve Phase 7 and receive inert Phase 8 state. Nothing becomes applicable during migration.

Each package includes:

- `applicability`;
- the human determination source;
- an authority reference;
- a researcher rationale when the researcher made the determination; and
- package-specific planning and participant-facing text.

The compiler emits deterministic `ConsentPhase7Artifact` records. Each artifact carries:

- one audience and language;
- one package and artifact kind;
- participant-facing text;
- authority provenance;
- a source artifact link when derived;
- a deterministic source identity;
- general human-review state;
- qualified-language-review state where applicable; and
- the locked runtime mode `authoring-export-only`.

Source identity includes the implemented-study checksum, authority manifest and version, linked artifact identifier, and linked artifact contents. Editing the main form, a linked module artifact, authority profile, source language, target language, or protected-audience package recompiles the dependent artifact and invalidates its previous review.

## Safety invariants

The issue engine blocks review-package export when any of these invariants fails:

- an institution-declared required audience is not configured as applicable;
- an applicable package lacks a determination source or authority reference;
- parent permission and assent are merged or not explicitly linked;
- assent lacks affirmative agreement, dissent, documentation, or age-of-majority planning;
- a parent-count or waiver rule lacks a human determination reference;
- LAR authority, capacity assessment, participant involvement, objection handling, reassessment, or direct-consent transition is unresolved;
- accessible presentation lacks communication, comprehension, indication, copy, or witness planning;
- a translated artifact is not bound to a present source artifact and source version;
- source and target languages are the same;
- a translated artifact lacks translator provenance or named qualified human review;
- ordinary artifact review attempts to substitute for qualified language review;
- a short-form process lacks institutional approval, interpreter, witness, signatures, copies, full summary, or a rationale for using short form instead of a fully translated form;
- any compiled artifact is empty, source-stale, not human reviewed, or claims runtime support.

## User workflow

The consent workspace now has eight steps:

1. Authority
2. Study facts
3. Protocol modules
4. Specialized modules
5. Audience packages
6. Form
7. Participant preview
8. Review and export

Audience packages sit after study facts, protocol modules, and specialized biomedical/data-use modules because all of those decisions can affect their source material. They sit before final form review and participant preview so every audience and language artifact is part of the same source-bound package before export. A linked Phase 8 source change invalidates prior language review.

The screen exposes an institution profile, required-package ledger, six package cards, a selected-package inspector, source links, qualified-language review, runtime boundary acknowledgement, and issue-specific repair messages. Participant preview includes Phase 7 artifacts and prevents general review of a translation until its qualified human language review is recorded.

## Files

- `src/lib/research/consentPhase7Model.ts`
- `src/lib/research/consentPhase7.ts`
- `src/lib/research/consentPhase7.test.ts`
- `src/components/research-path/ConsentPhase7Workspace.tsx`
- `src/components/research-path/ConsentPhase7Workspace.module.css`
- integrations in `consentPhase5.ts`, `consentPhase6.ts`, `consentAuthority.ts`, and `ConsentWorkspace.tsx`
