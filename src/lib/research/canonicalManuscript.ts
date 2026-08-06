import {
  createResearchArtifactIdentity,
  verifyResearchArtifactIdentity,
  type ResearchArtifactIdentity,
  type ResearchArtifactReference,
} from "./artifactIdentity";
import type { PaperSection } from "../../types/paper-section";

export const CANONICAL_MANUSCRIPT_SCHEMA_VERSION = 1 as const;
export const MAX_MANUSCRIPT_SECTIONS = 100;
export const MAX_MANUSCRIPT_NODES = 20_000;
export const MAX_MANUSCRIPT_NODE_TEXT = 100_000;

export type ManuscriptNodeKind =
  | "paragraph"
  | "heading"
  | "list"
  | "quote"
  | "equation"
  | "citation-group"
  | "figure-reference"
  | "table-reference"
  | "supplement-reference";

export interface ManuscriptNode {
  id: string;
  kind: ManuscriptNodeKind;
  text: string;
  level: number | null;
  referenceIds: string[];
  sourceKnowledgeEntryIds: string[];
  sourceAssetIds: string[];
}

export interface ManuscriptSection {
  id: string;
  title: string;
  role: string;
  nodes: ManuscriptNode[];
}

export interface ManuscriptRevisionRecord {
  revision: number;
  previousChecksum: string | null;
  appliedPatchId: string | null;
  createdAt: string;
  createdBy: "legacy-import" | "researcher" | "reviewed-ai-patch" | "system-migration";
}

export interface CanonicalManuscript {
  schemaVersion: typeof CANONICAL_MANUSCRIPT_SCHEMA_VERSION;
  projectId: string;
  title: string;
  language: string;
  revision: number;
  sections: ManuscriptSection[];
  revisionHistory: ManuscriptRevisionRecord[];
  identity: ResearchArtifactIdentity;
  participantDataIncluded: false;
  claim: "venue-neutral-manuscript-not-publication-acceptance-or-submission-certification";
}

export interface CreateCanonicalManuscriptInput {
  projectId: string;
  title: string;
  language?: string;
  sections: readonly ManuscriptSection[];
  revision?: number;
  revisionHistory?: readonly ManuscriptRevisionRecord[];
  sources?: readonly ResearchArtifactReference[];
}

const NODE_KINDS: readonly ManuscriptNodeKind[] = [
  "paragraph", "heading", "list", "quote", "equation", "citation-group",
  "figure-reference", "table-reference", "supplement-reference",
];
const TOKEN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;

function token(value: string, label: string): string {
  if (!TOKEN_PATTERN.test(value)) throw new Error(`${label} is invalid.`);
  return value;
}

function boundedText(value: string, maximum: number, label: string, allowEmpty = true): string {
  if (typeof value !== "string" || value.length > maximum || (!allowEmpty && !value.trim())) {
    throw new Error(`${label} is invalid or exceeds its size boundary.`);
  }
  return value;
}

function normalizeStringIds(values: readonly string[], label: string): string[] {
  return [...new Set(values.map((value) => token(value, label)))].sort();
}

export function createManuscriptNode(input: ManuscriptNode): ManuscriptNode {
  if (!NODE_KINDS.includes(input.kind)) throw new Error("Manuscript node kind is invalid.");
  const level = input.kind === "heading"
    ? Math.min(6, Math.max(1, Math.trunc(input.level ?? 1)))
    : null;
  if ((input.kind === "figure-reference" || input.kind === "table-reference" || input.kind === "supplement-reference") && input.sourceAssetIds.length === 0) {
    throw new Error("Asset reference nodes must identify at least one registered asset.");
  }
  return {
    id: token(input.id, "Manuscript node ID"),
    kind: input.kind,
    text: boundedText(input.text, MAX_MANUSCRIPT_NODE_TEXT, "Manuscript node text"),
    level,
    referenceIds: normalizeStringIds(input.referenceIds, "Reference ID"),
    sourceKnowledgeEntryIds: normalizeStringIds(input.sourceKnowledgeEntryIds, "Knowledge entry ID"),
    sourceAssetIds: normalizeStringIds(input.sourceAssetIds, "Asset ID"),
  };
}

export function canonicalManuscriptPayload(manuscript: Omit<CanonicalManuscript, "identity">) {
  return manuscript;
}

