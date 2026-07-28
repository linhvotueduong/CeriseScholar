import type { User, UserIdentity } from "@supabase/supabase-js";

const PROVIDER_LABELS: Record<string, string> = {
  apple: "Apple",
  email: "Email",
  google: "Google",
  phone: "Phone",
};

export function getProviderLabel(provider: string) {
  return PROVIDER_LABELS[provider] ?? `${provider.charAt(0).toUpperCase()}${provider.slice(1)}`;
}

export function getIdentityName(identity: UserIdentity) {
  const data = identity.identity_data ?? {};
  const value = data.full_name ?? data.name ?? data.email ?? data.phone;

  return typeof value === "string" && value.trim()
    ? value.trim()
    : `${getProviderLabel(identity.provider)} account`;
}

export function getIdentityDetail(identity: UserIdentity) {
  const data = identity.identity_data ?? {};
  const value = data.email ?? data.phone;

  return typeof value === "string" && value.trim() ? value.trim() : "Connected sign-in method";
}

/**
 * Supabase records the first sign-up provider in app_metadata.provider. Using
 * that field avoids offering password reset to Google-first accounts that only
 * have an email address for contact purposes.
 */
export function hasPasswordSignIn(user: User | null | undefined, identities: UserIdentity[]) {
  return user?.app_metadata?.provider === "email"
    && identities.some((identity) => identity.provider === "email");
}

export function getPrimarySignInLabel(identities: UserIdentity[]) {
  const identity = identities.find(({ provider }) => provider !== "email") ?? identities[0];
  return identity ? getProviderLabel(identity.provider) : "your connected account";
}

export function canUnlinkIdentity(identities: UserIdentity[], identity: UserIdentity) {
  return identities.length > 1
    && identities.some((candidate) => candidate.id === identity.id)
    && identity.provider !== "email"
    && identity.provider !== "phone";
}
