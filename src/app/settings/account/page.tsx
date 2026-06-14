"use client";

import type { ReactNode } from "react";
import { useUser } from "@/hooks/useUser";
import { AppIcon } from "@/components/app-shell/AppIcons";
import SettingsPanel from "@/components/app-ui/SettingsPanel";

function profileName(metadata: Record<string, unknown> | undefined, email?: string) {
  return (typeof metadata?.full_name === "string" && metadata.full_name) || email?.split("@")[0] || "Jane Smith";
}

function usernameFromName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, ".") || "jane.smith";
}

export default function AccountSettingsPage() {
  const { user } = useUser();
  const name = profileName(user?.user_metadata, user?.email);
  const username = usernameFromName(name);
  const avatar =
    typeof user?.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : "";

  return (
    <SettingsPanel
      className="h-[780px] min-h-[780px] max-h-[780px] pb-9"
      title="Account"
      description="Manage your account identity and account-related information."
    >
      <section className="min-h-[200px] rounded-[12px] border border-[#e5e1dc] bg-white p-3">
        <div className="grid gap-4 lg:grid-cols-[210px_minmax(0,1fr)]">
          <div className="grid content-start justify-items-center gap-2 border-[#eeeae5] lg:border-r lg:pr-4">
            {avatar ? (
              <div
                aria-hidden="true"
                className="h-[80px] w-[80px] rounded-full bg-cover bg-center"
                style={{ backgroundImage: `url(${avatar})` }}
              />
            ) : (
              <div className="flex h-[80px] w-[80px] items-center justify-center rounded-full bg-[#dcc197] text-[20px] font-bold text-[#111111]">
                {name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <button className="inline-flex h-8 items-center gap-2 rounded-[8px] border border-[#d8d3ce] px-3 text-[11px] font-bold text-[#17120d]" type="button">
              <AppIcon className="h-4 w-4" name="upload" />
              Change photo
            </button>
          </div>

          <div className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Full name" value={name} />
              <Field label="Email address" value={user?.email || "jane.smith@cerisescholar.app"} />
            </div>
            <label className="text-[12px] font-bold text-[#4f4842]">
              About
              <textarea
                className="mt-1.5 min-h-[64px] w-full resize-y rounded-[8px] border border-[#d8d3ce] bg-white px-3 py-2 text-[12px] font-semibold leading-4 text-[#17120d] outline-none focus:border-[#17120d]"
                defaultValue="Researcher and lifelong learner."
              />
              <span className="mt-0.5 block text-[10px] font-semibold text-[#6f6760]">
                Briefly describe yourself and your work.
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
          value="••••••••••••••"
          action={<Button>Change Password</Button>}
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="text-[12px] font-bold text-[#4f4842]">
      {label}
      <input
        className="mt-2 h-10 w-full rounded-[8px] border border-[#d8d3ce] bg-white px-3 text-[13px] font-semibold text-[#17120d] outline-none focus:border-[#17120d]"
        defaultValue={value}
      />
    </label>
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

function Button({ children }: { children: ReactNode }) {
  return (
    <button className="h-7 rounded-[8px] border border-[#d8d3ce] px-3 text-[10px] font-bold text-[#17120d]" type="button">
      {children}
    </button>
  );
}
