"use client";

import { useEffect, useMemo, useState } from "react";
import { AppIcon } from "@/components/app-shell/AppIcons";
import {
  createConsentAssistantContext,
  createConsentAssistantDecisionRecord,
  defaultConsentAssistantPrompt,
  readConsentAssistantDecisions,
  redactConsentAssistantText,
  writeConsentAssistantDecisions,
  type ConsentAssistantDecisionAction,
  type ConsentAssistantMode,
  type ConsentAssistantRedactionSummary,
  type ConsentAssistantSuggestion,
} from "@/lib/research/consentAssistant";
import {
  updateConsentPhase5Clause,
  type ConsentPhase5Clause,
  type ConsentPhase5Document,
  type ConsentPhase5Form,
} from "@/lib/research/consentPhase5";
import styles from "./ConsentAssistantPanel.module.css";

interface ConsentAssistantPanelProps {
  activeClause: ConsentPhase5Clause | null;
  activeForm: ConsentPhase5Form | null;
  onProtocolChange: (document: ConsentPhase5Document) => void;
  onStatusChange: (message: string) => void;
  projectId: string;
  protocol: ConsentPhase5Document;
}

interface ConsentAssistantApiResponse {
  summary: string;
  suggestions: ConsentAssistantSuggestion[];
  rejectedSuggestions: Array<{ index: number; reason: string }>;
  generatedAt: string;
  servedModel: string;
  mode: ConsentAssistantMode;
  scope: {
    formId: string;
    clauseId: string | null;
    explicitFullFormReview: boolean;
  };
  baseRevisionChecksum: `sha256:${string}`;
  redactionSummary: ConsentAssistantRedactionSummary;
  excludedContent: string[];
  claim: "ai-advisory-review-not-approval-compliance-or-legal-advice";
}

const MODES: ReadonlyArray<{
  id: ConsentAssistantMode;
  label: string;
  detail: string;
  icon: "help" | "edit" | "lightbulb" | "workflow" | "shield";
  fullFormAllowed: boolean;
}> = [
  {
    id: "missing-facts",
    label: "Missing facts",
    detail: "Ask what a researcher still needs to establish.",
    icon: "help",
    fullFormAllowed: true,
  },
  {
    id: "draft-clause",
    label: "Draft clause",
    detail: "Propose one bounded option for this editable clause.",
    icon: "edit",
    fullFormAllowed: false,
  },
  {
    id: "explain-simplify",
    label: "Explain",
    detail: "Explain wording and consider a plain-language option.",
    icon: "lightbulb",
    fullFormAllowed: false,
  },
  {
    id: "compare",
    label: "Compare",
    detail: "Check the selected scope against implemented study facts.",
    icon: "workflow",
    fullFormAllowed: true,
  },
  {
    id: "final-review",
    label: "Advisory review",
    detail: "Review clarity, voluntariness, consistency, and optionality.",
    icon: "shield",
    fullFormAllowed: true,
  },
];

function isApiResponse(value: unknown): value is ConsentAssistantApiResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Partial<ConsentAssistantApiResponse>;
  return typeof candidate.summary === "string"
    && Array.isArray(candidate.suggestions)
    && typeof candidate.servedModel === "string"
    && typeof candidate.baseRevisionChecksum === "string"
    && candidate.claim === "ai-advisory-review-not-approval-compliance-or-legal-advice";
}

function redactionCount(summary: ConsentAssistantRedactionSummary | null): number {
  return summary ? Object.values(summary).reduce((total, count) => total + count, 0) : 0;
}

function shortChecksum(checksum: string): string {
  return checksum.length > 24 ? `${checksum.slice(0, 17)}…${checksum.slice(-7)}` : checksum;
}

function suggestionLabel(kind: ConsentAssistantSuggestion["kind"]): string {
  return {
    "clause-patch": "Draft wording",
    "plain-language-alternative": "Plain-language option",
    finding: "Advisory finding",
    question: "Researcher question",
  }[kind];
}

function responseError(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "The consent copilot could not complete this request.";
  }
  const error = (value as { error?: unknown }).error;
  return typeof error === "string"
    ? error
    : "The consent copilot could not complete this request.";
}

