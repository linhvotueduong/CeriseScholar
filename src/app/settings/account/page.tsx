"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import type { UserIdentity } from "@supabase/supabase-js";
import { AppIcon } from "@/components/app-shell/AppIcons";
import SettingsPanel from "@/components/app-ui/SettingsPanel";
import InstitutionAutocomplete from "@/components/profile/InstitutionAutocomplete";
import DeleteAccountSection from "@/components/settings/DeleteAccountSection";
import { useProfile } from "@/hooks/useProfile";
import { prepareAvatarImage, type PreparedAvatar } from "@/lib/profile/avatarImage";
import { createClient } from "@/lib/supabase/client";
import {
  canUnlinkIdentity,
  getIdentityDetail,
  getIdentityName,
  getPrimarySignInLabel,
  getProviderLabel,
  hasPasswordSignIn,
} from "@/lib/auth/accountIdentity";
import {
  upsertProfile,
  type EditableProfile,
} from "@/lib/profile/profile";
import {
  cleanNamePart,
  validateNameChangeDraft,
  type NameChangeDraft,
  type NameChangeRequest,
} from "@/lib/profile/nameChange";

type SaveState = "idle" | "saving" | "saved" | "error";
type FormState = EditableProfile;

const emptyForm: FormState = {
  first_name: null,
  middle_name: null,
  last_name: null,
  full_name: null,
  avatar_url: null,
  avatar_path: null,
  bio: null,
  institution: null,
  institution_unitid: null,
  field_of_study: null,
  level_of_study: null,
  onboarding_completed: false,
};

function text(value: string | null | undefined) {
  return value ?? "";
}

function formatDate(value?: string | null) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

function editableProfileSnapshot(form: FormState) {
  return JSON.stringify({
    institution: form.institution?.trim() || null,
    institution_unitid: form.institution_unitid,
    field_of_study: form.field_of_study?.trim() || null,
    level_of_study: form.level_of_study?.trim() || null,
  });
}

