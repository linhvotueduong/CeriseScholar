/**
 * Meaningful-work gate — deterministic filters that decide whether a piece of work
 * (a note, code, synthesis paragraph, reference) is real research evidence vs raw
 * activity / placeholder/test text.
 *
 * Research Sections progress is built from MEANINGFUL counts produced by these gates,
 * never from raw activity counts. Activity volume (uploads, opens, highlights) flows
 * to the Activity Log / recommendations, not to completion.
 */

/** Exact short tokens that are never meaningful research text. */
const PLACEHOLDER_TOKENS = new Set([
  "hello", "hi", "hey", "yo", "ok", "okay", "test", "testing", "tests", "tested",
  "asdf", "asdfg", "asdfgh", "qwerty", "lorem", "ipsum", "todo", "tbd", "na", "n/a",
  "none", "note", "notes", "xxx", "yyy", "zzz", "blah", "foo", "bar", "baz", "abc",
  "123", "...", "-", "—",
]);

/** Minimum length / word count for a note or synthesis paragraph to be meaningful. */
const MIN_MEANINGFUL_CHARS = 15;
const MIN_MEANINGFUL_WORDS = 3;

/** True when text is empty, placeholder/test, or trivially repeated. */
export function isPlaceholderText(value: unknown): boolean {
  if (typeof value !== "string") return true;
  const t = value.trim().toLowerCase();
  if (!t) return true;
  if (PLACEHOLDER_TOKENS.has(t)) return true;

  const words = t.split(/\s+/).filter(Boolean);
  // Every token is a placeholder or a 1-2 char fragment (e.g. "hello hi", "a b c").
  if (words.every((w) => PLACEHOLDER_TOKENS.has(w) || w.length <= 2)) return true;
  // Single repeated character, e.g. "aaaa", "....", "asdfasdf".
  const compact = t.replace(/\s+/g, "");
  if (/^(.)\1{3,}$/.test(compact)) return true;
  if (/^(asdf|qwer|zxcv)+$/.test(compact)) return true;
  return false;
}

/**
 * True when text reads like real research content: long enough, several words, and
 * not placeholder/test. Used for notes and synthesis paragraphs.
 */
export function isMeaningfulText(
  value: unknown,
  minChars = MIN_MEANINGFUL_CHARS,
  minWords = MIN_MEANINGFUL_WORDS
): boolean {
  if (typeof value !== "string") return false;
  const t = value.trim();
  if (t.length < minChars) return false;
  if (t.split(/\s+/).filter(Boolean).length < minWords) return false;
  return !isPlaceholderText(t);
}

/** A code/tag/theme label is usable when it is a real label, not placeholder/blank. */
export function isMeaningfulLabel(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const t = value.trim();
  if (t.length < 3) return false;
  return !isPlaceholderText(t);
}

/**
 * A note counts as research evidence only when it is meaningful AND grounded to a
 * source (linked to a pdf/highlight/source record).
 */
export function isMeaningfulEvidenceNote(text: unknown, sourceLinked: boolean): boolean {
  return sourceLinked && isMeaningfulText(text);
}