export async function createCanonicalManuscript(
  input: CreateCanonicalManuscriptInput,
): Promise<CanonicalManuscript> {
  const projectId = token(input.projectId, "Manuscript project ID");
  if (input.sections.length > MAX_MANUSCRIPT_SECTIONS) throw new Error("Manuscript section limit exceeded.");
  const sectionIds = new Set<string>();
  const nodeIds = new Set<string>();
  let nodeCount = 0;
  const sections = input.sections.map((section) => {
    const id = token(section.id, "Manuscript section ID");
    if (sectionIds.has(id)) throw new Error(`Duplicate manuscript section: ${id}`);
    sectionIds.add(id);
    const nodes = section.nodes.map((node) => {
      const normalized = createManuscriptNode(node);
      if (nodeIds.has(normalized.id)) throw new Error(`Duplicate manuscript node: ${normalized.id}`);
      nodeIds.add(normalized.id);
      nodeCount += 1;
      return normalized;
    });
    return {
      id,
      title: boundedText(section.title, 500, "Manuscript section title", false),
      role: token(section.role, "Manuscript section role"),
      nodes,
    };
  });
  if (nodeCount > MAX_MANUSCRIPT_NODES) throw new Error("Manuscript node limit exceeded.");
  const revision = Math.max(1, Math.trunc(input.revision ?? 1));
  const revisionHistory = [...(input.revisionHistory ?? [])];
  if (revisionHistory.some((item, index) => (
    item.revision < 1
    || item.revision > revision
    || (index > 0 && item.revision <= revisionHistory[index - 1].revision)
  ))) {
    throw new Error("Manuscript revision history must be strictly ordered and within the current revision.");
  }
  const core: Omit<CanonicalManuscript, "identity"> = {
    schemaVersion: CANONICAL_MANUSCRIPT_SCHEMA_VERSION,
    projectId,
    title: boundedText(input.title, 1_000, "Manuscript title", true),
    language: boundedText(input.language ?? "en-US", 35, "Manuscript language", false),
    revision,
    sections,
    revisionHistory,
    participantDataIncluded: false,
    claim: "venue-neutral-manuscript-not-publication-acceptance-or-submission-certification",
  };
  return {
    ...core,
    identity: await createResearchArtifactIdentity({
      artifactKind: "canonical-manuscript",
      artifactId: `manuscript-${projectId}-r${revision}`,
      artifactSchemaVersion: CANONICAL_MANUSCRIPT_SCHEMA_VERSION,
      payload: canonicalManuscriptPayload(core),
      sources: input.sources ?? [],
    }),
  };
}

export async function verifyCanonicalManuscript(manuscript: CanonicalManuscript): Promise<boolean> {
  const { identity, ...core } = manuscript;
  return verifyResearchArtifactIdentity(identity, canonicalManuscriptPayload(core));
}

/**
 * Lossless bridge from the current plain paper_sections rows. Every legacy
 * string becomes one paragraph node with its original bytes unchanged.
 */
export async function importLegacyPaperSections(
  projectId: string,
  title: string,
  rows: readonly Pick<PaperSection, "section_key" | "content" | "updated_at">[],
  importedAt: string,
): Promise<CanonicalManuscript> {
  const orderedRows = [...rows].sort((left, right) => left.section_key.localeCompare(right.section_key));
  return createCanonicalManuscript({
    projectId,
    title,
    sections: orderedRows.map((row) => ({
      id: row.section_key.replace(/[^A-Za-z0-9._:-]/g, "-") || "legacy-section",
      title: row.section_key.replace(/_/g, " "),
      role: row.section_key.replace(/[^A-Za-z0-9._:-]/g, "-") || "legacy",
      nodes: [{
        id: `legacy-${row.section_key.replace(/[^A-Za-z0-9._:-]/g, "-") || "section"}`,
        kind: "paragraph",
        text: row.content,
        level: null,
        referenceIds: [],
        sourceKnowledgeEntryIds: [],
        sourceAssetIds: [],
      }],
    })),
    revisionHistory: [{
      revision: 1,
      previousChecksum: null,
      appliedPatchId: null,
      createdAt: new Date(importedAt).toISOString(),
      createdBy: "legacy-import",
    }],
  });
}

export function exportLegacyPaperSections(
  manuscript: CanonicalManuscript,
): Array<{ section_key: string; content: string }> {
  return manuscript.sections.map((section) => ({
    section_key: section.id,
    content: section.nodes.map((node) => node.text).join("\n\n"),
  }));
}
