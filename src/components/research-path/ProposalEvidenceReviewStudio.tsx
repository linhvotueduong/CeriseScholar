"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useEvidenceLibrary } from "@/hooks/useEvidenceLibrary";
import {
  type EvidenceAssessmentEdit,
  useProjectEvidenceAssessments,
} from "@/hooks/useProjectEvidenceAssessments";
import type { EvidenceLibraryRow } from "@/lib/research/evidenceLibrary";
import {
  EVIDENCE_APPRAISAL_LENSES,
  compileEvidenceReview,
  createEvidenceAppraisalItems,
  getEvidenceAppraisalLens,
  type EvidenceAppraisalLensId,
  type ProposalEvidenceRoute,
} from "@/lib/research/proposalEvidencePhase3";
import type {
  EvidenceAppraisalAnswer,
  EvidenceAssessmentStatus,
  ProjectEvidenceAssessment,
} from "@/lib/research/researchProposalDocument";
import type { ProposalEvidenceQuestion } from "./ProposalEvidenceStrategyStudio";
import styles from "./Stage2EvidencePhase3.module.css";

interface ProposalEvidenceReviewStudioProps {
  cloudUserId: string | null;
  onReadyChange: (ready: boolean) => void;
  onStatusChange: (status: string) => void;
  projectId: string;
  questions: ProposalEvidenceQuestion[];
  route: ProposalEvidenceRoute;
}

const STATUS_OPTIONS: Array<[EvidenceAssessmentStatus, string]> = [
  ["awaiting-review", "Awaiting review"],
  ["candidate", "Candidate"],
  ["included", "Include in this project"],
  ["excluded", "Exclude from this project"],
];

const ANSWER_OPTIONS: Array<[EvidenceAppraisalAnswer, string]> = [
  ["yes", "Yes"],
  ["no", "No"],
  ["unclear", "Unclear"],
  ["not-applicable", "Not applicable"],
];

function sourceLabel(row: EvidenceLibraryRow | undefined, sourceId: string): string {
  return row?.title || `Source ${sourceId}`;
}

function newlineValues(value: string): string[] {
  return [...new Set(value.split("\n").map((item) => item.trim()).filter(Boolean))];
}

