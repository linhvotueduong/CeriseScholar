"use client";

import { useEffect, useMemo, useState } from "react";
import { useEvidenceLibrary } from "@/hooks/useEvidenceLibrary";
import { useProjectEvidenceAssessments } from "@/hooks/useProjectEvidenceAssessments";
import {
  PROPOSAL_CLAIM_KIND_DEFINITIONS,
  compileProposalSynthesis,
  createClaimEvidenceMap,
  createProposalClaim,
  type ProposalSynthesisRoute,
} from "@/lib/research/proposalSynthesisPhase4";
import { compileEvidenceReview } from "@/lib/research/proposalEvidencePhase3";
import type {
  ClaimEvidenceMap,
  ProposalClaimEvidenceEntry,
  ProposalClaimKind,
  ProposalClaimStatus,
} from "@/lib/research/researchProposalDocument";
import type { ProposalEvidenceQuestion } from "./ProposalEvidenceStrategyStudio";
import styles from "./Stage2SynthesisPhase4.module.css";

interface ProposalSynthesisStudioProps {
  claimEvidenceMap: ClaimEvidenceMap;
  cloudUserId: string | null;
  evidenceStrategyReady: boolean;
  onReadyChange: (ready: boolean) => void;
  onSave: (map: ClaimEvidenceMap) => Promise<void>;
  onStatusChange: (status: string) => void;
  projectId: string;
  questions: ProposalEvidenceQuestion[];
  route: ProposalSynthesisRoute;
}

const STATUS_OPTIONS: Array<[ProposalClaimStatus, string]> = [
  ["draft", "Draft — not reviewed"],
  ["supported", "Supported within the linked evidence"],
  ["contested", "Contested or divergent"],
  ["unsupported", "Not currently supported"],
  ["researcher-reviewed", "Researcher reviewed"],
];

function sourceTitle(title: string | null | undefined, assessmentId: string): string {
  return title?.trim() || `Evidence assessment ${assessmentId}`;
}

function newlineValues(value: string): string[] {
  return [...new Set(value.split("\n").map((item) => item.trim()).filter(Boolean))];
}

function statusLabel(status: ProposalClaimStatus): string {
  return STATUS_OPTIONS.find(([value]) => value === status)?.[1] ?? status;
}

function claimKindLabel(kind: ProposalClaimKind): string {
  return PROPOSAL_CLAIM_KIND_DEFINITIONS.find((item) => item.id === kind)?.label ?? kind;
}

function updateClaim(
  claims: readonly ProposalClaimEvidenceEntry[],
  claimId: string,
  edit: (claim: ProposalClaimEvidenceEntry) => ProposalClaimEvidenceEntry,
): ProposalClaimEvidenceEntry[] {
  return claims.map((claim) => claim.id === claimId ? edit(claim) : claim);
}

