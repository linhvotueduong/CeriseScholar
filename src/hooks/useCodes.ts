"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Code } from "@/types/code";
import { DEFAULT_CODES } from "@/types/code";

// Module-level guard so multiple component instances and React strict-mode
// double-runs don't all race to insert default codes for the same scope.
const seededScopes = new Set<string>();

/**
 * De-duplicate codes by name within a project. If duplicates exist (from
 * legacy races), keep the lowest sort_order and (background-)delete the rest
 * so the DB catches up.
 */
function dedupeAndCleanup(rows: Code[], supabaseFrom: ReturnType<ReturnType<typeof createClient>["from"]>): Code[] {
  const seen = new Map<string, Code>();
  const duplicates: string[] = [];
  for (const row of rows) {
    const key = row.name.toLowerCase();
    if (seen.has(key)) duplicates.push(row.id);
    else seen.set(key, row);
  }
  if (duplicates.length > 0) {
    // Fire-and-forget — don't block render
    void supabaseFrom.delete().in("id", duplicates);
  }
  return Array.from(seen.values());
}

export function useCodes(projectId?: string) {
  const [codes, setCodes] = useState<Code[]>([]);
  const [loading, setLoading] = useState(true);
  const initStartedRef = useRef(false);

  const fetchCodes = useCallback(async () => {
    const supabase = createClient();
    let query = supabase.from("codes").select("*");
    if (projectId) query = query.eq("project_id", projectId);
    const { data } = await query.order("sort_order", { ascending: true });

    if (data) {
      const cleaned = dedupeAndCleanup(data as Code[], supabase.from("codes"));
      setCodes(cleaned);
    }
    setLoading(false);
  }, [projectId]);

  // Initialize default codes if user has none. Guarded so it runs once per scope.
  const initializeDefaults = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const scopeKey = `${user.id}:${projectId ?? "global"}`;
    if (seededScopes.has(scopeKey)) return;
    seededScopes.add(scopeKey);

    let checkQuery = supabase.from("codes").select("id").limit(1);
    if (projectId) checkQuery = checkQuery.eq("project_id", projectId);
    const { data: existing } = await checkQuery;

    if (existing && existing.length > 0) return;

    const inserts = DEFAULT_CODES.map((code, i) => ({
      user_id: user.id,
      name: code.name,
      color: code.color,
      sort_order: i,
      project_id: projectId || null,
    }));

    await supabase.from("codes").insert(inserts);
    await fetchCodes();
  }, [fetchCodes, projectId]);

  useEffect(() => {
    if (initStartedRef.current) return;
    initStartedRef.current = true;
    const timer = window.setTimeout(() => {
      void fetchCodes().then(() => initializeDefaults());
    }, 0);
    return () => window.clearTimeout(timer);
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
          project_id: projectId || null,
        })
        .select()
        .single();

      if (error || !data) return null;
      setCodes((prev) => [...prev, data as Code]);
      return data as Code;
    },
    [codes.length, projectId]
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
