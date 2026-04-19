"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const links = [
  { href: "/dashboard", label: "My PDFs" },
  { href: "/dashboard/literature-review", label: "Literature Review" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-[#e0d8d0] bg-white min-h-[calc(100vh-57px)]">
      <nav className="p-4 space-y-1">
        {links.map((link) => {
          const isActive =
            link.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "block px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-[#1a1208] text-white"
                  : "text-[#7a6a5a] hover:bg-[#faf7f0]"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
