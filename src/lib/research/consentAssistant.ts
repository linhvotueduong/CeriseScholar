import {
  isResearchArtifactChecksum,
  sha256ArtifactChecksum,
  type ResearchArtifactChecksum,
} from "./artifactIdentity";
import {
  normalizeConsentPhase5Document,
  type ConsentPhase5Clause,
  type ConsentPhase5Document,
  type ConsentPhase5Form,
} from "./consentPhase5";

export const CONSENT_ASSISTANT_SCHEMA_VERSION = 1 as const;
export const MAX_CONSENT_ASSISTANT_REQUEST_BYTES = 180 * 1024;
export const MAX_CONSENT_ASSISTANT_PROMPT = 1_500;
export const MAX_CONSENT_ASSISTANT_SUGGESTIONS = 8;
export const MAX_CONSENT_ASSISTANT_DECISIONS = 200;

export type ConsentAssistantMode =
  | "missing-facts"
  | "draft-clause"
  | "explain-simplify"
  | "compare"
  | "final-review";

export type ConsentAssistantSuggestionKind =
  | "clause-patch"
  | "plain-language-alternative"
  | "finding"
  | "question";

export type ConsentAssistantFindingCategory =
  | "clarity"
  | "completeness"
  | "consistency"
  | "voluntariness"
  | "possible-coercion"
  | "possible-exculpatory-language"
  | "risk-or-burden"
  | "privacy-or-withdrawal"
  | "optionality"
  | "accessibility"
  | "human-governance";

export interface ConsentAssistantRedactionSummary {
  email: number;
  phone: number;
  address: number;
  namedPerson: number;
  institutionalIdentifier: number;
  contactClause: number;
  signature: number;
}

export interface ConsentAssistantFactContext {
  id: string;
  label: string;
  value: string;
  sourceLocator: string;
  confidence: "implemented" | "declared" | "researcher-needed";
}

export interface ConsentAssistantClauseContext {
  id: string;
  kind: string;
  title: string;
  text: string;
  editPolicy: ConsentPhase5Clause["editPolicy"];
  reviewState: ConsentPhase5Clause["reviewState"];
  sourceLocator: string;
  factIds: string[];
}

export interface ConsentAssistantContext {
  schemaVersion: typeof CONSENT_ASSISTANT_SCHEMA_VERSION;
  projectId: string;
  mode: ConsentAssistantMode;
  scope: {
    formId: string;
    clauseId: string | null;
    explicitFullFormReview: boolean;
  };
  form: {
    id: string;
    kind: string;
    title: string;
    audience: string;
    language: string;
    decisionMode: string;
    clauses: ConsentAssistantClauseContext[];
  };
  studyFacts: ConsentAssistantFactContext[];
  redactionSummary: ConsentAssistantRedactionSummary;
  excludedContent: readonly [
    "participant-data",
    "uploaded-files",
    "approval-correspondence",
    "governance-decisions",
    "authority-identifiers",
  ];
  baseRevisionChecksum: ResearchArtifactChecksum;
}

export interface ConsentAssistantRequest {
  projectId: string;
  mode: ConsentAssistantMode;
  prompt: string;
  formId: string;
  clauseId: string | null;
  explicitFullFormReview: boolean;
  document: ConsentPhase5Document;
}

interface ConsentAssistantSuggestionBase {
  id: string;
  kind: ConsentAssistantSuggestionKind;
  title: string;
  rationale: string;
  uncertainty: string;
  potentialConflict: string;
  formId: string;
  clauseId: string | null;
  factIds: string[];
}

export interface ConsentAssistantClauseSuggestion
  extends ConsentAssistantSuggestionBase {
  kind: "clause-patch" | "plain-language-alternative";
  clauseId: string;
  currentText: string;
  proposedText: string;
}

export interface ConsentAssistantFinding extends ConsentAssistantSuggestionBase {
  kind: "finding";
  category: ConsentAssistantFindingCategory;
  observation: string;
  recommendation: string;
}

export interface ConsentAssistantQuestion extends ConsentAssistantSuggestionBase {
  kind: "question";
  question: string;
  whyNeeded: string;
}

