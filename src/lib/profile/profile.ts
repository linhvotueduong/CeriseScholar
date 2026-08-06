import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

/**
 * The `profiles` table (migration 015) is the first-class home for a user's
 * identity/display data. It is auto-created on signup by a database trigger and
 * existing users were backfilled. Consent lives in user_consents; passwords
 * and the account email stay in Supabase Auth.
 *
 * Read path: prefer the profile row, fall back to auth `user_metadata` so the
 * UI never regresses while the table is still filling in.
 */
export type Profile = {
  id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  institution: string | null;
  institution_unitid: string | null;
  field_of_study: string | null;
  level_of_study: string | null;
  avatar_path: string | null;
  age_confirmed_at: string | null;
  author_name_locked_at: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
};

/** The subset of profile fields the app may write from UI surfaces. */
export type EditableProfile = Pick<
  Profile,
  | "first_name"
  | "middle_name"
  | "last_name"
  | "full_name"
  | "avatar_url"
  | "avatar_path"
  | "bio"
  | "institution"
  | "institution_unitid"
  | "field_of_study"
  | "level_of_study"
  | "onboarding_completed"
>;

export type UserPreferences = {
  user_id: string;
  preferred_language: string;
  timezone: string;
  email_updates_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type EditableUserPreferences = Pick<
  UserPreferences,
  "preferred_language" | "timezone" | "email_updates_enabled"
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
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      return null;
    }

    return (data as Profile | null) ?? null;
  } catch {
    // A transport failure (offline, DNS, blocked request) rejects instead of
    // returning a PostgREST error object. Profile identity is optional UI data,
    // so preserve the auth-metadata fallback rather than crashing the app shell.
    return null;
  }
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
      },
      { onConflict: "id" }
    );

  return { error: error ? error.message : null };
}

export async function fetchUserPreferences(
  supabase: SupabaseClient,
  userId: string
): Promise<UserPreferences | null> {
  try {
    const { data, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    return error ? null : (data as UserPreferences | null);
  } catch {
    return null;
  }
}

export async function upsertUserPreferences(
  supabase: SupabaseClient,
  userId: string,
  fields: Partial<EditableUserPreferences>
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from("user_preferences")
      .upsert({ user_id: userId, ...fields }, { onConflict: "user_id" });
    return { error: error?.message ?? null };
  } catch {
    return { error: "Unable to reach the preferences service." };
  }
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
