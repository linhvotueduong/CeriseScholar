"use client";

interface ReviewTableFiltersProps {
  sources: string[];
  sections: string[];
  selectedSource: string;
  selectedSection: string;
  searchText: string;
  onSourceChange: (source: string) => void;
  onSectionChange: (section: string) => void;
  onSearchChange: (text: string) => void;
  totalCount: number;
  filteredCount: number;
}

export default function ReviewTableFilters({
  sources,
  sections,
  selectedSource,
  selectedSection,
  searchText,
  onSourceChange,
  onSectionChange,
  onSearchChange,
  totalCount,
  filteredCount,
}: ReviewTableFiltersProps) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      {/* Filter by source PDF */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-500">Source:</label>
        <select
          value={selectedSource}
          onChange={(e) => onSourceChange(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#DE3163]"
        >
          <option value="">All PDFs</option>
          {sources.map((source) => (
            <option key={source} value={source}>{source}</option>
          ))}
        </select>
      </div>

      {/* Filter by section/code */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-500">Section:</label>
        <select
          value={selectedSection}
          onChange={(e) => onSectionChange(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#DE3163]"
        >
          <option value="">All Sections</option>
          {sections.map((section) => (
            <option key={section} value={section}>{section}</option>
          ))}
        </select>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-500">Search:</label>
        <input
          type="text"
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter by text, notes, synthesis..."
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 w-64 focus:outline-none focus:ring-1 focus:ring-[#DE3163]"
        />
      </div>

      <span className="text-xs text-gray-400 ml-auto">
        {filteredCount === totalCount
          ? `${totalCount} entries`
          : `${filteredCount} of ${totalCount} entries`}
      </span>
    </div>
  );
}