export default function AccountSettingsPage() {
  const router = useRouter();
  const { user, profile, avatarUrl, initials, loading, refresh } = useProfile("Account");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [seededFor, setSeededFor] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  const [passwordState, setPasswordState] = useState<SaveState>("idle");
  const [identities, setIdentities] = useState<UserIdentity[]>([]);
  const [identitiesLoaded, setIdentitiesLoaded] = useState(false);
  const [identityState, setIdentityState] = useState<SaveState>("idle");
  const [identityMessage, setIdentityMessage] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [pendingContactEmail, setPendingContactEmail] = useState<string | null>(null);
  const [contactEmailState, setContactEmailState] = useState<SaveState>("idle");
  const [contactEmailMessage, setContactEmailMessage] = useState("");
  const [signOutState, setSignOutState] = useState<SaveState>("idle");
  const [signOutMessage, setSignOutMessage] = useState("");
  const [nameRequestOpen, setNameRequestOpen] = useState(false);
  const [nameRequestState, setNameRequestState] = useState<SaveState>("idle");
  const [nameRequestMessage, setNameRequestMessage] = useState("");
  const [latestNameRequest, setLatestNameRequest] = useState<NameChangeRequest | null>(null);
  const [nameDraft, setNameDraft] = useState<NameChangeDraft>({
    firstName: "",
    middleName: "",
    lastName: "",
    reason: "",
  });
  const savedProfileRef = useRef<string | null>(null);
  const saveRequestRef = useRef(0);

  useEffect(() => {
    if (loading || !user || seededFor === user.id) return;
    let mounted = true;
    void Promise.resolve().then(() => {
      if (!mounted) return;
      const nextForm = { ...emptyForm, ...(profile ?? {}) };
      savedProfileRef.current = editableProfileSnapshot(nextForm);
      setForm(nextForm);
      setNameDraft({
        firstName: text(profile?.first_name),
        middleName: text(profile?.middle_name),
        lastName: text(profile?.last_name),
        reason: "",
      });
      setSeededFor(user.id);
    });
    return () => { mounted = false; };
  }, [loading, profile, seededFor, user]);

  const profileSnapshot = editableProfileSnapshot(form);
  useEffect(() => {
    if (!user || seededFor !== user.id || profileSnapshot === savedProfileRef.current) return;
    const requestId = ++saveRequestRef.current;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setSaveState("saving");
      setMessage("Saving account changes…");
      void upsertProfile(createClient(), user.id, {
        institution: form.institution?.trim() || null,
        institution_unitid: form.institution_unitid,
        field_of_study: form.field_of_study?.trim() || null,
        level_of_study: form.level_of_study?.trim() || null,
        onboarding_completed: true,
      }).then((result) => {
        if (cancelled || requestId !== saveRequestRef.current) return;
        if (result.error) {
          setSaveState("error");
          setMessage("We couldn't save your account changes. Change a field to try again.");
          return;
        }
        savedProfileRef.current = profileSnapshot;
        setSaveState("saved");
        setMessage("Account changes saved automatically.");
      });
    }, 600);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [form.field_of_study, form.institution, form.institution_unitid, form.level_of_study, profileSnapshot, seededFor, user]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const supabase = createClient();
    void supabase.auth.getUserIdentities().then(({ data, error }) => {
      if (!mounted) return;
      setIdentities(error ? (user.identities ?? []) : data.identities);
      setIdentitiesLoaded(true);
      setContactEmail(user.new_email ?? user.email ?? "");
      setPendingContactEmail(user.new_email ?? null);
    });
    return () => { mounted = false; };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    void createClient()
      .from("author_name_change_requests")
      .select("id,user_id,current_full_name,requested_first_name,requested_middle_name,requested_last_name,requested_full_name,reason,status,reviewed_at,review_note,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (mounted) setLatestNameRequest((data as NameChangeRequest | null) ?? null);
      });
    return () => { mounted = false; };
  }, [user]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setSaveState("idle");
    setMessage("");
  }

  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !user) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setSaveState("error");
      setMessage("Choose a JPG, PNG, or WebP image smaller than 5 MB.");
      return;
    }
    setSaveState("saving");
    setMessage("Optimizing photo…");
    let prepared: PreparedAvatar;
    try {
      prepared = await prepareAvatarImage(file);
    } catch (error) {
      setSaveState("error");
      setMessage(error instanceof Error ? error.message : "We couldn't prepare that photo.");
      return;
    }

    setMessage("Uploading photo…");
    const extension = prepared.extension;
    const path = `${user.id}/avatar.${extension}`;
    const supabase = createClient();
    const previousPath = profile?.avatar_path;
    const { error } = await supabase.storage.from("avatars").upload(path, prepared.blob, {
      upsert: true,
      contentType: prepared.blob.type,
      cacheControl: "3600",
    });
    if (error) {
      setSaveState("error");
      setMessage("We couldn't upload that photo. Please try again.");
      return;
    }
    const result = await upsertProfile(supabase, user.id, { avatar_path: path });
    if (result.error) {
      if (previousPath !== path) {
        await supabase.storage.from("avatars").remove([path]);
      }
      setSaveState("error");
      setMessage("We couldn't attach that photo to your profile.");
      return;
    }
    if (previousPath && previousPath !== path) {
      await supabase.storage.from("avatars").remove([previousPath]);
    }
    setSaveState("saved");
    setMessage("Profile photo updated.");
    refresh();
  }

  async function changePassword() {
    if (!user?.email) return;
    setPasswordState("saving");
    const { error } = await createClient().auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setPasswordState(error ? "error" : "saved");
  }

  async function changeContactEmail() {
    if (!user) return;
    const nextEmail = contactEmail.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(nextEmail)) {
      setContactEmailState("error");
      setContactEmailMessage("Enter a valid email address.");
      return;
    }
    if (nextEmail === user.email?.toLowerCase() && !pendingContactEmail) {
      setContactEmailState("idle");
      setContactEmailMessage("This is already your contact email.");
      return;
    }

    setContactEmailState("saving");
    setContactEmailMessage("Sending verification instructions…");
    const redirectPath = "/settings/account?email=verified";
    const { data, error } = await createClient().auth.updateUser(
      { email: nextEmail },
      { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectPath)}` },
    );

    if (error) {
      setContactEmailState("error");
      setContactEmailMessage(error.message);
      return;
    }

    const pendingEmail = data.user?.new_email ?? nextEmail;
    setPendingContactEmail(pendingEmail);
    setContactEmail(pendingEmail);
    setContactEmailState("saved");
    setContactEmailMessage(
      "Verification sent. For security, you may also need to approve the change from your current inbox.",
    );
  }

  async function connectGoogle() {
    setIdentityState("saving");
    setIdentityMessage("Opening Google…");
    const nextPath = "/settings/account?connection=google";
    const { error } = await createClient().auth.linkIdentity({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });

    if (error) {
      setIdentityState("error");
      setIdentityMessage(
        error.message.toLowerCase().includes("manual")
          ? "Account linking is not enabled yet. Enable Manual Linking in Supabase Auth settings, then try again."
          : error.message,
      );
    }
  }

  async function disconnectIdentity(identity: UserIdentity) {
    if (!canUnlinkIdentity(identities, identity)) return;
    const provider = getProviderLabel(identity.provider);
    if (!window.confirm(`Disconnect ${provider}? You will no longer be able to sign in with this account.`)) {
      return;
    }

    setIdentityState("saving");
    setIdentityMessage(`Disconnecting ${provider}…`);
    const { error } = await createClient().auth.unlinkIdentity(identity);
    if (error) {
      setIdentityState("error");
      setIdentityMessage(error.message);
      return;
    }

    setIdentities((current) => current.filter((candidate) => candidate.id !== identity.id));
    setIdentityState("saved");
    setIdentityMessage(`${provider} disconnected.`);
  }

  async function signOutAllDevices() {
    if (!window.confirm("Sign out this account from every browser and device, including this one?")) {
      return;
    }
    setSignOutState("saving");
    setSignOutMessage("");
    const { error } = await createClient().auth.signOut({ scope: "global" });
    if (error) {
      setSignOutState("error");
      setSignOutMessage("We couldn't sign out every session. Please try again.");
      return;
    }
    router.replace("/login");
    router.refresh();
  }

  function updateNameDraft<K extends keyof NameChangeDraft>(key: K, value: NameChangeDraft[K]) {
    setNameDraft((current) => ({ ...current, [key]: value }));
    setNameRequestState("idle");
    setNameRequestMessage("");
  }

  async function submitNameChangeRequest() {
    if (!user) return;
    const validationError = validateNameChangeDraft(nameDraft);
    if (validationError) {
      setNameRequestState("error");
      setNameRequestMessage(validationError);
      return;
    }

    setNameRequestState("saving");
    setNameRequestMessage("Submitting your request…");
    const supabase = createClient();
    const { error } = await supabase.rpc("submit_author_name_change", {
      requested_first_name: cleanNamePart(nameDraft.firstName),
      requested_middle_name: cleanNamePart(nameDraft.middleName) || null,
      requested_last_name: cleanNamePart(nameDraft.lastName),
      request_reason: nameDraft.reason.trim(),
    });

    if (error) {
      setNameRequestState("error");
      setNameRequestMessage(
        /already pending/i.test(error.message)
          ? "You already have a name change request waiting for review."
          : "We couldn't submit this request. Please try again.",
      );
      return;
    }

    const { data } = await supabase
      .from("author_name_change_requests")
      .select("id,user_id,current_full_name,requested_first_name,requested_middle_name,requested_last_name,requested_full_name,reason,status,reviewed_at,review_note,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setLatestNameRequest((data as NameChangeRequest | null) ?? null);
    setNameRequestState("saved");
    setNameRequestMessage("Request submitted. Your current author name stays in place until Cerise approves it.");
  }

  const googleIdentity = identities.find((identity) => identity.provider === "google");
  const passwordEnabled = hasPasswordSignIn(user, identities);
  const contactEmailVerified = Boolean(user?.email_confirmed_at);

  return (
    <>
    <div>
      <SettingsPanel title="Account" description="Manage your account identity and account-related information.">
        <section className="rounded-[12px] border border-[#e5e1dc] bg-white p-4">
          <div className="grid gap-5 xl:grid-cols-[210px_minmax(0,1fr)]">
            <div className="grid content-start justify-items-center gap-2 border-[#eeeae5] xl:border-r xl:pr-5">
              <div className="relative">
                {avatarUrl ? <div className="h-28 w-28 rounded-full bg-cover bg-center sm:h-[120px] sm:w-[120px]" style={{ backgroundImage: `url(${avatarUrl})` }} /> : <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[#dcc197] text-2xl font-bold sm:h-[120px] sm:w-[120px]">{initials}</div>}
                <label className="absolute -bottom-2 -right-2 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-[#dedad5] bg-white shadow-[0_2px_9px_rgba(32,24,18,0.14)] transition hover:border-[#c9c2ba] hover:bg-[#faf9f7] focus-within:outline-none focus-within:ring-2 focus-within:ring-[#17120d] focus-within:ring-offset-2" aria-label="Upload profile photo" title="Change profile photo">
                  <Image alt="" aria-hidden="true" height={23} src="/icons/camera-outline.svg" width={23} />
                  <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} />
                </label>
              </div>
              <p className="mt-2 text-[10px] font-bold text-[#6f6760]">Member since</p>
              <p className="text-[11px] font-semibold text-[#17120d]">{formatDate(user?.created_at)}</p>
            </div>
            <div className="grid gap-3">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Field label="First name" value={text(form.first_name)} readOnly autoComplete="given-name" />
                <Field label="Middle name" value={text(form.middle_name)} readOnly autoComplete="additional-name" />
                <Field label="Last name" value={text(form.last_name)} readOnly autoComplete="family-name" />
                <div className="text-[10px] font-bold text-[#4f4842]">
                  <p>Author name</p>
                  <button
                    aria-label="Request an author name change"
                    className="mt-1.5 h-9 w-full rounded-[8px] border border-[#bdb6af] bg-white px-3 text-[10px] font-bold text-[#17120d] disabled:cursor-not-allowed disabled:bg-[#f7f5f2] disabled:text-[#6f6760]"
                    disabled={latestNameRequest?.status === "pending"}
                    onClick={() => {
                      setNameRequestOpen(true);
                      setNameRequestMessage("");
                      setNameRequestState("idle");
                    }}
                    title="Your author name is used on papers and requires Cerise admin approval to change."
                    type="button"
                  >
                    {latestNameRequest?.status === "pending"
                      ? "Request pending"
                      : latestNameRequest?.status === "rejected"
                        ? "Request again"
                        : "Request name change"}
                  </button>
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-[12px] font-bold text-[#17120d]">About</h3>
                <div className="grid gap-3 md:grid-cols-3">
                  <Field label="Primary research field" value={text(form.field_of_study)} onChange={(v) => update("field_of_study", v)} />
                  <SelectField label="Level of study" value={text(form.level_of_study)} onChange={(v) => update("level_of_study", v)} options={["", "Undergraduate", "Master's", "Doctoral", "Postdoctoral", "Faculty / Researcher", "Independent researcher"]} />
                  <InstitutionAutocomplete
                    selectedUnitId={form.institution_unitid}
                    value={text(form.institution)}
                    onChange={(name, unitId) => {
                      update("institution", name);
                      update("institution_unitid", unitId);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <SettingsSection title="Account Details" body="Manage the verified email Cerise Scholar uses to contact you.">
          <DetailLine
            label="Contact email"
            value={
              <div className="flex flex-wrap items-center gap-2">
                <input
                  aria-label="Contact email"
                  className="h-8 min-w-0 flex-1 rounded-[8px] border border-[#d8d3ce] bg-white px-3 text-[11px] font-semibold outline-none focus:border-[#17120d]"
                  onChange={(event) => {
                    setContactEmail(event.target.value);
                    setContactEmailState("idle");
                    setContactEmailMessage("");
                  }}
                  type="email"
                  value={contactEmail}
                />
                {pendingContactEmail ? (
                  <StatusBadge tone="pending">Pending verification</StatusBadge>
                ) : contactEmailVerified ? (
                  <StatusBadge tone="verified">Verified</StatusBadge>
                ) : (
                  <StatusBadge tone="pending">Verification needed</StatusBadge>
                )}
              </div>
            }
            action={
              <Button
                disabled={contactEmailState === "saving" || !contactEmail.trim()}
                onClick={changeContactEmail}
              >
                {contactEmailState === "saving" ? "Sending…" : "Update Email"}
              </Button>
            }
          />
          {pendingContactEmail ? (
            <p className="pb-2 text-[10px] leading-4 text-[#6f6760]">
              {pendingContactEmail} will replace {user?.email ?? "your current email"} after verification.
            </p>
          ) : null}
          {contactEmailMessage ? (
            <p
              aria-live="polite"
              className={`pb-2 text-[10px] font-semibold ${contactEmailState === "error" ? "text-[#c0392b]" : "text-[#3f7d4f]"}`}
            >
              {contactEmailMessage}
            </p>
          ) : null}
          {!identitiesLoaded ? (
            <DetailLine label="Password" value="Checking sign-in method…" />
          ) : passwordEnabled ? (
            <DetailLine
              label="Password"
              value={passwordState === "saved" ? "Reset link sent to your email" : passwordState === "error" ? "Couldn't send reset link" : "••••••••••••"}
              action={<Button onClick={changePassword} disabled={passwordState === "saving"}>Change Password</Button>}
            />
          ) : (
            <DetailLine
              label="Password"
              value={`Not set — sign in with ${getPrimarySignInLabel(identities)}`}
            />
          )}
        </SettingsSection>

        <SettingsSection title="Connected Accounts" body="Review the methods that can be used to sign in to this account.">
          <div className="grid gap-2">
            {!identitiesLoaded ? (
              <p className="py-3 text-[10px] font-semibold text-[#6f6760]">Checking connected accounts…</p>
            ) : identities.map((identity) => {
              const detail = getIdentityDetail(identity);
              const name = getIdentityName(identity);
              const canDisconnect = canUnlinkIdentity(identities, identity);
              return (
                <article
                  className="grid min-h-[58px] grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-[10px] border border-[#e5e1dc] px-3 py-2"
                  key={identity.id}
                >
                  <ProviderIcon provider={identity.provider} />
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-bold text-[#17120d]">{getProviderLabel(identity.provider)}</p>
                    <p className="truncate text-[10px] text-[#6f6760]">
                      {name === detail ? detail : `${name} · ${detail}`}
                    </p>
                  </div>
                  {canDisconnect ? (
                    <Button disabled={identityState === "saving"} onClick={() => disconnectIdentity(identity)}>
                      Disconnect
                    </Button>
                  ) : (
                    <span className="text-[9px] font-bold text-[#6f6760]">
                      {identities.length === 1 ? "Only sign-in method" : "Connected"}
                    </span>
                  )}
                </article>
              );
            })}
            {identitiesLoaded && !googleIdentity ? (
              <article className="grid min-h-[58px] grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-[10px] border border-dashed border-[#d8d3ce] px-3 py-2">
                <ProviderIcon provider="google" />
                <div>
                  <p className="text-[11px] font-bold text-[#17120d]">Google</p>
                  <p className="text-[10px] text-[#6f6760]">Add Google as another secure sign-in method.</p>
                </div>
                <Button disabled={identityState === "saving"} onClick={connectGoogle}>Connect</Button>
              </article>
            ) : null}
            {identityMessage ? (
              <p
                aria-live="polite"
                className={`text-[10px] font-semibold ${identityState === "error" ? "text-[#c0392b]" : "text-[#3f7d4f]"}`}
              >
                {identityMessage}
              </p>
            ) : null}
          </div>
        </SettingsSection>

        <SettingsSection title="Account Security" body="Review recent access and end active sign-ins when needed.">
          <DetailLine label="Last sign in" value={formatDate(user?.last_sign_in_at)} />
          <DetailLine
            label="Active sign-ins"
            value="Sign out this account from every browser and device, including this one."
            action={
              <Button disabled={signOutState === "saving"} onClick={signOutAllDevices}>
                {signOutState === "saving" ? "Signing out…" : "Sign Out All Devices"}
              </Button>
            }
          />
          {signOutMessage ? (
            <p aria-live="polite" className="pb-2 text-[10px] font-semibold text-[#c0392b]">{signOutMessage}</p>
          ) : null}
        </SettingsSection>

        <DeleteAccountSection />

        <div className="mt-3 flex min-h-5 items-center justify-end text-[11px] font-semibold" aria-live="polite">
          <span className={saveState === "error" ? "text-[#c0392b]" : saveState === "saved" ? "text-[#3f7d4f]" : "text-[#6f6760]"}>{message}</span>
        </div>
      </SettingsPanel>
    </div>
      {nameRequestOpen ? (
        <div aria-labelledby="name-change-title" aria-modal="true" className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-4" role="dialog">
          <div className="w-full max-w-[620px] rounded-[14px] border border-[#d8d3ce] bg-white p-5 shadow-[0_24px_70px_rgba(0,0,0,0.2)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold" id="name-change-title">Request an author name change</h2>
                <p className="mt-1 text-xs leading-5 text-[#6f6760]">This name appears on Cerise Scholar papers. Your current name remains active until an administrator reviews the request.</p>
              </div>
              <button aria-label="Close name change request" className="h-8 w-8 rounded-full border border-[#d8d3ce] text-sm" onClick={() => setNameRequestOpen(false)} type="button">×</button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Field label="Requested first name" value={nameDraft.firstName} onChange={(value) => updateNameDraft("firstName", value)} autoComplete="given-name" />
              <Field label="Requested middle name" value={nameDraft.middleName} onChange={(value) => updateNameDraft("middleName", value)} autoComplete="additional-name" />
              <Field label="Requested last name" value={nameDraft.lastName} onChange={(value) => updateNameDraft("lastName", value)} autoComplete="family-name" />
            </div>
            <label className="mt-4 block text-[10px] font-bold text-[#4f4842]">Reason for the change <span className="text-[#b42318]">*</span><textarea className="mt-1.5 min-h-28 w-full rounded-[8px] border border-[#d8d3ce] p-3 text-[11px] font-medium outline-none focus:border-[#17120d]" maxLength={1000} onChange={(event) => updateNameDraft("reason", event.target.value)} placeholder="Explain why your author name needs to change (at least 20 characters)." value={nameDraft.reason} /></label>
            <p className="mt-1 text-right text-[9px] text-[#7b7168]">{nameDraft.reason.trim().length}/1000</p>
            {nameRequestMessage ? <p aria-live="polite" className={`mt-3 rounded-[8px] px-3 py-2 text-[10px] font-semibold ${nameRequestState === "error" ? "bg-[#fff1f0] text-[#b42318]" : "bg-[#edf9f0] text-[#237a3b]"}`}>{nameRequestMessage}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <button className="h-9 rounded-[8px] border border-[#d8d3ce] px-4 text-xs font-bold" onClick={() => setNameRequestOpen(false)} type="button">{nameRequestState === "saved" ? "Close" : "Cancel"}</button>
              {nameRequestState !== "saved" ? <button className="h-9 rounded-[8px] bg-[#17120d] px-4 text-xs font-bold text-white disabled:opacity-50" disabled={nameRequestState === "saving"} onClick={() => void submitNameChangeRequest()} type="button">{nameRequestState === "saving" ? "Submitting…" : "Submit request"}</button> : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Field({ label, value, onChange, readOnly, autoComplete }: { label: string; value: string; onChange?: (value: string) => void; readOnly?: boolean; autoComplete?: string }) {
  return <label className="text-[10px] font-bold text-[#4f4842]">{label}<input className={`mt-1.5 h-9 w-full rounded-[8px] border border-[#d8d3ce] px-3 text-[11px] font-semibold outline-none focus:border-[#17120d] ${readOnly ? "bg-[#f7f5f2] text-[#6f6760]" : "bg-white text-[#17120d]"}`} value={value} onChange={(e) => onChange?.(e.target.value)} readOnly={readOnly} autoComplete={autoComplete} /></label>;
}

