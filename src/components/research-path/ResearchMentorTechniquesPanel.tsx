"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppIcon } from "@/components/app-shell/AppIcons";
import { mentorContextIsCurrent, type MentorContextEnvelope } from "@/lib/research/mentorContextEnvelope";
import type {
  ResearchMentorApiResponse,
  ResearchMentorCanvasSuggestion,
  ResearchMentorContext,
  ResearchMentorSuggestion,
} from "@/lib/research/researchMentor";
import {
  RESEARCH_MENTOR_TECHNIQUE_FAMILIES,
  RESEARCH_MENTOR_TECHNIQUES,
  createResearchMentorTechniqueRun,
  defaultResearchMentorTechniqueSourceIds,
  getResearchMentorTechnique,
  recommendedResearchMentorTechniqueFamily,
  recommendedResearchMentorTechniques,
  reviewResearchMentorTechniqueApplication,
  type ResearchMentorTechniqueApiMetadata,
  type ResearchMentorTechniqueFamily,
  type ResearchMentorTechniqueId,
} from "@/lib/research/researchMentorTechniques";
import {
  isResearchMentorContextBudget,
  normalizeResearchMentorFailure,
  researchMentorOfflineGuide,
  RESEARCH_MENTOR_CLIENT_TIMEOUT_MS,
  type ResearchMentorFailure,
} from "@/lib/research/researchMentorHardening";
import styles from "./ResearchMentorTechniquesPanel.module.css";

interface TechniqueApiResponse extends ResearchMentorApiResponse {
  technique: ResearchMentorTechniqueApiMetadata;
}

interface ReviewDraft {
  suggestion: ResearchMentorCanvasSuggestion;
  reviewedText: string;
  rationale: string;
}

interface Props {
  activeStepId: string;
  availability: "checking" | "available" | "unavailable";
  availabilityMessage: string;
  context: ResearchMentorContext | null;
  projectContext: MentorContextEnvelope | null;
  projectId: string;
  onApply: (response: TechniqueApiResponse, suggestion: ResearchMentorCanvasSuggestion, reviewedText: string, rationale: string) => Promise<boolean>;
  onDecision: (response: TechniqueApiResponse, suggestion: ResearchMentorSuggestion, action: "kept-current" | "dismissed", reason: string) => Promise<void>;
  onKeepReflecting: () => void;
  onReviewToSave: (response: TechniqueApiResponse, suggestion: ResearchMentorSuggestion) => void;
  onStatusChange: (message: string) => void;
}

const FAMILY_LABELS: Readonly<Record<ResearchMentorTechniqueFamily, string>> = {
  "frame-problem": "Frame the problem",
  "explore-evidence": "Explore evidence",
  "develop-questions": "Develop questions",
  "compare-decide": "Compare and decide",
  "plan-next-move": "Plan the next move",
};

function isTechniqueApiResponse(value: unknown): value is TechniqueApiResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Partial<TechniqueApiResponse>;
  return typeof candidate.summary === "string"
    && Array.isArray(candidate.suggestions)
    && typeof candidate.contextContentChecksum === "string"
    && isResearchMentorContextBudget(candidate.hardening)
    && Boolean(candidate.technique)
    && candidate.technique?.claim === "researcher-words-first-permissioned-expansion-not-evidence-or-autonomous-direction"
    && candidate.claim === "ai-advisory-research-mentoring-not-authorship-validation-approval-or-mental-health-assessment";
}

function sourceSummary(item: ResearchMentorContext["activeItems"][number]): string {
  const values = Object.values(item.fields).flatMap((value) => Array.isArray(value) ? value : [value]).filter(Boolean);
  return values[0]?.slice(0, 320) ?? "No researcher wording is available in this item.";
}

function epistemicLabel(suggestion: ResearchMentorSuggestion): string {
  if (suggestion.epistemicStatus === "supported-by-approved-evidence") return "Supported by researcher-approved project evidence";
  if (suggestion.epistemicStatus === "uncertain-needs-evidence") return "Uncertain — needs evidence";
  return "Brainstorming — not evidence";
}

