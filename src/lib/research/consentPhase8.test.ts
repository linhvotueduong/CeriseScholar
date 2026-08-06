import assert from "node:assert/strict";
import test from "node:test";
import { EMPTY_RESEARCH_PATH_DRAFT } from "./researchPathDraft";
import { GENERIC_US_CONSENT_AUTHORITY_MANIFEST } from "./consentAuthority";
import { createStudyDesignDocument } from "./studyDesign";
import { createExperimentStudioDocument } from "./experimentStudio";
import {
  addConsentPhase5Version,
  createConsentPhase5Document,
  normalizeConsentPhase5Document,
  type ConsentPhase5Document,
} from "./consentPhase5";
import {
  CONSENT_PHASE_8_MODULES,
  collectConsentPhase8Issues,
  collectConsentPhase8Suggestions,
  recordConsentPhase8SpecialistReview,
  reviewConsentPhase8Artifact,
  updateConsentPhase8State,
  updateConsentPhase8SpecialistReviewDraft,
  upsertConsentPhase8ExternalAddendum,
} from "./consentPhase8";
import {
  normalizeConsentPhase8State,
  type ConsentPhase8ModuleId,
} from "./consentPhase8Model";
import {
  recordConsentPhase7QualifiedReview,
  reviewConsentPhase7Artifact,
  updateConsentPhase7State,
} from "./consentPhase7";

const PROJECT_ID = "phase-8-consent-fixture";
const NOW = "2026-08-01T18:00:00.000Z";

async function fixtureDocument(): Promise<ConsentPhase5Document> {
  const design = createStudyDesignDocument(
    PROJECT_ID,
    EMPTY_RESEARCH_PATH_DRAFT,
  );
  design.updatedAt = NOW;
  design.spec.design = {
    ...design.spec.design,
    goal: "test-causal-effect",
    selectedDesign: "randomized-between",
    setting: "laboratory",
    selectionRationale: "Protocol-defined laboratory study.",
    approved: true,
  };
  design.spec.participants.targetPopulation =
    "Adults identified by the approved protocol";
  const studio = createExperimentStudioDocument(PROJECT_ID, design);
  studio.updatedAt = NOW;
  const document = await createConsentPhase5Document(
    PROJECT_ID,
    design,
    studio,
    GENERIC_US_CONSENT_AUTHORITY_MANIFEST,
    NOW,
  );
  return {
    ...document,
    governance: {
      pathway: "expedited-or-full",
      decisionSource: "institution",
      institutionReference: "IRB P8",
      documentationMethod: "signed-written",
      waiverOrAlteration: null,
    },
    inputs: {
      ...document.inputs,
      futureUsePlan: "may-use-after-removing-identifiers",
    },
  };
}

function profile(
  document: ConsentPhase5Document,
  requiredModules: ConsentPhase8ModuleId[] = [],
): ConsentPhase5Document {
  return updateConsentPhase8State(
    document,
    (state) => ({
      ...state,
      profile: {
        determinationSource: "institution",
        institutionProfileReference: "IRB P8 scope determination",
        jurisdiction: "United States; applicable state law",
        hhsCommonRuleStatus: "applicable-by-human-determination",
        fdaRegulatedStatus: "not-applicable-by-human-determination",
        hipaaStatus: "not-applicable-by-human-determination",
        gdprStatus: "not-applicable-by-human-determination",
        nihGenomicDataSharingStatus: "not-applicable-by-human-determination",
        requiredModules,
        specialistEscalationContacts:
          "IRB, privacy office, and applicable clinical specialist",
        runtimeBoundaryAcknowledged: true,
        noParticipantDataAcknowledged: true,
      },
    }),
    NOW,
  );
}

function configureModule(
  document: ConsentPhase5Document,
  moduleId: ConsentPhase8ModuleId,
): ConsentPhase5Document {
  const definition = CONSENT_PHASE_8_MODULES.find(
    (item) => item.id === moduleId,
  )!;
  let next = profile(document, [moduleId]);
  next = updateConsentPhase8State(
    next,
    (state) => {
      const moduleState = state.modules[moduleId];
      const values = Object.fromEntries(
        definition.fields.map((field) => {
          if (field.id === "results_return_link")
            return [field.id, "no-individual-results"];
          const governedChoice = field.options?.find(
            (option) => option.value !== "not-determined",
          )?.value;
          return [
            field.id,
            governedChoice ?? `Protocol-specific ${field.label.toLowerCase()}.`,
          ];
        }),
      );
      return {
        ...state,
        modules: {
          ...state.modules,
          [moduleId]: {
            ...moduleState,
            applicability: "applicable",
            determinationSource: "institution",
            authorityReference: `IRB P8 ${moduleId} determination`,
            sourceFactIds: definition.procedureMappingRequired
              ? [document.studyFacts[0]!.id]
              : [],
            protocolProcedureReference: definition.procedureMappingRequired
              ? `Protocol P8 procedure ${moduleId}`
              : "",
            participantProcedureDescription: definition.procedureMappingRequired
              ? `The study includes the protocol-defined ${definition.label.toLowerCase()} procedure.`
              : "",
            specialistReviewRole: "Qualified protocol specialist",
            values,
          },
        },
      };
    },
    NOW,
  );
  return next;
}

