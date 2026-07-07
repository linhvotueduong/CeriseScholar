// Client-side data access for the `evidence_library` table
// (supabase/migrations/027_evidence_library.sql) — the single source of
// truth behind:
//   - the Evidence Library card on /research-desk
//   - the full-page view at /research-desk/evidence-library
//   - the Save button in ScholarAsk's paper panel (writes here directly)
//
// Kept as plain functions (not a hook) so ScholarAsk's Save button can call
// `saveScholarAskEvidence` without mounting the whole library — the stateful
// hook that both Evidence Library surfaces share, `useEvidenceLibrary`
// (src/hooks/useEvidenceLibrary.ts), is built on top of these.

import type { SupabaseClient } from "@supabase/supabase-js";
import { readSavedEvidenceItems, SAVED_EVIDENCE_STORAGE_KEY } from "./savedEvidence";

export type EvidenceSource = "scholarask" | "upload";
export type EvidenceStatus = "pending" | "ready" | "failed";

export type EvidenceLibraryRow = {
  id: string;
  user_id: string;
  project_id: string | null;
  pdf_id: string | null;
  source: EvidenceSource;
  title: string;
  doc_type: string | null;
  evidence: string | null;
  caveat: string | null;
  status: EvidenceStatus;
  citation: string | null;
  url: string | null;
  created_at: string;
};

const EVIDENCE_LIBRARY_SELECT =
  "id, user_id, project_id, pdf_id, source, title, doc_type, evidence, caveat, status, citation, url, created_at";

/** Fail-open: any query error returns an empty list rather than throwing. */
export async function fetchEvidenceLibraryRows(
  supabase: SupabaseClient,
  userId: string
): Promise<EvidenceLibraryRow[]> {
  const { data, error } = await supabase
    .from("evidence_library")
    .select(EVIDENCE_LIBRARY_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as EvidenceLibraryRow[];
}

export type SaveScholarAskEvidenceInput = {
  userId: string;
  projectId: string | null;
  title: string;
  docType?: string | null;
  citation?: string | null;
  url?: string | null;
};

/**
 * Insert one ScholarAsk-sourced row (source panel Save button). v1 leaves
 * evidence/caveat NULL — the card/subpage render "—" for those cells until a
 * future pass adds AI-derived labels for ScholarAsk saves too. Returns the
 * inserted row, or null on failure (fail-open — the caller shows a toast).
 */
export async function saveScholarAskEvidence(
  supabase: SupabaseClient,
  input: SaveScholarAskEvidenceInput
): Promise<EvidenceLibraryRow | null> {
  const { data, error } = await supabase
    .from("evidence_library")
    .insert({
      user_id: input.userId,
      project_id: input.projectId,
      pdf_id: null,
      source: "scholarask",
      title: input.title,
      doc_type: input.docType || "Journal Article",
      evidence: null,
      caveat: null,
      status: "ready",
      citation: input.citation || null,
      url: input.url || null,
    })
    .select(EVIDENCE_LIBRARY_SELECT)
    .single();
  if (error || !data) return null;
  return data as EvidenceLibraryRow;
}

export async function deleteEvidenceLibraryRow(supabase: SupabaseClient, id: string): Promise<boolean> {
  const { error } = await supabase.from("evidence_library").delete().eq("id", id);
  return !error;
}

/**
 * Stable dedupe key for a ScholarAsk paper — prefers its URL (most stable),
 * falling back to a lowercased title. Used both when saving (to skip an
 * insert if already saved) and when computing which papers in the current
 * results list should show "Saved" vs "Save".
 */
export function evidenceDedupeKey(input: { title: string; url?: string | null }): string {
  const url = input.url?.trim();
  if (url) return `url:${url}`;
  return `title:${input.title.trim().toLowerCase()}`;
}

/** All dedupe keys for this user's already-saved ScholarAsk rows (fail-open: empty set on error). */
export async function fetchScholarAskDedupeKeys(supabase: SupabaseClient, userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("evidence_library")
    .select("title, url")
    .eq("user_id", userId)
    .eq("source", "scholarask");
  if (error || !data) return new Set();
  return new Set(
    (data as Array<{ title: string; url: string | null }>).map((row) =>
      evidenceDedupeKey({ title: row.title, url: row.url })
    )
  );
}

export const EVIDENCE_LIBRARY_MIGRATION_FLAG = "cerise_evidence_library_migrated_v1";

/**
 * One-time move of localStorage-saved ScholarAsk evidence (the old v1 store,
 * src/lib/research/savedEvidence.ts) into the real evidence_library table,
 * then clears localStorage. Guarded by a dedicated flag (not just "is
 * localStorage empty") so this never re-runs and never re-imports something
 * the user has since deleted from their library. Fail-open throughout.
 */
export async function migrateLegacySavedEvidence(supabase: SupabaseClient, userId: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(EVIDENCE_LIBRARY_MIGRATION_FLAG)) return;

  try {
    const legacyItems = readSavedEvidenceItems();
    if (legacyItems.length > 0) {
      const inserts = legacyItems.map((item) => ({
        user_id: userId,
        project_id: null,
        pdf_id: null,
        source: "scholarask" as const,
        title: item.title,
        doc_type: item.type || null,
        evidence: item.evidence || null,
        caveat: item.caveat || null,
        status: "ready" as const,
        citation: null,
        url: item.url || null,
      }));
      const { error } = await supabase.from("evidence_library").insert(inserts);
      if (!error) {
        window.localStorage.removeItem(SAVED_EVIDENCE_STORAGE_KEY);
      }
    }
    window.localStorage.setItem(EVIDENCE_LIBRARY_MIGRATION_FLAG, "1");
  } catch {
    // Fail-open: worst case the legacy items just stay in localStorage and
    // migration is retried next mount.
  }
}

/** Calls the server-side Retry endpoint (needs OpenRouter credentials, so it can't run client-side). */
export async function retryEvidenceAnalysis(pdfId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/evidence/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pdfId }),
    });
    const data = await res.json().catch(() => ({}) as { error?: string });
    if (!res.ok) return { ok: false, error: data?.error || "Retry failed." };
    return { ok: true };
  } catch {
    return { ok: false, error: "Retry failed — check your connection." };
  }
}
