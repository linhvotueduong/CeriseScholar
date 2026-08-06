"use client";

import React, { useState, useRef, useEffect, useCallback, Component, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  evidenceDedupeKey,
  fetchScholarAskDedupeKeys,
  saveScholarAskEvidence,
} from "@/lib/research/evidenceLibrary";
import { readApiResponse } from "@/lib/utils/readApiResponse";
import { INCLUDED_MONTHLY_ALLOWANCE, allowanceExceeded } from "@/lib/ai/allowance";
import { createClient } from "@/lib/supabase/client";
import { showToast } from "@/components/app-ui/Toast";
import { useUser } from "@/hooks/useUser";
import {
  exportResearchJourneyArchive,
  legacyJourneyMentorHref,
  mentorModeForLegacyJourneyIntent,
  migrateLegacyResearchJourneyConversations,
  readResearchJourneyArchive,
  writeResearchJourneyArchive,
  type ResearchJourneyArchive,
} from "@/lib/research/researchJourneyMigration";
import type { ResearchMentorMode } from "@/lib/research/researchMentor";

// ============================================================
// Error Boundary
// ============================================================
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center">
          <p className="text-red-500 font-medium">Something went wrong.</p>
          <button onClick={() => this.setState({ hasError: false })} className="mt-2 text-sm text-[#1a1208] hover:underline">Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============================================================
// Types
// ============================================================
interface PaperRef {
  num: number;
  title: string;
  authors: string[];
  year: number | null;
  abstract: string;
  journal: string;
  citationCount: number;
  url: string;
  isOpenAccess: boolean;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  references?: PaperRef[];
  paperCount?: number;
  totalFound?: number;
  loading?: boolean;
  error?: boolean;
  /** Historical only. New ScholarAsk messages are always evidence-search answers. */
  mode?: "research_answer" | "research_journey";
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
}

