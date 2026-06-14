import Link from "next/link";
import AppShell from "@/components/app-shell/AppShell";
import { AppIcon } from "@/components/app-shell/AppIcons";
import { AppPageFrame, PolicyPageTemplate } from "@/components/app-ui/LayoutGrids";
import HelpOnThisPageCard from "@/components/help/HelpOnThisPageCard";

type PolicyDocument = {
  intro: string;
  sections: Array<{ heading: string; body: string | string[] }>;
  title: string;
  updated: string;
};

function chunkSections(document: PolicyDocument) {
  const size = Math.ceil(document.sections.length / 3);
  return [0, 1, 2].map((index) => document.sections.slice(index * size, (index + 1) * size));
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function PolicyOption({
  active,
  body,
  href,
  icon,
  label,
  tone,
}: {
  active: boolean;
  body: string;
  href: string;
  icon: "file" | "lock";
  label: string;
  tone: "blue" | "green";
}) {
  const toneClass = tone === "green" ? "bg-[#ebf8f1] text-[#2e9b57]" : "bg-[#eef4ff] text-[#315ad8]";

  return (
    <Link
      className={`grid grid-cols-[34px_minmax(0,1fr)] gap-2.5 rounded-[9px] border p-2.5 text-[#17120d] no-underline transition hover:bg-[#f7f5f2] ${
        active
          ? "border-[#d7e9dd] bg-[#f6fbf8] shadow-[-3px_0_0_#2e9b57]"
          : "border-[#eeeae5] bg-white"
      }`}
      href={href}
    >
      <span className={`flex h-8 w-8 items-center justify-center rounded-[8px] ${toneClass}`}>
        <AppIcon className="h-4 w-4" name={icon} />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-bold leading-4">{label}</span>
        <span className="mt-0.5 block text-[10px] font-semibold leading-[14px] text-[#625a52]">{body}</span>
      </span>
    </Link>
  );
}

export default function PolicyArticlePage({
  document,
  pageNumber,
}: {
  document: PolicyDocument;
  pageNumber: number;
}) {
  const pages = chunkSections(document);
  const currentPage = Math.min(3, Math.max(1, pageNumber || 1));
  const sections = pages[currentPage - 1] || pages[0];
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < 3;
  const isPrivacyPolicy = document.title === "Privacy Policy";
  const onThisPageSections = sections.map((section) => ({
    id: slugify(section.heading),
    label: section.heading,
  }));

  return (
    <AppShell>
      <AppPageFrame>
        <div className="mb-7 text-[12px] font-semibold text-[#6f6760]">
          <Link className="text-[#625a52] no-underline" href="/help">
            Help Center
          </Link>{" "}
          <span className="px-2">&gt;</span> Policies <span className="px-2">&gt;</span> {document.title}
        </div>

        <PolicyPageTemplate>
          <article className="min-w-0">
            <header>
              <h1 className="text-[28px] font-bold leading-tight text-[#17120d]">{document.title}</h1>
              <p className="mt-2.5 text-[12px] font-semibold text-[#6f6760]">Updated {document.updated}</p>
              <p className="mt-2.5 text-[13px] font-semibold leading-5 text-[#17120d]">{document.intro}</p>
            </header>

            <div className="mt-5 space-y-4 pb-5">
              {sections.map((section) => (
                <section id={slugify(section.heading)} key={section.heading}>
                  <h2 className="text-[16px] font-bold text-[#17120d]">{section.heading}</h2>
                  <div className="mt-2 space-y-2">
                    {(Array.isArray(section.body) ? section.body : [section.body]).map((paragraph) => (
                      <p className="text-[13px] leading-[22px] text-[#3c352f]" key={paragraph}>
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <nav className="mt-2 grid min-h-[54px] grid-cols-[minmax(0,1fr)_minmax(0,1fr)] overflow-hidden rounded-[10px] border border-[#e5e1dc] bg-white">
              {hasPreviousPage ? (
                <Link
                  className="flex min-w-0 items-center gap-2 px-3 py-2.5 text-[#17120d] no-underline transition hover:bg-[#f7f5f2]"
                  href={`?page=${currentPage - 1}`}
                >
                  <AppIcon className="h-4 w-4 shrink-0" name="arrow-left" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold">Previous page</p>
                    <p className="truncate text-[10px] font-semibold text-[#625a52]">Page {currentPage - 1} of 3</p>
                  </div>
                </Link>
              ) : (
                <div className="flex min-w-0 items-center px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-[#17120d]">Current page</p>
                    <p className="truncate text-[10px] font-semibold text-[#625a52]">Page {currentPage} of 3</p>
                  </div>
                </div>
              )}
              {hasNextPage ? (
                <Link
                  className="flex min-w-0 items-center justify-end gap-2 px-3 py-2.5 text-right text-[#17120d] no-underline transition hover:bg-[#f7f5f2]"
                  href={`?page=${currentPage + 1}`}
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold">Next page</p>
                    <p className="truncate text-[10px] font-semibold text-[#625a52]">Page {currentPage + 1} of 3</p>
                  </div>
                  <AppIcon className="h-4 w-4 shrink-0" name="arrow-right" />
                </Link>
              ) : (
                <div className="flex min-w-0 items-center justify-end gap-2 px-3 py-2.5 text-right">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-[#17120d]">Last page</p>
                    <p className="truncate text-[10px] font-semibold text-[#625a52]">Page {currentPage} of 3</p>
                  </div>
                </div>
              )}
            </nav>
          </article>

          <aside className="mt-14 grid min-w-0 content-start gap-3 xl:fixed xl:left-[calc(216px+1.5rem+960px+2.75rem)] xl:top-[156px] xl:mt-0 xl:w-[260px]">
            <HelpOnThisPageCard enableScrollHighlight sections={onThisPageSections} />

            <article className="rounded-[12px] border border-[#e5e1dc] bg-white p-3.5">
              <h2 className="text-[14px] font-bold text-[#111111]">Policies</h2>
              <p className="mt-1.5 text-[11px] font-semibold leading-[16px] text-[#625a52]">
                Important policies about your data, account, and using Cerise Scholar.
              </p>
              <div className="mt-3 grid gap-2">
                <PolicyOption
                  active={isPrivacyPolicy}
                  body="How we collect, use, and protect your data."
                  href="/help/privacy"
                  icon="lock"
                  label="Privacy Policy"
                  tone="green"
                />
                <PolicyOption
                  active={!isPrivacyPolicy}
                  body="Rules and guidelines for using Cerise Scholar."
                  href="/help/terms"
                  icon="file"
                  label="Terms of Use"
                  tone="blue"
                />
              </div>
            </article>

            <article className="rounded-[12px] border border-[#e5e1dc] bg-white p-3.5">
              <div className="grid grid-cols-[38px_minmax(0,1fr)] gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f4edff] text-[#6b4cc2]">
                  <AppIcon className="h-5 w-5" name="phone" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-[14px] font-bold text-[#111111]">Need help?</h2>
                  <p className="mt-1 text-[11px] font-semibold leading-[16px] text-[#625a52]">
                    Can&apos;t find the answer you&apos;re looking for? Our support team is here for you.
                  </p>
                </div>
              </div>
              <Link
                className="mt-3 flex h-8 items-center justify-center gap-1.5 rounded-[8px] bg-[#111111] px-4 text-center text-[11px] font-bold text-white no-underline"
                href="/help/contact"
              >
                Open contact form
                <AppIcon className="h-3.5 w-3.5" name="external-link" />
              </Link>
              <a
                className="mt-2 flex h-8 items-center justify-center rounded-[8px] border border-[#d8d3ce] bg-white px-4 text-center text-[11px] font-bold text-[#111111] no-underline hover:bg-[#f7f5f2]"
                href="mailto:cerisescholar@gmail.com"
              >
                Email Cerise
              </a>
            </article>
          </aside>
        </PolicyPageTemplate>
      </AppPageFrame>
    </AppShell>
  );
}
