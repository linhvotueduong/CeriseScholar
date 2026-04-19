"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import Link from "next/link";

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
    <nav className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold text-[#111111]">
            Cerise Scholar
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/about"
              className="text-sm text-gray-600 hover:text-[#111111] font-medium transition-colors"
            >
              About
            </Link>
            <Link
              href="/research-guidance"
              className="text-sm text-gray-600 hover:text-[#111111] font-medium transition-colors"
            >
              Research Guidance
            </Link>
            {user && (
              <Link
                href="/dashboard"
                className="text-sm text-gray-600 hover:text-[#111111] font-medium transition-colors"
              >
                Projects
              </Link>
            )}
          </div>
        </div>

        {user && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{user.email}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-[#111111] transition-colors"
            >
              Log Out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