export type ConsentAssistantSuggestion =
  | ConsentAssistantClauseSuggestion
  | ConsentAssistantFinding
  | ConsentAssistantQuestion;

export interface ConsentAssistantRejectedSuggestion {
  index: number;
  reason:
    | "malformed"
    | "unknown-kind"
    | "unknown-form"
    | "cross-form-target"
    | "unknown-clause"
    | "outside-selected-clause"
    | "protected-clause"
    | "fact-sensitive-clause"
    | "unsafe-proposed-text"
    | "unknown-fact-reference";
}

export interface ConsentAssistantResponse {
  summary: string;
  suggestions: ConsentAssistantSuggestion[];
  rejectedSuggestions: ConsentAssistantRejectedSuggestion[];
}

export type ConsentAssistantDecisionAction =
  | "applied"
  | "applied-after-edit"
  | "kept-current";

export interface ConsentAssistantDecisionRecord {
  schemaVersion: typeof CONSENT_ASSISTANT_SCHEMA_VERSION;
  id: string;
  projectId: string;
  suggestionId: string;
  suggestionKind: ConsentAssistantSuggestionKind;
  suggestionTitle: string;
  mode: ConsentAssistantMode;
  formId: string;
  clauseId: string | null;
  action: ConsentAssistantDecisionAction;
  decidedAt: string;
  baseRevisionChecksum: ResearchArtifactChecksum;
  proposedTextChecksum: ResearchArtifactChecksum | null;
  resultingTextChecksum: ResearchArtifactChecksum | null;
  servedModel: string;
  claim: "researcher-decision-record-not-ai-approval-or-governance";
}

const MODES: readonly ConsentAssistantMode[] = [
  "missing-facts",
  "draft-clause",
  "explain-simplify",
  "compare",
  "final-review",
];
const PATCH_KINDS = ["clause-patch", "plain-language-alternative"] as const;
const SUGGESTION_KINDS: readonly ConsentAssistantSuggestionKind[] = [
  ...PATCH_KINDS,
  "finding",
  "question",
];
const FINDING_CATEGORIES: readonly ConsentAssistantFindingCategory[] = [
  "clarity",
  "completeness",
  "consistency",
  "voluntariness",
  "possible-coercion",
  "possible-exculpatory-language",
  "risk-or-burden",
  "privacy-or-withdrawal",
  "optionality",
  "accessibility",
  "human-governance",
];
const EXCLUDED_CONTENT = [
  "participant-data",
  "uploaded-files",
  "approval-correspondence",
  "governance-decisions",
  "authority-identifiers",
] as const;

// These clauses contain facts that a language model cannot safely derive or
// replace. The assistant may flag or ask about them, but never returns an
// applicable patch for them.
const FACT_SENSITIVE_KIND_PATTERN =
  /(risk|benefit|alternative|cost|compensation|injur|contact|confidential|privacy|withdraw|retention|access|sharing|specimen|genetic|genomic|broad-consent|commercial|result-return|surrogate|guardian|assent|signature|waiver|deception)/i;

const UNSAFE_APPROVAL_PATTERN =
  /\b(?:cerise|artificial intelligence|\bai\b|irb|ethics (?:board|committee)|institution|regulator)\b.{0,60}\b(?:approved|certified|compliant|validated|legally effective|lawful|safe)\b/i;
const EXCULPATORY_PATTERN =
  /\b(?:waive|give up|release|hold harmless)\b.{0,80}\b(?:rights?|claims?|liabilit|negligence)\b/i;
const COERCIVE_PATTERN =
  /\b(?:must participate|required to participate|cannot refuse|may not withdraw|will be penalized|lose benefits if you refuse)\b/i;
const ABSOLUTE_PRIVACY_PATTERN =
  /\b(?:completely anonymous|fully anonymous|guaranteed confidential|absolute confidentiality|no one will ever know)\b/i;
