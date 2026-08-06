// DEPRECATED (Evidence Library v2, supabase/migrations/027_evidence_library.sql):
// this whole module was the v1 localStorage-only evidence store. It has been
// replaced by the real `evidence_library` table — see
// src/lib/research/evidenceLibrary.ts (data access) and
// src/hooks/useEvidenceLibrary.ts (the shared hook the card/subpage use).
//
// `readSavedEvidenceItems` is kept ONLY so `migrateLegacySavedEvidence`
// (src/lib/research/evidenceLibrary.ts) can do a one-time import of whatever
// a user had saved here before the migration, then clear this key. Do not
// call `saveEvidenceItem`/`buildScholarAskEvidenceItem` from new code — write
// to `evidence_library` directly instead (see `saveScholarAskEvidence`).

export const SAVED_EVIDENCE_STORAGE_KEY = "cerise_saved_evidence_library";

export type SavedEvidenceItem = {
  addedAt: string;
  caveat: string;
  evidence: string;
  id: string;
  source: "ScholarAsk" | "Upload";
  title: string;
  type: string;
  url?: string;
};

type ScholarAskPaper = {
  abstract?: string;
  journal?: string;
  num?: number;
  title: string;
  url?: string;
  year?: number | null;
};

function stripMarkdown(value: string) {
  return value
    .replace(/\*\*/g, "")
    .replace(/[#>`*_~-]/g, "")
    .replace(/\[(\d+)\]/g, "[$1]")
    .replace(/\s+/g, " ")
    .trim();
}

function firstSentence(value: string, fallback: string) {
  const clean = stripMarkdown(value);
  if (!clean) return fallback;
  const match = clean.match(/^(.{32,150}?[.!?])(?:\s|$)/);
  return (match?.[1] || clean.slice(0, 120)).trim();
}

/** @deprecated v1-only, used solely by the deprecated `buildScholarAskEvidenceItem` below. */
export function inferEvidenceCaveat(value: string) {
  const lower = value.toLowerCase();
  if (/\bdirect evidence\b|\bdirectly\b/.test(lower)) return "Direct evidence";
  if (/\bpopulation\b|\bsample\b|\bstudents?\b|\badolescen/.test(lower)) return "Population limited";
  if (/\badjacent\b|\bindirect\b|\brelated\b/.test(lower)) return "Adjacent evidence";
  if (/\bbackground\b|\bcontext\b/.test(lower)) return "Background context";
  if (/\bcorrelat|\bassociat/.test(lower)) return "Correlational";
  if (/\bmethod\b|\bmeasurement\b/.test(lower)) return "Method limited";
  return "Needs review";
}

/** @deprecated v1 localStorage item builder — ScholarAsk's Save button now calls `saveScholarAskEvidence` (src/lib/research/evidenceLibrary.ts) directly. */
export function buildScholarAskEvidenceItem({
  analysis,
  paper,
}: {
  analysis?: string;
  paper: ScholarAskPaper;
}): SavedEvidenceItem {
  const groundingText = analysis || paper.abstract || paper.title;
  return {
    addedAt: new Date().toISOString(),
    caveat: inferEvidenceCaveat(groundingText),
    evidence: firstSentence(groundingText, "Saved from ScholarAsk source panel"),
    id: `scholarask:${paper.url || `${paper.title}-${paper.year ?? "nd"}-${paper.num ?? ""}`}`,
    source: "ScholarAsk",
    title: paper.title,
    type: paper.journal ? "Journal Article" : "Source",
    url: paper.url,
  };
}

function isSavedEvidenceItem(value: unknown): value is SavedEvidenceItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<SavedEvidenceItem>;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.evidence === "string" &&
    typeof item.caveat === "string" &&
    typeof item.addedAt === "string"
  );
}

/** Kept ONLY for the one-time migration in migrateLegacySavedEvidence — do not use for new reads. */
export function readSavedEvidenceItems() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SAVED_EVIDENCE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isSavedEvidenceItem) : [];
  } catch {
    return [];
  }
}

/** @deprecated v1 localStorage writer — new code should insert into `evidence_library` directly (see `saveScholarAskEvidence`). */
export function saveEvidenceItem(item: SavedEvidenceItem) {
  if (typeof window === "undefined") return [];
  const current = readSavedEvidenceItems();
  const next = [item, ...current.filter((existing) => existing.id !== item.id)].slice(0, 30);
  window.localStorage.setItem(SAVED_EVIDENCE_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("cerise:evidence-saved"));
  return next;
}

/** @deprecated v1 formatter retained only for one-time localStorage migration support. */
export function formatEvidenceAddedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (sameDay) return `Today, ${time}`;
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
