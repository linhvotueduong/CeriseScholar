"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Code } from "@/types/code";
import { DEFAULT_CODES } from "@/types/code";

export function useCodes() {
  const [codes, setCodes] = useState<Code[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCodes = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("codes")
      .select("*")
      .order("sort_order", { ascending: true });

    if (data) setCodes(data as Code[]);
    setLoading(false);
  }, []);

  // Initialize default codes if user has none
  const initializeDefaults = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: existing } = await supabase
      .from("codes")
      .select("id")
      .limit(1);

    if (existing && existing.length > 0) return; // Already has codes

    // Create default codes
    const inserts = DEFAULT_CODES.map((code, i) => ({
      user_id: user.id,
      name: code.name,
      color: code.color,
      sort_order: i,
    }));

    await supabase.from("codes").insert(inserts);
    await fetchCodes();
  }, [fetchCodes]);

  useEffect(() => {
    fetchCodes().then(() => initializeDefaults());
  }, [fetchCodes, initializeDefaults]);

  const createCode = useCallback(
    async (name: string, color: string) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("codes")
        .insert({
          user_id: user.id,
          name,
          color,
          sort_order: codes.length,
        })
        .select()
        .single();

      if (error || !data) return null;
      setCodes((prev) => [...prev, data as Code]);
      return data as Code;
    },
    [codes.length]
  );

  const updateCode = useCallback(
    async (id: string, fields: Partial<Pick<Code, "name" | "color">>) => {
      const supabase = createClient();
      await supabase.from("codes").update(fields).eq("id", id);
      setCodes((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...fields } : c))
      );
    },
    []
  );

  const deleteCode = useCallback(async (id: string) => {
    const supabase = createClient();
    // Clear code_id from highlights that use this code
    await supabase.from("highlights").update({ code_id: null }).eq("code_id", id);
    await supabase.from("codes").delete().eq("id", id);
    setCodes((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { codes, loading, createCode, updateCode, deleteCode, refetch: fetchCodes };
}
