"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import LaptopRequiredMobileSheet from "@/components/mobile/LaptopRequiredMobileSheet";
import { useLocalAgentStatus } from "@/hooks/useLocalAgentStatus";
import {
  callLocalAgentChat,
  LOCAL_AGENT_REQUIRED_MESSAGE,
  LOCAL_AI_UNAVAILABLE_MESSAGE,
} from "@/lib/local-agent/client";

const p = {
  ink: "#1a1208",
  inkMuted: "#7a6a5a",
  inkFaint: "#9a8a7a",
  cerise: "#c0392b",
  coral: "#c97a6b",
  gold: "#c8a84b",
  rule: "#e0d8d0",
  border: "#d4cdc5",
  surface: "#fdfcfa",
  warm: "#faf7f0",
  bg: "#fefefe",
};

interface NoteForContext {
  module_title: string;
  video_title: string;
  content: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const STORAGE_KEY = "cerise-coach-history-v1";

const SUGGESTED_PROMPTS: { label: string; prompt: string }[] = [
  { label: "Find connections", prompt: "Find connections across my notes — which ones relate to each other and why?" },
  { label: "Group these", prompt: "Group my notes by theme or concept (not just by module)." },
  { label: "Summarize a module", prompt: "Pick one module and summarize my notes from it into 3 key takeaways." },
  { label: "What am I missing?", prompt: "Looking at my notes, what important ideas or topics am I missing or under-noting?" },
  { label: "Make a study guide", prompt: "Turn my notes into a structured study guide I can review before an exam." },
];

function buildNotesContext(notes: NoteForContext[]): string {
  if (notes.length === 0) return "";
  // Group by module
  const byModule = new Map<string, NoteForContext[]>();
  for (const n of notes) {
    const list = byModule.get(n.module_title) ?? [];
    list.push(n);
    byModule.set(n.module_title, list);
  }
  const lines: string[] = [];
  for (const [moduleTitle, list] of byModule) {
    lines.push(`## ${moduleTitle}`);
    for (const n of list) {
      lines.push(`- ${n.video_title}`);
      lines.push(`  ${n.content.replace(/\n/g, " ").trim()}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

export default function CeriseCoach({ notes }: { notes: NoteForContext[] }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [laptopRequiredOpen, setLaptopRequiredOpen] = useState(false);
  const localAgent = useLocalAgentStatus();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Load chat history from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setMessages(parsed);
      }
    } catch {
      // Ignore parse errors — start fresh
    }
  }, []);

  // Persist on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // localStorage may be full or disabled — fail silently
    }
  }, [messages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const notesContext = useMemo(() => buildNotesContext(notes), [notes]);

  async function send(content: string) {
    const trimmed = content.trim();
    if (!trimmed || sending) return;

    if (!localAgent.canUseLocalAi && localAgent.mobile) {
      setLaptopRequiredOpen(true);
      return;
    }

    setError(null);
    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      if (!localAgent.canUseLocalAi) {
        setError(
          localAgent.mobile
            ? LOCAL_AGENT_REQUIRED_MESSAGE
            : localAgent.ui.status === "needs-ollama"
              ? LOCAL_AI_UNAVAILABLE_MESSAGE
              : localAgent.ui.detail || LOCAL_AGENT_REQUIRED_MESSAGE
        );
        return;
      }

      const reply = (
        await callLocalAgentChat({
          messages: [
            {
              role: "system",
              content:
                "You are Cerise, the user's research learning coach. Help them organize and connect their lesson notes. Be warm, concise, concrete, and always end with one reflective follow-up question.\n\n" +
                (notesContext
                  ? `The student's current notes are below. Ground the answer in these notes and do not invent course content.\n\n${notesContext}`
                  : "The student has not written notes yet. Encourage them to start with one short note per lesson."),
            },
            ...nextMessages,
          ],
          query: trimmed,
          timeoutMs: 30000,
        })
      ).trim();
      if (!reply) {
        setError("Cerise returned an empty reply. Try rephrasing your question.");
        setSending(false);
        return;
      }
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setError("Network problem reaching Cerise. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  function handleClear() {
    if (messages.length === 0) return;
    if (!confirm("Clear all messages with Cerise? This can't be undone.")) return;
    setMessages([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  return (
    <>
      {/* Floating launcher button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 100,
            padding: "12px 20px",
            borderRadius: "100px",
            background: p.cerise,
            color: "#fff",
            border: "none",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 6px 20px rgba(192, 57, 43, 0.35)",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span style={{ color: p.gold }}>★</span>
          Ask Cerise to help organize
        </button>
      )}

      {/* Slide-in panel */}
      {open && (
        <>
          {/* Backdrop on mobile only */}
          <div
            onClick={() => setOpen(false)}
            className="lg:hidden"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.35)",
              zIndex: 99,
            }}
          />
          <aside
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: "min(420px, 100vw)",
              background: "#fff",
              borderLeft: `1.5px solid ${p.border}`,
              boxShadow: "-12px 0 32px rgba(0,0,0,0.08)",
              zIndex: 100,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header */}
            <header
              style={{
                padding: "16px 20px",
                borderBottom: `1px solid ${p.rule}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                background: p.warm,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: p.cerise,
                    color: "#fff",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px",
                    fontWeight: 700,
                  }}
                >
                  ★
                </span>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: p.ink, lineHeight: 1.2 }}>
                    Cerise
                  </div>
                  <div style={{ fontSize: "11px", color: p.inkMuted }}>
                    Your learning coach
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <button
                  onClick={handleClear}
                  disabled={messages.length === 0}
                  style={{
                    padding: "4px 10px",
                    fontSize: "11px",
                    color: p.inkMuted,
                    background: "none",
                    border: `1px solid ${p.border}`,
                    borderRadius: "8px",
                    cursor: messages.length === 0 ? "default" : "pointer",
                    opacity: messages.length === 0 ? 0.5 : 1,
                    fontWeight: 600,
                  }}
                  title="Clear chat history"
                >
                  Clear
                </button>
                <button
                  onClick={() => setOpen(false)}
                  style={{
                    padding: "6px 10px",
                    fontSize: "16px",
                    color: p.inkMuted,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    lineHeight: 1,
                  }}
                  title="Close"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </header>

            {/* Messages */}
            <div
              ref={scrollRef}
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "16px 20px 8px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              {messages.length === 0 && (
                <div
                  style={{
                    background: p.surface,
                    border: `1px solid ${p.border}`,
                    borderRadius: "12px",
                    padding: "14px 16px",
                    fontSize: "13px",
                    color: p.ink,
                    lineHeight: 1.6,
                  }}
                >
                  <p style={{ margin: "0 0 6px" }}>
                    Hi — I&apos;m Cerise. I can help you organize, group, and connect the notes you&apos;ve written.
                  </p>
                  <p style={{ margin: 0, color: p.inkMuted, fontSize: "12px" }}>
                    {notes.length === 0
                      ? "You don't have any notes yet. Once you write some, I'll have something to work with."
                      : `I have access to ${notes.length} note${notes.length === 1 ? "" : "s"} you've written. Pick a prompt below or ask me anything.`}
                  </p>
                </div>
              )}

              {messages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "82%",
                      padding: "10px 14px",
                      borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      background: m.role === "user" ? p.ink : p.warm,
                      color: m.role === "user" ? "#fff" : p.ink,
                      fontSize: "13px",
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                      border: m.role === "user" ? "none" : `1px solid ${p.border}`,
                    }}
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {sending && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: "16px 16px 16px 4px",
                      background: p.warm,
                      border: `1px solid ${p.border}`,
                      color: p.inkMuted,
                      fontSize: "13px",
                      fontStyle: "italic",
                    }}
                  >
                    Cerise is thinking…
                  </div>
                </div>
              )}

              {error && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "12px",
                    background: "#fdecea",
                    border: "1px solid #f5c6c2",
                    color: p.cerise,
                    fontSize: "12px",
                  }}
                >
                  {error}
                </div>
              )}
            </div>

            {/* Suggested prompt chips (only show when chat is empty) */}
            {messages.length === 0 && (
              <div
                style={{
                  padding: "0 16px 12px",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "6px",
                }}
              >
                {SUGGESTED_PROMPTS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => send(s.prompt)}
                    disabled={sending}
                    className="hover:bg-[#faf7f0]"
                    style={{
                      padding: "6px 12px",
                      borderRadius: "100px",
                      background: "#fff",
                      border: `1px solid ${p.border}`,
                      fontSize: "11px",
                      color: p.ink,
                      fontWeight: 600,
                      cursor: sending ? "default" : "pointer",
                      opacity: sending ? 0.5 : 1,
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              style={{
                padding: "12px 16px 16px",
                borderTop: `1px solid ${p.rule}`,
                background: "#fff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  alignItems: "flex-end",
                }}
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  placeholder="Ask Cerise about your notes…"
                  rows={1}
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    border: `1.5px solid ${p.border}`,
                    borderRadius: "12px",
                    fontSize: "13px",
                    color: p.ink,
                    background: p.surface,
                    outline: "none",
                    resize: "none",
                    fontFamily: "inherit",
                    lineHeight: 1.5,
                    maxHeight: "120px",
                  }}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || sending}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "100px",
                    background: input.trim() && !sending ? p.cerise : p.warm,
                    color: input.trim() && !sending ? "#fff" : p.inkFaint,
                    border: "none",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: input.trim() && !sending ? "pointer" : "default",
                  }}
                >
                  Send
                </button>
              </div>
              <p style={{ fontSize: "10px", color: p.inkFaint, margin: "6px 2px 0" }}>
                Enter to send · Shift+Enter for newline
              </p>
            </form>
          </aside>
        </>
      )}
      <LaptopRequiredMobileSheet
        open={laptopRequiredOpen}
        onClose={() => setLaptopRequiredOpen(false)}
        title="Use your laptop for Cerise Coach"
        body="Mobile is available for reviewing lessons and notes. AI coaching reads your study context, so during this beta it runs through the Local Agent on a personal or trusted laptop."
        primaryLabel="I’ll use my laptop"
      />
    </>
  );
}
