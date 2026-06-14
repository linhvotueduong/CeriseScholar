"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import { AppIcon } from "./AppIcons";

const centerLinks = [
  { href: "/about", label: "About" },
  { href: "/research-guidance", label: "Guidance" },
  { href: "/research-desk", label: "Projects" },
  { href: "/courses", label: "Course" },
  { href: "/dashboard/space", label: "Cerise Space" },
];

function getDisplayName(user: ReturnType<typeof useUser>["user"]) {
  const metadata = user?.user_metadata || {};
  const fullName = typeof metadata.full_name === "string" ? metadata.full_name.trim() : "";
  const firstName = typeof metadata.first_name === "string" ? metadata.first_name.trim() : "";
  return fullName || firstName || user?.email || "Account";
}

function getInitials(displayName: string, email?: string) {
  const parts = displayName
    .split(/\s+|@/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  if (parts[0] && parts[0] !== email) return parts[0].slice(0, 2).toUpperCase();
  return (email?.slice(0, 2) || "CS").toUpperCase();
}

function isTopActive(pathname: string, href: string) {
  if (href === "/about") return pathname === "/about" || pathname.startsWith("/about/");
  if (href === "/research-desk") return pathname === "/research-desk" || pathname.startsWith("/dashboard/project");
  if (href === "/courses") return pathname === "/courses" || pathname.startsWith("/courses/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppTopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const displayName = getDisplayName(user);
  const initials = getInitials(displayName, user?.email);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-[#e5e1dc] bg-white/95 backdrop-blur">
      <div className="grid h-16 grid-cols-[1fr_auto] items-center gap-4 px-5 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)_190px] lg:px-6">
        <Link
          className="cerise-wordmark text-[22px] leading-none text-[#17120d] no-underline"
          href="/dashboard"
        >
          Cerise Scholar
        </Link>

        <nav className="hidden h-16 items-center justify-center gap-8 lg:flex">
          {centerLinks.map((item) => {
            const active = isTopActive(pathname, item.href);
            return (
              <Link
                className={cn(
                  "flex h-16 items-center border-b-2 px-1 text-[12px] font-bold no-underline transition",
                  active
                    ? "border-[#9a7b55] text-[#17120d]"
                    : "border-transparent text-[#17120d] hover:border-[#ddd6ce]"
                )}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex h-16 items-center justify-end gap-2">
          <button
            aria-label="Notifications"
            className="hidden h-8 w-8 items-center justify-center rounded-full border border-transparent text-[#17120d] transition hover:border-[#e5e1dc] hover:bg-[#f7f5f2] sm:flex"
            type="button"
          >
            <AppIcon className="h-[18px] w-[18px]" name="bell" />
          </button>
          <Link
            aria-label="Help Center"
            className="hidden h-8 w-8 items-center justify-center rounded-full border border-transparent text-[#17120d] no-underline transition hover:border-[#e5e1dc] hover:bg-[#f7f5f2] sm:flex"
            href="/help"
          >
            <AppIcon className="h-[18px] w-[18px]" name="help" />
          </Link>
          <Link
            aria-label="Settings"
            className="hidden h-8 w-8 items-center justify-center rounded-full border border-transparent text-[#17120d] no-underline transition hover:border-[#e5e1dc] hover:bg-[#f7f5f2] sm:flex"
            href="/settings"
          >
            <AppIcon className="h-[18px] w-[18px]" name="settings" />
          </Link>

          {user ? (
            <details className="group relative">
              <summary className="flex h-10 list-none items-center gap-2 rounded-full py-1 pl-1 pr-1 text-[#17120d] transition hover:bg-[#f7f5f2] [&::-webkit-details-marker]:hidden">
                <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#111111] text-[11px] font-bold text-white">
                  {initials}
                </span>
                <AppIcon className="h-4 w-4 text-[#7b7168]" name="chevron-down" />
              </summary>
              <div className="absolute right-0 top-full z-50 mt-3 w-[230px] rounded-[14px] border border-[#e5e1dc] bg-white p-2 shadow-[0_18px_36px_rgba(0,0,0,0.08)]">
                <div className="border-b border-[#eeeae5] px-3 py-2">
                  <p className="truncate text-xs font-bold text-[#111111]">{displayName}</p>
                  <p className="mt-0.5 truncate text-[11px] text-[#7b7168]">{user.email}</p>
                </div>
                <div className="py-2">
                  {[
                    { href: "/settings/account", label: "Account" },
                    { href: "/dashboard", label: "Dashboard" },
                    { href: "/settings", label: "Settings" },
                    { href: "/help", label: "Help Center" },
                    { href: "/help/contact", label: "Contact support" },
                  ].map((item) => (
                    <Link
                      className="block rounded-[10px] px-3 py-2 text-xs font-semibold text-[#111111] no-underline hover:bg-[#f7f5f2]"
                      href={item.href}
                      key={item.href}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
                <div className="border-t border-[#eeeae5] pt-2">
                  <button
                    className="w-full rounded-[10px] px-3 py-2 text-left text-xs font-semibold text-[#b42318] hover:bg-[#fff1f0]"
                    onClick={handleLogout}
                    type="button"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </details>
          ) : (
            <Link
              className="inline-flex h-10 items-center rounded-full bg-[#111111] px-4 text-xs font-bold text-white no-underline"
              href="/login"
            >
              Log In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