function completeReviews(
  document: ConsentPhase5Document,
  moduleId: ConsentPhase8ModuleId,
): ConsentPhase5Document {
  const artifact = document.phase8.artifacts.find(
    (item) => item.moduleId === moduleId,
  )!;
  let next = updateConsentPhase8SpecialistReviewDraft(
    document,
    artifact.id,
    {
      reviewerName: "Dr. Human Reviewer",
      reviewerRoleOrCredentials: "Qualified specialist for the protocol",
      reviewReference: "IRB P8 specialist review",
    },
    NOW,
  );
  next = recordConsentPhase8SpecialistReview(
    next,
    artifact.id,
    "Dr. Human Reviewer",
    "Qualified specialist for the protocol",
    "IRB P8 specialist review",
    NOW,
  );
  return reviewConsentPhase8Artifact(next, artifact.id, "human-reviewed", NOW);
}

test("specialized modules stay inert and medical keywords never auto-activate them", async () => {
  const document = await fixtureDocument();
  document.inputs.risksAndDiscomforts =
    "Questions mention genetic testing, medication, radiation, and specimens.";
  assert.deepEqual(collectConsentPhase8Suggestions(document), []);
  assert.ok(
    Object.values(document.phase8.modules).every(
      (module) => module.applicability === "not-configured",
    ),
  );
  assert.deepEqual(document.phase8.artifacts, []);
});

test("only explicit institution requirements or procedure mappings produce suggestions", async () => {
  let document = profile(await fixtureDocument(), ["regulated-intervention"]);
  document = updateConsentPhase8State(
    document,
    (state) => ({
      ...state,
      modules: {
        ...state.modules,
        "procedure-exposure": {
          ...state.modules["procedure-exposure"],
          protocolProcedureReference: "Protocol P8 MRI procedure",
        },
      },
    }),
    NOW,
  );
  assert.deepEqual(
    new Set(collectConsentPhase8Suggestions(document)),
    new Set(["regulated-intervention", "procedure-exposure"]),
  );
});

test("regulated intervention protects alternatives, injury, and participant-cost content", async () => {
  let document = configureModule(
    await fixtureDocument(),
    "regulated-intervention",
  );
  const artifact = document.phase8.artifacts[0]!;
  assert.deepEqual(artifact.protectedElements, [
    "alternatives",
    "research_injury",
    "participant_costs",
  ]);
  document = updateConsentPhase8State(
    document,
    (state) => ({
      ...state,
      modules: {
        ...state.modules,
        "regulated-intervention": {
          ...state.modules["regulated-intervention"],
          values: {
            ...state.modules["regulated-intervention"].values,
            alternatives: "",
            research_injury: "",
            participant_costs: "",
          },
        },
      },
    }),
    NOW,
  );
  const ids = collectConsentPhase8Issues(document).map((issue) => issue.id);
  assert.ok(ids.includes("phase8-regulated-intervention-alternatives"));
  assert.ok(ids.includes("phase8-regulated-intervention-research_injury"));
  assert.ok(ids.includes("phase8-regulated-intervention-participant_costs"));
});

test("specimen and genomics content requires an explicit no-results decision or linked results plan", async () => {
  let document = configureModule(await fixtureDocument(), "specimens-genomics");
  assert.ok(
    !collectConsentPhase8Issues(document).some(
      (issue) => issue.id === "phase8-specimen-results-link",
    ),
  );
  document = updateConsentPhase8State(
    document,
    (state) => ({
      ...state,
      modules: {
        ...state.modules,
        "specimens-genomics": {
          ...state.modules["specimens-genomics"],
          values: {
            ...state.modules["specimens-genomics"].values,
            results_return_link: "phase8-results-return",
          },
        },
      },
    }),
    NOW,
  );
  assert.ok(
    collectConsentPhase8Issues(document).some(
      (issue) => issue.id === "phase8-specimen-results-link",
    ),
  );
});

test("data-sharing content cannot contradict the main future-use contract", async () => {
  let document = configureModule(
    await fixtureDocument(),
    "data-sharing-future-use",
  );
  document = {
    ...document,
    inputs: {
      ...document.inputs,
      futureUsePlan: "will-not-use-for-future-research",
    },
  };
  document = updateConsentPhase8State(
    document,
    (state) => ({
      ...state,
      modules: {
        ...state.modules,
        "data-sharing-future-use": {
          ...state.modules["data-sharing-future-use"],
          values: {
            ...state.modules["data-sharing-future-use"].values,
            sharing_mode: "controlled-access",
          },
        },
      },
    }),
    NOW,
  );
  assert.ok(
    collectConsentPhase8Issues(document).some(
      (issue) => issue.id === "phase8-data-sharing-future-use-conflict",
    ),
  );
});

