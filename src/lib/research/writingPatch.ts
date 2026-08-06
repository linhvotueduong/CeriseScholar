import {
  createCanonicalManuscript,
  createManuscriptNode,
  type CanonicalManuscript,
  type ManuscriptNode,
} from "./canonicalManuscript";
import {
  isResearchArtifactChecksum,
  sha256ArtifactChecksum,
  type ResearchArtifactChecksum,
  type ResearchArtifactReference,
} from "./artifactIdentity";

export const WRITING_PATCH_SCHEMA_VERSION = 1 as const;
export const MAX_WRITING_PATCH_OPERATIONS = 200;

export type WritingPatchOperation =
  | { id: string; kind: "insert-node"; sectionId: string; afterNodeId: string | null; node: ManuscriptNode }
  | { id: string; kind: "replace-node"; sectionId: string; nodeId: string; node: ManuscriptNode }
  | { id: string; kind: "remove-node"; sectionId: string; nodeId: string };
export type WritingPatchDecision = "accept" | "decline" | "defer";

export interface WritingPatch {
  schemaVersion: typeof WRITING_PATCH_SCHEMA_VERSION;
  id: string;
  projectId: string;
  baseManuscriptChecksum: ResearchArtifactChecksum;
  summary: string;
  proposer: "researcher" | "ai-assistant";
  operations: WritingPatchOperation[];
  sourceReferences: ResearchArtifactReference[];
  proposedAt: string;
  checksum: ResearchArtifactChecksum;
  claim: "review-before-apply-writing-proposal-not-authorship-approval-or-factual-verification";
}

export interface WritingPatchOperationDecision {
  operationId: string;
  decision: WritingPatchDecision;
  reason: string;
}

export interface WritingPatchPreview {
  patchChecksum: ResearchArtifactChecksum;
  baseMatches: boolean;
  operations: Array<WritingPatchOperation & { decision: WritingPatchDecision; reason: string }>;
  canApply: boolean;
}

const TOKEN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;

function token(value: string, label: string): string {
  if (!TOKEN_PATTERN.test(value)) throw new Error(`${label} is invalid.`);
  return value;
}

function patchPayload(patch: Omit<WritingPatch, "checksum">) {
  return patch;
}

export async function createWritingPatch(
  input: Omit<WritingPatch, "schemaVersion" | "checksum" | "claim">,
): Promise<WritingPatch> {
  if (input.operations.length === 0 || input.operations.length > MAX_WRITING_PATCH_OPERATIONS) {
    throw new Error("Writing patch must contain a bounded set of operations.");
  }
  if (!isResearchArtifactChecksum(input.baseManuscriptChecksum)) {
    throw new Error("Writing patch base manuscript checksum is invalid.");
  }
  const operationIds = new Set<string>();
  const operations = input.operations.map((operation) => {
    token(operation.id, "Writing patch operation ID");
    token(operation.sectionId, "Writing patch section ID");
    if (operationIds.has(operation.id)) throw new Error(`Duplicate writing patch operation: ${operation.id}`);
    operationIds.add(operation.id);
    if (operation.kind === "insert-node") return { ...operation, node: createManuscriptNode(operation.node) };
    if (operation.kind === "replace-node") return { ...operation, nodeId: token(operation.nodeId, "Manuscript node ID"), node: createManuscriptNode(operation.node) };
    return { ...operation, nodeId: token(operation.nodeId, "Manuscript node ID") };
  });
  const core: Omit<WritingPatch, "checksum"> = {
    schemaVersion: WRITING_PATCH_SCHEMA_VERSION,
    ...input,
    id: token(input.id, "Writing patch ID"),
    projectId: token(input.projectId, "Writing patch project ID"),
    summary: input.summary.trim().slice(0, 2_000),
    operations,
    sourceReferences: [...input.sourceReferences].sort((left, right) => (
      left.artifactKind.localeCompare(right.artifactKind) || left.artifactId.localeCompare(right.artifactId)
    )),
    proposedAt: new Date(input.proposedAt).toISOString(),
    claim: "review-before-apply-writing-proposal-not-authorship-approval-or-factual-verification",
  };
  return { ...core, checksum: await sha256ArtifactChecksum(patchPayload(core)) };
}

