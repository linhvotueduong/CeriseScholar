import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { callOpenRouterChat, OpenRouterError } from "@/lib/server/openrouter";
import { resolveAiCredentials } from "@/lib/server/aiCredentials";
import type { AiLane } from "@/lib/server/aiCredentials";
import { BYOK_DECLINED_MESSAGE, isByokDeclinedStatus } from "@/lib/server/aiErrors";
import { checkAiGuardrailsBeforeRequest } from "@/lib/server/aiGuardrails";
import { getMonthlyDefaultLaneUsage, recordAiUsage } from "@/lib/server/aiUsage";
import { INCLUDED_MONTHLY_ALLOWANCE, allowanceExceeded } from "@/lib/ai/allowance";
import { legacyResearchJourneyAdapter } from "@/lib/research/researchJourneyMigration";

const OPENALEX_TIMEOUT_MS = 8000;
const AI_TIMEOUT_MS = 25000;

type ResearchMessage = { role: "system" | "user" | "assistant"; content: string };

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
            // Ignore: cookies can't be set in API routes after streaming starts.
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

// BYOK request-time failure semantics (docs/byok-intake-design.md §2d): a
// declined key (revoked/out of credits) gets one clear, actionable message —
// never a silent fallback to the default lane. Otherwise keep the existing
// friendlier timeout copy, then fall back to whatever OpenRouter said.
function researchAiErrorResponse(err: OpenRouterError, lane: AiLane) {
  if (lane === "byok" && isByokDeclinedStatus(err.status)) {
    return NextResponse.json({ error: BYOK_DECLINED_MESSAGE }, { status: err.status });
  }
  const message =
    err.status === 504 ? "AI took too long. Try a shorter question or use Research Answer." : err.message;
  return NextResponse.json({ error: message }, { status: err.status });
}

