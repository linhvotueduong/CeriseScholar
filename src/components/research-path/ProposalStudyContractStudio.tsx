"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useProjectEvidenceAssessments } from "@/hooks/useProjectEvidenceAssessments";
import { compileEvidenceReview } from "@/lib/research/proposalEvidencePhase3";
import { compileProposalSynthesis } from "@/lib/research/proposalSynthesisPhase4";
import {
  alignProposedStudyContractRoute,
  compileProposedStudyContract,
  createProposedStudyContractDraft,
  type ProposalStudyQuestion,
  type ProposalStudyRoute,
  type StudyContractFieldKey,
} from "@/lib/research/proposalStudyContractPhase5";
import type {
  ClaimEvidenceMap,
  ProposedStudyContract,
  ProposedStudyContractEntry,
} from "@/lib/research/researchProposalDocument";
import styles from "./Stage2StudyContractPhase5.module.css";

interface ProposalStudyContractStudioProps {
  claimEvidenceMap: ClaimEvidenceMap;
  cloudUserId: string | null;
  contract: ProposedStudyContract;
  evidenceStrategyReady: boolean;
  legacyRoadmap: ReactNode;
  onReadyChange: (ready: boolean) => void;
  onSave: (contract: ProposedStudyContract) => Promise<void>;
  onStatusChange: (status: string) => void;
  projectId: string;
  questions: ProposalStudyQuestion[];
  route: ProposalStudyRoute;
}

const FIELD_COPY: Record<StudyContractFieldKey, { label: string; description: string; placeholder: string }> = {
  purpose: {
    label: "Purpose in the proposed study",
    description: "Explain what answering this question contributes to the overall study—not merely the question again.",
    placeholder: "This question will clarify, estimate, compare, explain, interpret, evaluate, or map…",
  },
  evidenceNeed: {
    label: "Evidence needed",
    description: "State the observation, comparison, account, record, material, or synthesis needed to answer it.",
    placeholder: "To answer this question, the study needs…",
  },
  populationOrSource: {
    label: "Population or source",
    description: "This label becomes route-specific below.",
    placeholder: "Define who or what can provide the required evidence…",
  },
  proposedMethod: {
    label: "Proposed method direction",
    description: "Choose and justify a proposal-level direction. Stage 3 will implement the runnable design.",
    placeholder: "A defensible method direction may be… because…",
  },
  analysisDirection: {
    label: "Proposed analysis direction",
    description: "Describe how the planned evidence could answer the question and how uncertainty or interpretation will remain visible.",
    placeholder: "The analysis would… while examining…",
  },
  uncertainty: {
    label: "Uncertainty carried into Stage 3",
    description: "Record what remains unresolved instead of presenting the proposal as a completed or validated design.",
    placeholder: "Stage 3 still needs to resolve…",
  },
};

const ENTRY_FIELDS: readonly StudyContractFieldKey[] = ["purpose", "evidenceNeed", "populationOrSource", "proposedMethod", "analysisDirection", "uncertainty"];

function displayValue(value: string): string {
  return value.replaceAll("-", " ");
}

function entryLabel(entry: ProposedStudyContractEntry, question: ProposalStudyQuestion | undefined, index: number): string {
  if (question) return question.text || `Research question ${index + 1}`;
  return `Removed question · ${entry.questionId}`;
}

function updateEntry(
  entries: readonly ProposedStudyContractEntry[],
  entryId: string,
  field: StudyContractFieldKey,
  value: string,
): ProposedStudyContractEntry[] {
  return entries.map((entry) => entry.id === entryId ? { ...entry, [field]: value } : entry);
}

