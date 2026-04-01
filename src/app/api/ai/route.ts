import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { checkRateLimit } from "@/lib/utils/rateLimit";

const OLLAMA_API_URL = "https://ollama.com/api/chat";
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || "";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "kimi-k2.5";

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

export async function POST(req: NextRequest) {
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

    const { messages, task, paper, mainAnswer } = await req.json();

    if (!OLLAMA_API_KEY) {
      return NextResponse.json({ error: "AI not configured" }, { status: 500 });
    }

    let systemPrompt = "";

    if (task === "paper_analysis" && paper && mainAnswer) {
      // Generate analysis of how a specific paper supports the main answer
      systemPrompt = `You are an academic research assistant. The user asked a research question and received an answer that cited a specific paper. Explain in ONE paragraph (4-5 sentences) exactly:
1. What this paper found
2. How and what part of this paper supports the points in the main answer
3. From what angle/perspective this paper contributes

Be specific about the paper's methodology and findings. Reference specific claims from the answer that this paper supports.`;

      const allMessages = [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Main research answer (excerpt):\n${mainAnswer.slice(0, 500)}\n\nPaper to analyze:\nTitle: ${paper.title}\nAuthors: ${paper.authors?.join(", ")}\nYear: ${paper.year}\nJournal: ${paper.journal}\nAbstract: ${paper.abstract}\n\nExplain how this paper supports the points in the answer above.`,
        },
      ];

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 40000);

      try {
        const res = await fetch(OLLAMA_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OLLAMA_API_KEY}`,
          },
          body: JSON.stringify({ model: OLLAMA_MODEL, messages: allMessages, stream: false }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) {
          return NextResponse.json({ error: "AI error" }, { status: 500 });
        }
        const data = await res.json();
        return NextResponse.json({ content: data.message?.content || "" });
      } catch (err) {
        clearTimeout(timeout);
        if (err instanceof Error && err.name === "AbortError") {
          return NextResponse.json({ error: "Analysis timed out" }, { status: 504 });
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

    const res = await fetch(OLLAMA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OLLAMA_API_KEY}`,
      },
      body: JSON.stringify({ model: OLLAMA_MODEL, messages: allMessages, stream: false }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "AI error" }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json({ content: data.message?.content || "" });
  } catch (err) {
    console.error("AI route error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
