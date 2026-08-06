import type { Metadata } from "next";
import Link from "next/link";
import AppShell from "@/components/app-shell/AppShell";
import { AppPageFrame, ContactPageTemplate } from "@/components/app-ui/LayoutGrids";
import HelpContactForm from "@/components/help/HelpContactForm";
import { CERISE_COMMUNITY_URL } from "@/lib/community";

export const metadata: Metadata = {
  title: "Contact Us | Cerise Scholar",
  description: "Contact Cerise Scholar for setup help, bug reports, account support, feature ideas, and research workflow support.",
};

const quickCards = [
  ["Report an issue", "Bugs, setup errors, broken pages.", "/help/contact?type=bug"],
  ["Request a feature", "Suggest a new workflow or improvement.", "/help/contact?type=feature"],
  ["Account & access", "Sign-in, permissions, and beta access help.", "/help/contact?type=help"],
];

const beforeSendCards = [
  ["Email", "cerisescholar@gmail.com", "Best for private account or setup questions.", "mailto:cerisescholar@gmail.com"],
  ["Community", "Cerise Community", "Ask research workflow questions with other students on Reddit.", CERISE_COMMUNITY_URL],
  ["Safety", "No private files", "Do not send passwords, source files, datasets, or auth codes.", ""],
  ["Helpful context", "Page, device, result", "Tell us where it happened and what you expected.", ""],
];

export default async function ContactPage({
  searchParams,
}: {
  searchParams?: Promise<{ type?: string }>;
}) {
  const params = await searchParams;

  return (
    <AppShell>
      <AppPageFrame>
        <div className="mb-4 text-xs text-[#625a52]">
          <Link className="text-[#625a52] no-underline" href="/help">
            Help Center
          </Link>{" "}
          / Support / Contact Us
        </div>

        <header className="mb-4">
          <h1 className="text-[30px] font-bold leading-tight text-[#111111]">Contact Us</h1>
          <p className="mt-2 max-w-[720px] text-[13px] leading-5 text-[#625a52]">
            Reach our support team for setup questions, bug reports, account help, feature ideas, or
            research workflow support.
          </p>
        </header>

        <ContactPageTemplate>
          <div className="min-w-0">
            <div className="grid gap-3 md:grid-cols-3">
              {quickCards.map(([title, body, href]) => (
                <Link
                  className="grid rounded-[12px] border border-[#e5e1dc] bg-white p-3.5 text-[#111111] no-underline hover:bg-[#f7f5f2]"
                  href={href}
                  key={title}
                >
                  <span className="text-[13px] font-bold">{title}</span>
                  <span className="mt-2 text-xs leading-5 text-[#625a52]">{body}</span>
                  <span className="mt-4 justify-self-end text-[#625a52]">-&gt;</span>
                </Link>
              ))}
            </div>

            <section className="mt-4 rounded-[12px] border border-[#e5e1dc] bg-white p-3.5">
              <h2 className="text-lg font-bold text-[#111111]">Before you send</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {beforeSendCards.map(([label, title, body, href]) => {
                  const card = (
                    <div className="rounded-[10px] border border-[#eeeae5] p-3">
                      <p className="text-xs font-bold uppercase tracking-normal text-[#a87f4f]">{label}</p>
                      <h3 className="mt-2 text-[13px] font-bold text-[#111111]">{title}</h3>
                      <p className="mt-2 text-xs leading-5 text-[#625a52]">{body}</p>
                    </div>
                  );
                  return href?.startsWith("http") ? (
                    <a
                      className="text-[#111111] no-underline"
                      href={href}
                      key={label}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {card}
                    </a>
                  ) : href ? (
                    <Link className="text-[#111111] no-underline" href={href} key={label}>
                      {card}
                    </Link>
                  ) : (
                    <div key={label}>{card}</div>
                  );
                })}
              </div>
            </section>

            <div className="mt-4">
              <HelpContactForm defaultRequestType={params?.type} />
            </div>
          </div>

          <aside className="grid min-w-0 content-start gap-3">
            <SideCard title="Need help fast?">
              <p className="text-sm leading-6 text-[#625a52]">Reach our team using the options below.</p>
              <div className="mt-4 grid gap-3">
                <Link className="rounded-[8px] bg-[#111111] px-4 py-2.5 text-center text-xs font-bold text-white no-underline" href="#contact-form">
                  Open contact form
                </Link>
                <a className="rounded-[8px] border border-[#d8d3ce] px-4 py-2.5 text-center text-xs font-bold text-[#111111] no-underline" href="mailto:cerisescholar@gmail.com">
                  Email Cerise
                </a>
              </div>
            </SideCard>

            <SideCard title="Response times">
              <Response label="General help" value="within 1-2 business days" />
              <Response label="Account access" value="within 1 business day" />
              <Response label="Urgent bugs" value="prioritized during beta" />
            </SideCard>

            <SideCard title="Useful links">
              <UsefulLink href="/help/privacy" label="Privacy Policy" />
              <UsefulLink href="/help/terms" label="Terms of Use" />
              <UsefulLink href="/help/articles/ai-setup" label="AI Setup" />
              <UsefulLink href="/help/articles/research-workflow" label="Research Workflow" />
            </SideCard>

            <SideCard title="Other support options">
              <UsefulLink href="/help/contact?type=bug" label="Report issue" />
              <UsefulLink href="/help/contact?type=feature" label="Request feature" />
              <UsefulLink href={CERISE_COMMUNITY_URL} label="Open Cerise Community ↗" />
            </SideCard>
          </aside>
        </ContactPageTemplate>
      </AppPageFrame>
    </AppShell>
  );
}

function SideCard({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <article className="rounded-[12px] border border-[#e5e1dc] bg-white p-3.5">
      <h2 className="text-base font-bold text-[#111111]">{title}</h2>
      <div className="mt-3">{children}</div>
    </article>
  );
}

function Response({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-[#eeeae5] py-3 first:border-t-0">
      <p className="text-[13px] font-bold text-[#111111]">{label}</p>
      <p className="mt-1 text-xs text-[#625a52]">{value}</p>
    </div>
  );
}

function UsefulLink({ href, label }: { href: string; label: string }) {
  const className = "flex items-center justify-between border-t border-[#eeeae5] py-2.5 text-[13px] font-semibold text-[#111111] no-underline first:border-t-0";
  const content = (
    <>
      {label}
      <span className="text-[#625a52]">-&gt;</span>
    </>
  );

  if (href.startsWith("http")) {
    return (
      <a className={className} href={href} rel="noopener noreferrer" target="_blank">
        {content}
      </a>
    );
  }

  return (
    <Link className={className} href={href}>
      {content}
    </Link>
  );
}