function StudyEntryEditor({
  entry,
  gapClaims,
  guidance,
  onChange,
  onRemove,
  question,
  removable,
}: {
  entry: ProposedStudyContractEntry;
  gapClaims: string[];
  guidance: ReturnType<typeof compileProposedStudyContract>["guidance"];
  onChange: (field: StudyContractFieldKey, value: string) => void;
  onRemove: () => void;
  question: ProposalStudyQuestion | undefined;
  removable: boolean;
}) {
  return (
    <section className={styles.entryEditor} aria-labelledby={`study-entry-${entry.id}`}>
      <header className={styles.entryHeader}>
        <div><span>Question-level contract</span><h3 id={`study-entry-${entry.id}`}>{question?.text || "Entry linked to a removed question"}</h3><p>{question?.family ? `${displayValue(question.family)} question` : "Question family not recorded"}</p></div>
        {removable ? <button className={styles.removeButton} onClick={onRemove} type="button">Remove from draft</button> : null}
      </header>

      {question ? <dl className={styles.scopeGrid}>
        <div><dt>Population/source</dt><dd>{question.scope.populationOrSource || "Not set in Stage 1"}</dd></div>
        <div><dt>Setting</dt><dd>{question.scope.setting || "Not set in Stage 1"}</dd></div>
        <div><dt>Construct/phenomenon</dt><dd>{question.scope.constructOrPhenomenon || "Not set in Stage 1"}</dd></div>
        <div><dt>Comparison/timeframe</dt><dd>{[question.scope.comparison, question.scope.timeframe].filter(Boolean).join(" · ") || "Not set in Stage 1"}</dd></div>
      </dl> : <div className={styles.staleEntryNotice}>This entry is preserved because its question was previously selected. Review its content before removing it.</div>}

      <section className={styles.gapContext}>
        <div><span>Exact Phase 4 input</span><strong>Researcher-reviewed gap</strong></div>
        {gapClaims.length ? <ul>{gapClaims.map((text) => <li key={text}>{text}</li>)}</ul> : <p>No current researcher-reviewed gap is linked to this question.</p>}
      </section>

      <div className={styles.entryFields}>
        {ENTRY_FIELDS.map((field) => {
          const copy = field === "populationOrSource" ? { ...FIELD_COPY[field], label: guidance.populationOrSourceLabel, description: guidance.populationOrSourcePrompt } : FIELD_COPY[field];
          const suggestions = guidance.suggestions[field];
          return <section className={styles.fieldSection} key={field}>
            <label><span>{copy.label}</span><small>{copy.description}</small><textarea onChange={(event) => onChange(field, event.target.value)} placeholder={copy.placeholder} rows={field === "purpose" || field === "evidenceNeed" ? 4 : 5} value={entry[field]} /></label>
            {suggestions.length ? <div className={styles.suggestionRow}><strong>Editable starting points</strong><div>{suggestions.map((suggestion) => <button key={suggestion} onClick={() => onChange(field, suggestion)} title="Use this editable starting point" type="button">{suggestion}</button>)}</div></div> : null}
          </section>;
        })}
      </div>
    </section>
  );
}

