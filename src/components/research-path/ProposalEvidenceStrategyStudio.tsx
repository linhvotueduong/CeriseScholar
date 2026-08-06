"use client";

import { useMemo, useState } from "react";
import {
  appendEvidenceSearchVersion,
  compileEvidenceStrategy,
  type ProposalEvidenceRoute,
} from "@/lib/research/proposalEvidencePhase3";
import type { ProposalEvidenceStrategy } from "@/lib/research/researchProposalDocument";
import styles from "./Stage2EvidencePhase3.module.css";

export interface ProposalEvidenceQuestion {
  id: string;
  text: string;
}

interface ProposalEvidenceStrategyStudioProps {
  onSave: (strategy: ProposalEvidenceStrategy) => Promise<void>;
  questions: ProposalEvidenceQuestion[];
  route: ProposalEvidenceRoute;
  strategy: ProposalEvidenceStrategy;
}

function lines(value: string): string[] {
  return [...new Set(value.split("\n").map((item) => item.trim()).filter(Boolean))];
}

function localDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function ProposalEvidenceStrategyStudio({
  onSave,
  questions,
  route,
  strategy: initialStrategy,
}: ProposalEvidenceStrategyStudioProps) {
  const [strategy, setStrategy] = useState(initialStrategy);
  const [query, setQuery] = useState("");
  const [sourceSystems, setSourceSystems] = useState("");
  const [executed, setExecuted] = useState(false);
  const [runAt, setRunAt] = useState(localDateTime(new Date().toISOString()));
  const [resultCount, setResultCount] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const compiled = useMemo(() => compileEvidenceStrategy({
    route,
    selectedQuestionIds: questions.map((question) => question.id),
    strategy,
  }), [questions, route, strategy]);
  const dirty = JSON.stringify(strategy) !== JSON.stringify(initialStrategy);

  const updateQuestion = (questionId: string, checked: boolean) => {
    setStrategy((current) => ({
      ...current,
      questionIds: checked
        ? [...new Set([...current.questionIds, questionId])]
        : current.questionIds.filter((id) => id !== questionId),
    }));
  };

  const toggleSourceType = (sourceType: string) => {
    setStrategy((current) => ({
      ...current,
      sourceTypes: current.sourceTypes.includes(sourceType)
        ? current.sourceTypes.filter((item) => item !== sourceType)
        : [...current.sourceTypes, sourceType],
    }));
  };

  const toggleSourceSystem = (sourceSystem: string) => {
    const current = lines(sourceSystems);
    setSourceSystems((current.includes(sourceSystem) ? current.filter((item) => item !== sourceSystem) : [...current, sourceSystem]).join("\n"));
  };

  const saveSearchVersion = () => {
    try {
      const parsedCount = resultCount.trim() ? Number.parseInt(resultCount, 10) : null;
      const next = appendEvidenceSearchVersion(strategy, {
        query,
        sourceSystems: lines(sourceSystems),
        runAt: executed && runAt ? new Date(runAt).toISOString() : null,
        resultCount: executed ? parsedCount : null,
      });
      setStrategy(next);
      setMessage(`Search version ${next.searchVersions.at(-1)?.version} added. Previous versions remain unchanged.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Search version could not be added.");
    }
  };

  const saveStrategy = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await onSave(strategy);
      setMessage(compiled.ready ? "Evidence strategy saved and ready for source review." : "Evidence strategy saved. Resolve the remaining review items when ready.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Evidence strategy could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.strategyCanvas} data-testid="proposal-evidence-strategy-studio">
      <header className={styles.phaseHeader}>
        <div>
          <span>Build 2 · Phase 3</span>
          <h2>Versioned Evidence Strategy</h2>
          <p>Translate the selected questions into a traceable plan before judging individual sources.</p>
        </div>
        <div className={compiled.ready ? styles.readyBadge : styles.reviewBadge}>{compiled.ready ? "Strategy ready" : "Review needed"}</div>
      </header>

      <div className={styles.strategyGrid}>
        <main className={styles.editorColumn}>
          <section className={styles.panel}>
            <div className={styles.panelHeading}><span>01</span><div><h3>Questions and concepts</h3><p>Keep each selected Stage 1 question inside the evidence plan.</p></div></div>
            <fieldset className={styles.checklistFieldset}>
              <legend>Selected research questions</legend>
              {questions.length ? questions.map((question, index) => (
                <label className={styles.checkRow} key={question.id}>
                  <input checked={strategy.questionIds.includes(question.id)} onChange={(event) => updateQuestion(question.id, event.target.checked)} type="checkbox" />
                  <span><strong>RQ{index + 1}</strong>{question.text || "Untitled research question"}</span>
                </label>
              )) : <p className={styles.emptyText}>Complete the Stage 1 question selection first.</p>}
            </fieldset>
            <div className={styles.twoColumnFields}>
              <label><span>Searchable concepts <small>one per line</small></span><textarea onChange={(event) => setStrategy((current) => ({ ...current, concepts: lines(event.target.value) }))} rows={6} value={strategy.concepts.join("\n")} /></label>
              <label><span>Alternate terms <small>synonyms, spellings, headings</small></span><textarea onChange={(event) => setStrategy((current) => ({ ...current, synonyms: lines(event.target.value) }))} rows={6} value={strategy.synonyms.join("\n")} /></label>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeading}><span>02</span><div><h3>Evidence and eligibility boundaries</h3><p>Define the evidence that may answer the questions before reviewing what was found.</p></div></div>
            <div className={styles.suggestionGroup}>
              <strong>Recommended for {compiled.routeLabel}</strong>
              <div className={styles.chipList}>{compiled.recommendedSourceTypes.map((item) => <button aria-pressed={strategy.sourceTypes.includes(item)} className={strategy.sourceTypes.includes(item) ? styles.chipSelected : styles.chip} key={item} onClick={() => toggleSourceType(item)} type="button">{item}</button>)}</div>
            </div>
            <label className={styles.fullField}><span>Evidence source types <small>one per line; add local source types if needed</small></span><textarea onChange={(event) => setStrategy((current) => ({ ...current, sourceTypes: lines(event.target.value) }))} rows={5} value={strategy.sourceTypes.join("\n")} /></label>
            <label className={styles.fullField}><span>Eligibility boundaries</span><textarea onChange={(event) => setStrategy((current) => ({ ...current, eligibilityNotes: event.target.value }))} placeholder="Population, context, date, language, study or source type, concepts, and explicit exclusions…" rows={6} value={strategy.eligibilityNotes} /></label>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeading}><span>03</span><div><h3>Save an immutable search version</h3><p>Each save appends a new record. Earlier searches are never edited in place.</p></div></div>
            <label className={styles.fullField}><span>Exact search or discovery query</span><textarea onChange={(event) => setQuery(event.target.value)} placeholder="(concept OR alternate term) AND context" rows={5} value={query} /></label>
            <div className={styles.suggestionGroup}>
              <strong>Suggested source-system coverage</strong>
              <div className={styles.chipList}>{compiled.recommendedSourceSystems.map((item) => <button aria-pressed={lines(sourceSystems).includes(item)} className={lines(sourceSystems).includes(item) ? styles.chipSelected : styles.chip} key={item} onClick={() => toggleSourceSystem(item)} type="button">{item}</button>)}</div>
            </div>
            <label className={styles.fullField}><span>Exact databases, repositories, catalogues, or discovery systems <small>one per line</small></span><textarea onChange={(event) => setSourceSystems(event.target.value)} rows={4} value={sourceSystems} /></label>
            <label className={styles.inlineCheck}><input checked={executed} onChange={(event) => setExecuted(event.target.checked)} type="checkbox" /><span><strong>This search was executed</strong><small>Leave off when saving a planned strategy version.</small></span></label>
            {executed ? <div className={styles.twoColumnFields}><label><span>Run date and time</span><input onChange={(event) => setRunAt(event.target.value)} type="datetime-local" value={runAt} /></label><label><span>Result count <small>optional</small></span><input min={0} onChange={(event) => setResultCount(event.target.value)} type="number" value={resultCount} /></label></div> : null}
            <button className={styles.secondaryAction} onClick={saveSearchVersion} type="button">Save search version</button>
            {strategy.searchVersions.length ? <div className={styles.versionHistory}>
              <h4>Search history</h4>
              {[...strategy.searchVersions].reverse().map((version) => <article key={version.id}><div><strong>Version {version.version}</strong><span>{version.runAt ? `Run ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(version.runAt))}` : "Planned"}{version.resultCount !== null ? ` · ${version.resultCount} results` : ""}</span></div><code>{version.query}</code><p>{version.sourceSystems.join(" · ")}</p></article>)}
            </div> : null}
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeading}><span>04</span><div><h3>Stopping and update rationale</h3><p>Explain when this proposal has enough evidence to proceed and when the search must be updated.</p></div></div>
            <label className={styles.fullField}><span>Researcher’s stopping or update rationale</span><textarea onChange={(event) => setStrategy((current) => ({ ...current, stoppingRationale: event.target.value }))} placeholder="For example: planned sources searched, citation trails checked, final pass produced no new concepts, and the search will be updated before submission…" rows={6} value={strategy.stoppingRationale} /></label>
          </section>
        </main>

        <aside className={styles.reviewColumn}>
          <section className={styles.readinessPanel}>
            <span>Derived readiness</span><h3>{compiled.ready ? "Evidence plan is coherent" : "Finish the evidence contract"}</h3>
            <div className={styles.issueStack}>{compiled.issues.length ? compiled.issues.map((issue) => <div className={issue.severity === "blocking" ? styles.blockingIssue : styles.advisoryIssue} key={issue.id}><strong>{issue.severity === "blocking" ? "Resolve" : "Remember"}</strong><p>{issue.message}</p></div>) : <p className={styles.successText}>Every selected question is linked to concepts, source types, eligibility, an immutable search version, and a stopping rationale.</p>}</div>
          </section>
          <section className={styles.authorityPanel}>
            <span>Guidance registry</span><h3>Traceable, not self-certifying</h3><p>Cerise uses these sources as planning guidance. Your field, institution, protocol, and review team still control the final search and selection method.</p>
            {compiled.guidanceSources.filter((item) => item.role !== "critical-appraisal").map((item) => <a href={item.sourceUrl} key={item.id} rel="noreferrer" target="_blank"><strong>{item.name}</strong><small>{item.version}</small></a>)}
          </section>
        </aside>
      </div>

      <footer className={styles.stickyFooter}>
        <div><strong>{dirty ? "Unsaved strategy changes" : "Strategy matches the saved proposal"}</strong><span>{message ?? "Search versions are append-only; the overall strategy remains editable and revisioned."}</span></div>
        <button disabled={saving || !dirty} onClick={() => void saveStrategy()} type="button">{saving ? "Saving…" : "Save evidence strategy"}</button>
      </footer>
    </div>
  );
}
