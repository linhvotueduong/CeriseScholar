"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import AppShell from "@/components/app-shell/AppShell";
import { AppIcon } from "@/components/app-shell/AppIcons";
import HelpCategoryCard from "@/components/app-ui/HelpCategoryCard";
import { AppPageFrame, HelpCenterLayoutGrid } from "@/components/app-ui/LayoutGrids";
import { allHelpQuestions, helpCategories } from "@/lib/help/articles";
import HEDGEHOG from "@/lib/hedgehog";
import styles from "./page.module.css";

const supportOptions: Array<{
  body: string;
  cta: string;
  href: string;
  title: string;
  tone: "rose" | "blue" | "green";
}> = [
  {
    title: "Report an issue",
    body: "Found a bug, setup problem, or confusing page? Send a short report with the details.",
    cta: "Report issue",
    href: "/help/contact?type=bug",
    tone: "rose",
  },
  {
    title: "Request a feature",
    body: "Want Cerise to support a new workflow, source type, or research habit? Share the idea.",
    cta: "Request feature",
    href: "/help/contact?type=feature",
    tone: "blue",
  },
  {
    title: "Ask Cerise Space",
    body: "Bring research workflow questions, setup notes, and study ideas to Cerise Space.",
    cta: "Open Cerise Space",
    href: "/dashboard/space",
    tone: "green",
  },
];

