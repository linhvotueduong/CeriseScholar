# Handoff: Move Redundant Backup Folders to Trash — for Codex

**Date:** 2026-07-07
**From:** Claude (Fable) session — investigation complete, execution handed to Codex per founder instruction.
**Founder's rule:** move folders to the **macOS Trash only** (never `rm -rf`, never permanent deletion). The founder empties the Trash himself as the final step.

## Context

The founder's `~/Documents` accumulated 11 CeriseScholar-related sibling folders. A read-only
investigation (2026-07-07) verified which are redundant. Everything valuable is already
protected:

- Main repo `~/Documents/CeriseScholar`, branch `pivot/openrouter-phase-1`, checkpoint commit
  `d082bf7` (2026-07-07) — **pushed to GitHub** (`origin/pivot/openrouter-phase-1`).
- Every backup folder's git content was verified to be an ancestor of pushed branches on
  `github.com/linhvotueduong/CeriseScholar` (details per folder below).

## Current state (verified 2026-07-07, after a stopped first attempt)

**No folder has been moved yet.** A first attempt via Finder failed with
"The operation can't be completed because the item needs to be downloaded" (-8013):
Documents is iCloud-synced with Optimize Mac Storage, so most of these folders are
**evicted placeholders**. macOS cannot Trash a dataless item — it must be downloaded first.

## The task

For each folder in the table below, in order (smallest first is fine):

1. Trigger download: `brctl download "<path>"` (recursive; re-run if needed).
2. Wait until materialized, then move to Trash via Finder (NOT rm):
   `osascript -e 'tell application "Finder" to delete POSIX file "<path>"'`
   Retry with waits — downloads for the multi-GB folders take a while.
3. After ALL four **worktree** folders are in the Trash, clean the main repo's registry:
   `git -C /Users/mrperfect/Documents/CeriseScholar worktree prune`
   then verify with `git -C /Users/mrperfect/Documents/CeriseScholar worktree list`
   (only the main checkout should remain).
4. Report to the founder what's in the Trash; he empties it himself.

A ready-made retry-loop script from the first attempt exists and may be reused/adapted; it
downloads all folders and Trash-moves each as it becomes available (20-min timeout):
`/private/tmp/claude-501/-Users-mrperfect/da0b29fd-c1be-4b04-b54d-d451ca571a45/scratchpad/trash-backups.sh`
(session-scoped path — may be gone in a new session; the 2 commands above are all it does).

## The list — move these 10 to Trash (~7.11 GB)

| # | Path (under /Users/mrperfect/Documents) | Size | Type / evidence it's redundant |
|---|---|---|---|
| 1 | `CeriseScholar-safety-20260503-051555` | 16K | 4 text notes from a May 3 checkpoint; commit referenced is long in main history |
| 2 | `CeriseScholar-restore-audit-20260502-212613` | 240K | Recovery-audit notes + tgz; describes migrations 001–010 era, now superseded (through 028) |
| 3 | `CeriseScholar-before-design` | 2.4M | **git worktree** at `05eada1`, ancestor of `main`; node_modules is a symlink |
| 4 | `CeriseScholar-before-apr19-redesign` | 2.4M | **git worktree** at `0a772d7`, ancestor of `main` |
| 5 | `CeriseScholar-backups` | 270M | Old clone + working snapshot from May 2; nothing unique (see .env note below) |
| 6 | `Codex/2026-05-05` | 530M | Unrelated third-party repo clone (`nexu-io/open-design`), re-clonable. **Trash ONLY this subfolder — keep the `Codex` parent folder and its other subfolders** |
| 7 | `CeriseScholar-restore-old-app` | 580M | **git worktree**, branch `restore/old-app-before-design` at `05eada1` (ancestor of main); 578M is node_modules |
| 8 | `CeriseScholar-backup` | 728M | Independent clone, branch `codex/recover-real-cerise-scholar` at `254eee6` — verified ancestor of `origin/main`; 92% node_modules/.next |
| 9 | `CeriseScholar-legal-dev-generated-backups` | 1.3G | Pure `.next` build-cache backups + one duplicate legal page already in main repo |
| 10 | `CeriseScholar-legal-dev` | 3.7G | **git worktree**, branch `legal-consent-dev-20260503-051555` pushed to origin; 3.66G is node_modules/.next/debug backups; `.env.local` is a symlink, not a real secret copy |

Worktree folders (items 3, 4, 7, 10) are why step 3 (`worktree prune`) exists.

## DO NOT TOUCH

- `~/Documents/CeriseScholar` — the live app.
- `~/Documents/Website` — **quarantined legacy repo, KEEP** per `docs/legacy-vite-quarantine.md`.
  It contains uncommitted Jul 6–7 work and unique brand assets found nowhere else
  (`exports/` landscape-background video ~34M, root `cherry-character-*.png` ×3). A separate,
  founder-approved decision is needed before that folder is ever archived; extracting those
  assets into the main repo is a possible future task, not this one.
- `~/Documents/Codex` parent folder and its `2026-05-30`, `2026-06-23` subfolders (active
  tool workspace) — only the `2026-05-05` subfolder goes to Trash.

## Notes

- **Secrets awareness:** items 5 and 8 contain real (old) `.env.local` copies with the same
  Supabase/Ollama key names still in use. Trashing is fine; once the founder empties the
  Trash those copies are gone. Optional future hygiene: rotate those keys.
- Expect the -8013 "needs to be downloaded" error until a folder is fully materialized —
  that is the retry condition, not a failure.
- Full investigation details (per-folder git verification) are in the Claude session of
  2026-07-07; the summary table above is self-sufficient for this task.
