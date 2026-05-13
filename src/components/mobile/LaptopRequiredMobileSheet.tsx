"use client";

/* eslint-disable @next/next/no-img-element */
import HEDGEHOG from "@/lib/hedgehog";

type LaptopRequiredMobileSheetProps = {
  body?: string;
  onClose: () => void;
  onPrimary?: () => void;
  open: boolean;
  primaryLabel?: string;
  title?: string;
};

const defaultBody =
  "For this beta, local files and AI-heavy research tools stay on a personal or trusted laptop. You can keep reviewing lighter workspace items on mobile, then continue this step from your laptop when you are ready.";

export default function LaptopRequiredMobileSheet({
  body = defaultBody,
  onClose,
  onPrimary,
  open,
  primaryLabel = "I’ll use my laptop",
  title = "This step needs your laptop",
}: LaptopRequiredMobileSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#1a1208]/35 px-4 pb-5 pt-10 backdrop-blur-[2px] md:hidden">
      <section
        aria-labelledby="laptop-required-title"
        aria-modal="true"
        className="relative w-full max-w-[340px] overflow-hidden rounded-[26px] border border-[#e0d8d0] bg-white shadow-[0_24px_70px_rgba(26,18,8,0.22)]"
        role="dialog"
      >
        <button
          aria-label="Close laptop message"
          className="absolute right-4 top-4 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-[#e0d8d0] bg-white/90 text-[#8a7a6b] shadow-[0_6px_16px_rgba(26,18,8,0.08)] transition-colors hover:border-[#cfc4b8] hover:bg-[#fbf8f5] hover:text-[#1a1208]"
          onClick={onClose}
          type="button"
        >
          <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16">
            <path d="M4.5 4.5L11.5 11.5M11.5 4.5L4.5 11.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
          </svg>
        </button>

        <div className="px-6 pb-6 pt-5">
          <img
            alt="Cerise Scholar hedgehog pressing the start button"
            className="h-[82px] w-[82px] object-contain"
            src={HEDGEHOG.hedgehog01Start}
          />
          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#c0392b]">
            Laptop beta
          </p>
          <h2
            className="mt-2 font-display text-[28px] font-normal leading-[1.05] tracking-normal text-[#1a1208]"
            id="laptop-required-title"
          >
            {title}
          </h2>
          <p className="mt-3 text-[13px] leading-5 text-[#6f6255]">{body}</p>

          <div className="mt-6 grid gap-3">
            <button
              className="min-h-11 rounded-[12px] bg-[#1a1208] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-black"
              onClick={() => {
                onPrimary?.();
                onClose();
              }}
              type="button"
            >
              {primaryLabel}
            </button>
            <button
              className="min-h-11 rounded-[12px] bg-[#f0ece8] px-4 py-3 text-sm font-bold text-[#5f5248] transition-colors hover:bg-[#e8e2dc]"
              onClick={onClose}
              type="button"
            >
              Continue on mobile
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
