import type { ConsentPhase5Document } from "./consentPhase5";
import { compileConsentPhase7Artifacts } from "./consentPhase7";
import {
  createConsentPhase8State,
  normalizeConsentPhase8State,
  type ConsentPhase8Artifact,
  type ConsentPhase8ArtifactKind,
  type ConsentPhase8ExternalAddendum,
  type ConsentPhase8FieldId,
  type ConsentPhase8ModuleId,
  type ConsentPhase8ModuleState,
  type ConsentPhase8State,
} from "./consentPhase8Model";

export interface ConsentPhase8Issue {
  id: string;
  severity: "blocking" | "warning" | "advisory";
  repairTarget: "specialized-module" | "specialized-artifact" | "governance";
  specializedModuleId?: ConsentPhase8ModuleId;
  artifactId?: string;
  message: string;
}

export interface ConsentPhase8FieldDefinition {
  id: ConsentPhase8FieldId;
  label: string;
  required: boolean;
  rows?: number;
  options?: ReadonlyArray<{ value: string; label: string }>;
}

export interface ConsentPhase8ModuleDefinition {
  id: ConsentPhase8ModuleId;
  label: string;
  detail: string;
  authorityNote: string;
  artifactKind: ConsentPhase8ArtifactKind;
  artifactTitle: string;
  decisionMode: ConsentPhase8Artifact["decisionMode"];
  procedureMappingRequired: boolean;
  protectedFieldIds: ConsentPhase8FieldId[];
  fields: ConsentPhase8FieldDefinition[];
  sourceUrls: ReadonlyArray<{ label: string; url: string }>;
}

const select = (
  id: ConsentPhase8FieldId,
  label: string,
  options: ReadonlyArray<{ value: string; label: string }>,
  required = true,
): ConsentPhase8FieldDefinition => ({ id, label, options, required });
const area = (
  id: ConsentPhase8FieldId,
  label: string,
  rows = 3,
  required = true,
): ConsentPhase8FieldDefinition => ({ id, label, rows, required });

const NOT_DETERMINED = {
  value: "not-determined",
  label: "Not determined",
} as const;
const YES_NO = [
  NOT_DETERMINED,
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
] as const;

