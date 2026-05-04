"use client";

import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import { ADMIN_EMAIL } from "@/lib/admin/config";

/**
 * Renders an "Admin" link in the navbar — only for the admin account.
 * Middleware + Supabase RLS are the real gates; this is just a UI affordance
 * so the admin can jump to the admin hub without typing the URL.
 */
export default function AdminNavLink() {
  const { user } = useUser();
  if (user?.email?.toLowerCase() !== ADMIN_EMAIL) return null;

  return (
    <Link
      href="/admin"
      className="hover:opacity-70"
      style={{
        color: "#c0392b",
        textDecoration: "none",
        fontWeight: 600,
      }}
    >
      Admin
    </Link>
  );
}
