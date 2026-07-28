"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppIcon } from "@/components/app-shell/AppIcons";
import { cn } from "@/lib/utils/cn";

export const settingsLinks = [
  { href: "/settings/account", label: "Account" },
  { href: "/settings/ai", label: "API key" },
  { href: "/settings/preferences", label: "Preferences" },
  { href: "/settings/notifications", label: "Notifications" },
  { href: "/settings/privacy-security", label: "Privacy & Security" },
  { href: "/settings/help-support", label: "Help & Support" },
];

export default function SettingsSubnav() {
  const pathname = usePathname();

  return (
    <nav className="settingsSubnav h-fit self-start rounded-[12px] border border-[#e5e1dc] bg-white p-3 lg:sticky lg:top-[96px]">
      {settingsLinks.map((link) => {
        const active =
          pathname === link.href || (pathname === "/settings" && link.href === "/settings/account");
        return (
          <Link
            className={cn(
              "mb-2 flex h-10 items-center justify-between rounded-[8px] px-3.5 text-[12px] font-bold text-[#17120d] no-underline last:mb-0",
              active ? "border border-[#17120d] bg-white shadow-[0_1px_0_rgba(17,17,17,0.03)]" : "hover:bg-[#f7f5f2]"
            )}
            href={link.href}
            key={link.href}
          >
            <span>{link.label}</span>
            <AppIcon className="h-3.5 w-3.5 -rotate-90 text-[#7b7168]" name="chevron-down" />
          </Link>
        );
      })}
    </nav>
  );
}
