"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppIcon, type AppIconName } from "@/components/app-shell/AppIcons";
import {
  appendLocalResearchMentorDecision,
  applyResearchMentorCanvasSuggestion,
  createResearchMentorContext,
  researchMentorSuggestionChecksum,
  type ResearchMentorApiResponse,
  type ResearchMentorCanvasSuggestion,
  type ResearchMentorContext,
  type ResearchMentorMode,
  type ResearchMentorSuggestion,
  type ResearchMentorTurn,
} from "@/lib/research/researchMentor";
import {
  appendLocalMentorInsight,
  createMentorContextEnvelope,
  loadLocalMentorInsights,
  loadMentorProjectMemory,
  MENTOR_CONTEXT_REFRESH_EVENT,
  mentorContextIsCurrent,
  removeMentorProjectMemoryItem,
  saveMentorProjectMemory,
  upsertMentorProjectMemoryItem,
  type MentorContextEnvelope,
  type MentorMemoryKind,
  type MentorProjectMemory,
  type MentorProjectMemoryItem,
} from "@/lib/research/mentorContextEnvelope";
import { createResearchDecisionRecord } from "@/lib/research/researchDecisionLedger";
import { createResearchKnowledgeEntry, type ResearchKnowledgeKind } from "@/lib/research/livingResearchRecord";
import {
  appendResearchDecisionEvent,
  appendResearchKnowledgeEntry,
  loadResearchFoundationSnapshot,
  type ResearchFoundationSnapshot,
} from "@/lib/research/researchFoundationPersistence";
import type { ResearchPathwayDocument } from "@/lib/research/researchPathwayDocument";
import type { ResearchStageId } from "@/lib/research/researchPathConfig";
import { readStepDraft, type ResearchPathDraft } from "@/lib/research/researchPathDraft";
import type { ResearchStageNumber } from "@/lib/research/researchArtifactRegistry";
import { reviewResearchMentorTechniqueApplication } from "@/lib/research/researchMentorTechniques";
import {
  isResearchMentorContextBudget,
  normalizeResearchMentorFailure,
  researchMentorOfflineGuide,
  RESEARCH_MENTOR_CLIENT_TIMEOUT_MS,
  type ResearchMentorFailure,
} from "@/lib/research/researchMentorHardening";
import {
  RESEARCH_SUPPORT_CORRECTION_COOLDOWN_MS,
  cooldownResearchSupportCategory,
  createResearchSupportActivity,
  deriveResearchSupportOpportunity,
  isReturningToUnfinishedResearch,
  loadResearchSupportPreferences,
  recordResearchSupportBreakpoint,
  recordResearchSupportSession,
  restoreResearchSupportCategory,
  saveResearchSupportPreferences,
  suppressResearchSupportCategory,
  updateResearchSupportMode,
  type ResearchSupportBreakpoint,
  type ResearchSupportCategory,
  type ResearchSupportMode,
  type ResearchSupportOpportunity,
  type ResearchSupportPreferences,
} from "@/lib/research/researchSupportOpportunity";
import { createClient } from "@/lib/supabase/client";
import ResearchMentorTechniquesPanel from "./ResearchMentorTechniquesPanel";
import styles from "./ResearchMentorPanel.module.css";

interface ResearchMentorPanelProps {
  activeStageId: ResearchStageId;
  activeStageNumber: ResearchStageNumber;
  activeStageTitle: string;
  activeStepId: string;
  activeStepTitle: string;
  cloudUserId: string | null;
  document: ResearchPathwayDocument | null;
  draft: ResearchPathDraft;
  editCount: number;
  lastEditedAt: number;
  launchRequest?: { id: string; mode: ResearchMentorMode } | null;
  mutateFields?: (updater: (fields: Record<string, string>) => Record<string, string>) => void;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (message: string) => void;
  projectId: string;
  supportBreakpoint: ResearchSupportBreakpoint;
}

type MentorTab = "mentor" | "context" | "techniques";

interface InsightDraft {
  suggestionId: string;
  title: string;
  body: string;
  initialBody: string;
  kind: ResearchKnowledgeKind;
}

interface CanvasReviewDraft {
  suggestion: ResearchMentorCanvasSuggestion;
  reviewedText: string;
  rationale: string;
}

interface MemoryDraft {
  id?: string;
  kind: MentorMemoryKind;
  text: string;
}

const MODES: ReadonlyArray<{ id: ResearchMentorMode; label: string; detail: string; icon: AppIconName }> = [
  { id: "reflect", label: "Reflect with me", detail: "Separate what is recorded, interpreted, and still open.", icon: "lightbulb" },
  { id: "find-bridge", label: "Find a bridge", detail: "Explore adjacent concepts and careful search language.", icon: "search" },
  { id: "narrow", label: "Narrow this", detail: "Compare bounded versions without choosing for you.", icon: "target" },
  { id: "map-evidence", label: "Map evidence", detail: "Sort approved evidence, missing support, and assumptions.", icon: "list" },
  { id: "compare-options", label: "Compare options", detail: "See tradeoffs across current alternatives.", icon: "workflow" },
  { id: "next-step", label: "Choose a next step", detail: "Find one small researcher-owned move.", icon: "arrow-right" },
];

const DEFAULT_PROMPTS: Readonly<Record<ResearchMentorMode, string>> = {
  reflect: "Help me reflect on what is clear, what is still open, and which assumption deserves attention.",
  "find-bridge": "Suggest careful conceptual and search-language bridges from the current project context without claiming that literature has been reviewed.",
  narrow: "Show me distinct ways to narrow the current research choice and explain the tradeoffs.",
  "map-evidence": "Help me separate approved evidence, missing support, and assumptions in the current project context.",
  "compare-options": "Compare the active alternatives without deciding which one I should select.",
  "next-step": "Suggest one small next action that preserves my ownership of the research direction.",
};

const INSIGHT_KINDS: readonly ResearchKnowledgeKind[] = ["writing-note", "decision", "rationale", "evidence", "assumption", "limitation", "method-detail", "interpretation"];

function isApiResponse(value: unknown): value is ResearchMentorApiResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Partial<ResearchMentorApiResponse>;
  return typeof candidate.summary === "string"
    && Array.isArray(candidate.suggestions)
    && typeof candidate.reflectiveQuestion === "string"
    && typeof candidate.servedModel === "string"
    && typeof candidate.contextChecksum === "string"
    && typeof candidate.contextContentChecksum === "string"
    && (candidate.pathwayContentChecksum === null || typeof candidate.pathwayContentChecksum === "string")
    && isResearchMentorContextBudget(candidate.hardening)
    && candidate.claim === "ai-advisory-research-mentoring-not-authorship-validation-approval-or-mental-health-assessment";
}

