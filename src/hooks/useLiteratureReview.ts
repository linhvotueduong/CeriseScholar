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

    if (!data) {
      setLoading(false);
      return;
    }

    // Sync: fill empty notes from annotations
    const emptyNoteEntries = data.filter(
      (e) => (!e.user_notes || e.user_notes === "") && e.highlight_id
    );

    if (emptyNoteEntries.length > 0) {
      const highlightIds = emptyNoteEntries.map((e) => e.highlight_id).filter(Boolean);
      const { data: annotations } = await supabase
        .from("annotations")
        .select("highlight_id, content")
        .in("highlight_id", highlightIds);

      if (annotations && annotations.length > 0) {
        for (const ann of annotations) {
          if (ann.content) {
            await supabase
              .from("literature_review_entries")
              .update({ user_notes: ann.content })
              .eq("highlight_id", ann.highlight_id)
              .eq("user_notes", "");

            // Update local data too
            const entry = data.find((e) => e.highlight_id === ann.highlight_id);
            if (entry) entry.user_notes = ann.content;
          }
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

      // Update the lit review entry
      await supabase
        .from("literature_review_entries")
        .update(fields)
        .eq("id", id);

      // If user_notes was changed, also sync it to the annotations table
      if ("user_notes" in fields) {
        const entry = entries.find((e) => e.id === id);
        if (entry?.highlight_id) {
          const { data: existing } = await supabase
            .from("annotations")
            .select("id")
            .eq("highlight_id", entry.highlight_id)
            .limit(1);

          if (existing && existing.length > 0) {
            // Update existing annotation
            await supabase
              .from("annotations")
              .update({ content: fields.user_notes, updated_at: new Date().toISOString() })
              .eq("highlight_id", entry.highlight_id);
          } else if (fields.user_notes) {
            // Create new annotation if none exists
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase.from("annotations").insert({
                user_id: user.id,
                pdf_id: entry.pdf_id,
                highlight_id: entry.highlight_id,
                page_number: entry.page_number,
                content: fields.user_notes,
                position_x: 0,
                position_y: 0,
              });
            }
          }
        }
      }

      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...fields } : e))
      );
    },
    [entries]
  );

  const deleteEntry = useCallback(async (id: string) => {
    const supabase = createClient();
    await supabase.from("literature_review_entries").delete().eq("id", id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { entries, loading, updateEntry, deleteEntry, refetch: fetchEntries };
}