const INSTITUTIONAL_ID_PATTERN =
  /\b(?:irb|protocol|approval|study)\s*(?:number|no\.?|id|#)?\s*[:#-]?\s*[A-Z]{1,10}[-_:]?\d{2,}[A-Z0-9._-]*\b/gi;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN = /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/g;
const ADDRESS_PATTERN =
  /\b\d{1,6}\s+[A-Za-z0-9.' -]{2,60}\s(?:street|st\.?|road|rd\.?|avenue|ave\.?|boulevard|blvd\.?|lane|ln\.?|drive|dr\.?|court|ct\.?|way)\b/gi;
const NAMED_PERSON_PATTERN =
  /\b(?:Dr\.?|Professor|Prof\.?|Mr\.?|Mrs\.?|Ms\.?|Mx\.?)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/g;
const SIGNATURE_PATTERN = /\b(?:signature|signed by)\s*[:_-]+\s*[^\n]{2,120}/gi;
const HTML_PATTERN = /<\/?[A-Za-z][^>]*>/;
const REDACTION_TOKEN_PATTERN =
  /\[(?:EMAIL|PHONE|ADDRESS|NAME|SIGNATURE|INSTITUTIONAL IDENTIFIER|CONTACT OR SIGNATURE DETAILS) REDACTED\]/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeString(value: unknown, maximum: number): string {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, maximum)
    : "";
}

function safeId(value: unknown, maximum = 160): string {
  return safeString(value, maximum).replace(/[^A-Za-z0-9._:-]/g, "");
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && allowed.includes(value as T)
    ? value as T
    : null;
}

function emptyRedactionSummary(): ConsentAssistantRedactionSummary {
  return {
    email: 0,
    phone: 0,
    address: 0,
    namedPerson: 0,
    institutionalIdentifier: 0,
    contactClause: 0,
    signature: 0,
  };
}

function replaceAndCount(
  text: string,
  pattern: RegExp,
  replacement: string,
): { text: string; count: number } {
  let count = 0;
  pattern.lastIndex = 0;
  return {
    text: text.replace(pattern, () => {
      count += 1;
      return replacement;
    }),
    count,
  };
}

export function redactConsentAssistantText(
  value: string,
  summary: ConsentAssistantRedactionSummary = emptyRedactionSummary(),
): string {
  let text = value.slice(0, 20_000);
  const replacements: ReadonlyArray<{
    key: keyof ConsentAssistantRedactionSummary;
    pattern: RegExp;
    token: string;
  }> = [
    { key: "email", pattern: EMAIL_PATTERN, token: "[EMAIL REDACTED]" },
    { key: "phone", pattern: PHONE_PATTERN, token: "[PHONE REDACTED]" },
    { key: "address", pattern: ADDRESS_PATTERN, token: "[ADDRESS REDACTED]" },
    { key: "namedPerson", pattern: NAMED_PERSON_PATTERN, token: "[NAME REDACTED]" },
    {
      key: "institutionalIdentifier",
      pattern: INSTITUTIONAL_ID_PATTERN,
      token: "[INSTITUTIONAL IDENTIFIER REDACTED]",
    },
    { key: "signature", pattern: SIGNATURE_PATTERN, token: "[SIGNATURE REDACTED]" },
  ];
  for (const item of replacements) {
    const result = replaceAndCount(text, item.pattern, item.token);
    text = result.text;
    summary[item.key] += result.count;
  }
  return text;
}

function assistantClauseContext(
  clause: ConsentPhase5Clause,
  redactionSummary: ConsentAssistantRedactionSummary,
): ConsentAssistantClauseContext {
  const contactSensitive = /(contact|signature)/i.test(clause.kind);
  const text = contactSensitive
    ? "[CONTACT OR SIGNATURE DETAILS REDACTED]"
    : redactConsentAssistantText(clause.text, redactionSummary);
  if (contactSensitive) redactionSummary.contactClause += 1;
  return {
    id: clause.id,
    kind: clause.kind,
    title: redactConsentAssistantText(clause.title, redactionSummary).slice(0, 240),
    text,
    editPolicy: clause.editPolicy,
    reviewState: clause.reviewState,
    sourceLocator: clause.sourceLocator.slice(0, 500),
    factIds: clause.factIds.slice(0, 24),
  };
}

function consentAssistantRevisionPayload(
  document: ConsentPhase5Document,
  form: ConsentPhase5Form,
  mode: ConsentAssistantMode,
  clauseId: string | null,
  explicitFullFormReview: boolean,
) {
  const includedClauses = explicitFullFormReview
    ? form.clauses
    : form.clauses.filter((clause) => clause.id === clauseId);
  return {
    schemaVersion: CONSENT_ASSISTANT_SCHEMA_VERSION,
    projectId: document.projectId,
    mode,
    formId: form.id,
    clauseId,
    explicitFullFormReview,
    sourceFingerprintChecksum: document.sourceFingerprint.checksum,
    clauses: includedClauses.map((clause) => ({
      id: clause.id,
      text: clause.text,
      editPolicy: clause.editPolicy,
      applicability: clause.applicability,
      reviewState: clause.reviewState,
      factIds: clause.factIds,
    })),
    studyFacts: document.studyFacts.map((fact) => ({
      id: fact.id,
      value: fact.value,
      confidence: fact.confidence,
    })),
  };
}

export async function createConsentAssistantContext(
  document: ConsentPhase5Document,
  mode: ConsentAssistantMode,
  formId: string,
  clauseId: string | null,
  explicitFullFormReview = false,
): Promise<ConsentAssistantContext | null> {
  const form = document.forms.find((candidate) => candidate.id === formId);
  if (!form) return null;
  const selectedClause = clauseId
    ? form.clauses.find((candidate) => candidate.id === clauseId)
    : null;
  if (!explicitFullFormReview && !selectedClause) return null;
  if (explicitFullFormReview && !["compare", "final-review", "missing-facts"].includes(mode)) {
    return null;
  }
  const redactionSummary = emptyRedactionSummary();
  const scopedClauses = explicitFullFormReview
    ? form.clauses
    : selectedClause
      ? [selectedClause]
      : [];
  const scopedFactIds = new Set(scopedClauses.flatMap((clause) => clause.factIds));
  const studyFacts = document.studyFacts
    .filter((fact) => scopedFactIds.has(fact.id))
    .slice(0, 40)
    .map((fact) => ({
      id: fact.id,
      label: redactConsentAssistantText(fact.label, redactionSummary).slice(0, 240),
      value: redactConsentAssistantText(fact.value, redactionSummary).slice(0, 2_000),
      sourceLocator: fact.sourceLocator.slice(0, 500),
      confidence: fact.confidence,
    }));
  const baseRevisionChecksum = await sha256ArtifactChecksum(
    consentAssistantRevisionPayload(
      document,
      form,
      mode,
      clauseId,
      explicitFullFormReview,
    ),
    { maximumBytes: MAX_CONSENT_ASSISTANT_REQUEST_BYTES },
  );
  return {
    schemaVersion: CONSENT_ASSISTANT_SCHEMA_VERSION,
    projectId: document.projectId,
    mode,
    scope: { formId, clauseId, explicitFullFormReview },
    form: {
      id: form.id,
      kind: form.kind,
      title: redactConsentAssistantText(form.title, redactionSummary).slice(0, 240),
      audience: form.audience,
      language: form.language,
      decisionMode: form.decisionMode,
      clauses: scopedClauses.map((clause) =>
        assistantClauseContext(clause, redactionSummary),
      ),
    },
    studyFacts,
    redactionSummary,
    excludedContent: EXCLUDED_CONTENT,
    baseRevisionChecksum,
  };
}

export function normalizeConsentAssistantRequest(
  value: unknown,
): ConsentAssistantRequest | null {
  if (!isRecord(value)) return null;
  const projectId = safeId(value.projectId, 160);
  const mode = enumValue(value.mode, MODES);
  const formId = safeId(value.formId);
  const clauseId = value.clauseId === null ? null : safeId(value.clauseId);
  const explicitFullFormReview = value.explicitFullFormReview === true;
  const prompt = safeString(value.prompt, MAX_CONSENT_ASSISTANT_PROMPT);
  if (!projectId || !mode || !formId || (!clauseId && !explicitFullFormReview)) return null;
  const document = normalizeConsentPhase5Document(value.document, projectId);
  if (!document) return null;
  const form = document.forms.find((candidate) => candidate.id === formId);
  if (!form) return null;
  if (clauseId && !form.clauses.some((candidate) => candidate.id === clauseId)) return null;
  if (explicitFullFormReview && !["compare", "final-review", "missing-facts"].includes(mode)) {
    return null;
  }
  return {
    projectId,
    mode,
    prompt: prompt || defaultConsentAssistantPrompt(mode),
    formId,
    clauseId,
    explicitFullFormReview,
    document,
  };
}

export function defaultConsentAssistantPrompt(mode: ConsentAssistantMode): string {
  return {
    "missing-facts": "Identify the participant-facing facts a researcher still needs to confirm. Ask questions; do not invent answers.",
    "draft-clause": "Propose one careful draft for the selected editable clause using only cited study facts.",
    "explain-simplify": "Explain the selected clause and, when safe, offer one plain-language alternative that preserves its meaning.",
    compare: "Compare the explicit form scope with the supplied implemented study facts and flag contradictions or omissions.",
    "final-review": "Perform an advisory clarity, voluntariness, consistency, burden, optionality, and accessibility review of the explicit form scope.",
  }[mode];
}

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function placeholderSet(text: string): Set<string> {
  return new Set(text.match(/\[[^\]\n]{3,160}\]/g) ?? []);
}

