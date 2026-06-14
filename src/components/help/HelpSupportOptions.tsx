import Link from "next/link";

const supportCards = [
  {
    title: "Issues",
    body: "Found a bug, setup problem, or confusing page? Send a short report with the place it happened.",
    cta: "Report issue",
    href: "/help/contact?type=bug",
  },
  {
    title: "Feature requests",
    body: "Want Cerise to support a new workflow, source type, or research habit? Share the idea.",
    cta: "Request feature",
    href: "/help/contact?type=feature",
  },
  {
    title: "Ask the community",
    body: "Bring research workflow questions, setup notes, and study ideas to Cerise Space.",
    cta: "Open Cerise Space",
    href: "/dashboard/space",
  },
];

export default function HelpSupportOptions() {
  return (
    <section className="mt-8 rounded-[8px] border border-[#d4cdc5] bg-white p-5 shadow-[0_14px_34px_rgba(26,18,8,0.045)]">
      <div className="grid gap-4 md:grid-cols-3">
        {supportCards.map((card) => (
          <article
            className="rounded-[8px] border border-[#d4cdc5] bg-[#fffefa] p-4 transition-transform hover:-translate-y-0.5"
            key={card.title}
          >
            <h2 className="text-sm font-black tracking-normal text-[#1a1208]">{card.title}</h2>
            <p className="mt-3 min-h-[54px] text-xs leading-5 text-[#7a6a5a]">{card.body}</p>
            <Link
              className="mt-5 inline-flex h-7 items-center rounded-full border border-[#d4cdc5] bg-[#faf7f0] px-3 text-[11px] font-black text-[#1a1208] no-underline transition hover:bg-[#1a1208] hover:text-white"
              href={card.href}
            >
              {card.cta}
            </Link>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-4 rounded-[8px] border border-[#e0d8d0] bg-[#faf7f0] p-4 md:grid-cols-[1fr_1.1fr] md:items-center">
        <div>
          <h2 className="text-base font-black tracking-normal text-[#1a1208]">
            Can&apos;t find what you&apos;re looking for?
          </h2>
          <p className="mt-2 text-xs leading-5 text-[#7a6a5a]">
            Send a direct support request and include the page, device, and what you expected.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 md:justify-end">
          <Link
            className="inline-flex h-8 items-center rounded-full bg-[#1a1208] px-4 text-[11px] font-black text-white no-underline transition hover:opacity-85"
            href="/help/contact"
          >
            Open contact form
          </Link>
          <a
            className="inline-flex h-8 items-center rounded-full border border-[#d4cdc5] bg-white px-4 text-[11px] font-black text-[#1a1208] no-underline transition hover:bg-[#fffefa]"
            href="mailto:cerisescholar@gmail.com"
          >
            Email Cerise
          </a>
        </div>
      </div>
    </section>
  );
}
