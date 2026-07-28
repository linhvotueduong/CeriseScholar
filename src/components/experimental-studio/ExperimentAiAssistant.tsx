"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppIcon } from "@/components/app-shell/AppIcons";
import {
  createExperimentAssistantContext,
  type ExperimentAssistantBlockPatch,
  type ExperimentAssistantMessage,
  type ExperimentAssistantSuggestion,
} from "@/lib/research/experimentAssistant";
import type { ExperimentBlockType, ExperimentStudioDocument } from "@/lib/research/experimentStudio";
import type { StudyDesignDocument } from "@/lib/research/studyDesign";
import styles from "./ExperimentAiAssistant.module.css";

interface ExperimentAiAssistantProps {
  projectId: string;
  studio: ExperimentStudioDocument;
  activeBlockId: string;
  studyDesign: StudyDesignDocument | null;
  onApplyPatch: (blockId: string, patch: ExperimentAssistantBlockPatch) => void;
  onAddBlock: (blockType: ExperimentBlockType, patch: ExperimentAssistantBlockPatch) => void;
  onClose: () => void;
}

interface KeyStatus {
  connected: boolean;
  usesCeriseFallback: false;
  freeModelChain?: boolean;
  limitConfigured?: boolean;
  limitUsd?: number | null;
  limitRemainingUsd?: number | null;
  limitReset?: string | null;
  statusUnavailable?: boolean;
  message?: string;
}

interface ChatEntry extends ExperimentAssistantMessage {
  id: string;
  suggestions?: ExperimentAssistantSuggestion[];
}

