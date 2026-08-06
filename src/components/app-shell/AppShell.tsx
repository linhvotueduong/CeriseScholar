"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import AppTopNav from "@/components/app-shell/AppTopNav";
import { ToastViewport } from "@/components/app-ui/Toast";

export default function AppShell({
  children,
  contentClassName,
}: {
  children: ReactNode;
  contentClassName?: string;
}) {
  const pathname = usePathname();
  const isResearchPathWorkspace = /^\/dashboard\/project\/[^/]+\/?$/.test(pathname);

  return (
    <div className="cerise-app-ui h-[100dvh] min-h-[100svh] overflow-hidden bg-white text-[#17120d]">
      <div className="grid h-full min-h-0">
        <div
          className={cn(
            "grid min-h-0 min-w-0 bg-white",
            isResearchPathWorkspace
              ? "grid-rows-[minmax(0,1fr)]"
              : "grid-rows-[64px_minmax(0,1fr)]",
          )}
        >
          {!isResearchPathWorkspace ? <AppTopNav /> : null}
          <main
            className={cn(
              "min-h-0 min-w-0",
              isResearchPathWorkspace
                ? "overflow-hidden p-0"
                : "overflow-y-auto px-5 py-5 sm:px-6 lg:px-6",
              contentClassName,
            )}
          >
            {children}
          </main>
        </div>
      </div>
      {/* Mounted once for the whole User Dashboard shell so any surface (ScholarAsk's
          canonical pathway saves, the PDF viewer's Finish button, etc.) can call
          showToast() from src/components/app-ui/Toast.tsx without prop-drilling. */}
      <ToastViewport />
    </div>
  );
}