export const CONSENT_PHASE_8_MODULES: readonly ConsentPhase8ModuleDefinition[] =
  [
    {
      id: "regulated-intervention",
      label: "Regulated intervention",
      detail:
        "Experimental drug, biologic, device, placebo or sham, assignment, alternatives, injury, and participant costs.",
      authorityNote:
        "Only the sponsor, investigator, institution, IRB, and applicable regulator can determine regulatory status and acceptable clinical risk language.",
      artifactKind: "regulated-intervention-information",
      artifactTitle: "Regulated intervention information",
      decisionMode: "information-only",
      procedureMappingRequired: true,
      protectedFieldIds: [
        "alternatives",
        "research_injury",
        "participant_costs",
      ],
      fields: [
        select("intervention_category", "Intervention category", [
          NOT_DETERMINED,
          { value: "drug", label: "Drug" },
          { value: "biologic", label: "Biologic" },
          { value: "device", label: "Device" },
          { value: "combination", label: "Combination product" },
          { value: "other", label: "Other human-determined category" },
        ]),
        select("investigational_status", "Investigational status", [
          NOT_DETERMINED,
          { value: "investigational", label: "Investigational" },
          { value: "approved-off-label", label: "Approved, off-label use" },
          { value: "approved-as-labeled", label: "Approved, as labeled" },
          { value: "other", label: "Other human determination" },
        ]),
        area(
          "intervention_description",
          "What is experimental and what the intervention involves",
          4,
        ),
        area(
          "randomization_and_control",
          "Randomization, control groups, and assignment chance",
          3,
        ),
        area(
          "placebo_or_sham",
          "Placebo or sham procedure and standard-care boundary",
          3,
        ),
        area(
          "foreseeable_risks",
          "Reasonably foreseeable risks and discomforts",
          5,
        ),
        area(
          "alternatives",
          "Appropriate alternatives or courses of treatment",
          4,
        ),
        area(
          "research_injury",
          "Research-related injury, treatment, compensation, and contacts",
          4,
        ),
        area(
          "participant_costs",
          "Additional participant costs, insurance, and billing boundaries",
          4,
        ),
        area(
          "clinical_oversight",
          "Clinical monitoring, escalation, and stopping oversight",
          3,
        ),
        area(
          "participant_text",
          "Additional participant-facing explanation",
          6,
        ),
      ],
      sourceUrls: [
        {
          label: "FDA informed consent guidance",
          url: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/informed-consent",
        },
        {
          label: "21 CFR 50.25",
          url: "https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-50/subpart-B/section-50.25",
        },
      ],
    },
    {
      id: "procedure-exposure",
      label: "Procedure & exposure",
      detail:
        "Imaging, radiation, sedation, reproductive risks, monitoring, stopping, and emergency plans.",
      authorityNote:
        "Clinical, radiation-safety, pharmacy, and institutional reviewers—not Cerise—determine the applicable precautions and risk wording.",
      artifactKind: "procedure-exposure-information",
      artifactTitle: "Procedure and exposure information",
      decisionMode: "information-only",
      procedureMappingRequired: true,
      protectedFieldIds: [],
      fields: [
        area("procedures", "Clinical or research procedures", 4),
        area("imaging", "Imaging procedures and contrast agents", 3),
        area(
          "radiation",
          "Ionizing-radiation exposure and review reference",
          3,
        ),
        area(
          "sedation",
          "Sedation, anesthesia, fasting, transport, and recovery",
          3,
        ),
        area(
          "reproductive_risks",
          "Reproductive, pregnancy, fertility, embryo, or fetal risks",
          4,
        ),
        area(
          "pregnancy_testing_and_prevention",
          "Pregnancy testing and prevention requirements",
          3,
        ),
        area(
          "risk_monitoring",
          "Safety monitoring and clinically significant findings",
          3,
        ),
        area(
          "stopping_and_emergency_plan",
          "Stopping, emergency care, and escalation plan",
          3,
        ),
        area(
          "participant_text",
          "Participant-facing procedure and exposure text",
          6,
        ),
      ],
      sourceUrls: [
        {
          label: "FDA informed consent guidance",
          url: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/informed-consent",
        },
      ],
    },
    {
      id: "results-return",
      label: "Results return",
      detail:
        "Individual, clinically relevant, incidental, secondary, or aggregate results and confirmation boundaries.",
      authorityNote:
        "A qualified study team and institution determine which results are analytically valid, clinically relevant, actionable, and returnable.",
      artifactKind: "results-return-plan",
      artifactTitle: "Research results return plan",
      decisionMode: "information-only",
      procedureMappingRequired: false,
      protectedFieldIds: [],
      fields: [
        area("result_types", "Potential result types", 3),
        select("return_plan", "Individual-results return plan", [
          NOT_DETERMINED,
          { value: "no-individual-results", label: "No individual results" },
          {
            value: "clinically-relevant-only",
            label: "Clinically relevant results only",
          },
          {
            value: "validated-results",
            label: "Validated results under the approved plan",
          },
          { value: "other", label: "Other human-determined plan" },
        ]),
        area(
          "validation_and_confirmation",
          "Research-lab validation and clinical confirmation",
          3,
        ),
        area(
          "clinical_actionability_boundary",
          "Clinical actionability and medical-care boundary",
          3,
        ),
        select(
          "participant_choice",
          "Participant choice about receiving results",
          [
            NOT_DETERMINED,
            { value: "choice-offered", label: "Choice offered" },
            {
              value: "not-offered",
              label: "Not offered by human determination",
            },
            {
              value: "required-disclosure",
              label: "Required disclosure under approved plan",
            },
          ],
        ),
        area(
          "incidental_or_secondary_findings",
          "Incidental and secondary findings",
          3,
        ),
        area(
          "genetic_counseling",
          "Genetic counseling or qualified explanation",
          3,
        ),
        area(
          "recontact_and_identity_plan",
          "Recontact, identity verification, and result custody",
          3,
        ),
        area("participant_text", "Participant-facing results text", 6),
      ],
      sourceUrls: [
        {
          label: "45 CFR 46.116",
          url: "https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-A/part-46/subpart-A/section-46.116",
        },
      ],
    },
    {
      id: "specimens-genomics",
      label: "Specimens & genomics",
      detail:
        "Collection, coding, genetic testing, sequencing, commercial profit, storage, retention, and withdrawal limits.",
      authorityNote:
        "Genomic and specimen decisions must reflect the actual protocol, repository, institutional certification, and participant-facing return plan.",
      artifactKind: "specimen-genomic-information",
      artifactTitle: "Specimen and genomic information",
      decisionMode: "information-only",
      procedureMappingRequired: true,
      protectedFieldIds: [
        "commercial_profit_use",
        "participant_profit_share",
        "whole_genome_or_exome",
      ],
      fields: [
        area("specimen_types", "Specimen types and amount or frequency", 3),
        area(
          "collection_procedure",
          "Collection, leftover specimen, and clinical-care boundary",
          3,
        ),
        select("identifiability_and_coding", "Identifiability and coding", [
          NOT_DETERMINED,
          { value: "identifiable", label: "Identifiable" },
          { value: "coded", label: "Coded / key retained" },
          {
            value: "deidentified",
            label: "De-identified under the approved plan",
          },
        ]),
        area("coding_key_custodian", "Coding-key custodian and access", 2),
        area("genetic_testing", "Genetic analyses and scope", 3),
        select(
          "whole_genome_or_exome",
          "Whole-genome or exome sequencing",
          YES_NO,
        ),
        select("commercial_profit_use", "Commercial-profit possibility", [
          NOT_DETERMINED,
          { value: "may-include", label: "May include commercial profit" },
          {
            value: "will-not-include",
            label: "Will not include commercial profit",
          },
        ]),
        select(
          "participant_profit_share",
          "Participant share of commercial profit",
          [
            NOT_DETERMINED,
            { value: "none", label: "No share planned" },
            { value: "possible", label: "Possible under recorded arrangement" },
          ],
        ),
        area(
          "intellectual_property",
          "Intellectual-property or patent boundary",
          2,
        ),
        area("storage_location", "Repository or storage location", 2),
        area("retention_period", "Retention period", 2),
        area(
          "withdrawal_limits",
          "Withdrawal, destruction, distribution, and de-identification limits",
          4,
        ),
        select(
          "results_return_link",
          "Linked results-return plan or no-results determination",
          [
            NOT_DETERMINED,
            {
              value: "no-individual-results",
              label: "No individual results — human determination",
            },
            {
              value: "phase8-results-return",
              label: "Linked Phase 8 results-return plan",
            },
          ],
        ),
        area(
          "participant_text",
          "Participant-facing specimen and genomic text",
          6,
        ),
      ],
      sourceUrls: [
        {
          label: "NIH Genomic Data Sharing Policy",
          url: "https://grants.nih.gov/policy-and-compliance/policy-topics/sharing-policies/gds",
        },
        {
          label: "NIH participant privacy principles",
          url: "https://grants.nih.gov/policy-and-compliance/policy-topics/sharing-policies/dms/privacy/best-practices",
        },
      ],
    },
    {
      id: "data-sharing-future-use",
      label: "Data sharing & future use",
      detail:
        "Repositories, access model, secondary-use scope, limitations, re-identification risk, withdrawal, and choice.",
      authorityNote:
        "Sharing must stay within the protocol, consent, repository terms, institutional certification, and applicable privacy law.",
      artifactKind: "data-sharing-future-use-choice",
      artifactTitle: "Data sharing and future-use choice",
      decisionMode: "separate-optional-choice",
      procedureMappingRequired: true,
      protectedFieldIds: [],
      fields: [
        area(
          "data_categories",
          "Data categories and associated information",
          3,
        ),
        select("sharing_mode", "Sharing mode", [
          NOT_DETERMINED,
          { value: "no-sharing", label: "No external sharing" },
          { value: "controlled-access", label: "Controlled access" },
          { value: "open-access", label: "Open / unrestricted access" },
          { value: "tiered", label: "Tiered access" },
        ]),
        area(
          "repositories_and_recipients",
          "Repositories and recipient types",
          3,
        ),
        area(
          "data_use_limitations",
          "Data-use limitations and prohibited uses",
          3,
        ),
        area("future_use_scope", "Future research scope", 3),
        area(
          "identifiability_and_reidentification_risk",
          "Identifiability and re-identification risk",
          3,
        ),
        area(
          "withdrawal_limits",
          "Withdrawal and downstream-distribution limits",
          3,
        ),
        area(
          "downstream_governance",
          "Repository review, agreements, and downstream governance",
          3,
        ),
        select("choice_mode", "Relationship to main-study participation", [
          NOT_DETERMINED,
          {
            value: "separate-optional-choice",
            label: "Separate optional choice",
          },
          {
            value: "required-by-human-determination",
            label: "Required by human determination",
          },
        ]),
        area(
          "participant_text",
          "Participant-facing data-sharing and future-use text",
          6,
        ),
      ],
      sourceUrls: [
        {
          label: "NIH participant privacy principles",
          url: "https://grants.nih.gov/policy-and-compliance/policy-topics/sharing-policies/dms/privacy/best-practices",
        },
      ],
    },
    {
      id: "broad-consent",
      label: "Broad consent",
      detail:
        "A dedicated identifiable-data or biospecimen secondary-research form and long-lived decision-tracking contract.",
      authorityNote:
        "Broad consent is a specific Common Rule pathway. It is not a generic future-use checkbox, and express refusals require durable institutional tracking.",
      artifactKind: "broad-consent-form",
      artifactTitle: "Dedicated broad-consent form",
      decisionMode: "dedicated-broad-consent",
      procedureMappingRequired: false,
      protectedFieldIds: [
        "commercial_profit_disclosure",
        "whole_genome_disclosure",
        "results_disclosure",
        "refusal_and_nonresponse_tracking",
      ],
      fields: [
        area(
          "research_types",
          "Types of secondary research a reasonable person would expect",
          4,
        ),
        area(
          "data_and_specimens",
          "Identifiable information and biospecimens covered",
          3,
        ),
        area(
          "sharing_parties",
          "Whether sharing may occur and researcher or institution types",
          3,
        ),
        area("storage_duration", "Storage and maintenance duration", 2),
        area("research_use_duration", "Research-use duration", 2),
        area(
          "specific_study_details",
          "Whether details of specific future studies will be provided",
          3,
        ),
        area("commercial_profit_disclosure", "Commercial-profit disclosure", 3),
        area(
          "whole_genome_disclosure",
          "Whole-genome sequencing disclosure",
          3,
        ),
        area(
          "results_disclosure",
          "Clinically relevant and individual-results disclosure",
          3,
        ),
        area("contacts", "Rights, storage/use, and research-harm contacts", 3),
        area(
          "refusal_and_nonresponse_tracking",
          "Express agreement, express refusal, nonresponse, and scope-tracking plan",
          4,
        ),
        area(
          "withdrawal_limits",
          "Withdrawal and already-begun research boundary",
          3,
        ),
        area("participant_text", "Dedicated broad-consent participant text", 7),
      ],
      sourceUrls: [
        {
          label: "45 CFR 46.116 broad-consent elements",
          url: "https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-A/part-46/subpart-A/section-46.116",
        },
        {
          label: "HHS SACHRP broad-consent guidance",
          url: "https://www.hhs.gov/ohrp/sachrp-committee/recommendations/attachment-c-august-2-2017/index.html",
        },
      ],
    },
    {
      id: "privacy-addenda",
      label: "Privacy addenda",
      detail:
        "Institution-controlled HIPAA authorization, GDPR notice, and other privacy materials bound by metadata and checksum.",
      authorityNote:
        "Cerise does not decide HIPAA/GDPR applicability or generate universal legal text. The covered entity, controller, privacy office, or counsel supplies and reviews it.",
      artifactKind: "privacy-addendum-binding",
      artifactTitle: "Institution-controlled privacy addenda",
      decisionMode: "external-addendum",
      procedureMappingRequired: false,
      protectedFieldIds: [],
      fields: [
        area(
          "hipaa_authorization_reference",
          "HIPAA authorization or waiver reference",
          2,
          false,
        ),
        area(
          "gdpr_notice_reference",
          "GDPR notice or addendum reference",
          2,
          false,
        ),
        area(
          "controller_or_covered_entity",
          "Controller, covered entity, or responsible institution",
          2,
        ),
        area("privacy_contact", "Privacy office, DPO, or rights contact", 2),
        area(
          "legal_basis_authority",
          "Institution-recorded legal-basis or authorization authority",
          3,
          false,
        ),
        area(
          "international_transfer_safeguards",
          "International-transfer determination and safeguards",
          3,
          false,
        ),
        area(
          "privacy_office_review_reference",
          "Privacy-office or counsel review reference",
          2,
        ),
        area("integration_notes", "Integration and document-order notes", 3),
      ],
      sourceUrls: [
        {
          label: "HHS HIPAA research guidance",
          url: "https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/research/index.html",
        },
        {
          label: "EU Regulation 2016/679",
          url: "https://eur-lex.europa.eu/eli/reg/2016/679/oj",
        },
      ],
    },
    {
      id: "fda-electronic-process",
      label: "FDA electronic process",
      detail:
        "External eConsent identity, electronic-signature, record, audit-trail, validation, copy, and fallback boundaries.",
      authorityNote:
        "A Cerise acknowledgement is not identity proof or a 21 CFR Part 11 electronic signature. Execution remains in an externally validated system.",
      artifactKind: "fda-electronic-process-specification",
      artifactTitle: "FDA electronic consent process specification",
      decisionMode: "external-process-specification",
      procedureMappingRequired: false,
      protectedFieldIds: [],
      fields: [
        area(
          "external_system",
          "External eConsent or electronic-signature system",
          2,
        ),
        select(
          "integration_status",
          "Institution-validated integration status",
          [
            NOT_DETERMINED,
            { value: "planned", label: "Planned" },
            {
              value: "validated-by-institution",
              label: "Validated by institution",
            },
          ],
        ),
        area(
          "validation_package_reference",
          "Computer-system validation package reference",
          2,
        ),
        area(
          "part_11_assessment_reference",
          "21 CFR Part 11 assessment reference",
          2,
        ),
        area(
          "identity_verification",
          "Signer identity verification and credential issuance",
          3,
        ),
        area(
          "signature_method",
          "Electronic-signature method and signature manifestations",
          3,
        ),
        area(
          "electronic_record_controls",
          "Record access, security, retention, and human-readable copies",
          3,
        ),
        area(
          "audit_trail",
          "Audit trail, linkage, timestamps, and change control",
          3,
        ),
        area("copy_delivery", "Signed-copy delivery and continuing access", 3),
        area(
          "outage_and_paper_fallback",
          "Outage, accessibility, and paper fallback",
          3,
        ),
        area(
          "participant_text",
          "Participant-facing electronic-process explanation",
          5,
        ),
      ],
      sourceUrls: [
        {
          label: "FDA/OHRP electronic informed consent Q&A",
          url: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/use-electronic-informed-consent-clinical-investigations-questions-and-answers",
        },
      ],
    },
  ] as const;

