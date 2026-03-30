"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Annotation } from "@/types/annotation";

export function useAnnotations(pdfId: string) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnnotations = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("annotations")
      .select("*")
      .eq("pdf_id", pdfId)
      .order("created_at", { ascending: true });

    if (data) setAnnotations(data as Annotation[]);
    setLoading(false);
  }, [pdfId]);

  useEffect(() => {
    fetchAnnotations();
  }, [fetchAnnotations]);

  const createAnnotation = useCallback(
    async (params: {
      pdfId: string;
      pageNumber: number;
      content: string;
      positionX: number;
      positionY: number;
      highlightId?: string;
    }) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("annotations")
        .insert({
          user_id: user.id,
          pdf_id: params.pdfId,
          page_number: params.pageNumber,
          content: params.content,
          position_x: params.positionX,
          position_y: params.positionY,
          highlight_id: params.highlightId || null,
        })
        .select()
        .single();

      if (error || !data) return null;

      setAnnotations((prev) => [...prev, data as Annotation]);
      return data as Annotation;
    },
    []
  );

  const updateAnnotation = useCallback(
    async (annotationId: string, content: string) => {
      const supabase = createClient();
      await supabase
        .from("annotations")
        .update({ content, updated_at: new Date().toISOString() })
        .eq("id", annotationId);

      setAnnotations((prev) =>
        prev.map((a) => (a.id === annotationId ? { ...a, content } : a))
      );
    },
    []
  );

  const deleteAnnotation = useCallback(async (annotationId: string) => {
    const supabase = createClient();
    await supabase.from("annotations").delete().eq("id", annotationId);
    setAnnotations((prev) => prev.filter((a) => a.id !== annotationId));
  }, []);

  return {
    annotations,
    loading,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    refetch: fetchAnnotations,
  };
}
