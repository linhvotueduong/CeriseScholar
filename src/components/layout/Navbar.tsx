"use client";

import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import Link from "next/link";

export default function Navbar() {
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  // Extract projectId from the URL if we're inside a project
  const projectMatch = pathname.match(/\/dashboard\/project\/([^/]+)/);
  const currentProjectId = projectMatch ? projectMatch[1] : null;

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
          <Link href="/dashboard" className="text-xl font-bold text-[#DE3163]">
            Cerise Scholar
          </Link>

          <div className="flex items-center gap-4">
            {user && (
              <Link
                href="/dashboard"
                className="text-sm text-gray-600 hover:text-[#DE3163] font-medium transition-colors"
              >
                Workspace
              </Link>
            )}
            <Link
              href="/"
              className="text-sm text-gray-600 hover:text-[#DE3163] font-medium transition-colors"
            >
              Home
            </Link>
            <Link
              href="/about"
              className="text-sm text-gray-600 hover:text-[#DE3163] font-medium transition-colors"
            >
              About
            </Link>
            {user && currentProjectId && (
              <Link
                href={`/dashboard/project/${currentProjectId}/literature-review`}
                className="text-sm text-gray-600 hover:text-[#DE3163] font-medium transition-colors"
              >
                Literature Review
              </Link>
            )}
          </div>
        </div>

        {user && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{user.email}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-[#DE3163] transition-colors"
            >
              Log Out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
