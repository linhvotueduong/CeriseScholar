"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SettingsPanel from "@/components/app-ui/SettingsPanel";
import { AppIcon } from "@/components/app-shell/AppIcons";

type ActionState = "idle" | "loading" | "error";

const DELETE_CONFIRM_WORD = "DELETE";

export default function DangerZoneSettingsPage() {
  const router = useRouter();

  const [signOutState, setSignOutState] = useState<ActionState>("idle");
  const [signOutMessage, setSignOutMessage] = useState("");

  const [confirmText, setConfirmText] = useState("");
  const [deleteState, setDeleteState] = useState<ActionState>("idle");
  const [deleteMessage, setDeleteMessage] = useState("");

  async function handleSignOutAllDevices() {
    setSignOutState("loading");
    setSignOutMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signOut({ scope: "global" });

    if (error) {
      setSignOutState("error");
      setSignOutMessage("Couldn't sign out all devices. Please try again.");
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  async function handleDeleteAccount() {
    if (confirmText.trim() !== DELETE_CONFIRM_WORD) {
      return;
    }

    setDeleteState("loading");
    setDeleteMessage("");

    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setDeleteState("error");
        setDeleteMessage(data?.error || "Something went wrong. Please try again.");
        return;
      }

      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch {
      setDeleteState("error");
      setDeleteMessage("Something went wrong. Please try again.");
    }
  }

  const canDelete = confirmText.trim() === DELETE_CONFIRM_WORD && deleteState !== "loading";

  return (
    <SettingsPanel
      title="Danger Zone"
      description="Irreversible and destructive actions. Please proceed with caution."
      danger
    >
      <div className="flex flex-col gap-3">
        <div className="flex min-h-[58px] items-center gap-3 rounded-[12px] border border-[#f0c7c2] bg-[#fff1f0] px-3 py-2.5">
          <AppIcon className="h-5 w-5 text-[#d92d20]" name="alert" />
          <div>
            <p className="text-[12px] font-bold text-[#17120d]">Actions in this section cannot be undone.</p>
            <p className="mt-0.5 text-[10px] text-[#7b2f28]">Make sure you&apos;re ready before continuing.</p>
          </div>
        </div>

        <article className="rounded-[12px] border border-[#e5e1dc] bg-white p-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h3 className="text-[14px] font-bold text-[#111111]">Sign out all devices</h3>
              <p className="mt-1 text-[12px] text-[#625a52]">
                End every active session for your account, including this one.
              </p>
              <ul className="mt-2 grid gap-1 text-[11px] text-[#4f4842]">
                <li className="flex items-center gap-2">
                  <AppIcon className="h-3.5 w-3.5" name="check-square" />
                  All devices, including this one, will be signed out
                </li>
                <li className="flex items-center gap-2">
                  <AppIcon className="h-3.5 w-3.5" name="check-square" />
                  You&apos;ll need to sign in again afterward
                </li>
              </ul>
              {signOutState === "error" && (
                <p className="mt-2 text-[11px] font-semibold text-[#d92d20]">{signOutMessage}</p>
              )}
            </div>
            <button
              className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-[#e5e1dc] px-4 text-[12px] font-bold text-[#17120d] disabled:opacity-50"
              disabled={signOutState === "loading"}
              onClick={handleSignOutAllDevices}
              type="button"
            >
              <AppIcon className="h-4 w-4" name="lock" />
              {signOutState === "loading" ? "Signing out…" : "Sign Out All Devices"}
            </button>
          </div>
        </article>

        <article className="rounded-[12px] border border-[#e5e1dc] bg-white p-4">
          <h3 className="text-[14px] font-bold text-[#111111]">Delete account</h3>
          <p className="mt-1 text-[12px] text-[#625a52]">
            Permanently delete your Cerise Scholar account and everything in it.
          </p>
          <ul className="mt-2 grid gap-1 text-[11px] text-[#4f4842]">
            <li className="flex items-center gap-2">
              <AppIcon className="h-3.5 w-3.5" name="check-square" />
              Your research projects, files, notes, and course progress are permanently removed
            </li>
            <li className="flex items-center gap-2">
              <AppIcon className="h-3.5 w-3.5" name="check-square" />
              Your saved AI key record is deleted — the key itself still lives in your OpenRouter account
            </li>
            <li className="flex items-center gap-2">
              <AppIcon className="h-3.5 w-3.5" name="check-square" />
              This cannot be undone
            </li>
          </ul>

          <div className="mt-3 flex flex-col gap-2 border-t border-[#eeeae5] pt-3 sm:flex-row sm:items-center">
            <label className="flex-1 text-[11px] font-bold text-[#4f4842]">
              Type DELETE to confirm
              <input
                className="mt-1.5 h-9 w-full rounded-[8px] border border-[#d8d3ce] bg-white px-3 text-[12px] font-semibold text-[#17120d] outline-none focus:border-[#d92d20]"
                onChange={(event) => setConfirmText(event.target.value)}
                placeholder="DELETE"
                type="text"
                value={confirmText}
              />
            </label>
            <button
              className="mt-2 inline-flex h-10 shrink-0 items-center gap-2 rounded-[8px] bg-[#d92d20] px-4 text-[12px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:mt-6"
              disabled={!canDelete}
              onClick={handleDeleteAccount}
              type="button"
            >
              <AppIcon className="h-4 w-4" name="trash" />
              {deleteState === "loading" ? "Deleting…" : "Delete Account"}
            </button>
          </div>
          {deleteState === "error" && (
            <p className="mt-2 text-[11px] font-semibold text-[#d92d20]">{deleteMessage}</p>
          )}
        </article>
      </div>
    </SettingsPanel>
  );
}
