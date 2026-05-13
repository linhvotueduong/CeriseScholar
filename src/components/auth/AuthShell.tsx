"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { PointerEvent, ReactNode, TouchEvent } from "react";
import { useEffect, useState } from "react";
import MobileOrbitBackdrop from "@/components/mobile/MobileOrbitBackdrop";

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

const AUTH_SHEET_DRAG_ENABLED = process.env.NODE_ENV !== "production";
const mobileSheetStoragePrefix = "cerise_mobile_auth_sheet_height";
const mobileSheetHeightLimits = {
  min: 38,
  max: 51,
};

// Tuning note: larger values make the bottom card taller and move its top edge higher.
// Smaller values make the card shorter and move it lower.
const mobileSheetDefaultHeight = {
  login: 46,
  signup: 46,
} satisfies Record<AuthShellProps["mode"], number>;

function clampMobileSheetHeight(height: number) {
  return Math.min(mobileSheetHeightLimits.max, Math.max(mobileSheetHeightLimits.min, Math.round(height)));
}

const mobileCopy = {
  login: {
    title: "Welcome back",
    body:
      "Sign in here for lighter review. When you are ready for local files and laptop AI, continue from your trusted laptop.",
  },
  signup: {
    title: "Get Started",
    body:
      "Create your account to begin building, organizing, and advancing your research with Cerise Scholar.",
  },
};

