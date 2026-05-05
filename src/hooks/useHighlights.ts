"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { readApiResponse } from "@/lib/utils/readApiResponse";
import type { Highlight } from "@/types/annotation";

interface CreateHighlightParams {
  pdfId: string;
  pageNumber: number;
  highlightedText: string;
  rects: { x: number; y: number; width: number; height: number }[];
  color?: string;
  pdfDisplayName: string;
  pdfAuthor?: string;
  pdfTitle?: string;
  codeId?: string;
  codeName?: string;
  noteContent?: string;
  projectId?: string;
  /** Text from first pages of the PDF — used for AI APA citation generation */
  pdfFirstPagesText?: string;
}

export function useHighlights(pdfId: string) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHighlights = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("highlights")
      .select("*")
      .eq("pdf_id", pdfId)
      .order("created_at", { ascending: true });

    if (data) setHighlights(data as Highlight[]);
    setLoading(false);
  }, [pdfId]);

  useEffect(() => {
    fetchHighlights();
  }, [fetchHighlights]);

  const createHighlight = useCallback(
    async (params: CreateHighlightParams) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      // 1. Insert the highlight (with optional code_id)
      const { data: highlight, error: highlightError } = await supabase
        .from("highlights")
        .insert({
          user_id: user.id,
          pdf_id: params.pdfId,
          page_number: params.pageNumber,
          highlighted_text: params.highlightedText,
          rects: params.rects,
          color: params.color || "#FFD700",
          code_id: params.codeId || null,
        })
        .select()
        .single();

      if (highlightError || !highlight) return null;

      // 2. Build basic APA reference from PDF metadata
      let apaRef = "";
      if (params.pdfAuthor || params.pdfTitle) {
        const parts: string[] = [];
        if (params.pdfAuthor) parts.push(params.pdfAuthor);
        if (params.pdfTitle) parts.push(`"${params.pdfTitle}"`);
        apaRef = parts.join(". ") + ".";
      }

      // 3. Create a literature review entry
      const { data: litEntry } = await supabase.from("literature_review_entries").insert({
        user_id: user.id,
        pdf_id: params.pdfId,
        highlight_id: highlight.id,
        source: params.pdfDisplayName,
        authors: params.pdfAuthor || "",
        page_number: params.pageNumber,
        highlighted_text: params.highlightedText,
        code_name: params.codeName || "",
        user_notes: params.noteContent || "",
        apa_reference: apaRef,
        project_id: params.projectId || null,
      }).select("id").single();

      // 4. Fire-and-forget: ask AI to generate proper APA citation from PDF text
      if (litEntry && params.pdfFirstPagesText) {
        fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task: "generate_apa",
            pdfText: params.pdfFirstPagesText,
            filename: params.pdfDisplayName,
          }),
        })
          .then(async (res) => {
            const data = await readApiResponse<{ apa?: string; error?: string }>(res);
            return res.ok ? data : {};
          })
          .then((data) => {
            if (data.apa) {
              // Update the lit review entry with AI-generated APA
              supabase
                .from("literature_review_entries")
                .update({ apa_reference: data.apa, authors: data.apa.split("(")[0]?.trim() || params.pdfAuthor || "" })
                .eq("id", litEntry.id)
                .then(() => {});
            }
          })
          .catch(() => {}); // silently fail — the basic ref is already saved
      }

      // 5. Update local state
      setHighlights((prev) => [...prev, highlight as Highlight]);
      return highlight as Highlight;
    },
    []
  );

  const deleteHighlight = useCallback(async (highlightId: string) => {
    const supabase = createClient();
    await supabase
      .from("literature_review_entries")
      .delete()
      .eq("highlight_id", highlightId);
    await supabase.from("highlights").delete().eq("id", highlightId);
    setHighlights((prev) => prev.filter((h) => h.id !== highlightId));
  }, []);

  return { highlights, loading, createHighlight, deleteHighlight, refetch: fetchHighlights };
}