function ClaimEditor({
  claim,
  evidence,
  onChange,
  onRemove,
  questions,
}: {
  claim: ProposalClaimEvidenceEntry;
  evidence: Array<{ assessmentId: string; label: string; caveats: string[] }>;
  onChange: (claim: ProposalClaimEvidenceEntry) => void;
  onRemove: () => void;
  questions: ProposalEvidenceQuestion[];
}) {
  const definition = PROPOSAL_CLAIM_KIND_DEFINITIONS.find((item) => item.id === claim.kind) ?? PROPOSAL_CLAIM_KIND_DEFINITIONS[0];
  const toggleQuestion = (questionId: string, checked: boolean) => onChange({
    ...claim,
    questionIds: checked ? [...new Set([...claim.questionIds, questionId])] : claim.questionIds.filter((id) => id !== questionId),
  });
  const toggleEvidence = (assessmentId: string, checked: boolean) => onChange({
    ...claim,
    evidenceAssessmentIds: checked ? [...new Set([...claim.evidenceAssessmentIds, assessmentId])] : claim.evidenceAssessmentIds.filter((id) => id !== assessmentId),
  });
  const staleEvidenceLinks = claim.evidenceAssessmentIds.filter((assessmentId) => !evidence.some((item) => item.assessmentId === assessmentId));

  return (
    <section className={styles.claimEditor} aria-labelledby={`editor-${claim.id}`}>
      <header className={styles.claimEditorHeader}>
        <div><span>Structured synthesis claim</span><h3 id={`editor-${claim.id}`}>{definition.label}</h3><p>{definition.description}</p></div>
        <button className={styles.removeButton} onClick={onRemove} type="button">Remove from draft</button>
      </header>

      <div className={styles.twoColumnFields}>
        <label><span>Claim role</span><select onChange={(event) => onChange({ ...claim, kind: event.target.value as ProposalClaimKind })} value={claim.kind}>{PROPOSAL_CLAIM_KIND_DEFINITIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label><span>Researcher status</span><select onChange={(event) => onChange({ ...claim, status: event.target.value as ProposalClaimStatus })} value={claim.status}>{STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>

      <label className={styles.fullField}><span>Claim text</span><small>{definition.prompt}</small><textarea onChange={(event) => onChange({ ...claim, text: event.target.value })} placeholder="Write one bounded, inspectable claim…" rows={6} value={claim.text} /></label>

      <fieldset className={styles.linkPanel}>
        <legend>Research-question links</legend>
        <p>Every claim must say which selected question it helps establish.</p>
        {questions.map((question, index) => <label key={question.id}><input checked={claim.questionIds.includes(question.id)} onChange={(event) => toggleQuestion(question.id, event.target.checked)} type="checkbox" /><span><strong>RQ{index + 1}</strong>{question.text}</span></label>)}
      </fieldset>

      <fieldset className={styles.linkPanel}>
        <legend>Included evidence links</legend>
        <p>These are researcher-included Phase 3 assessments—not unreviewed search results.</p>
        {evidence.length ? evidence.map((item) => <label key={item.assessmentId}><input checked={claim.evidenceAssessmentIds.includes(item.assessmentId)} onChange={(event) => toggleEvidence(item.assessmentId, event.target.checked)} type="checkbox" /><span><strong>{item.label}</strong><small>{item.caveats.length ? item.caveats.join(" · ") : "No source-level caveat recorded."}</small></span></label>) : <div className={styles.emptyLinks}>No included evidence is available. Return to Step 3 and finish the source decisions.</div>}
        {staleEvidenceLinks.map((assessmentId) => <div className={styles.staleLink} key={assessmentId}>Unavailable or no longer included: {assessmentId}</div>)}
      </fieldset>

      <label className={styles.fullField}><span>Caveats, certainty, applicability, and boundaries <small>one per line</small></span><textarea onChange={(event) => onChange({ ...claim, caveats: newlineValues(event.target.value) })} placeholder="Population or context boundary\nMeasurement or design limitation\nCertainty or applicability concern" rows={5} value={claim.caveats.join("\n")} /></label>

      <footer className={styles.claimBoundary}><strong>{statusLabel(claim.status)}</strong><span>{claim.kind === "gap" ? "Gap language always requires explicit researcher review and a boundary." : "The linked evidence and caveats remain inspectable downstream."}</span></footer>
    </section>
  );
}

export function ProposalSynthesisStudio({
  claimEvidenceMap,
  cloudUserId,
  evidenceStrategyReady,
  onReadyChange,
  onSave,
  onStatusChange,
  projectId,
  questions,
  route,
}: ProposalSynthesisStudioProps) {
  const library = useEvidenceLibrary(cloudUserId);
  const ledger = useProjectEvidenceAssessments({ cloudUserId, onStatusChange, projectId, route });
  const [claims, setClaims] = useState<ProposalClaimEvidenceEntry[]>(() => claimEvidenceMap.claims);
  const [activeClaimId, setActiveClaimId] = useState<string | null>(() => claimEvidenceMap.claims[0]?.id ?? null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const evidenceReview = useMemo(() => compileEvidenceReview({ selectedQuestionIds: questions.map((question) => question.id), assessments: ledger.assessments }), [ledger.assessments, questions]);
  const draftMap = useMemo(() => createClaimEvidenceMap(claims), [claims]);
  const compiled = useMemo(() => compileProposalSynthesis({
    route,
    selectedQuestionIds: questions.map((question) => question.id),
    assessments: ledger.assessments,
    claimEvidenceMap: draftMap,
    evidenceStrategyReady,
    evidenceReviewReady: evidenceReview.ready && ledger.conflicts.length === 0,
  }), [draftMap, evidenceReview.ready, evidenceStrategyReady, ledger.assessments, ledger.conflicts.length, questions, route]);
  const titleBySourceId = useMemo(() => new Map(library.rows.map((row) => [row.id, row.title])), [library.rows]);
  const includedEvidence = useMemo(() => ledger.assessments.filter((assessment) => assessment.status === "included").map((assessment) => ({
    assessmentId: assessment.assessmentId,
    label: sourceTitle(titleBySourceId.get(assessment.sourceId), assessment.assessmentId),
    caveats: assessment.caveats,
  })), [ledger.assessments, titleBySourceId]);
  const activeClaim = claims.find((claim) => claim.id === activeClaimId) ?? claims[0] ?? null;
  const activeIssues = compiled.issues.filter((item) => item.claimId === activeClaim?.id || item.claimId === null);

  useEffect(() => onReadyChange(!ledger.loading && ledger.conflicts.length === 0 && compiled.ready), [compiled.ready, ledger.conflicts.length, ledger.loading, onReadyChange]);

  const addClaim = (kind: ProposalClaimKind) => {
    const next = createProposalClaim(claims, kind, questions.length === 1 ? [questions[0].id] : []);
    setClaims((current) => [...current, next]);
    setActiveClaimId(next.id);
    setMessage(null);
  };

  const removeClaim = (claimId: string) => {
    const next = claims.filter((claim) => claim.id !== claimId);
    setClaims(next);
    setActiveClaimId(next[0]?.id ?? null);
    setMessage("Claim removed from the unsaved draft.");
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await onSave(draftMap);
      setMessage(compiled.ready ? "Synthesis map saved and ready for the next step." : "Synthesis draft saved. Resolve the readiness items before continuing.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The synthesis map could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.synthesisCanvas} data-testid="proposal-synthesis-studio">
      <header className={styles.phaseHeader}>
        <div><span>Build 2 · Phase 4</span><h2>Evidence Synthesis and Gap Studio</h2><p>Build an inspectable chain from reviewed evidence to what is known, contested, missing, and worth studying.</p></div>
        <div className={compiled.ready && ledger.conflicts.length === 0 ? styles.readyBadge : styles.reviewBadge}>{compiled.ready && ledger.conflicts.length === 0 ? "Synthesis ready" : "Review needed"}</div>
      </header>

      <section className={styles.routeGuidance}>
        <div><span>{compiled.routeLabel}</span><strong>Route-aware synthesis lens</strong></div>
        <ul>{compiled.routePrompts.map((prompt) => <li key={prompt}>{prompt}</li>)}</ul>
      </section>

      {ledger.conflicts.length ? <section className={styles.conflictBanner} role="alert"><strong>Evidence review conflicts must be resolved in Step 3.</strong><p>The synthesis remains editable, but cannot become ready while an upstream source decision has two versions.</p></section> : null}

      <div className={styles.synthesisWorkspace}>
        <aside className={styles.claimSidebar}>
          <section className={styles.summaryGrid}><div><span>{claims.length}</span><small>Claims</small></div><div><span>{compiled.linkedIncludedAssessmentIds.length}/{compiled.includedAssessmentIds.length}</span><small>Sources used</small></div><div><span>{compiled.questionSummaries.filter((item) => item.ready).length}/{questions.length}</span><small>RQs mapped</small></div></section>
          <div className={styles.sidebarHeading}><span>Claim map</span><h3>Select a claim to review</h3></div>
          <div className={styles.claimList}>{claims.length ? claims.map((claim) => <button aria-current={activeClaim?.id === claim.id} key={claim.id} onClick={() => setActiveClaimId(claim.id)} type="button"><span>{claimKindLabel(claim.kind)}</span><strong>{claim.text || "Untitled draft claim"}</strong><small>{statusLabel(claim.status)}</small></button>) : <p>No synthesis claims yet.</p>}</div>
          <section className={styles.addClaimPanel}><span>Add a claim role</span><div>{PROPOSAL_CLAIM_KIND_DEFINITIONS.map((item) => <button key={item.id} onClick={() => addClaim(item.id)} type="button">+ {item.label}</button>)}</div></section>
          <section className={styles.readinessPanel}><span>Derived readiness</span><strong>{compiled.issues.filter((item) => item.severity === "blocking").length} blockers</strong><p>{compiled.ready ? "Every question has an evidence-linked, researcher-reviewed gap and all included evidence is used." : "Readiness comes from the saved artifacts, never a manual completion checkbox."}</p></section>
        </aside>

        <main className={styles.synthesisMain}>
          {activeClaim ? <ClaimEditor
            claim={activeClaim}
            evidence={includedEvidence}
            onChange={(next) => setClaims((current) => updateClaim(current, activeClaim.id, () => next))}
            onRemove={() => removeClaim(activeClaim.id)}
            questions={questions}
          /> : <section className={styles.noClaim}><span>Start the evidence argument</span><h3>Add “What is known” or “Context” first</h3><p>Then establish a bounded gap and explain why it matters. Cerise will preserve disagreement and limits instead of generating a novelty claim.</p><button onClick={() => addClaim("known")} type="button">Add what is known</button></section>}

          <section className={styles.issuePanel} aria-live="polite">
            <div><span>Integrity review</span><h3>{activeClaim ? `Issues affecting ${claimKindLabel(activeClaim.kind)}` : "Global synthesis issues"}</h3></div>
            {activeIssues.length ? <div>{activeIssues.map((item) => <article className={item.severity === "blocking" ? styles.blockingIssue : styles.advisoryIssue} key={item.id}><strong>{item.severity}</strong><p>{item.message}</p></article>)}</div> : <p className={styles.successText}>No unresolved issue applies to this claim or the global map.</p>}
          </section>

          <section className={styles.authorityPanel}>
            <div><span>Scholarly boundary</span><h3>Guidance behind this studio</h3><p>Cerise paraphrases interpretation, certainty, qualitative-synthesis, gap-characterization, and reporting responsibilities. It does not reproduce a checklist or calculate an overall evidence score.</p></div>
            <div>{compiled.guidanceSources.map((source) => <a href={source.sourceUrl} key={source.id} rel="noreferrer" target="_blank"><strong>{source.name}</strong><small>{source.role.replace("-", " ")} · {source.version}</small></a>)}</div>
          </section>
        </main>
      </div>

      <footer className={styles.stickyFooter}><div><strong>{message ?? (compiled.ready ? "The current draft satisfies the Phase 4 artifact contract." : "Drafts may be saved before readiness; blockers remain explicit.")}</strong><span>No gap, novelty, truth, certainty, methodological quality, or approval is certified by this studio.</span></div><button disabled={saving || ledger.loading} onClick={() => void save()} type="button">{saving ? "Saving…" : "Save synthesis map"}</button></footer>
    </div>
  );
}
