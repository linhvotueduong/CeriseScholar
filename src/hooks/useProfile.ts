"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import {
  fetchProfile,
  resolveAvatarUrl,
  resolveBio,
  resolveDisplayName,
  resolveInitials,
  type Profile,
} from "@/lib/profile/profile";

/**
 * Reads the logged-in user's profile row (migration 015) and returns the
 * resolved identity (display name, initials, avatar, bio) with auth-metadata
 * fallback. Use this anywhere the UI shows the user's identity so the
 * `profiles` table is the single source of truth.
 *
 * `displayNameFallback` keeps each surface's existing default (e.g. the top nav
 * shows "Account", the sidebar shows "Cerise Scholar").
 */
export function useProfile(displayNameFallback = "Cerise Scholar") {
  const { user, loading: userLoading } = useUser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    if (!user) return;

    let mounted = true;
    const supabase = createClient();

    // setState only inside the async callback (never synchronously in the
    // effect body) to satisfy react-hooks/set-state-in-effect.
    fetchProfile(supabase, user.id).then((row) => {
      if (!mounted) return;
      setProfile(row);
      setLoadedUserId(user.id);
    });

    return () => {
      mounted = false;
    };
  }, [user, refreshKey]);

  // No user → no profile. While a logged-in user's profile is still loading,
  // report loading so consumers can show a spinner instead of a fallback flash.
  const effectiveProfile = user ? profile : null;
  const loading = userLoading || (!!user && loadedUserId !== user.id);

  const displayName = resolveDisplayName(effectiveProfile, user, displayNameFallback);
  const initials = resolveInitials(displayName, user?.email);
  const avatarUrl = resolveAvatarUrl(effectiveProfile, user);
  const bio = resolveBio(effectiveProfile, user);

  return {
    user,
    profile: effectiveProfile,
    displayName,
    initials,
    avatarUrl,
    bio,
    loading,
    refresh,
  };
}