export async function POST(req: NextRequest) {
  // Declared outside the try block so the outer catch can still tell whether
  // this request was on the BYOK lane (docs/byok-intake-design.md §2d).
  let lane: AiLane = "default";
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

    const body = await req.json();
    const { query, followUp, previousAnswer, projectId } = body;
    const legacyJourney = legacyResearchJourneyAdapter({
      answerMode: body.answerMode,
      journeyIntent: body.journeyIntent,
      projectId,
    });
    if (legacyJourney.legacy) {
      return NextResponse.json({
        answer: "Research Journey has moved to the project-aware Research Mentor. This historical request was not treated as evidence and did not change Stage 1 readiness. Open the Mentor to continue with a checksum-bound, review-before-apply suggestion.",
        references: [],
        paperCount: 0,
        totalFound: 0,
        legacyJourneyAdapter: {
          status: "moved-to-research-mentor",
          mentorMode: legacyJourney.mentorMode,
          destination: legacyJourney.destination,
          pathwayChanged: false,
          readinessChanged: false,
        },
      });
    }

    // Step 1: Generate 6 search queries
    const searchQueries = generateSearchQueries(query);

    // Keep this fast enough for Azure Static Web Apps' managed backend while
    // still preserving the richer ScholarAsk answer shape.
    const searchResults = await Promise.all(
      searchQueries.slice(0, 3).map((q) => searchOpenAlex(q, 12))
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
    const papers = allPapers.slice(0, 28);
    papers.forEach((p, i) => (p.num = i + 1));

    // Use enough abstracts for a professor-style synthesis, but keep the prompt
    // bounded so Azure Free does not return a backend timeout.
    const papersWithAbstracts = papers.filter((p) => p.abstract && p.abstract.length > 30);
    const aiPapers = papersWithAbstracts.slice(0, 5);

    // Step 4: Full context with proper abstracts
    const papersContext = aiPapers
      .map((p) => `[${p.num}] ${p.authors.slice(0, 2).join(", ")}${p.authors.length > 2 ? " et al." : ""} (${p.year || "n.d."}). "${p.title}". ${p.journal}.\nFindings: ${p.abstract.slice(0, 220)}`)
      .join("\n\n");

    // Step 5: Professor-level prompt with detailed, multi-source citations.
    const researchAnswerPrompt = `You are a senior professor conducting a systematic literature review. You have ${aiPapers.length} peer-reviewed sources:

${papersContext}

ANALYSIS REQUIREMENTS:
Write a cautious evidence synthesis, not an argument trying to prove the student's idea.
First judge whether the provided sources are direct evidence, adjacent evidence, or background context.
Do not claim causality, bidirectionality, mediation, or a precise mechanism unless the cited sources directly measure that relationship.
If the best support is adjacent, say so gently and frame the answer as a plausible research bridge.
Write in the detailed ScholarAsk format below. Finish every section. If space is tight,
shorten paragraphs instead of dropping sections or ending mid-sentence.
Target 900-1,150 words total. Keep every sentence complete.
Do not use markdown horizontal rules, divider lines, or standalone "---" separators.
Avoid dash-heavy AI-style prose. Do not use em dashes. Prefer periods, commas, colons, or short separate sentences.

1. "## Summary Answer": exactly 4 sentences. Directly answer the question, but qualify the answer if the sources are adjacent or correlational.
2. "## Key Mechanisms": exactly 3 subsections using "###" headings. Each subsection should be one focused paragraph of 3-4 sentences that explains a distinct mechanism, pathway, or theory; state when the mechanism is inferred rather than directly demonstrated.
3. "## Evidence Map": include a markdown table with these columns exactly: | Theme | What It Means | Evidence | Caveat |. Use exactly 4 rows and keep cells concise. The Caveat column must identify whether the evidence is direct, adjacent, background, correlational, population-limited, or method-limited.
4. "## What the Evidence Suggests": synthesize agreements and differences across sources in exactly 2 paragraphs of 3-4 sentences each. Mention when a source is indirect, adjacent, background context, or only correlational.
5. "## Limitations and Gaps": use exactly 4 bullets. Each bullet should be one sentence covering missing evidence, measurement limits, population limits, or what cannot be concluded yet.
6. "**Confidence:** High/Medium/Low": explain evidence consistency in exactly 2 sentences. Use Medium or Low when direct studies are missing, even if the idea is promising.
7. End with exactly 3 follow-up research questions starting with "→ ". Do not add anything after the third question.

CITATION RULES:
- Support major claims with bracket citations like [1] [3].
- Use at least ${Math.min(aiPapers.length, 5)} different sources overall.
- Do not invent source numbers that are not listed above.
- Prefer depth and clarity over a tiny answer, but stay focused enough to finish on a serverless backend.`;

    const systemPrompt = researchAnswerPrompt;

    const messages: ResearchMessage[] = [
      { role: "system", content: systemPrompt },
    ];

    if (followUp && previousAnswer) {
      messages.push({ role: "assistant", content: previousAnswer });
      messages.push({ role: "user", content: followUp });
    } else {
      messages.push({ role: "user", content: query });
    }

    // Every signed-in user gets AI now — OpenRouter replaces the old hosted-email bypass.
    const credentials = await resolveAiCredentials(user.id, supabase);
    const { apiKey, models } = credentials;
    lane = credentials.lane;

    const guardrailCheck = await checkAiGuardrailsBeforeRequest(supabase, user.id, lane, models);
    if (!guardrailCheck.allowed) {
      return NextResponse.json({ error: guardrailCheck.reason }, { status: 429 });
    }

    // Default-lane fairness cap (Phase 2). BYOK never enforces this — it's the
    // user's own key and bill, so `enforceAllowance` is false on that lane.
    if (credentials.enforceAllowance) {
      const used = await getMonthlyDefaultLaneUsage(supabase, user.id, new Date());
      if (allowanceExceeded(used, INCLUDED_MONTHLY_ALLOWANCE)) {
        return NextResponse.json(
          {
            error: `This month's Cerise test allowance has been used (${INCLUDED_MONTHLY_ALLOWANCE} requests). Connect an OpenRouter key in Settings -> AI, then add OpenRouter credit for fuller usage.`,
          },
          { status: 429 }
        );
      }
    }

    try {
      const { content: answer, servedModel, usage } = await callOpenRouterChat({
        route: "research",
        messages,
        models,
        apiKey,
        timeoutMs: AI_TIMEOUT_MS,
        maxTokens: 2200,
      });
      void recordAiUsage(supabase, {
        userId: user.id,
        projectId: projectId ?? null,
        feature: "research",
        lane,
        servedModel,
        usage,
      });
      // Evidence-search activity remains useful for recency, but never satisfies
      // Stage 1 pathway readiness. Readiness is derived from canonical artifacts.
      if (projectId) {
        void supabase
          .from("dashboard_activity_events")
          .insert({
            user_id: user.id,
            project_id: projectId,
            event_type: "research_query_submitted",
            section_id: "scholarask",
            label: "Research answer",
          })
          .then(({ error }) => {
            if (error) {
              console.error("Failed to log research_query_submitted activity", error.message);
            }
          });
      }

      return NextResponse.json({
        answer,
        references: papers,
        paperCount: aiPapers.length,
        totalFound: papers.length,
      });
    } catch (err) {
      if (err instanceof OpenRouterError) {
        return researchAiErrorResponse(err, lane);
      }
      throw err;
    }
  } catch (err) {
    if (err instanceof OpenRouterError) {
      return researchAiErrorResponse(err, lane);
    }
    console.error("Research route error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
