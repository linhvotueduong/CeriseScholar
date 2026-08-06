import Link from "next/link";
import { AppIcon } from "@/components/app-shell/AppIcons";
import SettingsPanel from "@/components/app-ui/SettingsPanel";

export default function HelpSupportSettingsPage() {
  return (
    <SettingsPanel
      className="h-[800px] min-h-[800px] max-h-[800px] pb-10"
      title="Help & Support"
      description="Get help, contact support, and access resources."
    >
      <section className="flex h-[674px] flex-col gap-4">
        <SupportBlock
          action={<LinkButton href="/help">Visit Help Center</LinkButton>}
          columns={3}
          title="Help Center"
          subtitle="Find guides, tutorials, and answers to common questions."
        >
          <Feature icon="book-open" title="Guides & Tutorials" body="Step-by-step guides to help you get started." />
          <Feature icon="help" title="FAQs" body="Find answers to frequently asked questions." />
          <Feature icon="play" title="Video Tutorials" body="Watch short videos to learn key features." />
        </SupportBlock>

        <SupportBlock
          action={<LinkButton href="/help/contact">New Support Ticket</LinkButton>}
          columns={2}
          framed
          title="Contact Support"
          subtitle="Need additional help? Our support team is here for you."
        >
          <Feature icon="mail" title="Email Support" body="cerisescholar@gmail.com. We typically reply within 24 hours." />
          <Feature icon="trophy" title="Priority Support" body="Faster response times for future paid plans." />
        </SupportBlock>

        <article className="flex min-h-[108px] items-center rounded-[12px] border border-[#e5e1dc] bg-white p-5">
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-[13px] font-bold text-[#17120d]">Feedback</h3>
              <p className="mt-1 text-[10px] leading-3.5 text-[#6f6760]">Help us improve Cerise Scholar by sharing your feedback.</p>
            </div>
            <LinkButton href="/help/contact?type=feature">Send Feedback</LinkButton>
          </div>
        </article>
      </section>
    </SettingsPanel>
  );
}

const gridColsClass: Record<2 | 3 | 4, string> = {
  2: "grid gap-3 md:grid-cols-2",
  3: "grid gap-3 md:grid-cols-3",
  4: "grid gap-3 md:grid-cols-4",
};

function SupportBlock({
  action,
  children,
  columns = 4,
  framed = false,
  subtitle,
  title,
}: {
  action: React.ReactNode;
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  framed?: boolean;
  subtitle: string;
  title: string;
}) {
  return (
    <article className={`flex ${framed ? "min-h-[210px]" : "min-h-[182px]"} flex-col rounded-[12px] border border-[#e5e1dc] bg-white p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-2.5">
        <div>
          <h3 className="text-[15px] font-bold text-[#17120d]">{title}</h3>
          <p className="mt-1.5 text-[12px] text-[#6f6760]">{subtitle}</p>
        </div>
        {action}
      </div>
      <div className={framed ? "mt-5 rounded-[10px] border border-[#e5e1dc] p-4" : "mt-7"}>
        <div className={gridColsClass[columns]}>{children}</div>
      </div>
    </article>
  );
}

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-[#d8d3ce] px-5 text-[12px] font-bold text-[#111111] no-underline" href={href}>
      {children}
      <AppIcon className="h-4 w-4" name="external-link" />
    </Link>
  );
}

function Feature({ body, icon, title }: { body: string; icon: "book-open" | "help" | "play" | "file" | "mail" | "users" | "trophy"; title: string }) {
  return (
    <div className="grid min-h-[66px] grid-cols-[30px_1fr] gap-3 border-[#e5e1dc] md:border-r md:pr-5 md:last:border-r-0">
      <AppIcon className="h-7 w-7 text-[#17120d]" name={icon} />
      <div>
        <p className="text-[12px] font-bold text-[#17120d]">{title}</p>
        <p className="mt-1 text-[11px] leading-4 text-[#6f6760]">{body}</p>
      </div>
    </div>
  );
}
