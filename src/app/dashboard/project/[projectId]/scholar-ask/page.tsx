"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Paper {
  id: string;
  title: string;
  authors: string[];
  year: number | null;
  abstract: string;
  citationCount: number;
  url: string;
  source: "semantic_scholar" | "openalex";
  isOpenAccess: boolean;
  journal: string;
}

// Search Semantic Scholar API
async function searchSemanticScholar(query: string): Promise<Paper[]> {
  try {
    const res = await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=20&fields=title,authors,year,abstract,citationCount,url,isOpenAccess,journal`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).map((p: Record<string, unknown>) => ({
      id: `ss_${p.paperId}`,
      title: (p.title as string) || "",
      authors: ((p.authors as { name: string }[]) || []).map(a => a.name),
      year: (p.year as number) || null,
      abstract: (p.abstract as string) || "",
      citationCount: (p.citationCount as number) || 0,
      url: (p.url as string) || `https://www.semanticscholar.org/paper/${p.paperId}`,
      source: "semantic_scholar" as const,
      isOpenAccess: (p.isOpenAccess as boolean) || false,
      journal: ((p.journal as { name?: string })?.name) || "",
    }));
  } catch { return []; }
}

// Search OpenAlex API
async function searchOpenAlex(query: string): Promise<Paper[]> {
  try {
    const res = await fetch(
      `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per_page=20&sort=relevance_score:desc`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((p: Record<string, unknown>) => ({
      id: `oa_${p.id}`,
      title: (p.title as string) || "",
      authors: ((p.authorships as { author: { display_name: string } }[]) || []).map(a => a.author.display_name),
      year: (p.publication_year as number) || null,
      abstract: reconstructAbstract(p.abstract_inverted_index as Record<string, number[]> | null),
      citationCount: (p.cited_by_count as number) || 0,
      url: (p.doi as string) ? `https://doi.org/${(p.doi as string).replace("https://doi.org/", "")}` : (p.id as string) || "",
      source: "openalex" as const,
      isOpenAccess: ((p.open_access as { is_oa?: boolean })?.is_oa) || false,
      journal: ((p.primary_location as { source?: { display_name?: string } })?.source?.display_name) || "",
    }));
  } catch { return []; }
}

// OpenAlex stores abstracts as inverted index — reconstruct
function reconstructAbstract(index: Record<string, number[]> | null): string {
  if (!index) return "";
  const words: [string, number][] = [];
  for (const [word, positions] of Object.entries(index)) {
    for (const pos of positions) {
      words.push([word, pos]);
    }
  }
  words.sort((a, b) => a[1] - b[1]);
  return words.map(w => w[0]).join(" ");
}

type SortBy = "relevance" | "citations" | "year";

export default function ScholarAskPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [query, setQuery] = useState("");
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("relevance");
  const [filterYear, setFilterYear] = useState("");
  const [filterOA, setFilterOA] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);

    // Search both APIs in parallel
    const [ssPapers, oaPapers] = await Promise.all([
      searchSemanticScholar(query),
      searchOpenAlex(query),
    ]);

    // Merge and deduplicate (prefer Semantic Scholar for duplicates)
    const allPapers = [...ssPapers];
    const ssTitles = new Set(ssPapers.map(p => p.title.toLowerCase()));
    for (const p of oaPapers) {
      if (!ssTitles.has(p.title.toLowerCase())) {
        allPapers.push(p);
      }
    }

    setPapers(allPapers);
    setLoading(false);
  }, [query]);

  // Apply filters and sorting
  const filteredPapers = papers
    .filter(p => {
      if (filterYear && p.year && p.year < parseInt(filterYear)) return false;
      if (filterOA && !p.isOpenAccess) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "citations") return (b.citationCount || 0) - (a.citationCount || 0);
      if (sortBy === "year") return (b.year || 0) - (a.year || 0);
      return 0; // relevance = original order
    });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <Link href={`/dashboard/project/${projectId}`} className="text-sm text-gray-500 hover:text-[#DE3163]">
          &larr; Back to project
        </Link>
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">ScholarAsk</h1>
        <p className="text-gray-500">Search millions of academic papers. Powered by Semantic Scholar & OpenAlex.</p>
      </div>

      {/* Search box */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <form onSubmit={e => { e.preventDefault(); handleSearch(); }} className="flex gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="What would you like to learn more about?"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#DE3163] focus:border-transparent"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-6 py-3 bg-[#DE3163] text-white font-medium rounded-lg hover:bg-[#c4294f] disabled:opacity-50 transition-colors text-sm"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        {/* Quick suggestions */}
        {!searched && (
          <div className="flex flex-wrap gap-2 mt-3">
            {[
              "geopolitical uncertainty student mental health",
              "technology disruption academic performance",
              "international students career procrastination",
              "resilience coping strategies college students",
            ].map(s => (
              <button key={s} onClick={() => { setQuery(s); }}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors">
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      {searched && papers.length > 0 && (
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Sort:</label>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as SortBy)}
              className="text-xs border border-gray-300 rounded px-2 py-1">
              <option value="relevance">Relevance</option>
              <option value="citations">Most Cited</option>
              <option value="year">Newest First</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Year from:</label>
            <input type="number" value={filterYear} onChange={e => setFilterYear(e.target.value)}
              placeholder="2020" className="text-xs border border-gray-300 rounded px-2 py-1 w-16" />
          </div>
          <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
            <input type="checkbox" checked={filterOA} onChange={e => setFilterOA(e.target.checked)}
              className="rounded accent-[#DE3163]" />
            Open Access only
          </label>
          <span className="text-xs text-gray-400 ml-auto">
            {filteredPapers.length} of {papers.length} papers
          </span>
        </div>
      )}

      {/* Results */}
      {loading && (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-[#DE3163] mx-auto" />
          <p className="text-gray-500 mt-3">Searching academic databases...</p>
        </div>
      )}

      {searched && !loading && papers.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500">No papers found. Try different keywords.</p>
        </div>
      )}

      {!loading && filteredPapers.length > 0 && (
        <div className="space-y-3">
          {filteredPapers.map(paper => (
            <div key={paper.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-colors">
              {/* Title + meta */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <a href={paper.url} target="_blank" className="text-sm font-semibold text-gray-900 hover:text-[#DE3163] leading-snug">
                    {paper.title}
                  </a>
                  <p className="text-xs text-gray-500 mt-1">
                    {paper.authors.slice(0, 3).join(", ")}{paper.authors.length > 3 ? ` +${paper.authors.length - 3} more` : ""}
                    {paper.year && ` (${paper.year})`}
                    {paper.journal && ` — ${paper.journal}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {paper.isOpenAccess && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-medium">OA</span>
                  )}
                  <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                    {paper.citationCount} cited
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">
                    {paper.source === "semantic_scholar" ? "S2" : "OA"}
                  </span>
                </div>
              </div>

              {/* Abstract toggle */}
              {paper.abstract && (
                <div className="mt-2">
                  {expandedId === paper.id ? (
                    <>
                      <p className="text-xs text-gray-600 leading-relaxed">{paper.abstract}</p>
                      <button onClick={() => setExpandedId(null)} className="text-xs text-[#DE3163] mt-1 hover:underline">
                        Show less
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-gray-600 line-clamp-2">{paper.abstract}</p>
                      <button onClick={() => setExpandedId(paper.id)} className="text-xs text-[#DE3163] mt-1 hover:underline">
                        Show full abstract
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-2">
                <a href={paper.url} target="_blank" className="text-[10px] px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">
                  View Paper &nearr;
                </a>
                <button
                  onClick={() => {
                    const citation = `${paper.authors.slice(0, 3).join(", ")}${paper.authors.length > 3 ? " et al." : ""}${paper.year ? ` (${paper.year})` : ""}. ${paper.title}.${paper.journal ? ` ${paper.journal}.` : ""}`;
                    navigator.clipboard.writeText(citation);
                  }}
                  className="text-[10px] px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                >
                  Copy Citation
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
