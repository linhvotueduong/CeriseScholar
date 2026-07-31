import {
  canonicalArtifactJson,
  canonicalJson,
  createResearchArtifactIdentity,
  sha256ArtifactChecksum,
  type CanonicalArtifactLimits,
  type ResearchArtifactChecksum,
  type ResearchArtifactIdentity,
  type ResearchArtifactReference,
} from "./artifactIdentity";

export const MAX_RESEARCH_ARTIFACT_ISSUES = 500;
export const MAX_RESEARCH_ARTIFACT_CHANGES = 500;
export const MAX_RESEARCH_ARTIFACT_ISSUE_TEXT = 2_000;

export type ResearchArtifactIssueSeverity = "blocking" | "warning" | "advisory";
export type ResearchArtifactChangeKind = "added" | "removed" | "changed";
export type ResearchArtifactApplyDecision = "accept" | "decline" | "defer";

export interface ResearchArtifactIssue {
  id: string;
  severity: ResearchArtifactIssueSeverity;
  category: string;
  message: string;
  repairTarget: string;
  sourceReferences: ResearchArtifactReference[];
}

export interface ResearchArtifactCompiler<TInput, TOutput> {
  compilerId: string;
  compilerVersion: number;
  artifactKind: string;
  artifactSchemaVersion: number;
  normalizeInput: (value: unknown) => TInput | null;
  compile: (input: TInput) => TOutput;
  collectIssues?: (output: TOutput, input: TInput) => readonly ResearchArtifactIssue[];
}

export interface ResearchArtifactCompilation<TInput, TOutput> {
  compiler: {
    id: string;
    version: number;
  };
  input: TInput;
  output: TOutput;
  identity: ResearchArtifactIdentity;
  issues: ResearchArtifactIssue[];
  readiness: {
    status: "blocked" | "review" | "ready";
    blocking: number;
    warning: number;
    advisory: number;
  };
}

export interface ResearchArtifactSemanticChange {
  id: string;
  kind: ResearchArtifactChangeKind;
  path: string;
  beforeChecksum: ResearchArtifactChecksum;
  afterChecksum: ResearchArtifactChecksum;
}

export interface ResearchArtifactChangeDecision {
  changeId: string;
  decision: ResearchArtifactApplyDecision;
  reason: string;
}

export interface ResearchArtifactApplyPreview {
  currentChecksum: ResearchArtifactChecksum;
  candidateChecksum: ResearchArtifactChecksum;
  changes: Array<ResearchArtifactSemanticChange & {
    decision: ResearchArtifactApplyDecision;
    reason: string;
  }>;
  summary: {
    accepted: number;
    declined: number;
    deferred: number;
  };
  canApplyWholeCandidate: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanToken(value: string, maximum: number): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9.:-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, maximum);
}

function cleanText(value: string, maximum = MAX_RESEARCH_ARTIFACT_ISSUE_TEXT): string {
  return value.trim().replace(/\s+/g, " ").slice(0, maximum);
}

function issueOrder(severity: ResearchArtifactIssueSeverity): number {
  return severity === "blocking" ? 0 : severity === "warning" ? 1 : 2;
}

export function normalizeResearchArtifactIssues(
  issues: readonly ResearchArtifactIssue[],
): ResearchArtifactIssue[] {
  const bounded = new Map<string, ResearchArtifactIssue>();
  for (const issue of issues.slice(0, MAX_RESEARCH_ARTIFACT_ISSUES)) {
    const id = cleanToken(issue.id, 160);
    const category = cleanToken(issue.category, 80);
    const repairTarget = cleanToken(issue.repairTarget, 160);
    const message = cleanText(issue.message);
    if (!id || !category || !repairTarget || !message) continue;
    const sources = issue.sourceReferences
      .slice(0, 64)
      .map((source) => ({ ...source }))
      .sort((left, right) => (
        left.artifactKind.localeCompare(right.artifactKind)
        || left.artifactId.localeCompare(right.artifactId)
      ));
    bounded.set(id, {
      id,
      severity: issue.severity,
      category,
      message,
      repairTarget,
      sourceReferences: sources,
    });
  }
  return [...bounded.values()].sort((left, right) => (
    issueOrder(left.severity) - issueOrder(right.severity)
    || left.id.localeCompare(right.id)
  ));
}

function readiness(issues: readonly ResearchArtifactIssue[]) {
  const counts = issues.reduce((result, issue) => {
    result[issue.severity] += 1;
    return result;
  }, { blocking: 0, warning: 0, advisory: 0 });
  return {
    status: counts.blocking > 0 ? "blocked" as const : counts.warning > 0 ? "review" as const : "ready" as const,
    ...counts,
  };
}

