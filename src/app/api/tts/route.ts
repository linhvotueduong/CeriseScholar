import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

// Vercel serverless: allow up to 60s for long-text synthesis.
// The Edge TTS WebSocket stream is slow enough that 10s default can cut off 5000-char jobs.
export const maxDuration = 60;
export const runtime = "nodejs";

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

// Available AI voices (natural-sounding Microsoft Edge voices)
const VOICES: Record<string, string> = {
  jenny: "en-US-JennyNeural",
  aria: "en-US-AriaNeural",
  guy: "en-US-GuyNeural",
  davis: "en-US-DavisNeural",
  sara: "en-US-SaraNeural",
  tony: "en-US-TonyNeural",
  nancy: "en-US-NancyNeural",
  amber: "en-US-AmberNeural",
};

export async function POST(req: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Rate limit: 20 TTS requests per minute per user
    if (!checkRateLimit(user.id, "tts", 20, 60_000)) {
      return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
    }

    const { text, voice = "jenny", rate = "+0%" } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    // Limit text length to prevent abuse
    const cleanText = text.slice(0, 5000).replace(/[<>&]/g, "");

    const voiceName = VOICES[voice] || VOICES.jenny;

    const tts = new MsEdgeTTS();
    await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);

    const { audioStream } = tts.toStream(cleanText, { rate });

    // Collect audio chunks
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      audioStream.on("data", (chunk: Buffer) => chunks.push(chunk));
      audioStream.on("end", resolve);
      audioStream.on("close", resolve);
      audioStream.on("error", reject);
    });

    const audioBuffer = Buffer.concat(chunks);

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBuffer.length),
      },
    });
  } catch (err) {
    console.error("TTS error:", err);
    return NextResponse.json(
      { error: "Failed to generate speech" },
      { status: 500 }
    );
  }
}

// GET endpoint to list available voices
export async function GET() {
  return NextResponse.json({
    voices: Object.entries(VOICES).map(([id, name]) => ({ id, name })),
  });
}
