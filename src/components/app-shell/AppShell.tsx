"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import AppSidebar from "@/components/app-shell/AppSidebar";
import AppTopNav from "@/components/app-shell/AppTopNav";

export default function AppShell({
  children,
  contentClassName,
}: {
  children: ReactNode;
  contentClassName?: string;
}) {
  return (
    <div className="cerise-app-ui h-[100dvh] min-h-[100svh] overflow-hidden bg-white text-[#17120d]">
      <div className="grid h-full min-h-0 lg:grid-cols-[216px_minmax(0,1fr)]">
        <AppSidebar />
        <div className="grid min-h-0 min-w-0 grid-rows-[64px_minmax(0,1fr)] border-l border-[#e5e1dc] bg-white">
          <AppTopNav />
          <main className={cn("min-h-0 min-w-0 overflow-y-auto px-5 py-5 sm:px-6 lg:px-6", contentClassName)}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