test("broad consent compiles only as a dedicated family and requires refusal tracking", async () => {
  let document = configureModule(await fixtureDocument(), "broad-consent");
  assert.equal(
    document.phase8.artifacts[0]?.decisionMode,
    "dedicated-broad-consent",
  );
  document = updateConsentPhase8State(
    document,
    (state) => ({
      ...state,
      modules: {
        ...state.modules,
        "broad-consent": {
          ...state.modules["broad-consent"],
          values: {
            ...state.modules["broad-consent"].values,
            refusal_and_nonresponse_tracking: "",
          },
        },
      },
    }),
    NOW,
  );
  assert.ok(
    collectConsentPhase8Issues(document).some(
      (issue) =>
        issue.id === "phase8-broad-consent-refusal_and_nonresponse_tracking",
    ),
  );
});

test("HIPAA and GDPR legal text remains in checksum-bound external addenda", async () => {
  let document = configureModule(await fixtureDocument(), "privacy-addenda");
  document = updateConsentPhase8State(
    document,
    (state) => ({
      ...state,
      profile: {
        ...state.profile,
        hipaaStatus: "applicable-by-human-determination",
        gdprStatus: "applicable-by-human-determination",
      },
    }),
    NOW,
  );
  let ids = collectConsentPhase8Issues(document).map((issue) => issue.id);
  assert.ok(ids.includes("phase8-hipaa-addendum-missing"));
  assert.ok(ids.includes("phase8-gdpr-addendum-missing"));
  for (const [kind, suffix] of [
    ["hipaa-authorization", "a"],
    ["gdpr-notice", "b"],
  ] as const) {
    document = upsertConsentPhase8ExternalAddendum(
      document,
      {
        id: `addendum-${suffix}`,
        kind,
        title: `${kind} approved file`,
        filename: `${kind}.pdf`,
        mediaType: "application/pdf",
        byteLength: 1200,
        checksum: `sha256:${suffix.repeat(64)}`,
        importedAt: NOW,
        authorityReference: "Privacy office approval P8",
        contentsStored: false,
      },
      NOW,
    );
  }
  ids = collectConsentPhase8Issues(document).map((issue) => issue.id);
  assert.ok(!ids.includes("phase8-hipaa-addendum-missing"));
  assert.ok(!ids.includes("phase8-gdpr-addendum-missing"));
  assert.equal("contents" in document.phase8.externalAddenda[0]!, false);
});

test("FDA electronic controls are required only for human-determined FDA electronic consent", async () => {
  let document = profile(await fixtureDocument());
  document = {
    ...document,
    governance: {
      ...document.governance,
      pathway: "fda-regulated",
      documentationMethod: "signed-electronic",
    },
  };
  document = updateConsentPhase8State(
    document,
    (state) => ({
      ...state,
      profile: {
        ...state.profile,
        fdaRegulatedStatus: "applicable-by-human-determination",
      },
    }),
    NOW,
  );
  assert.ok(
    collectConsentPhase8Issues(document).some(
      (issue) => issue.id === "phase8-fda-electronic-process-required",
    ),
  );
  document = configureModule(document, "fda-electronic-process");
  document = updateConsentPhase8State(
    document,
    (state) => ({
      ...state,
      profile: {
        ...state.profile,
        fdaRegulatedStatus: "applicable-by-human-determination",
      },
    }),
    NOW,
  );
  assert.equal(
    document.phase8.artifacts[0]?.runtimeMode,
    "authoring-export-only",
  );
  assert.ok(
    !collectConsentPhase8Issues(document).some(
      (issue) => issue.id === "phase8-fda-electronic-process-required",
    ),
  );
});

test("ordinary artifact review cannot substitute for specialist review", async () => {
  let document = configureModule(
    await fixtureDocument(),
    "regulated-intervention",
  );
  const artifactId = document.phase8.artifacts[0]!.id;
  document = reviewConsentPhase8Artifact(
    document,
    artifactId,
    "human-reviewed",
    NOW,
  );
  assert.equal(
    document.phase8.artifacts[0]?.reviewState,
    "human-review-required",
  );
  document = completeReviews(document, "regulated-intervention");
  assert.equal(
    document.phase8.artifacts[0]?.specialistReview.state,
    "human-reviewed",
  );
  assert.equal(document.phase8.artifacts[0]?.reviewState, "human-reviewed");
});

