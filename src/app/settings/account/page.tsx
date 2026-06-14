"use client";

import { useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { upsertProfile } from "@/lib/profile/profile";
import { AppIcon } from "@/components/app-shell/AppIcons";
import SettingsPanel from "@/components/app-ui/SettingsPanel";

type SaveState = "idle" | "saving" | "saved" | "error";

function usernameFromName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, ".") || "jane.smith";
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export default function AccountSettingsPage() {
  const { user, displayName, avatarUrl, bio, initials, loading } = useProfile("Jane Smith");

  // Local form state, seeded once the profile (or metadata fallback) resolves.
  const [name, setName] = useState("");
  const [about, setAbout] = useState("");
  const [seededFor, setSeededFor] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [passwordState, setPasswordState] = useState<SaveState>("idle");
  const [passwordMessage, setPasswordMessage] = useState("");
  // The last persisted values, so a blur with no change is a no-op.
  const [savedSnapshot, setSavedSnapshot] = useState({ name: "", about: "" });

  // Seed the form from loaded data during render (React's supported pattern for
  // deriving state from async props) rather than in an effect.
  if (!loading && user && seededFor !== user.id) {
    const initialName = displayName === "Jane Smith" ? "" : displayName;
    setName(initialName);
    setAbout(bio);
    setSavedSnapshot({ name: initialName, about: bio });
    setSeededFor(user.id);
  }

  async function persist(fields: { name?: string; about?: string }) {
    if (!user) return;

    const nextName = (fields.name ?? name).trim();
    const nextAbout = (fields.about ?? about).trim();

    // Skip if nothing actually changed.
    if (nextName === savedSnapshot.name && nextAbout === savedSnapshot.about) {
      return;
    }

    setSaveState("saving");
    setSaveMessage("Saving…");

    const { firstName, lastName } = splitName(nextName);
    const supabase = createClient();

    const { error } = await upsertProfile(supabase, user.id, {
      full_name: nextName || null,
      first_name: firstName || null,
      last_name: lastName || null,
      bio: nextAbout || null,
    });

    if (error) {
      setSaveState("error");
      setSaveMessage("Couldn't save — please try again.");
      return;
    }

    // Mirror name into auth metadata so any metadata-based fallback stays in sync.
    await supabase.auth.updateUser({
      data: {
        ...(user.user_metadata || {}),
        full_name: nextName,
        first_name: firstName,
        last_name: lastName,
      },
    });

    setSavedSnapshot({ name: nextName, about: nextAbout });
    setSaveState("saved");
    setSaveMessage("All changes saved.");
  }

  async function handleChangePassword() {
    if (!user?.email) return;
    setPasswordState("saving");
    setPasswordMessage("Sending reset link…");

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      setPasswordState("error");
      setPasswordMessage("Couldn't send the link — please try again.");
      return;
    }

    setPasswordState("saved");
    setPasswordMessage(`We've emailed a reset link to ${user.email}.`);
  }

  const username = usernameFromName(name || displayName);

  return (
    <SettingsPanel
      className="h-[780px] min-h-[780px] max-h-[780px] pb-9"
      title="Account"
      description="Manage your account identity and account-related information."
    >
      <section className="min-h-[200px] rounded-[12px] border border-[#e5e1dc] bg-white p-3">
        <div className="grid gap-4 lg:grid-cols-[210px_minmax(0,1fr)]">
          <div className="grid content-start justify-items-center gap-2 border-[#eeeae5] lg:border-r lg:pr-4">
            {avatarUrl ? (
              <div
                aria-hidden="true"
                className="h-[80px] w-[80px] rounded-full bg-cover bg-center"
                style={{ backgroundImage: `url(${avatarUrl})` }}
              />
            ) : (
              <div className="flex h-[80px] w-[80px] items-center justify-center rounded-full bg-[#dcc197] text-[20px] font-bold text-[#111111]">
                {initials}
              </div>
            )}
            <button className="inline-flex h-8 items-center gap-2 rounded-[8px] border border-[#d8d3ce] px-3 text-[11px] font-bold text-[#17120d]" type="button">
              <AppIcon className="h-4 w-4" name="upload" />
              Change photo
            </button>
          </div>

          <div className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-[12px] font-bold text-[#4f4842]">
                Full name
                <input
                  className="mt-2 h-10 w-full rounded-[8px] border border-[#d8d3ce] bg-white px-3 text-[13px] font-semibold text-[#17120d] outline-none focus:border-[#17120d]"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  onBlur={() => void persist({ name })}
                  placeholder="Your name"
                />
              </label>
              <label className="text-[12px] font-bold text-[#4f4842]">
                Email address
                <input
                  className="mt-2 h-10 w-full rounded-[8px] border border-[#d8d3ce] bg-[#f7f5f2] px-3 text-[13px] font-semibold text-[#6f6760] outline-none"
                  value={user?.email || "jane.smith@cerisescholar.app"}
                  readOnly
                />
              </label>
            </div>
            <label className="text-[12px] font-bold text-[#4f4842]">
              About
              <textarea
                className="mt-1.5 min-h-[64px] w-full resize-y rounded-[8px] border border-[#d8d3ce] bg-white px-3 py-2 text-[12px] font-semibold leading-4 text-[#17120d] outline-none focus:border-[#17120d]"
                value={about}
                onChange={(event) => setAbout(event.target.value)}
                onBlur={() => void persist({ about })}
                placeholder="Briefly describe yourself and your work."
              />
              <span
                className={`mt-0.5 block text-[10px] font-semibold ${
                  saveState === "error"
                    ? "text-[#c0392b]"
                    : saveState === "saved"
                    ? "text-[#3f7d4f]"
                    : "text-[#6f6760]"
                }`}
              >
                {saveState === "idle"
                  ? "Briefly describe yourself and your work."
                  : saveMessage}
              </span>
            </label>
          </div>
        </div>
      </section>

      <SettingsSection
        body="Update your account credentials and manage connected accounts."
        title="Account Details"
      >
        <DetailLine label="Username" value={username} />
        <DetailLine
          label="Password"
          value={
            passwordState === "idle" ? (
              "••••••••••••••"
            ) : (
              <span
                className={
                  passwordState === "error"
                    ? "text-[#c0392b]"
                    : passwordState === "saved"
                    ? "text-[#3f7d4f]"
                    : "text-[#6f6760]"
                }
              >
                {passwordMessage}
              </span>
            )
          }
          action={
            <Button onClick={handleChangePassword} disabled={passwordState === "saving"}>
              Change Password
            </Button>
          }
        />
        <DetailLine
          label="Connected accounts"
          value={
            <span className="flex items-center gap-3">
              <span className="text-[15px] font-bold text-[#4285f4]">G</span>
              <AppIcon className="h-4 w-4 text-[#17120d]" name="book-open" />
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#a6c94a] text-[10px] font-bold text-white">id</span>
            </span>
          }
          action={<Button>Manage Connections</Button>}
        />
      </SettingsSection>

      <SettingsSection
        body="Choose how your account behaves across Cerise Scholar."
        title="Account Preferences"
      >
        <PreferenceLine icon="mail" title="Communication preferences" body="Choose how we contact you." />
        <PreferenceLine icon="globe" title="Language preference" body="Set your preferred language." value="English" />
        <PreferenceLine icon="clock" title="Timezone" body="Set your current timezone." value="(UTC+8) Kuala Lumpur" />
      </SettingsSection>

      <SettingsSection
        body="Review your recent activity and account history."
        title="Account Activity"
      >
        <PreferenceLine icon="shield" title="Login history" body="See devices and locations where you've signed in." />
        <PreferenceLine icon="lock" title="Active sessions" body="Manage your active sessions across devices." />
      </SettingsSection>
    </SettingsPanel>
  );
}

