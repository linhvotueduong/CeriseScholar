export const RESEARCH_ARTIFACT_GRAPH_SCHEMA_VERSION = 1 as const;

export type ResearchArtifactKind =
  | "route-profile"
  | "research-pathway"
  | "evidence-library"
  | "project-evidence-assessment"
  | "research-proposal"
  | "proposal-handoff"
  | "reviewed-proposal-baseline"
  | "study-design"
  | "study-measures"
  | "participant-plan"
  | "study-build-profile"
  | "experiment-studio"
  | "consent-authority"
  | "consent-protocol"
  | "analysis-contract"
  | "pilot-candidate"
  | "pilot-evidence"
  | "governance-review"
  | "host-readiness"
  | "collection-authorization"
  | "recruitment-material"
  | "evidence-collection"
  | "imported-evidence"
  | "data-intake-audit"
  | "inclusion-ledger"
  | "prepared-dataset"
  | "data-quality-review"
  | "analysis-plan"
  | "analysis-execution"
  | "robustness-record"
  | "qualitative-analysis"
  | "analysis-results"
  | "interpretation-record"
  | "living-research-record"
  | "canonical-manuscript"
  | "research-asset"
  | "publication-template"
  | "publication-render"
  | "conference-poster"
  | "reproducibility-package"
  | "preservation-release";

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
    { source: "research-proposal", target: "proposal-handoff", action: "refreeze", reason: "A proposal change requires a new checksum-bound Stage 3 handoff." },
    { source: "project-evidence-assessment", target: "proposal-handoff", action: "refreeze", reason: "A project-specific evidence decision change requires a new Stage 3 handoff." },
    { source: "proposal-handoff", target: "reviewed-proposal-baseline", action: "rereview", reason: "Researcher review and advisory receipts apply only to the exact deterministic handoff checksum." },
    { source: "proposal-handoff", target: "study-design", action: "reconcile", reason: "The design must remain aligned with the exact verified proposal handoff." },
    { source: "proposal-handoff", target: "study-measures", action: "reconcile", reason: "Research questions, evidence needs, and measurement responsibilities originate in the verified handoff." },
    { source: "proposal-handoff", target: "participant-plan", action: "reconcile", reason: "Population, access, sensitivity, and feasibility responsibilities originate in the verified handoff." },
    { source: "reviewed-proposal-baseline", target: "study-design", action: "reconcile", reason: "Stage 3 design work must identify the exact researcher-reviewed proposal baseline." },
    { source: "reviewed-proposal-baseline", target: "study-measures", action: "reconcile", reason: "Measure planning must remain bound to the exact researcher-reviewed proposal baseline." },
    { source: "reviewed-proposal-baseline", target: "participant-plan", action: "reconcile", reason: "Participant or source planning must remain bound to the exact researcher-reviewed proposal baseline." },
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

/**
 * Cross-stage dependency graph. Stage 3 remains exported above for historical
 * callers and checksum-bound release behavior; new foundation consumers use
 * this complete graph explicitly.
 */
