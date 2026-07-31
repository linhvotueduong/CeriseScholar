export const RESEARCH_ARTIFACT_GRAPH_SCHEMA_VERSION = 1 as const;

export type ResearchArtifactKind =
  | "research-pathway"
  | "research-proposal"
  | "study-design"
  | "study-measures"
  | "participant-plan"
  | "study-build-profile"
  | "experiment-studio"
  | "consent-authority"
  | "consent-protocol"
  | "analysis-contract"
  | "pilot-candidate"
  | "governance-review"
  | "host-readiness"
  | "collection-authorization";

export type ResearchArtifactInvalidationAction =
  | "recompute"
  | "reconcile"
  | "reverify"
  | "refreeze"
  | "rereview";

export interface ResearchArtifactDependency {
  source: ResearchArtifactKind;
  target: ResearchArtifactKind;
  action: ResearchArtifactInvalidationAction;
  reason: string;
}

export interface ResearchArtifactGraph {
  schemaVersion: typeof RESEARCH_ARTIFACT_GRAPH_SCHEMA_VERSION;
  dependencies: ResearchArtifactDependency[];
}

export interface ResearchArtifactInvalidation {
  artifactKind: ResearchArtifactKind;
  action: ResearchArtifactInvalidationAction;
  changedSources: ResearchArtifactKind[];
  path: ResearchArtifactKind[];
  reason: string;
}

const ACTION_ORDER: Record<ResearchArtifactInvalidationAction, number> = {
  recompute: 0,
  reconcile: 1,
  reverify: 2,
  refreeze: 3,
  rereview: 4,
};

export const STAGE_3_RESEARCH_ARTIFACT_GRAPH: ResearchArtifactGraph = {
  schemaVersion: RESEARCH_ARTIFACT_GRAPH_SCHEMA_VERSION,
  dependencies: [
    { source: "research-pathway", target: "research-proposal", action: "reconcile", reason: "The proposal inherits the pathway and research direction." },
    { source: "research-proposal", target: "study-design", action: "reconcile", reason: "The design must remain aligned with the approved proposal." },
    { source: "research-proposal", target: "study-measures", action: "reconcile", reason: "Research questions and measures originate in the proposal." },
    { source: "research-proposal", target: "participant-plan", action: "reconcile", reason: "The population and evidence plan originate in the proposal." },
    { source: "study-design", target: "study-build-profile", action: "recompute", reason: "Design decisions determine methodological modules." },
    { source: "study-measures", target: "study-build-profile", action: "recompute", reason: "Measures determine evidence-producing modules and variables." },
    { source: "participant-plan", target: "study-build-profile", action: "recompute", reason: "Participant, assignment, access, and device needs constrain the build." },
    { source: "study-build-profile", target: "experiment-studio", action: "reconcile", reason: "The runnable Studio records accepted profile recommendations and overrides." },
    { source: "experiment-studio", target: "consent-protocol", action: "reconcile", reason: "Consent must describe the implemented participant procedure." },
    { source: "participant-plan", target: "consent-protocol", action: "recompute", reason: "Audience and access needs determine the required form set." },
    { source: "consent-authority", target: "consent-protocol", action: "reconcile", reason: "A template or policy update requires human reconciliation." },
    { source: "study-design", target: "analysis-contract", action: "reverify", reason: "The contract verifies the selected design and rationale." },
    { source: "study-measures", target: "analysis-contract", action: "reverify", reason: "The contract maps every research question and measure." },
    { source: "participant-plan", target: "analysis-contract", action: "reverify", reason: "The contract verifies sampling, assignment, and exclusions." },
    { source: "study-build-profile", target: "analysis-contract", action: "reverify", reason: "The contract records generated requirements and researcher overrides." },
    { source: "experiment-studio", target: "analysis-contract", action: "reverify", reason: "The contract verifies actual blocks, variables, and procedure." },
    { source: "consent-protocol", target: "analysis-contract", action: "reverify", reason: "Consent claims and decisions are part of the study contract." },
    { source: "experiment-studio", target: "pilot-candidate", action: "refreeze", reason: "A runnable-study change requires a new immutable candidate." },
    { source: "consent-protocol", target: "pilot-candidate", action: "refreeze", reason: "A consent change requires a new immutable candidate." },
    { source: "analysis-contract", target: "pilot-candidate", action: "refreeze", reason: "A contract change requires a new immutable candidate." },
    { source: "pilot-candidate", target: "governance-review", action: "rereview", reason: "Human review applies only to the exact candidate checksum." },
    { source: "pilot-candidate", target: "host-readiness", action: "reverify", reason: "Operational readiness applies only to the exact candidate checksum." },
    { source: "governance-review", target: "collection-authorization", action: "reverify", reason: "Collection requires applicable human approval." },
    { source: "host-readiness", target: "collection-authorization", action: "reverify", reason: "Collection requires independent operational readiness." },
  ],
};

