"use client";

import { AppIcon } from "@/components/app-shell/AppIcons";
import PageHeader from "@/components/app-ui/PageHeader";

export default function SettingsHeader() {
  return (
    <PageHeader
      className="settingsHeader mb-0 px-1 pb-3 pt-1 lg:items-center"
      actions={
        <>
          <label className="flex h-11 w-[250px] items-center gap-2 rounded-[9px] border border-[#e1ded9] bg-white px-4 text-[13px] text-[#6f6760] shadow-[0_1px_2px_rgba(17,17,17,0.02)]">
            <AppIcon className="h-4 w-4" name="search" />
            <input className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold outline-none placeholder:text-[#8a837b]" placeholder="Search..." type="search" />
            <span className="rounded-[7px] bg-[#f2efec] px-2 py-0.5 text-[11px] font-bold text-[#4f4842]">⌘K</span>
          </label>
          <button className="inline-flex h-11 items-center gap-3 rounded-[9px] bg-[#111111] px-7 text-[13px] font-bold text-white shadow-[0_8px_18px_rgba(17,17,17,0.12)]" type="button">
            Save Settings
          </button>
        </>
      }
      title="Settings"
      subtitle="Manage your account identity, local setup, privacy, and preferences."
    />
  );
}