function SettingsSection({
  body,
  children,
  title,
}: {
  body: string;
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="mt-3 grid min-h-[100px] gap-3 rounded-[12px] border border-[#e5e1dc] bg-white p-3 lg:grid-cols-[210px_minmax(0,1fr)]">
      <div className="border-[#eeeae5] lg:border-r lg:pr-4">
        <h3 className="text-[13px] font-bold text-[#17120d]">{title}</h3>
        <p className="mt-0.5 text-[10px] font-semibold leading-[15px] text-[#6f6760]">{body}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function DetailLine({
  action,
  label,
  value,
}: {
  action?: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="grid min-h-[35px] gap-3 border-t border-[#eeeae5] py-1.5 first:border-t-0 md:grid-cols-[160px_minmax(0,1fr)_auto] md:items-center">
      <p className="text-[11px] font-bold text-[#4f4842]">{label}</p>
      <div className="min-w-0 text-[11px] font-semibold text-[#17120d]">{value}</div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

function PreferenceLine({
  body,
  icon,
  title,
  value,
}: {
  body: string;
  icon: "clock" | "globe" | "lock" | "mail" | "shield";
  title: string;
  value?: string;
}) {
  return (
    <div className="grid min-h-[39px] grid-cols-[28px_minmax(0,1fr)_auto_14px] items-center gap-3 border-t border-[#eeeae5] py-1.5 first:border-t-0">
      <AppIcon className="h-4.5 w-4.5 text-[#17120d]" name={icon} />
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-[#17120d]">{title}</p>
        <p className="text-[10px] font-semibold leading-3.5 text-[#6f6760]">{body}</p>
      </div>
      {value ? <span className="text-[11px] font-semibold text-[#17120d]">{value}</span> : null}
      <AppIcon className="h-3.5 w-3.5 -rotate-90 text-[#7b7168]" name="chevron-down" />
    </div>
  );
}

function Button({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className="h-7 rounded-[8px] border border-[#d8d3ce] px-3 text-[10px] font-bold text-[#17120d] disabled:opacity-50"
      type="button"
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
