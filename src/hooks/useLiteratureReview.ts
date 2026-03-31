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

    // Fetch lit review entries
    const { data } = await supabase
      .from("literature_review_entries")
      .select("*")
      .order("date_added", { ascending: false });

    if (!data) {
      setLoading(false);
      return;
    }

    // Find entries with empty notes that have annotations
    const emptyNoteEntries = data.filter(
      (e) => (!e.user_notes || e.user_notes === "") && e.highlight_id
    );

    if (emptyNoteEntries.length > 0) {
      // Fetch annotations for these highlights
      const highlightIds = emptyNoteEntries.map((e) => e.highlight_id).filter(Boolean);
      const { data: annotations } = await supabase
        .from("annotations")
        .select("highlight_id, content")
        .in("highlight_id", highlightIds);

      if (annotations && annotations.length > 0) {
        // Sync notes from annotations into lit review entries
        for (const ann of annotations) {
          if (ann.content) {
            await supabase
              .from("literature_review_entries")
              .update({ user_notes: ann.content })
              .eq("highlight_id", ann.highlight_id)
              .eq("user_notes", "");
          }
        }

        // Re-fetch with updated notes
        const { data: updated } = await supabase
          .from("literature_review_entries")
          .select("*")
          .order("date_added", { ascending: false });

        if (updated) {
          setEntries(updated as LiteratureReviewEntry[]);
          setLoading(false);
          return;
        }
      }
    }

    setEntries(data as LiteratureReviewEntry[]);
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