// ============================================================
// Memoized Markdown renderer — NEVER re-renders unless content changes
// This is the key fix: the response div is isolated from panel state
// ============================================================
const ResponseContent = React.memo(function ResponseContent({
  content,
  refNums,
  onCiteClick,
}: {
  content: string;
  refNums: Set<number>;
  onCiteClick: (num: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onCiteClickRef = useRef(onCiteClick);

  useEffect(() => {
    onCiteClickRef.current = onCiteClick;
  }, [onCiteClick]);

  // After markdown renders, replace [N] text with buttons via DOM
  // This only runs when `content` changes — panel state changes don't affect it
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Wait for Markdown to render
    const timer = setTimeout(() => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const textNodes: Text[] = [];
      let n;
      while ((n = walker.nextNode())) {
        if (/\[\d+\]/.test(n.textContent || "")) textNodes.push(n as Text);
      }

      for (const tn of textNodes) {
        const text = tn.textContent || "";
        const frag = document.createDocumentFragment();
        let lastIdx = 0;
        const regex = /\[(\d+)\]/g;
        let m;
        while ((m = regex.exec(text)) !== null) {
          if (m.index > lastIdx) frag.appendChild(document.createTextNode(text.slice(lastIdx, m.index)));
          const num = parseInt(m[1]);
          if (refNums.has(num)) {
            const btn = document.createElement("button");
            btn.textContent = `[${num}]`;
            btn.setAttribute("data-citenum", String(num));
            btn.className = "inline-flex items-center justify-center bg-[#1a1208] text-white text-[10px] rounded px-1 py-0.5 mx-0.5 hover:bg-[#000000] transition-colors font-mono cursor-pointer align-baseline";
            frag.appendChild(btn);
          } else {
            frag.appendChild(document.createTextNode(m[0]));
          }
          lastIdx = m.index + m[0].length;
        }
        if (lastIdx < text.length) frag.appendChild(document.createTextNode(text.slice(lastIdx)));
        tn.parentNode?.replaceChild(frag, tn);
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [content, refNums]);

  // Persistent click handler — never torn down
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function handleClick(e: Event) {
      const target = e.target as HTMLElement;
      const num = target.getAttribute("data-citenum");
      if (num) {
        e.preventDefault();
        e.stopPropagation();
        onCiteClickRef.current(parseInt(num));
      }
    }
    el.addEventListener("click", handleClick);
    return () => el.removeEventListener("click", handleClick);
  }, []);

  return (
    <div ref={ref} className="text-sm text-[#1a1208] leading-relaxed">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => <h2 className="text-lg font-bold text-[#1a1208] mt-6 mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-semibold text-[#1a1208] mt-4 mb-2">{children}</h3>,
          p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-[#1a1208]">{children}</strong>,
          em: ({ children }) => <em>{children}</em>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1.5">{children}</ol>,
          li: ({ children }) => <li className="text-[#5a4a3a]">{children}</li>,
          table: ({ children }) => (
            <div className="overflow-x-auto my-4 rounded-lg border border-[#e0d8d0] shadow-sm">
              <table className="w-full text-xs border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-[#faf7f0]">{children}</thead>,
          th: ({ children }) => <th className="px-4 py-2.5 text-left font-semibold text-[#1a1208] border-b border-[#e0d8d0]">{children}</th>,
          tbody: ({ children }) => <tbody className="divide-y divide-gray-100">{children}</tbody>,
          tr: ({ children }) => <tr className="hover:bg-[#fdfcfa]">{children}</tr>,
          td: ({ children }) => <td className="px-4 py-2.5 text-[#5a4a3a]">{children}</td>,
          hr: () => null,
          a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#1a1208] hover:underline">{children}</a>,
        }}
      >
        {content}
      </Markdown>
    </div>
  );
});

// ============================================================
// Main Page
// ============================================================
function ScholarAskWorkspace({
  embedded = false,
  projectId: providedProjectId,
}: {
  embedded?: boolean;
  projectId?: string;
}) {
  const params = useParams();
  const projectId = providedProjectId ?? (params.projectId as string);
  const { user } = useUser();

  const storageKey = `cerise_ask_${projectId}`;
  const legacyStorageKey = `${["scholar", "ask"].join("")}_${projectId}`;
  const [query, setQuery] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [journeyArchive, setJourneyArchive] = useState<ResearchJourneyArchive | null>(null);
  const [showJourneyArchive, setShowJourneyArchive] = useState(false);
  const [legacyMentorMode, setLegacyMentorMode] = useState<ResearchMentorMode | null>(null);
  const [showRefs, setShowRefs] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Right panel — completely separate state
  const [selectedPaper, setSelectedPaper] = useState<PaperRef | null>(null);
  const [paperAnalysis, setPaperAnalysis] = useState<Record<number, string>>({});
  const [paperAnalysisError, setPaperAnalysisError] = useState<Record<number, string>>({});
  const [analyzingPaper, setAnalyzingPaper] = useState<number | null>(null);
  const [savedEvidenceIds, setSavedEvidenceIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!embedded) return;
    const narrowViewport = window.matchMedia("(max-width: 639px)");
    const closeSidebarOnNarrowViewport = () => {
      if (narrowViewport.matches) setSidebarOpen(false);
    };
    closeSidebarOnNarrowViewport();
    narrowViewport.addEventListener("change", closeSidebarOnNarrowViewport);
    return () => narrowViewport.removeEventListener("change", closeSidebarOnNarrowViewport);
  }, [embedded]);

  // AI-ready badge — reflects the real usage/lane state from /api/ai/usage
  // instead of a hardcoded "AI ready". Never shows green until we've confirmed it.
  type AiStatusState =
    | { kind: "loading" }
    | { kind: "unknown" }
    | { kind: "byok" }
    | { kind: "included"; used: number; allowance: number }
    | { kind: "exhausted" };
  const [aiStatus, setAiStatus] = useState<AiStatusState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/ai/usage");
        const data = await readApiResponse<{
          lane?: string;
          used?: number;
          allowance?: number | null;
          error?: string;
        }>(res);
        if (cancelled) return;
        if (!res.ok || data.error || !data.lane) {
          setAiStatus({ kind: "unknown" });
          return;
        }
        if (data.lane === "byok") {
          setAiStatus({ kind: "byok" });
          return;
        }
        const used = data.used ?? 0;
        const allowance = data.allowance ?? INCLUDED_MONTHLY_ALLOWANCE;
        setAiStatus(
          allowanceExceeded(used, allowance) ? { kind: "exhausted" } : { kind: "included", used, allowance }
        );
      } catch {
        if (!cancelled) setAiStatus({ kind: "unknown" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load evidence conversations and move historical Journey sessions into a
  // checksum-verified, read-only archive. The archive does not count as a
  // pathway artifact and cannot satisfy Stage 1 readiness.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const saved = localStorage.getItem(storageKey) || localStorage.getItem(legacyStorageKey);
        const data = saved ? JSON.parse(saved) as { conversations?: unknown[]; activeConvId?: unknown } : {};
        const existingArchive = await readResearchJourneyArchive(localStorage, projectId);
        const migrated = await migrateLegacyResearchJourneyConversations({
          projectId,
          conversations: Array.isArray(data.conversations) ? data.conversations : [],
          existingArchive,
        });
        if (cancelled) return;
        setConversations(migrated.activeConversations as Conversation[]);
        if (migrated.archive) {
          writeResearchJourneyArchive(localStorage, migrated.archive);
          setJourneyArchive(migrated.archive);
        }
        const requestedActiveId = typeof data.activeConvId === "string" ? data.activeConvId : null;
        setActiveConvId(migrated.activeConversations.some((conversation) => conversation.id === requestedActiveId) ? requestedActiveId : null);
        if (saved && !localStorage.getItem(storageKey)) localStorage.setItem(storageKey, saved);
        localStorage.removeItem(legacyStorageKey);
      } catch { /* malformed device history stays inert */ }
      if (!cancelled) setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, [legacyStorageKey, projectId, storageKey]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const legacyMode = params.get("answerMode") === "research_journey" || params.get("mode") === "research_journey";
    const legacyIntent = params.get("journeyIntent") ?? params.get("intent");
    if (legacyMode || legacyIntent) setLegacyMentorMode(mentorModeForLegacyJourneyIntent(legacyIntent));
  }, []);

  // Which papers are already in the Evidence Library (Evidence Library v2,
  // supabase/migrations/027_evidence_library.sql) — drives the Save/Saved
  // button state. Keyed by URL (or title) rather than a local id since these
  // rows now live in Supabase, not localStorage.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const keys = await fetchScholarAskDedupeKeys(supabase, user.id);
      if (!cancelled) setSavedEvidenceIds(keys);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Save to localStorage whenever conversations change (only after hydration)
  useEffect(() => {
    if (!hydrated) return;
    try {
      const cleanConvs = conversations.map((c) => ({
        ...c,
        messages: c.messages.filter((m) => !m.loading),
      }));
      localStorage.setItem(storageKey, JSON.stringify({ conversations: cleanConvs, activeConvId }));
    } catch { /* ignore quota errors */ }
  }, [conversations, activeConvId, hydrated, storageKey]);

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const messages = activeConv?.messages || [];
  const isLoading = messages.some((m) => m.loading);
  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant" && !m.loading && !m.error);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Stable reference for openPaperPanel so it doesn't change on every render
  const lastAssistantMsgRef = useRef(lastAssistantMsg);
  lastAssistantMsgRef.current = lastAssistantMsg;
  const paperAnalysisRef = useRef(paperAnalysis);
  paperAnalysisRef.current = paperAnalysis;

  const openPaperPanel = useCallback(async (paper: PaperRef) => {
    setSelectedPaper(paper);

    if (!paperAnalysisRef.current[paper.num] && lastAssistantMsgRef.current) {
      setAnalyzingPaper(paper.num);
      setPaperAnalysisError((prev) => {
        if (!prev[paper.num]) return prev;
        const next = { ...prev };
        delete next[paper.num];
        return next;
      });
      try {
        const response = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task: "paper_analysis",
            paper,
            mainAnswer: lastAssistantMsgRef.current.content,
          }),
        });
        const data = await readApiResponse<{ content?: string; error?: string }>(response);
        if (!response.ok) throw new Error(data.error || "Could not generate analysis.");
        const analysis = data.content || "";
        if (analysis) {
          setPaperAnalysis((prev) => ({ ...prev, [paper.num]: analysis }));
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        // Errors go in a SEPARATE map, never the analysis cache — a transient
        // failure (busy free pool) must not block retries: reopening the
        // citation runs the analysis again because the cache stays empty.
        setPaperAnalysisError((prev) => ({
          ...prev,
          [paper.num]: err instanceof Error ? err.message : "Could not generate analysis.",
        }));
      }
      setAnalyzingPaper(null);
    }
  }, []);

  // Stable callback for citation clicks
  const handleCiteClick = useCallback((num: number) => {
    const refs = lastAssistantMsgRef.current?.references;
    if (!refs) return;
    const paper = refs.find((r) => r.num === num);
    if (paper) openPaperPanel(paper);
  }, [openPaperPanel]);

  function newConversation() {
    setActiveConvId(null);
    setQuery("");
    setShowJourneyArchive(false);
    setShowRefs(false);
    setSelectedPaper(null);
  }

  function updateConv(convId: string, updater: (c: Conversation) => Conversation) {
    setConversations((prev) => prev.map((c) => (c.id === convId ? updater(c) : c)));
  }

  async function handleSubmit(text?: string) {
    const q = (text || query).trim();
    if (!q || isLoading) return;

    const isFollowUp = !!activeConvId && messages.length > 0;
    let convId = activeConvId;

    if (!isFollowUp) {
      convId = Date.now().toString();
      setConversations((prev) => [
        { id: convId!, title: q.length > 50 ? q.slice(0, 50) + "..." : q, messages: [] },
        ...prev,
      ]);
      setActiveConvId(convId);
    }

    updateConv(convId!, (c) => ({
      ...c,
      messages: [...c.messages, { role: "user", content: q }, { role: "assistant", content: "", loading: true, mode: "research_answer" }],
    }));
    setQuery("");
    setShowRefs(false);
    setSelectedPaper(null);

    try {
      const body: Record<string, unknown> = { query: q, projectId };
      if (isFollowUp && lastAssistantMsg) {
        body.followUp = q;
        body.previousAnswer = lastAssistantMsg.content;
      }

      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await readApiResponse<{
        answer?: string;
        references?: PaperRef[];
        paperCount?: number;
        totalFound?: number;
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(data.error || "Research failed");
      if (!data.answer) {
        throw new Error("Cerise Scholar could not generate an answer. Try again.");
      }

      updateConv(convId!, (c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.loading
            ? {
                role: "assistant",
                content: data.answer!,
                references: data.references,
                paperCount: data.paperCount,
                totalFound: data.totalFound,
                mode: m.mode,
              }
            : m
        ),
      }));
    } catch (err) {
      updateConv(convId!, (c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.loading ? { role: "assistant", content: err instanceof Error ? err.message : "Something went wrong.", error: true } : m
        ),
      }));
    }
  }

  function extractFollowUps(content: string): string[] {
    return content.split("\n").filter((l) => l.trim().startsWith("→ ") || l.trim().startsWith("-> ")).map((l) => l.trim().replace(/^(→|->)\s*/, ""));
  }

  function cleanContent(content: string): string {
    return content.split("\n").filter((l) => !l.trim().startsWith("→ ") && !l.trim().startsWith("-> ")).join("\n");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setQuery(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 150) + "px";
  }

  async function handleSaveSelectedPaper() {
    if (!selectedPaper || !user) return;
    const paper = selectedPaper;
    const key = evidenceDedupeKey({ title: paper.title, url: paper.url });
    if (savedEvidenceIds.has(key)) return;

    const supabase = createClient();
    const saved = await saveScholarAskEvidence(supabase, {
      userId: user.id,
      projectId: projectId || null,
      title: paper.title,
      docType: paper.journal ? "Journal Article" : "Other",
      url: paper.url || null,
    });

    if (!saved) {
      showToast({ message: "Couldn't save this source — try again." });
      return;
    }

    setSavedEvidenceIds((current) => new Set([...current, key]));
    showToast({ message: "Saved to your Evidence Library" });
  }

  function handleExportJourneyArchive() {
    if (!journeyArchive) return;
    const blob = new Blob([exportResearchJourneyArchive(journeyArchive)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `cerise-research-journey-archive-${projectId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  // Pre-compute refNums so it's stable for React.memo
  const refNums = React.useMemo(
    () => new Set((lastAssistantMsg?.references || []).map((r) => r.num)),
    [lastAssistantMsg?.references]
  );

  return (
    <ErrorBoundary>
      <div className={embedded ? "flex h-full min-h-[620px] flex-col" : "-mx-8 -my-8 flex h-[calc(100vh-57px)] flex-col"}>
        {/* Sub-nav tabs */}
        {!embedded ? <div style={{ height: "40px", flexShrink: 0, display: "flex", alignItems: "center", padding: "0 24px", gap: "24px", borderBottom: "1px solid #e0d8d0", background: "#fff", fontFamily: "var(--font-noto), 'Noto Sans', sans-serif", fontSize: "11px" }}>
          <Link href="/projects" style={{ color: "#7a6a5a", textDecoration: "none", fontSize: "11px" }}>← Projects</Link>
          <div style={{ flex: 1 }} />
          {[
            { n: "Workspace", h: `/dashboard/project/${projectId}` },
            { n: "ScholarAsk", h: `/dashboard/project/${projectId}/scholar-ask`, active: true },
            { n: "Meta Analysis", h: `/dashboard/project/${projectId}/meta-analysis` },
            { n: "Lit Review", h: `/dashboard/project/${projectId}/literature-review` },
            { n: "Paper Writer", h: `/dashboard/project/${projectId}/paper-writer` },
          ].map((tab) => (
            <Link key={tab.n} href={tab.h} style={{ color: tab.active ? "#c0392b" : "#7a6a5a", fontWeight: tab.active ? 700 : 400, borderBottom: tab.active ? "2px solid #c0392b" : "2px solid transparent", paddingBottom: "8px", marginBottom: "-1px", fontSize: "11px", textDecoration: "none" }}>{tab.n}</Link>
          ))}
        </div> : null}

        <div className="relative flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        {sidebarOpen && (
          <div className={`w-52 bg-[#fdfcfa] border-r border-[#e0d8d0] flex flex-col shrink-0 ${embedded ? "max-sm:absolute max-sm:inset-y-0 max-sm:left-0 max-sm:z-20 max-sm:shadow-xl" : ""}`}>
            <div className="flex items-center gap-2 p-3 border-b border-[#e0d8d0]">
              <button onClick={newConversation} className="w-full flex items-center gap-2 px-3 py-2 text-xs bg-white border border-[#e0d8d0] rounded-lg hover:bg-[#fdfcfa] text-[#5a4a3a] font-medium">+ New research</button>
              {embedded ? (
                <button
                  aria-label="Close conversations"
                  className="hidden shrink-0 rounded-lg border border-[#e0d8d0] bg-white px-2 py-2 text-[10px] font-semibold text-[#5a4a3a] max-sm:inline-flex"
                  onClick={() => setSidebarOpen(false)}
                  type="button"
                >
                  Close
                </button>
              ) : null}
            </div>
            {journeyArchive?.conversations.length ? (
              <button
                className={`mx-3 mt-3 rounded-lg border px-3 py-2 text-left text-[11px] font-semibold ${showJourneyArchive ? "border-[#9a6546] bg-[#f8efe8] text-[#6d442d]" : "border-[#e0d8d0] bg-white text-[#7a6a5a] hover:bg-[#faf7f0]"}`}
                onClick={() => { setShowJourneyArchive(true); setSelectedPaper(null); }}
                type="button"
              >
                Journey archive · {journeyArchive.conversations.length}
                <span className="mt-0.5 block text-[9px] font-normal">Read-only historical mentoring</span>
              </button>
            ) : null}
            <div className="flex-1 overflow-y-auto py-1">
              {conversations.map((conv) => (
                <div key={conv.id} className={`flex items-center group ${activeConvId === conv.id ? "bg-white border-r-2 border-[#1a1208]" : "hover:bg-white"}`}>
                  <button onClick={() => { setActiveConvId(conv.id); setShowJourneyArchive(false); setShowRefs(false); setSelectedPaper(null); }}
                    className={`flex-1 text-left px-3 py-2.5 text-xs transition-colors truncate ${activeConvId === conv.id ? "text-[#1a1208] font-medium" : "text-[#7a6a5a]"}`}
                  >{conv.title}</button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConversations((prev) => prev.filter((c) => c.id !== conv.id));
                      if (activeConvId === conv.id) { setActiveConvId(null); setSelectedPaper(null); }
                    }}
                    className="px-2 py-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    title="Delete conversation"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
              {conversations.length === 0 && <p className="text-[10px] text-[#9a8a7a] px-3 py-4 text-center">No conversations yet</p>}
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-[#e0d8d0] bg-white shrink-0">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-[#9a8a7a] hover:text-[#7a6a5a] p-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            {activeConv && <span className="text-sm text-[#5a4a3a] font-medium truncate">{activeConv.title}</span>}
            <div className="ml-auto" />
            {!embedded ? <Link
              aria-label="Open Evidence Library"
              className="inline-flex shrink-0 items-center rounded-lg bg-[#1a1208] px-3 py-1.5 text-[10px] font-semibold text-white shadow-sm transition-colors hover:bg-black"
              href="/evidence-library"
            >
              Evidence Library <span aria-hidden="true">→</span>
            </Link> : null}
            {aiStatus.kind === "included" && (
              <span className="hidden sm:inline-flex rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-[10px] font-semibold text-green-700">
                AI ready — included ({aiStatus.used} of {aiStatus.allowance} used)
              </span>
            )}
            {aiStatus.kind === "exhausted" && (
              <Link
                href="/settings/ai"
                className="hidden sm:inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700 hover:bg-amber-100"
              >
                Allowance used — connect a key in Settings
              </Link>
            )}
            {(aiStatus.kind === "loading" || aiStatus.kind === "unknown") && (
              <span className="hidden sm:inline-flex rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-semibold text-gray-500">
                {aiStatus.kind === "loading" ? "Checking AI status…" : "AI status unknown"}
              </span>
            )}
          </div>

          {legacyMentorMode ? (
            <div className="flex flex-wrap items-center gap-3 border-b border-[#dfc7b7] bg-[#fff8f2] px-4 py-3 text-xs text-[#6d442d]" role="status">
              <strong>Research Journey moved to the Research Mentor.</strong>
              <span>This saved link still works; historical content remains in the read-only archive and does not mark Stage 1 complete.</span>
              <Link className="ml-auto rounded-full bg-[#6d442d] px-3 py-1.5 font-semibold text-white" href={legacyJourneyMentorHref(projectId, legacyMentorMode)}>Open Mentor</Link>
            </div>
          ) : null}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            {showJourneyArchive && journeyArchive ? (
              <div className="mx-auto max-w-4xl space-y-5 px-6 py-8">
                <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e0d8d0] pb-5">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9a6546]">Historical · read only</p>
                    <h1 className="mt-1 text-2xl font-bold text-[#1a1208]">Research Journey archive</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#7a6a5a]">These conversations are preserved exactly for reference. They are not current pathway artifacts, Mentor context, evidence, or Stage 1 readiness.</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="rounded-lg border border-[#d4cdc5] bg-white px-3 py-2 text-xs font-semibold text-[#5a4a3a]" onClick={handleExportJourneyArchive} type="button">Export JSON</button>
                    <button className="rounded-lg bg-[#1a1208] px-3 py-2 text-xs font-semibold text-white" onClick={() => setShowJourneyArchive(false)} type="button">Back to evidence search</button>
                  </div>
                </header>
                {journeyArchive.conversations.map((conversation) => (
                  <details className="rounded-xl border border-[#e0d8d0] bg-white p-4 shadow-sm" key={conversation.id}>
                    <summary className="cursor-pointer list-none">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div><strong className="text-sm text-[#1a1208]">{conversation.title}</strong><small className="mt-1 block text-[10px] text-[#9a8a7a]">{conversation.messages.length} messages · migrated {new Date(conversation.migratedAt).toLocaleDateString()}</small></div>
                        <Link className="rounded-full border border-[#dfc7b7] bg-[#fff8f2] px-3 py-1.5 text-[10px] font-semibold text-[#6d442d]" href={legacyJourneyMentorHref(projectId, conversation.suggestedMentorMode)}>Continue with Mentor</Link>
                      </div>
                    </summary>
                    <div className="mt-4 space-y-3 border-t border-[#eee7df] pt-4">
                      {conversation.messages.map((message, index) => (
                        <article className={message.role === "user" ? "ml-auto max-w-[82%] rounded-xl bg-[#faf7f0] p-3" : "max-w-[92%] rounded-xl border border-[#eee7df] bg-white p-3"} key={`${conversation.id}-${index}`}>
                          <span className="mb-2 block text-[9px] font-bold uppercase tracking-[0.12em] text-[#9a8a7a]">{message.role === "user" ? "Researcher" : "Historical Journey response"}</span>
                          <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-[#5a4a3a]">{message.content}</pre>
                        </article>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="relative flex h-full flex-col overflow-hidden bg-white">
                <img
                  src="/assets/characters/lightbulb2_nobg.png"
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-[max(4.5rem,11vh)] left-1/2 h-auto w-[min(20rem,36vw)] -translate-x-1/2 opacity-90 2xl:bottom-[max(2rem,4vh)] 2xl:w-[min(24rem,24vw)]"
                />
                <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-[max(14.5rem,30vh)] 2xl:pb-[max(12rem,24vh)]">
                <h1 className="mb-2 text-4xl font-bold text-[#1a1208] 2xl:text-5xl">Search the <em>evidence</em></h1>
                <p className="mb-10 text-[#7a6a5a] 2xl:text-lg">Find, interrogate, and synthesize academic sources for the question you bring.</p>
                <div className="w-full max-w-2xl 2xl:max-w-3xl">
                  <div className="bg-white border border-[#d4cdc5] rounded-2xl p-4 shadow-sm transition-shadow focus-within:border-[#b9afa4] focus-within:shadow-[0_4px_18px_rgba(26,18,8,0.08)] 2xl:p-5">
                    <textarea ref={inputRef} value={query} onChange={handleTextareaChange} onKeyDown={handleKeyDown} placeholder="What would you like to learn more about?" rows={2} className="w-full resize-none text-sm text-[#1a1208] placeholder-[#9a8a7a] focus:outline-none focus-visible:!outline-none focus-visible:!ring-0 2xl:text-base" />
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9a8a7a]">Evidence search</span>
                      <button onClick={() => handleSubmit()} disabled={!query.trim()} className="w-8 h-8 bg-[#1a1208] text-white rounded-lg flex items-center justify-center hover:bg-[#000000] disabled:opacity-30 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                      </button>
                    </div>
                  </div>
                  <p className="mt-6 text-center text-xs text-[#7a6a5a]">Need to shape, narrow, bridge, or compare a research path? Open the project’s Research Mentor.</p>
                </div>
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
                {messages.map((msg, i) => (
                  <div key={i}>
                    {msg.role === "user" ? (
                      <div className="flex justify-end">
                        <div className="bg-[#faf7f0] rounded-2xl px-4 py-3 max-w-lg">
                          <p className="text-sm text-[#1a1208]">{msg.content}</p>
                        </div>
                      </div>
                    ) : msg.loading ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-[#1a1208] rounded-full animate-pulse" />
                          <span className="text-sm text-[#5a4a3a] font-medium">Searching papers and thinking...</span>
                        </div>
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#d4cdc5] border-t-[#1a1208]" />
                        </div>
                        <p className="text-center text-sm text-[#9a8a7a]">Content is loading...</p>
                      </div>
                    ) : msg.error ? (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <p className="text-sm text-red-600">{msg.content}</p>
                        <button onClick={() => handleSubmit(messages[i - 1]?.content)} className="mt-2 text-xs text-[#1a1208] hover:underline">Retry</button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {(msg.paperCount || msg.totalFound) && (
                          <p className="text-xs text-[#7a6a5a]">Analyzed {msg.paperCount} papers &middot; {msg.totalFound} sources found</p>
                        )}

                        {/* AI response — memoized, won't re-render when panel state changes */}
                        <ResponseContent
                          content={cleanContent(msg.content)}
                          refNums={refNums}
                          onCiteClick={handleCiteClick}
                        />

                        {/* References */}
                        {msg.references && msg.references.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-[#e0d8d0]">
                            <button onClick={() => setShowRefs(!showRefs)} className="text-sm text-[#1a1208] hover:underline font-medium">
                              {showRefs ? "Hide" : "Show all"} {msg.references.length} references
                            </button>
                            {showRefs && (
                              <div className="mt-3 space-y-2">
                                {msg.references.map((r) => (
                                  <div key={r.num} className="flex items-start gap-2 text-xs">
                                    <button onClick={() => openPaperPanel(r)} className="bg-[#1a1208] text-white rounded px-1.5 py-0.5 font-mono shrink-0 text-[10px] min-w-[20px] text-center hover:bg-[#000000] cursor-pointer">{r.num}</button>
                                    <div className="flex-1">
                                      <button onClick={() => openPaperPanel(r)} className="text-left text-[#5a4a3a] hover:text-[#1a1208] leading-relaxed">
                                        {r.authors.slice(0, 2).join(", ")}{r.authors.length > 2 ? " et al." : ""} ({r.year || "n.d."}). {r.title}. {r.journal}
                                      </button>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <a href={r.url} target="_blank" className="text-[#1a1208] hover:underline font-medium">Read paper &#x2197;</a>
                                        {r.isOpenAccess && <span className="text-[9px] px-1 py-0.5 bg-green-100 text-green-700 rounded">Open Access</span>}
                                        <span className="text-[#9a8a7a]">{r.citationCount} cited</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Follow-ups */}
                        {extractFollowUps(msg.content).length > 0 && (
                          <div className="mt-4 space-y-2">
                            <p className="text-xs font-semibold text-[#7a6a5a]">Follow-up Suggestions</p>
                            {extractFollowUps(msg.content).map((fu, j) => (
                              <button key={j} onClick={() => handleSubmit(fu)} disabled={isLoading} className="block w-full text-left text-sm text-[#1a1208] hover:underline px-3 py-1.5 bg-[#faf7f0] rounded-lg disabled:opacity-50">&rarr; {fu}</button>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-3">
                          <button onClick={() => navigator.clipboard.writeText(msg.content)} className="text-[10px] text-[#9a8a7a] hover:text-[#7a6a5a]">Copy response</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Bottom input */}
          {messages.length > 0 && !showJourneyArchive && (
            <div className="border-t border-[#e0d8d0] bg-white px-6 py-3 shrink-0">
              <div className="max-w-3xl mx-auto">
                <div className="bg-white border border-[#d4cdc5] rounded-2xl px-4 py-3">
                  <div className="flex items-end gap-2">
                    <textarea value={query} onChange={handleTextareaChange} onKeyDown={handleKeyDown} placeholder="Ask a follow-up question" rows={1} disabled={isLoading} className="flex-1 resize-none text-sm text-[#1a1208] placeholder-[#9a8a7a] focus:outline-none focus-visible:!outline-none focus-visible:!ring-0 disabled:opacity-50" />
                    <button onClick={() => handleSubmit()} disabled={!query.trim() || isLoading} className="w-8 h-8 bg-[#1a1208] text-white rounded-lg flex items-center justify-center hover:bg-[#000000] disabled:opacity-30 transition-colors shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-[#9a8a7a] text-center mt-1.5">ScholarAsk searches real papers via OpenAlex and answers with AI.</p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL — completely independent, doesn't affect ResponseContent */}
        {selectedPaper && (
          <div className="w-80 bg-white border-l border-[#e0d8d0] flex flex-col shrink-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-[#e0d8d0] flex items-center justify-between shrink-0">
              <h3 className="text-xs font-semibold text-[#1a1208]">Source [{selectedPaper.num}]</h3>
              <button onClick={() => setSelectedPaper(null)} className="text-xs text-[#9a8a7a] hover:text-[#7a6a5a]">Close</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold text-[#1a1208] leading-snug">{selectedPaper.title}</h4>
                  <button
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                      savedEvidenceIds.has(evidenceDedupeKey({ title: selectedPaper.title, url: selectedPaper.url }))
                        ? "border-[#d7eadf] bg-[#edf8f0] text-green-700"
                        : "border-[#e0d8d0] bg-[#faf7f0] text-[#5a4a3a] hover:bg-[#f4ede4]"
                    }`}
                    onClick={handleSaveSelectedPaper}
                    type="button"
                    disabled={!user}
                  >
                    {savedEvidenceIds.has(evidenceDedupeKey({ title: selectedPaper.title, url: selectedPaper.url })) ? "Saved" : "Save"}
                  </button>
                </div>
                <p className="text-xs text-[#7a6a5a] mt-1">{selectedPaper.authors.join(", ")} ({selectedPaper.year || "n.d."})</p>
                {selectedPaper.journal && <p className="text-xs text-[#9a8a7a] mt-0.5">{selectedPaper.journal}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <a href={selectedPaper.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#1a1208] hover:underline font-medium">Read full paper &#x2197;</a>
                  {selectedPaper.isOpenAccess && <span className="text-[9px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-medium">Open Access</span>}
                  <span className="text-[9px] text-[#9a8a7a]">{selectedPaper.citationCount} citations</span>
                </div>
              </div>
              <div>
                <h5 className="text-xs font-semibold text-[#5a4a3a] mb-1">Abstract</h5>
                {selectedPaper.abstract ? (
                  <p className="text-xs text-[#7a6a5a] leading-relaxed">{selectedPaper.abstract}</p>
                ) : (
                  <p className="text-xs text-[#9a8a7a] italic">No abstract available.</p>
                )}
              </div>
              <div>
                <h5 className="text-xs font-semibold text-[#5a4a3a] mb-1">How this paper connects to the answer</h5>
                {analyzingPaper === selectedPaper.num ? (
                  <div className="flex items-center gap-2 text-xs text-[#9a8a7a] py-2">
                    <div className="animate-spin rounded-full h-3 w-3 border border-[#d4cdc5] border-t-[#1a1208]" />
                    Analyzing...
                  </div>
                ) : paperAnalysis[selectedPaper.num] ? (
                  <p className="text-xs text-[#7a6a5a] leading-relaxed bg-[#faf7f0] border border-[#e0d8d0] rounded-lg p-3">{paperAnalysis[selectedPaper.num]}</p>
                ) : paperAnalysisError[selectedPaper.num] ? (
                  <div className="text-xs leading-relaxed bg-[#fdf3f2] border border-[#eed5d2] rounded-lg p-3">
                    <p className="text-[#9a3f3a]">{paperAnalysisError[selectedPaper.num]}</p>
                    <button
                      className="mt-2 rounded border border-[#e0cdb8] bg-white px-2 py-1 text-[11px] font-semibold text-[#8f6132] hover:bg-[#f6efe4]"
                      onClick={() => openPaperPanel(selectedPaper)}
                      type="button"
                    >
                      Retry analysis
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-[#9a8a7a] italic">Analysis will generate automatically...</p>
                )}
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default function ScholarAskPage(props: unknown) {
  const embedded = Boolean(
    props && typeof props === "object" && "embedded" in props && props.embedded,
  );
  const projectId =
    props &&
    typeof props === "object" &&
    "projectId" in props &&
    typeof props.projectId === "string"
      ? props.projectId
      : undefined;

  return <ScholarAskWorkspace embedded={embedded} projectId={projectId} />;
}