export default function HelpPage() {
  const [query, setQuery] = useState("");
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const visibleQuestions = useMemo(() => {
    const matches = allHelpQuestions.filter((item) =>
      `${item.category} ${item.question} ${item.answer}`.toLowerCase().includes(query.toLowerCase())
    );
    return expanded || query ? matches : matches.slice(0, 8);
  }, [expanded, query]);

  return (
    <AppShell contentClassName={styles.helpMain}>
      <AppPageFrame className={`${styles.helpFrame} max-w-[1380px] px-0`}>
        <div className={`${styles.helpHero} relative mb-[20px]`}>
          <header className={`${styles.helpHeroHeader} grid gap-3 xl:pr-[310px]`}>
            <div className="min-w-0 pl-[6px]">
              <p className="mb-[8px] text-[12px] font-[850] text-[#a87f4f]">Support</p>
              <h1 className="m-0 text-[31px] font-[850] leading-none tracking-[-0.03em] text-[#111111]">
                Help Center
              </h1>
              <p className="mt-[11px] max-w-[760px] text-[13px] font-[500] leading-[1.42] text-[#3b342e]">
                Find clear setup guidance, privacy answers, account help, and research workflow support
                in one place. Cerise is here to help you understand what to do next and get the support
                you need.
              </p>
            </div>
          </header>
          <div className={`${styles.helpOrbit} absolute right-[-14px] top-[2px] hidden h-[130px] w-[290px] items-center justify-center xl:flex`}>
            <HelpOrbitGraphic />
          </div>
        </div>

        <HelpCenterLayoutGrid className={styles.helpGrid}>
          <div className="min-w-0">
            <section className="mt-3.5">
              <h2 className="text-[18px] font-[850] leading-tight text-[#111111]">Browse by Category</h2>
              <div className={`${styles.categoryGrid} mt-2.5 grid gap-3 md:grid-cols-2 xl:grid-cols-5`}>
                {helpCategories.map((category) => (
                  <HelpCategoryCard
                    body={category.body}
                    href={`/help/articles/${category.slug}`}
                    key={category.slug}
                    label={category.title}
                    tone={category.tone}
                  />
                ))}
              </div>
            </section>

            <section className="mt-4">
              <h2 className="text-[18px] font-[850] leading-tight text-[#111111]">Popular Questions</h2>
              <div className="mt-2.5 overflow-hidden rounded-[12px] border border-[#e5e1dc] bg-white">
                <div className={`${styles.questionsGrid} grid lg:grid-cols-2`}>
                  {visibleQuestions.map((item) => {
                    const open = openQuestion === item.question;
                    return (
                      <button
                        className="min-h-[60px] border-b border-r-0 border-[#eeeae5] px-4 py-2.5 text-left lg:border-r"
                        key={item.question}
                        onClick={() => setOpenQuestion(open ? null : item.question)}
                        type="button"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className={`text-[10px] font-[850] uppercase tracking-normal ${categoryTone(item.category)}`}>
                              {item.category}
                            </p>
                            <p className="mt-1.5 text-[13px] font-[850] leading-snug text-[#111111]">{item.question}</p>
                          </div>
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#d8d3ce] text-[15px] font-semibold leading-none text-[#625a52]">
                            {open ? "-" : "+"}
                          </span>
                        </div>
                        {open ? <p className="mt-2 text-[12px] font-semibold leading-5 text-[#625a52]">{item.answer}</p> : null}
                      </button>
                    );
                  })}
                </div>
                {!query ? (
                  <button
                    className="w-full px-4 py-2.5 text-[13px] font-[850] text-[#111111]"
                    onClick={() => setExpanded((current) => !current)}
                    type="button"
                  >
                    {expanded ? "Show fewer questions" : "Show more questions"}
                  </button>
                ) : null}
              </div>
            </section>

            <section className="mt-4">
              <h2 className="text-[18px] font-[850] leading-tight text-[#111111]">Support Options</h2>
              <div className={`${styles.supportGrid} mt-3 grid gap-3 lg:grid-cols-3`}>
                {supportOptions.map((option) => (
                  <SupportOptionCard key={option.title} {...option} />
                ))}
              </div>
            </section>
          </div>

          <aside className={`${styles.helpAside} grid min-w-0 content-start gap-3 xl:pt-[54px]`}>
            <label className={`${styles.searchCard} relative -mt-1 block w-full`}>
              <AppIcon className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6f6760]" name="search" />
              <input
                className="h-9 w-full rounded-[8px] border border-[#d8d3ce] bg-white px-9 text-[11.5px] font-semibold text-[#111111] outline-none placeholder:text-[#8b8178]"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search help..."
                type="search"
                value={query}
              />
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-[6px] bg-[#f2f0ed] px-1.5 py-0.5 text-[10px] font-bold text-[#4f4842]">⌘K</span>
            </label>
            <article className={`${styles.needHelpCard} min-h-[276px] rounded-[12px] border border-[#e5e1dc] bg-white px-5 py-5`}>
              <div className="flex gap-2.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f4edff] text-[#8748d8]">
                  <AppIcon className="h-5 w-5" name="help" />
                </span>
                <div>
                  <h2 className="text-[15px] font-[850] leading-tight text-[#111111]">Still need help?</h2>
                  <p className="mt-1 text-[12px] font-semibold leading-[18px] text-[#625a52]">
                    Can&apos;t find the answer you&apos;re looking for? Our support team is here for you.
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-2">
                <Link className="rounded-[7px] bg-[#111111] px-4 py-2 text-center text-[12px] font-[850] text-white no-underline" href="/help/contact">
                  Open contact form
                </Link>
                <a className="rounded-[7px] border border-[#d8d3ce] px-4 py-2 text-center text-[12px] font-[850] text-[#111111] no-underline" href="mailto:cerisescholar@gmail.com">
                  Email Cerise
                </a>
                <Link className="rounded-[7px] border border-[#d8d3ce] bg-white px-4 py-2 text-center text-[12px] font-[850] text-[#111111] no-underline" href="/dashboard/space">
                  Chat with Cerise
                </Link>
              </div>
            </article>

            <article className={`${styles.policiesCard} rounded-[12px] border border-[#e5e1dc] bg-white px-4 py-4`}>
              <h2 className="text-[18px] font-[850] leading-tight text-[#111111]">Policies</h2>
              <p className="mt-2 text-[12px] font-semibold leading-[19px] text-[#625a52]">
                Important policies about your data, account, and using Cerise Scholar.
              </p>
              <div className="mt-3 grid gap-2">
                <PolicyLink href="/help/privacy" label="Privacy Policy" body="How we collect, use, and protect your data." />
                <PolicyLink href="/help/terms" label="Terms of Use" body="Rules and guidelines for using Cerise Scholar." />
              </div>
            </article>
          </aside>
        </HelpCenterLayoutGrid>
        <footer className={`${styles.helpFooter} mt-4 flex flex-wrap items-center justify-between gap-3 text-[12px] font-[550] text-[#7a7168]`}>
          <p>© 2025 Cerise Scholar. All rights reserved.</p>
          <nav className="flex items-center gap-[36px]" aria-label="Help Center footer">
            <Link className="text-[#4f4842] no-underline hover:text-[#111111]" href="/help/terms">
              Terms
            </Link>
            <Link className="text-[#4f4842] no-underline hover:text-[#111111]" href="/help/privacy">
              Privacy
            </Link>
            <Link className="text-[#4f4842] no-underline hover:text-[#111111]" href="/help">
              Help
            </Link>
          </nav>
        </footer>
      </AppPageFrame>
    </AppShell>
  );
}