export default function ResearchMentorTechniquesPanel({
  activeStepId,
  availability,
  availabilityMessage,
  context,
  projectContext,
  projectId,
  onApply,
  onDecision,
  onKeepReflecting,
  onReviewToSave,
  onStatusChange,
}: Props) {
  const initialFamily = recommendedResearchMentorTechniqueFamily(activeStepId);
  const initialTechnique = recommendedResearchMentorTechniques(activeStepId)[0] ?? RESEARCH_MENTOR_TECHNIQUES[0];
  const [family, setFamily] = useState<ResearchMentorTechniqueFamily>(initialFamily);
  const [techniqueId, setTechniqueId] = useState<ResearchMentorTechniqueId>(initialTechnique.id);
  const [sourceItemIds, setSourceItemIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [failure, setFailure] = useState<ResearchMentorFailure | null>(null);
  const [response, setResponse] = useState<TechniqueApiResponse | null>(null);
  const [review, setReview] = useState<ReviewDraft | null>(null);
  const [decisions, setDecisions] = useState<Record<string, "kept-current" | "dismissed" | "applied" | "saved">>({});
  const contextRef = useRef(context);
  const requestControllerRef = useRef<AbortController | null>(null);
  const cancelledByResearcherRef = useRef(false);
  const failedContextChecksumRef = useRef("");
  contextRef.current = context;

  const technique = getResearchMentorTechnique(techniqueId);
  const familyTechniques = RESEARCH_MENTOR_TECHNIQUES.filter((item) => item.family === family);
  const responseIsCurrent = Boolean(response && projectContext && mentorContextIsCurrent(response.contextContentChecksum, projectContext));
  const chosenSources = useMemo(() => context?.activeItems.filter((item) => sourceItemIds.includes(item.id)) ?? [], [context, sourceItemIds]);
  const applicationReview = review ? reviewResearchMentorTechniqueApplication(review.suggestion, review.reviewedText, review.rationale) : null;
  const offlineGuide = researchMentorOfflineGuide(technique.mode);

  useEffect(() => {
    const nextFamily = recommendedResearchMentorTechniqueFamily(activeStepId);
    const nextTechnique = recommendedResearchMentorTechniques(activeStepId)[0] ?? RESEARCH_MENTOR_TECHNIQUES[0];
    setFamily(nextFamily);
    setTechniqueId(nextTechnique.id);
    setResponse(null);
    setReview(null);
    setDecisions({});
  }, [activeStepId]);

  useEffect(() => {
    const currentContext = contextRef.current;
    setSourceItemIds(currentContext ? defaultResearchMentorTechniqueSourceIds(currentContext, 2) : []);
    setResponse(null);
    setReview(null);
  }, [context?.pathwayContentChecksum]);

  useEffect(() => () => requestControllerRef.current?.abort(), []);

  function selectFamily(next: ResearchMentorTechniqueFamily) {
    setFamily(next);
    const nextTechnique = RESEARCH_MENTOR_TECHNIQUES.find((item) => item.family === next);
    if (nextTechnique) setTechniqueId(nextTechnique.id);
    setResponse(null);
    setReview(null);
    setError("");
    setFailure(null);
  }

  function selectTechnique(next: ResearchMentorTechniqueId) {
    setTechniqueId(next);
    setResponse(null);
    setReview(null);
    setError("");
    setFailure(null);
  }

  function toggleSource(itemId: string) {
    setSourceItemIds((current) => current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId].slice(0, 6));
    setResponse(null);
    setReview(null);
  }

  async function runTechnique() {
    if (!context || !projectContext || availability !== "available" || !sourceItemIds.length || loading) return;
    const requestContextChecksum = projectContext.contentChecksum;
    const controller = new AbortController();
    requestControllerRef.current?.abort();
    requestControllerRef.current = controller;
    cancelledByResearcherRef.current = false;
    setLoading(true);
    setError("");
    setFailure(null);
    setResponse(null);
    setReview(null);
    try {
      const techniqueRun = await createResearchMentorTechniqueRun({ context, techniqueId, sourceItemIds, permissionGranted: true });
      const clientTimeout = window.setTimeout(() => controller.abort(), RESEARCH_MENTOR_CLIENT_TIMEOUT_MS);
      const result = await fetch("/api/ai/research-mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: controller.signal,
        body: JSON.stringify({ projectId, mode: technique.mode, prompt: technique.prompt, context, projectContext, techniqueRun, turns: [] }),
      }).finally(() => window.clearTimeout(clientTimeout));
      const body: unknown = await result.json().catch(() => ({}));
      if (!result.ok) {
        const nextFailure = normalizeResearchMentorFailure(body, result.status);
        failedContextChecksumRef.current = requestContextChecksum;
        setFailure(nextFailure);
        setError(nextFailure.error);
        return;
      }
      if (!isTechniqueApiResponse(body) || body.technique.techniqueId !== techniqueId) throw new Error("The mentor returned an invalid scholarly-technique package.");
      setResponse(body);
      onStatusChange(`${technique.label} returned ${body.suggestions.length} traceable option${body.suggestions.length === 1 ? "" : "s"} · no project change applied`);
    } catch (requestError) {
      const aborted = requestError instanceof DOMException && requestError.name === "AbortError";
      const nextFailure = normalizeResearchMentorFailure({
        error: aborted
          ? cancelledByResearcherRef.current
            ? "The technique request was cancelled. No project change was made."
            : "The technique request reached its time limit. No project change was made; you may retry once."
          : requestError instanceof Error ? requestError.message : "The scholarly technique could not complete this request.",
        code: aborted ? cancelledByResearcherRef.current ? "cancelled" : "provider-timeout" : "unknown",
        retryable: aborted && !cancelledByResearcherRef.current,
      }, aborted ? cancelledByResearcherRef.current ? 499 : 504 : 500);
      failedContextChecksumRef.current = requestContextChecksum;
      setFailure(nextFailure);
      setError(nextFailure.error);
    } finally {
      if (requestControllerRef.current === controller) requestControllerRef.current = null;
      setLoading(false);
    }
  }

  function cancelTechnique() {
    if (!requestControllerRef.current) return;
    cancelledByResearcherRef.current = true;
    requestControllerRef.current.abort();
  }

  function retryTechnique() {
    if (!failure?.retryable || !projectContext) return;
    if (failedContextChecksumRef.current !== projectContext.contentChecksum) {
      setFailure(null);
      setError("Project context changed after the failed request. Review the current sources, then start a new technique run.");
      return;
    }
    void runTechnique();
  }

  async function decide(suggestion: ResearchMentorSuggestion, action: "kept-current" | "dismissed", reason: string) {
    if (!response) return;
    await onDecision(response, suggestion, action, reason);
    setDecisions((current) => ({ ...current, [suggestion.id]: action }));
  }

  async function applyReview() {
    if (!response || !review || !applicationReview?.allowed) return;
    const applied = await onApply(response, review.suggestion, review.reviewedText, review.rationale);
    if (applied) {
      setDecisions((current) => ({ ...current, [review.suggestion.id]: "applied" }));
      setReview(null);
    }
  }

  return (
    <>
      <section className={styles.workflowHeader}>
        <span>Active workflow</span>
        <h3>{technique.label}</h3>
        <p>{technique.purpose}</p>
        <div className={styles.familyNav} aria-label="Scholarly technique families">
          {RESEARCH_MENTOR_TECHNIQUE_FAMILIES.map((item) => <button aria-pressed={family === item} key={item} onClick={() => selectFamily(item)} type="button">{FAMILY_LABELS[item]}</button>)}
        </div>
      </section>

      <section className={styles.techniqueChooser}>
        <div className={styles.sectionTitle}><span>Choose a technique</span><small>{familyTechniques.length} in this family</small></div>
        <div className={styles.techniqueRows}>{familyTechniques.map((item) => <button aria-pressed={techniqueId === item.id} key={item.id} onClick={() => selectTechnique(item.id)} type="button"><span><strong>{item.shortLabel}</strong><small>{item.purpose}</small></span><AppIcon name="arrow-right" /></button>)}</div>
      </section>

      {!context ? <section className={styles.emptyState}><strong>Add your own Stage 1 wording first.</strong><p>Scholarly techniques begin with researcher-authored ideas, frames, baseline notes, or questions. Cerise will not generate a topic from an empty canvas.</p></section> : (
        <>
          <section className={styles.sourceSection}>
            <div className={styles.sectionTitle}><span>1. Start with your words</span><small>{sourceItemIds.length} selected</small></div>
            <p>Select the project items Cerise may use. Nothing outside this bounded list can inspire the result.</p>
            <div className={styles.sourceList}>{context.activeItems.slice(0, 10).map((item) => <label key={item.id}><input checked={sourceItemIds.includes(item.id)} onChange={() => toggleSource(item.id)} type="checkbox" /><span><strong>{item.kind.replaceAll("-", " ")}</strong><small>{sourceSummary(item)}</small></span></label>)}</div>
          </section>

          <section className={styles.mirrorSection}>
            <div className={styles.sectionTitle}><span>2. Mirror first</span></div>
            <p>Cerise is using these excerpts as the starting point. It has not added a direction, claim, or evidence.</p>
            <div className={styles.mirrorExcerpts}>{chosenSources.map((item) => <blockquote key={item.id}>“{sourceSummary(item)}”<small>Stage 1 · {item.kind.replaceAll("-", " ")} · {item.id}</small></blockquote>)}</div>
          </section>

          {!response ? (
            <section className={styles.permissionSection}>
              <div className={styles.sectionTitle}><span>3. May I expand with different lenses?</span></div>
              <p>Cerise can use <strong>{technique.shortLabel.toLocaleLowerCase()}</strong> to offer {technique.minimumOptions === 3 ? "three genuinely different possibilities" : "one structured synthesis"}. They will be labeled as brainstorming unless supported by exact researcher-approved evidence.</p>
              <div className={styles.permissionActions}><button onClick={onKeepReflecting} type="button">Keep reflecting</button>{loading ? <button onClick={cancelTechnique} type="button">Cancel request</button> : <button disabled={availability !== "available" || !sourceItemIds.length} onClick={() => void runTechnique()} type="button"><AppIcon name="send" />{technique.minimumOptions === 3 ? "Explore different lenses" : "Draft reviewable memo"}</button>}</div>
              <small className={availability === "unavailable" ? styles.unavailable : undefined}>{availabilityMessage}</small>
              {availability === "unavailable" ? <div className={styles.offlineGuide}><strong>{offlineGuide.title}</strong><p>{offlineGuide.detail}</p><ol>{offlineGuide.actions.map((action) => <li key={action}>{action}</li>)}</ol><small>Local guide · not AI output · no project change</small></div> : null}
              {error ? <div className={styles.errorBlock} role="alert"><p className={styles.error}>{error}</p>{failure?.retryable ? <button disabled={loading || availability !== "available" || !sourceItemIds.length} onClick={retryTechnique} type="button">Retry request once</button> : null}</div> : null}
            </section>
          ) : (
            <>
              <section className={styles.resultsSection} aria-live="polite">
                <div className={styles.sectionTitle}><span>3. Compare before choosing</span><small>{response.suggestions.length} traceable result{response.suggestions.length === 1 ? "" : "s"}</small></div>
                {!responseIsCurrent ? <p className={styles.stale}>The pathway changed after this run. These results remain readable, but cannot be applied or saved.</p> : null}
                <p>{response.summary}</p>
                <div className={styles.resultList}>{response.suggestions.map((suggestion, index) => <article key={suggestion.id}>
                  <header><span>{index + 1}</span><div><strong>{suggestion.title}</strong><small>{suggestion.distinctiveLens}</small></div></header>
                  <p>{suggestion.kind === "canvas-option" ? suggestion.proposedText : suggestion.recommendation}</p>
                  <dl><div><dt>How this differs</dt><dd>{suggestion.rationale}</dd></div><div><dt>Inspired by</dt><dd>{suggestion.sourceItemIds.join(", ")}</dd></div><div><dt>Evidence status</dt><dd>{epistemicLabel(suggestion)}</dd></div><div><dt>Still uncertain</dt><dd>{suggestion.uncertainty}</dd></div></dl>
                  {decisions[suggestion.id] ? <em>{decisions[suggestion.id] === "applied" ? "Added by researcher" : decisions[suggestion.id] === "saved" ? "Sent to review" : decisions[suggestion.id] === "kept-current" ? "Current direction kept" : "Dismissed"}</em> : <div className={styles.resultActions}>{suggestion.kind === "canvas-option" ? <button onClick={() => setReview({ suggestion, reviewedText: suggestion.proposedText, rationale: "" })} type="button">Edit before adding</button> : <button onClick={() => { onReviewToSave(response, suggestion); setDecisions((current) => ({ ...current, [suggestion.id]: "saved" })); }} type="button">Review memo to save</button>}<button onClick={() => void decide(suggestion, "kept-current", "The researcher compared the technique result and kept the current direction.")} type="button">Keep current direction</button></div>}
                </article>)}</div>
                <button className={styles.restart} onClick={() => { setResponse(null); setReview(null); }} type="button"><AppIcon name="arrow-left" />Choose another technique</button>
              </section>

              {review ? <section className={styles.reviewSection} aria-label="Review scholarly technique option before adding">
                <div className={styles.sectionTitle}><span>4. Reflect before adding</span></div>
                <p>The original excerpt stays above. Edit this alternative or record why the unchanged wording fits your research direction.</p>
                <label>Proposed alternative<textarea maxLength={2_000} onChange={(event) => setReview((current) => current ? { ...current, reviewedText: event.target.value } : null)} rows={5} value={review.reviewedText} /></label>
                <label>Why this direction fits, or what remains uncertain<textarea maxLength={1_000} onChange={(event) => setReview((current) => current ? { ...current, rationale: event.target.value } : null)} placeholder="Record your reason, uncertainty, or criterion…" rows={4} value={review.rationale} /></label>
                <p className={applicationReview?.allowed ? styles.ready : styles.reviewRequirement}>{applicationReview?.reason}</p>
                <div className={styles.reviewActions}><button onClick={() => setReview(null)} type="button">Cancel</button><button disabled={!applicationReview?.allowed || !responseIsCurrent} onClick={() => void applyReview()} type="button"><AppIcon name="plus" />Add as a new alternative</button></div>
              </section> : null}
            </>
          )}
        </>
      )}
    </>
  );
}
