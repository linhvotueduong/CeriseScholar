import assert from "node:assert/strict";
import test from "node:test";
import type { User, UserIdentity } from "@supabase/supabase-js";
import {
  canUnlinkIdentity,
  getIdentityDetail,
  getIdentityName,
  getPrimarySignInLabel,
  hasPasswordSignIn,
} from "./accountIdentity";

function identity(provider: string, data: Record<string, unknown> = {}): UserIdentity {
  return {
    id: `${provider}-identity`,
    identity_id: `${provider}-identity`,
    user_id: "user-id",
    identity_data: data,
    provider,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    last_sign_in_at: "2026-01-01T00:00:00.000Z",
  };
}

function user(provider: string): User {
  return {
    id: "user-id",
    app_metadata: { provider, providers: [provider] },
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

test("password controls only appear for email-first accounts with an email identity", () => {
  assert.equal(hasPasswordSignIn(user("email"), [identity("email")]), true);
  assert.equal(hasPasswordSignIn(user("google"), [identity("google", { email: "a@example.com" })]), false);
  assert.equal(hasPasswordSignIn(user("google"), [identity("email"), identity("google")]), false);
});

test("connected identity copy prefers provider profile data", () => {
  const google = identity("google", { full_name: "Cerise Researcher", email: "cerise@example.com" });
  assert.equal(getIdentityName(google), "Cerise Researcher");
  assert.equal(getIdentityDetail(google), "cerise@example.com");
  assert.equal(getPrimarySignInLabel([google]), "Google");
});

test("an OAuth identity can only be disconnected when another identity remains", () => {
  const google = identity("google");
  const email = identity("email");
  assert.equal(canUnlinkIdentity([google], google), false);
  assert.equal(canUnlinkIdentity([google, email], google), true);
  assert.equal(canUnlinkIdentity([google, email], email), false);
});
