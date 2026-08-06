import type { ResearchArtifactKind } from "./researchArtifactGraph";

export const RESEARCH_ARTIFACT_REGISTRY_SCHEMA_VERSION = 1 as const;

export type ResearchStageNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type ResearchArtifactCardinality = "one-per-project" | "versioned" | "collection";
export type ResearchArtifactPayloadOwner =
  | "projects"
  | "evidence-library"
  | "research-path"
  | "study-builder"
  | "consent-engine"
  | "governance"
  | "collection"
  | "analysis-studio"
  | "living-research-record"
  | "publication-studio"
  | "foundation-index-only";
export type ResearchArtifactPrivacyClass =
  | "research-metadata"
  | "research-content"
  | "aggregate-results"
  | "participant-sensitive-excluded";

export interface ResearchArtifactDefinition {
  kind: ResearchArtifactKind;
  label: string;
  stage: ResearchStageNumber;
  cardinality: ResearchArtifactCardinality;
  payloadOwner: ResearchArtifactPayloadOwner;
  privacyClass: ResearchArtifactPrivacyClass;
  indexStoresPayload: false;
  participantRowsAllowed: false;
  description: string;
}

function definition(
  kind: ResearchArtifactKind,
  label: string,
  stage: ResearchStageNumber,
  payloadOwner: ResearchArtifactPayloadOwner,
  cardinality: ResearchArtifactCardinality,
  privacyClass: ResearchArtifactPrivacyClass,
  description: string,
): ResearchArtifactDefinition {
  return {
    kind,
    label,
    stage,
    payloadOwner,
    cardinality,
    privacyClass,
    indexStoresPayload: false,
    participantRowsAllowed: false,
    description,
  };
}

/**
 * Canonical cross-stage identity registry.
 *
 * The registry owns identity, lineage, applicability, and lifecycle metadata.
 * Domain payloads remain in their existing domain stores; the foundation index
 * must never become a second editable copy of consent, study, or analysis data.
 */
