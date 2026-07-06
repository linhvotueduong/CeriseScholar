"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { logDashboardActivity } from "@/lib/dashboard/activity";
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
    const timer = window.setTimeout(() => {
      void fetchHighlights();
    }, 0);

    return () => window.clearTimeout(timer);
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
      await supabase.from("literature_review_entries").insert({
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
      });

      // 4. Update local state
      setHighlights((prev) => [...prev, highlight as Highlight]);
      await logDashboardActivity({
        projectId: params.projectId,
        eventType: "highlight_created",
        sectionId: "workspace",
        label: "Created highlight",
      });
      if (params.noteContent) {
        await logDashboardActivity({
          projectId: params.projectId,
          eventType: "note_created",
          sectionId: "workspace",
          label: "Created note",
        });
      }
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
