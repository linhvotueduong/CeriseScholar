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
  PROPOSAL_SECTIONS,
  SECTION_LABELS,
  SECTION_GUIDANCE,
} from "@/types/paper-section";

export function PaperWriterWorkspace({
  embedded = false,
  mode = "paper",
  projectId: providedProjectId,
}: {
  embedded?: boolean;
  mode?: "paper" | "proposal";
  projectId?: string;
}) {
  const params = useParams();
  const projectId = providedProjectId ?? (params.projectId as string);
  const { sections, loading, saving, saveError, updateSection, syncMaterials } =
    usePaperWriter(projectId);

  const [project, setProject] = useState<Project | null>(null);
  const sectionKeys: readonly PaperSectionKey[] =
    mode === "proposal" ? PROPOSAL_SECTIONS : PAPER_SECTIONS;
  const literatureReviewSection: PaperSectionKey =
    mode === "proposal" ? "proposal_literature_review" : "literature_review";
  const referencesSection: PaperSectionKey =
    mode === "proposal" ? "proposal_references" : "references";
  const writerLabel = mode === "proposal" ? "Research Proposal Writer" : "Paper Writer";
  const [activeSection, setActiveSection] = useState<PaperSectionKey>(sectionKeys[0]);
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
      const current = sections[literatureReviewSection]?.content || "";
      const newContent = current ? current + "\n\n" + text : text;
      updateSection(literatureReviewSection, newContent);
      setActiveSection(literatureReviewSection);
    }
  }

  // Insert all references
  function insertAllReferences() {
    if (!syncedData) return;
    const text = syncedData.references.join("\n\n");
    if (text) {
      const current = sections[referencesSection]?.content || "";
      const newContent = current ? current + "\n\n" + text : text;
      updateSection(referencesSection, newContent);
      setActiveSection(referencesSection);
    }
  }

  // Calculate word count for current section
  const currentContent = sections[activeSection]?.content || "";
  const wordCount = currentContent.trim()
    ? currentContent.trim().split(/\s+/).length
    : 0;

  // Calculate total word count
  const totalWords = sectionKeys.reduce((sum, key) => {
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
    <div className={embedded ? "h-full min-h-[620px]" : "-mx-8 -my-8"}>
      <div className={embedded ? "flex h-full min-h-[620px] flex-col" : "flex h-[calc(100vh-57px)] flex-col"}>
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2 bg-white border-b border-[#e0d8d0] px-3 py-2 sm:gap-3 sm:px-4">
          {!embedded ? <Link
            href={`/dashboard/project/${projectId}`}
            className="text-sm text-[#7a6a5a] hover:text-[#1a1208] transition-colors"
          >
            &larr; Workspace
          </Link> : <strong className="text-sm text-[#1a1208]">{writerLabel}</strong>}
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
          <span className="text-sm text-[#9a8a7a]">/ {writerLabel}</span>

          <div className="ml-auto flex flex-wrap items-center justify-end gap-2 sm:gap-3">
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
        <div className="flex flex-1 flex-col overflow-y-auto xl:flex-row xl:overflow-hidden">
          {/* Left sidebar: section nav */}
          <div className="flex w-full shrink-0 flex-col border-b border-[#e0d8d0] bg-white xl:w-52 xl:border-b-0 xl:border-r">
            <div className="px-3 py-3 border-b border-gray-100">
              <h3 className="text-xs font-semibold text-[#7a6a5a] uppercase tracking-wider">
                {mode === "proposal" ? "Proposal sections" : "Sections"}
              </h3>
            </div>
            <div className="flex flex-1 overflow-x-auto py-1 xl:block xl:overflow-x-hidden xl:overflow-y-auto">
              {sectionKeys.map((key, index) => {
                const hasContent = !!(
                  sections[key]?.content && sections[key].content.trim()
                );
                return (
                  <button
                    key={key}
                    onClick={() => setActiveSection(key)}
                    className={`flex min-w-[170px] items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors xl:w-full xl:min-w-0 ${
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
            {!embedded ? <div className="border-t border-[#e0d8d0] p-3 space-y-1">
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
            </div> : null}
          </div>

          {/* Center: editor */}
          <div className="flex min-h-[560px] flex-1 flex-col overflow-hidden">
            {/* Section header */}
            <div className="flex items-center justify-between gap-4 border-b border-[#e0d8d0] bg-white px-4 py-3 sm:px-6">
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
            <div className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-6">
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
            <div className="flex max-h-80 w-full shrink-0 flex-col overflow-hidden border-t border-[#e0d8d0] bg-white xl:max-h-none xl:w-72 xl:border-l xl:border-t-0">
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

                    {activeSection === literatureReviewSection && (
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

                    {activeSection === referencesSection && (
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