function SelectField({ label, value, onChange, options, labels }: { label: string; value: string; onChange: (value: string) => void; options: string[]; labels?: Record<string, string> }) {
  return <label className="text-[10px] font-bold text-[#4f4842]">{label}<select className="mt-1.5 h-9 w-full rounded-[8px] border border-[#d8d3ce] bg-white px-3 text-[11px] font-semibold outline-none focus:border-[#17120d]" value={value} onChange={(e) => onChange(e.target.value)}>{options.map((option) => <option key={option || "empty"} value={option}>{labels?.[option] ?? (option || "Select an option")}</option>)}</select></label>;
}

function SettingsSection({ body, children, title }: { body: string; children: ReactNode; title: string }) {
  return <section className="mt-3 grid gap-3 rounded-[12px] border border-[#e5e1dc] bg-white p-3 lg:grid-cols-[190px_minmax(0,1fr)]"><div className="border-[#eeeae5] lg:border-r lg:pr-4"><h3 className="text-[12px] font-bold">{title}</h3><p className="mt-1 text-[10px] leading-4 text-[#6f6760]">{body}</p></div><div className="min-w-0">{children}</div></section>;
}

function DetailLine({ action, label, value }: { action?: ReactNode; label: string; value: ReactNode }) {
  return <div className="grid min-h-9 gap-3 border-t border-[#eeeae5] py-2 first:border-t-0 md:grid-cols-[150px_minmax(0,1fr)_auto] md:items-center"><p className="text-[10px] font-bold text-[#4f4842]">{label}</p><div className="text-[11px] font-semibold">{value}</div>{action ? <div>{action}</div> : null}</div>;
}

