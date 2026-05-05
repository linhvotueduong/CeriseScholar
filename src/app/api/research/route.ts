import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { callOllamaChat, OllamaError } from "@/lib/server/ollama";

const OPENALEX_TIMEOUT_MS = 8000;
const AI_TIMEOUT_MS = 25000;

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore — cookies can't be set in API routes after streaming starts
          }
        },
      },
    }
  );
}

export interface PaperRef {
  num: number;
  title: string;
  authors: string[];
  year: number | null;
  abstract: string;
  journal: string;
  citationCount: number;
  url: string;
  isOpenAccess: boolean;
}

// Generate 6 diverse search queries from user question
function generateSearchQueries(userQuery: string): string[] {
  const stopWords = new Set([
    "the","a","an","is","are","was","were","be","been","being","have","has",
    "had","do","does","did","will","would","could","should","may","might",
    "shall","can","need","to","of","in","for","on","with","at","by","from",
    "as","into","through","during","before","after","between","out","off",
    "over","under","again","then","here","there","when","where","why","how",
    "all","each","every","both","few","more","most","other","some","such",
    "no","not","only","own","same","so","than","too","very","just","because",
    "but","and","or","if","while","about","against","them","their","this",
    "that","these","those","it","its","what","which","who","whom","whose",
    "get","getting","got","leading","leads","lead","also","like","make",
    "making","affects","affect","affected","new","knowledge",
  ]);

  const words = userQuery
    .toLowerCase()
    .replace(/[?.,!;:'"()]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  const queries: string[] = [];

  // Full query
  queries.push(words.slice(0, 10).join(" "));
  // First half
  if (words.length > 3) queries.push(words.slice(0, Math.ceil(words.length / 2)).join(" "));
  // Second half
  if (words.length > 3) queries.push(words.slice(Math.ceil(words.length / 2)).join(" "));
  // Middle chunk
  if (words.length > 5) queries.push(words.slice(1, 5).join(" "));
  // Pairs
  if (words.length > 6) queries.push(words.slice(0, 3).join(" ") + " " + words.slice(-2).join(" "));
  // Single key concepts
  if (words.length > 4) queries.push(words.slice(3, 7).join(" "));

  return [...new Set(queries)].filter((q) => q.trim().length > 3);
}

async function searchOpenAlex(query: string, limit = 25): Promise<PaperRef[]> {
  try {
    const res = await fetch(
      `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per_page=${limit}&sort=relevance_score:desc&mailto=cerisescholar@gmail.com`,
      { signal: AbortSignal.timeout(OPENALEX_TIMEOUT_MS) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((p: Record<string, unknown>, i: number) => ({
      num: i + 1,
      title: (p.title as string) || "",
      authors: ((p.authorships as { author: { display_name: string } }[]) || []).slice(0, 4).map((a) => a.author.display_name),
      year: (p.publication_year as number) || null,
      abstract: reconstructAbstract(p.abstract_inverted_index as Record<string, number[]> | null),
      journal: (p.primary_location as { source?: { display_name?: string } })?.source?.display_name || "",
      citationCount: (p.cited_by_count as number) || 0,
      url: (p.doi as string) ? `https://doi.org/${(p.doi as string).replace("https://doi.org/", "")}` : (p.id as string) || "",
      isOpenAccess: (p.open_access as { is_oa?: boolean })?.is_oa || false,
    }));
  } catch { return []; }
}

function reconstructAbstract(index: Record<string, number[]> | null): string {
  if (!index) return "";
  const words: [string, number][] = [];
  for (const [word, positions] of Object.entries(index)) {
    for (const pos of positions) words.push([word, pos]);
  }
  words.sort((a, b) => a[1] - b[1]);
  return words.map((w) => w[0]).join(" ");
}

export async function POST(req: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Rate limit: 10 research requests per minute per user
    if (!checkRateLimit(user.id, "research", 10, 60_000)) {
      return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
    }

    const { query, followUp, previousAnswer, deepResearch } = await req.json();

    // Step 1: Generate 6 search queries
    const searchQueries = generateSearchQueries(query);

    // Keep this fast enough for Azure Static Web Apps' managed backend while
    // still preserving the richer ScholarAsk answer shape.
    const searchResults = await Promise.all(
      searchQueries.slice(0, deepResearch ? 4 : 3).map((q) => searchOpenAlex(q, deepResearch ? 16 : 12))
    );

    // Step 3: Merge, deduplicate, sort by citations
    const seen = new Set<string>();
    const allPapers: PaperRef[] = [];
    for (const results of searchResults) {
      for (const paper of results) {
        const key = paper.title.toLowerCase().trim();
        if (!seen.has(key) && paper.title.length > 10) {
          seen.add(key);
          allPapers.push(paper);
        }
      }
    }
    allPapers.sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0));

    // Keep enough references for source exploration, but do not overfeed the AI prompt.
    const papers = allPapers.slice(0, deepResearch ? 40 : 28);
    papers.forEach((p, i) => (p.num = i + 1));

    // Use enough abstracts for a professor-style synthesis, but keep the prompt
    // bounded so Azure Free does not return a backend timeout.
    const papersWithAbstracts = papers.filter((p) => p.abstract && p.abstract.length > 30);
    const aiPapers = papersWithAbstracts.slice(0, deepResearch ? 8 : 5);

    // Step 4: Full context with proper abstracts
    const papersContext = aiPapers
      .map((p) => `[${p.num}] ${p.authors.slice(0, 2).join(", ")}${p.authors.length > 2 ? " et al." : ""} (${p.year || "n.d."}). "${p.title}". ${p.journal}.\nFindings: ${p.abstract.slice(0, 220)}`)
      .join("\n\n");

    // Step 5: Professor-level prompt — detailed, multi-source citations
    const systemPrompt = `You are a senior professor conducting a systematic literature review. You have ${aiPapers.length} peer-reviewed sources:

${papersContext}

ANALYSIS REQUIREMENTS:
Write in the detailed ScholarAsk format below. Finish every section. If space is tight,
shorten paragraphs instead of dropping sections or ending mid-sentence.

1. "## Summary Answer" — 3-4 sentences. Directly answer the question, name the likely relationship, and explain the core causal/behavioral mechanism.
2. "## Key Mechanisms" — exactly 3 subsections using "###" headings. Each subsection should be one focused paragraph that explains a distinct mechanism, pathway, or theory.
3. "## Evidence Map" — include a markdown table with these columns exactly: | Theme | What It Means | Evidence | Caveat |. Use 4-5 rows.
4. "## What the Evidence Suggests" — synthesize agreements and differences across sources in 2 concise paragraphs. Mention when a source is indirect or when evidence is only correlational.
5. "## Limitations and Gaps" — explain missing evidence, measurement limits, population limits, and what cannot be concluded yet.
6. "**Confidence:** High/Medium/Low" — explain evidence consistency in 2 concise sentences.
7. End with exactly 3 follow-up research questions starting with "→ ".

CITATION RULES:
- Support major claims with bracket citations like [1] [3].
- Use at least ${Math.min(aiPapers.length, 5)} different sources overall.
- Do not invent source numbers that are not listed above.
- Prefer depth and clarity over a tiny answer, but stay focused enough to finish on a serverless backend.`;

    const messages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt },
    ];

    if (followUp && previousAnswer) {
      messages.push({ role: "assistant", content: previousAnswer });
      messages.push({ role: "user", content: followUp });
    } else {
      messages.push({ role: "user", content: query });
    }

    try {
      const answer = await callOllamaChat({
        route: "research",
        messages,
        timeoutMs: AI_TIMEOUT_MS,
        numPredict: deepResearch ? 1900 : 1400,
      });
      return NextResponse.json({
        answer,
        references: papers,
        paperCount: aiPapers.length,
        totalFound: papers.length,
      });
    } catch (err) {
      if (err instanceof OllamaError) {
        const message =
          err.status === 504
            ? "AI took too long. Try a shorter question or turn off Deep research."
            : err.message;
        return NextResponse.json({ error: message }, { status: err.status });
      }
      throw err;
    }
  } catch (err) {
    if (err instanceof OllamaError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Research route error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