export function getConsentPhase8Module(
  state: ConsentPhase8State,
  moduleId: ConsentPhase8ModuleId,
): ConsentPhase8ModuleState {
  return state.modules[moduleId];
}

export function collectConsentPhase8Suggestions(
  document: ConsentPhase5Document,
): ConsentPhase8ModuleId[] {
  const suggestions = new Set(document.phase8.profile.requiredModules);
  if (
    document.phase8.profile.fdaRegulatedStatus ===
      "applicable-by-human-determination" &&
    ["signed-electronic", "electronic-acknowledgement"].includes(
      document.governance.documentationMethod,
    )
  )
    suggestions.add("fda-electronic-process");
  if (
    document.phase8.profile.hipaaStatus ===
      "applicable-by-human-determination" ||
    document.phase8.profile.gdprStatus === "applicable-by-human-determination"
  )
    suggestions.add("privacy-addenda");
  if (
    document.phase8.profile.nihGenomicDataSharingStatus ===
    "applicable-by-human-determination"
  ) {
    suggestions.add("specimens-genomics");
    suggestions.add("data-sharing-future-use");
  }
  for (const definition of CONSENT_PHASE_8_MODULES) {
    const moduleState = document.phase8.modules[definition.id];
    if (
      moduleState.sourceFactIds.length > 0 ||
      moduleState.protocolProcedureReference.trim()
    )
      suggestions.add(definition.id);
  }
  return [...suggestions];
}

