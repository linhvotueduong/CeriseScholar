"use client";

import { useState } from "react";
import { AppIcon } from "@/components/app-shell/AppIcons";
import { createClient } from "@/lib/supabase/client";

type ActionState = "idle" | "loading" | "error";

const DELETE_CONFIRM_WORD = "DELETE";

export default function DeleteAccountSection() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleteState, setDeleteState] = useState<ActionState>("idle");
  const [deleteMessage, setDeleteMessage] = useState("");

  function closeDialog() {
    if (deleteState === "loading") return;
    setDialogOpen(false);
    setConfirmText("");
    setDeleteState("idle");
    setDeleteMessage("");
  }

  async function handleDeleteAccount() {
    if (confirmText.trim() !== DELETE_CONFIRM_WORD || deleteState === "loading") return;

    setDeleteState("loading");
    setDeleteMessage("");

    try {
      const response = await fetch("/api/account/delete", { method: "POST" });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setDeleteState("error");
        setDeleteMessage(data?.error || "Something went wrong. Please try again.");
        return;
      }

      const supabase = createClient();
      const { error: signOutError } = await supabase.auth.signOut({ scope: "global" });
      if (signOutError) await supabase.auth.signOut({ scope: "local" });
      window.location.assign("/");
    } catch {
      setDeleteState("error");
      setDeleteMessage("Something went wrong. Please try again.");
    }
  }

  const canDelete = confirmText.trim() === DELETE_CONFIRM_WORD && deleteState !== "loading";

  return (
    <>
      <section className="mt-3 grid gap-3 rounded-[12px] border border-[#efc2be] bg-[#fffafa] p-3 lg:grid-cols-[190px_minmax(0,1fr)]">
        <div className="border-[#f3d6d2] lg:border-r lg:pr-4">
          <h3 className="text-[12px] font-bold text-[#b42318]">Danger Zone</h3>
          <p className="mt-1 text-[10px] leading-4 text-[#7b2f28]">Permanent account actions.</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold text-[#17120d]">Delete account</p>
            <p className="mt-0.5 text-[10px] text-[#6f6760]">Permanently remove your account and all Cerise Scholar data.</p>
          </div>
          <button
            className="h-8 shrink-0 rounded-[8px] border border-[#d92d20] bg-white px-3 text-[10px] font-bold text-[#b42318] hover:bg-[#fff1f0]"
            onClick={() => setDialogOpen(true)}
            type="button"
          >
            Delete Account
          </button>
        </div>
      </section>

      {dialogOpen ? (
        <div aria-labelledby="delete-account-title" aria-modal="true" className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4" role="dialog">
          <div className="w-full max-w-[540px] rounded-[14px] border border-[#efc2be] bg-white p-5 shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fff1f0] text-[#d92d20]">
                <AppIcon className="h-5 w-5" name="alert" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-[#17120d]" id="delete-account-title">Permanently delete your account?</h2>
                <p className="mt-1 text-xs leading-5 text-[#6f6760]">This removes your projects, files, notes, saved evidence, profile, preferences, and stored AI-key record. This cannot be undone.</p>
              </div>
            </div>

            <label className="mt-5 block text-[11px] font-bold text-[#4f4842]">
              Type DELETE to confirm
              <input
                autoComplete="off"
                className="mt-1.5 h-10 w-full rounded-[8px] border border-[#d8d3ce] bg-white px-3 text-[12px] font-semibold text-[#17120d] outline-none focus:border-[#d92d20]"
                onChange={(event) => {
                  setConfirmText(event.target.value);
                  setDeleteState("idle");
                  setDeleteMessage("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.preventDefault();
                }}
                placeholder="DELETE"
                type="text"
                value={confirmText}
              />
            </label>

            {deleteState === "error" ? (
              <p aria-live="polite" className="mt-3 rounded-[8px] bg-[#fff1f0] px-3 py-2 text-[11px] font-semibold text-[#b42318]">{deleteMessage}</p>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <button className="h-9 rounded-[8px] border border-[#d8d3ce] px-4 text-xs font-bold" disabled={deleteState === "loading"} onClick={closeDialog} type="button">Cancel</button>
              <button className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-[#d92d20] px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-45" disabled={!canDelete} onClick={() => void handleDeleteAccount()} type="button">
                <AppIcon className="h-4 w-4" name="trash" />
                {deleteState === "loading" ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