const QUICK_ACTIONS = [
  {
    label: "Review for release",
    prompt: "Perform a doctoral-level pre-release review of this experiment. Check construct-to-measure alignment, consent and debrief flow, condition logic, randomization, response deadlines, keyboard scoring, attention or manipulation checks, practice trials, demand characteristics, accessibility, privacy, missing-data risks, and whether any timing claim exceeds browser-measured evidence. Return prioritized review notes and only essential screen changes.",
  },
  {
    label: "Review this screen",
    prompt: "Review the active screen for clarity, neutrality, response burden, and alignment with the research questions. Suggest only material improvements.",
  },
  {
    label: "Check RQ alignment",
    prompt: "Check whether the current study flow can answer each supplied research question. Identify missing measures, construct mismatches, and avoidable confounds.",
  },
  {
    label: "Suggest study flow",
    prompt: "Suggest a concise participant screen flow for this study. Preserve the current useful screens and propose additions only when needed.",
  },
  {
    label: "Analyze image needs",
    prompt: "Analyze the research questions, constructs, conditions, and screen flow to decide whether this study needs image stimuli. If yes, create a detailed image-plan suggestion with the exact image count and set structure; screen placement; purpose and condition of every image; matched counterparts; variables held constant; theory-driven manipulated elements; dimensions, format, and style; neutral alt text; per-image review checks; presentation and counterbalancing guidance; and complete copy-ready positive and negative prompts for an external image generator such as ChatGPT or Gemini. If images would add confounds without value, recommend no images and explain why.",
  },
] as const;

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now().toString(36)}`;
}

function currency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function patchPreview(patch: ExperimentAssistantBlockPatch): string {
  const parts: string[] = [];
  if (patch.heading !== undefined) parts.push(`Heading: ${patch.heading || "(remove heading)"}`);
  if (patch.prompt !== undefined) parts.push(`Prompt: ${patch.prompt || "(remove prompt)"}`);
  if (patch.choices?.length) parts.push(`Options: ${patch.choices.join(" · ")}`);
  if (patch.responseType) parts.push(`Response: ${patch.responseType}`);
  if (patch.variableName) parts.push(`Variable: ${patch.variableName}`);
  if (patch.scaleMin !== undefined || patch.scaleMax !== undefined) {
    parts.push(`Scale: ${patch.scaleMin ?? "current"}–${patch.scaleMax ?? "current"}`);
  }
  if (patch.required !== undefined) parts.push(patch.required ? "Response required" : "Response optional");
  return parts.join("\n") || "A structured block change";
}

export default function ExperimentAiAssistant({
  projectId,
  studio,
  activeBlockId,
  studyDesign,
  onApplyPatch,
  onAddBlock,
  onClose,
}: ExperimentAiAssistantProps) {
  const [status, setStatus] = useState<KeyStatus | null>(null);
  const [entries, setEntries] = useState<ChatEntry[]>([
    {
      id: "assistant-intro",
      role: "assistant",
      content: "I can review the study against its research questions, propose screen changes, or create copy-ready image-stimulus prompts. Nothing changes until you apply it.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [suggestionState, setSuggestionState] = useState<Record<string, "applied" | "kept">>({});
  const [copiedId, setCopiedId] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const context = useMemo(
    () => createExperimentAssistantContext(studio, activeBlockId, studyDesign),
    [activeBlockId, studio, studyDesign],
  );
  const activeBlock = studio.blocks.find((block) => block.id === activeBlockId) ?? studio.blocks[0];
  const canUseAssistant = Boolean(
    status?.connected
    && !status.statusUnavailable
    && (status.freeModelChain || status.limitConfigured),
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/ai/experimental-studio", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json().catch(() => null) as KeyStatus | null;
        if (!body) throw new Error("OpenRouter status could not be read.");
        setStatus(body);
      })
      .catch((requestError) => {
        if (requestError instanceof Error && requestError.name === "AbortError") return;
        setStatus({ connected: false, usesCeriseFallback: false, message: "OpenRouter status could not be checked." });
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [busy, entries]);

  async function sendPrompt(prompt: string) {
    const normalized = prompt.trim().slice(0, 2_000);
    if (!normalized || busy) return;
    setBusy(true);
    setError("");
    const userEntry: ChatEntry = { id: makeId("user"), role: "user", content: normalized };
    const history = entries
      .filter((entry) => entry.id !== "assistant-intro")
      .slice(-6)
      .map(({ role, content }) => ({ role, content }));
    setEntries((current) => [...current, userEntry]);
    setInput("");
    try {
      const response = await fetch("/api/ai/experimental-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, prompt: normalized, history, context }),
      });
      const body = await response.json().catch(() => null) as {
        error?: string;
        reply?: string;
        suggestions?: ExperimentAssistantSuggestion[];
      } | null;
      if (!response.ok || !body?.reply) throw new Error(body?.error || "The assistant could not complete this request.");
      setEntries((current) => [...current, {
        id: makeId("assistant"),
        role: "assistant",
        content: body.reply ?? "Review the suggestions below.",
        suggestions: Array.isArray(body.suggestions) ? body.suggestions : [],
      }]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The assistant could not complete this request.");
    } finally {
      setBusy(false);
    }
  }

  function applySuggestion(suggestion: ExperimentAssistantSuggestion) {
    if (suggestion.kind === "block-update") onApplyPatch(suggestion.targetBlockId, suggestion.patch);
    if (suggestion.kind === "block-add") onAddBlock(suggestion.blockType, suggestion.patch);
    setSuggestionState((current) => ({ ...current, [suggestion.id]: "applied" }));
  }

  async function copyPrompt(id: string, prompt: string) {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((current) => current === id ? "" : current), 1_800);
    } catch {
      setError("Copy was blocked by the browser. Select the prompt text and copy it manually.");
    }
  }

  function renderSuggestion(suggestion: ExperimentAssistantSuggestion) {
    const state = suggestionState[suggestion.id];
    if (suggestion.kind === "image-plan") {
      return (
        <article className={styles.imagePlan} key={suggestion.id}>
          <header>
            <div><strong>{suggestion.title}</strong><span>{suggestion.totalImages} planned image{suggestion.totalImages === 1 ? "" : "s"}</span></div>
            <p>{suggestion.rationale}</p>
          </header>
          {suggestion.recommendation ? (
            <div className={styles.planSummary}><strong>Recommendation</strong><p>{suggestion.recommendation}</p></div>
          ) : null}
          {suggestion.imageSetStructure ? (
            <div className={styles.planSummary}><strong>Set structure</strong><p>{suggestion.imageSetStructure}</p></div>
          ) : null}
          {suggestion.sharedRequirements ? (
            <div className={styles.sharedRequirements}><strong>Keep consistent across the set</strong><p>{suggestion.sharedRequirements}</p></div>
          ) : null}
          {suggestion.presentationPlan ? (
            <div className={styles.planSummary}><strong>Presentation plan</strong><p>{suggestion.presentationPlan}</p></div>
          ) : null}
          <ol>
            {suggestion.images.map((image, index) => (
              <li key={image.id}>
                <div className={styles.imagePlanHeading}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div><strong>{image.label}</strong>{image.condition ? <small>{image.condition}</small> : null}</div>
                </div>
                {image.purpose ? <p><b>Purpose:</b> {image.purpose}</p> : null}
                {image.screenPlacement ? <p><b>Screen placement:</b> {image.screenPlacement}</p> : null}
                {image.matchedWith ? <p><b>Matched with:</b> {image.matchedWith}</p> : null}
                {image.technicalSpec ? <p><b>Technical specification:</b> {image.technicalSpec}</p> : null}
                {image.heldConstant ? <p><b>Hold constant:</b> {image.heldConstant}</p> : null}
                {image.manipulatedElements ? <p><b>Manipulate only:</b> {image.manipulatedElements}</p> : null}
                <label>
                  <span>Copy-ready generation prompt</span>
                  <textarea readOnly rows={6} value={image.prompt} />
                </label>
                {image.negativePrompt ? (
                  <label>
                    <span>Copy-ready negative prompt</span>
                    <textarea readOnly rows={4} value={image.negativePrompt} />
                  </label>
                ) : null}
                {image.altText ? <p><b>Suggested alt text:</b> {image.altText}</p> : null}
                {image.reviewChecks ? <p><b>Review before use:</b> {image.reviewChecks}</p> : null}
                <div className={styles.promptActions}>
                  <button onClick={() => void copyPrompt(image.id, image.prompt)} type="button">
                    {copiedId === image.id ? "Copied" : "Copy generation prompt"}
                  </button>
                  {image.negativePrompt ? (
                    <button onClick={() => void copyPrompt(`${image.id}-negative`, image.negativePrompt)} type="button">
                      {copiedId === `${image.id}-negative` ? "Copied" : "Copy negative prompt"}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
          {suggestion.qualityChecks.length ? (
            <section className={styles.qualityChecks}>
              <strong>Set-level approval checklist</strong>
              <ul>{suggestion.qualityChecks.map((check) => <li key={check}>{check}</li>)}</ul>
            </section>
          ) : null}
          <p className={styles.imagePlanNote}>Cerise does not create these images. Copy each prompt into your preferred external tool, compare the resulting set for unwanted differences, and upload only the researcher-approved files to the matching study screens.</p>
        </article>
      );
    }

    return (
      <article className={styles.suggestionCard} key={suggestion.id}>
        <header><strong>{suggestion.title}</strong><span>{suggestion.kind.replace("-", " ")}</span></header>
        <p>{suggestion.rationale}</p>
        {suggestion.kind === "block-update" ? (
          <div className={styles.beforeAfter}>
            <div><span>Current</span><p>{studio.blocks.find((block) => block.id === suggestion.targetBlockId)?.prompt || "Current block"}</p></div>
            <div><span>Suggested</span><p>{patchPreview(suggestion.patch)}</p></div>
          </div>
        ) : suggestion.kind === "block-add" ? (
          <pre>{patchPreview(suggestion.patch)}</pre>
        ) : <p className={styles.studyNote}>{suggestion.note}</p>}
        <div className={styles.suggestionActions}>
          {state ? <strong>{state === "applied" ? "Applied" : "Kept current"}</strong> : (
            <>
              <button className={styles.applyButton} onClick={() => applySuggestion(suggestion)} type="button">
                {suggestion.kind === "study-note" ? "Mark reviewed" : "Apply change"}
              </button>
              <button onClick={() => setSuggestionState((current) => ({ ...current, [suggestion.id]: "kept" }))} type="button">Keep current</button>
            </>
          )}
        </div>
      </article>
    );
  }

  return (
    <aside aria-label="AI study assistant" className={styles.drawer}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}><AppIcon name="lightbulb" />Researcher-controlled AI</span>
          <h2>AI study assistant</h2>
        </div>
        <button aria-label="Close AI study assistant" onClick={onClose} type="button">×</button>
      </header>

      <section className={styles.keyCard}>
        <div><AppIcon name="lock" /><strong>Uses your OpenRouter key</strong></div>
        <span>No Cerise fallback</span>
        {!status ? <p>Checking key status…</p> : status.statusUnavailable ? (
          <p>{status.message || "OpenRouter key status is temporarily unavailable."}</p>
        ) : status.connected ? (
          <p>
            {status.limitRemainingUsd !== null && status.limitRemainingUsd !== undefined
              ? `${currency(status.limitRemainingUsd)} remains under this key’s limit${status.limitReset ? ` · resets ${status.limitReset}` : ""}.`
              : status.freeModelChain
                ? "Free-model chain selected. Add a key limit before choosing a paid model."
                : "Add a USD limit to this key before paid-model requests."}
          </p>
        ) : (
          <p>{status.message || "Connect an OpenRouter key to use this assistant."} <Link href="/settings/ai">Open API key settings</Link></p>
        )}
      </section>

      <section className={styles.quickActions}>
        <h3>Quick actions</h3>
        <div>
          {QUICK_ACTIONS.map((action) => (
            <button disabled={busy || !canUseAssistant} key={action.label} onClick={() => void sendPrompt(action.prompt)} type="button">
              {action.label}
            </button>
          ))}
        </div>
      </section>

      <div className={styles.conversation} ref={scrollRef}>
        {entries.map((entry) => (
          <section className={entry.role === "user" ? styles.userMessage : styles.assistantMessage} key={entry.id}>
            <span>{entry.role === "user" ? "You" : "Assistant"}</span>
            <p>{entry.content}</p>
            {entry.suggestions?.length ? <div className={styles.suggestions}>{entry.suggestions.map(renderSuggestion)}</div> : null}
          </section>
        ))}
        {busy ? <p aria-live="polite" className={styles.thinking}>Reviewing the study context…</p> : null}
        {error ? <p aria-live="assertive" className={styles.error}>{error}</p> : null}
      </div>

      <form className={styles.composer} onSubmit={(event) => { event.preventDefault(); void sendPrompt(input); }}>
        <label htmlFor="experiment-ai-message">Ask about {activeBlock?.title || "this study"}</label>
        <textarea
          disabled={busy || !canUseAssistant}
          id="experiment-ai-message"
          maxLength={2_000}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask for a review, study-flow suggestion, or external image prompts…"
          rows={3}
          value={input}
        />
        <div><span>{input.length}/2000 · Chat is not saved</span><button disabled={busy || !input.trim() || !canUseAssistant} type="submit"><AppIcon name="send" />Send</button></div>
      </form>
    </aside>
  );
}
