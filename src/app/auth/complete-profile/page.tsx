"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import InstitutionAutocomplete from "@/components/profile/InstitutionAutocomplete";
import { createClient } from "@/lib/supabase/client";
import { fetchProfile, upsertProfile, upsertUserPreferences } from "@/lib/profile/profile";

const PENDING_GOOGLE_PROFILE_KEY = "cerise_pending_google_signup_profile";
const ADMIN_EMAIL = "cerisescholar@gmail.com";

type OnboardingState = {
  firstName: string;
  middleName: string;
  lastName: string;
  field: string;
  level: string;
  institution: string;
  institutionUnitId: string | null;
  timezone: string;
};

const emptyState: OnboardingState = {
  firstName: "", middleName: "", lastName: "", field: "", level: "", institution: "", institutionUnitId: null,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
};

function meta(metadata: Record<string, unknown>, key: string) {
  return typeof metadata[key] === "string" ? String(metadata[key]).trim() : "";
}

export default function CompleteProfilePage() {
  const router = useRouter();
  const [form, setForm] = useState(emptyState);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [consentReady, setConsentReady] = useState(false);
  const [authorNameLocked, setAuthorNameLocked] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function prepare() {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
        return;
      }
      if (data.user.email?.toLowerCase() === ADMIN_EMAIL) {
        router.replace("/projects");
        return;
      }

      let metadata = data.user.user_metadata as Record<string, unknown>;
      const pending = window.localStorage.getItem(PENDING_GOOGLE_PROFILE_KEY);
      if (pending) {
        try {
          metadata = { ...metadata, ...(JSON.parse(pending) as Record<string, unknown>) };
          await supabase.auth.updateUser({ data: metadata });
        } finally {
          window.localStorage.removeItem(PENDING_GOOGLE_PROFILE_KEY);
        }
      }

      const existingProfile = await fetchProfile(supabase, data.user.id);
      const nameLocked = Boolean(existingProfile?.author_name_locked_at);
      setAuthorNameLocked(nameLocked);

      const consentResponse = await fetch("/api/account/consents", { method: "POST" });
      if (!mounted) return;
      if (!consentResponse.ok) {
        setError("We couldn't finish your legal consent record. Reload this page to try again.");
      } else {
        setConsentReady(true);
      }
      setForm((current) => ({
        ...current,
        firstName: nameLocked ? (existingProfile?.first_name ?? "") : meta(metadata, "first_name"),
        middleName: nameLocked ? (existingProfile?.middle_name ?? "") : meta(metadata, "middle_name"),
        lastName: nameLocked ? (existingProfile?.last_name ?? "") : meta(metadata, "last_name"),
      }));
      setReady(true);
    }
    void prepare();
    return () => { mounted = false; };
  }, [router]);

  function update<K extends keyof OnboardingState>(key: K, value: OnboardingState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function finish(skip = false) {
    setSaving(true);
    setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login"); return; }
    const firstName = form.firstName.trim();
    const middleName = form.middleName.trim();
    const lastName = form.lastName.trim();
    if (!authorNameLocked && (!firstName || !lastName)) {
      setError("Enter the first and last name you want shown on your papers.");
      setSaving(false);
      return;
    }
    if (!authorNameLocked) {
      const { data: locked, error: nameError } = await supabase.rpc("set_initial_author_name", {
        requested_first_name: firstName,
        requested_middle_name: middleName || null,
        requested_last_name: lastName,
      });
      if (nameError || locked === false) {
        setError(nameError ? "We couldn't confirm your author name. Please try again." : "Your author name is already fixed. Reload to continue.");
        setSaving(false);
        return;
      }
      const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");
      await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          first_name: firstName,
          middle_name: middleName || null,
          last_name: lastName,
          full_name: fullName,
          author_name_confirmed: true,
        },
      });
      setAuthorNameLocked(true);
    }
    const result = await upsertProfile(supabase, user.id, {
      field_of_study: skip ? null : form.field || null,
      level_of_study: skip ? null : form.level || null,
      institution: skip ? null : form.institution || null,
      institution_unitid: skip ? null : form.institutionUnitId,
      onboarding_completed: !skip,
    });
    const preferenceResult = await upsertUserPreferences(supabase, user.id, {
      timezone: form.timezone || "UTC",
    });
    if (result.error || preferenceResult.error) {
      setError("We couldn't save your profile. Please try again.");
      setSaving(false);
      return;
    }
    router.replace("/projects");
    router.refresh();
  }

  if (!ready) return <main className="flex min-h-screen items-center justify-center bg-[#f7f3ed]"><p className="text-sm font-semibold text-[#6f6255]">Preparing your account…</p></main>;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f3ed] px-5 py-10 text-[#1a1208]">
      <div className="w-full max-w-2xl rounded-[16px] border border-[#d4cdc5] bg-white p-7 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#c0392b]">Cerise Scholar</p>
        <h1 className="mt-3 text-2xl font-semibold">Set up your research profile</h1>
        <p className="mt-2 text-sm leading-6 text-[#6f6255]">Your author name is used on papers and requires admin approval to change later. Academic details remain optional and editable.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="First name" value={form.firstName} onChange={(v) => update("firstName", v)} readOnly={authorNameLocked} />
          <Field label="Middle name (optional)" value={form.middleName} onChange={(v) => update("middleName", v)} readOnly={authorNameLocked} />
          <Field label="Last name" value={form.lastName} onChange={(v) => update("lastName", v)} readOnly={authorNameLocked} />
          <Field label="Primary research field" value={form.field} onChange={(v) => update("field", v)} />
          <Field label="Level of study" value={form.level} onChange={(v) => update("level", v)} />
          <InstitutionAutocomplete
            className="sm:col-span-2"
            selectedUnitId={form.institutionUnitId}
            size="standard"
            value={form.institution}
            onChange={(name, unitId) => {
              update("institution", name);
              update("institutionUnitId", unitId);
            }}
          />
        </div>
        {error ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button className="h-11 rounded-[9px] border border-[#d4cdc5] px-5 text-sm font-semibold disabled:opacity-50" type="button" disabled={saving || !consentReady} onClick={() => void finish(true)}>Skip for now</button>
          <button className="h-11 rounded-[9px] bg-[#1a1208] px-6 text-sm font-semibold text-white disabled:opacity-50" type="button" disabled={saving || !consentReady} onClick={() => void finish(false)}>{saving ? "Saving…" : "Finish setup"}</button>
        </div>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, readOnly = false }: { label: string; value: string; onChange: (value: string) => void; readOnly?: boolean }) {
  return <label className="text-xs font-semibold text-[#5f5248]">{label}<input className={`mt-2 h-11 w-full rounded-[8px] border border-[#d4cdc5] px-3 text-sm outline-none focus:border-[#1a1208] ${readOnly ? "bg-[#f7f5f2] text-[#6f6760]" : "bg-white"}`} value={value} onChange={(event) => onChange(event.target.value)} readOnly={readOnly} /></label>;
}
