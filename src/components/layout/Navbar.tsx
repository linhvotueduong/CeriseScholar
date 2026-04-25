/* eslint-disable @next/next/no-img-element */
"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import Link from "next/link";
import HEDGEHOG from "@/lib/hedgehog";
import AdminNavLink from "@/components/layout/AdminNavLink";

export default function Navbar() {
  const { user } = useUser();
  const router = useRouter();

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
            <>
              <span style={{ fontFamily: "'Noto Sans', sans-serif", fontSize: "11px", color: "#7a6a5a" }}>
                {user.email}
              </span>
              <button
                onClick={handleLogout}
                className="hover:opacity-70"
                style={{
                  fontFamily: "'Noto Sans', sans-serif",
                  fontSize: "11px",
                  color: "#1a1208",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Log Out
              </button>
            </>
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
