/* eslint-disable @next/next/no-img-element */
"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import Link from "next/link";
import HEDGEHOG from "@/lib/hedgehog";
import AdminNavLink from "@/components/layout/AdminNavLink";

const avatarMenuLinks = [
  { href: "/dashboard/account", label: "Account" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/account#settings", label: "Settings" },
  { href: "/help", label: "Help Center" },
  { href: "/help/contact", label: "Contact support" },
];

function getDisplayName(user: ReturnType<typeof useUser>["user"]) {
  const metadata = user?.user_metadata || {};
  const fullName = typeof metadata.full_name === "string" ? metadata.full_name.trim() : "";
  const firstName = typeof metadata.first_name === "string" ? metadata.first_name.trim() : "";
  return fullName || firstName || user?.email || "Account";
}

function getInitials(displayName: string, email?: string) {
  const nameParts = displayName
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (nameParts.length >= 2) return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
  if (nameParts[0] && nameParts[0] !== email) return nameParts[0].slice(0, 2).toUpperCase();
  return (email?.slice(0, 2) || "CS").toUpperCase();
}

export default function Navbar() {
  const { user } = useUser();
  const router = useRouter();
  const displayName = getDisplayName(user);
  const initials = getInitials(displayName, user?.email);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div style={{ padding: "12px 24px 0", position: "relative" }}>
      {/* Hedgehog mascot beside navbar pill */}
      <img
        src={HEDGEHOG.hedgehog01Start}
        alt=""
        className="pointer-events-none hidden lg:block"
        style={{
          position: "absolute",
          left: "calc(50% - 550px - 60px)",
          top: "8px",
          height: "52px",
          width: "auto",
          objectFit: "contain",
          zIndex: 10,
        }}
      />
      <nav
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          height: "48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 28px",
          background: "#ffffff",
          borderRadius: "100px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "15px",
            fontWeight: 400,
            color: "#1a1208",
            textDecoration: "none",
          }}
        >
          Cerise Scholar
        </Link>

        {/* Nav links */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            fontFamily: "'Noto Sans', sans-serif",
            fontSize: "11px",
          }}
        >
          <Link href="/" className="hover:opacity-70" style={{ color: "#1a1208", textDecoration: "none" }}>
            Home
          </Link>

          {/* About dropdown */}
          <div className="group" style={{ position: "relative" }}>
            <span className="hover:opacity-70 cursor-pointer" style={{ color: "#1a1208" }}>About</span>
            <div
              className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200"
              style={{
                position: "absolute",
                top: "100%",
                left: "50%",
                transform: "translateX(-50%)",
                marginTop: "8px",
                background: "#fff",
                borderRadius: "12px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                padding: "8px",
                minWidth: "120px",
                zIndex: 200,
              }}
            >
              <Link href="/about/features" className="hover:bg-[#f5f0e8] block" style={{ padding: "8px 16px", borderRadius: "8px", color: "#1a1208", textDecoration: "none", fontSize: "11px", whiteSpace: "nowrap" }}>
                Features
              </Link>
              <Link href="/about/mission" className="hover:bg-[#f5f0e8] block" style={{ padding: "8px 16px", borderRadius: "8px", color: "#1a1208", textDecoration: "none", fontSize: "11px", whiteSpace: "nowrap" }}>
                Mission
              </Link>
            </div>
          </div>

          <Link href="/research-guidance" className="hover:opacity-70" style={{ color: "#1a1208", textDecoration: "none" }}>
            Guidance
          </Link>

          <Link href="/help" className="hover:opacity-70" style={{ color: "#1a1208", textDecoration: "none" }}>
            Help
          </Link>

          <Link href="/dashboard/space" className="hover:opacity-70" style={{ color: "#1a1208", textDecoration: "none" }}>
            Cerise Space
          </Link>

          {user && (
            <Link href="/dashboard" className="hover:opacity-70" style={{ color: "#1a1208", textDecoration: "none", fontWeight: 600 }}>
              Projects
            </Link>
          )}

          {user && (
            <Link href="/courses" className="hover:opacity-70" style={{ color: "#1a1208", textDecoration: "none", fontWeight: 600 }}>
              Courses
            </Link>
          )}

          {user && (
            <Link href="/my-learning" className="hover:opacity-70" style={{ color: "#1a1208", textDecoration: "none", fontWeight: 600 }}>
              My Learning
            </Link>
          )}

          <AdminNavLink />
        </div>

        {/* Right side: auth */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {user ? (
            <details className="group relative">
              <summary
                aria-label="Open account menu"
                className="flex list-none items-center gap-2 rounded-full border border-[#e0d8d0] bg-[#fffefa] py-1 pl-1 pr-2 text-[#1a1208] transition hover:bg-[#faf7f0] [&::-webkit-details-marker]:hidden"
                style={{ cursor: "pointer", fontFamily: "'Noto Sans', sans-serif" }}
              >
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1a1208] text-[11px] font-black uppercase text-white"
                >
                  {initials}
                </span>
                <span className="hidden max-w-[120px] truncate text-[11px] font-semibold text-[#1a1208] md:block">
                  {displayName}
                </span>
                <span aria-hidden="true" className="text-[10px] text-[#7a6a5a]">
                  v
                </span>
              </summary>

              <div className="absolute right-0 top-full z-[220] mt-3 w-[230px] rounded-[8px] border border-[#d4cdc5] bg-white p-2 shadow-[0_16px_36px_rgba(26,18,8,0.14)]">
                <div className="border-b border-[#eee6dd] px-3 py-2">
                  <p className="truncate text-[12px] font-black text-[#1a1208]">{displayName}</p>
                  <p className="mt-0.5 truncate text-[11px] text-[#7a6a5a]">{user.email}</p>
                </div>

                <div className="py-2">
                  {avatarMenuLinks.map((item) => (
                    <Link
                      className="block rounded-[8px] px-3 py-2 text-[12px] font-semibold text-[#1a1208] no-underline hover:bg-[#faf7f0]"
                      href={item.href}
                      key={item.href}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>

                <div className="border-t border-[#eee6dd] pt-2">
                  <button
                    onClick={handleLogout}
                    className="block w-full rounded-[8px] px-3 py-2 text-left text-[12px] font-semibold text-[#c0392b] hover:bg-[#fff5f2]"
                    style={{
                      fontFamily: "'Noto Sans', sans-serif",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                    }}
                    type="button"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </details>
          ) : (
            <>
              <Link href="/login" className="hover:opacity-70" style={{ fontFamily: "'Noto Sans', sans-serif", fontSize: "11px", color: "#1a1208", textDecoration: "none" }}>
                Log In
              </Link>
              <Link
                href="/signup"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "6px 16px",
                  fontFamily: "'Noto Sans', sans-serif",
                  fontSize: "11px",
                  fontWeight: 600,
                  background: "#1a1208",
                  color: "#fff",
                  borderRadius: "100px",
                  textDecoration: "none",
                }}
              >
                Sign Up Free
              </Link>
            </>
          )}
        </div>
      </nav>
    </div>
  );
}
