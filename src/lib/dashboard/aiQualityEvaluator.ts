import { isPlaceholderText } from "@/lib/dashboard/meaningfulWork";
import type { AiQualitySignals } from "@/lib/dashboard/sectionProgress";

/**
 * AI Quality Evaluator — deterministic pass (cheap-to-expensive: no schema, no API).
 *
 * Reads the research text the app ALREADY stores (notes, synthesis paragraphs) and
 * returns structured AiQualitySignals that feed the dashboard formula
 *   sectionProgress = min(coverage, milestoneCap) * aiQualityMultiplier.
 *
 * It only LOWERS shallow/placeholder/test/keyword-stuffed work; it never invents or
 * raises progress. The length-based gate drops short junk ("hello hi"); this layer
 * catches longer fakes ("this is a test note"), keyword salads, and academic-sounding
 * but unlinked/vague notes — while leaving genuine source-grounded evidence unpenalized.
 *
 * Real Claude/API calls stay out; `needsAiReview()` flags borderline text for a future
 * optional fallback.
 */

export type ResearchTextSample = {
  text: string;
  kind: "note" | "synthesis";
  sourceLinked?: boolean;
};

// Phrases that signal the text is a test/placeholder, not real research evidence.
const TEST_INTENT =
  /\b(test(ing|ed)?|just (trying|checking|testing)|tr(y|ying)(\s+(this|it|out|again))+|check(ing)?\s+(this|it)|ignore\s+(this|me|that)|sample\s+(text|note|data)|placeholder|dummy|lorem\s+ipsum|example\s+(note|text)|my\s+(first\s+)?note|random\s+(text|note)|delete\s+(this|me)|asdf|qwerty|wip|todo)\b/i;

// Vocabulary that suggests genuine research content (counted, not just matched).
const RESEARCH_SIGNAL =
  /\b(stud(y|ies)|research|evidence|data|finding|found|results?|method(ology|s)?|analy[sz](e|is|ed)|hypothes[ie]s|theor(y|ies)|significan(t|ce)|correlat\w*|associat\w*|effect|sample|participants?|variables?|measure[ds]?|conclude|conclusions?|suggests?|argues?|claims?|because|therefore|however|compared|increase[ds]?|decrease[ds]?|reduc\w+|relationship|framework|model|literature|citation|limitation|critique)\b/gi;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function avg(values: number[]): number {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
}

function countSpecificity(text: string): number {
  let n = 0;
  if (/\d/.test(text)) n += 1; // any number
  if (/%/.test(text)) n += 1; // percentage
  if (/\bp\s*[<=]\s*0?\.\d+/i.test(text)) n += 1; // p-value
  if (/\b[A-Z][a-z]+,?\s+\(?\d{4}\)?/.test(text)) n += 1; // citation "Smith 2021"
  if (/\bn\s*=\s*\d+/i.test(text)) n += 1; // sample size n=...
  return n;
}

type SampleScore = { meaningfulness: number; specificity: number; isTest: boolean; isStuffing: boolean };

function scoreSample(text: string): SampleScore {
  const t = text.trim();
  const words = t.split(/\s+/).filter(Boolean).length;
  const isTest = TEST_INTENT.test(t) || isPlaceholderText(t);
  const signalMatches = (t.match(RESEARCH_SIGNAL) || []).length;
  const specific = countSpecificity(t);
  // Keyword stuffing: many research buzzwords, no specifics, mostly buzzwords by ratio.
  const stuffingRatio = words > 0 ? signalMatches / words : 0;
  const isStuffing = !isTest && words >= 4 && signalMatches >= 3 && stuffingRatio > 0.5 && specific === 0;

  const meaningfulness = isTest
    ? 0.1
    : isStuffing
      ? 0.22
      : clamp01(
          0.3 +
            Math.min(0.4, 0.12 * signalMatches) +
            (words >= 14 ? 0.2 : words >= 8 ? 0.1 : 0) +
            (specific > 0 ? 0.15 : 0)
        );
  // Specificity = CONCRETE markers (numbers, %, p-values, citations, sample sizes) only.
  // Research buzzwords do NOT count here, so keyword stuffing cannot fake specificity.
  const specificity = clamp01(0.25 * specific + (words >= 16 ? 0.1 : 0));
  return { meaningfulness, specificity, isTest, isStuffing };
}

/**
 * Evaluate a project's note/synthesis text into bounded quality signals. With no
 * samples, returns low-confidence signals that leave the formula unchanged (multiplier
 * 1) — empty work is never inflated because coverage is already 0.
 */
export function evaluateResearchQuality(samples: ResearchTextSample[]): AiQualitySignals {
  const notes = samples.filter((s) => s.kind === "note");
  const synth = samples.filter((s) => s.kind === "synthesis");

  if (samples.length === 0) {
    return { confidence: 0, reasons: ["No meaningful notes or synthesis to evaluate yet."] };
  }

  const noteScores = notes.map((s) => scoreSample(s.text));
  const synthScores = synth.map((s) => scoreSample(s.text));
  const allScores = [...noteScores, ...synthScores];

  const junkCount = allScores.filter((s) => s.isTest || s.isStuffing || s.meaningfulness < 0.3).length;
  const junkFraction = junkCount / allScores.length;

  const sourceGrounded = notes.length
    ? clamp01(notes.filter((s) => s.sourceLinked).length / notes.length)
    : undefined;
  const evidenceSpecificity = avg(allScores.map((s) => s.specificity));

  // Strongest reduction (placeholder) is withheld when the corpus is CLEARLY source-
  // grounded AND evidence-specific — real grounded evidence is never nuked.
  const clearlyGroundedSpecific = (sourceGrounded ?? 0) >= 0.7 && evidenceSpecificity >= 0.5;
  const isPlaceholder = junkFraction >= 0.6 && !clearlyGroundedSpecific;

  const reasons: string[] = [];
  if (isPlaceholder) reasons.push(`${junkCount}/${allScores.length} notes look like test/placeholder/keyword-stuffed text.`);
  if (allScores.every((s) => s.specificity < 0.1)) reasons.push("Low evidence specificity (no numbers, citations, or methods).");
  if ((sourceGrounded ?? 1) < 0.5) reasons.push("Many notes are not linked to a source.");

  return {
    isPlaceholder,
    sourceGrounded,
    noteMeaningfulness: noteScores.length ? avg(noteScores.map((s) => s.meaningfulness)) : undefined,
    evidenceSpecificity,
    synthesisReadiness: synthScores.length ? avg(synthScores.map((s) => s.meaningfulness)) : undefined,
    confidence: clamp01(0.3 + 0.1 * allScores.length),
    reasons,
  };
}

/** Borderline (mid-meaningfulness, low confidence) — where a real Claude call could help later. */
export function needsAiReview(signals: AiQualitySignals): boolean {
  const m = signals.noteMeaningfulness;
  return m != null && m >= 0.3 && m < 0.6 && (signals.confidence ?? 0) < 0.7;
}