function fnv1a64(value: string): string {
  let high = 0xcbf29ce4;
  let low = 0x84222325;
  for (let index = 0; index < value.length; index += 1) {
    low ^= value.charCodeAt(index);
    const nextLow = Math.imul(low, 0x1b3);
    const carry = (((low >>> 0) * 0x1b3) / 0x100000000) >>> 0;
    high = (Math.imul(high, 0x1b3) + Math.imul(low, 0x100) + carry) >>> 0;
    low = nextLow >>> 0;
  }
  return high.toString(16).padStart(8, "0") + low.toString(16).padStart(8, "0");
}

function sourceIdentity(
  document: ConsentPhase5Document,
  moduleId: ConsentPhase8ModuleId,
  state: ConsentPhase8State,
): string {
  const moduleState = state.modules[moduleId];
  const externalAddenda =
    moduleId === "privacy-addenda" ? state.externalAddenda : [];
  return `fnv1a64:${fnv1a64(JSON.stringify({ source: document.sourceFingerprint.checksum, authority: [document.authorityManifest.id, document.authorityManifest.profileVersion, document.authorityAttachment?.checksum ?? null], governance: document.governance, profile: state.profile, module: moduleState, externalAddenda }))}`;
}

function artifactText(
  definition: ConsentPhase8ModuleDefinition,
  state: ConsentPhase8State,
): string {
  const moduleState = state.modules[definition.id];
  if (definition.id === "privacy-addenda") {
    const bindings = state.externalAddenda
      .map((addendum) => `${addendum.title} — ${addendum.checksum}`)
      .join("\n");
    return [
      "External institution-controlled privacy materials are bound to this review package by metadata and checksum. Cerise did not generate or store their legal text.",
      bindings,
      moduleState.values.integration_notes,
    ]
      .filter(Boolean)
      .join("\n\n");
  }
  const fieldText = definition.fields
    .map((field) => {
      const value = moduleState.values[field.id];
      return value ? `${field.label}\n${value}` : "";
    })
    .filter(Boolean);
  return [moduleState.participantProcedureDescription, ...fieldText]
    .filter(Boolean)
    .join("\n\n");
}

