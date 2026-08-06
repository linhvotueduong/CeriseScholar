import type { SupabaseClient } from "@supabase/supabase-js";
import { logDashboardActivity } from "@/lib/dashboard/activity";
import { showToast } from "@/components/app-ui/Toast";

/**
 * Per-source Finish button (docs/research-readiness-checklist-model.md §7).
 * Shared by the two surfaces that can toggle it (§7.1: "Lives where the
 * finishing happens: the PDF viewer header + the document panel") so both
 * places write the same column, log the same event, and show the same
 * moment-of-completion toast copy.
 *
 * Un-finish (undo) is supported (§7.4.2) but only the FINISH transition logs
 * an activity event and shows a toast — un-finishing is a quiet correction,
 * not a moment worth celebrating or re-recommending.
 */
export async function toggleSourceFinished({
  supabase,
  pdfId,
  projectId,
  displayName,
  currentlyFinished,
  navigate,
}: {
  supabase: SupabaseClient;
  pdfId: string;
  projectId?: string | null;
  displayName: string;
  currentlyFinished: boolean;
  /** Client-side navigation (e.g. Next's `router.push`) for the toast's deep-link action. */
  navigate?: (href: string) => void;
}): Promise<{ ok: boolean; finishedAt: string | null }> {
  const nextFinishedAt = currentlyFinished ? null : new Date().toISOString();

  const { error } = await supabase.from("pdfs").update({ finished_at: nextFinishedAt }).eq("id", pdfId);
  if (error) {
    showToast({ message: "Couldn't update that source — try again." });
    return { ok: false, finishedAt: currentlyFinished ? nextFinishedAt : null };
  }

  if (!nextFinishedAt) {
    // Un-finish: quiet, no event, no toast.
    return { ok: true, finishedAt: null };
  }

  await logDashboardActivity({
    projectId,
    eventType: "source_review_finished",
    sectionId: "workspace",
    label: `Finished ${displayName}`,
  });

  // §7.1 all-sources milestone: automatic — fires only when THIS finish click
  // was the one that cleared the last unfinished source.
  let allSourcesFinished = false;
  if (projectId) {
    const [{ count: totalCount }, { count: unfinishedCount }] = await Promise.all([
      supabase.from("pdfs").select("id", { count: "exact", head: true }).eq("project_id", projectId),
      supabase.from("pdfs").select("id", { count: "exact", head: true }).eq("project_id", projectId).is("finished_at", null),
    ]);
    allSourcesFinished = (totalCount ?? 0) > 0 && (unfinishedCount ?? 0) === 0;
  }

  const litReviewHref = projectId
    ? `/dashboard/project/${projectId}/literature-review${
        allSourcesFinished ? "" : `?source=${encodeURIComponent(displayName)}`
      }`
    : undefined;

  if (allSourcesFinished) {
    showToast({
      message: "All sources captured 🎉",
      detail: "Time to review the whole table.",
      action: litReviewHref && navigate ? { label: "Review the table", onAction: () => navigate(litReviewHref) } : undefined,
    });
  } else {
    showToast({
      message: `${displayName} finished 🎉`,
      detail: "Recommended: review its rows before your next move.",
      action: litReviewHref && navigate ? { label: "Review its rows", onAction: () => navigate(litReviewHref) } : undefined,
    });
  }

  return { ok: true, finishedAt: nextFinishedAt };
}
