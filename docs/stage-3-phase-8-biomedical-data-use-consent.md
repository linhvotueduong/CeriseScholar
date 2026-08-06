# Stage 3 Phase 8 — Biomedical, Clinical, Specimen, and Data-Use Consent

## Delivered scope

Phase 8 adds governed authoring, compilation, human review, participant preview,
versioning, and review-package export for eight specialized modules:

1. regulated intervention;
2. procedure and exposure;
3. results return;
4. specimens and genomics;
5. data sharing and future use;
6. dedicated broad consent;
7. institution-controlled privacy addenda; and
8. FDA electronic-consent process specification.

The module registry covers experimental drugs, biologics, devices, placebo or
sham procedures, randomization, imaging, radiation, sedation, reproductive
risks, research injury, participant costs, alternatives, return of results,
incidental findings, specimens, genetic testing, whole-genome or exome
sequencing, commercial-profit disclosures, repositories, future use,
re-identification risk, withdrawal limits, HIPAA/GDPR addenda, and external
electronic-record/signature controls.

## Claim, legal, and execution boundary

Phase 8 is an authoring and consistency system. It is not an IRB, legal,
clinical, pharmacy, radiation-safety, genetic-counseling, privacy-office, FDA,
HIPAA, GDPR, or 21 CFR Part 11 determination. It does not:

- infer regulatory status from medical or legal keywords;
- decide whether an intervention, privacy regime, broad-consent pathway, or NIH
  sharing policy applies;
- provide medical or genetic advice;
- store participant PHI, specimens, genomic data, or research results;
- redistribute uploaded HIPAA, GDPR, or institution-specific legal text; or
- execute identity, electronic signature, clinical monitoring, repository,
  privacy-rights, or regulated-record workflows.

Applicable modules require an explicit researcher or institution determination,
authority reference, profile scope, procedure mapping when relevant, and named
qualified specialist review. Compiled artifacts remain
`authoring-export-only`.

## Primary-source registry

The global registry supplies structural prompts and claim boundaries. Local
institutions remain authoritative for form language and applicability.

- [45 CFR 46.116](https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-A/part-46/subpart-A/section-46.116) provides the Common Rule consent and broad-consent elements.
- [21 CFR 50.25](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-50/subpart-B/section-50.25) provides FDA informed-consent elements.
- [FDA Informed Consent Guidance](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/informed-consent) informs foreseeable-risk, alternatives, additional-cost, and research-injury prompts.
- [FDA/OHRP Electronic Informed Consent Q&A](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/use-electronic-informed-consent-clinical-investigations-questions-and-answers) informs external identity, electronic-record, signature, copy, security, and fallback boundaries.
- [HHS HIPAA Research Guidance](https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/research/index.html) and the [HIPAA/Common Rule distinction](https://www.hhs.gov/hipaa/for-professionals/faq/313/does-the-hipaa-requirement-for-authorization-differ-from-the-common-rule/index.html) support separate institution-controlled authorization handling.
- [NIH Genomic Data Sharing Policy](https://grants.nih.gov/policy-and-compliance/policy-topics/sharing-policies/gds) and [NIH participant privacy principles](https://grants.nih.gov/policy-and-compliance/policy-topics/sharing-policies/dms/privacy/best-practices) inform genomic-sharing and privacy prompts.
- [EU Regulation 2016/679](https://eur-lex.europa.eu/eli/reg/2016/679/oj) informs the external GDPR notice/safeguard boundary; Cerise does not choose a legal basis.
- [HHS SACHRP broad-consent guidance](https://www.hhs.gov/ohrp/sachrp-committee/recommendations/attachment-c-august-2-2017/index.html) informs dedicated broad-consent and refusal/nonresponse tracking.
- [UCSF 2026 consent templates](https://irb.ucsf.edu/consent-and-assent-form-templates) remain an institution-specific current-template source and are never treated as universal text.

## Data and compiler architecture

`ConsentPhase5Document` schema version 4 contains a bounded
`ConsentPhase8State`. Drafts from schemas 1–3 migrate with an inert Phase 8
state; migration never enables a specialized module.

Every module records applicability, determination source, authority reference,
researcher rationale when applicable, procedure fact IDs or protocol reference,
participant-facing procedure summary, required specialist role, and governed
field values. External addenda store only filename, media type, byte length,
SHA-256 checksum, authority reference, import time, and `contentsStored: false`.

The deterministic compiler emits source-bound artifacts with:

- artifact kind and decision mode;
- participant-facing text;
- implemented-fact and protocol-procedure mappings;
- authority and external-addendum bindings;
- protected element IDs;
- ordinary and specialist human-review states;
- source identity; and
- locked `authoring-export-only` runtime mode.

Source identity includes the implemented-study checksum, authority version,
consent governance, specialized profile, module content, and relevant addendum
checksums. A source edit invalidates both specialist and ordinary review.

Phase 8 compiles before Phase 7. Therefore a Phase 8 edit also changes the
source identity of any translation or short-form package linked to that
specialized artifact and forces renewed language/artifact review.

## Safety and consistency gates

Review-package export is blocked when:

- a required module is not configured as applicable;
- a regulatory profile scope remains undetermined;
- a module lacks explicit authority, procedure mapping, or required fields;
- a governed choice contains a value outside the registry;
- alternatives, research-injury, cost, sequencing, commercial-profit, or broad-consent disclosures are missing;
- a specimen return plan is not explicitly “no individual results” or linked to the results-return module;
- specialized sharing contradicts the main future-use contract;
- broad consent is represented as an ordinary optional choice or lacks durable refusal/nonresponse tracking;
- applicable HIPAA/GDPR profiles lack checksum-bound institution-controlled addenda;
- FDA electronic consent lacks an external-system/process specification;
- content attributes regulatory approval, certification, or compliance to Cerise;
- specialist review, ordinary review, source alignment, or the authoring-only boundary is unresolved.

## User workflow

The consent workspace now has eight ordered steps:

1. Authority
2. Study facts
3. Protocol modules
4. Specialized modules
5. Audience packages
6. Form
7. Participant preview
8. Review and export

Specialized modules precede audience packages so translations and short forms
bind to the complete biomedical/data-use source. The Phase 8 screen includes a
study regulatory profile, eight-module catalog, explicit procedure mapping,
governed module fields, metadata-only addendum import, dual review controls,
source links, issue repair guidance, and two explicit runtime/data boundaries.

## Persistence and files

The existing project-owned `consent_protocols` row remains protected by its
authenticated row-level policies. Migration
`20260801023000_phase8_consent_protocol_capacity.sql` aligns its database limit
with the application's existing 1 MiB canonical JSON ceiling. It does not add
participant data or file-content storage.

Primary implementation files:

- `src/lib/research/consentPhase8Model.ts`
- `src/lib/research/consentPhase8.ts`
- `src/lib/research/consentPhase8.test.ts`
- `src/components/research-path/ConsentPhase8Workspace.tsx`
- `src/components/research-path/ConsentPhase8Workspace.module.css`
- integrations in `consentPhase5.ts`, `consentPhase6.ts`, `consentPhase7.ts`,
  `ConsentWorkspace.tsx`, and `ConsentPhase7Workspace.tsx`
