import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

/**
 * The `profiles` table (migration 015) is the first-class home for a user's
 * identity/display data. It is auto-created on signup by a database trigger and
 * existing users were backfilled. Phone/address stay in auth metadata; consent
 * lives in user_consents; passwords stay in the auth system.
 *
 * Read path: prefer the profile row, fall back to auth `user_metadata` so the
 * UI never regresses while the table is still filling in.
 */
export type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  institution: string | null;
  field_of_study: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
};

/** The subset of profile fields the app may write from UI surfaces. */
export type EditableProfile = Pick<
  Profile,
  "first_name" | "last_name" | "full_name" | "avatar_url" | "bio" | "institution" | "field_of_study"
>;

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function metadataString(user: User | null | undefined, key: string): string {
  const metadata = user?.user_metadata as Record<string, unknown> | undefined;
  return clean(metadata?.[key]);
}

/**
 * Reads the current user's profile row. Returns null if the row does not exist
 * yet (callers should fall back to auth metadata) or on any RLS/network error.
 */
export async function fetchProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return (data as Profile | null) ?? null;
}

/**
 * Upserts the editable fields of the current user's profile. RLS guarantees a
 * user can only write their own row (id = auth.uid()).
 */
export async function upsertProfile(
  supabase: SupabaseClient,
  userId: string,
  fields: Partial<EditableProfile>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        ...fields,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  return { error: error ? error.message : null };
}

/**
 * The user's display name, preferring the profile row, then auth metadata,
 * then email, then the supplied fallback. Keeps the existing per-surface
 * fallbacks ("Account", "Cerise Scholar", etc.) configurable.
 */
export function resolveDisplayName(
  profile: Profile | null,
  user: User | null | undefined,
  fallback = "Cerise Scholar"
): string {
  const profileFull = clean(profile?.full_name);
  const profileCombined = `${clean(profile?.first_name)} ${clean(profile?.last_name)}`.trim();
  const metaFull = metadataString(user, "full_name");
  const metaFirst = metadataString(user, "first_name");

  return profileFull || profileCombined || metaFull || metaFirst || user?.email || fallback;
}

/** Two-letter initials derived from a display name (with email fallback). */
export function resolveInitials(displayName: string, email?: string | null): string {
  const parts = displayName
    .split(/\s+|@/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  if (parts[0] && parts[0] !== email) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (email?.slice(0, 2) || "CS").toUpperCase();
}

/** Avatar URL preferring the profile row, then auth metadata. */
export function resolveAvatarUrl(
  profile: Profile | null,
  user: User | null | undefined
): string {
  return (
    clean(profile?.avatar_url) ||
    metadataString(user, "avatar_url") ||
    metadataString(user, "picture")
  );
}

/** The "About" text, preferring the profile row, then auth metadata. */
export function resolveBio(profile: Profile | null, user: User | null | undefined): string {
  return clean(profile?.bio) || metadataString(user, "bio");
}
