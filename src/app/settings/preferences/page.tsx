"use client";

import { useEffect, useRef, useState } from "react";
import SettingsPanel from "@/components/app-ui/SettingsPanel";
import { AppIcon } from "@/components/app-shell/AppIcons";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase/client";
import { fetchUserPreferences, upsertUserPreferences } from "@/lib/profile/profile";

type SaveState = "idle" | "loading" | "saved" | "error";

const languages = [
  { value: "en", label: "English" },
  { value: "vi", label: "Vietnamese" },
];

const timezones = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Ho_Chi_Minh",
  "Asia/Kuala_Lumpur",
  "Asia/Tokyo",
];
const timezoneOptions = timezones.map((value) => ({
  value,
  label: value.replaceAll("_", " "),
}));

export default function PreferencesSettingsPage() {
  const { user, loading } = useUser();
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("UTC");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  const savedPreferencesRef = useRef<string | null>(null);
  const saveRequestRef = useRef(0);

  useEffect(() => {
    if (loading || !user || loadedUserId === user.id) return;
    let mounted = true;
    void fetchUserPreferences(createClient(), user.id).then((preferences) => {
      if (!mounted) return;
      const nextLanguage = preferences?.preferred_language ?? "en";
      const nextTimezone = preferences?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
      savedPreferencesRef.current = JSON.stringify({ language: nextLanguage, timezone: nextTimezone });
      setLanguage(nextLanguage);
      setTimezone(nextTimezone);
      setLoadedUserId(user.id);
    });
    return () => { mounted = false; };
  }, [loadedUserId, loading, user]);

  useEffect(() => {
    if (!user || loadedUserId !== user.id) return;
    const snapshot = JSON.stringify({ language, timezone });
    if (snapshot === savedPreferencesRef.current) return;
    const requestId = ++saveRequestRef.current;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setSaveState("loading");
      setMessage("Saving preferences…");
      void upsertUserPreferences(createClient(), user.id, {
        preferred_language: language,
        timezone,
      }).then(({ error }) => {
        if (cancelled || requestId !== saveRequestRef.current) return;
        if (error) {
          setSaveState("error");
          setMessage("We couldn't save your preferences. Change a setting to try again.");
          return;
        }
        savedPreferencesRef.current = snapshot;
        setSaveState("saved");
        setMessage("Preferences saved automatically.");
      });
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [language, loadedUserId, timezone, user]);

  function markChanged() {
    setSaveState("idle");
    setMessage("");
  }

  return (
    <div>
      <SettingsPanel
        title="Preferences"
        description="Customize how Cerise Scholar displays information for you."
      >
        <section className="grid gap-3 rounded-[12px] border border-[#e5e1dc] bg-white p-4 lg:grid-cols-[190px_minmax(0,1fr)]">
          <div className="border-[#eeeae5] lg:border-r lg:pr-4">
            <h3 className="text-[12px] font-bold text-[#17120d]">Language & region</h3>
            <p className="mt-1 text-[10px] leading-4 text-[#6f6760]">
              Set the language and timezone used for your account.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <SelectField
              icon="globe"
              label="Preferred language"
              onChange={(value) => {
                setLanguage(value);
                markChanged();
              }}
              options={languages}
              value={language}
            />
            <SelectField
              icon="clock"
              label="Timezone"
              onChange={(value) => {
                setTimezone(value);
                markChanged();
              }}
              options={timezoneOptions}
              value={timezone}
            />
          </div>
        </section>

        <section className="mt-3 rounded-[12px] border border-[#e5e1dc] bg-[#faf9f7] p-4">
          <div className="flex items-start gap-3">
            <AppIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#6f6760]" name="settings" />
            <div>
              <h3 className="text-[11px] font-bold text-[#17120d]">Saved to your account</h3>
              <p className="mt-1 text-[10px] leading-4 text-[#6f6760]">
                These preferences follow you when you sign in on another device. Changing your preferred language does not translate research papers or source text.
              </p>
            </div>
          </div>
        </section>

        <p
          aria-live="polite"
          className={`mt-3 min-h-5 text-right text-[11px] font-semibold ${saveState === "error" ? "text-[#c0392b]" : saveState === "saved" ? "text-[#237a3b]" : "text-[#6f6760]"}`}
        >
          {loading ? "Loading preferences…" : message}
        </p>
      </SettingsPanel>
    </div>
  );
}

function SelectField({
  icon,
  label,
  onChange,
  options,
  value,
}: {
  icon: "clock" | "globe";
  label: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  value: string;
}) {
  return (
    <label className="text-[10px] font-bold text-[#4f4842]">
      <span className="flex items-center gap-2">
        <AppIcon className="h-4 w-4" name={icon} />
        {label}
      </span>
      <select
        className="mt-2 h-10 w-full rounded-[8px] border border-[#d8d3ce] bg-white px-3 text-[11px] font-semibold text-[#17120d] outline-none focus:border-[#17120d]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}
