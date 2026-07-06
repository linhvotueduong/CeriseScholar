"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { upsertProfile } from "@/lib/profile/profile";

const PENDING_GOOGLE_PROFILE_KEY = "cerise_pending_google_signup_profile";
const ADMIN_EMAIL = "cerisescholar@gmail.com";

function metaString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Mirror identity fields from auth metadata into the profiles table. */
async function syncProfileFromMetadata(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  metadata: Record<string, unknown>
) {
  await upsertProfile(supabase, userId, {
    first_name: metaString(metadata, "first_name"),
    last_name: metaString(metadata, "last_name"),
    full_name: metaString(metadata, "full_name") || metaString(metadata, "name"),
    avatar_url: metaString(metadata, "avatar_url") || metaString(metadata, "picture"),
  });
}

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
            const mergedMetadata = {
              ...data.user.user_metadata,
              ...parsedProfile,
            };
            await supabase.auth.updateUser({ data: mergedMetadata });
            await syncProfileFromMetadata(supabase, data.user.id, mergedMetadata);
          }
        } finally {
          window.localStorage.removeItem(PENDING_GOOGLE_PROFILE_KEY);
        }
      } else {
        const { data } = await supabase.auth.getUser();
        if (data.user && data.user.email?.toLowerCase() !== ADMIN_EMAIL) {
          await syncProfileFromMetadata(
            supabase,
            data.user.id,
            data.user.user_metadata || {}
          );
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
