"use client";

import { useState, useRef, useEffect, useCallback, Component, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
}

async function readApiResponse<T extends { error?: string }>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return res.json() as Promise<T>;
  }

  const text = (await res.text()).trim();
  return {
    error: text || "The server returned an unexpected response. Please try again.",
  } as T;
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
  onCiteClickRef.current = onCiteClick;

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
          a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#1a1208] hover:underline">{children}</a>,
        }}
      >
        {content}
      </Markdown>
    </div>
  );
});

// Need to import React for React.memo
import React from "react";

// ============================================================
// Main Page
// ============================================================
export default function ScholarAskPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const storageKey = `scholarask_${projectId}`;
  const [query, setQuery] = useState("");
  const [deepResearch, setDeepResearch] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [showRefs, setShowRefs] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Right panel — completely separate state
  const [selectedPaper, setSelectedPaper] = useState<PaperRef | null>(null);
  const [paperAnalysis, setPaperAnalysis] = useState<Record<number, string>>({});
  const [analyzingPaper, setAnalyzingPaper] = useState<number | null>(null);

  // Load from localStorage AFTER hydration (avoids mismatch)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.conversations?.length) setConversations(data.conversations);
        if (data.activeConvId) setActiveConvId(data.activeConvId);
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, [storageKey]);

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

  const paperAbortRef = useRef<AbortController | null>(null);

  const openPaperPanel = useCallback(async (paper: PaperRef) => {
    setSelectedPaper(paper);

    if (!paperAnalysisRef.current[paper.num] && lastAssistantMsgRef.current) {
      // Abort any previous in-flight paper analysis
      paperAbortRef.current?.abort();
      const controller = new AbortController();
      paperAbortRef.current = controller;

      setAnalyzingPaper(paper.num);
      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task: "paper_analysis",
            paper: { title: paper.title, authors: paper.authors, year: paper.year, journal: paper.journal, abstract: paper.abstract },
            mainAnswer: lastAssistantMsgRef.current.content.slice(0, 600),
          }),
          signal: controller.signal,
        });
        const data = await readApiResponse<{ content?: string; error?: string }>(res);
        if (!res.ok) throw new Error(data.error || "Analysis request failed");
        if (data.content) {
          setPaperAnalysis((prev) => ({ ...prev, [paper.num]: data.content }));
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setPaperAnalysis((prev) => ({ ...prev, [paper.num]: "Could not generate analysis." }));
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
      messages: [...c.messages, { role: "user", content: q }, { role: "assistant", content: "", loading: true }],
    }));
    setQuery("");
    setShowRefs(false);
    setSelectedPaper(null);

    try {
      const body: Record<string, unknown> = { query: q, deepResearch };
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

      updateConv(convId!, (c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.loading ? { role: "assistant", content: data.answer || "", references: data.references, paperCount: data.paperCount, totalFound: data.totalFound } : m
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

  // Pre-compute refNums so it's stable for React.memo
  const refNums = React.useMemo(
    () => new Set((lastAssistantMsg?.references || []).map((r) => r.num)),
    [lastAssistantMsg?.references]
  );

  return (
    <ErrorBoundary>
      <div className="-mx-8 -my-8 flex flex-col h-[calc(100vh-57px)]">
        {/* Sub-nav tabs */}
        <div style={{ height: "40px", flexShrink: 0, display: "flex", alignItems: "center", padding: "0 24px", gap: "24px", borderBottom: "1px solid #e0d8d0", background: "#fff", fontFamily: "var(--font-noto), 'Noto Sans', sans-serif", fontSize: "11px" }}>
          <Link href="/dashboard" style={{ color: "#7a6a5a", textDecoration: "none", fontSize: "11px" }}>← Projects</Link>
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
        </div>

        <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        {sidebarOpen && (
          <div className="w-52 bg-[#fdfcfa] border-r border-[#e0d8d0] flex flex-col shrink-0">
            <div className="p-3 border-b border-[#e0d8d0]">
              <button onClick={newConversation} className="w-full flex items-center gap-2 px-3 py-2 text-xs bg-white border border-[#e0d8d0] rounded-lg hover:bg-[#fdfcfa] text-[#5a4a3a] font-medium">+ New research</button>
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {conversations.map((conv) => (
                <div key={conv.id} className={`flex items-center group ${activeConvId === conv.id ? "bg-white border-r-2 border-[#1a1208]" : "hover:bg-white"}`}>
                  <button onClick={() => { setActiveConvId(conv.id); setShowRefs(false); setSelectedPaper(null); }}
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
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="relative flex h-full flex-col overflow-hidden bg-white">
                <img
                  src="/assets/characters/lightbulb2_nobg.png"
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-[max(4.5rem,11vh)] left-1/2 h-auto w-[min(20rem,36vw)] -translate-x-1/2 opacity-90 2xl:bottom-[max(2rem,4vh)] 2xl:w-[min(24rem,24vw)]"
                />
                <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-[max(14.5rem,30vh)] 2xl:pb-[max(12rem,24vh)]">
                <h1 className="mb-2 text-4xl font-bold text-[#1a1208] 2xl:text-5xl">Discover <em>deeper</em> insights</h1>
                <p className="mb-10 text-[#7a6a5a] 2xl:text-lg">Powered by OpenAlex and AI synthesis</p>
                <div className="w-full max-w-2xl 2xl:max-w-3xl">
                  <div className="bg-white border border-[#d4cdc5] rounded-2xl p-4 shadow-sm transition-shadow focus-within:border-[#b9afa4] focus-within:shadow-[0_4px_18px_rgba(26,18,8,0.08)] 2xl:p-5">
                    <textarea ref={inputRef} value={query} onChange={handleTextareaChange} onKeyDown={handleKeyDown} placeholder="What would you like to learn more about?" rows={2} className="w-full resize-none text-sm text-[#1a1208] placeholder-[#9a8a7a] focus:outline-none focus-visible:!outline-none focus-visible:!ring-0 2xl:text-base" />
                    <div className="flex items-center justify-between mt-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <div onClick={() => setDeepResearch(!deepResearch)} className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${deepResearch ? "bg-[#1a1208]" : "bg-gray-300"}`}>
                          <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform shadow ${deepResearch ? "translate-x-4" : "translate-x-0.5"}`} />
                        </div>
                        <span className="text-xs text-[#7a6a5a]">Deep research</span>
                      </label>
                      <button onClick={() => handleSubmit()} disabled={!query.trim()} className="w-8 h-8 bg-[#1a1208] text-white rounded-lg flex items-center justify-center hover:bg-[#000000] disabled:opacity-30 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-6 mt-6">
                    {["Explore topics", "Find experts", "Literature review"].map((label) => (
                      <button key={label} onClick={() => { setQuery({ "Explore topics": "What are the main research topics in ", "Find experts": "Who are the leading researchers studying ", "Literature review": "Provide a literature review on " }[label] || ""); inputRef.current?.focus(); }} className="text-xs text-[#7a6a5a] hover:text-[#1a1208] transition-colors">{label}</button>
                    ))}
                  </div>
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
                          <span className="text-sm text-[#5a4a3a] font-medium">Searching papers and creating a response...</span>
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

                        <button onClick={() => navigator.clipboard.writeText(msg.content)} className="text-[10px] text-[#9a8a7a] hover:text-[#7a6a5a]">Copy response</button>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Bottom input */}
          {messages.length > 0 && (
            <div className="border-t border-[#e0d8d0] bg-white px-6 py-3 shrink-0">
              <div className="max-w-3xl mx-auto">
                <div className="bg-white border border-[#d4cdc5] rounded-2xl px-4 py-3 flex items-end gap-2">
                  <textarea value={query} onChange={handleTextareaChange} onKeyDown={handleKeyDown} placeholder="Ask a follow-up question" rows={1} disabled={isLoading} className="flex-1 resize-none text-sm text-[#1a1208] placeholder-[#9a8a7a] focus:outline-none disabled:opacity-50" />
                  <button onClick={() => handleSubmit()} disabled={!query.trim() || isLoading} className="w-8 h-8 bg-[#1a1208] text-white rounded-lg flex items-center justify-center hover:bg-[#000000] disabled:opacity-30 transition-colors shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                  </button>
                </div>
                <p className="text-[10px] text-[#9a8a7a] text-center mt-1.5">ScholarAsk is powered by OpenAlex and AI. Responses may vary in quality.</p>
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
                <h4 className="text-sm font-semibold text-[#1a1208] leading-snug">{selectedPaper.title}</h4>
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
                <h5 className="text-xs font-semibold text-[#5a4a3a] mb-1">How this paper supports the answer</h5>
                {analyzingPaper === selectedPaper.num ? (
                  <div className="flex items-center gap-2 text-xs text-[#9a8a7a] py-2">
                    <div className="animate-spin rounded-full h-3 w-3 border border-[#d4cdc5] border-t-[#1a1208]" />
                    Analyzing...
                  </div>
                ) : paperAnalysis[selectedPaper.num] ? (
                  <p className="text-xs text-[#7a6a5a] leading-relaxed bg-[#faf7f0] border border-[#e0d8d0] rounded-lg p-3">{paperAnalysis[selectedPaper.num]}</p>
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