export function ProposalStudyContractStudio({
  claimEvidenceMap,
  cloudUserId,
  contract,
  evidenceStrategyReady,
  legacyRoadmap,
  onReadyChange,
  onSave,
  onStatusChange,
  projectId,
  questions,
  route,
}: ProposalStudyContractStudioProps) {
  const ledger = useProjectEvidenceAssessments({ cloudUserId, onStatusChange, projectId, route });
  const [draft, setDraft] = useState<ProposedStudyContract>(() => createProposedStudyContractDraft({ current: contract, questions, route }));
  const [activeEntryId, setActiveEntryId] = useState<string | null>(() => createProposedStudyContractDraft({ current: contract, questions, route }).entries[0]?.id ?? null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const questionById = useMemo(() => new Map(questions.map((question) => [question.id, question])), [questions]);
  const entryCountByQuestion = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of draft.entries) counts.set(entry.questionId, (counts.get(entry.questionId) ?? 0) + 1);
    return counts;
  }, [draft.entries]);
  const evidenceReview = useMemo(() => compileEvidenceReview({ selectedQuestionIds: questions.map((question) => question.id), assessments: ledger.assessments }), [ledger.assessments, questions]);
  const synthesis = useMemo(() => compileProposalSynthesis({
    route,
    selectedQuestionIds: questions.map((question) => question.id),
    assessments: ledger.assessments,
    claimEvidenceMap,
    evidenceStrategyReady,
    evidenceReviewReady: evidenceReview.ready && ledger.conflicts.length === 0,
  }), [claimEvidenceMap, evidenceReview.ready, evidenceStrategyReady, ledger.assessments, ledger.conflicts.length, questions, route]);
  const compiled = useMemo(() => compileProposedStudyContract({ route, questions, claimEvidenceMap, contract: draft, synthesisReady: synthesis.ready && ledger.conflicts.length === 0 }), [claimEvidenceMap, draft, ledger.conflicts.length, questions, route, synthesis.ready]);
  const activeEntry = draft.entries.find((entry) => entry.id === activeEntryId) ?? draft.entries[0] ?? null;
  const activeQuestion = activeEntry ? questionById.get(activeEntry.questionId) : undefined;
  const activeGapClaims = activeEntry ? claimEvidenceMap.claims.filter((claim) => claim.kind === "gap" && claim.status === "researcher-reviewed" && claim.questionIds.includes(activeEntry.questionId)).map((claim) => claim.text) : [];
  const activeIssues = compiled.issues.filter((item) => item.entryId === activeEntry?.id || item.questionId === activeEntry?.questionId || (item.entryId === null && item.questionId === null));
  const routeDrift = compiled.issues.some((item) => item.id === "route-drift");

  useEffect(() => onReadyChange(!ledger.loading && ledger.conflicts.length === 0 && compiled.ready), [compiled.ready, ledger.conflicts.length, ledger.loading, onReadyChange]);

  const editEntry = (field: StudyContractFieldKey, value: string) => {
    if (!activeEntry) return;
    setDraft((current) => ({ ...current, entries: updateEntry(current.entries, activeEntry.id, field, value) }));
    setMessage(null);
  };

  const removeEntry = (entryId: string) => {
    const entries = draft.entries.filter((entry) => entry.id !== entryId);
    setDraft((current) => ({ ...current, entries }));
    setActiveEntryId(entries[0]?.id ?? null);
    setMessage("Entry removed from the unsaved draft.");
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await onSave(draft);
      setMessage(compiled.ready ? "Proposed Study Contract saved and ready for proposal writing." : "Contract draft saved. Resolve the remaining readiness items before continuing.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The Proposed Study Contract could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.contractCanvas} data-testid="proposal-study-contract-studio">
      <header className={styles.phaseHeader}>
        <div><span>Build 2 · Phase 5</span><h2>Proposed Study Contract</h2><p>Translate each question and reviewed gap into a proposal-level evidence, method, analysis, feasibility, access, and uncertainty plan.</p></div>
        <div className={compiled.ready && ledger.conflicts.length === 0 ? styles.readyBadge : styles.reviewBadge}>{compiled.ready && ledger.conflicts.length === 0 ? "Contract ready" : "Review needed"}</div>
      </header>

      <section className={styles.routeBand}>
        <div><span>{compiled.guidance.routeLabel}</span><strong>Exact Stage 1 route</strong></div>
        <dl><div><dt>Setting</dt><dd>{displayValue(route.setting)}</dd></div><div><dt>Assignment</dt><dd>{displayValue(route.assignment)}</dd></div><div><dt>Audience</dt><dd>{displayValue(route.audience)}</dd></div><div><dt>Data</dt><dd>{displayValue(route.dataSensitivity)}</dd></div><div><dt>Possible procedures</dt><dd>{route.possibleSpecialProcedures.length ? route.possibleSpecialProcedures.map(displayValue).join(", ") : "none recorded"}</dd></div></dl>
      </section>

      <section className={styles.routeGuidance}><strong>Planning lens</strong><ul>{compiled.guidance.routePrompts.map((prompt) => <li key={prompt}>{prompt}</li>)}</ul></section>

      {routeDrift ? <section className={styles.routeDrift} role="alert"><div><strong>The Stage 1 route changed</strong><p>The prior contract text is preserved. Review how the new route changes population/source, method, analysis, access, and ethics before aligning it.</p></div><button onClick={() => setDraft((current) => alignProposedStudyContractRoute(current, route))} type="button">Align after review</button></section> : null}
      {ledger.conflicts.length ? <section className={styles.upstreamConflict} role="alert"><strong>Resolve the Phase 3 source-review conflicts before this contract can become ready.</strong></section> : null}

      <div className={styles.contractWorkspace}>
        <aside className={styles.contractSidebar}>
          <section className={styles.summaryGrid}><div><span>{compiled.questionSummaries.filter((item) => item.ready).length}/{questions.length}</span><small>RQs ready</small></div><div><span>{draft.entries.length}</span><small>Entries</small></div><div><span>{compiled.issues.filter((item) => item.severity === "blocking").length}</span><small>Blockers</small></div></section>
          <div className={styles.sidebarHeading}><span>Question contracts</span><h3>Select an entry to define</h3></div>
          <div className={styles.entryList}>{draft.entries.length ? draft.entries.map((entry, index) => {
            const question = questionById.get(entry.questionId);
            const completed = ENTRY_FIELDS.filter((field) => entry[field].trim()).length;
            return <button aria-current={activeEntry?.id === entry.id} key={entry.id} onClick={() => setActiveEntryId(entry.id)} type="button"><span>{question ? `RQ${Math.max(1, questions.findIndex((item) => item.id === question.id) + 1)}` : "Stale"}</span><strong>{entryLabel(entry, question, index)}</strong><small>{completed}/6 fields · {entryCountByQuestion.get(entry.questionId) ?? 1} entr{(entryCountByQuestion.get(entry.questionId) ?? 1) === 1 ? "y" : "ies"}</small></button>;
          }) : <p>No contract entries are available.</p>}</div>
          <section className={styles.readinessPanel}><span>Derived readiness</span><strong>{compiled.ready ? "Ready" : "Plan incomplete"}</strong><p>Completion comes from current questions, reviewed gaps, all six entry responsibilities, project-wide implementation notes, and current route alignment.</p></section>
        </aside>

        <main className={styles.contractMain}>
          {activeEntry ? <StudyEntryEditor
            entry={activeEntry}
            gapClaims={activeGapClaims}
            guidance={compiled.guidance}
            onChange={editEntry}
            onRemove={() => removeEntry(activeEntry.id)}
            question={activeQuestion}
            removable={!activeQuestion || (entryCountByQuestion.get(activeEntry.questionId) ?? 0) > 1}
          /> : <section className={styles.noEntry}><h3>No question entry is available</h3><p>Return to Stage 1 and select a research question, or reload this draft to reconcile missing entries.</p></section>}

          <section className={styles.globalPlan}>
            <header><span>Cross-question implementation handoff</span><h3>What Stage 3 must resolve for the whole proposed study</h3><p>These notes apply across questions and are required even when the project uses existing data or evidence rather than recruiting participants.</p></header>
            <div>
              <label><span>Feasibility and resources</span><textarea onChange={(event) => setDraft((current) => ({ ...current, feasibilityNotes: event.target.value }))} placeholder="People, expertise, schedule, budget, sample or source availability, technology, dependencies, and go/no-go conditions…" rows={5} value={draft.feasibilityNotes} /></label>
              <label><span>Access and permissions</span><textarea onChange={(event) => setDraft((current) => ({ ...current, accessNotes: event.target.value }))} placeholder="Recruitment, sites, datasets, repositories, materials, licensing, languages, accessibility, and permission dependencies…" rows={5} value={draft.accessNotes} /></label>
              <label><span>Ethics, rights, privacy, and sensitivity</span><textarea onChange={(event) => setDraft((current) => ({ ...current, ethicsAndSensitivityNotes: event.target.value }))} placeholder="Participant rights, community considerations, consent, privacy, data use, risks, safeguards, sensitive topics, and questions for institutional review…" rows={5} value={draft.ethicsAndSensitivityNotes} /></label>
            </div>
          </section>

          <section className={styles.issuePanel} aria-live="polite">
            <div><span>Contract integrity</span><h3>{activeEntry ? "Issues affecting this entry or the whole study" : "Global contract issues"}</h3></div>
            {activeIssues.length ? <div>{activeIssues.map((item) => <article className={item.severity === "blocking" ? styles.blockingIssue : styles.advisoryIssue} key={item.id}><strong>{item.severity}</strong><p>{item.message}</p></article>)}</div> : <p className={styles.successText}>No unresolved issue applies to this entry or the global study contract.</p>}
          </section>

          <details className={styles.legacyRoadmap}><summary>Open the preserved legacy research roadmap</summary><div><p>The earlier theme and time-horizon table remains editable for continuity, but it does not satisfy the canonical Proposed Study Contract.</p>{legacyRoadmap}</div></details>

          <section className={styles.authorityPanel}>
            <div><span>Guidance boundary</span><h3>Prospective completeness prompts—not a method selector</h3><p>These sources help researchers notice plan responsibilities. Reporting guidelines do not prescribe study design, measure methodological quality, certify ethics or compliance, or replace field-specific and institutional review.</p></div>
            <div>{compiled.guidanceSources.map((source) => <a href={source.sourceUrl} key={source.id} rel="noreferrer" target="_blank"><strong>{source.name}</strong><small>{displayValue(source.role)} · {source.version}</small></a>)}</div>
          </section>
        </main>
      </div>

      <footer className={styles.stickyFooter}><div><strong>{message ?? (compiled.ready ? "The current contract satisfies the Phase 5 proposal-level responsibilities." : "Incomplete drafts may be saved; every unresolved responsibility stays visible.")}</strong><span>Stage 3—not this contract—must implement, test, reconcile, and govern the runnable study.</span></div><button disabled={saving || ledger.loading} onClick={() => void save()} type="button">{saving ? "Saving…" : "Save Proposed Study Contract"}</button></footer>
    </div>
  );
}
