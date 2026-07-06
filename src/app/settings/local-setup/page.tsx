"use client";

// Legacy route — Settings → AI (src/app/settings/ai/page.tsx) replaced this
// page in the nav. Kept only as a redirect so old links/bookmarks still land
// somewhere useful instead of a dead page. Slated for later removal — see
// AGENTS.md's local-first-agent-migration docs for the broader local-agent
// quarantine context.

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LocalSetupSettingsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings/ai");
  }, [router]);

  return <p className="p-6 text-sm text-[#6f6760]">Redirecting…</p>;
}
