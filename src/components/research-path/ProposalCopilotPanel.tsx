"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  appendLocalProposalCopilotDecisions,
  applyProposalCopilotPatch,
  compileProposalCopilotReview,
  createProposalCopilotContext,
  createProposalCopilotDecisionRecords,
  normalizeAndVerifyProposalCopilotPatch,
  PROPOSAL_COPILOT_TECHNIQUES,
  type ProposalCopilotOperationDecision,
  type ProposalCopilotPatch,
  type ProposalCopilotReview,
  type ProposalCopilotTechnique,
} from "@/lib/research/proposalCopilotPhase8";
import { appendResearchDecisionEvent } from "@/lib/research/researchFoundationPersistence";
import type { ProjectEvidenceAssessment, ResearchProposalDocument, ResearchProposalSection, ResearchProposalRevisionRecord } from "@/lib/research/researchProposalDocument";
import styles from "./ProposalCopilotPanel.module.css";

interface ProposalCopilotPanelProps {
  cloudUserId: string | null;
  document: ResearchProposalDocument;
  eligibleAssessments: ProjectEvidenceAssessment[];
  hasUnsavedChanges: boolean;
  onClose: () => void;
  onSave: (
    sections: ResearchProposalSection[],
    options?: { createdBy?: ResearchProposalRevisionRecord["createdBy"] },
  ) => Promise<ResearchProposalDocument>;
  onStatusChange: (status: string) => void;
  projectId: string;
  section: ResearchProposalSection;
}

const TECHNIQUE_LABELS: Record<ProposalCopilotTechnique, { label: string; description: string }> = {
  outline: { label: "Outline", description: "Add or refine signposting without inventing content." },
  "evidence-synthesis": { label: "Evidence synthesis", description: "Connect only the selected reviewed source notes and caveats." },
  clarity: { label: "Clarity", description: "Simplify ambiguous or overlong prose while preserving meaning." },
  structure: { label: "Structure", description: "Improve bounded paragraph flow and transitions." },
  consistency: { label: "Consistency", description: "Align terminology visible inside this selected scope." },
};

function initialDecisions(patch: ProposalCopilotPatch): ProposalCopilotOperationDecision[] {
  return patch.operations.map((operation) => ({
    operationId: operation.id,
    disposition: "defer",
    rationale: "",
    proposedText: operation.proposedText,
  }));
}

function friendlyError(value: unknown): string {
  if (value && typeof value === "object" && "error" in value && typeof value.error === "string") return value.error;
  return "Proposal Copilot could not complete this request. No proposal change was made.";
}