export const CERISE_RESEARCH_ARTIFACT_GRAPH: ResearchArtifactGraph = {
  schemaVersion: RESEARCH_ARTIFACT_GRAPH_SCHEMA_VERSION,
  dependencies: [
    { source: "route-profile", target: "research-pathway", action: "reconcile", reason: "The pathway must reflect the selected research intent and evidence route." },
    { source: "research-pathway", target: "evidence-library", action: "reconcile", reason: "Evidence selection must remain aligned with the current research question." },
    { source: "research-pathway", target: "project-evidence-assessment", action: "reconcile", reason: "Project-specific inclusion and relevance judgments must remain aligned with the current research question." },
    { source: "evidence-library", target: "project-evidence-assessment", action: "reverify", reason: "Project-specific assessment must be revisited when the checksum-bound source record changes." },
    { source: "project-evidence-assessment", target: "research-proposal", action: "reconcile", reason: "Proposal claims and gaps must be reconciled when a project-specific evidence judgment changes." },
    ...STAGE_3_RESEARCH_ARTIFACT_GRAPH.dependencies,
    { source: "route-profile", target: "study-build-profile", action: "recompute", reason: "Route and setting determine the applicable builder capabilities." },
    { source: "study-design", target: "recruitment-material", action: "reconcile", reason: "Recruitment claims must match the selected design and setting." },
    { source: "participant-plan", target: "recruitment-material", action: "reconcile", reason: "Recruitment content must match the intended population, eligibility, access, and accommodations." },
    { source: "consent-protocol", target: "recruitment-material", action: "reconcile", reason: "Recruitment language must remain consistent with participant-facing rights and study facts." },
    { source: "pilot-candidate", target: "pilot-evidence", action: "reverify", reason: "Pilot evidence is meaningful only for the exact candidate rehearsed." },
    { source: "pilot-evidence", target: "governance-review", action: "rereview", reason: "Human authorization must consider the current pilot findings when applicable." },
    { source: "recruitment-material", target: "governance-review", action: "rereview", reason: "Human review applies to the exact recruitment materials intended for use." },
    { source: "collection-authorization", target: "evidence-collection", action: "reverify", reason: "Primary collection must remain bound to the applicable authorization." },
    { source: "route-profile", target: "imported-evidence", action: "reconcile", reason: "Imported-data handling depends on the declared source and sensitivity route." },
    { source: "evidence-collection", target: "data-intake-audit", action: "reverify", reason: "Collected evidence manifests must be re-audited when collection changes." },
    { source: "imported-evidence", target: "data-intake-audit", action: "reverify", reason: "Imported evidence manifests must be re-audited when source packages change." },
    { source: "analysis-contract", target: "data-intake-audit", action: "reverify", reason: "Intake must match the current verified data and analysis contract." },
    { source: "data-intake-audit", target: "inclusion-ledger", action: "recompute", reason: "Inclusion decisions depend on verified source structure and integrity." },
    { source: "data-intake-audit", target: "prepared-dataset", action: "recompute", reason: "Preparation must start from the currently audited evidence." },
    { source: "inclusion-ledger", target: "prepared-dataset", action: "recompute", reason: "Preparation must apply the current documented inclusion and exclusion logic." },
    { source: "prepared-dataset", target: "data-quality-review", action: "reverify", reason: "Quality findings apply only to the exact prepared dataset." },
    { source: "analysis-contract", target: "analysis-plan", action: "reconcile", reason: "The executable plan must implement the current verified analysis contract." },
    { source: "data-quality-review", target: "analysis-plan", action: "reconcile", reason: "The plan must account for current missingness, quality, and assumption findings." },
    { source: "prepared-dataset", target: "analysis-execution", action: "recompute", reason: "Execution results are bound to the exact prepared dataset." },
    { source: "analysis-plan", target: "analysis-execution", action: "recompute", reason: "Execution must use the current method plan." },
    { source: "analysis-execution", target: "robustness-record", action: "recompute", reason: "Robustness evidence depends on the current primary analysis." },
    { source: "prepared-dataset", target: "qualitative-analysis", action: "recompute", reason: "Qualitative and mixed-method outputs depend on the current prepared evidence." },
    { source: "analysis-plan", target: "qualitative-analysis", action: "reconcile", reason: "Qualitative and integration procedures must match the current analysis plan." },
    { source: "analysis-execution", target: "analysis-results", action: "recompute", reason: "Results must reflect the current quantitative execution." },
    { source: "robustness-record", target: "analysis-results", action: "reconcile", reason: "Results claims must remain bounded by current sensitivity evidence." },
    { source: "qualitative-analysis", target: "analysis-results", action: "reconcile", reason: "Mixed-method and qualitative findings must be integrated into current results." },
    { source: "analysis-results", target: "interpretation-record", action: "reconcile", reason: "Interpretation must be revisited when verified findings change." },
    { source: "research-proposal", target: "living-research-record", action: "reconcile", reason: "The Living Research Record preserves the proposal knowledge and rationale." },
    { source: "study-design", target: "living-research-record", action: "reconcile", reason: "The Living Research Record preserves design decisions and rationale." },
    { source: "analysis-results", target: "living-research-record", action: "reconcile", reason: "The Living Research Record preserves verified findings and limitations." },
    { source: "interpretation-record", target: "living-research-record", action: "reconcile", reason: "The Living Research Record preserves current interpretations and claim boundaries." },
    { source: "living-research-record", target: "canonical-manuscript", action: "reconcile", reason: "Manuscript sections are composed from current, provenance-linked research knowledge." },
    { source: "analysis-results", target: "research-asset", action: "recompute", reason: "Analysis-origin figures and tables must match the current verified results." },
    { source: "evidence-library", target: "research-asset", action: "reconcile", reason: "Literature-origin assets require current citation, provenance, and rights metadata." },
    { source: "canonical-manuscript", target: "publication-render", action: "refreeze", reason: "A manuscript change requires a new formatted render." },
    { source: "publication-template", target: "publication-render", action: "refreeze", reason: "A template-version change requires a new formatted render." },
    { source: "research-asset", target: "publication-render", action: "refreeze", reason: "A referenced figure or table change requires a new formatted render." },
    { source: "canonical-manuscript", target: "conference-poster", action: "reconcile", reason: "Poster claims and narrative must reflect the current manuscript." },
    { source: "research-asset", target: "conference-poster", action: "reconcile", reason: "Poster visuals must use current, rights-cleared assets." },
    { source: "analysis-plan", target: "reproducibility-package", action: "refreeze", reason: "The reproducibility package must contain the current permitted analysis plan." },
    { source: "analysis-execution", target: "reproducibility-package", action: "refreeze", reason: "The reproducibility package must identify the current execution outputs." },
    { source: "publication-render", target: "preservation-release", action: "refreeze", reason: "The preserved release must contain the current formatted publication." },
    { source: "conference-poster", target: "preservation-release", action: "refreeze", reason: "The preserved release must contain the current poster when applicable." },
    { source: "reproducibility-package", target: "preservation-release", action: "refreeze", reason: "The preserved release must contain the current permitted reproducibility package." },
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
