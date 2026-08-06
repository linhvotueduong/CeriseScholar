"use client";

import { useEffect, useState } from "react";
import type { NameChangeRequest } from "@/lib/profile/nameChange";

type QueueState = "loading" | "ready" | "error";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function NameChangeRequestsAdminPage() {
  const [requests, setRequests] = useState<NameChangeRequest[]>([]);
  const [queueState, setQueueState] = useState<QueueState>("loading");
  const [message, setMessage] = useState("");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function loadQueue() {
    setQueueState("loading");
    try {
      const response = await fetch("/api/admin/name-change-requests", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setQueueState("error");
        setMessage(payload.error || "The review queue could not be loaded.");
        return;
      }
      setRequests(payload.requests ?? []);
      setQueueState("ready");
      setMessage("");
    } catch {
      setQueueState("error");
      setMessage("The review queue could not be loaded.");
    }
  }

  useEffect(() => {
    let active = true;
    void fetch("/api/admin/name-change-requests", { cache: "no-store" })
      .then(async (response) => ({ response, payload: await response.json().catch(() => ({})) }))
      .then(({ response, payload }) => {
        if (!active) return;
        if (!response.ok) {
          setQueueState("error");
          setMessage(payload.error || "The review queue could not be loaded.");
          return;
        }
        setRequests(payload.requests ?? []);
        setQueueState("ready");
      })
      .catch(() => {
        if (!active) return;
        setQueueState("error");
        setMessage("The review queue could not be loaded.");
      });
    return () => { active = false; };
  }, []);

  async function review(requestId: string, decision: "approved" | "rejected") {
    const reviewNote = notes[requestId]?.trim() ?? "";
    if (decision === "rejected" && reviewNote.length < 10) {
      setMessage("Add a short explanation before rejecting a request.");
      return;
    }
    if (!window.confirm(`${decision === "approved" ? "Approve" : "Reject"} this author name change?`)) return;

    setReviewingId(requestId);
    setMessage("");
    const response = await fetch("/api/admin/name-change-requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ requestId, decision, reviewNote }),
    });
    const payload = await response.json().catch(() => ({}));
    setReviewingId(null);
    if (!response.ok) {
      setMessage(payload.error || "The request could not be reviewed.");
      return;
    }
    setMessage(decision === "approved" ? "Author name updated and request approved." : "Request rejected.");
    await loadQueue();
  }

  const pending = requests.filter((request) => request.status === "pending");
  const reviewed = requests.filter((request) => request.status !== "pending");

  return (
    <div className="mx-auto w-full max-w-[1180px] pb-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[#e5e1dc] pb-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#9a7b55]">Cerise Admin</p>
          <h1 className="mt-1 text-2xl font-bold">Author name requests</h1>
          <p className="mt-2 text-sm text-[#6f6760]">Review names before they are used on Cerise Scholar papers.</p>
        </div>
        <button className="h-9 rounded-[8px] border border-[#d8d3ce] px-4 text-xs font-bold" onClick={() => void loadQueue()} type="button">Refresh</button>
      </header>

      {message ? <p aria-live="polite" className="mb-4 rounded-[9px] border border-[#e5e1dc] bg-[#faf9f7] px-4 py-3 text-xs font-semibold">{message}</p> : null}
      {queueState === "loading" ? <p className="py-8 text-sm text-[#6f6760]">Loading requests…</p> : null}

      {queueState === "ready" && pending.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-[#d8d3ce] px-5 py-10 text-center text-sm font-semibold text-[#6f6760]">No pending author name requests.</div>
      ) : null}

      <div className="grid gap-4">
        {pending.map((request) => (
          <article className="rounded-[12px] border border-[#e5e1dc] bg-white p-5" key={request.id}>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#7b7168]">Current author name</p>
                <p className="mt-1 text-base font-bold">{request.current_full_name || "Not available"}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a7b55]">Requested author name</p>
                <p className="mt-1 text-base font-bold">{request.requested_full_name}</p>
              </div>
            </div>
            <div className="mt-4 rounded-[9px] bg-[#f8f5f0] p-4">
              <p className="text-[10px] font-bold text-[#4f4842]">Member reason</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#2d2722]">{request.reason}</p>
            </div>
            <p className="mt-3 text-[10px] text-[#7b7168]">Submitted {formatDate(request.created_at)} · User {request.user_id}</p>
            <label className="mt-4 block text-[10px] font-bold text-[#4f4842]">Admin note<textarea className="mt-1.5 min-h-20 w-full rounded-[8px] border border-[#d8d3ce] p-3 text-xs font-medium outline-none focus:border-[#17120d]" maxLength={1000} onChange={(event) => setNotes((current) => ({ ...current, [request.id]: event.target.value }))} placeholder="Required when rejecting; optional when approving" value={notes[request.id] ?? ""} /></label>
            <div className="mt-4 flex justify-end gap-2">
              <button className="h-9 rounded-[8px] border border-[#c94338] px-4 text-xs font-bold text-[#b42318] disabled:opacity-50" disabled={reviewingId === request.id} onClick={() => void review(request.id, "rejected")} type="button">Reject</button>
              <button className="h-9 rounded-[8px] bg-[#17120d] px-4 text-xs font-bold text-white disabled:opacity-50" disabled={reviewingId === request.id} onClick={() => void review(request.id, "approved")} type="button">{reviewingId === request.id ? "Reviewing…" : "Approve name"}</button>
            </div>
          </article>
        ))}
      </div>

      {reviewed.length ? (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-bold">Recently reviewed</h2>
          <div className="overflow-hidden rounded-[12px] border border-[#e5e1dc]">
            {reviewed.slice(0, 20).map((request) => (
              <div className="grid gap-2 border-t border-[#eeeae5] p-4 first:border-t-0 md:grid-cols-[1fr_1fr_auto] md:items-center" key={request.id}>
                <div><p className="text-[10px] text-[#7b7168]">Requested name</p><p className="text-xs font-bold">{request.requested_full_name}</p></div>
                <div><p className="text-[10px] text-[#7b7168]">Reviewed</p><p className="text-xs font-semibold">{formatDate(request.reviewed_at)}</p></div>
                <span className={`w-fit rounded-full px-2 py-1 text-[9px] font-bold ${request.status === "approved" ? "bg-[#edf9f0] text-[#237a3b]" : "bg-[#fff1f0] text-[#b42318]"}`}>{request.status}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