export function ProposalCopilotPanel({
  cloudUserId,
  document,
  eligibleAssessments,
  hasUnsavedChanges,
  onClose,
  onSave,
  onStatusChange,
  projectId,
  section,
}: ProposalCopilotPanelProps) {
  const [technique, setTechnique] = useState<ProposalCopilotTechnique>("clarity");
  const [focus, setFocus] = useState("");
  const [selectedAssessmentIds, setSelectedAssessmentIds] = useState<string[]>(() => eligibleAssessments.slice(0, 4).map((assessment) => assessment.assessmentId));
  const [availability, setAvailability] = useState<"checking" | "available" | "unavailable">("checking");
  const [availabilityMessage, setAvailabilityMessage] = useState("Checking the configured AI lane…");
  const [patch, setPatch] = useState<ProposalCopilotPatch | null>(null);
  const [decisions, setDecisions] = useState<ProposalCopilotOperationDecision[]>([]);
  const [review, setReview] = useState<ProposalCopilotReview | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const eligibleById = useMemo(() => new Map(eligibleAssessments.map((assessment) => [assessment.assessmentId, assessment])), [eligibleAssessments]);

  useEffect(() => {
    let cancelled = false;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setAvailability("unavailable");
      setAvailabilityMessage("You are offline. Saved proposal work remains available; reconnect to request a new patch.");
      return;
    }
    fetch("/api/ai/proposal-copilot", { cache: "no-store" })
      .then(async (response) => ({ ok: response.ok, body: await response.json().catch(() => null) }))
      .then(({ ok, body }) => {
        if (cancelled) return;
        setAvailability(ok && body?.available ? "available" : "unavailable");
        setAvailabilityMessage(typeof body?.message === "string" ? body.message : ok ? "Proposal Copilot is available." : "Proposal Copilot is not configured.");
      })
      .catch(() => {
        if (!cancelled) {
          setAvailability("unavailable");
          setAvailabilityMessage("The availability check failed. Your proposal remains unchanged; retry when the connection returns.");
        }
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!patch) { setReview(null); return; }
    void compileProposalCopilotReview({ document, patch, decisions }).then((result) => {
      if (!cancelled) setReview(result);
    });
    return () => { cancelled = true; };
  }, [decisions, document, patch]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const toggleAssessment = (assessmentId: string, checked: boolean) => {
    setSelectedAssessmentIds((current) => checked
      ? [...new Set([...current, assessmentId])].slice(0, 12)
      : current.filter((id) => id !== assessmentId));
    setPatch(null);
    setDecisions([]);
    setMessage(null);
  };

  const updateDecision = (operationId: string, changes: Partial<ProposalCopilotOperationDecision>) => {
    setDecisions((current) => current.map((decision) => decision.operationId === operationId ? { ...decision, ...changes } : decision));
    setMessage(null);
  };

  const requestPatch = async () => {
    if (hasUnsavedChanges) {
      setMessage("Save the current proposal draft before requesting a checksum-bound patch.");
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setMessage("You are offline. No request was sent and no proposal change was made.");
      return;
    }
    setRequesting(true);
    setMessage(null);
    setPatch(null);
    setDecisions([]);
    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 50_000);
    try {
      const context = await createProposalCopilotContext({ document, sectionId: section.id, assessments: eligibleAssessments, selectedAssessmentIds, technique, focus });
      const response = await fetch("/api/ai/proposal-copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, context }),
        signal: controller.signal,
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(friendlyError(body));
      const verified = await normalizeAndVerifyProposalCopilotPatch(body?.patch, projectId);
      if (!verified || verified.sectionId !== section.id || verified.baseProposal.checksum !== document.identity.checksum) throw new Error("The returned patch could not be verified against the current proposal revision.");
      setPatch(verified);
      setDecisions(initialDecisions(verified));
      setMessage("Patch received. Every operation is deferred until you review it; nothing has changed.");
    } catch (error) {
      setMessage(error instanceof DOMException && error.name === "AbortError"
        ? "The request was cancelled or timed out. No proposal change was made."
        : error instanceof Error ? error.message : friendlyError(error));
    } finally {
      window.clearTimeout(timeout);
      abortRef.current = null;
      setRequesting(false);
    }
  };

  const commitDecisions = async () => {
    if (!patch || !review?.canCommit) return;
    setCommitting(true);
    setMessage(null);
    try {
      let resultingDocument: ResearchProposalDocument | null = null;
      if (review.accepted > 0) {
        const sections = await applyProposalCopilotPatch({ document, patch, decisions });
        resultingDocument = await onSave(sections, { createdBy: "reviewed-ai-patch" });
      }
      const records = await createProposalCopilotDecisionRecords({ document, resultingDocument, patch, decisions });
      await appendLocalProposalCopilotDecisions(window.localStorage, projectId, records);
      if (cloudUserId) {
        const client = createClient();
        const results = await Promise.allSettled(records.map((record) => appendResearchDecisionEvent(client, cloudUserId, record)));
        if (results.some((result) => result.status === "rejected")) onStatusChange("Proposal saved; some secure decision-ledger events remain only on this device");
      }
      const outcome = review.accepted > 0
        ? `${review.accepted} accepted operation${review.accepted === 1 ? "" : "s"} created one new proposal revision; ${review.declined} declined operation${review.declined === 1 ? "" : "s"} changed nothing.`
        : `All ${review.declined} operations were declined and recorded. Proposal prose did not change.`;
      setMessage(outcome);
      onStatusChange(outcome);
      setPatch(null);
      setDecisions([]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The reviewed decisions could not be committed. No additional change was made.");
    } finally {
      setCommitting(false);
    }
  };

  return (
    <section className={styles.panel} aria-label="Proposal Copilot review" data-testid="proposal-copilot-panel">
      <header className={styles.header}>
        <div><span>Build 2 · Phase 8</span><h3>Proposal Copilot</h3><p>One saved section, selected reviewed sources, and review-before-apply operations. The researcher remains the author.</p></div>
        <button onClick={onClose} type="button">Close</button>
      </header>

      <div className={availability === "available" ? styles.availabilityReady : styles.availabilityReview} role="status"><strong>{availability === "checking" ? "Checking" : availability === "available" ? "AI lane available" : "AI lane unavailable"}</strong><span>{availabilityMessage}</span></div>
      {hasUnsavedChanges ? <div className={styles.saveBoundary} role="alert"><strong>Save before requesting</strong><p>The copilot binds to an immutable proposal checksum. Save your draft first so a later edit can reliably invalidate an older patch.</p></div> : null}

      <section className={styles.scopeCard}>
        <div className={styles.scopeHeading}><span>Selected scope</span><strong>{section.title}</strong><small>{section.content.trim().split(/\s+/).filter(Boolean).length} words · proposal revision {document.revision}</small></div>
        <div className={styles.techniques} aria-label="Writing technique">{PROPOSAL_COPILOT_TECHNIQUES.map((item) => <button aria-pressed={technique === item} key={item} onClick={() => { setTechnique(item); setPatch(null); }} type="button"><strong>{TECHNIQUE_LABELS[item].label}</strong><small>{TECHNIQUE_LABELS[item].description}</small></button>)}</div>
        <label className={styles.focus}><span>Optional focus for this run</span><textarea maxLength={1200} onChange={(event) => { setFocus(event.target.value); setPatch(null); }} placeholder="For example: make the transition into the gap explicit without strengthening the claim." rows={3} value={focus} /></label>
      </section>

      <section className={styles.sources}>
        <div><span>Reviewed sources already linked to this section</span><strong>Select up to 12 for this run</strong><p>Source inclusion cannot be changed here. Unselected sources and the rest of the proposal are excluded from the provider context.</p></div>
        <div className={styles.sourceList}>{eligibleAssessments.length ? eligibleAssessments.map((assessment) => <label key={assessment.assessmentId}><input checked={selectedAssessmentIds.includes(assessment.assessmentId)} disabled={!selectedAssessmentIds.includes(assessment.assessmentId) && selectedAssessmentIds.length >= 12} onChange={(event) => toggleAssessment(assessment.assessmentId, event.target.checked)} type="checkbox" /><span><strong>{assessment.sourceId}</strong><small>{assessment.decisionRationale || "Included by the researcher"}</small></span></label>) : <p>No included, reviewed source assessment is linked to this section. Clarity, outline, structure, and consistency techniques can still work from the selected prose; evidence synthesis should wait for linked sources.</p>}</div>
      </section>

      <div className={styles.requestRow}><div><strong>No automatic changes</strong><span>Requests time out, can be cancelled, and never store prompt or chat history in the decision ledger.</span></div>{requesting ? <button className={styles.cancelButton} onClick={() => abortRef.current?.abort()} type="button">Cancel request</button> : <button className={styles.requestButton} disabled={availability !== "available" || hasUnsavedChanges || (technique === "evidence-synthesis" && selectedAssessmentIds.length === 0)} onClick={() => void requestPatch()} type="button">Generate reviewable patch</button>}</div>

      {patch ? <section className={styles.patchReview}>
        <header><div><span>Structured writing patch</span><h4>{patch.summary}</h4><p>{patch.operations.length} bounded operation{patch.operations.length === 1 ? "" : "s"} · model {patch.servedModel}</p></div><code>{patch.checksum.slice(0, 20)}…</code></header>
        <div className={styles.operationList}>{patch.operations.map((operation, index) => {
          const decision = decisions.find((item) => item.operationId === operation.id);
          const sourceNames = operation.evidenceAssessmentIds.map((id) => eligibleById.get(id)?.sourceId ?? id);
          return <article className={styles.operation} key={operation.id}>
            <div className={styles.operationHeader}><span>{String(index + 1).padStart(2, "0")} · {operation.kind.replace("-", " ")}</span><strong>{operation.title}</strong><p>{operation.rationale}</p><small>Uncertainty: {operation.uncertainty}</small>{sourceNames.length ? <small>Evidence scope: {sourceNames.join(" · ")}</small> : null}</div>
            <div className={styles.diffGrid}><label><span>Current saved text</span><textarea readOnly rows={7} value={operation.kind === "insert-after" ? `${operation.currentText}\n\n[Insert after this anchor]` : operation.currentText} /></label><label><span>Proposed text — editable before acceptance</span><textarea maxLength={12000} onChange={(event) => updateDecision(operation.id, { proposedText: event.target.value })} rows={7} value={decision?.proposedText ?? operation.proposedText} /></label></div>
            <div className={styles.decisionRow}><div role="group" aria-label={`Decision for ${operation.title}`}><button aria-pressed={decision?.disposition === "accept"} onClick={() => updateDecision(operation.id, { disposition: "accept" })} type="button">Accept</button><button aria-pressed={decision?.disposition === "decline"} onClick={() => updateDecision(operation.id, { disposition: "decline" })} type="button">Decline</button><button aria-pressed={!decision || decision.disposition === "defer"} onClick={() => updateDecision(operation.id, { disposition: "defer" })} type="button">Defer</button></div><label><span>Researcher rationale</span><input maxLength={2000} onChange={(event) => updateDecision(operation.id, { rationale: event.target.value })} placeholder="Why does this operation fit—or not fit—the evidence and your intended meaning?" value={decision?.rationale ?? ""} /></label></div>
          </article>;
        })}</div>
        <footer className={styles.commitRow}><div><strong>{review?.message ?? "Checking the current saved revision…"}</strong><span>{review ? `${review.accepted} accept · ${review.declined} decline · ${review.deferred} defer` : ""}</span></div><button disabled={!review?.canCommit || committing} onClick={() => void commitDecisions()} type="button">{committing ? "Committing decisions…" : review?.accepted ? "Apply accepted operations" : "Record declined operations"}</button></footer>
      </section> : null}

      {message ? <p className={styles.message} aria-live="polite">{message}</p> : null}
      <footer className={styles.boundary}><strong>Authority boundary</strong><p>Proposal Copilot cannot alter requirements, source inclusion, research questions, study-contract decisions, or readiness. It cannot verify evidence or make legal, ethics, methodological, funding, submission, or publication decisions.</p></footer>
    </section>
  );
}
