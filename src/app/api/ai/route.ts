import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { callOpenRouterChat, OpenRouterError } from "@/lib/server/openrouter";
import { resolveAiCredentials } from "@/lib/server/aiCredentials";
import { BYOK_DECLINED_MESSAGE, isByokDeclinedStatus } from "@/lib/server/aiErrors";
import type { AiLane } from "@/lib/server/aiCredentials";
import { checkAiGuardrailsBeforeRequest } from "@/lib/server/aiGuardrails";
import { getMonthlyDefaultLaneUsage, recordAiUsage } from "@/lib/server/aiUsage";
import { INCLUDED_MONTHLY_ALLOWANCE, allowanceExceeded } from "@/lib/ai/allowance";

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

// BYOK request-time failure semantics (docs/byok-intake-design.md §2d): a
// declined key (revoked/out of credits) gets one clear, actionable message —
// never a silent fallback to the default lane.
function aiErrorResponse(err: OpenRouterError, lane: AiLane) {
  if (lane === "byok" && isByokDeclinedStatus(err.status)) {
    return NextResponse.json({ error: BYOK_DECLINED_MESSAGE }, { status: err.status });
  }
  return NextResponse.json({ error: err.message }, { status: err.status });
}

export async function POST(req: NextRequest) {
  // Declared outside the try block so the outer catch can still tell whether
  // this request was on the BYOK lane (needed for the failure mapping above).
  let lane: AiLane = "default";
  try {
    // Verify user is authenticated
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Rate limit: 15 AI requests per minute per user
    if (!checkRateLimit(user.id, "ai", 15, 60_000)) {
      return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
    }

    const body = await req.json();
    const { task, paper, mainAnswer } = body;
    const messages = Array.isArray(body.messages) ? body.messages : [];

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

    let systemPrompt = "";

    if (task === "paper_analysis" && paper && mainAnswer) {
      // Generate analysis of how a specific paper connects to the main answer.
      systemPrompt = `You are an academic research assistant. The user asked a research question and received an answer that cited a specific paper. Explain in ONE paragraph (4-5 sentences) exactly:
1. What this paper found
2. Whether the paper is direct evidence, adjacent evidence, or background context for the points in the main answer
3. From what angle/perspective this paper contributes

Be specific about the paper's methodology and findings. Do not force a support claim. If the paper does not directly support a claim in the answer, say that clearly and explain the safer connection.`;

      const allMessages = [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Main research answer (excerpt):\n${mainAnswer.slice(0, 500)}\n\nPaper to analyze:\nTitle: ${paper.title}\nAuthors: ${paper.authors?.join(", ")}\nYear: ${paper.year}\nJournal: ${paper.journal}\nAbstract: ${paper.abstract}\n\nExplain how this paper connects to the points in the answer above.`,
        },
      ];

      try {
        const { content, servedModel, usage } = await callOpenRouterChat({
          route: "paper_analysis",
          messages: allMessages,
          models,
          apiKey,
          timeoutMs: 25000,
          maxTokens: 500,
        });
        void recordAiUsage(supabase, {
          userId: user.id,
          projectId: null,
          feature: "paper_analysis",
          lane,
          servedModel,
          usage,
        });
        return NextResponse.json({ content });
      } catch (err) {
        if (err instanceof OpenRouterError) {
          return aiErrorResponse(err, lane);
        }
        throw err;
      }
    }

    // Generate APA citation from PDF first-page text
    if (task === "generate_apa") {
      const { pdfText, filename } = body;

      const apaPrompt = `You are an academic citation expert. Extract bibliographic information from the text below (taken from the first pages of a PDF) and generate a single APA 7th edition reference.

Rules:
- Return ONLY the APA reference string, nothing else — no explanation, no label, no quotes
- Format: Author, A. B., & Author, C. D. (Year). Title of the article. Journal Name, Volume(Issue), Pages. https://doi.org/xxx
- If information is missing, use what you can find. If you can't determine the year, use (n.d.)
- For the title, use sentence case (only capitalize first word and proper nouns)
- The filename is: ${filename || ""}

PDF text from first pages:
${(pdfText || "").slice(0, 3000)}`;

      try {
        const { content, servedModel, usage } = await callOpenRouterChat({
          route: "generate_apa",
          messages: [{ role: "system", content: "You generate APA citations. Return ONLY the citation string." }, { role: "user", content: apaPrompt }],
          models,
          apiKey,
          timeoutMs: 20000,
          maxTokens: 220,
        });
        void recordAiUsage(supabase, {
          userId: user.id,
          projectId: null,
          feature: "generate_apa",
          lane,
          servedModel,
          usage,
        });
        const apa = content.trim().replace(/^["']|["']$/g, "");
        return NextResponse.json({ apa });
      } catch {
        return NextResponse.json({ apa: "" });
      }
    }

    // Answer a question grounded only in a provided document excerpt (PDF viewer chat).
    if (task === "pdf_chat") {
      const { question, excerpt } = body;

      const pdfChatSystemPrompt =
        "You are a helpful academic assistant answering questions about a document. " +
        "Ground your answer ONLY in the excerpt provided below — never use outside knowledge or invent details. " +
        "If the excerpt does not contain enough information to answer, say so plainly instead of guessing.";

      try {
        const { content: result, servedModel, usage } = await callOpenRouterChat({
          route: "pdf_chat",
          messages: [
            { role: "system", content: pdfChatSystemPrompt },
            {
              role: "user",
              content: `Document excerpt:\n${String(excerpt || "").slice(0, 60000)}\n\nQuestion: ${String(question || "")}`,
            },
          ],
          models,
          apiKey,
          timeoutMs: 30000,
          maxTokens: 700,
        });
        void recordAiUsage(supabase, {
          userId: user.id,
          projectId: null,
          feature: "pdf_chat",
          lane,
          servedModel,
          usage,
        });
        return NextResponse.json({ result });
      } catch (err) {
        if (err instanceof OpenRouterError) {
          return aiErrorResponse(err, lane);
        }
        throw err;
      }
    }

    // Generic AI tasks (summarize, ask, explain, etc.)
    switch (task) {
      case "summarize":
        systemPrompt = "You are an academic research assistant. Summarize the given paper in 3-4 bullet points. Focus on: research question, methodology, key findings, implications.";
        break;
      case "suggest_keywords":
        systemPrompt = "Based on the research topic, suggest 5-8 search queries. Return ONLY queries, one per line.";
        break;
      default:
        systemPrompt = "You are a helpful academic research assistant.";
    }

    const allMessages = [{ role: "system", content: systemPrompt }, ...messages];

    const { content, servedModel, usage } = await callOpenRouterChat({
      route: task || "generic_ai",
      messages: allMessages,
      models,
      apiKey,
      timeoutMs: 22000,
      maxTokens: 500,
    });
    void recordAiUsage(supabase, {
      userId: user.id,
      projectId: null,
      feature: task || "generic",
      lane,
      servedModel,
      usage,
    });
    return NextResponse.json({ content });
  } catch (err) {
    if (err instanceof OpenRouterError) {
      return aiErrorResponse(err, lane);
    }
    console.error("AI route error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
