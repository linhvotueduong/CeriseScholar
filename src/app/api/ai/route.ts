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

    // Research Assistant — the status-copilot chat card on /research-desk.
    // NOT ScholarAsk (that's for paper content): this is grounded in a
    // client-built JSON snapshot of the user's REAL portal data (project
    // phases, section metrics, synthesis funnel, next steps, recent
    // activity, evidence library counts — see
    // src/lib/research/assistantContext.ts for exactly what goes into it),
    // never in outside knowledge about the user.
    if (task === "research_assistant") {
      const question = typeof body.question === "string" ? body.question.trim().slice(0, 2000) : "";
      if (!question) {
        return NextResponse.json({ error: "Ask a question to get a reply." }, { status: 400 });
      }

      const context = body.context && typeof body.context === "object" ? body.context : {};
      let contextJson: string;
      try {
        contextJson = JSON.stringify(context);
      } catch {
        return NextResponse.json(
          { error: "Couldn't read your portal data snapshot. Please try again." },
          { status: 400 }
        );
      }
      // The client-side snapshot builder keeps this well under 8KB by design
      // (assistantContext.ts) — this is a defensive backstop, not the normal path.
      if (contextJson.length > 8000) {
        return NextResponse.json(
          { error: "Your portal data snapshot is too large for this request." },
          { status: 400 }
        );
      }

      const rawHistory: unknown[] = Array.isArray(body.history) ? body.history : [];
      const history = rawHistory
        .filter(
          (entry): entry is { role: "user" | "assistant"; content: string } =>
            !!entry &&
            typeof entry === "object" &&
            ((entry as { role?: unknown }).role === "user" || (entry as { role?: unknown }).role === "assistant") &&
            typeof (entry as { content?: unknown }).content === "string"
        )
        .slice(-6)
        .map((entry) => ({ role: entry.role, content: entry.content.slice(0, 1000) }));

      const researchAssistantSystemPrompt =
        "You are Cerise, the research assistant inside Cerise Scholar's Research Desk. " +
        "You are given a JSON snapshot of the user's REAL research status — project names/phases/progress, " +
        "stats, per-section overview metrics, synthesis funnel numbers, next steps, recent activity, and evidence " +
        "library counts. Ground every number or claim you make in that snapshot; if the snapshot doesn't contain " +
        "something, say plainly that you can't see it rather than guessing or inventing a number. Explain portal " +
        "concepts (sections, readiness, the synthesis funnel, the monthly AI allowance) in plain, encouraging " +
        "language when the user seems unsure what something means. For questions about the CONTENT of a specific " +
        "paper or source — not the user's overall progress — tell the user to open ScholarAsk instead; you don't " +
        "have access to paper text here. Keep answers short (at most about 180 words), concrete, and next-step " +
        "oriented.";

      const allMessages = [
        { role: "system", content: researchAssistantSystemPrompt },
        ...history,
        { role: "user", content: `Portal data snapshot (JSON):\n${contextJson}\n\nQuestion: ${question}` },
      ];

      try {
        const { content, servedModel, usage } = await callOpenRouterChat({
          route: "research_assistant",
          messages: allMessages,
          models,
          apiKey,
          timeoutMs: 25000,
          temperature: 0.3,
          maxTokens: 500,
        });
        void recordAiUsage(supabase, {
          userId: user.id,
          projectId: null,
          feature: "research_assistant",
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

    // Daily AI behavior-insight generation (Stage 2 of "personalized AI data
    // analysis") — reads Stage 1's deterministic BehaviorProfile
    // (src/lib/dashboard/behaviorProfile.ts) computed client-side and asks the
    // model for ONE short, honest, personalized note. Cached one-per-day in
    // ai_behavior_insights (migration 028); the client (useDashboardState.ts)
    // guards this to at most one attempt per project per day.
    if (task === "behavior_insight") {
      const { projectId, projectName } = body;
      const profile = body.profile;

      if (typeof projectId !== "string" || !projectId) {
        return NextResponse.json({ error: "A project is required." }, { status: 400 });
      }
      if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
        return NextResponse.json({ error: "Behavior profile data is missing or invalid." }, { status: 400 });
      }
      let profileJson: string;
      try {
        profileJson = JSON.stringify(profile);
      } catch {
        return NextResponse.json({ error: "Behavior profile data is missing or invalid." }, { status: 400 });
      }
      if (profileJson.length > 4000) {
        return NextResponse.json({ error: "Behavior profile data is too large." }, { status: 400 });
      }

      const FOCUS_SECTIONS = new Set([
        "workspace",
        "literature-review",
        "scholarask",
        "draft",
        "meta-analysis",
        "citations",
      ]);

      const behaviorInsightSystemPrompt =
        "You are Cerise, a research-habit coach inside Cerise Scholar. You are given a JSON " +
        "behavior profile — deterministic, real usage signals for one user/project (task " +
        "completion rate, active days per week, longest gap since last activity, which " +
        "readiness-relevant section they avoid, how often they jump between sections). Return " +
        "STRICT JSON only, with no prose outside the JSON, with exactly these two keys: " +
        '{"guidance": string, "focus_section": string}. ' +
        "guidance must be at most 40 words, plain, encouraging, and CONCRETE — personalize it to " +
        "the real pattern in the profile (mention a real gap, an avoided section, or a strong " +
        "rhythm as appropriate). Never invent a number that is not in the profile. focus_section " +
        'must be exactly one of: "workspace", "literature-review", "scholarask", "draft", ' +
        '"meta-analysis", "citations".';

      const projectLabel = typeof projectName === "string" && projectName.trim() ? projectName.trim() : "this project";

      try {
        const { content, servedModel, usage } = await callOpenRouterChat({
          route: "behavior_insight",
          messages: [
            { role: "system", content: behaviorInsightSystemPrompt },
            {
              role: "user",
              content: `Project: ${projectLabel}\nBehavior profile (JSON):\n${profileJson}`,
            },
          ],
          models,
          apiKey,
          timeoutMs: 20000,
          temperature: 0.4,
          maxTokens: 200,
        });

        // Parse defensively: pull the first {...} block out of the reply rather
        // than trusting the whole response is clean JSON.
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        let guidance = "";
        let focusSection = "";
        try {
          const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
          guidance = typeof parsed?.guidance === "string" ? parsed.guidance.trim() : "";
          focusSection = typeof parsed?.focus_section === "string" ? parsed.focus_section.trim() : "";
        } catch {
          guidance = "";
        }

        if (!guidance || !FOCUS_SECTIONS.has(focusSection)) {
          return NextResponse.json(
            { error: "Couldn't generate today's insight. Please try again later." },
            { status: 502 }
          );
        }

        const day = new Date().toISOString().slice(0, 10);
        const { error: upsertError } = await supabase.from("ai_behavior_insights").upsert(
          {
            user_id: user.id,
            project_id: projectId,
            day,
            profile,
            guidance,
            focus_section: focusSection,
            model: servedModel,
          },
          { onConflict: "user_id,project_id,day" }
        );
        if (upsertError) {
          return NextResponse.json(
            { error: "Couldn't save today's insight. Please try again later." },
            { status: 502 }
          );
        }

        void recordAiUsage(supabase, {
          userId: user.id,
          projectId,
          feature: "behavior_insight",
          lane,
          servedModel,
          usage,
        });

        return NextResponse.json({ guidance, focus_section: focusSection, day });
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
      case "learning_coach": {
        // Cerise — research-learning coach for the /my-learning/notes coach panel.
        // Reads the student's actual notes (passed in body.notesContext) so it
        // can ground its answers in what the student has actually written.
        const ctx = (body.notesContext || "").slice(0, 6000);
        systemPrompt =
          "You are Cerise, the user's research learning coach. " +
          "Your job is to help them organize and connect the notes they've written while watching course lessons. " +
          "Be warm, concise, and concrete. Always end your reply with a follow-up question to make the student think — not just receive.\n\n" +
          (ctx
            ? `The student's current notes (grouped by module) are below. Reason about THESE — do not invent new content.\n\n${ctx}`
            : "The student has not written any notes yet. Encourage them to start with one short note per lesson.");
        break;
      }
      default:
        systemPrompt = "You are a helpful academic research assistant.";
    }

    const allMessages = [{ role: "system", content: systemPrompt }, ...messages];

    const { content, servedModel, usage } = await callOpenRouterChat({
      route: task || "generic_ai",
      messages: allMessages,
      models,
      apiKey,
      timeoutMs: task === "learning_coach" ? 25000 : 22000,
      maxTokens: task === "learning_coach" ? 700 : 500,
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