function proposedTextIsSafe(currentText: string, proposedText: string): boolean {
  if (
    !proposedText
    || proposedText.length > 20_000
    || HTML_PATTERN.test(proposedText)
    || REDACTION_TOKEN_PATTERN.test(proposedText)
  ) return false;
  const matches = (pattern: RegExp) => {
    pattern.lastIndex = 0;
    return pattern.test(proposedText);
  };
  if (
    matches(UNSAFE_APPROVAL_PATTERN)
    || matches(EXCULPATORY_PATTERN)
    || matches(COERCIVE_PATTERN)
    || matches(ABSOLUTE_PRIVACY_PATTERN)
    || matches(EMAIL_PATTERN)
    || matches(PHONE_PATTERN)
    || matches(INSTITUTIONAL_ID_PATTERN)
  ) return false;
  const allowedPlaceholders = placeholderSet(currentText);
  return [...placeholderSet(proposedText)].every((placeholder) =>
    allowedPlaceholders.has(placeholder),
  );
}

function normalizedFactIds(value: unknown, allowed: ReadonlySet<string>): string[] | null {
  if (!Array.isArray(value)) return [];
  const ids = [...new Set(value.slice(0, 24).map((item) => safeId(item)).filter(Boolean))];
  return ids.every((id) => allowed.has(id)) ? ids : null;
}

