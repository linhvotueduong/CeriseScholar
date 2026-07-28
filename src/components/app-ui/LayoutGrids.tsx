import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function AppPageFrame({
  children,
  className,
  narrow = false,
}: {
  children: ReactNode;
  className?: string;
  narrow?: boolean;
}) {
  return <div className={cn("w-full", narrow ? "max-w-[1180px]" : "max-w-none", className)}>{children}</div>;
}

export function DashboardPageTemplate({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_238px]", className)}>
      {children}
    </section>
  );
}

export function DashboardTopGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid gap-2.5 lg:grid-cols-[1.28fr_0.72fr_0.9fr_1fr_0.9fr]", className)}>
      {children}
    </div>
  );
}

export function DashboardMiddleGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid gap-3 lg:grid-cols-[minmax(0,1fr)_214px]", className)}>
      {children}
    </div>
  );
}

export function HelpCenterPageTemplate({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_300px]", className)}>
      {children}
    </section>
  );
}

export function HelpArticlePageTemplate({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("grid items-start gap-5 xl:grid-cols-[minmax(0,960px)_260px] xl:gap-11", className)}>
      {children}
    </section>
  );
}

export function PolicyPageTemplate({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("grid items-start gap-5 xl:grid-cols-[minmax(0,960px)_260px] xl:gap-11", className)}>
      {children}
    </section>
  );
}

export function ContactPageTemplate({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_310px]", className)}>
      {children}
    </section>
  );
}

export function SettingsPageTemplate({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid gap-6 lg:grid-cols-[210px_minmax(0,1fr)]", className)}>
      {children}
    </div>
  );
}

export const DashboardLayoutGrid = DashboardPageTemplate;
export const HelpCenterLayoutGrid = HelpCenterPageTemplate;
export const SettingsLayoutGrid = SettingsPageTemplate;
