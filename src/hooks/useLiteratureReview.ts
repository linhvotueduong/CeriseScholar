"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { LiteratureReviewEntry } from "@/types/literature-review";

export function useLiteratureReview() {
  const [entries, setEntries] = useState<LiteratureReviewEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("literature_review_entries")
      .select("*")
      .order("date_added", { ascending: false });

    if (data) setEntries(data as LiteratureReviewEntry[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const updateEntry = useCallback(
    async (
      id: string,
      fields: Partial<
        Pick<
          LiteratureReviewEntry,
          "authors" | "year" | "theme_category" | "user_notes" | "code_name" | "apa_reference" | "synthesis_paragraph"
        >
      >
    ) => {
      const supabase = createClient();
      await supabase
        .from("literature_review_entries")
        .update(fields)
        .eq("id", id);

      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...fields } : e))
      );
    },
    []
  );

  const deleteEntry = useCallback(async (id: string) => {
    const supabase = createClient();
    await supabase.from("literature_review_entries").delete().eq("id", id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { entries, loading, updateEntry, deleteEntry, refetch: fetchEntries };
}