export const RESEARCH_ARTIFACT_DEFINITIONS: readonly ResearchArtifactDefinition[] = [
  definition("route-profile", "Project route profile", 1, "research-path", "versioned", "research-metadata", "Determines which workflow capabilities apply without claiming institutional or legal approval."),
  definition("research-pathway", "Research pathway", 1, "projects", "one-per-project", "research-content", "Records the research question, purpose, and initial direction."),
  definition("evidence-library", "Evidence library", 2, "evidence-library", "collection", "research-content", "Indexes the scholarly evidence selected for the project."),
  definition("project-evidence-assessment", "Project evidence assessment", 2, "evidence-library", "collection", "research-content", "Records a researcher-owned, project-specific inclusion, relevance, and appraisal judgment without claiming a universal source quality score."),
  definition("research-proposal", "Research proposal", 2, "research-path", "versioned", "research-content", "Synthesizes the problem, literature, questions, and proposed method."),
  definition("proposal-handoff", "Verified proposal handoff", 2, "research-path", "versioned", "research-metadata", "Binds the exact reviewed proposal, pathway, evidence decisions, and explicit Stage 3 responsibilities without duplicating the proposal payload."),
  definition("reviewed-proposal-baseline", "Reviewed proposal baseline", 2, "research-path", "versioned", "research-metadata", "Binds researcher review, optional advisory receipts, traceability checks, and Living Research Record receipts to one exact proposal handoff without representing institutional approval."),
  definition("study-design", "Study design", 3, "study-builder", "versioned", "research-content", "Records the chosen design and its bounded methodological claims."),
  definition("study-measures", "Measures map", 3, "study-builder", "versioned", "research-content", "Maps questions and constructs to evidence-producing measures."),
  definition("participant-plan", "Participant or source plan", 3, "study-builder", "versioned", "research-content", "Plans sampling, access, assignment, inclusion, and accommodations."),
  definition("study-build-profile", "Study build profile", 3, "study-builder", "versioned", "research-metadata", "Compiles design and setting decisions into required builder capabilities."),
  definition("experiment-studio", "Runnable study", 3, "study-builder", "versioned", "research-content", "Represents implemented screens, tasks, variables, branches, and scoring."),
  definition("consent-authority", "Consent authority profile", 3, "consent-engine", "versioned", "research-metadata", "Records institution and jurisdiction sources without declaring compliance."),
  definition("consent-protocol", "Consent protocol", 3, "consent-engine", "versioned", "participant-sensitive-excluded", "Stores researcher-authored consent materials but never participant decisions or signatures."),
  definition("recruitment-material", "Recruitment material", 3, "study-builder", "collection", "research-content", "Stores authored recruitment content before governance review and distribution."),
  definition("analysis-contract", "Verified data and analysis contract", 3, "study-builder", "versioned", "research-content", "Binds research questions to implemented variables, scoring, exclusions, and planned methods."),
  definition("pilot-candidate", "Pilot candidate", 3, "study-builder", "versioned", "research-metadata", "Freezes an exact checksum-bound study candidate for rehearsal and review."),
  definition("pilot-evidence", "Pilot evidence", 4, "governance", "collection", "aggregate-results", "Records aggregate rehearsal and pilot findings without participant rows."),
  definition("governance-review", "Governance review", 4, "governance", "versioned", "research-content", "Records human decisions and conditions bound to an exact candidate."),
  definition("host-readiness", "Host readiness", 4, "governance", "versioned", "research-metadata", "Records operational checks for the exact pilot candidate."),
  definition("collection-authorization", "Collection authorization", 4, "governance", "versioned", "research-metadata", "Combines applicable human authorization and operational readiness without replacing either."),
  definition("evidence-collection", "Collected evidence manifest", 5, "collection", "versioned", "participant-sensitive-excluded", "Indexes collection batches and checksums while excluding participant-level contents."),
  definition("imported-evidence", "Imported evidence manifest", 5, "collection", "versioned", "participant-sensitive-excluded", "Indexes imported source packages and rights boundaries without copying source rows."),
  definition("data-intake-audit", "Data intake audit", 6, "analysis-studio", "versioned", "research-metadata", "Verifies source identities and frozen contracts before preparation."),
  definition("inclusion-ledger", "Inclusion ledger", 6, "analysis-studio", "versioned", "participant-sensitive-excluded", "Records bounded inclusion/exclusion logic and aggregate counts, not participant rows."),
  definition("prepared-dataset", "Prepared dataset manifest", 6, "analysis-studio", "versioned", "participant-sensitive-excluded", "Identifies a reproducibly prepared dataset without placing its rows in the foundation."),
  definition("data-quality-review", "Data quality review", 6, "analysis-studio", "versioned", "aggregate-results", "Records aggregate quality findings and researcher decisions."),
  definition("analysis-plan", "Analysis plan", 6, "analysis-studio", "versioned", "research-content", "Binds methods to questions, outcomes, assumptions, and exclusions."),
  definition("analysis-execution", "Analysis execution", 6, "analysis-studio", "versioned", "aggregate-results", "Records reproducible method execution and aggregate outputs."),
  definition("robustness-record", "Robustness record", 6, "analysis-studio", "versioned", "aggregate-results", "Records sensitivity and robustness evidence with bounded claims."),
  definition("qualitative-analysis", "Qualitative and mixed-methods analysis", 6, "analysis-studio", "versioned", "participant-sensitive-excluded", "Indexes coding and integration outputs while excluding raw participant material."),
  definition("analysis-results", "Analysis results", 6, "analysis-studio", "versioned", "aggregate-results", "Provides verified aggregate findings for interpretation and writing."),
  definition("interpretation-record", "Interpretation record", 7, "living-research-record", "versioned", "research-content", "Separates findings, interpretation, limitations, and claim strength."),
  definition("living-research-record", "Living Research Record", 7, "living-research-record", "collection", "research-content", "Preserves stage knowledge, rationale, provenance, and planned-versus-actual changes."),
  definition("canonical-manuscript", "Canonical manuscript", 7, "publication-studio", "versioned", "research-content", "Stores venue-neutral manuscript structure before formatting."),
  definition("research-asset", "Figure, table, or supplement", 7, "publication-studio", "collection", "aggregate-results", "Registers publication assets, provenance, rights, and stable references."),
  definition("publication-template", "Publication template", 8, "publication-studio", "versioned", "research-metadata", "Pins a reviewed, versioned formatting adapter independently of manuscript content."),
  definition("publication-render", "Publication render", 8, "publication-studio", "versioned", "research-content", "Renders a canonical manuscript through a pinned template."),
  definition("conference-poster", "Conference poster", 8, "publication-studio", "versioned", "research-content", "Creates a presentation artifact from verified manuscript and asset sources."),
  definition("reproducibility-package", "Reproducibility package", 8, "publication-studio", "versioned", "participant-sensitive-excluded", "Packages permitted code, manifests, results, and documentation without raw restricted data."),
  definition("preservation-release", "Preservation release", 8, "publication-studio", "versioned", "participant-sensitive-excluded", "Freezes the final publish/present/preserve release and its permitted contents."),
] as const;

const DEFINITIONS_BY_KIND = new Map(
  RESEARCH_ARTIFACT_DEFINITIONS.map((item) => [item.kind, item]),
);

export function getResearchArtifactDefinition(
  kind: ResearchArtifactKind,
): ResearchArtifactDefinition {
  const found = DEFINITIONS_BY_KIND.get(kind);
  if (!found) throw new Error(`Unregistered research artifact kind: ${kind}`);
  return found;
}

export function isRegisteredResearchArtifactKind(value: string): value is ResearchArtifactKind {
  return DEFINITIONS_BY_KIND.has(value as ResearchArtifactKind);
}

export function validateResearchArtifactRegistry(): string[] {
  const issues: string[] = [];
  const seen = new Set<ResearchArtifactKind>();
  for (const item of RESEARCH_ARTIFACT_DEFINITIONS) {
    if (seen.has(item.kind)) issues.push(`duplicate-kind:${item.kind}`);
    seen.add(item.kind);
    if (!item.label.trim()) issues.push(`missing-label:${item.kind}`);
    if (item.indexStoresPayload !== false) issues.push(`index-payload-not-forbidden:${item.kind}`);
    if (item.participantRowsAllowed !== false) issues.push(`participant-rows-not-forbidden:${item.kind}`);
  }
  return issues.sort();
}