export function parseConsentAssistantResponse(
  raw: string,
  context: ConsentAssistantContext,
): ConsentAssistantResponse {
  const parsed = extractJsonObject(raw);
  if (!isRecord(parsed)) {
    return {
      summary: "The model did not return a reviewable structured response. No change was made.",
      suggestions: [],
      rejectedSuggestions: [{ index: 0, reason: "malformed" }],
    };
  }
  const summary = safeString(parsed.summary, 2_000)
    || "Review each advisory suggestion separately. No change has been applied.";
  const form = context.form;
  const clauseById = new Map(form.clauses.map((clause) => [clause.id, clause]));
  const allowedFactIds = new Set(context.studyFacts.map((fact) => fact.id));
  const rawSuggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
  const suggestions: ConsentAssistantSuggestion[] = [];
  const rejectedSuggestions: ConsentAssistantRejectedSuggestion[] = [];
  const suggestionIds = new Set<string>();

  rawSuggestions.slice(0, MAX_CONSENT_ASSISTANT_SUGGESTIONS).forEach((candidate, index) => {
    if (!isRecord(candidate)) {
      rejectedSuggestions.push({ index, reason: "malformed" });
      return;
    }
    const kind = enumValue(candidate.kind, SUGGESTION_KINDS);
    if (!kind) {
      rejectedSuggestions.push({ index, reason: "unknown-kind" });
      return;
    }
    const formId = safeId(candidate.formId);
    if (!formId) {
      rejectedSuggestions.push({ index, reason: "unknown-form" });
      return;
    }
    if (formId !== form.id) {
      rejectedSuggestions.push({ index, reason: "cross-form-target" });
      return;
    }
    const clauseId = candidate.clauseId === null ? null : safeId(candidate.clauseId);
    const targetClause = clauseId ? clauseById.get(clauseId) : null;
    if (clauseId && !targetClause) {
      rejectedSuggestions.push({ index, reason: "unknown-clause" });
      return;
    }
    if (
      clauseId
      && !context.scope.explicitFullFormReview
      && clauseId !== context.scope.clauseId
    ) {
      rejectedSuggestions.push({ index, reason: "outside-selected-clause" });
      return;
    }
    const factIds = normalizedFactIds(candidate.factIds, allowedFactIds);
    if (factIds === null) {
      rejectedSuggestions.push({ index, reason: "unknown-fact-reference" });
      return;
    }
    const requestedId = safeId(candidate.id) || `suggestion-${index + 1}`;
    const suggestionId = suggestionIds.has(requestedId)
      ? `${requestedId}-${index + 1}`
      : requestedId;
    suggestionIds.add(suggestionId);
    const base = {
      id: suggestionId,
      title: safeString(candidate.title, 240) || "Advisory suggestion",
      rationale: safeString(candidate.rationale, 1_500)
        || "A researcher must assess this suggestion against the protocol and applicable authority.",
      uncertainty: safeString(candidate.uncertainty, 1_000)
        || "The assistant cannot determine legal effect, approval, or factual accuracy.",
      potentialConflict: safeString(candidate.potentialConflict, 1_000)
        || "Check the applicable institutional template and human reviewer requirements.",
      formId,
      clauseId,
      factIds,
    };

    if (kind === "clause-patch" || kind === "plain-language-alternative") {
      if (!targetClause) {
        rejectedSuggestions.push({ index, reason: "unknown-clause" });
        return;
      }
      if (!["editable", "institution-review-required"].includes(targetClause.editPolicy)) {
        rejectedSuggestions.push({ index, reason: "protected-clause" });
        return;
      }
      if (FACT_SENSITIVE_KIND_PATTERN.test(targetClause.kind)) {
        rejectedSuggestions.push({ index, reason: "fact-sensitive-clause" });
        return;
      }
      const proposedText = safeString(candidate.proposedText, 20_001);
      if (!proposedTextIsSafe(targetClause.text, proposedText)) {
        rejectedSuggestions.push({ index, reason: "unsafe-proposed-text" });
        return;
      }
      suggestions.push({
        ...base,
        kind,
        clauseId: targetClause.id,
        currentText: targetClause.text,
        proposedText,
      });
      return;
    }

    if (kind === "finding") {
      const category = enumValue(candidate.category, FINDING_CATEGORIES) ?? "human-governance";
      const observation = safeString(candidate.observation, 2_000);
      const recommendation = safeString(candidate.recommendation, 2_000);
      if (!observation || !recommendation) {
        rejectedSuggestions.push({ index, reason: "malformed" });
        return;
      }
      suggestions.push({ ...base, kind, category, observation, recommendation });
      return;
    }

    const question = safeString(candidate.question, 1_500);
    const whyNeeded = safeString(candidate.whyNeeded, 1_500);
    if (!question || !whyNeeded) {
      rejectedSuggestions.push({ index, reason: "malformed" });
      return;
    }
    suggestions.push({ ...base, kind, question, whyNeeded });
  });
  return { summary, suggestions, rejectedSuggestions };
}

