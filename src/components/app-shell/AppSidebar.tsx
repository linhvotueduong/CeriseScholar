"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils/cn";
import { AppIcon, type AppIconName } from "./AppIcons";

const navItems = [
  { href: "/dashboard", icon: "dashboard", label: "Dashboard" },
  { href: "/research-desk", icon: "research", label: "Research Desk" },
  { href: "/courses", icon: "book", label: "Course Library" },
  { href: "/dashboard/schedule", icon: "calendar", label: "Schedule" },
  { href: "/help", icon: "help", label: "Help Center" },
  { href: "/settings", icon: "settings", label: "Settings" },
] satisfies Array<{
  href: string;
  icon: AppIconName;
  label: string;
}>;

const navIconClass = "h-[18px] w-[18px]";
const NIGHT_MODE_KEY = "cerise-night-mode";
const NIGHT_MODE_EVENT = "cerise-night-mode-change";

const languageIcon = (
  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#e5e1dc] bg-white text-[10px] font-bold text-[#111111]">
    EN
  </span>
);

const chevron = (
  <AppIcon className="h-4 w-4 text-[#7b7168]" name="chevron-down" />
);

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard" || (pathname.startsWith("/dashboard/") && !pathname.startsWith("/dashboard/schedule"));
  if (href === "/help") return pathname === "/help" || pathname.startsWith("/help/");
  if (href === "/settings") return pathname === "/settings" || pathname.startsWith("/settings/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function initials(value?: string | null) {
  if (!value) return "CS";
  const parts = value
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2);
  return parts.map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "CS";
}

function getNightModePreference() {
  if (typeof window === "undefined") return false;
  const storedValue = window.localStorage.getItem(NIGHT_MODE_KEY);
  return storedValue ? storedValue === "true" : window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function subscribeNightMode(callback: () => void) {
  window.addEventListener(NIGHT_MODE_EVENT, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(NIGHT_MODE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function setNightModePreference(value: boolean) {
  document.documentElement.classList.toggle("cerise-night-mode", value);
  document.body.classList.toggle("cerise-night-mode", value);
  window.localStorage.setItem(NIGHT_MODE_KEY, String(value));
  window.dispatchEvent(new Event(NIGHT_MODE_EVENT));
}

export default function AppSidebar() {
  const pathname = usePathname();
  const { user, displayName } = useProfile();
  const nightMode = useSyncExternalStore(subscribeNightMode, getNightModePreference, () => false);

  useEffect(() => {
    document.documentElement.classList.toggle("cerise-night-mode", nightMode);
    document.body.classList.toggle("cerise-night-mode", nightMode);
    window.localStorage.setItem(NIGHT_MODE_KEY, String(nightMode));
  }, [nightMode]);

  return (
    <aside className="hidden h-full min-h-0 overflow-hidden bg-white lg:flex lg:flex-col">
      <div className="px-5 py-5">
        <label className="relative block">
          <span className="sr-only">Search</span>
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6f6a63]">
            <AppIcon className="h-4 w-4" name="search" />
          </span>
          <input
            className="h-9 w-full rounded-[8px] border border-[#e5e1dc] bg-white px-9 text-[12px] font-semibold text-[#17120d] outline-none placeholder:text-[#6f6760] focus:border-[#17120d]"
            placeholder="Search..."
            type="search"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-[6px] bg-[#f2f0ed] px-1.5 py-0.5 text-[10px] font-bold text-[#4f4842]">
            ⌘K
          </span>
        </label>
      </div>

      <nav className="grid gap-2 px-5 pt-7">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              className={cn(
                "grid h-10 grid-cols-[18px_1fr] items-center gap-3 rounded-[16px] px-3 text-[12px] font-bold no-underline transition",
                active
                  ? "bg-[#f1f0ee] text-[#17120d]"
                  : "text-[#17120d] hover:bg-[#f7f5f2]"
              )}
              href={item.href}
              key={item.href}
            >
              <AppIcon className={navIconClass} name={item.icon} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-4 pb-4">
        <button
          className="flex h-9 w-full items-center justify-between rounded-[12px] px-3 text-[12px] font-bold text-[#201a15] transition hover:bg-[#f7f5f2]"
          type="button"
        >
          <span className="flex items-center gap-3">
            {languageIcon}
            Language
          </span>
          {chevron}
        </button>

        <button
          className="mt-1.5 flex h-9 w-full items-center justify-between rounded-[12px] px-3 text-[12px] font-bold text-[#201a15] transition hover:bg-[#f7f5f2]"
          onClick={() => setNightModePreference(!nightMode)}
          aria-pressed={nightMode}
          type="button"
        >
          <span className="flex items-center gap-3">
            <AppIcon className="h-[18px] w-[18px]" name="moon" />
            Night Mode
          </span>
          <span
            className={cn(
              "flex h-5 w-9 items-center rounded-full p-0.5 transition",
              nightMode ? "bg-[#111111]" : "bg-[#e6e2de]"
            )}
          >
            <span
              className={cn(
                "h-4 w-4 rounded-full bg-white transition",
                nightMode ? "translate-x-4" : "translate-x-0"
              )}
            />
          </span>
        </button>

        <Link
          className="mt-3 grid grid-cols-[34px_1fr_16px] items-center gap-2.5 rounded-[18px] border border-[#e5e1dc] bg-white p-2.5 text-[#17120d] no-underline transition hover:bg-[#f7f5f2]"
          href={user ? "/settings/account" : "/login"}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#dcc197] text-[11px] font-bold text-[#111111]">
            {initials(displayName)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold">{user ? displayName : "Guest"}</span>
            <span className="block truncate text-[11px] text-[#7b7168]">
              {user?.email || "Sign in to save work"}
            </span>
          </span>
          {chevron}
        </Link>
      </div>
    </aside>
  );
}