export async function runResearchArtifactCompiler<TInput, TOutput>(
  compiler: ResearchArtifactCompiler<TInput, TOutput>,
  rawInput: unknown,
  artifactId: string,
  sources: readonly ResearchArtifactReference[] = [],
  limits: CanonicalArtifactLimits = {},
): Promise<ResearchArtifactCompilation<TInput, TOutput>> {
  if (!Number.isSafeInteger(compiler.compilerVersion) || compiler.compilerVersion < 1) {
    throw new Error("Research artifact compiler version is invalid.");
  }
  canonicalArtifactJson(rawInput, limits);
  const input = compiler.normalizeInput(rawInput);
  if (input === null) throw new Error("Research artifact compiler input is invalid.");
  canonicalArtifactJson(input, limits);

  const output = compiler.compile(input);
  canonicalArtifactJson(output, limits);
  const issues = normalizeResearchArtifactIssues(compiler.collectIssues?.(output, input) ?? []);
  const identity = await createResearchArtifactIdentity({
    artifactKind: compiler.artifactKind,
    artifactId,
    artifactSchemaVersion: compiler.artifactSchemaVersion,
    payload: output,
    sources,
    limits,
  });

  return {
    compiler: { id: compiler.compilerId, version: compiler.compilerVersion },
    input,
    output,
    identity,
    issues,
    readiness: readiness(issues),
  };
}

function pathToken(value: string): string {
  return value.replace(/~/g, "~0").replace(/\//g, "~1");
}

function changeKind(beforeExists: boolean, afterExists: boolean): ResearchArtifactChangeKind {
  if (!beforeExists) return "added";
  if (!afterExists) return "removed";
  return "changed";
}

async function valueChecksum(value: unknown, exists: boolean): Promise<ResearchArtifactChecksum> {
  return sha256ArtifactChecksum(exists ? { state: "present", value } : { state: "missing" });
}

export async function diffResearchArtifacts(
  before: unknown,
  after: unknown,
  maximumChanges = MAX_RESEARCH_ARTIFACT_CHANGES,
): Promise<ResearchArtifactSemanticChange[]> {
  canonicalArtifactJson(before);
  canonicalArtifactJson(after);
  const boundedMaximum = Number.isSafeInteger(maximumChanges) && maximumChanges > 0
    ? Math.min(maximumChanges, MAX_RESEARCH_ARTIFACT_CHANGES)
    : MAX_RESEARCH_ARTIFACT_CHANGES;
  const changes: ResearchArtifactSemanticChange[] = [];

  async function visit(
    left: unknown,
    right: unknown,
    path: string,
    leftExists = true,
    rightExists = true,
  ): Promise<void> {
    if (changes.length >= boundedMaximum) return;
    if (leftExists && rightExists && canonicalJson(left) === canonicalJson(right)) return;

    if (leftExists && rightExists && isRecord(left) && isRecord(right)) {
      const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
      for (const key of keys) {
        await visit(
          left[key],
          right[key],
          `${path}/${pathToken(key)}`,
          Object.prototype.hasOwnProperty.call(left, key),
          Object.prototype.hasOwnProperty.call(right, key),
        );
        if (changes.length >= boundedMaximum) break;
      }
      return;
    }
    if (leftExists && rightExists && Array.isArray(left) && Array.isArray(right)) {
      const length = Math.max(left.length, right.length);
      for (let index = 0; index < length; index += 1) {
        await visit(left[index], right[index], `${path}/${index}`, index < left.length, index < right.length);
        if (changes.length >= boundedMaximum) break;
      }
      return;
    }

    const kind = changeKind(leftExists, rightExists);
    const normalizedPath = path || "/";
    changes.push({
      id: `${kind}:${normalizedPath}`,
      kind,
      path: normalizedPath,
      beforeChecksum: await valueChecksum(left, leftExists),
      afterChecksum: await valueChecksum(right, rightExists),
    });
  }

  await visit(before, after, "");
  return changes;
}

export async function createResearchArtifactApplyPreview(
  current: unknown,
  candidate: unknown,
  decisions: readonly ResearchArtifactChangeDecision[],
): Promise<ResearchArtifactApplyPreview> {
  const changes = await diffResearchArtifacts(current, candidate);
  const knownIds = new Set(changes.map((change) => change.id));
  const decisionMap = new Map<string, ResearchArtifactChangeDecision>();
  for (const decision of decisions.slice(0, MAX_RESEARCH_ARTIFACT_CHANGES)) {
    if (!knownIds.has(decision.changeId) || decisionMap.has(decision.changeId)) continue;
    decisionMap.set(decision.changeId, {
      changeId: decision.changeId,
      decision: decision.decision,
      reason: cleanText(decision.reason, 1_000),
    });
  }
  const resolved = changes.map((change) => {
    const decision = decisionMap.get(change.id);
    return {
      ...change,
      decision: decision?.decision ?? "defer" as const,
      reason: decision?.reason ?? "",
    };
  });
  const summary = resolved.reduce((result, change) => {
    if (change.decision === "accept") result.accepted += 1;
    else if (change.decision === "decline") result.declined += 1;
    else result.deferred += 1;
    return result;
  }, { accepted: 0, declined: 0, deferred: 0 });

  return {
    currentChecksum: await sha256ArtifactChecksum(current),
    candidateChecksum: await sha256ArtifactChecksum(candidate),
    changes: resolved,
    summary,
    canApplyWholeCandidate: changes.length > 0
      && summary.accepted === changes.length
      && resolved.every((change) => change.reason.length > 0),
  };
}
