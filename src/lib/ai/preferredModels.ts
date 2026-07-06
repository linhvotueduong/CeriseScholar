// Allowlist of OpenRouter model IDs a user may pick as their preferred model
// (PATCH /api/ai/key). Plain data only — no server secrets — so both the API
// route and any client component (Settings → AI, the welcome popup) can
// import it.
//
// Every ID below was checked live against https://openrouter.ai/api/v1/models
// on 2026-07-06 (a model catalog changes over time; re-verify before adding
// more or before reusing this list after a long gap). Grouped into free vs.
// paid so callers can render two option groups instead of one flat list —
// the welcome popup's two tabs ("Free APIs" / "Paid APIs") each show just one
// group, and the Settings page renders both as <optgroup>s.
//
// FREE_MODEL_OPTIONS[0] is the same free-first default used by the default
// lane (src/lib/server/aiCredentials.ts, DEFAULT_FREE_PRIMARY_MODEL) so a
// user can also choose to just keep using it, billed to their own key.
// PAID_MODEL_OPTIONS[0] is the same cheap paid fallback used there too.

export type ModelGroup = "free" | "paid";

export type PreferredModelOption = {
  id: string;
  label: string;
  group: ModelGroup;
};

export const FREE_MODEL_OPTIONS: PreferredModelOption[] = [
  { id: "openai/gpt-oss-120b:free", label: "GPT-OSS 120B", group: "free" },
  { id: "nvidia/nemotron-3-super-120b-a12b:free", label: "Nemotron 120B", group: "free" },
  { id: "google/gemma-4-31b-it:free", label: "Gemma 4 31B", group: "free" },
  { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B", group: "free" },
];

export const PAID_MODEL_OPTIONS: PreferredModelOption[] = [
  { id: "qwen/qwen3-32b", label: "Qwen3 32B", group: "paid" },
  { id: "openai/gpt-5-mini", label: "GPT-5 Mini", group: "paid" },
  { id: "anthropic/claude-haiku-4.5", label: "Claude Haiku 4.5", group: "paid" },
  { id: "mistralai/mistral-small-2603", label: "Mistral Small 4", group: "paid" },
];

// Flat view kept for callers that don't care about grouping.
export const PREFERRED_MODEL_OPTIONS: PreferredModelOption[] = [
  ...FREE_MODEL_OPTIONS,
  ...PAID_MODEL_OPTIONS,
];

const PREFERRED_MODEL_IDS = new Set(PREFERRED_MODEL_OPTIONS.map((option) => option.id));

export function isAllowedPreferredModel(value: unknown): value is string {
  return typeof value === "string" && PREFERRED_MODEL_IDS.has(value);
}