export async function verifyWritingPatch(patch: WritingPatch): Promise<boolean> {
  const { checksum, ...core } = patch;
  return isResearchArtifactChecksum(checksum)
    && checksum === await sha256ArtifactChecksum(patchPayload(core));
}

export function previewWritingPatch(
  manuscript: CanonicalManuscript,
  patch: WritingPatch,
  decisions: readonly WritingPatchOperationDecision[],
): WritingPatchPreview {
  const decisionMap = new Map(decisions.map((item) => [item.operationId, item]));
  const operations = patch.operations.map((operation) => {
    const selected = decisionMap.get(operation.id);
    return { ...operation, decision: selected?.decision ?? "defer" as const, reason: selected?.reason.trim().slice(0, 1_000) ?? "" };
  });
  const baseMatches = manuscript.identity.checksum === patch.baseManuscriptChecksum;
  return {
    patchChecksum: patch.checksum,
    baseMatches,
    operations,
    canApply: baseMatches
      && operations.some((operation) => operation.decision === "accept")
      && operations.every((operation) => operation.decision !== "defer" && operation.reason.length > 0),
  };
}

export async function applyWritingPatch(
  manuscript: CanonicalManuscript,
  patch: WritingPatch,
  decisions: readonly WritingPatchOperationDecision[],
  appliedAt: string,
): Promise<CanonicalManuscript> {
  if (manuscript.projectId !== patch.projectId) throw new Error("Writing patch belongs to a different project.");
  if (!await verifyWritingPatch(patch)) throw new Error("Writing patch contents do not match its checksum.");
  const preview = previewWritingPatch(manuscript, patch, decisions);
  if (!preview.baseMatches) throw new Error("Writing patch is stale because the manuscript checksum changed.");
  if (!preview.canApply) throw new Error("Every writing patch operation requires an explicit decision and reason.");
  const accepted = new Set(preview.operations.filter((item) => item.decision === "accept").map((item) => item.id));
  const sections = manuscript.sections.map((section) => ({ ...section, nodes: [...section.nodes] }));
  for (const operation of patch.operations) {
    if (!accepted.has(operation.id)) continue;
    const section = sections.find((candidate) => candidate.id === operation.sectionId);
    if (!section) throw new Error(`Writing patch section no longer exists: ${operation.sectionId}`);
    if (operation.kind === "insert-node") {
      if (operation.afterNodeId === null) section.nodes.unshift(operation.node);
      else {
        const index = section.nodes.findIndex((node) => node.id === operation.afterNodeId);
        if (index < 0) throw new Error(`Writing patch anchor no longer exists: ${operation.afterNodeId}`);
        section.nodes.splice(index + 1, 0, operation.node);
      }
    } else {
      const index = section.nodes.findIndex((node) => node.id === operation.nodeId);
      if (index < 0) throw new Error(`Writing patch target no longer exists: ${operation.nodeId}`);
      if (operation.kind === "replace-node") section.nodes[index] = operation.node;
      else section.nodes.splice(index, 1);
    }
  }
  return createCanonicalManuscript({
    projectId: manuscript.projectId,
    title: manuscript.title,
    language: manuscript.language,
    revision: manuscript.revision + 1,
    sections,
    revisionHistory: [
      ...manuscript.revisionHistory,
      {
        revision: manuscript.revision + 1,
        previousChecksum: manuscript.identity.checksum,
        appliedPatchId: patch.id,
        createdAt: new Date(appliedAt).toISOString(),
        createdBy: patch.proposer === "ai-assistant" ? "reviewed-ai-patch" : "researcher",
      },
    ],
    sources: patch.sourceReferences,
  });
}
