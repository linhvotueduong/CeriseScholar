"use client";

import Link from "next/link";
import { useState } from "react";

type ContactStatus = "idle" | "sending" | "sent" | "fallback" | "draft" | "error";

type ContactResponse = {
  error?: string;
  mailto?: string;
  ok?: boolean;
  status?: string;
};

const requestTypes = [
  { label: "Report an issue", value: "bug" },
  { label: "Request a feature", value: "feature" },
  { label: "Account & access", value: "help" },
  { label: "Research workflow", value: "improvement" },
];

type HelpContactFormProps = {
  defaultRequestType?: string;
};

export default function HelpContactForm({ defaultRequestType = "" }: HelpContactFormProps) {
  const initialRequestType = requestTypes.some((item) => item.value === defaultRequestType)
    ? defaultRequestType
    : "help";
  const [requestType, setRequestType] = useState(initialRequestType);
  const [subject, setSubject] = useState("");
  const [email, setEmail] = useState("");
  const [area, setArea] = useState("");
  const [context, setContext] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [includeDevice, setIncludeDevice] = useState(true);
  const [status, setStatus] = useState<ContactStatus>("idle");
  const [message, setMessage] = useState("");
  const [fallbackMailto, setFallbackMailto] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");
    setFallbackMailto("");

    const browserContext =
      includeDevice && typeof navigator !== "undefined"
        ? `${context}${context ? " | " : ""}${navigator.platform || "Device"} / ${navigator.userAgent.slice(0, 140)}`
        : context;

    try {
      const response = await fetch("/api/help/contact", {
        body: JSON.stringify({
          area,
          context: browserContext,
          email,
          message: attachmentName
            ? `${messageBody}\n\nAttachment noted but not uploaded in this beta form: ${attachmentName}`
            : messageBody,
          name: "",
          pageUrl: typeof window === "undefined" ? "" : window.location.href,
          requestType,
          subject,
          website: "",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await response.json().catch(() => ({}))) as ContactResponse;

      if (response.ok && data.ok) {
        setStatus("sent");
        setMessage("Thank you. Cerise Scholar received your message.");
        setSubject("");
        setEmail("");
        setArea("");
        setContext("");
        setMessageBody("");
        setAttachmentName("");
        return;
      }

      if (data.mailto) {
        setStatus("fallback");
        setFallbackMailto(data.mailto);
        setMessage(data.error || "Email delivery is not connected here yet. You can send this request directly.");
        return;
      }

      setStatus("error");
      setMessage(data.error || "Cerise Scholar could not send that message yet.");
    } catch {
      setStatus("error");
      setMessage("The help form could not connect. Please try again or email Cerise Scholar directly.");
    }
  }

  function saveDraft() {
    setStatus("draft");
    setMessage("Draft saved in this browser for now.");
    try {
      window.localStorage.setItem(
        "cerise_help_contact_draft",
        JSON.stringify({ area, context, email, includeDevice, messageBody, requestType, subject })
      );
    } catch {
      // The visible draft message is enough if local storage is unavailable.
    }
  }

  const fieldClass =
    "mt-2 h-10 w-full rounded-[8px] border border-[#d8d3ce] bg-white px-3 text-[13px] text-[#111111] outline-none placeholder:text-[#8b8178] focus:border-[#111111]";
  const labelClass = "text-xs font-bold text-[#4f4842]";

  return (
    <form
      className="rounded-[14px] border border-[#e5e1dc] bg-white p-4"
      id="contact-form"
      onSubmit={handleSubmit}
    >
      <h2 className="text-lg font-bold text-[#111111]">Send a support request</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label>
          <span className={labelClass}>Topic</span>
          <select
            className={fieldClass}
            onChange={(event) => setRequestType(event.target.value)}
            value={requestType}
          >
            {requestTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className={labelClass}>Subject</span>
          <input
            className={fieldClass}
            maxLength={120}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Briefly describe your issue"
            required
            type="text"
            value={subject}
          />
        </label>

        <label>
          <span className={labelClass}>Email address</span>
          <input
            autoComplete="email"
            className={fieldClass}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            type="email"
            value={email}
          />
        </label>

        <label>
          <span className={labelClass}>Page or feature</span>
          <input
            className={fieldClass}
            maxLength={120}
            onChange={(event) => setArea(event.target.value)}
            placeholder="e.g., Research Desk > Project Alpha"
            type="text"
            value={area}
          />
        </label>

        <label className="sm:col-span-2">
          <span className={labelClass}>Device or context</span>
          <input
            className={fieldClass}
            maxLength={160}
            onChange={(event) => setContext(event.target.value)}
            placeholder="MacBook, mobile, Chrome, Local Agent..."
            type="text"
            value={context}
          />
        </label>

        <label className="sm:col-span-2">
          <span className={labelClass}>Message</span>
          <textarea
            className="mt-2 min-h-[112px] w-full resize-y rounded-[8px] border border-[#d8d3ce] bg-white px-3 py-3 text-[13px] leading-5 text-[#111111] outline-none placeholder:text-[#8b8178] focus:border-[#111111]"
            maxLength={4000}
            onChange={(event) => setMessageBody(event.target.value)}
            placeholder="Provide details about the issue, steps to reproduce, and what you expected to happen..."
            required
            value={messageBody}
          />
        </label>

        <label className="sm:col-span-2">
          <span className={labelClass}>Attachment (optional)</span>
          <div className="mt-2 rounded-[8px] border border-dashed border-[#d8d3ce] bg-[#fbfaf8] p-4 text-center">
            <input
              className="mx-auto max-w-full text-sm text-[#625a52]"
              onChange={(event) => setAttachmentName(event.target.files?.[0]?.name || "")}
              type="file"
            />
            <p className="mt-2 text-xs text-[#625a52]">
              Attachment upload is not connected yet. Do not attach private source files.
            </p>
          </div>
        </label>
      </div>

      <label className="mt-4 flex items-center gap-3 text-sm font-semibold text-[#111111]">
        <input
          checked={includeDevice}
          className="h-4 w-4 accent-[#111111]"
          onChange={(event) => setIncludeDevice(event.target.checked)}
          type="checkbox"
        />
        Include browser and device details
      </label>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          className="h-10 rounded-[8px] bg-[#111111] px-5 text-[13px] font-bold text-white disabled:opacity-60"
          disabled={status === "sending"}
          type="submit"
        >
          {status === "sending" ? "Submitting..." : "Submit request"}
        </button>
        <button
          className="h-10 rounded-[8px] border border-[#d8d3ce] bg-white px-5 text-[13px] font-bold text-[#111111]"
          onClick={saveDraft}
          type="button"
        >
          Save draft
        </button>
        {fallbackMailto ? (
          <a
            className="inline-flex h-10 items-center rounded-[8px] border border-[#d8d3ce] bg-white px-5 text-[13px] font-bold text-[#111111] no-underline"
            href={fallbackMailto}
          >
            Open email
          </a>
        ) : null}
      </div>

      <p className="mt-4 text-xs leading-5 text-[#625a52]">
        Please do not send passwords, private source files, datasets, or auth codes. See the{" "}
        <Link className="font-bold text-[#111111] underline underline-offset-2" href="/help/privacy">
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link className="font-bold text-[#111111] underline underline-offset-2" href="/help/terms">
          Terms of Use
        </Link>
        .
      </p>

      {message ? (
        <p
          className={`mt-4 rounded-[8px] border px-4 py-3 text-sm leading-6 ${
            status === "sent"
              ? "border-[#cfe5c8] bg-[#edf7e7] text-[#315b18]"
              : status === "draft" || status === "fallback"
                ? "border-[#efdfae] bg-[#fff8e6] text-[#6b4b08]"
                : "border-[#efc7c1] bg-[#fbebe8] text-[#8a241b]"
          }`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
