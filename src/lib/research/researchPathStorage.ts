import {
  EMPTY_RESEARCH_PATH_DRAFT,
  normalizeResearchPathDraft,
  type ResearchPathDraft,
} from "./researchPathDraft";
import {
  createStudyDesignDocument,
  normalizeStudyDesignDocument,
  type StudyDesignDocument,
} from "./studyDesign";

export const RESEARCH_PATH_STORAGE_VERSION = 2 as const;

export interface ResearchPathStoredDocument {
  version: typeof RESEARCH_PATH_STORAGE_VERSION;
  pathway: ResearchPathDraft;
  studyDesign: StudyDesignDocument;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function researchPathStorageKey(projectId: string, version: number = RESEARCH_PATH_STORAGE_VERSION): string {
  return `cerise-research-path:${projectId}:v${version}`;
}

export function createResearchPathStoredDocument(
  projectId: string,
  pathway: ResearchPathDraft = EMPTY_RESEARCH_PATH_DRAFT,
): ResearchPathStoredDocument {
  return {
    version: RESEARCH_PATH_STORAGE_VERSION,
    pathway,
    studyDesign: createStudyDesignDocument(projectId, pathway),
  };
}

export function normalizeResearchPathStoredDocument(value: unknown, projectId: string): ResearchPathStoredDocument {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return createResearchPathStoredDocument(projectId);
  }

  const version = "version" in value ? value.version : undefined;
  if (version === RESEARCH_PATH_STORAGE_VERSION && "pathway" in value) {
    const pathway = normalizeResearchPathDraft(value.pathway);
    return {
      version: RESEARCH_PATH_STORAGE_VERSION,
      pathway,
      studyDesign: normalizeStudyDesignDocument(
        "studyDesign" in value ? value.studyDesign : undefined,
        projectId,
        pathway,
      ),
    };
  }

  // v1 stored the raw pathway draft directly. Keep every normalized field and
  // carry the old Stage 3 prompt text into the new specification's legacy notes.
  const pathway = normalizeResearchPathDraft(value);
  return createResearchPathStoredDocument(projectId, pathway);
}

export function readResearchPathStoredDocument(storage: StorageLike, projectId: string): ResearchPathStoredDocument {
  const current = storage.getItem(researchPathStorageKey(projectId));
  if (current) {
    try {
      return normalizeResearchPathStoredDocument(JSON.parse(current), projectId);
    } catch {
      // Fall through to the intact v1 draft if the new entry is malformed.
    }
  }

  const legacy = storage.getItem(researchPathStorageKey(projectId, 1));
  if (legacy) {
    try {
      return normalizeResearchPathStoredDocument(JSON.parse(legacy), projectId);
    } catch {
      return createResearchPathStoredDocument(projectId);
    }
  }

  return createResearchPathStoredDocument(projectId);
}

export function writeResearchPathStoredDocument(
  storage: StorageLike,
  projectId: string,
  pathway: ResearchPathDraft,
  studyDesign: StudyDesignDocument,
): void {
  storage.setItem(
    researchPathStorageKey(projectId),
    JSON.stringify({
      version: RESEARCH_PATH_STORAGE_VERSION,
      pathway,
      studyDesign,
    } satisfies ResearchPathStoredDocument),
  );
}
