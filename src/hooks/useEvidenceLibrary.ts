"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  deleteEvidenceLibraryRow,
  fetchEvidenceLibraryRows,
  migrateLegacySavedEvidence,
  type EvidenceLibraryRow,
} from "@/lib/research/evidenceLibrary";

// Client-fetch hook for the ScholarAsk-only Evidence Library page.
// Any query error falls back to an empty list instead of crashing the page.

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

  return { rows, loading, error, refetch, removeRow };
}
