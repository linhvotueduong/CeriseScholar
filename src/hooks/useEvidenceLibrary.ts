"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  deleteEvidenceLibraryRow,
  fetchEvidenceLibraryRows,
  migrateLegacySavedEvidence,
  retryEvidenceAnalysis,
  type EvidenceLibraryRow,
} from "@/lib/research/evidenceLibrary";

// Shared client-fetch hook for both Evidence Library surfaces — the card on
// /research-desk and the full page at /research-desk/evidence-library —
// so the fetch/delete/retry/migration logic lives in exactly one place.
// Fail-open like useResearchDeskData/useDashboardState: any query error
// falls back to an empty list instead of crashing the page.

export function useEvidenceLibrary(userId: string | null | undefined) {
  const [rows, setRows] = useState<EvidenceLibraryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const migratingRef = useRef(false);

  const refetch = useCallback(async () => {
    if (!userId) {
      setRows([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      setRows(await fetchEvidenceLibraryRows(supabase, userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Evidence library could not load.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  // One-time migration off localStorage — guarded so it only ever attempts
  // once per browser (see migrateLegacySavedEvidence's own flag check too).
  useEffect(() => {
    if (!userId || migratingRef.current) return;
    migratingRef.current = true;
    (async () => {
      const supabase = createClient();
      await migrateLegacySavedEvidence(supabase, userId);
      void refetch();
    })();
  }, [userId, refetch]);

  const removeRow = useCallback(
    async (id: string) => {
      setRows((current) => current.filter((row) => row.id !== id));
      const supabase = createClient();
      const ok = await deleteEvidenceLibraryRow(supabase, id);
      if (!ok) void refetch(); // put it back (and anything else that drifted) on failure
      return ok;
    },
    [refetch]
  );

  const retryRow = useCallback(
    async (row: EvidenceLibraryRow) => {
      if (!row.pdf_id) return { ok: false, error: "This row has no source file to re-analyze." };
      setRows((current) => current.map((r) => (r.id === row.id ? { ...r, status: "pending" } : r)));
      const result = await retryEvidenceAnalysis(row.pdf_id);
      void refetch();
      return result;
    },
    [refetch]
  );

  return { rows, loading, error, refetch, removeRow, retryRow };
}
