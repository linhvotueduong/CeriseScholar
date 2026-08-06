"use client";

import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from "react";
import { useProjectEvidenceAssessments } from "@/hooks/useProjectEvidenceAssessments";
import {
  PROPOSAL_COMPOSITION_SECTION_DEFINITIONS,
  compileProposalComposition,
  createProposalCompositionDraft,
  definitionForProposalSection,
  suggestedRequirementIds,
  type ProposalCompositionSectionKey,
} from "@/lib/research/proposalCompositionPhase6";
import { compileEvidenceReview } from "@/lib/research/proposalEvidencePhase3";
import { compileProposalSynthesis } from "@/lib/research/proposalSynthesisPhase4";
import { compileProposedStudyContract, type ProposalStudyQuestion, type ProposalStudyRoute } from "@/lib/research/proposalStudyContractPhase5";
import type {
  ProjectEvidenceAssessment,
  ProposalClaimEvidenceEntry,
  ProposalRequirement,
  ProposedStudyContractEntry,
  ResearchProposalDocument,
  ResearchProposalRevisionRecord,
  ResearchProposalSection,
} from "@/lib/research/researchProposalDocument";
import { ProposalCopilotPanel } from "./ProposalCopilotPanel";
import styles from "./Stage2ProposalCompositionPhase6.module.css";

interface ProposalComposerStudioProps {
  cloudUserId: string | null;
  document: ResearchProposalDocument;
  evidenceStrategyReady: boolean;
  onReadyChange: (ready: boolean) => void;
  onSave: (
    sections: ResearchProposalSection[],
    options?: { createdBy?: ResearchProposalRevisionRecord["createdBy"] },
  ) => Promise<ResearchProposalDocument>;
  onStatusChange: (status: string) => void;
  projectId: string;
  questions: ProposalStudyQuestion[];
  requirementsReady: boolean;
  route: ProposalStudyRoute;
}

function displayValue(value: string): string {
  return value.replaceAll("-", " ");
}

function toggle(values: readonly string[], value: string, selected: boolean): string[] {
  return selected ? [...new Set([...values, value])] : values.filter((item) => item !== value);
}

function appendText(current: string, value: string): string {
  return current.trim() ? `${current}\n\n${value}` : value;
}

function editableClaimNote(claim: ProposalClaimEvidenceEntry): string {
  const caveats = claim.caveats.length ? `\nBoundary: ${claim.caveats.join("; ")}` : "";
  return `${claim.text}${caveats}`;
}

function editableContractNote(entry: ProposedStudyContractEntry): string {
  return [
    `Research question: ${entry.questionId}`,
    `Purpose: ${entry.purpose}`,
    `Evidence needed: ${entry.evidenceNeed}`,
    `Population or source: ${entry.populationOrSource}`,
    `Proposed method direction: ${entry.proposedMethod}`,
    `Proposed analysis direction: ${entry.analysisDirection}`,
    `Remaining uncertainty: ${entry.uncertainty}`,
  ].join("\n");
}

function LinkRow({
  checked,
  children,
  label,
  onChange,
  onInsert,
}: {
  checked: boolean;
  children: ReactNode;
  label: string;
  onChange: (checked: boolean) => void;
  onInsert?: () => void;
}) {
  return (
    <article className={checked ? styles.linkRowSelected : styles.linkRow}>
      <label><input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" /><span>{label}</span></label>
      <div>{children}</div>
      {onInsert ? <button onClick={onInsert} type="button">Insert as editable note</button> : null}
    </article>
  );
}

function EvidenceSummary({ assessment }: { assessment: ProjectEvidenceAssessment }) {
  return <><strong>{assessment.sourceId}</strong><p>{assessment.decisionRationale || "No inclusion rationale recorded."}</p>{assessment.caveats.length ? <small>{assessment.caveats.join(" · ")}</small> : null}</>;
}

function RequirementSummary({ requirement, suggested }: { requirement: ProposalRequirement; suggested: boolean }) {
  return <><strong>{requirement.label}{requirement.required ? " · required" : ""}</strong><p>{requirement.description || "No description recorded."}</p>{suggested ? <small>Suggested for this section; researcher decides</small> : null}</>;
}