export default function ConsentAssistantPanel({
  activeClause,
  activeForm,
  onProtocolChange,
  onStatusChange,
  projectId,
  protocol,
}: ConsentAssistantPanelProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ConsentAssistantMode>("missing-facts");
  const [fullFormReview, setFullFormReview] = useState(false);
  const [prompt, setPrompt] = useState(defaultConsentAssistantPrompt("missing-facts"));
  const [disclosure, setDisclosure] = useState<{
    redactionSummary: ConsentAssistantRedactionSummary;
    baseRevisionChecksum: `sha256:${string}`;
    clauseCount: number;
    factCount: number;
  } | null>(null);
  const [disclosureReady, setDisclosureReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [keyStatus, setKeyStatus] = useState<"checking" | "connected" | "missing" | "unavailable">("checking");
  const [keyMessage, setKeyMessage] = useState("");
  const [response, setResponse] = useState<ConsentAssistantApiResponse | null>(null);
  const [decisions, setDecisions] = useState<Record<string, ConsentAssistantDecisionAction>>({});
  const [decisionCount, setDecisionCount] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState("");

  const selectedMode = MODES.find((item) => item.id === mode) ?? MODES[0];
  const effectiveFullFormReview = selectedMode.fullFormAllowed && fullFormReview;
  const selectedClauseId = activeClause?.id ?? null;
  const canRequest = Boolean(
    activeForm
    && (selectedClauseId || effectiveFullFormReview)
    && disclosureReady
    && !loading,
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void fetch("/api/ai/consent-assistant", { cache: "no-store" })
      .then(async (result) => {
        const body = await result.json().catch(() => ({}));
        if (cancelled) return;
        if (result.ok && body.connected === true) {
          setKeyStatus("connected");
          setKeyMessage("OpenRouter BYOK is connected. Cerise never uses a fallback key for consent review.");
        } else if (body.connected === false) {
          setKeyStatus("missing");
          setKeyMessage(typeof body.message === "string" ? body.message : "Connect an OpenRouter key in Settings → AI.");
        } else {
          setKeyStatus("unavailable");
          setKeyMessage(typeof body.message === "string" ? body.message : "OpenRouter status is temporarily unavailable.");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setKeyStatus("unavailable");
          setKeyMessage("OpenRouter status is temporarily unavailable.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    try {
      setDecisionCount(readConsentAssistantDecisions(window.localStorage, projectId).length);
    } catch {
      setDecisionCount(0);
    }
  }, [open, projectId]);

  useEffect(() => {
    if (!open || !activeForm || (!selectedClauseId && !effectiveFullFormReview)) {
      setDisclosure(null);
      setDisclosureReady(false);
      return;
    }
    let cancelled = false;
    setDisclosureReady(false);
    void createConsentAssistantContext(
      protocol,
      mode,
      activeForm.id,
      selectedClauseId,
      effectiveFullFormReview,
    ).then((context) => {
      if (cancelled || !context) return;
      redactConsentAssistantText(prompt, context.redactionSummary);
      setDisclosure({
        redactionSummary: context.redactionSummary,
        baseRevisionChecksum: context.baseRevisionChecksum,
        clauseCount: context.form.clauses.length,
        factCount: context.studyFacts.length,
      });
      setDisclosureReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [activeForm, effectiveFullFormReview, mode, open, prompt, protocol, selectedClauseId]);

  const decidedSuggestions = useMemo(() => new Set(Object.keys(decisions)), [decisions]);

  function chooseMode(nextMode: ConsentAssistantMode) {
    setMode(nextMode);
    const next = MODES.find((item) => item.id === nextMode) ?? MODES[0];
    if (!next.fullFormAllowed) setFullFormReview(false);
    setPrompt(defaultConsentAssistantPrompt(nextMode));
    setResponse(null);
    setDecisions({});
    setError("");
  }

  async function runReview() {
    if (!activeForm || !canRequest) return;
    setLoading(true);
    setError("");
    setResponse(null);
    setDecisions({});
    setEditingId(null);
    try {
      const result = await fetch("/api/ai/consent-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          projectId,
          mode,
          prompt,
          formId: activeForm.id,
          clauseId: selectedClauseId,
          explicitFullFormReview: effectiveFullFormReview,
          document: protocol,
        }),
      });
      const body: unknown = await result.json().catch(() => ({}));
      if (!result.ok) throw new Error(responseError(body));
      if (!isApiResponse(body)) throw new Error("The consent copilot returned an invalid review package.");
      setResponse(body);
      onStatusChange("AI consent review received · no changes applied");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The consent copilot could not complete this request.");
    } finally {
      setLoading(false);
    }
  }

  async function recordDecision(
    suggestion: ConsentAssistantSuggestion,
    action: ConsentAssistantDecisionAction,
    proposedText: string | null,
    resultingText: string | null,
  ) {
    if (!response) return;
    const record = await createConsentAssistantDecisionRecord({
      projectId,
      suggestion,
      mode: response.mode,
      action,
      baseRevisionChecksum: response.baseRevisionChecksum,
      proposedText,
      resultingText,
      servedModel: response.servedModel,
    });
    try {
      const current = readConsentAssistantDecisions(window.localStorage, projectId);
      writeConsentAssistantDecisions(window.localStorage, projectId, [...current, record]);
      setDecisionCount(Math.min(200, current.length + 1));
    } catch {
      onStatusChange("Consent text updated, but the local AI decision record could not be saved");
    }
    setDecisions((current) => ({ ...current, [suggestion.id]: action }));
  }

  async function applySuggestion(
    suggestion: ConsentAssistantSuggestion,
    text: string,
    action: "applied" | "applied-after-edit",
  ) {
    if (!response || (suggestion.kind !== "clause-patch" && suggestion.kind !== "plain-language-alternative")) return;
    const currentForm = protocol.forms.find((form) => form.id === response.scope.formId);
    const currentClause = currentForm?.clauses.find((clause) => clause.id === suggestion.clauseId);
    if (!currentForm || !currentClause) {
      setError("The target clause no longer exists. Run the review again.");
      return;
    }
    const currentContext = await createConsentAssistantContext(
      protocol,
      response.mode,
      response.scope.formId,
      response.scope.clauseId,
      response.scope.explicitFullFormReview,
    );
    if (!currentContext || currentContext.baseRevisionChecksum !== response.baseRevisionChecksum) {
      setError("This suggestion is stale because the scoped form changed. Run the review again before applying it.");
      return;
    }
    const updated = updateConsentPhase5Clause(protocol, suggestion.clauseId, { text });
    if (updated.issues.length > 0) {
      setError(`The existing consent policy rejected this edit: ${updated.issues.join(", ")}.`);
      return;
    }
    onProtocolChange(updated.document);
    await recordDecision(suggestion, action, suggestion.proposedText, text);
    setEditingId(null);
    setEditedText("");
    setError("");
    onStatusChange("Researcher-applied AI suggestion saved for renewed human review");
  }

  async function keepCurrent(suggestion: ConsentAssistantSuggestion) {
    const proposedText = suggestion.kind === "clause-patch" || suggestion.kind === "plain-language-alternative"
      ? suggestion.proposedText
      : null;
    const currentText = suggestion.clauseId
      ? protocol.forms.flatMap((form) => form.clauses).find((clause) => clause.id === suggestion.clauseId)?.text ?? null
      : null;
    await recordDecision(suggestion, "kept-current", proposedText, currentText);
    setEditingId(null);
    onStatusChange("Researcher decision recorded · current wording kept");
  }

  return (
    <section className={styles.panel} aria-label="AI consent copilot">
      <header className={styles.panelHeader}>
        <div className={styles.titleBlock}>
          <span className={styles.eyebrow}>Phase 9 · optional advisory layer</span>
          <h2>Review-before-apply consent copilot</h2>
          <p>
            Ask for clarity and consistency help. AI cannot approve a form, make a legal determination,
            or change anything without your separate action.
          </p>
        </div>
        <button
          aria-expanded={open}
          className={styles.openButton}
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          <AppIcon name={open ? "chevron-down" : "lightbulb"} />
          {open ? "Close copilot" : "Open copilot"}
        </button>
      </header>

      {open ? (
        <div className={styles.workspace}>
          <aside className={styles.modeRail}>
            <h3>Choose one bounded task</h3>
            <div className={styles.modeList} role="list">
              {MODES.map((item) => (
                <button
                  aria-pressed={mode === item.id}
                  className={mode === item.id ? styles.modeActive : undefined}
                  key={item.id}
                  onClick={() => chooseMode(item.id)}
                  type="button"
                >
                  <AppIcon name={item.icon} />
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.detail}</small>
                  </span>
                </button>
              ))}
            </div>
            <div className={styles.ledgerSummary}>
              <span>Local decision ledger</span>
              <strong>{decisionCount} recorded action{decisionCount === 1 ? "" : "s"}</strong>
              <small>Checksums and action metadata only. Chat is not saved.</small>
            </div>
          </aside>

          <div className={styles.requestColumn}>
            <div className={styles.scopeHeader}>
              <div>
                <span>Selected scope</span>
                <strong>{activeForm?.title ?? "No form selected"}</strong>
                <small>{effectiveFullFormReview ? "Entire selected form" : activeClause?.title ?? "No clause selected"}</small>
              </div>
              {selectedMode.fullFormAllowed ? (
                <label className={styles.scopeToggle}>
                  <input
                    checked={fullFormReview}
                    onChange={(event) => {
                      setFullFormReview(event.target.checked);
                      setResponse(null);
                      setDecisions({});
                    }}
                    type="checkbox"
                  />
                  <span>Explicitly include the entire selected form</span>
                </label>
              ) : null}
            </div>

            <label className={styles.promptField}>
              <span>What should the copilot focus on?</span>
              <textarea
                maxLength={1_500}
                onChange={(event) => setPrompt(event.target.value)}
                rows={4}
                value={prompt}
              />
              <small>{prompt.length} / 1,500 · Do not paste participant data or approval correspondence.</small>
            </label>

            <div className={styles.disclosure} role="note">
              <AppIcon name="shield" />
              <div>
                <strong>Before sending to OpenRouter</strong>
                <p>
                  The server compiles only {disclosure?.clauseCount ?? 0} selected clause{disclosure?.clauseCount === 1 ? "" : "s"}
                  {" "}and {disclosure?.factCount ?? 0} linked planning fact{disclosure?.factCount === 1 ? "" : "s"}.
                  Participant data, uploaded files, governance decisions, approval correspondence, and authority identifiers are excluded.
                </p>
                <span>
                  {redactionCount(disclosure?.redactionSummary ?? null)} identifier or contact field{redactionCount(disclosure?.redactionSummary ?? null) === 1 ? "" : "s"} redacted
                  {disclosure ? ` · ${shortChecksum(disclosure.baseRevisionChecksum)}` : " · Preparing disclosure…"}
                </span>
                <small>Processing occurs through your OpenRouter key under the selected provider&apos;s terms; this is not local AI.</small>
              </div>
            </div>

            <div className={styles.requestActions}>
              <div className={styles.keyStatus} data-status={keyStatus}>
                <span />
                <p>{keyStatus === "checking" ? "Checking OpenRouter BYOK…" : keyMessage}</p>
              </div>
              <button disabled={!canRequest || keyStatus === "missing"} onClick={() => void runReview()} type="button">
                <AppIcon name="send" />
                {loading ? "Reviewing selected scope…" : "Send selected scope for review"}
              </button>
            </div>
            {keyStatus === "missing" ? (
              <a className={styles.settingsLink} href="/settings/ai">Connect OpenRouter in Settings → AI</a>
            ) : null}
            {error ? <div className={styles.error} role="alert"><AppIcon name="alert" />{error}</div> : null}
          </div>

          <div className={styles.resultsColumn} aria-live="polite">
            {!response && !loading ? (
              <div className={styles.emptyResults}>
                <AppIcon name="lightbulb" />
                <h3>No advisory review yet</h3>
                <p>Choose a task, verify the disclosure, and send only the selected scope.</p>
              </div>
            ) : null}
            {loading ? (
              <div className={styles.loadingResults} role="status"><span />Checking wording without applying changes…</div>
            ) : null}
            {response ? (
              <>
                <div className={styles.responseSummary}>
                  <span>Advisory summary</span>
                  <p>{response.summary}</p>
                  <small>{response.servedModel} · {response.suggestions.length} reviewable · {response.rejectedSuggestions.length} rejected by safety parser</small>
                </div>
                <ol className={styles.suggestionList}>
                  {response.suggestions.map((suggestion, index) => {
                    const decided = decisions[suggestion.id];
                    const patchSuggestion = suggestion.kind === "clause-patch" || suggestion.kind === "plain-language-alternative";
                    const localCurrentText = suggestion.clauseId
                      ? protocol.forms
                        .flatMap((form) => form.clauses)
                        .find((clause) => clause.id === suggestion.clauseId)?.text
                      : null;
                    return (
                      <li className={styles.suggestionCard} key={`${suggestion.id}-${index}`}>
                        <div className={styles.suggestionHeading}>
                          <span>{suggestionLabel(suggestion.kind)}</span>
                          <strong>{suggestion.title}</strong>
                          {decided ? <small><AppIcon name="check-square" /> {decided.replaceAll("-", " ")}</small> : null}
                        </div>
                        {patchSuggestion ? (
                          <div className={styles.wordingCompare}>
                            <div>
                              <span>Current wording</span>
                              <p>{localCurrentText ?? suggestion.currentText}</p>
                            </div>
                            <div>
                              <span>Proposed wording</span>
                              <p>{suggestion.proposedText}</p>
                            </div>
                          </div>
                        ) : suggestion.kind === "finding" ? (
                          <div className={styles.findingBody}>
                            <p><strong>Observation:</strong> {suggestion.observation}</p>
                            <p><strong>Researcher action:</strong> {suggestion.recommendation}</p>
                          </div>
                        ) : suggestion.kind === "question" ? (
                          <div className={styles.findingBody}>
                            <p><strong>Question:</strong> {suggestion.question}</p>
                            <p><strong>Why needed:</strong> {suggestion.whyNeeded}</p>
                          </div>
                        ) : null}
                        <dl className={styles.suggestionMeta}>
                          <div><dt>Rationale</dt><dd>{suggestion.rationale}</dd></div>
                          <div><dt>Uncertainty</dt><dd>{suggestion.uncertainty}</dd></div>
                          <div><dt>Check for conflict</dt><dd>{suggestion.potentialConflict}</dd></div>
                          <div><dt>Study facts</dt><dd>{suggestion.factIds.length > 0 ? suggestion.factIds.join(", ") : "No factual assertion cited"}</dd></div>
                        </dl>
                        {editingId === suggestion.id && patchSuggestion ? (
                          <label className={styles.manualEdit}>
                            <span>Researcher edit</span>
                            <textarea
                              maxLength={20_000}
                              onChange={(event) => setEditedText(event.target.value)}
                              rows={7}
                              value={editedText}
                            />
                          </label>
                        ) : null}
                        <div className={styles.suggestionActions}>
                          {patchSuggestion && !decided ? (
                            <>
                              <button onClick={() => void applySuggestion(suggestion, suggestion.proposedText, "applied")} type="button">
                                <AppIcon name="check-square" /> Apply this suggestion
                              </button>
                              {editingId === suggestion.id ? (
                                <button disabled={!editedText.trim()} onClick={() => void applySuggestion(suggestion, editedText, "applied-after-edit")} type="button">
                                  <AppIcon name="save" /> Apply my edited text
                                </button>
                              ) : (
                                <button onClick={() => { setEditingId(suggestion.id); setEditedText(suggestion.proposedText); }} type="button">
                                  <AppIcon name="edit" /> Edit manually
                                </button>
                              )}
                            </>
                          ) : null}
                          {!decided ? (
                            <button className={styles.keepButton} onClick={() => void keepCurrent(suggestion)} type="button">
                              <AppIcon name="thumb-down" /> Keep current / record reviewed
                            </button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ol>
                {response.suggestions.length === 0 ? (
                  <div className={styles.noSuggestions}>
                    <AppIcon name="shield" />
                    <p>No model suggestion passed the bounded parser. Nothing can be applied from this response.</p>
                  </div>
                ) : null}
                {decidedSuggestions.size > 0 ? (
                  <p className={styles.decisionNote}>
                    Each action was recorded separately. Applied wording returns to human-review-required state and does not change readiness by itself.
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