function mergeArtifact(
  current: ReadonlyMap<string, ConsentPhase8Artifact>,
  draft: Omit<ConsentPhase8Artifact, "reviewState" | "specialistReview">,
): ConsentPhase8Artifact {
  const existing = current.get(draft.id);
  const changed = !existing || existing.sourceIdentity !== draft.sourceIdentity;
  return {
    ...draft,
    reviewState: changed ? "human-review-required" : existing.reviewState,
    specialistReview: changed
      ? {
          state: "human-review-required",
          reviewerName: existing?.specialistReview.reviewerName ?? "",
          reviewerRoleOrCredentials:
            existing?.specialistReview.reviewerRoleOrCredentials ?? "",
          reviewReference: existing?.specialistReview.reviewReference ?? "",
          sourceIdentity: null,
        }
      : existing.specialistReview,
  };
}

export function compileConsentPhase8Artifacts(
  document: ConsentPhase5Document,
  state = document.phase8,
): ConsentPhase8Artifact[] {
  const current = new Map(
    state.artifacts.map((artifact) => [artifact.id, artifact]),
  );
  return CONSENT_PHASE_8_MODULES.flatMap((definition) => {
    const moduleState = state.modules[definition.id];
    if (moduleState.applicability !== "applicable") return [];
    const identity = sourceIdentity(document, definition.id, state);
    const draft: Omit<
      ConsentPhase8Artifact,
      "reviewState" | "specialistReview"
    > = {
      id: `phase8-${definition.id}`,
      kind: definition.artifactKind,
      moduleId: definition.id,
      title: definition.artifactTitle,
      decisionMode:
        definition.id === "data-sharing-future-use" &&
        moduleState.values.choice_mode === "required-by-human-determination"
          ? "information-only"
          : definition.decisionMode,
      participantText: artifactText(definition, state),
      sourceFactIds: moduleState.sourceFactIds,
      protocolProcedureReference: moduleState.protocolProcedureReference,
      authorityReference: moduleState.authorityReference,
      protectedElements: definition.protectedFieldIds,
      externalAddendumIds:
        definition.id === "privacy-addenda"
          ? state.externalAddenda.map((item) => item.id)
          : [],
      sourceIdentity: identity,
      runtimeMode: "authoring-export-only",
    };
    return [mergeArtifact(current, draft)];
  });
}

export function compileConsentPhase8AndDependencies(
  document: ConsentPhase5Document,
): ConsentPhase5Document {
  const withPhase8 = {
    ...document,
    phase8: {
      ...document.phase8,
      artifacts: compileConsentPhase8Artifacts(document),
    },
  };
  return {
    ...withPhase8,
    phase7: {
      ...withPhase8.phase7,
      artifacts: compileConsentPhase7Artifacts(withPhase8),
    },
  };
}

export function updateConsentPhase8State(
  document: ConsentPhase5Document,
  updater: (state: ConsentPhase8State) => ConsentPhase8State,
  updatedAt = new Date().toISOString(),
): ConsentPhase5Document {
  const candidate = updater(structuredClone(document.phase8));
  const normalized = normalizeConsentPhase8State(candidate);
  if (!normalized)
    throw new Error("The Phase 8 specialized-consent update is invalid.");
  return compileConsentPhase8AndDependencies({
    ...document,
    phase8: normalized,
    versions: [],
    exports: [],
    updatedAt,
  });
}

export function reviewConsentPhase8Artifact(
  document: ConsentPhase5Document,
  artifactId: string,
  reviewState: ConsentPhase8Artifact["reviewState"],
  updatedAt = new Date().toISOString(),
): ConsentPhase5Document {
  return updateConsentPhase8State(
    document,
    (state) => ({
      ...state,
      artifacts: state.artifacts.map((artifact) => {
        if (artifact.id !== artifactId) return artifact;
        const safeState =
          reviewState === "human-reviewed" &&
          artifact.specialistReview.state !== "human-reviewed"
            ? "human-review-required"
            : reviewState;
        return { ...artifact, reviewState: safeState };
      }),
    }),
    updatedAt,
  );
}

export function updateConsentPhase8SpecialistReviewDraft(
  document: ConsentPhase5Document,
  artifactId: string,
  patch: Partial<
    Pick<
      ConsentPhase8Artifact["specialistReview"],
      "reviewerName" | "reviewerRoleOrCredentials" | "reviewReference"
    >
  >,
  updatedAt = new Date().toISOString(),
): ConsentPhase5Document {
  return updateConsentPhase8State(
    document,
    (state) => ({
      ...state,
      artifacts: state.artifacts.map((item) =>
        item.id === artifactId
          ? {
              ...item,
              reviewState: "human-review-required",
              specialistReview: {
                ...item.specialistReview,
                ...patch,
                state: "human-review-required",
                sourceIdentity: null,
              },
            }
          : item,
      ),
    }),
    updatedAt,
  );
}

export function recordConsentPhase8SpecialistReview(
  document: ConsentPhase5Document,
  artifactId: string,
  reviewerName: string,
  reviewerRoleOrCredentials: string,
  reviewReference: string,
  updatedAt = new Date().toISOString(),
): ConsentPhase5Document {
  const artifact = document.phase8.artifacts.find(
    (item) => item.id === artifactId,
  );
  if (!artifact) return document;
  const complete = Boolean(
    reviewerName.trim() &&
    reviewerRoleOrCredentials.trim() &&
    reviewReference.trim(),
  );
  return updateConsentPhase8State(
    document,
    (state) => ({
      ...state,
      artifacts: state.artifacts.map((item) =>
        item.id === artifactId
          ? {
              ...item,
              specialistReview: {
                state: complete ? "human-reviewed" : "human-review-required",
                reviewerName,
                reviewerRoleOrCredentials,
                reviewReference,
                sourceIdentity: complete ? item.sourceIdentity : null,
              },
            }
          : item,
      ),
    }),
    updatedAt,
  );
}