function fieldLabel(suggestion: ResearchMentorCanvasSuggestion): string {
  return {
    text: suggestion.targetCollection === "questions" ? "new candidate question" : "new idea",
    title: "new problem-frame title",
    situation: "new problem-frame situation",
    uncertainty: "new researchable uncertainty",
    known: "new baseline known-evidence entry",
    missing: "new baseline evidence-gap entry",
    "search-terms": "new baseline search-language entry",
  }[suggestion.targetField];
}

function contextItemSummary(item: ResearchMentorContext["activeItems"][number]) {
  const values = Object.values(item.fields).flatMap((value) => Array.isArray(value) ? value : [value]).filter(Boolean);
  return { id: item.id, kind: item.kind, status: item.status, summary: values.join(" · ").slice(0, 1_200) || "No bounded summary yet." };
}

function shortChecksum(value: string | undefined): string {
  if (!value) return "CTX pending";
  return `CTX ${value.slice(7, 11).toUpperCase()}…${value.slice(-4).toUpperCase()}`;
}

function stageDomain(stage: ResearchStageNumber) {
  if (stage === 6) return "analysis" as const;
  if (stage >= 7) return "manuscript" as const;
  return "pathway" as const;
}

function stageTargets(stage: ResearchStageNumber) {
  if (stage <= 2) return ["introduction"] as const;
  if (stage <= 5) return ["methods"] as const;
  if (stage === 6) return ["results"] as const;
  return ["discussion"] as const;
}