export async function createConsentAssistantDecisionRecord(input: {
  projectId: string;
  suggestion: ConsentAssistantSuggestion;
  mode: ConsentAssistantMode;
  action: ConsentAssistantDecisionAction;
  baseRevisionChecksum: ResearchArtifactChecksum;
  proposedText: string | null;
  resultingText: string | null;
  servedModel: string;
  decidedAt?: string;
}): Promise<ConsentAssistantDecisionRecord> {
  const proposedTextChecksum = input.proposedText === null
    ? null
    : await sha256ArtifactChecksum({ text: input.proposedText });
  const resultingTextChecksum = input.resultingText === null
    ? null
    : await sha256ArtifactChecksum({ text: input.resultingText });
  return {
    schemaVersion: CONSENT_ASSISTANT_SCHEMA_VERSION,
    id: crypto.randomUUID(),
    projectId: input.projectId,
    suggestionId: input.suggestion.id,
    suggestionKind: input.suggestion.kind,
    suggestionTitle: input.suggestion.title.slice(0, 240),
    mode: input.mode,
    formId: input.suggestion.formId,
    clauseId: input.suggestion.clauseId,
    action: input.action,
    decidedAt: input.decidedAt ?? new Date().toISOString(),
    baseRevisionChecksum: input.baseRevisionChecksum,
    proposedTextChecksum,
    resultingTextChecksum,
    servedModel: input.servedModel.slice(0, 160),
    claim: "researcher-decision-record-not-ai-approval-or-governance",
  };
}

