"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import ExportButton from "@/components/literature-review/ExportButton";
import ReviewTable from "@/components/literature-review/ReviewTable";
import ReviewTableFilters from "@/components/literature-review/ReviewTableFilters";
import Spinner from "@/components/ui/Spinner";
import { useLiteratureReview } from "@/hooks/useLiteratureReview";

export function LiteratureReviewWorkspace({
  embedded = false,
  projectId: providedProjectId,
}: {
  embedded?: boolean;
  projectId?: string;
}) {
  const params = useParams();
  const projectId = providedProjectId ?? (params.projectId as string);
  const searchParams = useSearchParams();
  const { entries, loading, loadingMore, hasMore, loadMore, updateEntry, deleteEntry } = useLiteratureReview(projectId);
  const [selectedSource, setSelectedSource] = useState(() => searchParams.get("source") ?? "");
  const [selectedSection, setSelectedSection] = useState("");
  const [searchText, setSearchText] = useState("");

  const sources = useMemo(() => {
    const unique = [...new Set(entries.map((entry) => entry.source))];
    return unique.sort();
  }, [entries]);

  const sections = useMemo(() => {
    const unique = [...new Set(entries.map((entry) => entry.code_name).filter(Boolean))];
    return unique.sort();
  }, [entries]);

  const filtered = useMemo(() => {
    let result = entries;
    if (selectedSource) result = result.filter((entry) => entry.source === selectedSource);
    if (selectedSection) result = result.filter((entry) => entry.code_name === selectedSection);
    if (searchText.trim()) {
      const lower = searchText.toLowerCase();
      result = result.filter(
        (entry) =>
          entry.highlighted_text.toLowerCase().includes(lower) ||
          entry.theme_category.toLowerCase().includes(lower) ||
          entry.user_notes.toLowerCase().includes(lower) ||
          entry.synthesis_paragraph.toLowerCase().includes(lower) ||
          entry.authors.toLowerCase().includes(lower) ||
          entry.source.toLowerCase().includes(lower) ||
          entry.code_name.toLowerCase().includes(lower),
      );
    }
    return result;
  }, [entries, selectedSource, selectedSection, searchText]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>;
  }

  return (
    <div className={embedded ? "h-full min-h-[620px] overflow-auto bg-white" : "-mx-8 -my-8"}>
      {!embedded ? <div style={{ height: "40px", flexShrink: 0, display: "flex", alignItems: "center", padding: "0 24px", gap: "24px", borderBottom: "1px solid #e0d8d0", background: "#fff", fontFamily: "var(--font-noto), 'Noto Sans', sans-serif", fontSize: "11px" }}>
        <Link href="/projects" style={{ color: "#7a6a5a", textDecoration: "none", fontSize: "11px" }}>← Projects</Link>
        <div style={{ flex: 1 }} />
        {[
          { n: "Workspace", h: `/dashboard/project/${projectId}` },
          { n: "ScholarAsk", h: `/dashboard/project/${projectId}/scholar-ask` },
          { n: "Meta Analysis", h: `/dashboard/project/${projectId}/meta-analysis` },
          { n: "Lit Review", h: `/dashboard/project/${projectId}/literature-review`, active: true },
          { n: "Paper Writer", h: `/dashboard/project/${projectId}/paper-writer` },
        ].map((tab) => (
          <Link key={tab.n} href={tab.h} style={{ color: tab.active ? "#c0392b" : "#7a6a5a", fontWeight: tab.active ? 700 : 400, borderBottom: tab.active ? "2px solid #c0392b" : "2px solid transparent", paddingBottom: "8px", marginBottom: "-1px", fontSize: "11px", textDecoration: "none" }}>{tab.n}</Link>
        ))}
      </div> : null}

      <div style={{ padding: "24px 32px" }}>
        <div className="mb-6 flex items-end justify-between gap-5 border-b border-[#eee9e4] pb-4 max-[860px]:flex-col max-[860px]:items-start">
          <div style={{ fontFamily: "var(--font-body), Arial, Helvetica, sans-serif" }}>
            <p className="mb-2 text-xs font-[850] leading-none text-[#a87f4f]">Workspace</p>
            <h1 className="m-0 text-[26px] font-[850] leading-[1.1] tracking-[-0.02em] text-[#121212]">
              Synthesized Literature Review
            </h1>
            <p className="mb-0 mt-2.5 max-w-[520px] text-[12.5px] font-semibold leading-[1.5] text-[#625d56]">
              Review, organize, and synthesize evidence from your highlighted sources.
            </p>
          </div>
          <ExportButton entries={filtered} />
        </div>
        <div className="mb-4">
          <ReviewTableFilters
            sources={sources}
            sections={sections}
            selectedSource={selectedSource}
            selectedSection={selectedSection}
            searchText={searchText}
            onSourceChange={setSelectedSource}
            onSectionChange={setSelectedSection}
            onSearchChange={setSearchText}
            totalCount={entries.length}
            filteredCount={filtered.length}
          />
        </div>
        <ReviewTable entries={filtered} onUpdate={updateEntry} onDelete={deleteEntry} />
        {hasMore && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              style={{ padding: "10px 24px", borderRadius: "50px", border: "1.5px solid #d4cdc5", background: "transparent", fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: 600, color: "#1a1208", cursor: "pointer", opacity: loadingMore ? 0.5 : 1 }}
            >
              {loadingMore ? "Loading..." : "Load more entries"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
