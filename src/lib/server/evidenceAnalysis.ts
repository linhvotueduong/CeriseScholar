// Background AI analysis for uploaded PDFs — turns raw extracted text into
// the three short labels the Evidence Library card/subpage render: doc_type,
// evidence (what this source contributes), caveat (its main limitation).
//
// Called fire-and-forget from src/app/api/ocr/route.ts right after text
// extraction succeeds, and re-run on demand by
// src/app/api/evidence/analyze/route.ts (the card/subpage's Retry button).
//
// NEVER throws: every failure path (AI not configured, allowance exhausted,
// guardrail-paused, model error, unparsable JSON) ends in an
// `evidence_library` row with status 'failed' instead of an unhandled
// rejection — this can run fully detached from any response the user is
// waiting on (see docs/architecture-pivot-roadmap.md Phase 2 allowance rules,
// which this mirrors from src/app/api/ai/route.ts).

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveAiCredentials } from "./aiCredentials";
import { checkAiGuardrailsBeforeRequest } from "./aiGuardrails";
import { callOpenRouterChat } from "./openrouter";
import { recordAiUsage, getMonthlyDefaultLaneUsage } from "./aiUsage";
import { INCLUDED_MONTHLY_ALLOWANCE, allowanceExceeded } from "@/lib/ai/allowance";

const DOC_TYPES = [
  "Journal Article",
  "Report",
  "Working Paper",
  "Thesis",
  "Book Chapter",
  "Conference Paper",
  "Other",
] as const;

export type EvidenceDocType = (typeof DOC_TYPES)[number];

export type AnalyzePdfForEvidenceInput = {
  userId: string;
  projectId: string | null;
  pdfId: string;
  title: string;
  text: string;
};

function truncate(text: string, max: number): string {
  return (text || "").slice(0, max);
}

/** Keeps a model's short label honest to the "<=6 words" contract even if it ignores the instruction. */
function clampWords(value: unknown, maxWords: number): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return value.trim().split(/\s+/).slice(0, maxWords).join(" ");
}

function normalizeDocType(value: unknown): EvidenceDocType {
  if (typeof value === "string") {
    const match = DOC_TYPES.find((type) => type.toLowerCase() === value.trim().toLowerCase());
    if (match) return match;
  }
  return "Other";
}

/** Defensive parse: the model is asked for STRICT JSON, but may still wrap it in prose/markdown fences. */
function extractJsonBlock(content: string): Record<string, unknown> | null {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

type EvidenceRowWrite = {
  userId: string;
  projectId: string | null;
  pdfId: string;
  title: string;
  docType?: EvidenceDocType | null;
  evidence?: string | null;
  caveat?: string | null;
  status: "pending" | "ready" | "failed";
};

async function upsertEvidenceRow(supabase: SupabaseClient, row: EvidenceRowWrite): Promise<void> {
  const { error } = await supabase.from("evidence_library").upsert(
    {
      user_id: row.userId,
      project_id: row.projectId,
      pdf_id: row.pdfId,
      source: "upload",
      title: row.title,
      doc_type: row.docType ?? null,
      evidence: row.evidence ?? null,
      caveat: row.caveat ?? null,
      status: row.status,
    },
    { onConflict: "user_id,pdf_id" }
  );
  if (error) {
    console.warn("Failed to upsert evidence library row", {
      userId: row.userId,
      pdfId: row.pdfId,
      message: error.message,
    });
  }
}

/**
 * Analyze one uploaded PDF's extracted text and upsert an evidence_library
 * row summarizing what it contributes and its main limitation. Always
 * resolves — never rejects — so callers can safely `void` this or `await`
 * it without a try/catch of their own.
 */
export async function analyzePdfForEvidence(
  supabase: SupabaseClient,
  { userId, projectId, pdfId, title, text }: AnalyzePdfForEvidenceInput
): Promise<void> {
  const safeTitle = title?.trim() || "Untitled source";
  const fail = () => upsertEvidenceRow(supabase, { userId, projectId, pdfId, title: safeTitle, status: "failed" });

  try {
    const excerpt = truncate(text, 6000).trim();
    if (!excerpt) {
      await fail();
      return;
    }

    const credentials = await resolveAiCredentials(userId, supabase);
    const { apiKey, models, lane, enforceAllowance } = credentials;

    // Default-lane fairness cap (Phase 2) — same rule /api/ai enforces before
    // any model call. Background analysis must never quietly spend a user's
    // allowance past the point their own requests would have been blocked.
    if (enforceAllowance) {
      const used = await getMonthlyDefaultLaneUsage(supabase, userId, new Date());
      if (allowanceExceeded(used, INCLUDED_MONTHLY_ALLOWANCE)) {
        await fail();
        return;
      }
    }

    const guardrailCheck = await checkAiGuardrailsBeforeRequest(supabase, userId, lane, models);
    if (!guardrailCheck.allowed) {
      await fail();
      return;
    }

    const systemPrompt =
      "You are a research librarian. Read the excerpt from an uploaded academic source and return STRICT JSON only " +
      "(no markdown, no code fences, no explanation) with exactly these keys: " +
      `"doc_type" (one of: ${DOC_TYPES.join(", ")}), ` +
      '"evidence" (6 words or fewer, on what this source contributes as evidence), ' +
      '"caveat" (6 words or fewer, on its main limitation). ' +
      'Example: {"doc_type": "Journal Article", "evidence": "Effect sizes for anxiety interventions", "caveat": "Small adolescent-only sample"}';

    const { content, servedModel, usage } = await callOpenRouterChat({
      route: "evidence_analysis",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Title: ${safeTitle}\n\nExcerpt:\n${excerpt}` },
      ],
      models,
      apiKey,
      timeoutMs: 25000,
      temperature: 0.2,
      maxTokens: 200,
    });

    void recordAiUsage(supabase, {
      userId,
      projectId,
      feature: "evidence_analysis",
      lane,
      servedModel,
      usage,
    });

    const parsed = extractJsonBlock(content);
    if (!parsed) {
      await fail();
      return;
    }

    await upsertEvidenceRow(supabase, {
      userId,
      projectId,
      pdfId,
      title: safeTitle,
      docType: normalizeDocType(parsed.doc_type),
      evidence: clampWords(parsed.evidence, 6),
      caveat: clampWords(parsed.caveat, 6),
      status: "ready",
    });
  } catch (err) {
    console.warn("PDF evidence analysis failed", {
      userId,
      pdfId,
      message: err instanceof Error ? err.message : String(err),
    });
    try {
      await fail();
    } catch {
      // Never throw — this can run fully detached from any response the user is waiting on.
    }
  }
}