export default function ResearchMentorPanel({
  activeStageId,
  activeStageNumber,
  activeStageTitle,
  activeStepId,
  activeStepTitle,
  cloudUserId,
  document,
  draft,
  editCount,
  lastEditedAt,
  launchRequest,
  mutateFields,
  onOpenChange,
  onStatusChange,
  projectId,
  supportBreakpoint,
}: ResearchMentorPanelProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<MentorTab>("mentor");
  const [clock, setClock] = useState(() => Date.now());
  const [mode, setMode] = useState<ResearchMentorMode>("reflect");
  const [prompt, setPrompt] = useState(DEFAULT_PROMPTS.reflect);
  const [pathwayContext, setPathwayContext] = useState<ResearchMentorContext | null>(null);
  const [projectContext, setProjectContext] = useState<MentorContextEnvelope | null>(null);
  const [memory, setMemory] = useState<MentorProjectMemory | null>(null);
  const [foundation, setFoundation] = useState<ResearchFoundationSnapshot | null>(null);
  const [foundationMessage, setFoundationMessage] = useState("Using current device context.");
  const [localInsights, setLocalInsights] = useState<unknown[]>([]);
  const [selectedText, setSelectedText] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [ignoredObservationIds, setIgnoredObservationIds] = useState<string[]>([]);
  const [availability, setAvailability] = useState<"checking" | "available" | "unavailable">("checking");
  const [availabilityMessage, setAvailabilityMessage] = useState("Checking the project’s AI lane…");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [failure, setFailure] = useState<ResearchMentorFailure | null>(null);
  const [response, setResponse] = useState<ResearchMentorApiResponse | null>(null);
  const [turns, setTurns] = useState<ResearchMentorTurn[]>([]);
  const [reviewing, setReviewing] = useState<CanvasReviewDraft | null>(null);
  const [insightDraft, setInsightDraft] = useState<InsightDraft | null>(null);
  const [memoryDraft, setMemoryDraft] = useState<MemoryDraft | null>(null);
  const [decisions, setDecisions] = useState<Record<string, "applied" | "applied-after-edit" | "kept-current" | "dismissed" | "saved">>({});
  const [supportPreferences, setSupportPreferences] = useState<ResearchSupportPreferences | null>(null);
  const [supportOpportunity, setSupportOpportunity] = useState<ResearchSupportOpportunity | null>(null);
  const [showSupportBasis, setShowSupportBasis] = useState(false);
  const supportActivityRef = useRef<ReturnType<typeof createResearchSupportActivity> | null>(null);
  const processedSupportBreakpointRef = useRef(0);
  const processedLaunchRequestRef = useRef("");
  const launcherRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const cancelledByResearcherRef = useRef(false);
  const failedContextChecksumRef = useRef("");

  const selectedMode = MODES.find((item) => item.id === mode) ?? MODES[0];
  const visibleObservations = supportPreferences?.mode === "focus" ? [] : pathwayContext?.observations ?? [];
  const proactiveSupportAvailable = Boolean(supportOpportunity && supportPreferences?.mode === "gentle");
  const canRequest = availability === "available" && projectContext?.projectId === projectId && prompt.trim().length > 0 && !loading;
  const responseIsCurrent = Boolean(response && projectContext && mentorContextIsCurrent(response.contextContentChecksum, projectContext));
  const offlineGuide = researchMentorOfflineGuide(mode);
  const routeChips = useMemo(() => {
    if (!projectContext) return [];
    return [projectContext.route.intent, projectContext.route.methodFamily, projectContext.route.setting, projectContext.route.assignment]
      .filter((value): value is string => Boolean(value) && value !== "undetermined");
  }, [projectContext]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const refresh = () => setRefreshVersion((current) => current + 1);
    window.addEventListener(MENTOR_CONTEXT_REFRESH_EVENT, refresh);
    return () => window.removeEventListener(MENTOR_CONTEXT_REFRESH_EVENT, refresh);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadMentorProjectMemory(window.localStorage, projectId).then((next) => {
      if (!cancelled) setMemory(next);
    });
    setLocalInsights(loadLocalMentorInsights(window.localStorage, projectId));
    setSupportPreferences(loadResearchSupportPreferences(window.localStorage, projectId));
    supportActivityRef.current = createResearchSupportActivity(projectId);
    processedSupportBreakpointRef.current = 0;
    return () => { cancelled = true; };
  }, [projectId]);

  useEffect(() => {
    if (activeStageNumber !== 1 || !document || !supportPreferences || supportBreakpoint.stepId !== activeStepId) {
      if (activeStageNumber !== 1) setSupportOpportunity(null);
      return;
    }
    if (processedSupportBreakpointRef.current >= supportBreakpoint.sequence) return;
    processedSupportBreakpointRef.current = supportBreakpoint.sequence;
    const returningToUnfinished = supportBreakpoint.kind === "project-return"
      && isReturningToUnfinishedResearch(supportPreferences, document, activeStepId, supportBreakpoint.at);
    const currentActivity = supportActivityRef.current?.projectId === projectId
      ? supportActivityRef.current
      : createResearchSupportActivity(projectId);
    const nextActivity = recordResearchSupportBreakpoint(currentActivity, supportBreakpoint, document, returningToUnfinished);
    supportActivityRef.current = nextActivity;
    setSupportOpportunity(deriveResearchSupportOpportunity({
      document,
      stepId: activeStepId,
      activity: nextActivity,
      preferences: supportPreferences,
      breakpoint: supportBreakpoint,
      idleSeconds: Math.max(0, Math.floor((Date.now() - lastEditedAt) / 1_000)),
      editCount,
    }));
    const nextPreferences = recordResearchSupportSession(supportPreferences, document, activeStepId, supportBreakpoint.at);
    saveResearchSupportPreferences(window.localStorage, nextPreferences);
    setSupportPreferences(nextPreferences);
  }, [activeStageNumber, activeStepId, document, editCount, lastEditedAt, projectId, supportBreakpoint, supportPreferences]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    if (!cloudUserId) {
      setFoundation(null);
      setFoundationMessage("Secure foundation unavailable · using current device context.");
      return;
    }
    setFoundationMessage("Refreshing secure project context…");
    void loadResearchFoundationSnapshot(createClient(), projectId).then((snapshot) => {
      if (!cancelled) {
        setFoundation(snapshot);
        setFoundationMessage("Secure and device context refreshed.");
      }
    }).catch(() => {
      if (!cancelled) {
        setFoundation(null);
        setFoundationMessage("Foundation tables unavailable · using current device context.");
      }
    });
    return () => { cancelled = true; };
  }, [cloudUserId, open, projectId, refreshVersion, activeStageId, activeStepId]);

  useEffect(() => {
    let cancelled = false;
    if (activeStageNumber !== 1 || !document) {
      setPathwayContext(null);
      return;
    }
    const timer = window.setTimeout(() => {
      void createResearchMentorContext({
        projectId,
        activeStepId,
        draft,
        document,
        ignoredObservationIds,
        idleSeconds: Math.max(0, Math.floor((clock - lastEditedAt) / 1_000)),
        editCount,
      }).then((next) => { if (!cancelled) setPathwayContext(next); }).catch(() => { if (!cancelled) setPathwayContext(null); });
    }, 180);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [activeStageNumber, activeStepId, clock, document, draft, editCount, ignoredObservationIds, lastEditedAt, projectId]);

  useEffect(() => {
    if (!memory) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void createMentorContextEnvelope({
        projectId,
        location: { stage: activeStageNumber, stageId: activeStageId, stageTitle: activeStageTitle, stepId: activeStepId, stepTitle: activeStepTitle },
        foundation,
        memory,
        selectedText,
        pathwayRoute: document?.decision.route,
        activeContextItems: pathwayContext?.activeItems.map(contextItemSummary) ?? [],
        workStateNotes: pathwayContext?.observations.map((item) => ({ id: item.id, kind: item.category, status: "current", summary: `${item.title}: ${item.detail}` })) ?? [],
        localKnowledgeEntries: localInsights,
      }).then((next) => { if (!cancelled) setProjectContext(next); }).catch(() => { if (!cancelled) setProjectContext(null); });
    }, 80);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [activeStageId, activeStageNumber, activeStageTitle, activeStepId, activeStepTitle, document, foundation, localInsights, memory, pathwayContext, projectId, selectedText]);

  useEffect(() => {
    setResponse(null);
    setTurns([]);
    setReviewing(null);
    setInsightDraft(null);
    setDecisions({});
    setIgnoredObservationIds([]);
    setSelectedText("");
    const resetMode = launchRequest?.mode ?? "reflect";
    setMode(resetMode);
    setPrompt(DEFAULT_PROMPTS[resetMode]);
    setShowSupportBasis(false);
  }, [activeStepId, launchRequest]);

  useEffect(() => {
    if (activeStageNumber !== 1 && tab === "techniques") setTab("mentor");
  }, [activeStageNumber, tab]);

  useEffect(() => {
    if (!launchRequest || processedLaunchRequestRef.current === launchRequest.id) return;
    processedLaunchRequestRef.current = launchRequest.id;
    setTab("mentor");
    setMode(launchRequest.mode);
    setPrompt(DEFAULT_PROMPTS[launchRequest.mode]);
    setOpen(true);
    onOpenChange(true);
    setError("");
    onStatusChange("Historical Research Journey link continued in the review-before-apply Mentor");
  }, [launchRequest, onOpenChange, onStatusChange]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setAvailability("checking");
    void fetch("/api/ai/research-mentor", { cache: "no-store" })
      .then(async (result) => {
        const body = await result.json().catch(() => ({}));
        if (cancelled) return;
        if (result.ok && body.available === true) {
          setAvailability("available");
          setAvailabilityMessage(typeof body.message === "string" ? body.message : "The research mentor is available.");
        } else {
          setAvailability("unavailable");
          setAvailabilityMessage(typeof body.message === "string" ? body.message : "The research mentor AI is unavailable.");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAvailability("unavailable");
          setAvailabilityMessage("The research mentor AI is temporarily unavailable. Project context remains inspectable.");
        }
      });
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      toggleOpen(false);
    };
    window.document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.document.removeEventListener("keydown", closeOnEscape);
    };
  // toggleOpen intentionally reads only refs and stable parent callbacks.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => () => requestControllerRef.current?.abort(), []);

  function toggleOpen(next: boolean) {
    if (!next && requestControllerRef.current) {
      cancelledByResearcherRef.current = true;
      requestControllerRef.current.abort();
      requestControllerRef.current = null;
    }
    setOpen(next);
    onOpenChange(next);
    setError("");
    setFailure(null);
    if (!next) {
      setReviewing(null);
      setInsightDraft(null);
      setMemoryDraft(null);
      window.requestAnimationFrame(() => launcherRef.current?.focus());
    }
  }

  function chooseMode(nextMode: ResearchMentorMode) {
    setMode(nextMode);
    setPrompt(DEFAULT_PROMPTS[nextMode]);
    setResponse(null);
    setReviewing(null);
    setInsightDraft(null);
    setError("");
    setFailure(null);
  }

  function persistSupportPreferences(next: ResearchSupportPreferences) {
    saveResearchSupportPreferences(window.localStorage, next);
    setSupportPreferences(next);
  }

  function chooseSupportMode(nextMode: ResearchSupportMode) {
    if (!supportPreferences) return;
    const next = updateResearchSupportMode(supportPreferences, nextMode);
    persistSupportPreferences(next);
    if (nextMode !== "gentle") setSupportOpportunity(null);
    onStatusChange(nextMode === "focus" ? "Focus mode enabled · no proactive Mentor indications" : nextMode === "on-request" ? "Research mentor set to on request only" : "Gentle optional support enabled");
  }

  function clearSupportOpportunity(duration = 24 * 60 * 60 * 1_000) {
    if (!supportPreferences || !supportOpportunity) return;
    persistSupportPreferences(cooldownResearchSupportCategory(supportPreferences, supportOpportunity.category, Date.now(), duration));
    setSupportOpportunity(null);
    setShowSupportBasis(false);
  }

  function talkAboutSupportOpportunity() {
    if (!supportOpportunity) return;
    setTab("mentor");
    setMode("next-step");
    setPrompt(supportOpportunity.suggestedPrompt);
    clearSupportOpportunity();
    onStatusChange("Optional support opened by the researcher · no project change applied");
  }

  function correctSupportOpportunity() {
    clearSupportOpportunity(RESEARCH_SUPPORT_CORRECTION_COOLDOWN_MS);
    onStatusChange("Support inference corrected · this category is paused for seven days");
  }

  function suppressSupportOpportunity() {
    if (!supportPreferences || !supportOpportunity) return;
    persistSupportPreferences(suppressResearchSupportCategory(supportPreferences, supportOpportunity.category));
    setSupportOpportunity(null);
    setShowSupportBasis(false);
    onStatusChange("This support category will not be suggested again unless restored");
  }

  function askForDifferentSupport() {
    setTab("mentor");
    setMode("reflect");
    setPrompt("I need a different kind of support. Start by asking what would be useful without inferring a problem for me.");
    clearSupportOpportunity();
    onStatusChange("Researcher chose a different support direction");
  }

  function restoreSupportCategory(category: ResearchSupportCategory) {
    if (!supportPreferences) return;
    persistSupportPreferences(restoreResearchSupportCategory(supportPreferences, category));
    onStatusChange("Support category restored");
  }

  function captureSelection() {
    const selection = window.getSelection()?.toString().trim() ?? "";
    if (!selection) {
      onStatusChange("Select research text in the workspace, then choose Use selected text");
      return;
    }
    setSelectedText(selection.slice(0, 1_500));
    onStatusChange("Selected text added to the next bounded mentor context");
  }

  async function runMentor() {
    if (!canRequest || !projectContext || projectContext.projectId !== projectId) return;
    const requestContextChecksum = projectContext.contentChecksum;
    const controller = new AbortController();
    requestControllerRef.current?.abort();
    requestControllerRef.current = controller;
    cancelledByResearcherRef.current = false;
    setLoading(true);
    setError("");
    setFailure(null);
    setResponse(null);
    setReviewing(null);
    setInsightDraft(null);
    try {
      const clientTimeout = window.setTimeout(() => controller.abort(), RESEARCH_MENTOR_CLIENT_TIMEOUT_MS);
      const result = await fetch("/api/ai/research-mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: controller.signal,
        body: JSON.stringify({ projectId, mode, prompt, context: pathwayContext, projectContext, turns }),
      }).finally(() => window.clearTimeout(clientTimeout));
      const body: unknown = await result.json().catch(() => ({}));
      if (!result.ok) {
        const nextFailure = normalizeResearchMentorFailure(body, result.status);
        failedContextChecksumRef.current = requestContextChecksum;
        setFailure(nextFailure);
        setError(nextFailure.error);
        return;
      }
      if (!isApiResponse(body)) throw new Error("The research mentor returned an invalid advisory package.");
      setResponse(body);
      const responseTurn = [body.summary, ...body.suggestions.map((item) => `${item.title}: ${item.rationale}`), body.reflectiveQuestion].join("\n");
      const additions: ResearchMentorTurn[] = [{ role: "user", content: prompt }, { role: "assistant", content: responseTurn }];
      setTurns((current) => [...current, ...additions].slice(-6));
      onStatusChange("Research mentor response received · no project changes applied");
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === "AbortError") {
        const nextFailure = normalizeResearchMentorFailure({
          error: cancelledByResearcherRef.current
            ? "The request was cancelled. No project change was made."
            : "The mentor request reached its time limit. No project change was made; you may retry once.",
          code: cancelledByResearcherRef.current ? "cancelled" : "provider-timeout",
          retryable: !cancelledByResearcherRef.current,
        }, cancelledByResearcherRef.current ? 499 : 504);
        failedContextChecksumRef.current = requestContextChecksum;
        setFailure(nextFailure);
        setError(nextFailure.error);
      } else {
        const nextFailure = normalizeResearchMentorFailure({
          error: requestError instanceof Error ? requestError.message : "The research mentor could not complete this request.",
          code: "unknown",
          retryable: false,
        });
        setFailure(nextFailure);
        setError(nextFailure.error);
      }
    } finally {
      if (requestControllerRef.current === controller) requestControllerRef.current = null;
      setLoading(false);
    }
  }

  function cancelMentorRequest() {
    if (!requestControllerRef.current) return;
    cancelledByResearcherRef.current = true;
    requestControllerRef.current.abort();
  }

  function retryMentorRequest() {
    if (!failure?.retryable || !projectContext) return;
    if (failedContextChecksumRef.current !== projectContext.contentChecksum) {
      setFailure(null);
      setError("Project context changed after the failed request. Review the current context, then make a new request.");
      return;
    }
    void runMentor();
  }

  async function recordDecision(
    suggestion: ResearchMentorSuggestion,
    action: "applied" | "applied-after-edit" | "kept-current" | "dismissed",
    responseOverride: ResearchMentorApiResponse | null = response,
    reasonOverride?: string,
  ) {
    const decisionResponse = responseOverride;
    if (!decisionResponse || !decisionResponse.pathwaySource) {
      setDecisions((current) => ({ ...current, [suggestion.id]: action }));
      return;
    }
    const record = await createResearchDecisionRecord({
      id: `mentor-${crypto.randomUUID()}`,
      projectId,
      domain: stageDomain(activeStageNumber),
      suggestionId: suggestion.id,
      suggestionKind: suggestion.kind,
      suggestionSummary: `${suggestion.title}: ${suggestion.rationale}`,
      action,
      decisionReason: reasonOverride ?? (action === "applied" ? "The researcher reviewed and accepted this option as a new exploring alternative without overwriting existing work." : action === "applied-after-edit" ? "The researcher corrected the proposed wording before adding it as a new exploring alternative." : action === "kept-current" ? "The researcher reviewed the option and kept it outside the canonical pathway." : "The researcher dismissed this advisory suggestion."),
      decidedAt: new Date().toISOString(),
      baseArtifact: decisionResponse.pathwaySource,
      suggestionChecksum: await researchMentorSuggestionChecksum(suggestion),
      resultingArtifact: null,
      servedModel: decisionResponse.servedModel,
    });
    try { appendLocalResearchMentorDecision(window.localStorage, projectId, record); } catch { onStatusChange("Decision made, but the device decision ledger was unavailable"); }
    if (cloudUserId) void appendResearchDecisionEvent(createClient(), cloudUserId, record).catch(() => undefined);
    setDecisions((current) => ({ ...current, [suggestion.id]: action }));
  }

  async function applyReviewedSuggestion(review: CanvasReviewDraft) {
    const reviewed = reviewResearchMentorTechniqueApplication(review.suggestion, review.reviewedText, review.rationale);
    if (!reviewed.allowed) {
      setError(reviewed.reason);
      return;
    }
    if (!response || !document || !mutateFields || !projectContext || !responseIsCurrent) {
      setError("This option is stale or the current stage does not allow canvas changes. Refresh the mentor before applying it.");
      setReviewing(null);
      return;
    }
    const latest = await createResearchMentorContext({ projectId, activeStepId, draft, document, ignoredObservationIds, idleSeconds: Math.max(0, Math.floor((Date.now() - lastEditedAt) / 1_000)), editCount });
    if (!response.pathwayContentChecksum || latest.pathwayContentChecksum !== response.pathwayContentChecksum) {
      setError("This option is stale because the Stage 1 pathway changed. Ask the mentor again before adding it.");
      setReviewing(null);
      return;
    }
    const result = applyResearchMentorCanvasSuggestion(readStepDraft(draft, activeStepId).fields, activeStepId, reviewed.suggestion);
    if (!result.slot) {
      setError("This alternative could not be added. Check the current step and its 40-row limit.");
      return;
    }
    mutateFields(() => result.fields);
    await recordDecision(
      review.suggestion,
      reviewed.changed ? "applied-after-edit" : "applied",
      response,
      reviewed.changed
        ? `The researcher corrected the Mentor wording before adding it. Researcher rationale: ${reviewed.rationale || "The edited wording better reflects the intended direction."}`
        : `The researcher accepted the reviewed wording without an edit. Researcher rationale: ${reviewed.rationale}`,
    );
    setReviewing(null);
    setError("");
    onStatusChange("Researcher added a reviewed mentor option as a new exploring alternative");
  }

  async function applyReviewedTechniqueSuggestion(
    techniqueResponse: ResearchMentorApiResponse,
    suggestion: ResearchMentorCanvasSuggestion,
    reviewedText: string,
    rationale: string,
  ): Promise<boolean> {
    const reviewed = reviewResearchMentorTechniqueApplication(suggestion, reviewedText, rationale);
    if (!reviewed.allowed || !document || !mutateFields || !projectContext || !mentorContextIsCurrent(techniqueResponse.contextContentChecksum, projectContext)) {
      setError(reviewed.allowed ? "This technique result is stale or the current stage no longer permits a canvas alternative." : reviewed.reason);
      return false;
    }
    const latest = await createResearchMentorContext({ projectId, activeStepId, draft, document, ignoredObservationIds, idleSeconds: Math.max(0, Math.floor((Date.now() - lastEditedAt) / 1_000)), editCount });
    if (!techniqueResponse.pathwayContentChecksum || latest.pathwayContentChecksum !== techniqueResponse.pathwayContentChecksum) {
      setError("This technique result is stale because the Stage 1 pathway changed. Run the technique again before adding it.");
      return false;
    }
    const result = applyResearchMentorCanvasSuggestion(readStepDraft(draft, activeStepId).fields, activeStepId, reviewed.suggestion);
    if (!result.slot) {
      setError("This alternative could not be added. Check the current step and its 40-row limit.");
      return false;
    }
    mutateFields(() => result.fields);
    await recordDecision(reviewed.suggestion, reviewed.changed ? "applied-after-edit" : "applied", techniqueResponse, `${reviewed.reason}${reviewed.rationale ? ` Researcher rationale: ${reviewed.rationale}` : ""}`);
    setError("");
    onStatusChange("Researcher added a reviewed scholarly-technique result as a new exploring alternative");
    return true;
  }

  function reviewTechniqueInsight(techniqueResponse: ResearchMentorApiResponse, suggestion: ResearchMentorSuggestion) {
    setResponse(techniqueResponse);
    beginInsightReview(suggestion);
    setTab("mentor");
  }

  function beginInsightReview(suggestion: ResearchMentorSuggestion) {
    const recommendation = suggestion.kind === "canvas-option" ? suggestion.proposedText : suggestion.recommendation;
    const body = `${suggestion.rationale}\n\nResearcher action or wording to review:\n${recommendation}\n\nUncertainty:\n${suggestion.uncertainty}`;
    setInsightDraft({
      suggestionId: suggestion.id,
      title: suggestion.title,
      body,
      initialBody: body,
      kind: "writing-note",
    });
    setReviewing(null);
  }

  async function saveInsight() {
    if (!insightDraft || !response || !projectContext || !responseIsCurrent) {
      setError("This insight is stale because the project context changed. Ask the mentor again before saving it.");
      return;
    }
    try {
      const entry = await createResearchKnowledgeEntry({
        id: `mentor-insight-${crypto.randomUUID()}`,
        projectId,
        stage: activeStageNumber,
        stepId: activeStepId,
        kind: insightDraft.kind,
        title: insightDraft.title,
        body: insightDraft.body,
        timing: activeStageNumber >= 5 ? "actual" : "planned",
        author: "researcher",
        sourceReferences: response.pathwaySource ? [response.pathwaySource] : [],
        manuscriptTargets: [...stageTargets(activeStageNumber)],
        createdAt: new Date().toISOString(),
      });
      appendLocalMentorInsight(window.localStorage, projectId, entry);
      setLocalInsights(loadLocalMentorInsights(window.localStorage, projectId));
      const reviewedSuggestion = response.suggestions.find((item) => item.id === insightDraft.suggestionId);
      if (reviewedSuggestion) {
        const edited = insightDraft.body.trim() !== insightDraft.initialBody.trim() || insightDraft.title.trim() !== reviewedSuggestion.title.trim();
        await recordDecision(
          reviewedSuggestion,
          edited ? "applied-after-edit" : "applied",
          response,
          edited
            ? "The researcher corrected the Mentor wording before saving it to the Living Research Record."
            : "The researcher reviewed and accepted this wording before saving it to the Living Research Record.",
        );
      }
      setDecisions((current) => ({ ...current, [insightDraft.suggestionId]: "saved" }));
      setInsightDraft(null);
      if (cloudUserId) {
        try {
          await appendResearchKnowledgeEntry(createClient(), cloudUserId, entry);
          onStatusChange("Reviewed insight saved to the Living Research Record");
        } catch {
          onStatusChange("Reviewed insight saved on this device · secure foundation unavailable");
        }
      } else {
        onStatusChange("Reviewed insight saved on this device");
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The reviewed insight could not be saved.");
    }
  }

  async function saveMemoryDraft() {
    if (!memory || !memoryDraft) return;
    try {
      const next = await upsertMentorProjectMemoryItem(memory, memoryDraft);
      saveMentorProjectMemory(window.localStorage, next);
      setMemory(next);
      setMemoryDraft(null);
      onStatusChange("Project memory updated on this device");
    } catch (memoryError) {
      setError(memoryError instanceof Error ? memoryError.message : "Project memory could not be updated.");
    }
  }

  async function removeMemory(item: MentorProjectMemoryItem) {
    if (!memory) return;
    const next = await removeMentorProjectMemoryItem(memory, item.id);
    saveMentorProjectMemory(window.localStorage, next);
    setMemory(next);
    onStatusChange("Project memory removed");
  }

  async function resolveQuestion(item: MentorProjectMemoryItem) {
    if (!memory) return;
    const next = await upsertMentorProjectMemoryItem(memory, { id: item.id, kind: item.kind, text: item.text, status: "resolved" });
    saveMentorProjectMemory(window.localStorage, next);
    setMemory(next);
    onStatusChange("Open question marked resolved");
  }

  return (
    <>
      <button
        aria-expanded={open}
        aria-label={open ? "Close research mentor" : proactiveSupportAvailable ? "Open research mentor; optional support is available" : "Open research mentor"}
        className={`${styles.launcher} ${proactiveSupportAvailable ? styles.launcherAttention : ""}`}
        onClick={() => toggleOpen(!open)}
        ref={launcherRef}
        title={proactiveSupportAvailable ? "Optional research support is available" : "Open the project-aware research mentor"}
        type="button"
      >
        <AppIcon name={open ? "arrow-right" : "lightbulb"} />
        {!open && proactiveSupportAvailable ? <span aria-hidden="true" className={styles.supportRing} /> : null}
      </button>

      {open ? (
        <aside aria-busy={loading} aria-label="Research mentor" className={styles.drawer}>
          <header className={styles.drawerHeader}>
            <div><span>Stage {String(activeStageNumber).padStart(2, "0")} · optional support</span><h2>Research mentor</h2></div>
            <button aria-label="Close research mentor" onClick={() => toggleOpen(false)} ref={closeButtonRef} type="button">×</button>
          </header>
          <nav aria-label="Research mentor views" className={styles.tabs}>
            <button aria-current={tab === "mentor" ? "page" : undefined} onClick={() => setTab("mentor")} type="button">Mentor</button>
            <button aria-current={tab === "context" ? "page" : undefined} onClick={() => setTab("context")} type="button">What I understand</button>
            {activeStageNumber === 1 ? <button aria-current={tab === "techniques" ? "page" : undefined} onClick={() => setTab("techniques")} type="button">Techniques</button> : null}
          </nav>
          <p className={styles.boundary}>{tab === "techniques" ? "Your words first. Cerise expands only with permission, and every result requires review." : "Guidance only. You review every project change or saved insight."}</p>

          <div className={styles.drawerBody}>
            {tab === "mentor" ? (
              <>
                {activeStageNumber === 1 ? (
                  <>
                    {supportOpportunity ? (
                      <section aria-label="Optional research support" className={styles.supportOpportunity}>
                        <div className={styles.supportOpportunityHeader}><AppIcon name="bell" /><div><span>Optional support</span><h3>{supportOpportunity.title}</h3></div></div>
                        <p>{supportOpportunity.detail}</p>
                        <div className={styles.supportOpportunityActions}>
                          <button onClick={talkAboutSupportOpportunity} type="button">Talk about this</button>
                          <button onClick={correctSupportOpportunity} type="button">Not an issue</button>
                        </div>
                        <button className={styles.supportTextAction} onClick={() => setShowSupportBasis((current) => !current)} type="button">{showSupportBasis ? "Hide why Cerise noticed this" : "Why did Cerise notice this?"}</button>
                        {showSupportBasis ? <ul className={styles.supportBasis}>{supportOpportunity.signals.filter((item) => item.strength === "task-relevant").map((item) => <li key={item.id}><strong>{item.title}</strong><span>{item.detail}</span></li>)}</ul> : null}
                        <div className={styles.supportOpportunityLinks}><button onClick={suppressSupportOpportunity} type="button">Don’t suggest this again</button><button onClick={askForDifferentSupport} type="button">I need something else</button></div>
                        <small>Detected locally at a natural breakpoint. No raw activity history is sent to AI or stored as a transcript.</small>
                      </section>
                    ) : null}
                    <section className={styles.observationSection}>
                      <div className={styles.sectionHeading}><div><span>Current context</span><h3>What Cerise notices</h3></div><small>{visibleObservations.length} work-state {visibleObservations.length === 1 ? "note" : "notes"}</small></div>
                      {supportPreferences?.mode === "focus" ? <p className={styles.emptyObservation}>Focus mode is active. Cerise will not surface work-state notes or proactive indications until you change this setting.</p> : visibleObservations.length ? <div className={styles.observationList}>{visibleObservations.map((item) => <article key={item.id}><AppIcon name={item.category === "pause" ? "clock" : item.category === "evidence" ? "book-open" : "list"} /><div><strong>{item.title}</strong><p>{item.detail}</p></div><button onClick={() => setIgnoredObservationIds((current) => [...new Set([...current, item.id])])} type="button">Not an issue</button></article>)}</div> : <p className={styles.emptyObservation}>No specific blockage is inferred. The mentor remains available whenever another perspective would be useful.</p>}
                    </section>
                    {supportPreferences ? (
                      <section className={styles.supportPreferences}>
                        <div className={styles.sectionHeading}><div><span>Quiet support</span><h3>Choose when Cerise may signal</h3></div></div>
                        <label><span>Support mode</span><select aria-label="Research mentor support mode" onChange={(event) => chooseSupportMode(event.target.value as ResearchSupportMode)} value={supportPreferences.mode}><option value="gentle">Gentle · quiet ring only</option><option value="on-request">On request only</option><option value="focus">Focus · no work-state notes</option></select></label>
                        <p>A pause never creates a ring by itself. Gentle support requires at least two task-relevant signals at a field blur, save, step change, or project return.</p>
                        {supportPreferences.suppressedCategories.length ? <div className={styles.suppressedSupport}><strong>Suppressed categories</strong>{supportPreferences.suppressedCategories.map((category) => <button key={category} onClick={() => restoreSupportCategory(category)} type="button">Restore {category.replaceAll("-", " ")}</button>)}</div> : null}
                      </section>
                    ) : null}
                  </>
                ) : (
                  <section className={styles.stageFocus}><span>Current support boundary</span><strong>{projectContext?.capability.focus ?? `Support for ${activeStageTitle}`}</strong><p>Later stages are advisory only. Mentor cannot directly edit or approve this stage’s artifacts.</p></section>
                )}

                <section className={styles.modeSection}>
                  <div className={styles.sectionHeading}><div><span>Researcher choice</span><h3>Choose how to think next</h3></div></div>
                  <div className={styles.modeList}>{MODES.map((item) => <button aria-pressed={mode === item.id} className={mode === item.id ? styles.modeActive : undefined} key={item.id} onClick={() => chooseMode(item.id)} type="button"><AppIcon name={item.icon} /><span><strong>{item.label}</strong><small>{item.detail}</small></span><AppIcon name="arrow-right" /></button>)}</div>
                </section>

                <section aria-busy={loading} className={styles.requestSection}>
                  <label htmlFor="research-mentor-prompt"><span>What would be useful right now?</span><small>{selectedMode.label}</small></label>
                  {selectedText ? <div className={styles.selectedText}><span>Selected text included</span><p>{selectedText}</p><button onClick={() => setSelectedText("")} type="button">Clear</button></div> : null}
                  <div className={styles.selectionAction}><button onClick={captureSelection} type="button"><AppIcon name="plus" />Use selected workspace text</button><small>Only captured when you choose this action.</small></div>
                  <textarea id="research-mentor-prompt" maxLength={2_000} onChange={(event) => setPrompt(event.target.value)} rows={4} value={prompt} />
                  <div className={styles.requestActions}><span className={availability === "unavailable" ? styles.unavailable : undefined}>{availabilityMessage}</span>{loading ? <button className={styles.cancelRequest} onClick={cancelMentorRequest} type="button">Cancel request</button> : <button disabled={!canRequest} onClick={() => void runMentor()} type="button"><AppIcon name="send" />Ask mentor</button>}</div>
                  {availability === "unavailable" ? <div className={styles.offlineGuide}><strong>{offlineGuide.title}</strong><p>{offlineGuide.detail}</p><ol>{offlineGuide.actions.map((action) => <li key={action}>{action}</li>)}</ol><small>Local guide · not AI output · no project change</small></div> : null}
                  {error ? <div className={styles.errorBlock} role="alert"><p className={styles.error}>{error}</p>{failure?.retryable ? <button disabled={!canRequest} onClick={retryMentorRequest} type="button">Retry request once</button> : null}</div> : null}
                </section>

                {response ? (
                  <section className={styles.responseSection} aria-live="polite">
                    {!responseIsCurrent ? <p className={styles.staleNotice}>Project context changed after this response. Refresh before applying or saving anything.</p> : null}
                    <div className={styles.responseIntro}><span>Cerise’s observation</span><p>{response.summary}</p></div>
                    {response.suggestions.length ? <h3>Options to consider</h3> : null}
                    <div className={styles.suggestionList}>{response.suggestions.map((suggestion) => (
                      <article key={suggestion.id}>
                        <div><span>{suggestion.kind === "canvas-option" ? "Canvas option" : suggestion.kind === "next-step" ? "Next step" : "Observation"}</span><strong>{suggestion.title}</strong><p>{suggestion.rationale}</p><small>{suggestion.uncertainty}</small></div>
                        {decisions[suggestion.id] ? <em>{decisions[suggestion.id] === "applied" ? "Accepted by researcher" : decisions[suggestion.id] === "applied-after-edit" ? "Corrected and added by researcher" : decisions[suggestion.id] === "saved" ? "Saved after review" : decisions[suggestion.id] === "kept-current" ? "Kept outside canvas" : "Dismissed"}</em> : <div className={styles.suggestionActions}>{suggestion.kind === "canvas-option" ? <button onClick={() => setReviewing({ suggestion, reviewedText: suggestion.proposedText, rationale: "" })} type="button">Review or correct</button> : null}<button onClick={() => beginInsightReview(suggestion)} type="button">Review to save</button><button onClick={() => void recordDecision(suggestion, "dismissed")} type="button">Dismiss</button></div>}
                      </article>
                    ))}</div>
                    <div className={styles.reflectiveQuestion}><AppIcon name="help" /><div><span>A reflective question</span><p>{response.reflectiveQuestion}</p></div></div>
                  </section>
                ) : null}

                {reviewing ? <section className={styles.reviewPanel} aria-label="Review mentor option before adding"><span>Review before canvas</span><h3>{reviewing.suggestion.title}</h3><p>This creates a {fieldLabel(reviewing.suggestion)} as a separate exploring alternative. It will not overwrite, select, link, or archive existing work.</p><label>Reviewed wording<textarea maxLength={2_000} onChange={(event) => setReviewing((current) => current ? { ...current, reviewedText: event.target.value } : null)} rows={5} value={reviewing.reviewedText} /></label><label>Why the unchanged wording fits, or what you corrected<textarea maxLength={1_000} onChange={(event) => setReviewing((current) => current ? { ...current, rationale: event.target.value } : null)} placeholder="A reason is required when accepting unchanged wording." rows={3} value={reviewing.rationale} /></label><small>{reviewing.suggestion.uncertainty}</small><div><button onClick={() => void recordDecision(reviewing.suggestion, "kept-current").then(() => setReviewing(null))} type="button">Keep outside canvas</button><button disabled={!responseIsCurrent || !reviewing.reviewedText.trim() || (reviewing.reviewedText.trim() === reviewing.suggestion.proposedText.trim() && !reviewing.rationale.trim())} onClick={() => void applyReviewedSuggestion(reviewing)} type="button"><AppIcon name="plus" />{reviewing.reviewedText.trim() === reviewing.suggestion.proposedText.trim() ? "Accept and add" : "Add corrected option"}</button></div></section> : null}

                {insightDraft ? (
                  <section className={styles.insightReview} aria-label="Review insight before saving">
                    <span>Researcher review required</span><h3>Save an insight to the project</h3><p>Mentor text is not evidence by itself. Edit the wording and choose the correct knowledge kind before saving.</p>
                    <label>Title<input maxLength={500} onChange={(event) => setInsightDraft((current) => current ? { ...current, title: event.target.value } : null)} value={insightDraft.title} /></label>
                    <label>Kind<select onChange={(event) => setInsightDraft((current) => current ? { ...current, kind: event.target.value as ResearchKnowledgeKind } : null)} value={insightDraft.kind}>{INSIGHT_KINDS.map((kind) => <option key={kind} value={kind}>{kind.replaceAll("-", " ")}</option>)}</select></label>
                    <label>Reviewed wording<textarea maxLength={20_000} onChange={(event) => setInsightDraft((current) => current ? { ...current, body: event.target.value } : null)} rows={7} value={insightDraft.body} /></label>
                    {insightDraft.kind === "evidence" ? <p className={styles.evidenceWarning}>Choose Evidence only if this wording summarizes a source you have actually reviewed; Mentor output is not an independent source.</p> : null}
                    <div><button onClick={() => setInsightDraft(null)} type="button">Cancel</button><button disabled={!responseIsCurrent || !insightDraft.title.trim() || !insightDraft.body.trim()} onClick={() => void saveInsight()} type="button"><AppIcon name="save" />Save insight to project</button></div>
                  </section>
                ) : null}
              </>
            ) : tab === "techniques" ? (
              <ResearchMentorTechniquesPanel
                activeStepId={activeStepId}
                availability={availability}
                availabilityMessage={availabilityMessage}
                context={pathwayContext}
                onApply={applyReviewedTechniqueSuggestion}
                onDecision={(techniqueResponse, suggestion, action, reason) => recordDecision(suggestion, action, techniqueResponse, reason)}
                onKeepReflecting={() => setTab("mentor")}
                onReviewToSave={reviewTechniqueInsight}
                onStatusChange={onStatusChange}
                projectContext={projectContext}
                projectId={projectId}
              />
            ) : (
              <>
                <section className={styles.freshness}>
                  <div><span className={projectContext ? styles.currentDot : styles.pendingDot} />{projectContext ? "Current" : "Preparing"} · refreshed {projectContext ? new Date(projectContext.generatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "—"}</div>
                  <code>{shortChecksum(projectContext?.contentChecksum)}</code>
                  <button onClick={() => setRefreshVersion((current) => current + 1)} type="button"><AppIcon name="refresh" />Refresh</button>
                </section>
                <section className={styles.contextSection}><span>1. Current location</span><div className={styles.locationCard}><strong>Stage {String(activeStageNumber).padStart(2, "0")} · {activeStageTitle}</strong><p>{activeStepTitle}</p></div></section>
                <section className={styles.contextSection}><span>2. Route Cerise is using</span>{routeChips.length ? <div className={styles.routeChips}>{routeChips.map((chip) => <small key={chip}>{chip.replaceAll("-", " ")}</small>)}</div> : <p className={styles.contextEmpty}>No confirmed route profile is available yet.</p>}</section>
                <section className={styles.contextSection}><div className={styles.contextTitle}><span>3. Project evidence</span><small>{projectContext?.approvedEvidence.length ?? 0} researcher-approved</small></div>{projectContext?.approvedEvidence.length ? <ul className={styles.contextList}>{projectContext.approvedEvidence.map((item) => <li key={item.id}><strong>{item.title}</strong><p>{item.body}</p></li>)}</ul> : <p className={styles.contextEmpty}>No verified researcher-authored evidence entries are in this bounded context.</p>}</section>
                <section className={styles.contextSection}><span>4. Open questions</span>{projectContext?.unresolvedUncertainties.length ? <ul className={styles.memoryList}>{projectContext.unresolvedUncertainties.map((item) => <li key={item.id}><p>{item.text}</p><button onClick={() => setMemoryDraft({ id: item.id, kind: item.kind, text: item.text })} type="button">Edit</button><button onClick={() => void resolveQuestion(item)} type="button">Resolve</button></li>)}</ul> : <p className={styles.contextEmpty}>No explicit open questions are saved in project memory.</p>}<button className={styles.secondaryAction} onClick={() => setMemoryDraft({ kind: "open-question", text: "" })} type="button">Add open question</button></section>
                <section className={styles.contextSection}><span>5. Artifact health</span>{projectContext?.artifacts.length ? <div className={styles.artifactTable}>{projectContext.artifacts.map((item) => <div key={`${item.kind}:${item.id}`}><span>{item.label}</span><strong data-status={item.lifecycle}>{item.lifecycle}</strong></div>)}</div> : <p className={styles.contextEmpty}>No foundation artifact metadata is available on this device yet.</p>}{projectContext?.staleDependencies.length ? <p className={styles.dependencyNote}>{projectContext.staleDependencies.length} stale or blocked dependency {projectContext.staleDependencies.length === 1 ? "needs" : "need"} researcher attention.</p> : null}</section>
                <section className={styles.contextSection}><span>6. Project memory</span>{projectContext?.preferences.length ? <ul className={styles.memoryList}>{projectContext.preferences.map((item) => <li key={item.id}><p>{item.text}</p><button onClick={() => setMemoryDraft({ id: item.id, kind: item.kind, text: item.text })} type="button">Correct</button><button onClick={() => void removeMemory(item)} type="button">Remove</button></li>)}</ul> : <p className={styles.contextEmpty}>No preferences have been explicitly saved.</p>}<button className={styles.secondaryAction} onClick={() => setMemoryDraft({ kind: "preference", text: "" })} type="button">Add project memory</button></section>
                {memoryDraft ? <section className={styles.memoryEditor}><span>{memoryDraft.id ? "Correct project memory" : "Add project memory"}</span><textarea autoFocus maxLength={1_000} onChange={(event) => setMemoryDraft((current) => current ? { ...current, text: event.target.value } : null)} rows={4} value={memoryDraft.text} /><div><button onClick={() => setMemoryDraft(null)} type="button">Cancel</button><button disabled={!memoryDraft.text.trim()} onClick={() => void saveMemoryDraft()} type="button">Save memory</button></div></section> : null}
                <section className={styles.privacyCard}><AppIcon name="shield" /><p>No participant rows, signatures, recordings, raw dataset rows, or full chat transcripts are used. Project memory is explicit and correctable; no personal profile is inferred.</p></section>
              </>
            )}
          </div>

          <footer className={styles.contextFooter}><AppIcon name="shield" /><span>{foundationMessage} · {projectContext?.redactionCount ?? 0} selected-text identifiers redacted · no chat transcript saved</span></footer>
        </aside>
      ) : null}
    </>
  );
}