test("specialized source edits invalidate specialist, artifact, and translated-variant review", async () => {
  let document = completeReviews(
    configureModule(await fixtureDocument(), "regulated-intervention"),
    "regulated-intervention",
  );
  document = updateConsentPhase7State(
    document,
    (state) => ({
      ...state,
      profile: {
        determinationSource: "institution",
        authorityReference: "IRB language plan",
        jurisdiction: "US",
        requiredPackages: ["translated-variant"],
        localContacts: "Language services",
        runtimeBoundaryAcknowledged: true,
      },
      translatedVariant: {
        ...state.translatedVariant,
        applicability: "applicable",
        determinationSource: "institution",
        authorityReference: "IRB translation",
        participantGroup: "Spanish-speaking adults",
        sourceArtifactId: "phase8-regulated-intervention",
        sourceLanguage: "en-US",
        targetLanguage: "es-US",
        translationMethod: "professional-service",
        translatorQualifications: "Qualified research translator",
        participantText: "Texto revisado.",
      },
    }),
    NOW,
  );
  document = recordConsentPhase7QualifiedReview(
    document,
    "Qualified Reviewer",
    "Professional Spanish consent translator",
    NOW,
  );
  document = reviewConsentPhase7Artifact(
    document,
    "phase7-translated-variant",
    "human-reviewed",
    NOW,
  );
  const before = document.phase7.artifacts[0]!.sourceIdentity;
  document = updateConsentPhase8State(
    document,
    (state) => ({
      ...state,
      modules: {
        ...state.modules,
        "regulated-intervention": {
          ...state.modules["regulated-intervention"],
          values: {
            ...state.modules["regulated-intervention"].values,
            foreseeable_risks: "Revised human-reviewed risk draft.",
          },
        },
      },
    }),
    NOW,
  );
  const specialized = document.phase8.artifacts[0]!;
  assert.equal(specialized.specialistReview.state, "human-review-required");
  assert.equal(specialized.reviewState, "human-review-required");
  assert.notEqual(document.phase7.artifacts[0]!.sourceIdentity, before);
  assert.equal(
    document.phase7.artifacts[0]!.reviewState,
    "human-review-required",
  );
});

test("schemas 1 through 3 migrate to schema 4 with inert Phase 8 state", async () => {
  const current = await fixtureDocument();
  for (const schemaVersion of [1, 2, 3] as const) {
    const legacy = structuredClone(current) as unknown as Record<
      string,
      unknown
    >;
    legacy.schemaVersion = schemaVersion;
    delete legacy.phase8;
    if (schemaVersion < 3) delete legacy.phase7;
    if (schemaVersion < 2) delete legacy.phase6;
    const normalized = normalizeConsentPhase5Document(legacy, PROJECT_ID);
    assert.ok(normalized);
    assert.equal(normalized.schemaVersion, 4);
    assert.deepEqual(normalized.phase8.artifacts, []);
    assert.ok(
      Object.values(normalized.phase8.modules).every(
        (module) => module.applicability === "not-configured",
      ),
    );
  }
});

test("checksum-bound versions include specialized consent state", async () => {
  const base = await fixtureDocument();
  const baseVersion = await addConsentPhase5Version(base, NOW);
  const configuredVersion = await addConsentPhase5Version(
    configureModule(base, "specimens-genomics"),
    NOW,
  );
  assert.notEqual(
    baseVersion.versions[0]?.documentChecksum,
    configuredVersion.versions[0]?.documentChecksum,
  );
});

test("normalization rejects forged governed choices and oversized protocol text", async () => {
  const document = configureModule(
    await fixtureDocument(),
    "regulated-intervention",
  );
  document.phase8.modules[
    "regulated-intervention"
  ].values.intervention_category = "cerise-approved";
  assert.ok(
    collectConsentPhase8Issues(document).some(
      (issue) =>
        issue.id ===
        "phase8-regulated-intervention-intervention_category-choice",
    ),
  );
  const forged = structuredClone(document.phase8);
  forged.modules["regulated-intervention"].values.participant_text = "x".repeat(
    20_001,
  );
  assert.equal(normalizeConsentPhase8State(forged), null);
});

test("software compliance claims are blocked in specialized participant text", async () => {
  let document = configureModule(
    await fixtureDocument(),
    "fda-electronic-process",
  );
  document = updateConsentPhase8State(
    document,
    (state) => ({
      ...state,
      modules: {
        ...state.modules,
        "fda-electronic-process": {
          ...state.modules["fda-electronic-process"],
          values: {
            ...state.modules["fda-electronic-process"].values,
            participant_text: "Cerise is FDA Part 11 compliant and certified.",
          },
        },
      },
    }),
    NOW,
  );
  assert.ok(
    collectConsentPhase8Issues(document).some(
      (issue) =>
        issue.id === "phase8-fda-electronic-process-false-compliance-claim",
    ),
  );
});