export function ProposalComposerStudio({
  cloudUserId,
  document,
  evidenceStrategyReady,
  onReadyChange,
  onSave,
  onStatusChange,
  projectId,
  questions,
  requirementsReady,
  route,
}: ProposalComposerStudioProps) {
  const ledger = useProjectEvidenceAssessments({ cloudUserId, onStatusChange, projectId, route });
  const [draft, setDraft] = useState<ResearchProposalSection[]>(() => createProposalCompositionDraft(document.sections));
  const [activeSectionId, setActiveSectionId] = useState<ProposalCompositionSectionKey>("proposal_background");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const deferredDraft = useDeferredValue(draft);
  const isChecking = deferredDraft !== draft;
  const activeSection = draft.find((section) => section.id === activeSectionId) ?? draft[0];
  const definition = definitionForProposalSection(activeSectionId);
  const assessmentById = useMemo(() => new Map(ledger.assessments.map((assessment) => [assessment.assessmentId, assessment])), [ledger.assessments]);
  const questionById = useMemo(() => new Map(questions.map((question) => [question.id, question])), [questions]);
  const includedAssessments = useMemo(() => ledger.assessments.filter((assessment) => assessment.status === "included"), [ledger.assessments]);
  const suggestedRequirements = useMemo(() => new Set(suggestedRequirementIds(definition, document.requirements)), [definition, document.requirements]);
  const evidenceReview = useMemo(() => compileEvidenceReview({ selectedQuestionIds: questions.map((question) => question.id), assessments: ledger.assessments }), [ledger.assessments, questions]);
  const synthesis = useMemo(() => compileProposalSynthesis({
    route,
    selectedQuestionIds: questions.map((question) => question.id),
    assessments: ledger.assessments,
    claimEvidenceMap: document.claimEvidenceMap,
    evidenceStrategyReady,
    evidenceReviewReady: evidenceReview.ready && ledger.conflicts.length === 0,
  }), [document.claimEvidenceMap, evidenceReview.ready, evidenceStrategyReady, ledger.assessments, ledger.conflicts.length, questions, route]);
  const contract = useMemo(() => compileProposedStudyContract({
    route,
    questions,
    claimEvidenceMap: document.claimEvidenceMap,
    contract: document.proposedStudyContract,
    synthesisReady: synthesis.ready && ledger.conflicts.length === 0,
  }), [document.claimEvidenceMap, document.proposedStudyContract, ledger.conflicts.length, questions, route, synthesis.ready]);
  const compiled = useMemo(() => compileProposalComposition({
    route,
    requirements: document.requirements,
    claimEvidenceMap: document.claimEvidenceMap,
    proposedStudyContract: document.proposedStudyContract,
    assessments: ledger.assessments,
    sections: deferredDraft,
    requirementsReady,
    synthesisReady: synthesis.ready && ledger.conflicts.length === 0,
    contractReady: contract.ready,
  }), [contract.ready, deferredDraft, document.claimEvidenceMap, document.proposedStudyContract, document.requirements, ledger.assessments, ledger.conflicts.length, requirementsReady, route, synthesis.ready]);
  const activeSummary = compiled.sectionSummaries.find((summary) => summary.sectionId === activeSectionId);
  const activeIssues = compiled.issues.filter((issue) => issue.sectionId === activeSectionId || issue.sectionId === null);
  const hasUnsavedChanges = useMemo(() => JSON.stringify(draft) !== JSON.stringify(document.sections), [document.sections, draft]);
  const copilotAssessments = useMemo(() => {
    const linked = new Set(activeSection?.sourceEvidenceAssessmentIds ?? []);
    return ledger.assessments.filter((assessment) => linked.has(assessment.assessmentId) && assessment.status === "included" && Boolean(assessment.reviewedAt));
  }, [activeSection?.sourceEvidenceAssessmentIds, ledger.assessments]);

  useEffect(() => onReadyChange(!ledger.loading && ledger.conflicts.length === 0 && !isChecking && compiled.ready), [compiled.ready, isChecking, ledger.conflicts.length, ledger.loading, onReadyChange]);

  const updateActive = (changes: Partial<ResearchProposalSection>, keepReviewed = false) => {
    setDraft((current) => current.map((section) => section.id === activeSectionId ? {
      ...section,
      ...changes,
      researcherReviewed: keepReviewed ? changes.researcherReviewed ?? section.researcherReviewed : false,
    } : section));
    setMessage(null);
  };

  const linkClaim = (claim: ProposalClaimEvidenceEntry, checked: boolean) => {
    if (!activeSection) return;
    const nextClaimIds = toggle(activeSection.sourceClaimIds ?? [], claim.id, checked);
    const supportingEvidence = checked
      ? claim.evidenceAssessmentIds.filter((id) => assessmentById.get(id)?.status === "included")
      : [];
    updateActive({
      sourceClaimIds: nextClaimIds,
      sourceEvidenceAssessmentIds: checked
        ? [...new Set([...(activeSection.sourceEvidenceAssessmentIds ?? []), ...supportingEvidence])]
        : activeSection.sourceEvidenceAssessmentIds ?? [],
    });
  };

  const insertClaim = (claim: ProposalClaimEvidenceEntry) => {
    linkClaim(claim, true);
    updateActive({ content: appendText(activeSection?.content ?? "", editableClaimNote(claim)) });
  };

  const insertContract = (entry: ProposedStudyContractEntry) => {
    if (!activeSection) return;
    updateActive({
      content: appendText(activeSection.content, editableContractNote(entry)),
      sourceContractEntryIds: toggle(activeSection.sourceContractEntryIds ?? [], entry.id, true),
    });
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await onSave(draft);
      setMessage(compiled.ready && !isChecking ? "Source-linked proposal saved and ready for verification." : "Proposal draft saved. Resolve the visible integrity items before verification.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The proposal could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.composer} data-testid="proposal-composer-studio">
      <header className={styles.phaseHeader}>
        <div><span>Build 2 · Phase 6</span><h2>Source-linked Proposal Composer</h2><p>Write the six canonical proposal sections while keeping claims, evidence, requirements, contract entries, citations, and unresolved support inspectable.</p></div>
        <div className={compiled.ready && !isChecking ? styles.readyBadge : styles.reviewBadge}>{isChecking ? "Checking…" : compiled.ready ? "Proposal composed" : "Review needed"}</div>
      </header>

      <section className={styles.profileBand}>
        <div><span>Selected profile</span><strong>{displayValue(document.requirements.purpose)}</strong></div>
        <dl><div><dt>Citation style</dt><dd>{document.requirements.citationStyle || "undetermined"}</dd></div><div><dt>Word limit</dt><dd>{document.requirements.maximumWords?.toLocaleString() ?? "No profile limit"}</dd></div><div><dt>Current words</dt><dd>{compiled.totalWords.toLocaleString()}</dd></div><div><dt>Requirements mapped</dt><dd>{compiled.coveredRequirementIds.length}/{document.requirements.requirements.length}</dd></div></dl>
      </section>

      <section className={styles.routeGuidance}><strong>Route-aware writing lens</strong><ul>{compiled.routePrompts.map((prompt) => <li key={prompt}>{prompt}</li>)}</ul></section>
      {ledger.conflicts.length ? <section className={styles.upstreamConflict} role="alert"><strong>Resolve Phase 3 source-review conflicts before this proposal can become ready.</strong></section> : null}

      <div className={styles.workspace}>
        <aside className={styles.sidebar}>
          <section className={styles.summaryGrid}><div><span>{compiled.sectionSummaries.filter((item) => item.ready).length}/6</span><small>Sections ready</small></div><div><span>{compiled.issues.filter((item) => item.severity === "blocking").length}</span><small>Blockers</small></div><div><span>{compiled.totalWords}</span><small>Words</small></div></section>
          <div className={styles.sidebarHeading}><span>Proposal sections</span><h3>Write and trace each section</h3></div>
          <nav className={styles.sectionList} aria-label="Proposal sections">{PROPOSAL_COMPOSITION_SECTION_DEFINITIONS.map((item, index) => {
            const summary = compiled.sectionSummaries.find((candidate) => candidate.sectionId === item.key);
            return <button aria-current={activeSectionId === item.key} key={item.key} onClick={() => { setActiveSectionId(item.key); setCopilotOpen(false); }} type="button"><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.label}</strong><small>{summary?.words ?? 0} words · {summary?.ready ? "ready" : "review"}</small></button>;
          })}</nav>
          <section className={styles.boundaryPanel}><span>Authorship boundary</span><p>Cerise exposes source material and deterministic starting notes. It does not invent, verify, or automatically approve proposal prose.</p></section>
        </aside>

        <main className={styles.main}>
          <header className={styles.sectionHeader}><div><span>Canonical section</span><h3>{definition.label}</h3><p>{definition.purpose}</p></div><div className={activeSummary?.ready ? styles.sectionReady : styles.sectionReview}>{activeSummary?.ready ? "Ready" : "Needs review"}</div></header>

          <section className={styles.editorPanel}>
            <div className={styles.editorMeta}><span>{activeSummary?.words ?? 0} words</span><span>{activeSection?.sourceClaimIds?.length ?? 0} claims</span><span>{activeSection?.sourceEvidenceAssessmentIds?.length ?? 0} evidence links</span><span>{activeSection?.sourceContractEntryIds?.length ?? 0} contract links</span><button aria-expanded={copilotOpen} className={styles.copilotButton} onClick={() => setCopilotOpen((value) => !value)} type="button">{copilotOpen ? "Hide Proposal Copilot" : "Open Proposal Copilot"}</button></div>
            <textarea aria-label={`${definition.label} content`} onChange={(event) => updateActive({ content: event.target.value })} placeholder={`Write the ${definition.label} in your own words. Use the source drawers below to trace or insert exact working notes.`} value={activeSection?.content ?? ""} />
          </section>

          {copilotOpen && activeSection ? <ProposalCopilotPanel
            cloudUserId={cloudUserId}
            document={document}
            eligibleAssessments={copilotAssessments}
            hasUnsavedChanges={hasUnsavedChanges}
            onClose={() => setCopilotOpen(false)}
            onSave={onSave}
            onStatusChange={onStatusChange}
            projectId={projectId}
            section={activeSection}
          /> : null}

          {definition.allowedClaimKinds.length ? <details className={styles.sourceDrawer} open><summary><span>Reviewed synthesis claims</span><small>{activeSection?.sourceClaimIds?.length ?? 0} linked</small></summary><div className={styles.drawerBody}>{document.claimEvidenceMap.claims.filter((claim) => definition.allowedClaimKinds.includes(claim.kind)).map((claim) => <LinkRow checked={activeSection?.sourceClaimIds?.includes(claim.id) ?? false} key={claim.id} label={`${displayValue(claim.kind)} · ${displayValue(claim.status)}`} onChange={(checked) => linkClaim(claim, checked)} onInsert={() => insertClaim(claim)}><strong>{claim.text}</strong>{claim.caveats.length ? <small>{claim.caveats.join(" · ")}</small> : null}</LinkRow>)}</div></details> : null}

          {definition.contractCoverage === "all" ? <details className={styles.sourceDrawer} open><summary><span>Proposed Study Contract</span><small>{activeSection?.sourceContractEntryIds?.length ?? 0}/{document.proposedStudyContract.entries.length} linked</small></summary><div className={styles.drawerBody}>{document.proposedStudyContract.entries.map((entry) => <LinkRow checked={activeSection?.sourceContractEntryIds?.includes(entry.id) ?? false} key={entry.id} label={questionById.get(entry.questionId)?.text || entry.questionId} onChange={(checked) => updateActive({ sourceContractEntryIds: toggle(activeSection?.sourceContractEntryIds ?? [], entry.id, checked) })} onInsert={() => insertContract(entry)}><strong>{entry.proposedMethod}</strong><p>{entry.analysisDirection}</p><small>{entry.uncertainty}</small></LinkRow>)}</div></details> : null}

          <details className={styles.sourceDrawer}><summary><span>Included evidence provenance</span><small>{activeSection?.sourceEvidenceAssessmentIds?.length ?? 0} linked</small></summary><div className={styles.drawerBody}>{includedAssessments.length ? includedAssessments.map((assessment) => <LinkRow checked={activeSection?.sourceEvidenceAssessmentIds?.includes(assessment.assessmentId) ?? false} key={assessment.assessmentId} label="Included source assessment" onChange={(checked) => updateActive({ sourceEvidenceAssessmentIds: toggle(activeSection?.sourceEvidenceAssessmentIds ?? [], assessment.assessmentId, checked) })}><EvidenceSummary assessment={assessment} /></LinkRow>) : <p>No currently included evidence assessment is available.</p>}</div></details>

          <details className={styles.sourceDrawer}><summary><span>Profile requirements</span><small>{activeSection?.requirementIds?.length ?? 0} mapped</small></summary><div className={styles.drawerBody}>{document.requirements.requirements.length ? document.requirements.requirements.map((requirement) => <LinkRow checked={activeSection?.requirementIds?.includes(requirement.id) ?? false} key={requirement.id} label={suggestedRequirements.has(requirement.id) ? "Suggested mapping" : "Available requirement"} onChange={(checked) => updateActive({ requirementIds: toggle(activeSection?.requirementIds ?? [], requirement.id, checked) })}><RequirementSummary requirement={requirement} suggested={suggestedRequirements.has(requirement.id)} /></LinkRow>) : <p>No requirement is recorded in the current profile.</p>}</div></details>

          <details className={styles.sourceDrawer}><summary><span>Citations, project knowledge, figures, and support limits</span><small>Advanced provenance</small></summary><div className={styles.metadataGrid}>
            <label><span>Citation keys or reference identifiers</span><small>One per line. Keep the full formatted reference in the References section prose.</small><textarea onChange={(event) => updateActive({ citationKeys: event.target.value.split("\n").map((value) => value.trim()).filter(Boolean) })} rows={5} value={(activeSection?.citationKeys ?? []).join("\n")} /></label>
            <label><span>Project knowledge entry IDs</span><small>One verified knowledge-entry ID per line.</small><textarea onChange={(event) => updateActive({ sourceKnowledgeEntryIds: event.target.value.split("\n").map((value) => value.trim()).filter(Boolean) })} rows={5} value={(activeSection?.sourceKnowledgeEntryIds ?? []).join("\n")} /></label>
            <label><span>Figure, table, or asset IDs</span><small>One registered asset ID per line; Phase 6 preserves links but does not create publication figures.</small><textarea onChange={(event) => updateActive({ sourceAssetIds: event.target.value.split("\n").map((value) => value.trim()).filter(Boolean) })} rows={5} value={(activeSection?.sourceAssetIds ?? []).join("\n")} /></label>
            <label><span>Unresolved support or wording limits</span><small>Record claims that remain unsupported, provisional, contested, or dependent on missing evidence.</small><textarea onChange={(event) => updateActive({ unresolvedSupportNotes: event.target.value })} rows={5} value={activeSection?.unresolvedSupportNotes ?? ""} /></label>
          </div></details>

          <section className={styles.reviewAction}><div><span>Researcher review</span><strong>{activeSection?.researcherReviewed ? "Reviewed against current prose and provenance" : "Review resets whenever prose or provenance changes"}</strong><p>Marking reviewed records only your inspection of this section. It is not factual verification, compliance, submission readiness, or funding approval.</p></div><button className={activeSection?.researcherReviewed ? styles.reviewedButton : styles.markReviewedButton} onClick={() => updateActive({ researcherReviewed: !activeSection?.researcherReviewed }, true)} type="button">{activeSection?.researcherReviewed ? "Reopen section" : "Mark section reviewed"}</button></section>

          <section className={styles.issuePanel} aria-live="polite"><div><span>Composition integrity</span><h3>Issues affecting this section or the whole proposal</h3></div>{activeIssues.length ? <div>{activeIssues.map((issue) => <article className={issue.severity === "blocking" ? styles.blockingIssue : styles.advisoryIssue} key={issue.id}><strong>{issue.severity}</strong><p>{issue.message}</p></article>)}</div> : <p className={styles.successText}>No unresolved composition issue applies to this section or the whole proposal.</p>}</section>

          <section className={styles.authorityPanel}><div><span>Guidance boundary</span><h3>Selected requirements control the proposal</h3><p>Generic funder and protocol sources help expose missing responsibilities. They cannot substitute for the current opportunity notice, institutional instructions, disciplinary judgment, or reviewer requirements.</p></div><div>{compiled.guidanceSources.map((source) => <a href={source.sourceUrl} key={source.id} rel="noreferrer" target="_blank"><strong>{source.name}</strong><small>{source.version}</small></a>)}</div></section>
        </main>
      </div>

      <footer className={styles.stickyFooter}><div><strong>{message ?? (compiled.ready && !isChecking ? "All six sections satisfy the current source-linked composition contract." : "Incomplete drafts may be saved; unresolved provenance and requirements remain visible.")}</strong><span>Stage 7 will verify and freeze the Stage 3 handoff. Stage 8—not this proposal—will compose the final publication manuscript.</span></div><button disabled={saving || ledger.loading} onClick={() => void save()} type="button">{saving ? "Saving…" : "Save source-linked proposal"}</button></footer>
    </div>
  );
}