export function upsertConsentPhase8ExternalAddendum(
  document: ConsentPhase5Document,
  addendum: ConsentPhase8ExternalAddendum,
  updatedAt = new Date().toISOString(),
): ConsentPhase5Document {
  return updateConsentPhase8State(
    document,
    (state) => ({
      ...state,
      externalAddenda: [
        ...state.externalAddenda.filter((item) => item.id !== addendum.id),
        addendum,
      ],
    }),
    updatedAt,
  );
}

export function removeConsentPhase8ExternalAddendum(
  document: ConsentPhase5Document,
  addendumId: string,
  updatedAt = new Date().toISOString(),
): ConsentPhase5Document {
  return updateConsentPhase8State(
    document,
    (state) => ({
      ...state,
      externalAddenda: state.externalAddenda.filter(
        (item) => item.id !== addendumId,
      ),
    }),
    updatedAt,
  );
}

function missing(
  issues: ConsentPhase8Issue[],
  moduleId: ConsentPhase8ModuleId,
  key: string,
  value: string,
  message: string,
): void {
  if (!value.trim() || value === "not-determined")
    issues.push({
      id: `phase8-${moduleId}-${key}`,
      severity: "blocking",
      repairTarget: "specialized-module",
      specializedModuleId: moduleId,
      message,
    });
}

