"use client";

import { useEffect, useRef, useState } from "react";
import SettingsPanel from "@/components/app-ui/SettingsPanel";
import { AppIcon } from "@/components/app-shell/AppIcons";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase/client";
import { fetchUserPreferences, upsertUserPreferences } from "@/lib/profile/profile";

type SaveState = "idle" | "loading" | "saved" | "error";

export default function NotificationsSettingsPage() {
  const { user, loading } = useUser();
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [productEmailsEnabled, setProductEmailsEnabled] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  const savedNotificationsRef = useRef<boolean | null>(null);
  const saveRequestRef = useRef(0);

  useEffect(() => {
    if (loading || !user || loadedUserId === user.id) return;
    let mounted = true;
    void fetchUserPreferences(createClient(), user.id).then((preferences) => {
      if (!mounted) return;
      const nextProductEmailsEnabled = preferences?.email_updates_enabled ?? false;
      savedNotificationsRef.current = nextProductEmailsEnabled;
      setProductEmailsEnabled(nextProductEmailsEnabled);
      setLoadedUserId(user.id);
    });
    return () => { mounted = false; };
  }, [loadedUserId, loading, user]);

  useEffect(() => {
    if (!user || loadedUserId !== user.id || savedNotificationsRef.current === productEmailsEnabled) return;
    const requestId = ++saveRequestRef.current;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setSaveState("loading");
      setMessage("Saving notification settings…");
      void upsertUserPreferences(createClient(), user.id, {
        email_updates_enabled: productEmailsEnabled,
      }).then(({ error }) => {
        if (cancelled || requestId !== saveRequestRef.current) return;
        if (error) {
          setSaveState("error");
          setMessage("We couldn't save your notification settings. Change the switch to try again.");
          return;
        }
        savedNotificationsRef.current = productEmailsEnabled;
        setSaveState("saved");
        setMessage("Notification settings saved automatically.");
      });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [loadedUserId, productEmailsEnabled, user]);

  return (
    <div>
      <SettingsPanel
        title="Notifications"
        description="Choose which optional messages you receive from Cerise Scholar."
      >
        <section className="grid gap-3 rounded-[12px] border border-[#e5e1dc] bg-white p-4 lg:grid-cols-[190px_minmax(0,1fr)]">
          <div className="border-[#eeeae5] lg:border-r lg:pr-4">
            <h3 className="text-[12px] font-bold text-[#17120d]">Email notifications</h3>
            <p className="mt-1 text-[10px] leading-4 text-[#6f6760]">
              Manage optional email communication sent to your verified contact email.
            </p>
          </div>
          <div>
            <NotificationRow
              body="Occasional Cerise Scholar news, product changes, and beta invitations."
              checked={productEmailsEnabled}
              icon="mail"
              label="Product email updates"
              onChange={(checked) => {
                setProductEmailsEnabled(checked);
                setSaveState("idle");
                setMessage("");
              }}
            />
            <NotificationRow
              body="Password resets, sign-in notices, verification, and important account changes."
              checked
              disabled
              icon="shield"
              label="Account and security emails"
              note="Always on"
            />
          </div>
        </section>

        <section className="mt-3 rounded-[12px] border border-[#e5e1dc] bg-[#faf9f7] p-4">
          <div className="flex items-start gap-3">
            <AppIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#6f6760]" name="bell" />
            <div>
              <h3 className="text-[11px] font-bold text-[#17120d]">No research alerts are being sent yet</h3>
              <p className="mt-1 text-[10px] leading-4 text-[#6f6760]">
                Research-completion alerts, reminders, and digests are not active, so this page does not show switches that would have no effect. Those controls can be added when the delivery service is built.
              </p>
            </div>
          </div>
        </section>

        <p
          aria-live="polite"
          className={`mt-3 min-h-5 text-right text-[11px] font-semibold ${saveState === "error" ? "text-[#c0392b]" : saveState === "saved" ? "text-[#237a3b]" : "text-[#6f6760]"}`}
        >
          {loading ? "Loading notification settings…" : message}
        </p>
      </SettingsPanel>
    </div>
  );
}

function NotificationRow({
  body,
  checked,
  disabled = false,
  icon,
  label,
  note,
  onChange,
}: {
  body: string;
  checked: boolean;
  disabled?: boolean;
  icon: "mail" | "shield";
  label: string;
  note?: string;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <label className={`grid min-h-[58px] grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 border-b border-[#eeeae5] py-2.5 last:border-b-0 ${disabled ? "cursor-default" : "cursor-pointer"}`}>
      <AppIcon className="h-4 w-4 text-[#17120d]" name={icon} />
      <span>
        <span className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-[#17120d]">
          {label}
          {note ? <span className="rounded-full bg-[#f0ede9] px-2 py-0.5 text-[9px] text-[#6f6760]">{note}</span> : null}
        </span>
        <span className="mt-0.5 block text-[10px] leading-4 text-[#6f6760]">{body}</span>
      </span>
      <input
        aria-label={label}
        checked={checked}
        className="h-4 w-4 accent-[#17120d]"
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
        type="checkbox"
      />
    </label>
  );
}
