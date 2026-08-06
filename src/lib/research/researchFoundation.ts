import type { ResearchArtifactIdentity } from "./artifactIdentity";
import {
  CERISE_RESEARCH_ARTIFACT_GRAPH,
  validateResearchArtifactGraph,
} from "./researchArtifactGraph";
import {
  RESEARCH_ARTIFACT_DEFINITIONS,
  isRegisteredResearchArtifactKind,
  validateResearchArtifactRegistry,
} from "./researchArtifactRegistry";
import {
  compileProjectRouteProfile,
  type ProjectRouteProfile,
  type ProjectRouteProfileInput,
} from "./projectRouteProfile";
import {
  compilePublicationTemplateRegistry,
  validatePublicationTemplateRegistry,
  type PublicationTemplateProfile,
} from "./publicationTemplateRegistry";
import {
  createResearchArtifactIndexRecord,
  type ResearchArtifactIndexRecord,
  type ResearchArtifactLifecycleStatus,
} from "./researchArtifactLifecycle";
import type { ResearchFoundationSnapshot } from "./researchFoundationPersistence";

export const RESEARCH_FOUNDATION_SCHEMA_VERSION = 1 as const;

export interface ResearchFoundationBlueprint {
  schemaVersion: typeof RESEARCH_FOUNDATION_SCHEMA_VERSION;
  routeProfile: ProjectRouteProfile;
  templates: PublicationTemplateProfile[];
  registryIssues: string[];
  graphIssues: string[];
  templateIssues: string[];
  ready: boolean;
}

export interface ResearchFoundationInspection {
  schemaVersion: typeof RESEARCH_FOUNDATION_SCHEMA_VERSION;
  registry: {
    artifactKinds: number;
    stagesCovered: number[];
    issues: string[];
  };
  graph: {
    dependencies: number;
    issues: string[];
  };
  project: {
    routeProfilePresent: boolean;
    indexedArtifacts: number;
    currentArtifacts: number;
    staleArtifacts: number;
    blockedArtifacts: number;
    knowledgeEntries: number;
    manuscriptPresent: boolean;
    decisionEvents: number;
    assets: number;
    templatePins: number;
  };
  privacyBoundary: {
    participantRowsStored: false;
    recordingsStored: false;
    consentReceiptsStored: false;
    uploadedFileContentsStored: false;
  };
}

export async function compileResearchFoundationBlueprint(
  routeInput: ProjectRouteProfileInput,
): Promise<ResearchFoundationBlueprint> {
  const [routeProfile, templates] = await Promise.all([
    compileProjectRouteProfile(routeInput),
    compilePublicationTemplateRegistry(),
  ]);
  const registryIssues = validateResearchArtifactRegistry();
  const graphIssues = validateResearchArtifactGraph(CERISE_RESEARCH_ARTIFACT_GRAPH);
  const templateIssues = validatePublicationTemplateRegistry(templates);
  return {
    schemaVersion: RESEARCH_FOUNDATION_SCHEMA_VERSION,
    routeProfile,
    templates,
    registryIssues,
    graphIssues,
    templateIssues,
    ready: registryIssues.length === 0 && graphIssues.length === 0 && templateIssues.length === 0,
  };
}

export function indexResearchArtifact(input: {
  projectId: string;
  userId: string;
  identity: ResearchArtifactIdentity;
  storageLocator: string;
  lifecycleStatus?: Exclude<ResearchArtifactLifecycleStatus, "missing">;
  supersedesArtifactId?: string | null;
  createdAt: string;
  updatedAt?: string;
}): ResearchArtifactIndexRecord {
  if (!isRegisteredResearchArtifactKind(input.identity.artifactKind)) {
    throw new Error(`Cannot index an unregistered artifact kind: ${input.identity.artifactKind}`);
  }
  return createResearchArtifactIndexRecord({
    projectId: input.projectId,
    userId: input.userId,
    artifactKind: input.identity.artifactKind,
    artifactId: input.identity.artifactId,
    artifactSchemaVersion: input.identity.artifactSchemaVersion,
    checksum: input.identity.checksum,
    payloadChecksum: input.identity.payloadChecksum,
    sourceFingerprintChecksum: input.identity.sourceFingerprint.checksum,
    sourceReferences: input.identity.sourceFingerprint.sources,
    storageLocator: input.storageLocator,
    lifecycleStatus: input.lifecycleStatus ?? "current",
    supersedesArtifactId: input.supersedesArtifactId ?? null,
    createdAt: new Date(input.createdAt).toISOString(),
    updatedAt: new Date(input.updatedAt ?? input.createdAt).toISOString(),
  });
}

export function inspectResearchFoundation(
  snapshot?: ResearchFoundationSnapshot,
): ResearchFoundationInspection {
  const artifactRows = snapshot?.artifactIndex ?? [];
  const status = (value: unknown): string => {
    if (!value || typeof value !== "object" || !("lifecycle_status" in value)) return "";
    return String(value.lifecycle_status);
  };
  return {
    schemaVersion: RESEARCH_FOUNDATION_SCHEMA_VERSION,
    registry: {
      artifactKinds: RESEARCH_ARTIFACT_DEFINITIONS.length,
      stagesCovered: [...new Set(RESEARCH_ARTIFACT_DEFINITIONS.map((item) => item.stage))].sort(),
      issues: validateResearchArtifactRegistry(),
    },
    graph: {
      dependencies: CERISE_RESEARCH_ARTIFACT_GRAPH.dependencies.length,
      issues: validateResearchArtifactGraph(CERISE_RESEARCH_ARTIFACT_GRAPH),
    },
    project: {
      routeProfilePresent: Boolean(snapshot?.routeProfile),
      indexedArtifacts: artifactRows.length,
      currentArtifacts: artifactRows.filter((item) => status(item) === "current").length,
      staleArtifacts: artifactRows.filter((item) => status(item) === "stale").length,
      blockedArtifacts: artifactRows.filter((item) => status(item) === "blocked").length,
      knowledgeEntries: snapshot?.knowledgeEntries.length ?? 0,
      manuscriptPresent: Boolean(snapshot?.manuscript),
      decisionEvents: snapshot?.decisionEvents.length ?? 0,
      assets: snapshot?.assets.length ?? 0,
      templatePins: snapshot?.templatePins.length ?? 0,
    },
    privacyBoundary: {
      participantRowsStored: false,
      recordingsStored: false,
      consentReceiptsStored: false,
      uploadedFileContentsStored: false,
    },
  };
}