function HelpOrbitGraphic() {
  return (
    <div aria-hidden="true" className="relative h-[130px] w-[210px] overflow-visible">
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes helpOrbitCW { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes helpOrbitCCW { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
          .help-orbit-inner { animation: helpOrbitCW 30s linear infinite; will-change: transform; }
          .help-orbit-middle { animation: helpOrbitCCW 50s linear infinite; will-change: transform; }
          .help-orbit-outer { animation: helpOrbitCW 75s linear infinite; will-change: transform; }
          .help-orbit-counter-inner { animation: helpOrbitCCW 30s linear infinite; }
          .help-orbit-counter-middle { animation: helpOrbitCW 50s linear infinite; }
          .help-orbit-counter-outer { animation: helpOrbitCCW 75s linear infinite; }
        }
      `}</style>
      <div className="absolute left-1/2 top-1/2 h-[260px] w-[280px] -translate-x-1/2 -translate-y-1/2 scale-[0.62] overflow-visible">
        <div className="absolute left-1/2 top-1/2 h-[220px] w-[220px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#e0d8d0]/40" />
        <div className="absolute left-1/2 top-1/2 h-[150px] w-[150px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#e0d8d0]/35" />
        <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#e0d8d0]/30" />

        <div className="absolute left-1/2 top-1/2 z-[1] flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[1.5px] border-[#e0d8d0]/50 bg-transparent text-[#f0b945]">
          <AppIcon className="h-[22px] w-[22px]" name="lightbulb" />
        </div>

        <div className="help-orbit-outer absolute left-1/2 top-1/2 h-0 w-0">
          <div className="absolute" style={{ transform: "rotate(-45deg) translateX(110px) translateY(-17px)" }}>
            <OrbitMascot
              counterClassName="help-orbit-counter-outer"
              counterTransform="rotate(45deg)"
              image={HEDGEHOG.hedgehog06Clasped}
              size={34}
            />
          </div>
          <div className="absolute" style={{ transform: "rotate(135deg) translateX(110px) translateY(-15px)" }}>
            <OrbitMascot
              counterClassName="help-orbit-counter-outer"
              counterTransform="rotate(-135deg)"
              image={HEDGEHOG.hedgehog05Laptop}
              size={30}
            />
          </div>
        </div>

        <div className="help-orbit-middle absolute left-1/2 top-1/2 h-0 w-0">
          <div className="absolute" style={{ transform: "rotate(210deg) translateX(75px) translateY(-14px)" }}>
            <OrbitMascot
              counterClassName="help-orbit-counter-middle"
              counterTransform="rotate(-210deg)"
              image={HEDGEHOG.hedgehog04RedPen}
              size={28}
            />
          </div>
          <div className="absolute" style={{ transform: "rotate(30deg) translateX(75px) translateY(-13px)" }}>
            <OrbitMascot
              counterClassName="help-orbit-counter-middle"
              counterTransform="rotate(-30deg)"
              image={HEDGEHOG.hedgehog02Writing}
              size={26}
            />
          </div>
        </div>

        <div className="help-orbit-inner absolute left-1/2 top-1/2 h-0 w-0">
          <div className="absolute" style={{ transform: "rotate(180deg) translateX(40px) translateY(-15px)" }}>
            <OrbitMascot
              badgeClassName="border-[#60a5fa] bg-[#dbeafe]"
              counterClassName="help-orbit-counter-inner"
              counterTransform="rotate(-180deg)"
              image={HEDGEHOG.hedgehog11LitBook}
              size={30}
            />
          </div>
          <div className="absolute" style={{ transform: "rotate(0deg) translateX(40px) translateY(-18px)" }}>
            <OrbitMascot
              badgeClassName="border-[#f0b945] bg-[#fef3c7]"
              counterClassName="help-orbit-counter-inner"
              counterTransform="rotate(0deg)"
              image={HEDGEHOG.hedgehog10Magnifier}
              size={36}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function OrbitMascot({
  badgeClassName = "border-[#e0d8d0] bg-white",
  counterClassName,
  counterTransform,
  image,
  size,
}: {
  badgeClassName?: string;
  counterClassName: string;
  counterTransform: string;
  image: string;
  size: number;
}) {
  return (
    <div className={counterClassName} style={{ height: size, width: size }}>
      <span
        className={`flex items-center justify-center overflow-hidden rounded-full border-2 shadow-[0_6px_16px_rgba(26,18,8,0.08)] ${badgeClassName}`}
        style={{ height: size, transform: counterTransform, width: size }}
      >
        <Image alt="" height={40} src={image} width={40} className="h-full w-full object-contain" />
      </span>
    </div>
  );
}

function SupportOptionCard({
  body,
  cta,
  href,
  title,
  tone,
}: {
  body: string;
  cta: string;
  href: string;
  title: string;
  tone: "rose" | "blue" | "green";
}) {
  const toneClass = {
    rose: "bg-[#fff1f3] text-[#e23b5d]",
    blue: "bg-[#eef4ff] text-[#315ad8]",
    green: "bg-[#ebf8f1] text-[#2e9b57]",
  }[tone];
  const iconName = title === "Report an issue" ? "bug" : title === "Request a feature" ? "lightbulb" : "users";

  return (
    <article className="grid min-h-[136px] grid-cols-[42px_minmax(0,1fr)] gap-3 rounded-[12px] border border-[#e5e1dc] bg-white px-3.5 py-3.5">
      <span className={`flex h-10 w-10 items-center justify-center rounded-full ${toneClass}`}>
        <AppIcon className="h-[18px] w-[18px]" name={iconName} />
      </span>
      <div className="min-w-0">
        <h3 className="text-[12.5px] font-[850] leading-tight text-[#111111]">{title}</h3>
        <p className="mt-1.5 text-[10.5px] font-semibold leading-[18px] text-[#6f6760]">{body}</p>
        <Link
          className="mt-2.5 inline-flex h-7 items-center rounded-[7px] border border-[#d8d3ce] bg-white px-3 text-[10.5px] font-[850] text-[#111111] no-underline"
          href={href}
        >
          {cta}
        </Link>
      </div>
    </article>
  );
}

function categoryTone(category: string) {
  const normalized = category.toLowerCase();
  if (normalized.includes("privacy")) return "text-[#2e9b57]";
  if (normalized.includes("agent")) return "text-[#315ad8]";
  if (normalized.includes("account")) return "text-[#8748d8]";
  if (normalized.includes("workflow") || normalized.includes("course") || normalized.includes("citation")) return "text-[#a46a16]";
  if (normalized.includes("beta") || normalized.includes("ai")) return "text-[#dd7a1a]";
  return "text-[#e23b5d]";
}

function PolicyLink({ body, href, label }: { body: string; href: string; label: string }) {
  return (
    <Link className="grid grid-cols-[36px_minmax(0,1fr)] gap-2.5 rounded-[10px] border border-[#eeeae5] p-3 text-[#111111] no-underline hover:bg-[#f7f5f2]" href={href}>
      <span className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-[#ebf8f1] text-[#2e9b57]">
        <AppIcon className="h-[17px] w-[17px]" name={label.includes("Privacy") ? "shield" : "file"} />
      </span>
      <span>
        <span className="text-[13px] font-[850]">{label}</span>
        <span className="mt-1 block text-[11px] font-semibold leading-[17px] text-[#625a52]">{body}</span>
        <span className="mt-1 block text-[11px] font-[850] underline underline-offset-2">Read document</span>
      </span>
    </Link>
  );
}