function AssessmentEditor({
  assessment,
  onSave,
  questions,
  source,
}: {
  assessment: ProjectEvidenceAssessment;
  onSave: (edit: EvidenceAssessmentEdit) => Promise<void>;
  questions: ProposalEvidenceQuestion[];
  source: EvidenceLibraryRow | undefined;
}) {
  const initialLens = getEvidenceAppraisalLens(assessment.appraisalFramework);
  const [edit, setEdit] = useState<EvidenceAssessmentEdit>({
    status: assessment.status,
    decisionRationale: assessment.decisionRationale,
    linkedQuestionIds: assessment.linkedQuestionIds,
    appraisalFramework: initialLens.id,
    appraisal: assessment.appraisal.length ? assessment.appraisal : createEvidenceAppraisalItems(initialLens.id),
    caveats: assessment.caveats,
    researcherNotes: assessment.researcherNotes,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const lens = getEvidenceAppraisalLens(edit.appraisalFramework);

  const toggleQuestion = (questionId: string, checked: boolean) => setEdit((current) => ({
    ...current,
    linkedQuestionIds: checked
      ? [...new Set([...current.linkedQuestionIds, questionId])]
      : current.linkedQuestionIds.filter((id) => id !== questionId),
  }));

  const changeLens = (next: EvidenceAppraisalLensId) => setEdit((current) => ({
    ...current,
    appraisalFramework: next,
    appraisal: createEvidenceAppraisalItems(next),
  }));

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await onSave(edit);
      setMessage(edit.status === "included" || edit.status === "excluded" ? "Researcher decision saved with a review time." : "Working review saved without a final decision.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "This source review could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.assessmentEditor}>
      <header className={styles.assessmentHeader}>
        <div><span>Project-specific assessment</span><h3>{sourceLabel(source, assessment.sourceId)}</h3><p>{source?.citation || source?.doc_type || "Evidence Library metadata unavailable on this device."}</p></div>
        {source?.url ? <a href={source.url} rel="noreferrer" target="_blank">Open source</a> : null}
      </header>

      <div className={styles.decisionGrid}>
        <label><span>Project decision</span><select onChange={(event) => setEdit((current) => ({ ...current, status: event.target.value as EvidenceAssessmentStatus }))} value={edit.status}>{STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label><span>Appraisal lens</span><select onChange={(event) => changeLens(event.target.value as EvidenceAppraisalLensId)} value={edit.appraisalFramework}>{EVIDENCE_APPRAISAL_LENSES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      </div>

      <section className={styles.questionLinkPanel}>
        <div><strong>Link this source to research questions</strong><small>Included evidence must support at least one selected question.</small></div>
        {questions.map((question, index) => <label key={question.id}><input checked={edit.linkedQuestionIds.includes(question.id)} onChange={(event) => toggleQuestion(question.id, event.target.checked)} type="checkbox" /><span><strong>RQ{index + 1}</strong>{question.text}</span></label>)}
      </section>

      <section className={styles.lensIntro}>
        <div><span>Structured lens</span><h4>{lens.label}</h4><p>{lens.description}</p></div>
        <a href={lens.authorityUrl} rel="noreferrer" target="_blank">Guidance source</a>
      </section>

      <div className={styles.appraisalList}>
        {edit.appraisal.map((item, index) => <article key={item.criterionId}>
          <div className={styles.appraisalPrompt}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.prompt}</strong></div>
          <div className={styles.appraisalResponse}>
            <select aria-label={`Appraisal response ${index + 1}`} onChange={(event) => setEdit((current) => ({ ...current, appraisal: current.appraisal.map((candidate) => candidate.criterionId === item.criterionId ? { ...candidate, answer: event.target.value as EvidenceAppraisalAnswer } : candidate) }))} value={item.answer}>{ANSWER_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <textarea aria-label={`Appraisal rationale ${index + 1}`} onChange={(event) => setEdit((current) => ({ ...current, appraisal: current.appraisal.map((candidate) => candidate.criterionId === item.criterionId ? { ...candidate, rationale: event.target.value } : candidate) }))} placeholder={item.answer === "yes" ? "Optional supporting note or locator…" : "Explain this response before finalizing the decision…"} rows={2} value={item.rationale} />
          </div>
        </article>)}
      </div>

      <label className={styles.reviewFullField}><span>Decision rationale</span><textarea onChange={(event) => setEdit((current) => ({ ...current, decisionRationale: event.target.value }))} placeholder="Why should this source be included, excluded, or kept under review for this project?" rows={4} value={edit.decisionRationale} /></label>
      <label className={styles.reviewFullField}><span>Caveats and limits <small>one per line</small></span><textarea onChange={(event) => setEdit((current) => ({ ...current, caveats: newlineValues(event.target.value) }))} placeholder="Context limits\nMeasurement concern\nUnresolved disagreement" rows={4} value={edit.caveats.join("\n")} /></label>
      <label className={styles.reviewFullField}><span>Researcher notes <small>not a universal source rating</small></span><textarea onChange={(event) => setEdit((current) => ({ ...current, researcherNotes: event.target.value }))} rows={4} value={edit.researcherNotes} /></label>
      <div className={styles.editorFooter}><p>{message ?? "Cerise records domains and reasons; it does not calculate an overall quality score or decide inclusion for you."}</p><button disabled={saving} onClick={() => void save()} type="button">{saving ? "Saving…" : "Save source review"}</button></div>
    </div>
  );
}

export function ProposalEvidenceReviewStudio({
  cloudUserId,
  onReadyChange,
  onStatusChange,
  projectId,
  questions,
  route,
}: ProposalEvidenceReviewStudioProps) {
  const library = useEvidenceLibrary(cloudUserId);
  const ledger = useProjectEvidenceAssessments({ cloudUserId, onStatusChange, projectId, route });
  const [sourceSearch, setSourceSearch] = useState("");
  const deferredSourceSearch = useDeferredValue(sourceSearch);
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(null);
  const sourceById = useMemo(() => new Map(library.rows.map((row) => [row.id, row])), [library.rows]);
  const compiled = useMemo(() => compileEvidenceReview({ selectedQuestionIds: questions.map((question) => question.id), assessments: ledger.assessments }), [ledger.assessments, questions]);
  const filteredSources = useMemo(() => {
    const query = deferredSourceSearch.trim().toLowerCase();
    const rows = query ? library.rows.filter((row) => [row.title, row.citation, row.doc_type, row.evidence].some((value) => value?.toLowerCase().includes(query))) : library.rows;
    return [...rows].sort((left, right) => {
      const leftProject = left.project_id === projectId ? 1 : 0;
      const rightProject = right.project_id === projectId ? 1 : 0;
      return rightProject - leftProject || right.created_at.localeCompare(left.created_at);
    });
  }, [deferredSourceSearch, library.rows, projectId]);
  const activeAssessment = ledger.assessments.find((item) => item.assessmentId === activeAssessmentId) ?? ledger.assessments[0] ?? null;
  const activeConflict = activeAssessment ? ledger.conflicts.find((item) => item.assessmentId === activeAssessment.assessmentId) : null;

  useEffect(() => onReadyChange(!ledger.loading && ledger.conflicts.length === 0 && compiled.ready), [compiled.ready, ledger.conflicts.length, ledger.loading, onReadyChange]);

  const addSource = async (row: EvidenceLibraryRow) => {
    const assessment = await ledger.addSource(row);
    setActiveAssessmentId(assessment.assessmentId);
  };

  return (
    <div className={styles.reviewCanvas} data-testid="proposal-evidence-review-studio">
      <header className={styles.phaseHeader}>
        <div><span>Build 2 · Phase 3</span><h2>Project Source Review Ledger</h2><p>Separate reusable source metadata from your project’s inclusion decision, appraisal, caveats, and question links.</p></div>
        <div className={compiled.ready && ledger.conflicts.length === 0 ? styles.readyBadge : styles.reviewBadge}>{compiled.ready && ledger.conflicts.length === 0 ? "Review ready" : "Decisions pending"}</div>
      </header>

      <div className={styles.reviewWorkspace}>
        <aside className={styles.ledgerSidebar}>
          <section className={styles.reviewSummary}>
            <div><span>{compiled.includedCount}</span><small>Included</small></div><div><span>{compiled.excludedCount}</span><small>Excluded</small></div><div><span>{compiled.unresolvedCount}</span><small>Unresolved</small></div>
          </section>
          <div className={styles.sidebarHeading}><div><span>Review ledger</span><h3>{ledger.assessments.length} project sources</h3></div></div>
          <div className={styles.ledgerList}>{ledger.loading ? <p>Loading source decisions…</p> : ledger.assessments.length ? ledger.assessments.map((assessment) => {
            const row = sourceById.get(assessment.sourceId);
            return <button aria-current={activeAssessment?.assessmentId === assessment.assessmentId} key={assessment.assessmentId} onClick={() => setActiveAssessmentId(assessment.assessmentId)} type="button"><span className={styles[`status_${assessment.status.replace("-", "_")}`]}>{assessment.status.replace("-", " ")}</span><strong>{sourceLabel(row, assessment.sourceId)}</strong><small>{row?.doc_type || `Revision ${assessment.revision}`}</small></button>;
          }) : <p>No sources have been added to this project review.</p>}</div>
          <section className={styles.readinessCompact}><span>Question coverage</span><strong>{compiled.coveredQuestionIds.length}/{questions.length}</strong><p>{compiled.ready ? "Every question has reviewed included evidence." : "Resolve the items below before synthesis."}</p>{compiled.issues.map((issue) => <div className={issue.severity === "blocking" ? styles.compactBlocker : styles.compactAdvisory} key={issue.id}>{issue.message}</div>)}</section>
        </aside>

        <main className={styles.reviewMain}>
          <section className={styles.sourcePicker}>
            <div className={styles.sourcePickerHeader}><div><span>Reusable Evidence Library</span><h3>Add a source to this project</h3><p>Adding a source creates a separate project assessment. It never rewrites the global library record.</p></div><input aria-label="Search Evidence Library" onChange={(event) => setSourceSearch(event.target.value)} placeholder="Search title, citation, type, or evidence…" value={sourceSearch} /></div>
            {library.loading ? <p className={styles.sourceEmpty}>Loading Evidence Library…</p> : library.error ? <p className={styles.sourceEmpty}>{library.error}</p> : filteredSources.length ? <div className={styles.sourceStrip}>{filteredSources.slice(0, 30).map((row) => {
              const existing = ledger.assessments.some((assessment) => assessment.sourceId === row.id);
              return <article key={row.id}><div><span>{row.project_id === projectId ? "This project" : "Evidence Library"}</span><strong>{row.title}</strong><small>{row.doc_type || row.citation || "Saved scholarly source"}</small></div><button disabled={existing} onClick={() => void addSource(row)} type="button">{existing ? "In ledger" : "Add to review"}</button></article>;
            })}</div> : <p className={styles.sourceEmpty}>{cloudUserId ? "No matching saved sources. Use ScholarAsk or Evidence Library in the previous step to save evidence first." : "Sign in to use your secure Evidence Library."}</p>}
          </section>

          {activeConflict ? <section className={styles.reviewConflict} role="alert"><div><strong>This source review changed in two places</strong><p>Neither version was overwritten. Choose the secure version or keep this device’s version.</p></div><div><button onClick={() => ledger.useSecureVersion(activeConflict.assessmentId)} type="button">Use secure version</button><button onClick={() => ledger.useDeviceVersion(activeConflict.assessmentId)} type="button">Use this device</button></div></section> : null}

          {activeAssessment ? <AssessmentEditor
            assessment={activeAssessment}
            key={activeAssessment.identity.checksum}
            onSave={async (edit) => { const next = await ledger.saveAssessment(activeAssessment, edit, sourceById.get(activeAssessment.sourceId)); setActiveAssessmentId(next.assessmentId); }}
            questions={questions}
            source={sourceById.get(activeAssessment.sourceId)}
          /> : <section className={styles.noAssessment}><span>Start with a source</span><h3>Select Add to review above</h3><p>The structured appraisal and human include/exclude decision will appear here.</p></section>}
        </main>
      </div>
    </div>
  );
}
