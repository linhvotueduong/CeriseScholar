"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import HEDGEHOG from "@/lib/hedgehog";

type ContactStatus = "idle" | "sending" | "sent" | "fallback" | "error";

type ContactResponse = {
  error?: string;
  mailto?: string;
  ok?: boolean;
  status?: string;
};

const requestTypes = [
  { body: "Setup, account, or local-agent questions.", label: "Help", value: "help" },
  { body: "Something broken or confusing.", label: "Bug", value: "bug" },
  { body: "A new workflow you want Cerise to support.", label: "Feature", value: "feature" },
  { body: "A polish note, wording idea, or UX suggestion.", label: "Improve", value: "improvement" },
];

const helpfulDetails = ["Request type", "Page or feature", "What you tried", "What you expected"];

type HelpContactFormProps = {
  defaultRequestType?: string;
};

export default function HelpContactForm({ defaultRequestType = "" }: HelpContactFormProps) {
  const [status, setStatus] = useState<ContactStatus>("idle");
  const [message, setMessage] = useState("");
  const [fallbackMailto, setFallbackMailto] = useState("");
  const initialRequestType = requestTypes.some((item) => item.value === defaultRequestType)
    ? defaultRequestType
    : "";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    setStatus("sending");
    setMessage("");
    setFallbackMailto("");

    try {
      const response = await fetch("/api/help/contact", {
        body: JSON.stringify({
          area: formData.get("area"),
          context: formData.get("context"),
          email: formData.get("email"),
          message: formData.get("message"),
          name: formData.get("name"),
          pageUrl: typeof window === "undefined" ? "" : window.location.href,
          requestType: formData.get("requestType"),
          subject: formData.get("subject"),
          website: formData.get("website"),
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await response.json().catch(() => ({}))) as ContactResponse;

      if (response.ok && data.ok) {
        form.reset();
        setStatus("sent");
        setMessage("Thank you. Cerise Scholar received your message.");
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

  const inputClass =
    "mt-2 h-11 w-full border-0 border-b border-white/55 bg-transparent px-0 text-sm text-white outline-none transition placeholder:text-white/45 focus:border-white";
  const labelClass = "text-xs font-black text-white";

  return (
    <section
      className="overflow-hidden rounded-[8px] border border-[#d4cdc5] bg-white p-3 shadow-[0_18px_50px_rgba(26,18,8,0.12)]"
      id="contact-support"
    >
      <div className="grid gap-3 lg:grid-cols-[0.92fr_1fr]">
        <form
          className="rounded-[8px] bg-[#1e5794] px-6 py-7 text-white sm:px-8 lg:px-9 lg:py-9"
          onSubmit={handleSubmit}
        >
          <div className="hidden">
            <label htmlFor="contact-website">Website</label>
            <input autoComplete="off" id="contact-website" name="website" tabIndex={-1} type="text" />
          </div>

          <p className="font-display text-3xl font-normal leading-tight text-white sm:text-4xl">
            Get in touch
          </p>
          <p className="mt-2 text-sm leading-6 text-white/82">
            Tell us what happened, what you need, or what would make Cerise better.
          </p>

          <div className="mt-8 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <label>
                <span className={labelClass}>Name</span>
                <input autoComplete="name" className={inputClass} name="name" placeholder="Your name" type="text" />
              </label>

              <label>
                <span className={labelClass}>Email</span>
                <input
                  autoComplete="email"
                  className={inputClass}
                  name="email"
                  placeholder="you@example.com"
                  required
                  type="email"
                />
              </label>
            </div>

            <label className="block">
              <span className={labelClass}>How can we help?</span>
              <input
                className={inputClass}
                maxLength={120}
                name="subject"
                placeholder="Tell us a little about the request..."
                required
                type="text"
              />
            </label>

            <div className="grid gap-5 sm:grid-cols-2">
              <label>
                <span className={labelClass}>Request type</span>
                <select
                  className="mt-2 h-11 w-full border-0 border-b border-white/55 bg-transparent px-0 text-sm font-bold text-white outline-none transition focus:border-white [&_option]:text-[#1a1208]"
                  defaultValue={initialRequestType}
                  name="requestType"
                  required
                >
                  <option disabled value="">
                    Select option...
                  </option>
                  {requestTypes.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className={labelClass}>Page or feature</span>
                <input
                  className={inputClass}
                  maxLength={120}
                  name="area"
                  placeholder="Login, setup, ScholarAsk..."
                  type="text"
                />
              </label>
            </div>

            <label className="block">
              <span className={labelClass}>Device or context</span>
              <input
                className={inputClass}
                maxLength={120}
                name="context"
                placeholder="MacBook, mobile, Chrome, Local Agent..."
                type="text"
              />
            </label>

            <label className="block">
              <span className={labelClass}>Message</span>
              <textarea
                className="mt-2 min-h-[118px] w-full resize-y border-0 border-b border-white/55 bg-transparent px-0 py-2 text-sm leading-6 text-white outline-none transition placeholder:text-white/45 focus:border-white"
                maxLength={4000}
                name="message"
                placeholder="What happened, what did you expect, and what did you already try?"
                required
              />
            </label>

            <div className="pt-3">
              <button
                className="inline-flex h-11 w-full items-center justify-center rounded-[7px] bg-white px-7 text-sm font-black text-[#1a1208] transition hover:bg-[#f5f2ec] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={status === "sending"}
                type="submit"
              >
                {status === "sending" ? "Sending..." : "Let's get started"}
              </button>

              {fallbackMailto ? (
                <a
                  className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-[7px] border border-white/35 px-6 text-sm font-black text-white no-underline transition hover:bg-white/10"
                  href={fallbackMailto}
                >
                  Open email
                </a>
              ) : null}
            </div>

            <p className="text-[11px] leading-5 text-white/64">
              By sending this form, you agree that Cerise Scholar may use your message and reply
              email to respond to your request. See the{" "}
              <a className="font-bold text-white underline underline-offset-2" href="/help/privacy">
                Privacy Policy
              </a>{" "}
              and{" "}
              <a className="font-bold text-white underline underline-offset-2" href="/help/terms">
                Terms of Use
              </a>
              .
            </p>

            {message ? (
              <p
                className={`rounded-[8px] px-4 py-3 text-sm leading-6 ${
                  status === "sent"
                    ? "bg-white text-[#315b18]"
                    : status === "fallback"
                      ? "bg-white text-[#6b4b08]"
                      : "bg-white text-[#8a241b]"
                }`}
              >
                {message}
              </p>
            ) : null}
          </div>
        </form>

        <aside className="relative flex min-h-[560px] overflow-hidden rounded-[8px] bg-[#8fd2f1] p-7">
          <div className="absolute inset-0 opacity-70" aria-hidden="true">
            <div className="absolute left-[8%] top-[12%] h-24 w-24 rounded-[8px] bg-[#2f7f3d] rotate-[-9deg]" />
            <div className="absolute left-[18%] top-[8%] h-24 w-24 rounded-[8px] bg-[#155aa0] rotate-[11deg]" />
            <div className="absolute right-[10%] top-[14%] h-28 w-28 rounded-[8px] bg-[#155aa0] rotate-[8deg]" />
            <div className="absolute right-[17%] top-[24%] h-20 w-20 rounded-[8px] bg-[#44a84b] rotate-[-15deg]" />
            <div className="absolute bottom-[18%] left-[14%] h-28 w-28 rounded-[8px] bg-[#155aa0] rotate-[7deg]" />
            <div className="absolute bottom-[9%] left-[26%] h-24 w-24 rounded-[8px] bg-[#44a84b] rotate-[-12deg]" />
            <div className="absolute bottom-[12%] right-[13%] h-32 w-32 rounded-[8px] bg-[#155aa0] rotate-[-7deg]" />
            <div className="absolute bottom-[27%] right-[22%] h-20 w-20 rounded-[8px] bg-[#44a84b] rotate-[13deg]" />
          </div>

          <div className="relative z-10 ml-auto flex max-w-[330px] flex-col justify-between">
            <div className="rounded-[8px] bg-white/90 p-5 shadow-[0_12px_36px_rgba(26,18,8,0.12)]">
              <img
                alt="Cerise Scholar helper"
                className="h-24 w-24 object-contain"
                src={HEDGEHOG.hedgehog06Clasped}
              />
              <h2 className="mt-3 text-xl font-black text-[#1a1208]">We read every note.</h2>
              <p className="mt-2 text-sm leading-6 text-[#6f6255]">
                The clearest reports include a page, what you expected, and what happened instead.
              </p>
            </div>

            <div className="rounded-[8px] bg-[#1a1208]/90 p-5 text-white shadow-[0_12px_36px_rgba(26,18,8,0.18)]">
              <h2 className="text-sm font-black">Before you send</h2>
              <ul className="mt-3 space-y-2 text-xs leading-5 text-white/72">
                {helpfulDetails.map((detail) => (
                  <li className="flex gap-2" key={detail}>
                    <span className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-[#f0b945]" />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs leading-5 text-white/64">
                Please do not send passwords, private source files, sensitive datasets, or
                authentication codes.
              </p>
              <a
                className="mt-4 inline-flex text-xs font-black text-white underline underline-offset-4"
                href="mailto:cerisescholar@gmail.com"
              >
                cerisescholar@gmail.com
              </a>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
