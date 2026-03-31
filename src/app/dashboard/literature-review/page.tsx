"use client";

import { useMemo, useState } from "react";
import { useLiteratureReview } from "@/hooks/useLiteratureReview";
import ReviewTable from "@/components/literature-review/ReviewTable";
import ReviewTableFilters from "@/components/literature-review/ReviewTableFilters";
import ExportButton from "@/components/literature-review/ExportButton";
import Spinner from "@/components/ui/Spinner";

export default function LiteratureReviewPage() {
  const { entries, loading, updateEntry, deleteEntry } = useLiteratureReview();
  const [selectedSource, setSelectedSource] = useState("");
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

    if (selectedSource) {
      result = result.filter((e) => e.source === selectedSource);
    }

    if (selectedSection) {
      result = result.filter((e) => e.code_name === selectedSection);
    }

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
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
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

      <ReviewTable
        entries={filtered}
        onUpdate={updateEntry}
        onDelete={deleteEntry}
      />
    </div>
  );
}