export function collectConsentPhase8Issues(
  document: ConsentPhase5Document,
): ConsentPhase8Issue[] {
  const state = document.phase8;
  const issues: ConsentPhase8Issue[] = [];
  const applicable = CONSENT_PHASE_8_MODULES.filter(
    (definition) => state.modules[definition.id].applicability === "applicable",
  );
  if (applicable.length > 0) {
    if (state.profile.determinationSource === "none")
      issues.push({
        id: "phase8-profile-source",
        severity: "blocking",
        repairTarget: "governance",
        message:
          "Record who determined the biomedical and data-use regulatory profile.",
      });
    if (!state.profile.institutionProfileReference.trim())
      issues.push({
        id: "phase8-profile-reference",
        severity: "blocking",
        repairTarget: "governance",
        message:
          "Add the institution profile, protocol, or regulatory-scope determination reference.",
      });
    if (!state.profile.jurisdiction.trim())
      issues.push({
        id: "phase8-profile-jurisdiction",
        severity: "blocking",
        repairTarget: "governance",
        message:
          "Record the jurisdiction used for the specialized consent profile.",
      });
    if (!state.profile.specialistEscalationContacts.trim())
      issues.push({
        id: "phase8-profile-contacts",
        severity: "blocking",
        repairTarget: "governance",
        message:
          "Record clinical, privacy, IRB, or regulatory escalation contacts.",
      });
    if (!state.profile.runtimeBoundaryAcknowledged)
      issues.push({
        id: "phase8-runtime-boundary",
        severity: "blocking",
        repairTarget: "governance",
        message:
          "Acknowledge that Phase 8 supports authoring and export only, not regulated identity, signature, clinical, privacy, or repository execution.",
      });
    if (!state.profile.noParticipantDataAcknowledged)
      issues.push({
        id: "phase8-no-participant-data-boundary",
        severity: "blocking",
        repairTarget: "governance",
        message:
          "Acknowledge that this workspace stores protocol metadata and consent text only—not participant PHI, specimens, genomic data, or research results.",
      });
    for (const [key, label] of [
      ["hhsCommonRuleStatus", "HHS Common Rule"],
      ["fdaRegulatedStatus", "FDA-regulated investigation"],
      ["hipaaStatus", "HIPAA"],
      ["gdprStatus", "GDPR"],
      ["nihGenomicDataSharingStatus", "NIH genomic data sharing"],
    ] as const) {
      if (state.profile[key] === "not-determined")
        issues.push({
          id: `phase8-profile-${key}`,
          severity: "blocking",
          repairTarget: "governance",
          message: `Record the human determination for ${label} scope.`,
        });
    }
  }

  for (const moduleId of collectConsentPhase8Suggestions(document)) {
    if (state.modules[moduleId].applicability === "not-configured")
      issues.push({
        id: `phase8-${moduleId}-suggested-not-resolved`,
        severity: "warning",
        repairTarget: "specialized-module",
        specializedModuleId: moduleId,
        message: `${CONSENT_PHASE_8_MODULES.find((item) => item.id === moduleId)?.label} is suggested by an explicit regulatory profile or procedure mapping. Record whether it applies.`,
      });
  }
  for (const moduleId of state.profile.requiredModules) {
    if (state.modules[moduleId].applicability !== "applicable")
      issues.push({
        id: `phase8-required-${moduleId}`,
        severity: "blocking",
        repairTarget: "specialized-module",
        specializedModuleId: moduleId,
        message: `${CONSENT_PHASE_8_MODULES.find((item) => item.id === moduleId)?.label} is institution-declared as required but is not configured as applicable.`,
      });
  }
  if (
    state.profile.fdaRegulatedStatus === "applicable-by-human-determination" &&
    ["signed-electronic", "electronic-acknowledgement"].includes(
      document.governance.documentationMethod,
    ) &&
    state.modules["fda-electronic-process"].applicability !== "applicable"
  )
    issues.push({
      id: "phase8-fda-electronic-process-required",
      severity: "blocking",
      repairTarget: "specialized-module",
      specializedModuleId: "fda-electronic-process",
      message:
        "An FDA-regulated study using electronic consent requires an explicit external electronic-consent/process boundary.",
    });
  if (
    state.profile.fdaRegulatedStatus === "applicable-by-human-determination" &&
    document.governance.pathway !== "fda-regulated"
  )
    issues.push({
      id: "phase8-fda-governance-conflict",
      severity: "blocking",
      repairTarget: "governance",
      message:
        "The specialized profile records FDA regulation, but the main consent governance pathway is not FDA-regulated.",
    });

  const knownFactIds = new Set(document.studyFacts.map((fact) => fact.id));
  for (const definition of CONSENT_PHASE_8_MODULES) {
    const moduleState = state.modules[definition.id];
    if (moduleState.applicability !== "applicable") continue;
    if (moduleState.determinationSource === "none")
      issues.push({
        id: `phase8-${definition.id}-source`,
        severity: "blocking",
        repairTarget: "specialized-module",
        specializedModuleId: definition.id,
        message: `Record who determined that ${definition.label.toLowerCase()} applies.`,
      });
    missing(
      issues,
      definition.id,
      "authority",
      moduleState.authorityReference,
      `Add the protocol, institution, sponsor, IRB, or other human-authority reference for ${definition.label.toLowerCase()}.`,
    );
    if (moduleState.determinationSource === "researcher")
      missing(
        issues,
        definition.id,
        "rationale",
        moduleState.researcherRationale,
        `Record the researcher rationale for applying ${definition.label.toLowerCase()}.`,
      );
    missing(
      issues,
      definition.id,
      "specialist-role",
      moduleState.specialistReviewRole,
      `Record the qualified human role that must review ${definition.label.toLowerCase()}.`,
    );
    if (definition.procedureMappingRequired) {
      if (
        moduleState.sourceFactIds.length === 0 &&
        !moduleState.protocolProcedureReference.trim()
      )
        issues.push({
          id: `phase8-${definition.id}-procedure-source`,
          severity: "blocking",
          repairTarget: "specialized-module",
          specializedModuleId: definition.id,
          message: `Map ${definition.label.toLowerCase()} to an implemented study fact or an external protocol procedure reference.`,
        });
      missing(
        issues,
        definition.id,
        "participant-procedure",
        moduleState.participantProcedureDescription,
        `Describe the mapped procedure in participant-facing language for ${definition.label.toLowerCase()}.`,
      );
    }
    for (const factId of moduleState.sourceFactIds)
      if (!knownFactIds.has(factId))
        issues.push({
          id: `phase8-${definition.id}-unknown-fact-${factId}`,
          severity: "blocking",
          repairTarget: "specialized-module",
          specializedModuleId: definition.id,
          message: `${definition.label} references a study fact that is no longer present.`,
        });
    for (const field of definition.fields) {
      if (field.required)
        missing(
          issues,
          definition.id,
          field.id,
          moduleState.values[field.id] ?? "",
          `Complete ${field.label.toLowerCase()} for ${definition.label.toLowerCase()}.`,
        );
      if (
        field.options &&
        moduleState.values[field.id] &&
        !field.options.some(
          (option) => option.value === moduleState.values[field.id],
        )
      )
        issues.push({
          id: `phase8-${definition.id}-${field.id}-choice`,
          severity: "blocking",
          repairTarget: "specialized-module",
          specializedModuleId: definition.id,
          message: `${field.label} contains a value outside the governed option registry.`,
        });
    }
  }

  const dataModule = state.modules["data-sharing-future-use"];
  if (
    dataModule.applicability === "applicable" &&
    document.inputs.futureUsePlan === "will-not-use-for-future-research" &&
    dataModule.values.sharing_mode !== "no-sharing"
  )
    issues.push({
      id: "phase8-data-sharing-future-use-conflict",
      severity: "blocking",
      repairTarget: "specialized-module",
      specializedModuleId: "data-sharing-future-use",
      message:
        "The specialized sharing plan permits sharing or future use, but the main consent facts say future research use will not occur.",
    });
  const specimenModule = state.modules["specimens-genomics"];
  if (
    specimenModule.applicability === "applicable" &&
    specimenModule.values.results_return_link &&
    specimenModule.values.results_return_link !== "no-individual-results" &&
    state.modules["results-return"].applicability !== "applicable"
  )
    issues.push({
      id: "phase8-specimen-results-link",
      severity: "blocking",
      repairTarget: "specialized-module",
      specializedModuleId: "results-return",
      message:
        "The specimen/genomics module describes a results-return plan, but the results-return module is not configured as applicable.",
    });
  if (
    state.modules["fda-electronic-process"].applicability === "applicable" &&
    state.profile.fdaRegulatedStatus !== "applicable-by-human-determination"
  )
    issues.push({
      id: "phase8-fda-electronic-process-scope",
      severity: "blocking",
      repairTarget: "governance",
      message:
        "The FDA electronic-process module requires a recorded human determination that FDA regulation applies.",
    });

  const privacy = state.modules["privacy-addenda"];
  if (privacy.applicability === "applicable") {
    if (state.externalAddenda.length === 0)
      issues.push({
        id: "phase8-privacy-addendum-missing",
        severity: "blocking",
        repairTarget: "specialized-module",
        specializedModuleId: "privacy-addenda",
        message:
          "Bind at least one institution-controlled privacy addendum by metadata and checksum; Cerise does not generate its legal text.",
      });
    if (
      state.profile.hipaaStatus === "applicable-by-human-determination" &&
      !state.externalAddenda.some((item) => item.kind === "hipaa-authorization")
    )
      issues.push({
        id: "phase8-hipaa-addendum-missing",
        severity: "blocking",
        repairTarget: "specialized-module",
        specializedModuleId: "privacy-addenda",
        message:
          "The human-determined HIPAA profile requires an institution-controlled HIPAA authorization or approved alternative reference.",
      });
    if (state.profile.hipaaStatus === "applicable-by-human-determination")
      missing(
        issues,
        "privacy-addenda",
        "hipaa-reference",
        privacy.values.hipaa_authorization_reference ?? "",
        "Record the institution-approved HIPAA authorization, waiver, or alteration reference.",
      );
    if (
      state.profile.gdprStatus === "applicable-by-human-determination" &&
      !state.externalAddenda.some((item) => item.kind === "gdpr-notice")
    )
      issues.push({
        id: "phase8-gdpr-addendum-missing",
        severity: "blocking",
        repairTarget: "specialized-module",
        specializedModuleId: "privacy-addenda",
        message:
          "The human-determined GDPR profile requires an institution-controlled privacy notice or addendum.",
      });
    if (state.profile.gdprStatus === "applicable-by-human-determination") {
      missing(
        issues,
        "privacy-addenda",
        "gdpr-reference",
        privacy.values.gdpr_notice_reference ?? "",
        "Record the institution-approved GDPR notice or addendum reference.",
      );
      missing(
        issues,
        "privacy-addenda",
        "legal-basis-authority",
        privacy.values.legal_basis_authority ?? "",
        "Record the institution or controller determination for the applicable legal basis; Cerise does not choose it.",
      );
      missing(
        issues,
        "privacy-addenda",
        "transfer-safeguards",
        privacy.values.international_transfer_safeguards ?? "",
        "Record the human determination for international transfers and safeguards, including that none are planned when applicable.",
      );
    }
    for (const addendum of state.externalAddenda)
      if (!addendum.authorityReference.trim())
        issues.push({
          id: `phase8-addendum-${addendum.id}-authority`,
          severity: "blocking",
          repairTarget: "specialized-module",
          specializedModuleId: "privacy-addenda",
          message: `${addendum.title} needs its institutional authority or approval reference.`,
        });
  }

  const falseCompliancePattern =
    /(?:cerise|this (?:app|software|platform)).{0,50}(?:part 11|hipaa|gdpr|fda).{0,30}(?:compliant|approved|certified)/i;
  for (const definition of CONSENT_PHASE_8_MODULES) {
    const moduleState = state.modules[definition.id];
    if (
      Object.values(moduleState.values).some((value) =>
        falseCompliancePattern.test(value),
      )
    )
      issues.push({
        id: `phase8-${definition.id}-false-compliance-claim`,
        severity: "blocking",
        repairTarget: "specialized-module",
        specializedModuleId: definition.id,
        message: `${definition.label} attributes regulatory compliance or approval to Cerise. Record the external human or institutional determination instead.`,
      });
  }

  for (const artifact of state.artifacts) {
    const currentIdentity = sourceIdentity(document, artifact.moduleId, state);
    if (artifact.sourceIdentity !== currentIdentity)
      issues.push({
        id: `phase8-artifact-${artifact.id}-source-drift`,
        severity: "blocking",
        repairTarget: "specialized-artifact",
        specializedModuleId: artifact.moduleId,
        artifactId: artifact.id,
        message: `${artifact.title} is no longer aligned to its source procedures, authority profile, or external addenda.`,
      });
    if (artifact.reviewState !== "human-reviewed")
      issues.push({
        id: `phase8-artifact-${artifact.id}-review`,
        severity: "blocking",
        repairTarget: "specialized-artifact",
        specializedModuleId: artifact.moduleId,
        artifactId: artifact.id,
        message: `${artifact.title} requires explicit human artifact review.`,
      });
    if (
      artifact.specialistReview.state !== "human-reviewed" ||
      artifact.specialistReview.sourceIdentity !== artifact.sourceIdentity ||
      !artifact.specialistReview.reviewerName ||
      !artifact.specialistReview.reviewerRoleOrCredentials ||
      !artifact.specialistReview.reviewReference
    )
      issues.push({
        id: `phase8-artifact-${artifact.id}-specialist-review`,
        severity: "blocking",
        repairTarget: "specialized-artifact",
        specializedModuleId: artifact.moduleId,
        artifactId: artifact.id,
        message: `${artifact.title} requires a named qualified human reviewer, role or credentials, review reference, and source-bound review.`,
      });
    if (
      artifact.kind === "broad-consent-form" &&
      artifact.decisionMode !== "dedicated-broad-consent"
    )
      issues.push({
        id: `phase8-artifact-${artifact.id}-broad-consent-mode`,
        severity: "blocking",
        repairTarget: "specialized-artifact",
        specializedModuleId: artifact.moduleId,
        artifactId: artifact.id,
        message:
          "Broad consent must remain a dedicated consent family and cannot compile as an ordinary optional future-use choice.",
      });
    if (artifact.runtimeMode !== "authoring-export-only")
      issues.push({
        id: `phase8-artifact-${artifact.id}-runtime`,
        severity: "blocking",
        repairTarget: "specialized-artifact",
        specializedModuleId: artifact.moduleId,
        artifactId: artifact.id,
        message: `${artifact.title} cannot claim participant execution support in Phase 8.`,
      });
  }

  const order = { blocking: 0, warning: 1, advisory: 2 } as const;
  return issues.sort(
    (left, right) =>
      order[left.severity] - order[right.severity] ||
      left.id.localeCompare(right.id),
  );
}

export function phase8ParticipantPreview(
  document: ConsentPhase5Document,
  artifactId: string,
): string {
  const artifact = document.phase8.artifacts.find(
    (item) => item.id === artifactId,
  );
  return artifact
    ? `${artifact.title}\n\n${artifact.participantText}`
    : "No Phase 8 specialized artifact has been compiled.";
}

export function migrateConsentPhase8State(value: unknown): ConsentPhase8State {
  return normalizeConsentPhase8State(value) ?? createConsentPhase8State();
}
