import Link from "next/link";
import { CERISE_COMMUNITY_URL } from "@/lib/community";

type PublicMarketingNavbarProps = {
  fixed?: boolean;
};

const navLinks = [
  { href: "/about", label: "About" },
  { href: "/research-guidance", label: "Guidance" },
  { href: "/projects", label: "Projects" },
  { href: CERISE_COMMUNITY_URL, label: "Cerise Community ↗", external: true },
];

export default function PublicMarketingNavbar({ fixed = false }: PublicMarketingNavbarProps) {
  return (
    <div
      className={fixed ? "fixed left-0 right-0 top-[38px] z-[100] shrink-0 px-6" : "relative shrink-0 px-6 pt-[38px]"}
    >
      <nav
        className="mx-auto flex h-14 w-full max-w-[1320px] items-center justify-between gap-5 rounded-full bg-white px-9 shadow-[0_8px_28px_rgba(26,18,8,0.07)]"
      >
        <Link
          className="font-display text-[18px] font-normal text-[#1a1208] no-underline"
          href="/"
        >
          Cerise Scholar
        </Link>

        <div className="hidden items-center gap-6 text-[13px] font-medium text-[#1a1208] md:flex lg:gap-7">
          {navLinks.map((item) =>
            "external" in item && item.external ? (
              <a
                className="text-[#1a1208] no-underline hover:opacity-70"
                href={item.href}
                key={item.href}
                rel="noopener noreferrer"
                target="_blank"
              >
                {item.label}
              </a>
            ) : (
              <Link
                className="text-[#1a1208] no-underline hover:opacity-70"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            )
          )}
        </div>

        <div className="flex items-center gap-5 text-[13px] font-medium">
          <Link className="text-[#1a1208] no-underline hover:opacity-70" href="/login">
            Log In
          </Link>
          <Link
            className="inline-flex h-9 items-center justify-center rounded-full bg-[#1a1208] px-6 font-bold text-white no-underline"
            href="/signup"
          >
            Sign Up
          </Link>
        </div>
      </nav>
    </div>
  );
}
