"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { logDashboardActivity } from "@/lib/dashboard/activity";
import type { PaperSection, PaperSectionKey } from "@/types/paper-section";
import { PAPER_SECTIONS } from "@/types/paper-section";

export function usePaperWriter(projectId: string) {
  const [sections, setSections] = useState<Record<string, PaperSection>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Load all sections for this project
  const fetchSections = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const { data } = await supabase
      .from("paper_sections")
      .select("*")
      .eq("project_id", projectId);

    const map: Record<string, PaperSection> = {};
    if (data) {
      for (const row of data) {
        map[row.section_key] = row as PaperSection;
      }
    }
    setSections(map);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchSections(), 0);
    return () => window.clearTimeout(timer);
  }, [fetchSections]);

  // Save a section (debounced — auto-saves 1 second after you stop typing)
  const updateSection = useCallback(
    (sectionKey: PaperSectionKey, content: string) => {
      // Update local state immediately
      setSections((prev) => ({
        ...prev,
        [sectionKey]: prev[sectionKey]
          ? { ...prev[sectionKey], content }
          : ({ section_key: sectionKey, content } as PaperSection),
      }));

      // Clear previous timer for this section
      if (saveTimers.current[sectionKey]) {
        clearTimeout(saveTimers.current[sectionKey]);
      }

      // Debounce the save
      saveTimers.current[sectionKey] = setTimeout(async () => {
        setSaving(true);
        setSaveError(null);
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setSaving(false);
          return;
        }

        // Upsert: insert if not exists, update if exists
        const { error } = await supabase.from("paper_sections").upsert(
          {
            user_id: user.id,
            project_id: projectId,
            section_key: sectionKey,
            content,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "project_id,section_key" }
        );

        if (error) {
          console.error("Paper Writer save failed:", error);
          setSaveError("Save failed — your changes may not be saved. Please try again.");
        } else {
          await logDashboardActivity({
            projectId,
            eventType: "paper_draft_saved",
            sectionId: "draft",
            label: `Saved ${sectionKey} draft section`,
          });
        }

        setSaving(false);
      }, 1000);
    },
    [projectId]
  );

  // Sync materials: pull synthesis paragraphs and APA references from lit review
  const syncMaterials = useCallback(async () => {
    const supabase = createClient();

    const { data: entries } = await supabase
      .from("literature_review_entries")
      .select("code_name, synthesis_paragraph, apa_reference, source, authors, year")
      .eq("project_id", projectId);

    if (!entries) return { synthesisBySection: {}, references: [] };

    // Group synthesis paragraphs by code_name (section)
    const synthesisBySection: Record<string, string[]> = {};
    const references: string[] = [];

    for (const entry of entries) {
      // Collect synthesis paragraphs grouped by section
      if (entry.synthesis_paragraph && entry.synthesis_paragraph.trim()) {
        const section = entry.code_name || "Uncategorized";
        if (!synthesisBySection[section]) {
          synthesisBySection[section] = [];
        }
        // Avoid duplicates
        if (!synthesisBySection[section].includes(entry.synthesis_paragraph.trim())) {
          synthesisBySection[section].push(entry.synthesis_paragraph.trim());
        }
      }

      // Collect APA references
      if (entry.apa_reference && entry.apa_reference.trim()) {
        if (!references.includes(entry.apa_reference.trim())) {
          references.push(entry.apa_reference.trim());
        }
      }
    }

    // Sort references alphabetically
    references.sort((a, b) => a.localeCompare(b));

    return { synthesisBySection, references };
  }, [projectId]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      for (const timer of Object.values(saveTimers.current)) {
        clearTimeout(timer);
      }
    };
  }, []);

  return {
    sections,
    loading,
    saving,
    saveError,
    updateSection,
    syncMaterials,
    refetch: fetchSections,
  };
}
