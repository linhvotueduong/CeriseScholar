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
          <button onClick={() => this.setState({ hasError: false })} className="mt-2 text-sm text-[#111111] hover:underline">Try again</button>
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
            btn.className = "inline-flex items-center justify-center bg-[#111111] text-white text-[10px] rounded px-1 py-0.5 mx-0.5 hover:bg-[#000000] transition-colors font-mono cursor-pointer align-baseline";
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
    <div ref={ref} className="text-sm text-gray-800 leading-relaxed">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-semibold text-gray-900 mt-4 mb-2">{children}</h3>,
          p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
          em: ({ children }) => <em>{children}</em>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1.5">{children}</ol>,
          li: ({ children }) => <li className="text-gray-700">{children}</li>,
          table: ({ children }) => (
            <div className="overflow-x-auto my-4 rounded-lg border border-gray-200 shadow-sm">
              <table className="w-full text-xs border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-gray-100">{children}</thead>,
          th: ({ children }) => <th className="px-4 py-2.5 text-left font-semibold text-gray-800 border-b border-gray-200">{children}</th>,
          tbody: ({ children }) => <tbody className="divide-y divide-gray-100">{children}</tbody>,
          tr: ({ children }) => <tr className="hover:bg-gray-50">{children}</tr>,
          td: ({ children }) => <td className="px-4 py-2.5 text-gray-700">{children}</td>,
          a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#111111] hover:underline">{children}</a>,
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
        if (!res.ok) throw new Error("Analysis request failed");
        const data = await res.json();
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Research failed");

      updateConv(convId!, (c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.loading ? { role: "assistant", content: data.answer, references: data.references, paperCount: data.paperCount, totalFound: data.totalFound } : m
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
      <div className="flex h-[calc(100vh-57px-64px)] -mx-8 -my-8">
        {/* Left Sidebar */}
        {sidebarOpen && (
          <div className="w-52 bg-gray-50 border-r border-gray-200 flex flex-col shrink-0">
            <div className="p-3 border-b border-gray-200">
              <button onClick={newConversation} className="w-full flex items-center gap-2 px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 font-medium">+ New research</button>
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {conversations.map((conv) => (
                <div key={conv.id} className={`flex items-center group ${activeConvId === conv.id ? "bg-white border-r-2 border-[#111111]" : "hover:bg-white"}`}>
                  <button onClick={() => { setActiveConvId(conv.id); setShowRefs(false); setSelectedPaper(null); }}
                    className={`flex-1 text-left px-3 py-2.5 text-xs transition-colors truncate ${activeConvId === conv.id ? "text-gray-900 font-medium" : "text-gray-600"}`}
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
              {conversations.length === 0 && <p className="text-[10px] text-gray-400 px-3 py-4 text-center">No conversations yet</p>}
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 bg-white shrink-0">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-400 hover:text-gray-600 p-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            {activeConv && <span className="text-sm text-gray-700 font-medium truncate">{activeConv.title}</span>}
            <div className="ml-auto">
              <Link href={`/dashboard/project/${projectId}`} className="text-xs text-gray-500 hover:text-[#111111]">&larr; Workspace</Link>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full px-6">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Discover <em>deeper</em> insights</h1>
                <p className="text-gray-500 mb-10">Powered by OpenAlex and AI synthesis</p>
                <div className="w-full max-w-2xl">
                  <div className="bg-white border border-gray-300 rounded-2xl p-4 shadow-sm">
                    <textarea ref={inputRef} value={query} onChange={handleTextareaChange} onKeyDown={handleKeyDown} placeholder="What would you like to learn more about?" rows={2} className="w-full resize-none text-sm text-gray-800 placeholder-gray-400 focus:outline-none" />
                    <div className="flex items-center justify-between mt-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <div onClick={() => setDeepResearch(!deepResearch)} className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${deepResearch ? "bg-[#111111]" : "bg-gray-300"}`}>
                          <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform shadow ${deepResearch ? "translate-x-4" : "translate-x-0.5"}`} />
                        </div>
                        <span className="text-xs text-gray-600">Deep research</span>
                      </label>
                      <button onClick={() => handleSubmit()} disabled={!query.trim()} className="w-8 h-8 bg-[#111111] text-white rounded-lg flex items-center justify-center hover:bg-[#000000] disabled:opacity-30 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-6 mt-6">
                    {["Explore topics", "Find experts", "Literature review"].map((label) => (
                      <button key={label} onClick={() => { setQuery({ "Explore topics": "What are the main research topics in ", "Find experts": "Who are the leading researchers studying ", "Literature review": "Provide a literature review on " }[label] || ""); inputRef.current?.focus(); }} className="text-xs text-gray-500 hover:text-[#111111] transition-colors">{label}</button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
                {messages.map((msg, i) => (
                  <div key={i}>
                    {msg.role === "user" ? (
                      <div className="flex justify-end">
                        <div className="bg-gray-100 rounded-2xl px-4 py-3 max-w-lg">
                          <p className="text-sm text-gray-800">{msg.content}</p>
                        </div>
                      </div>
                    ) : msg.loading ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-[#111111] rounded-full animate-pulse" />
                          <span className="text-sm text-gray-700 font-medium">Searching papers and creating a response...</span>
                        </div>
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-[#111111]" />
                        </div>
                        <p className="text-center text-sm text-gray-400">Content is loading...</p>
                      </div>
                    ) : msg.error ? (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <p className="text-sm text-red-600">{msg.content}</p>
                        <button onClick={() => handleSubmit(messages[i - 1]?.content)} className="mt-2 text-xs text-[#111111] hover:underline">Retry</button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {(msg.paperCount || msg.totalFound) && (
                          <p className="text-xs text-gray-500">Analyzed {msg.paperCount} papers &middot; {msg.totalFound} sources found</p>
                        )}

                        {/* AI response — memoized, won't re-render when panel state changes */}
                        <ResponseContent
                          content={cleanContent(msg.content)}
                          refNums={refNums}
                          onCiteClick={handleCiteClick}
                        />

                        {/* References */}
                        {msg.references && msg.references.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <button onClick={() => setShowRefs(!showRefs)} className="text-sm text-[#111111] hover:underline font-medium">
                              {showRefs ? "Hide" : "Show all"} {msg.references.length} references
                            </button>
                            {showRefs && (
                              <div className="mt-3 space-y-2">
                                {msg.references.map((r) => (
                                  <div key={r.num} className="flex items-start gap-2 text-xs">
                                    <button onClick={() => openPaperPanel(r)} className="bg-[#111111] text-white rounded px-1.5 py-0.5 font-mono shrink-0 text-[10px] min-w-[20px] text-center hover:bg-[#000000] cursor-pointer">{r.num}</button>
                                    <div className="flex-1">
                                      <button onClick={() => openPaperPanel(r)} className="text-left text-gray-700 hover:text-[#111111] leading-relaxed">
                                        {r.authors.slice(0, 2).join(", ")}{r.authors.length > 2 ? " et al." : ""} ({r.year || "n.d."}). {r.title}. {r.journal}
                                      </button>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <a href={r.url} target="_blank" className="text-[#111111] hover:underline font-medium">Read paper &#x2197;</a>
                                        {r.isOpenAccess && <span className="text-[9px] px-1 py-0.5 bg-green-100 text-green-700 rounded">Open Access</span>}
                                        <span className="text-gray-400">{r.citationCount} cited</span>
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
                            <p className="text-xs font-semibold text-gray-600">Follow-up Suggestions</p>
                            {extractFollowUps(msg.content).map((fu, j) => (
                              <button key={j} onClick={() => handleSubmit(fu)} disabled={isLoading} className="block w-full text-left text-sm text-[#111111] hover:underline px-3 py-1.5 bg-pink-50 rounded-lg disabled:opacity-50">&rarr; {fu}</button>
                            ))}
                          </div>
                        )}

                        <button onClick={() => navigator.clipboard.writeText(msg.content)} className="text-[10px] text-gray-400 hover:text-gray-600">Copy response</button>
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
            <div className="border-t border-gray-200 bg-white px-6 py-3 shrink-0">
              <div className="max-w-3xl mx-auto">
                <div className="bg-white border border-gray-300 rounded-2xl px-4 py-3 flex items-end gap-2">
                  <textarea value={query} onChange={handleTextareaChange} onKeyDown={handleKeyDown} placeholder="Ask a follow-up question" rows={1} disabled={isLoading} className="flex-1 resize-none text-sm text-gray-800 placeholder-gray-400 focus:outline-none disabled:opacity-50" />
                  <button onClick={() => handleSubmit()} disabled={!query.trim() || isLoading} className="w-8 h-8 bg-[#111111] text-white rounded-lg flex items-center justify-center hover:bg-[#000000] disabled:opacity-30 transition-colors shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 text-center mt-1.5">ScholarAsk is powered by OpenAlex and AI. Responses may vary in quality.</p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL — completely independent, doesn't affect ResponseContent */}
        {selectedPaper && (
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between shrink-0">
              <h3 className="text-xs font-semibold text-gray-800">Source [{selectedPaper.num}]</h3>
              <button onClick={() => setSelectedPaper(null)} className="text-xs text-gray-400 hover:text-gray-600">Close</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 leading-snug">{selectedPaper.title}</h4>
                <p className="text-xs text-gray-500 mt-1">{selectedPaper.authors.join(", ")} ({selectedPaper.year || "n.d."})</p>
                {selectedPaper.journal && <p className="text-xs text-gray-400 mt-0.5">{selectedPaper.journal}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <a href={selectedPaper.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#111111] hover:underline font-medium">Read full paper &#x2197;</a>
                  {selectedPaper.isOpenAccess && <span className="text-[9px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-medium">Open Access</span>}
                  <span className="text-[9px] text-gray-400">{selectedPaper.citationCount} citations</span>
                </div>
              </div>
              <div>
                <h5 className="text-xs font-semibold text-gray-700 mb-1">Abstract</h5>
                {selectedPaper.abstract ? (
                  <p className="text-xs text-gray-600 leading-relaxed">{selectedPaper.abstract}</p>
                ) : (
                  <p className="text-xs text-gray-400 italic">No abstract available.</p>
                )}
              </div>
              <div>
                <h5 className="text-xs font-semibold text-gray-700 mb-1">How this paper supports the answer</h5>
                {analyzingPaper === selectedPaper.num ? (
                  <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                    <div className="animate-spin rounded-full h-3 w-3 border border-gray-300 border-t-[#111111]" />
                    Analyzing...
                  </div>
                ) : paperAnalysis[selectedPaper.num] ? (
                  <p className="text-xs text-gray-600 leading-relaxed bg-purple-50 border border-purple-200 rounded-lg p-3">{paperAnalysis[selectedPaper.num]}</p>
                ) : (
                  <p className="text-xs text-gray-400 italic">Analysis will generate automatically...</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