export function validateResearchArtifactGraph(graph: ResearchArtifactGraph): string[] {
  const issues: string[] = [];
  if (graph.schemaVersion !== RESEARCH_ARTIFACT_GRAPH_SCHEMA_VERSION) {
    issues.push("unsupported-schema-version");
  }
  const edgeKeys = new Set<string>();
  for (const edge of graph.dependencies) {
    const key = `${edge.source}->${edge.target}`;
    if (edge.source === edge.target) issues.push(`self-dependency:${key}`);
    if (edgeKeys.has(key)) issues.push(`duplicate-dependency:${key}`);
    edgeKeys.add(key);
    if (!edge.reason.trim()) issues.push(`missing-reason:${key}`);
  }

  const visiting = new Set<ResearchArtifactKind>();
  const visited = new Set<ResearchArtifactKind>();
  const outgoing = new Map<ResearchArtifactKind, ResearchArtifactKind[]>();
  for (const edge of graph.dependencies) {
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target]);
  }
  function visit(node: ResearchArtifactKind): boolean {
    if (visiting.has(node)) return true;
    if (visited.has(node)) return false;
    visiting.add(node);
    for (const target of outgoing.get(node) ?? []) {
      if (visit(target)) return true;
    }
    visiting.delete(node);
    visited.add(node);
    return false;
  }
  for (const node of outgoing.keys()) {
    if (visit(node)) {
      issues.push("dependency-cycle");
      break;
    }
  }
  return issues.sort();
}

export function collectResearchArtifactInvalidations(
  changedSources: readonly ResearchArtifactKind[],
  graph: ResearchArtifactGraph = STAGE_3_RESEARCH_ARTIFACT_GRAPH,
): ResearchArtifactInvalidation[] {
  const graphIssues = validateResearchArtifactGraph(graph);
  if (graphIssues.length > 0) {
    throw new Error(`Research artifact graph is invalid: ${graphIssues.join(", ")}`);
  }
  const changed = [...new Set(changedSources)].sort();
  const outgoing = new Map<ResearchArtifactKind, ResearchArtifactDependency[]>();
  for (const edge of graph.dependencies) {
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge]);
  }

  const invalidations = new Map<ResearchArtifactKind, ResearchArtifactInvalidation>();
  const queue = changed.map((source) => ({ source, current: source, path: [source] as ResearchArtifactKind[] }));
  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) continue;
    for (const edge of outgoing.get(item.current) ?? []) {
      if (item.path.includes(edge.target)) continue;
      const path = [...item.path, edge.target];
      const current = invalidations.get(edge.target);
      const next: ResearchArtifactInvalidation = current
        ? {
            ...current,
            action: ACTION_ORDER[edge.action] > ACTION_ORDER[current.action] ? edge.action : current.action,
            changedSources: [...new Set([...current.changedSources, item.source])].sort(),
            path: path.length < current.path.length ? path : current.path,
            reason: path.length < current.path.length ? edge.reason : current.reason,
          }
        : {
            artifactKind: edge.target,
            action: edge.action,
            changedSources: [item.source],
            path,
            reason: edge.reason,
          };
      invalidations.set(edge.target, next);
      queue.push({ source: item.source, current: edge.target, path });
    }
  }

  return [...invalidations.values()]
    .filter((item) => !changed.includes(item.artifactKind))
    .sort((left, right) => (
      left.path.length - right.path.length
      || left.artifactKind.localeCompare(right.artifactKind)
    ));
}