export default function AuthShell({ children, eyebrow, mode, subtitle, title }: AuthShellProps) {
  const copy = panelCopy[mode];
  const mobile = mobileCopy[mode];
  const contentWidth = mode === "signup" ? "max-w-[520px]" : "max-w-[390px]";
  const [mobileSheetHeight, setMobileSheetHeight] = useState(mobileSheetDefaultHeight[mode]);
  const [showSheetTuner, setShowSheetTuner] = useState(false);

  useEffect(() => {
    if (!AUTH_SHEET_DRAG_ENABLED) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const searchParams = new URLSearchParams(window.location.search);
      const requestedHeight = Number(searchParams.get("sheet"));
      const storedHeight = Number(window.localStorage.getItem(`${mobileSheetStoragePrefix}:${mode}`));
      const nextHeight = Number.isFinite(requestedHeight) && requestedHeight > 0 ? requestedHeight : storedHeight;

      if (Number.isFinite(nextHeight) && nextHeight > 0) {
        setMobileSheetHeight(clampMobileSheetHeight(nextHeight));
      }
      setShowSheetTuner(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [mode]);

  useEffect(() => {
    if (!window.matchMedia("(max-width: 767px)").matches) {
      return;
    }

    const root = document.documentElement;
    const body = document.body;
    const previousRootBackground = root.style.backgroundColor;
    const previousBodyBackground = body.style.backgroundColor;
    const previousRootColorScheme = root.style.colorScheme;
    const previousBodyOverscroll = body.style.overscrollBehavior;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverflowX = body.style.overflowX;
    const rootHadMobileAuthClass = root.classList.contains("cerise-mobile-auth-active");
    const bodyHadMobileAuthClass = body.classList.contains("cerise-mobile-auth-active");

    let themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previousThemeColor = themeMeta?.getAttribute("content") ?? null;
    const createdThemeMeta = !themeMeta;

    if (!themeMeta) {
      themeMeta = document.createElement("meta");
      themeMeta.name = "theme-color";
      document.head.appendChild(themeMeta);
    }

    root.style.backgroundColor = "#030303";
    root.style.colorScheme = "dark";
    root.classList.add("cerise-mobile-auth-active");
    body.style.backgroundColor = "#030303";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    body.style.overflowX = "hidden";
    body.classList.add("cerise-mobile-auth-active");
    themeMeta.content = "#000000";

    return () => {
      root.style.backgroundColor = previousRootBackground;
      root.style.colorScheme = previousRootColorScheme;
      body.style.backgroundColor = previousBodyBackground;
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscroll;
      body.style.overflowX = previousBodyOverflowX;
      if (!rootHadMobileAuthClass) root.classList.remove("cerise-mobile-auth-active");
      if (!bodyHadMobileAuthClass) body.classList.remove("cerise-mobile-auth-active");

      if (createdThemeMeta) {
        themeMeta.remove();
      } else if (previousThemeColor) {
        themeMeta.content = previousThemeColor;
      } else {
        themeMeta.removeAttribute("content");
      }
    };
  }, []);

  function updateMobileSheetHeight(nextHeight: number) {
    const clampedHeight = clampMobileSheetHeight(nextHeight);
    setMobileSheetHeight(clampedHeight);
    window.localStorage.setItem(`${mobileSheetStoragePrefix}:${mode}`, String(clampedHeight));
  }

  function updateMobileSheetHeightFromPointer(clientY: number) {
    const viewportHeight = window.innerHeight || 1;
    updateMobileSheetHeight(((viewportHeight - clientY) / viewportHeight) * 100);
  }

  function handleMobileSheetResizeStart(event: PointerEvent<HTMLDivElement>) {
    if (!showSheetTuner) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    updateMobileSheetHeightFromPointer(event.clientY);
  }

  function handleMobileSheetResizeMove(event: PointerEvent<HTMLDivElement>) {
    if (!showSheetTuner || event.buttons === 0) return;
    event.preventDefault();
    updateMobileSheetHeightFromPointer(event.clientY);
  }

  function handleMobileSheetResizeEnd(event: PointerEvent<HTMLDivElement>) {
    if (!showSheetTuner) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    updateMobileSheetHeightFromPointer(event.clientY);
  }

  function handleMobileSheetTouch(event: TouchEvent<HTMLDivElement>) {
    if (!showSheetTuner) return;
    const touch = event.touches[0] || event.changedTouches[0];
    if (!touch) return;
    event.preventDefault();
    updateMobileSheetHeightFromPointer(touch.clientY);
  }

  return (
    <main
      className="cerise-mobile-auth-shell relative min-h-[100dvh] bg-[#030303] px-0 py-0 text-[#1a1208] md:flex md:min-h-screen md:items-center md:justify-center md:bg-[#f7f3ed] md:px-6 md:py-6 lg:px-8"
      style={{ height: "100dvh", minHeight: "100svh" }}
    >
      <div aria-hidden="true" className="fixed inset-0 z-0 bg-[#030303] md:hidden" />
      <section
        className="relative z-10 h-[100dvh] min-h-[100svh] overflow-hidden bg-[#030303] md:hidden"
        style={{ height: "100dvh" }}
      >
        <div className="absolute inset-x-0 top-0 z-10 mx-auto h-[58svh] min-h-[430px] max-h-[530px] w-full max-w-[430px] overflow-hidden bg-[#030303]">
          <div className="relative z-30 flex items-center justify-between px-6 pb-2 pt-[calc(env(safe-area-inset-top)+18px)]">
            <Link className="font-display text-[17px] text-white/95 no-underline" href="/">
              Cerise Scholar
            </Link>
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/90">Beta</span>
          </div>

          <MobileOrbitBackdrop className="absolute left-1/2 top-[2px] z-10 h-[430px] w-[430px] -translate-x-1/2 opacity-100 [--mobile-orbit-scale:0.86]" />
        </div>

        <div
          className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+8px)] z-20 mx-auto w-full max-w-[390px] overflow-y-auto rounded-[28px] border border-white/80 bg-white px-[16px] pb-3.5 pt-3.5 shadow-[0_-20px_70px_rgba(26,18,8,0.13)] backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ height: `${mobileSheetHeight}dvh`, maxHeight: "calc(100dvh - env(safe-area-inset-top) - 84px)" }}
        >
          {showSheetTuner && (
            <div
              aria-label={`Drag to resize card. Current height ${mobileSheetHeight}vh`}
              aria-orientation="horizontal"
              className="absolute inset-x-0 top-0 z-30 h-12 cursor-ns-resize touch-none"
              onPointerDown={handleMobileSheetResizeStart}
              onPointerMove={handleMobileSheetResizeMove}
              onPointerUp={handleMobileSheetResizeEnd}
              onPointerCancel={handleMobileSheetResizeEnd}
              onTouchStart={handleMobileSheetTouch}
              onTouchMove={handleMobileSheetTouch}
              onTouchEnd={handleMobileSheetTouch}
              role="separator"
            />
          )}
          <Link
            aria-label="Close and return home"
            className="absolute right-5 top-5 z-40 flex h-7 w-7 items-center justify-center rounded-full border border-[#e0d8d0] bg-white/90 text-[#8a7a6b] no-underline shadow-[0_6px_16px_rgba(26,18,8,0.08)] transition-colors hover:border-[#cfc4b8] hover:bg-[#fbf8f5] hover:text-[#1a1208]"
            href="/"
          >
            <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16">
              <path d="M4.5 4.5L11.5 11.5M11.5 4.5L4.5 11.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
            </svg>
          </Link>
          <img
            alt="Cerise Scholar hedgehog pressing the start button"
            className="h-[72px] w-[72px] object-contain"
            src="/assets/hedgehogs/hedgehog01Start.png"
          />
          <h1
            className="mt-2 text-[23px] font-extrabold leading-[1.05] tracking-normal text-[#34302c]"
            style={{ fontFamily: "'Inter', 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
          >
            {mobile.title}
          </h1>
          <p className="mt-2 max-w-[334px] text-[12px] leading-[1.42] text-[#5f5a55]">{mobile.body}</p>
          <div className="mt-3">{children}</div>
        </div>
      </section>

      <section className="mx-auto hidden min-h-screen w-full max-w-6xl overflow-hidden bg-white md:grid md:min-h-[660px] md:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.9fr)] md:rounded-[24px] md:shadow-[0_24px_70px_rgba(26,18,8,0.08)] xl:min-h-[700px] xl:grid-cols-[minmax(0,0.98fr)_minmax(390px,0.9fr)]">
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