function StatusBadge({ children, tone }: { children: ReactNode; tone: "pending" | "verified" }) {
  return (
    <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${tone === "verified" ? "bg-[#edf9f0] text-[#237a3b]" : "bg-[#fff7df] text-[#8a6514]"}`}>
      {children}
    </span>
  );
}

function ProviderIcon({ provider }: { provider: string }) {
  if (provider === "google") {
    return (
      <span className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-[#e5e1dc] bg-white" aria-hidden="true">
        <svg height="18" viewBox="0 0 18 18" width="18">
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.92v2.33A9 9 0 0 0 9 18z" />
          <path fill="#FBBC05" d="M3.97 10.72A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.92A9 9 0 0 0 0 9c0 1.45.35 2.82.92 4.05l3.05-2.33z" />
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .92 4.95l3.05 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
        </svg>
      </span>
    );
  }

  const icon = provider === "phone" ? "phone" : provider === "apple" ? "user" : "mail";
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-[#e5e1dc] bg-[#faf9f7]" aria-hidden="true">
      <AppIcon className="h-4 w-4" name={icon} />
    </span>
  );
}

function Button({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button className="h-7 rounded-[8px] border border-[#d8d3ce] px-3 text-[10px] font-bold disabled:opacity-50" type="button" onClick={onClick} disabled={disabled}>{children}</button>;
}
