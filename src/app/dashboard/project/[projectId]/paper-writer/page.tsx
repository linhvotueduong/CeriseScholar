"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePaperWriter } from "@/hooks/usePaperWriter";
import Link from "next/link";
import type { Project } from "@/types/project";
import type { PaperSectionKey } from "@/types/paper-section";
import {
  PAPER_SECTIONS,
  SECTION_LABELS,
  SECTION_GUIDANCE,
} from "@/types/paper-section";

export default function PaperWriterPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { sections, loading, saving, saveError, updateSection, syncMaterials } =
    usePaperWriter(projectId);

  const [project, setProject] = useState<Project | null>(null);
  const [activeSection, setActiveSection] =
    useState<PaperSectionKey>("abstract");
  const [showGuidance, setShowGuidance] = useState(true);
  const [syncedData, setSyncedData] = useState<{
    synthesisBySection: Record<string, string[]>;
    references: string[];
  } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [showSyncPanel, setShowSyncPanel] = useState(false);

  // Load project info
  useEffect(() => {
    async function loadProject() {
      const supabase = createClient();
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();
      if (data) setProject(data as Project);
    }
    loadProject();
  }, [projectId]);

  // Handle sync materials
  async function handleSync() {
    setSyncing(true);
    const data = await syncMaterials();
    setSyncedData(data);
    setShowSyncPanel(true);
    setSyncing(false);
  }

  // Insert synced text into the active section editor
  function insertIntoEditor(text: string) {
    const current = sections[activeSection]?.content || "";
    const newContent = current ? current + "\n\n" + text : text;
    updateSection(activeSection, newContent);
  }

  // Insert all synthesis paragraphs into Literature Review section
  function insertAllSynthesis() {
    if (!syncedData) return;
    const parts: string[] = [];
    for (const [section, paragraphs] of Object.entries(
      syncedData.synthesisBySection
    )) {
      parts.push(`### ${section}\n\n${paragraphs.join("\n\n")}`);
    }
    const text = parts.join("\n\n");
    if (text) {
      const current = sections["literature_review"]?.content || "";
      const newContent = current ? current + "\n\n" + text : text;
      updateSection("literature_review", newContent);
      setActiveSection("literature_review");
    }
  }

  // Insert all references
  function insertAllReferences() {
    if (!syncedData) return;
    const text = syncedData.references.join("\n\n");
    if (text) {
      const current = sections["references"]?.content || "";
      const newContent = current ? current + "\n\n" + text : text;
      updateSection("references", newContent);
      setActiveSection("references");
    }
  }

  // Calculate word count for current section
  const currentContent = sections[activeSection]?.content || "";
  const wordCount = currentContent.trim()
    ? currentContent.trim().split(/\s+/).length
    : 0;

  // Calculate total word count
  const totalWords = PAPER_SECTIONS.reduce((sum, key) => {
    const text = sections[key]?.content || "";
    return sum + (text.trim() ? text.trim().split(/\s+/).length : 0);
  }, 0);

  if (loading) {
    return (
      <div className="-mx-8 -my-8 flex items-center justify-center h-[calc(100vh-57px)]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-[#1a1208]" />
      </div>
    );
  }

  return (
    <div className="-mx-8 -my-8">
      <div className="flex flex-col h-[calc(100vh-57px)]">
        {/* Header */}
        <div className="flex items-center gap-3 bg-white border-b border-[#e0d8d0] px-4 py-2">
          <Link
            href={`/dashboard/project/${projectId}`}
            className="text-sm text-[#7a6a5a] hover:text-[#1a1208] transition-colors"
          >
            &larr; Workspace
          </Link>
          {project && (
            <>
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: project.color }}
              />
              <h2 className="text-sm font-medium text-[#1a1208] truncate">
                {project.name}
              </h2>
            </>
          )}
          <span className="text-sm text-[#9a8a7a]">/ Paper Writer</span>

          <div className="ml-auto flex items-center gap-3">
            {/* Save status */}
            <span className={`text-xs ${saveError ? "text-red-500 font-medium" : "text-[#9a8a7a]"}`}>
              {saveError ? saveError : saving ? "Saving..." : "Auto-saved"}
            </span>

            {/* Total word count */}
            <span className="text-xs text-[#7a6a5a] bg-gray-100 px-2 py-1 rounded">
              Total: {totalWords.toLocaleString()} words
            </span>

            {/* Sync Materials button */}
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-3 py-1.5 text-xs bg-[#1a1208] text-white rounded-lg hover:bg-[#000000] transition-colors font-medium disabled:opacity-50"
            >
              {syncing ? "Syncing..." : "Sync Materials"}
            </button>

            {/* Toggle guidance */}
            <button
              onClick={() => setShowGuidance(!showGuidance)}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-[#7a6a5a]"
            >
              {showGuidance ? "Hide Tips" : "Show Tips"}
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar: section nav */}
          <div className="w-52 bg-white border-r border-[#e0d8d0] flex flex-col shrink-0">
            <div className="px-3 py-3 border-b border-gray-100">
              <h3 className="text-xs font-semibold text-[#7a6a5a] uppercase tracking-wider">
                Sections
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {PAPER_SECTIONS.map((key, index) => {
                const hasContent = !!(
                  sections[key]?.content && sections[key].content.trim()
                );
                return (
                  <button
                    key={key}
                    onClick={() => setActiveSection(key)}
                    className={`w-full text-left px-3 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                      activeSection === key
                        ? "bg-pink-50 text-[#1a1208] font-medium border-r-2 border-[#1a1208]"
                        : "text-[#5a4a3a] hover:bg-gray-50"
                    }`}
                  >
                    <span className="text-xs text-[#9a8a7a] w-4">
                      {index + 1}.
                    </span>
                    <span className="flex-1">{SECTION_LABELS[key]}</span>
                    {hasContent && (
                      <span className="w-2 h-2 bg-green-400 rounded-full shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Navigation links */}
            <div className="border-t border-[#e0d8d0] p-3 space-y-1">
              <Link
                href={`/dashboard/project/${projectId}/literature-review`}
                className="block text-xs text-[#1a1208] hover:underline"
              >
                Lit Review Table
              </Link>
              <Link
                href={`/dashboard/project/${projectId}/meta-analysis`}
                className="block text-xs text-[#1a1208] hover:underline"
              >
                Meta-Analysis
              </Link>
            </div>
          </div>

          {/* Center: editor */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Section header */}
            <div className="bg-white border-b border-[#e0d8d0] px-6 py-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#1a1208]">
                  {SECTION_LABELS[activeSection]}
                </h2>
                <p className="text-xs text-[#7a6a5a] mt-0.5">
                  {SECTION_GUIDANCE[activeSection].description}
                </p>
              </div>
              <span className="text-xs text-[#9a8a7a]">
                {wordCount} words
              </span>
            </div>

            {/* Text editor */}
            <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
              <div className="max-w-3xl mx-auto">
                <textarea
                  value={currentContent}
                  onChange={(e) =>
                    updateSection(activeSection, e.target.value)
                  }
                  placeholder={`Start writing your ${SECTION_LABELS[activeSection]} section here...\n\nTip: ${SECTION_GUIDANCE[activeSection].tips[0]}`}
                  className="w-full min-h-[500px] p-6 bg-white border border-[#e0d8d0] rounded-xl text-[#1a1208] text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-[#1a1208] focus:border-transparent"
                  style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                />
              </div>
            </div>
          </div>

          {/* Right panel: guidance OR synced materials */}
          {(showGuidance || showSyncPanel) && (
            <div className="w-72 bg-white border-l border-[#e0d8d0] flex flex-col shrink-0 overflow-hidden">
              {/* Panel tabs */}
              {syncedData && (
                <div className="flex border-b border-[#e0d8d0]">
                  <button
                    onClick={() => setShowSyncPanel(false)}
                    className={`flex-1 text-xs py-2.5 font-medium transition-colors ${
                      !showSyncPanel
                        ? "text-[#1a1208] border-b-2 border-[#1a1208]"
                        : "text-[#7a6a5a] hover:text-[#5a4a3a]"
                    }`}
                  >
                    Writing Tips
                  </button>
                  <button
                    onClick={() => setShowSyncPanel(true)}
                    className={`flex-1 text-xs py-2.5 font-medium transition-colors ${
                      showSyncPanel
                        ? "text-[#1a1208] border-b-2 border-[#1a1208]"
                        : "text-[#7a6a5a] hover:text-[#5a4a3a]"
                    }`}
                  >
                    Synced Materials
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4">
                {!showSyncPanel ? (
                  /* Writing guidance */
                  <div>
                    <h3 className="text-sm font-semibold text-[#1a1208] mb-3">
                      Writing Tips for {SECTION_LABELS[activeSection]}
                    </h3>
                    <ul className="space-y-2.5">
                      {SECTION_GUIDANCE[activeSection].tips.map((tip, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-xs text-[#7a6a5a] leading-relaxed"
                        >
                          <span className="text-[#1a1208] mt-0.5 shrink-0 font-bold">
                            {i + 1}.
                          </span>
                          {tip}
                        </li>
                      ))}
                    </ul>

                    {/* Section-specific hints */}
                    {activeSection === "abstract" && (
                      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-xs text-amber-700 font-medium mb-1">
                          Recommended: Write this last
                        </p>
                        <p className="text-xs text-amber-600">
                          Complete all other sections first, then summarize the
                          entire paper here.
                        </p>
                      </div>
                    )}

                    {activeSection === "literature_review" && (
                      <div className="mt-4 p-3 bg-pink-50 border border-pink-200 rounded-lg">
                        <p className="text-xs text-[#1a1208] font-medium mb-1">
                          Use your synthesis paragraphs
                        </p>
                        <p className="text-xs text-pink-600">
                          Click &quot;Sync Materials&quot; to import your
                          synthesis paragraphs from the Lit Review Table as
                          building blocks.
                        </p>
                      </div>
                    )}

                    {activeSection === "methodology" && (
                      <div className="mt-4 p-3 bg-pink-50 border border-pink-200 rounded-lg">
                        <p className="text-xs text-[#1a1208] font-medium mb-1">
                          Start from your Meta-Analysis setup
                        </p>
                        <p className="text-xs text-pink-600">
                          If you ran a meta-analysis, open the{" "}
                          <Link
                            href={`/dashboard/project/${projectId}/meta-analysis`}
                            className="underline hover:text-pink-800"
                          >
                            Meta-analysis page
                          </Link>{" "}
                          and use your saved research question and hypothesis
                          from Step 1 as a starting point for describing your
                          methodology here.
                        </p>
                      </div>
                    )}

                    {activeSection === "references" && (
                      <div className="mt-4 p-3 bg-pink-50 border border-pink-200 rounded-lg">
                        <p className="text-xs text-[#1a1208] font-medium mb-1">
                          Import your references
                        </p>
                        <p className="text-xs text-pink-600">
                          Click &quot;Sync Materials&quot; to import all APA
                          references from your Lit Review Table.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Synced materials panel */
                  <div>
                    {syncedData &&
                    Object.keys(syncedData.synthesisBySection).length === 0 &&
                    syncedData.references.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-[#7a6a5a]">
                          No materials found.
                        </p>
                        <p className="text-xs text-[#9a8a7a] mt-2">
                          Add synthesis paragraphs and APA references in your{" "}
                          <Link
                            href={`/dashboard/project/${projectId}/literature-review`}
                            className="text-[#1a1208] hover:underline"
                          >
                            Lit Review Table
                          </Link>{" "}
                          first.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Synthesis paragraphs */}
                        {syncedData &&
                          Object.keys(syncedData.synthesisBySection).length >
                            0 && (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-semibold text-[#1a1208] uppercase tracking-wider">
                                  Synthesis Paragraphs
                                </h4>
                                <button
                                  onClick={insertAllSynthesis}
                                  className="text-[10px] text-[#1a1208] hover:underline font-medium"
                                >
                                  Insert all into Lit Review
                                </button>
                              </div>
                              {Object.entries(
                                syncedData.synthesisBySection
                              ).map(([section, paragraphs]) => (
                                <div key={section} className="mb-3">
                                  <p className="text-xs font-medium text-[#7a6a5a] mb-1">
                                    {section}
                                  </p>
                                  {paragraphs.map((p, i) => (
                                    <div
                                      key={i}
                                      className="mb-2 p-2 bg-gray-50 border border-[#e0d8d0] rounded text-xs text-[#5a4a3a] leading-relaxed group relative"
                                    >
                                      <p className="pr-12">{p}</p>
                                      <button
                                        onClick={() => insertIntoEditor(p)}
                                        className="absolute top-2 right-2 text-[10px] text-[#1a1208] opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-pink-200 rounded px-1.5 py-0.5 hover:bg-pink-50"
                                      >
                                        Insert
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          )}

                        {/* APA References */}
                        {syncedData && syncedData.references.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-xs font-semibold text-[#1a1208] uppercase tracking-wider">
                                APA References ({syncedData.references.length})
                              </h4>
                              <button
                                onClick={insertAllReferences}
                                className="text-[10px] text-[#1a1208] hover:underline font-medium"
                              >
                                Insert all into References
                              </button>
                            </div>
                            {syncedData.references.map((ref, i) => (
                              <div
                                key={i}
                                className="mb-2 p-2 bg-gray-50 border border-[#e0d8d0] rounded text-xs text-[#5a4a3a] leading-relaxed group relative"
                              >
                                <p className="pr-12">{ref}</p>
                                <button
                                  onClick={() => insertIntoEditor(ref)}
                                  className="absolute top-2 right-2 text-[10px] text-[#1a1208] opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-pink-200 rounded px-1.5 py-0.5 hover:bg-pink-50"
                                >
                                  Insert
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