export function normalizeConsentAssistantDecisionRecord(
  value: unknown,
  projectId: string,
): ConsentAssistantDecisionRecord | null {
  if (!isRecord(value) || value.schemaVersion !== CONSENT_ASSISTANT_SCHEMA_VERSION) return null;
  const suggestionKind = enumValue(value.suggestionKind, SUGGESTION_KINDS);
  const mode = enumValue(value.mode, MODES);
  const action = enumValue(
    value.action,
    ["applied", "applied-after-edit", "kept-current"] as const,
  );
  const recordProjectId = safeId(value.projectId, 160);
  const clauseId = value.clauseId === null ? null : safeId(value.clauseId);
  const proposedTextChecksum = value.proposedTextChecksum === null
    ? null
    : isResearchArtifactChecksum(value.proposedTextChecksum)
      ? value.proposedTextChecksum
      : undefined;
  const resultingTextChecksum = value.resultingTextChecksum === null
    ? null
    : isResearchArtifactChecksum(value.resultingTextChecksum)
      ? value.resultingTextChecksum
      : undefined;
  if (
    recordProjectId !== projectId
    || !safeId(value.id)
    || !safeId(value.suggestionId)
    || !suggestionKind
    || !mode
    || !action
    || !safeId(value.formId)
    || (value.clauseId !== null && !clauseId)
    || !isResearchArtifactChecksum(value.baseRevisionChecksum)
    || proposedTextChecksum === undefined
    || resultingTextChecksum === undefined
    || Number.isNaN(Date.parse(safeString(value.decidedAt, 64)))
    || value.claim !== "researcher-decision-record-not-ai-approval-or-governance"
  ) return null;
  return {
    schemaVersion: CONSENT_ASSISTANT_SCHEMA_VERSION,
    id: safeId(value.id),
    projectId,
    suggestionId: safeId(value.suggestionId),
    suggestionKind,
    suggestionTitle: safeString(value.suggestionTitle, 240),
    mode,
    formId: safeId(value.formId),
    clauseId,
    action,
    decidedAt: safeString(value.decidedAt, 64),
    baseRevisionChecksum: value.baseRevisionChecksum,
    proposedTextChecksum,
    resultingTextChecksum,
    servedModel: safeString(value.servedModel, 160),
    claim: "researcher-decision-record-not-ai-approval-or-governance",
  };
}

export function consentAssistantDecisionStorageKey(projectId: string): string {
  return `cerise:consent-assistant-decisions:v1:${projectId}`;
}

export function readConsentAssistantDecisions(
  storage: Pick<Storage, "getItem">,
  projectId: string,
): ConsentAssistantDecisionRecord[] {
  try {
    const raw = storage.getItem(consentAssistantDecisionStorageKey(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .slice(-MAX_CONSENT_ASSISTANT_DECISIONS)
      .flatMap((item) => {
        const record = normalizeConsentAssistantDecisionRecord(item, projectId);
        return record ? [record] : [];
      });
  } catch {
    return [];
  }
}

export function writeConsentAssistantDecisions(
  storage: Pick<Storage, "setItem">,
  projectId: string,
  decisions: readonly ConsentAssistantDecisionRecord[],
): void {
  const normalized = decisions
    .slice(-MAX_CONSENT_ASSISTANT_DECISIONS)
    .flatMap((item) => {
      const record = normalizeConsentAssistantDecisionRecord(item, projectId);
      return record ? [record] : [];
    });
  storage.setItem(consentAssistantDecisionStorageKey(projectId), JSON.stringify(normalized));
}
