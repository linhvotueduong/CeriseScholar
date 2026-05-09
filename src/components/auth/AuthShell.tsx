/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellProps = {
  children: ReactNode;
  eyebrow: string;
  mode: "login" | "signup";
  subtitle: string;
  title: string;
};

const panelCopy = {
  login: {
    eyebrow: "Welcome back",
    title: "Return to your research workspace",
    body:
      "Pick up your notes, projects, and scholar questions from a quiet place built for steady research work.",
  },
  signup: {
    eyebrow: "Public beta",
    title: "Begin your scholar journey",
    body:
      "Create your account to begin building, organizing, and advancing your research with Cerise Scholar.",
  },
};

const panelHighlights = ["Private workspace", "AI research support", "Laptop-first workflow"];

export default function AuthShell({ children, eyebrow, mode, subtitle, title }: AuthShellProps) {
  const copy = panelCopy[mode];
  const contentWidth = mode === "signup" ? "max-w-[520px]" : "max-w-[390px]";

  return (
    <main className="min-h-screen bg-[#f7f3ed] px-0 py-0 text-[#1a1208] md:flex md:items-center md:justify-center md:px-6 md:py-6 lg:px-8">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl overflow-hidden bg-white md:min-h-[660px] md:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.9fr)] md:rounded-[24px] md:shadow-[0_24px_70px_rgba(26,18,8,0.08)] xl:min-h-[700px] xl:grid-cols-[minmax(0,0.98fr)_minmax(390px,0.9fr)]">
        <aside className="relative hidden min-h-[660px] overflow-hidden bg-[#faf7f0] md:flex md:flex-col xl:min-h-[700px]">
          <div className="relative z-10 flex items-center justify-between px-7 py-6 xl:px-8 xl:py-7">
            <Link className="font-display text-2xl text-[#1a1208] no-underline" href="/">
              Cerise Scholar
            </Link>
            <span className="rounded-full border border-[#d4cdc5] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#c0392b]">
              Beta
            </span>
          </div>

          <div className="relative z-10 max-w-lg px-7 pt-2 xl:px-8 xl:pt-3">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c0392b]">{copy.eyebrow}</p>
            <h2 className="mt-4 max-w-[420px] font-display text-4xl font-normal leading-[1] tracking-normal text-[#1a1208] xl:text-[44px]">
              {copy.title}
            </h2>
            <p className="mt-5 max-w-[390px] text-sm leading-7 text-[#7a6a5a]">{copy.body}</p>
          </div>

          <div className="relative z-10 mt-auto min-h-[230px] px-6 pb-6 xl:min-h-[270px] xl:px-8 xl:pb-7">
            <div className="absolute bottom-[-145px] left-[-90px] h-[345px] w-[345px] rounded-full border border-[#eadfd3] bg-white/70" />
            <div className="absolute bottom-[42px] right-8 h-px w-28 bg-[#d4cdc5]" />
            <div className="absolute bottom-[64px] right-14 h-px w-20 bg-[#d4cdc5]" />
            <img
              alt="Cerise Scholar character working on research"
              className="absolute bottom-6 left-1/2 h-auto w-[180px] -translate-x-1/2 drop-shadow-[0_18px_26px_rgba(26,18,8,0.14)] xl:bottom-7 xl:w-[210px]"
              src="/assets/hedgehogs/hedgehog05Laptop.png"
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

        <div className="flex min-h-screen flex-col bg-white md:min-h-[660px] xl:min-h-[700px]">
          <div className="flex items-center justify-between border-b border-[#e0d8d0] px-5 py-4 md:hidden">
            <Link className="font-display text-xl text-[#1a1208] no-underline" href="/">
              Cerise Scholar
            </Link>
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#c0392b]">Beta</span>
          </div>

          <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8 lg:px-8 xl:px-10">
            <div className={`w-full ${contentWidth}`}>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#c0392b]">{eyebrow}</p>
              <h1 className="mt-3 font-display text-[34px] font-normal leading-tight tracking-normal text-[#1a1208]">
                {title}
              </h1>
              <p className="mt-3 text-sm leading-6 text-[#7a6a5a]">{subtitle}</p>
              <div className="mt-8">{children}</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
