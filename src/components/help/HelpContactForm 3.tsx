"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useState } from "react";

type ContactStatus = "idle" | "sending" | "sent" | "fallback" | "error";

type ContactResponse = {
  error?: string;
  mailto?: string;
  ok?: boolean;
  status?: string;
};

const requestTypes = [
  { label: "Help", value: "help" },
  { label: "Bug", value: "bug" },
  { label: "Feature", value: "feature" },
  { label: "Improve", value: "improvement" },
];

const helpfulDetails = ["Request type", "Page or feature", "What you tried", "What you expected"];
const panelHighlights = ["Support request", "Feature ideas", "Community feedback"];

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
    "mt-2 h-11 w-full rounded-[8px] border border-[#d4cdc5] bg-white px-3 text-sm text-[#1a1208] outline-none transition placeholder:text-[#9a8a7a] focus:border-[#1a1208] focus:ring-2 focus:ring-[#1a1208]/10";
  const labelClass = "text-xs font-semibold text-[#5f5248]";

  return (
    <section
      className="mx-auto overflow-hidden rounded-[24px] bg-white shadow-[0_24px_70px_rgba(26,18,8,0.08)] md:grid md:min-h-[700px] md:grid-cols-[minmax(0,0.95fr)_minmax(390px,0.9fr)]"
      id="contact-support"
    >
      <aside className="relative hidden min-h-[700px] overflow-hidden bg-[#faf7f0] md:flex md:flex-col">
        <div className="relative z-10 flex items-center justify-between px-7 py-6 xl:px-8 xl:py-7">
          <Link className="font-display text-2xl text-[#1a1208] no-underline" href="/">
            Cerise Scholar
          </Link>
          <span className="rounded-full border border-[#d4cdc5] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#c0392b]">
            Beta
          </span>
        </div>

        <div className="relative z-10 max-w-lg px-7 pt-2 xl:px-8 xl:pt-3">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c0392b]">Support</p>
          <h2 className="mt-4 max-w-[430px] font-display text-4xl font-normal leading-[1] tracking-normal text-[#1a1208] xl:text-[44px]">
            Get in touch with Cerise Scholar
          </h2>
          <p className="mt-5 max-w-[390px] text-sm leading-7 text-[#7a6a5a]">
            Tell us what happened, what you need, or what would make Cerise better. We read every
            note and use clear reports to improve the beta.
          </p>
        </div>

        <div className="relative z-10 mt-7 mx-7 rounded-[12px] border border-[#e0d8d0] bg-white/70 p-5 xl:mx-8">
          <h3 className="text-sm font-black text-[#1a1208]">Helpful details</h3>
          <ul className="mt-3 grid gap-2 text-xs leading-5 text-[#7a6a5a]">
            {helpfulDetails.map((detail) => (
              <li className="flex gap-2" key={detail}>
                <span className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-[#c0392b]" />
                <span>{detail}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-5 text-[#7a6a5a]">
            Please do not send passwords, private source files, sensitive datasets, or
            authentication codes.
          </p>
        </div>

        <div className="relative z-10 mt-auto min-h-[230px] px-6 pb-6 xl:min-h-[270px] xl:px-8 xl:pb-7">
          <div className="absolute bottom-[-145px] left-[-90px] h-[345px] w-[345px] rounded-full border border-[#eadfd3] bg-white/70" />
          <div className="absolute bottom-[42px] right-8 h-px w-28 bg-[#d4cdc5]" />
          <div className="absolute bottom-[64px] right-14 h-px w-20 bg-[#d4cdc5]" />
          <img
            alt="Cerise Scholar helper"
            className="absolute bottom-6 left-1/2 h-auto w-[190px] -translate-x-1/2 drop-shadow-[0_18px_26px_rgba(26,18,8,0.14)] xl:bottom-7 xl:w-[220px]"
            src="/assets/hedgehogs/hedgehog06Clasped.png"
          />
        </div>

        <div className="relative z-10 grid grid-cols-3 border-t border-[#e0d8d0] bg-white/70">
          {panelHighlights.map((item) => (
            <div className="border-r border-[#e0d8d0] px-5 py-4 last:border-r-0" key={item}>
              <p className="text-xs font-semibold leading-5 text-[#5f5248]">{item}</p>
            </div>
          ))}
        </div>
      </aside>

      <div className="flex min-h-[700px] flex-col bg-white">
        <div className="flex items-center justify-between border-b border-[#e0d8d0] px-5 py-4 md:hidden">
          <Link className="font-display text-xl text-[#1a1208] no-underline" href="/">
            Cerise Scholar
          </Link>
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#c0392b]">Beta</span>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8 lg:px-8 xl:px-10">
          <form className="w-full max-w-[520px]" onSubmit={handleSubmit}>
            <div className="hidden">
              <label htmlFor="contact-website">Website</label>
              <input autoComplete="off" id="contact-website" name="website" tabIndex={-1} type="text" />
            </div>

            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#c0392b]">
              Public laptop beta
            </p>
            <h1 className="mt-3 font-display text-[34px] font-normal leading-tight tracking-normal text-[#1a1208]">
              Ask for help or send an idea
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#7a6a5a]">
              Send setup questions, bug reports, feature ideas, or small polish notes.
            </p>

            <div className="mt-8 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
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

              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className={labelClass}>Request type</span>
                  <select
                    className={inputClass}
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
                  className="mt-2 min-h-[118px] w-full resize-y rounded-[8px] border border-[#d4cdc5] bg-white px-3 py-3 text-sm leading-6 text-[#1a1208] outline-none transition placeholder:text-[#9a8a7a] focus:border-[#1a1208] focus:ring-2 focus:ring-[#1a1208]/10"
                  maxLength={4000}
                  name="message"
                  placeholder="What happened, what did you expect, and what did you already try?"
                  required
                />
              </label>

              <button
                className="inline-flex h-12 w-full items-center justify-center rounded-[8px] bg-[#1a1208] px-7 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={status === "sending"}
                type="submit"
              >
                {status === "sending" ? "Sending..." : "Continue"}
              </button>

              {fallbackMailto ? (
                <a
                  className="inline-flex h-11 w-full items-center justify-center rounded-[8px] border border-[#d4cdc5] bg-[#faf7f0] px-6 text-sm font-black text-[#1a1208] no-underline transition hover:bg-white"
                  href={fallbackMailto}
                >
                  Open email
                </a>
              ) : null}

              <p className="text-[11px] leading-5 text-[#7a6a5a]">
                By sending this form, you agree that Cerise Scholar may use your message and reply
                email to respond to your request. See the{" "}
                <a className="font-bold text-[#1a1208] underline underline-offset-2" href="/help/privacy">
                  Privacy Policy
                </a>{" "}
                and{" "}
                <a className="font-bold text-[#1a1208] underline underline-offset-2" href="/help/terms">
                  Terms of Use
                </a>
                .
              </p>

              {message ? (
                <p
                  className={`rounded-[8px] border px-4 py-3 text-sm leading-6 ${
                    status === "sent"
                      ? "border-[#cfe5c8] bg-[#edf7e7] text-[#315b18]"
                      : status === "fallback"
                        ? "border-[#efdfae] bg-[#fff8e6] text-[#6b4b08]"
                        : "border-[#efc7c1] bg-[#fbebe8] text-[#8a241b]"
                  }`}
                >
                  {message}
                </p>
              ) : null}
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
