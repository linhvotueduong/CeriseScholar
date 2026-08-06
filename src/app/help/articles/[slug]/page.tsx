import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AppShell from "@/components/app-shell/AppShell";
import { AppIcon } from "@/components/app-shell/AppIcons";
import { AppPageFrame, HelpArticlePageTemplate } from "@/components/app-ui/LayoutGrids";
import HelpOnThisPageCard from "@/components/help/HelpOnThisPageCard";
import { helpArticles, type HelpArticleSlug } from "@/lib/help/articles";

type ArticlePageProps = {
  params: Promise<{ slug: string }>;
};

const helpArticleOrder = Object.keys(helpArticles) as HelpArticleSlug[];

function sectionId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export async function generateStaticParams() {
  return helpArticleOrder.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = helpArticles[slug as HelpArticleSlug];
  return {
    title: article ? `${article.title} | Cerise Scholar Help` : "Help Article | Cerise Scholar",
  };
}

function ArticlePreview({ article, slug }: { article: (typeof helpArticles)[HelpArticleSlug]; slug: HelpArticleSlug }) {
  const iconName =
    slug === "getting-started"
      ? "play"
      : slug === "ai-setup"
        ? "dashboard"
        : slug === "privacy-protection"
          ? "shield"
          : slug === "account-access"
            ? "user"
            : "workflow";
  const tone =
    slug === "privacy-protection"
      ? "bg-[#eef8ed] text-[#23651d]"
      : slug === "account-access"
        ? "bg-[#f4edff] text-[#6840a0]"
        : slug === "research-workflow"
          ? "bg-[#fff8e8] text-[#8a5b10]"
          : "bg-[#f4edff] text-[#6b4cc2]";

  return (
    <div className="rounded-[10px] border border-[#e5e1dc] bg-gradient-to-br from-[#fbf9ff] via-white to-[#fbfaf8] px-3.5 py-3">
      <div className="flex items-start gap-2.5">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${tone}`}>
          <AppIcon className="h-4 w-4" name={iconName} />
        </span>
        <div>
          <p className="text-[13px] font-bold text-[#17120d]">{article.previewLabel}</p>
          <p className="text-[11px] font-semibold leading-[16px] text-[#6f6760]">
            {article.previewTitle}
          </p>
        </div>
      </div>
      <div className="mt-2.5 grid gap-0 overflow-hidden rounded-[10px] border border-[#eeeae5] bg-white md:grid-cols-5">
        {article.previewItems.map((item, index) => (
          <div className="flex min-h-[46px] items-center gap-2 border-b border-r border-[#eeeae5] px-3 py-1 last:border-r-0 md:border-b-0" key={item}>
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${tone}`}>
              {index + 1}
            </span>
            <p className="text-[11px] font-bold leading-[15px] text-[#17120d]">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function HelpArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = helpArticles[slug as HelpArticleSlug];
  if (!article) notFound();
  const currentSlug = slug as HelpArticleSlug;
  const currentIndex = helpArticleOrder.indexOf(currentSlug);
  const previousSlug = helpArticleOrder[currentIndex - 1];
  const previousArticle = previousSlug ? helpArticles[previousSlug] : null;
  const nextSlug = helpArticleOrder[currentIndex + 1];
  const nextArticle = nextSlug ? helpArticles[nextSlug] : null;
  const onThisPageSections = article.sections.map((section) => ({
    id: sectionId(section.heading),
    label: section.heading,
  }));

  return (
    <AppShell>
      <AppPageFrame>
        <div className="mb-7 text-[12px] font-semibold text-[#6f6760]">
          <Link className="text-[#625a52] no-underline" href="/help">
            Help Center
          </Link>{" "}
          <span className="px-2">&gt;</span> Browse by Category <span className="px-2">&gt;</span> {article.category}
        </div>

        <HelpArticlePageTemplate>
          <article className="min-w-0">
            <header>
              <h1 className="text-[28px] font-bold leading-tight text-[#17120d]">
                {article.title}
              </h1>
              <p className="mt-2.5 text-[12px] font-semibold text-[#6f6760]">Updated {article.updated}</p>
              <p className="mt-2.5 text-[13px] font-semibold leading-5 text-[#17120d]">{article.intro}</p>
            </header>

            <div className="mt-3.5">
              <ArticlePreview article={article} slug={slug as HelpArticleSlug} />
            </div>

            <div className="mt-4 space-y-4 pb-5">
              {article.sections.map((section, index) => (
                <section id={sectionId(section.heading)} key={section.heading}>
                  <h2 className="text-[16px] font-bold text-[#17120d]">
                    {index + 1}. {section.heading}
                  </h2>
                  <p className="mt-2 text-[13px] leading-[22px] text-[#3c352f]">{section.body}</p>
                </section>
              ))}
            </div>

            <nav className="mt-2 grid min-h-[54px] grid-cols-[minmax(0,1fr)_minmax(0,1fr)] overflow-hidden rounded-[10px] border border-[#e5e1dc] bg-white">
              {previousArticle ? (
                <Link
                  className="flex min-w-0 items-center gap-2 px-3 py-2.5 text-[#17120d] no-underline transition hover:bg-[#f7f5f2]"
                  href={`/help/articles/${previousSlug}`}
                >
                  <AppIcon className="h-4 w-4 shrink-0" name="arrow-left" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold">Previous article</p>
                    <p className="truncate text-[10px] font-semibold text-[#625a52]">{previousArticle.title}</p>
                  </div>
                </Link>
              ) : (
                <div className="flex min-w-0 items-center px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-[#17120d]">Current article</p>
                    <p className="truncate text-[10px] font-semibold text-[#625a52]">{article.title}</p>
                  </div>
                </div>
              )}
              {nextArticle ? (
                <Link
                  className="flex min-w-0 items-center justify-end gap-2 px-3 py-2.5 text-right text-[#17120d] no-underline transition hover:bg-[#f7f5f2]"
                  href={`/help/articles/${nextSlug}`}
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold">Next article</p>
                    <p className="truncate text-[10px] font-semibold text-[#625a52]">{nextArticle.title}</p>
                  </div>
                  <AppIcon className="h-4 w-4 shrink-0" name="arrow-right" />
                </Link>
              ) : (
                <div className="flex min-w-0 items-center justify-end gap-2 px-3 py-2.5 text-right">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-[#17120d]">Last article</p>
                    <p className="truncate text-[10px] font-semibold text-[#625a52]">{article.title}</p>
                  </div>
                </div>
              )}
            </nav>
          </article>

          <aside className="mt-14 grid min-w-0 content-start gap-3 xl:fixed xl:left-[calc(216px+1.5rem+960px+2.75rem)] xl:top-[156px] xl:mt-0 xl:w-[260px]">
            <HelpOnThisPageCard sections={onThisPageSections} showBackLink={false} />

            <article className="rounded-[12px] border border-[#e5e1dc] bg-white p-3.5">
              <h2 className="text-[14px] font-bold text-[#111111]">Related articles</h2>
              <div className="mt-2.5 grid gap-1">
                {article.related.map((relatedSlug) => {
                  const related = helpArticles[relatedSlug as HelpArticleSlug];
                  return (
                    <Link
                      className="flex items-start gap-2 rounded-[8px] px-1.5 py-1 text-[11px] font-bold leading-4 text-[#17120d] no-underline hover:bg-[#f7f5f2]"
                      href={`/help/articles/${relatedSlug}`}
                      key={relatedSlug}
                    >
                      <AppIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#6f6760]" name="file" />
                      {related.title}
                    </Link>
                  );
                })}
              </div>
            </article>

            <article className="rounded-[12px] border border-[#e5e1dc] bg-white p-3.5">
              <h2 className="text-[14px] font-bold text-[#111111]">Still need help?</h2>
              <p className="mt-1.5 text-[12px] leading-[18px] text-[#625a52]">
                Send the page, device, and result so support can understand the issue quickly.
              </p>
              <Link className="mt-2.5 block rounded-[8px] bg-[#111111] px-4 py-2 text-center text-xs font-bold text-white no-underline" href="/help/contact">
                Contact support
              </Link>
            </article>

            <article className="rounded-[10px] border border-[#e5e1dc] bg-white p-2.5">
              <p className="text-[12px] font-bold text-[#111111]">Was this helpful?</p>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <button
                  aria-label="This article was helpful"
                  className="flex h-7 items-center justify-center rounded-[8px] border border-[#d8d3ce] text-[#17120d] transition hover:bg-[#f7f5f2]"
                  type="button"
                >
                  <AppIcon className="h-4 w-4" name="thumb-up" />
                </button>
                <button
                  aria-label="This article was not helpful"
                  className="flex h-7 items-center justify-center rounded-[8px] border border-[#d8d3ce] text-[#17120d] transition hover:bg-[#f7f5f2]"
                  type="button"
                >
                  <AppIcon className="h-4 w-4" name="thumb-down" />
                </button>
              </div>
            </article>
          </aside>
        </HelpArticlePageTemplate>
      </AppPageFrame>
    </AppShell>
  );
}
