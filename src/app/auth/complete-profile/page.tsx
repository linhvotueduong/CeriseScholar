"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const PENDING_GOOGLE_PROFILE_KEY = "cerise_pending_google_signup_profile";
const ADMIN_EMAIL = "cerisescholar@gmail.com";

export default function CompleteProfilePage() {
  const router = useRouter();

  useEffect(() => {
    async function completeProfile() {
      const supabase = createClient();
      const pendingProfile = window.localStorage.getItem(PENDING_GOOGLE_PROFILE_KEY);

      if (pendingProfile) {
        try {
          const { data } = await supabase.auth.getUser();
          const parsedProfile = JSON.parse(pendingProfile) as Record<string, unknown>;

          if (data.user && data.user.email?.toLowerCase() !== ADMIN_EMAIL) {
            await supabase.auth.updateUser({
              data: {
                ...data.user.user_metadata,
                ...parsedProfile,
              },
            });
          }
        } finally {
          window.localStorage.removeItem(PENDING_GOOGLE_PROFILE_KEY);
        }
      }

      router.replace("/dashboard");
      router.refresh();
    }

    void completeProfile();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f3ed] px-5 text-[#1a1208]">
      <div className="w-full max-w-sm rounded-[12px] border border-[#d4cdc5] bg-white p-6 text-center shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#c0392b]">
          Cerise Scholar
        </p>
        <h1 className="mt-3 text-xl font-semibold">Finishing your account</h1>
        <p className="mt-2 text-sm leading-6 text-[#6f6255]">
          Saving your signup details and opening your workspace.
        </p>
      </div>
    </main>
  );
}
