"use client";

import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useLiteratureReview } from "@/hooks/useLiteratureReview";
import ReviewTable from "@/components/literature-review/ReviewTable";
import ReviewTableFilters from "@/components/literature-review/ReviewTableFilters";
import ExportButton from "@/components/literature-review/ExportButton";
import Spinner from "@/components/ui/Spinner";
import Link from "next/link";

export default function ProjectLiteratureReviewPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const searchParams = useSearchParams();
  const { entries, loading, loadingMore, hasMore, loadMore, updateEntry, deleteEntry } = useLiteratureReview(projectId);
  // Deep-link from the Finish button's moment-of-completion toast
  // (docs/research-readiness-checklist-model.md §7.1/§7.4.4): pre-filter the table to
  // the just-finished source via ?source=<display name>. Read once as the initial
  // state (not in an effect — this page remounts on navigation, and the user is free
  // to change the filter afterward without the URL fighting them back).
  const [selectedSource, setSelectedSource] = useState(() => searchParams.get("source") ?? "");
  const [selectedSection, setSelectedSection] = useState("");
  const [searchText, setSearchText] = useState("");

  const sources = useMemo(() => {
    const unique = [...new Set(entries.map((e) => e.source))];
    return unique.sort();
  }, [entries]);

  const sections = useMemo(() => {
    const unique = [...new Set(entries.map((e) => e.code_name).filter(Boolean))];
    return unique.sort();
  }, [entries]);

  const filtered = useMemo(() => {
    let result = entries;
    if (selectedSource) result = result.filter((e) => e.source === selectedSource);
    if (selectedSection) result = result.filter((e) => e.code_name === selectedSection);
    if (searchText.trim()) {
      const lower = searchText.toLowerCase();
      result = result.filter(
        (e) =>
          e.highlighted_text.toLowerCase().includes(lower) ||
          e.theme_category.toLowerCase().includes(lower) ||
          e.user_notes.toLowerCase().includes(lower) ||
          e.synthesis_paragraph.toLowerCase().includes(lower) ||
          e.authors.toLowerCase().includes(lower) ||
          e.source.toLowerCase().includes(lower) ||
          e.code_name.toLowerCase().includes(lower)
      );
    }
    return result;
  }, [entries, selectedSource, selectedSection, searchText]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>;
  }

  return (
    <div className="-mx-8 -my-8">
      {/* Sub-nav tabs */}
      <div style={{ height: "40px", flexShrink: 0, display: "flex", alignItems: "center", padding: "0 24px", gap: "24px", borderBottom: "1px solid #e0d8d0", background: "#fff", fontFamily: "var(--font-noto), 'Noto Sans', sans-serif", fontSize: "11px" }}>
        <Link href="/dashboard" style={{ color: "#7a6a5a", textDecoration: "none", fontSize: "11px" }}>← Projects</Link>
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
      </div>

      {/* Content */}
      <div style={{ padding: "24px 32px" }}>
        <div className="flex items-center justify-between mb-6">
          <h1 style={{ fontFamily: "var(--font-display), 'DM Serif Display', serif", fontSize: "24px", fontWeight: 400, color: "#1a1208", margin: 0 }}>
            Synthesized Literature Review
          </h1>
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
          <div className="flex justify-center mt-6">
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
