import { readStepDraft, type ResearchPathDraft, type StepDraft } from "./researchPathDraft";

export type ResearchPathwayRowCollection = "ideas" | "parking" | "problems" | "baseline" | "questions";

interface ResearchPathwayRowSpec {
  prefix: string;
  defaultRows: number;
  maximumRows: number;
  suffixes: readonly string[];
}

export interface ResearchPathwayRowRoster {
  active: string[];
  archived: string[];
  maximumRows: number;
}

export const PHASE3_MAXIMUM_ROWS = 40;

export const RESEARCH_PATHWAY_ROW_SPECS: Readonly<Record<ResearchPathwayRowCollection, ResearchPathwayRowSpec>> = {
  ideas: {
    prefix: "idea",
    defaultRows: 4,
    maximumRows: PHASE3_MAXIMUM_ROWS,
    suffixes: ["id", "kind", "text", "affected", "status"],
  },
  parking: {
    prefix: "parking",
    defaultRows: 3,
    maximumRows: PHASE3_MAXIMUM_ROWS,
    suffixes: ["id", "text", "status"],
  },
  problems: {
    prefix: "frame",
    defaultRows: 4,
    maximumRows: PHASE3_MAXIMUM_ROWS,
    suffixes: ["id", "title", "situation", "affected", "consequence", "uncertainty", "observed", "assumptions", "interpretation", "alternatives", "status"],
  },
  baseline: {
    prefix: "baseline",
    defaultRows: 4,
    maximumRows: PHASE3_MAXIMUM_ROWS,
    suffixes: ["id", "source", "known", "contested", "missing", "assumed", "search-terms", "adjacent", "missing-voices", "linked-frames", "evidence-refs", "status"],
  },
  questions: {
    prefix: "question",
    defaultRows: 6,
    maximumRows: PHASE3_MAXIMUM_ROWS,
    suffixes: ["id", "text", "family", "status", "linked-frames", "linked-baseline", "scope-population", "scope-setting", "scope-construct", "scope-timeframe", "scope-comparison", "scope-evidence", "implications", "assumptions", "criterion-significance", "criterion-interest", "criterion-feasibility", "criterion-ethics", "criterion-evidence", "criterion-contribution", "comparison-notes"],
  },
};

const SLOT_PATTERN = /^(?:\d+|p3-[1-9]\d*)$/;
const COLLECTION_STEP_IDS: Record<ResearchPathwayRowCollection, string> = {
  ideas: "stage-01-capture-concern",
  parking: "stage-01-capture-concern",
  problems: "stage-01-shape-problems",
  baseline: "stage-01-explore-baseline",
  questions: "stage-01-develop-questions",
};

function linkedIds(value: string | undefined): string[] {
  return [...new Set((value ?? "").split(/[,\n]/).map((item) => item.trim()).filter(Boolean))];
}

export function researchPathwayRosterFieldKey(collection: ResearchPathwayRowCollection, kind: "active" | "archived"): string {
  return `__phase3-${collection}-${kind}`;
}

function parseRoster(value: string | undefined): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((item): item is string => typeof item === "string" && SLOT_PATTERN.test(item)))];
  } catch {
    return [];
  }
}

function serializeRoster(slots: readonly string[]): string {
  return JSON.stringify(slots);
}

function inferredSlots(fields: Record<string, string>, collection: ResearchPathwayRowCollection): string[] {
  const spec = RESEARCH_PATHWAY_ROW_SPECS[collection];
  const suffixPattern = spec.suffixes.map((suffix) => suffix.replaceAll("-", "\\-")).join("|");
  const pattern = new RegExp(`^${spec.prefix}-((?:\\d+|p3-[1-9]\\d*))-(?:${suffixPattern})$`);
  const discovered = Object.keys(fields).flatMap((key) => {
    const match = key.match(pattern);
    return match ? [match[1]] : [];
  });
  const defaults = Array.from({ length: spec.defaultRows }, (_, index) => String(index));
  return [...new Set([...defaults, ...discovered])].slice(0, spec.maximumRows);
}

export function researchPathwayRowRoster(fields: Record<string, string>, collection: ResearchPathwayRowCollection): ResearchPathwayRowRoster {
  const spec = RESEARCH_PATHWAY_ROW_SPECS[collection];
  const activeKey = researchPathwayRosterFieldKey(collection, "active");
  const archivedKey = researchPathwayRosterFieldKey(collection, "archived");
  const hasRoster = Object.hasOwn(fields, activeKey) || Object.hasOwn(fields, archivedKey);
  const archived = parseRoster(fields[archivedKey]).slice(0, spec.maximumRows);
  const archivedSet = new Set(archived);
  let active = (hasRoster ? parseRoster(fields[activeKey]) : inferredSlots(fields, collection))
    .filter((slot) => !archivedSet.has(slot))
    .slice(0, spec.maximumRows);
  if (active.length === 0) {
    const occupied = new Set(archived);
    let index = 0;
    while (occupied.has(String(index))) index += 1;
    active = [String(index)];
  }
  const remaining = Math.max(0, spec.maximumRows - active.length);
  return { active, archived: archived.slice(0, remaining), maximumRows: spec.maximumRows };
}

export function researchPathwayRowKey(collection: ResearchPathwayRowCollection, slot: string, suffix: string): string {
  const spec = RESEARCH_PATHWAY_ROW_SPECS[collection];
  if (!SLOT_PATTERN.test(slot) || !spec.suffixes.includes(suffix)) throw new Error("Research pathway row key is invalid.");
  return `${spec.prefix}-${slot}-${suffix}`;
}

export function researchPathwayRowItemId(collection: ResearchPathwayRowCollection, slot: string, fields: Record<string, string>): string {
  const explicit = fields[researchPathwayRowKey(collection, slot, "id")]?.trim();
  if (explicit) return explicit;
  const ordinal = /^\d+$/.test(slot) ? String(Number(slot) + 1) : slot;
  if (collection === "ideas") return `idea-row-${ordinal}`;
  if (collection === "parking") return `parking-row-${ordinal}`;
  if (collection === "problems") return `problem-frame-${ordinal}`;
  if (collection === "baseline") return `baseline-entry-${ordinal}`;
  return `question-candidate-${ordinal}`;
}

export function researchPathwayRowHasContent(fields: Record<string, string>, collection: ResearchPathwayRowCollection, slot: string): boolean {
  const spec = RESEARCH_PATHWAY_ROW_SPECS[collection];
  return spec.suffixes.some((suffix) => suffix !== "id" && suffix !== "status" && Boolean(fields[researchPathwayRowKey(collection, slot, suffix)]?.trim()));
}

export function researchPathwayArchiveProtectionReason(collection: ResearchPathwayRowCollection, slot: string, pathwayDraft: ResearchPathDraft): string | null {
  const step = readStepDraft(pathwayDraft, COLLECTION_STEP_IDS[collection]);
  const itemId = researchPathwayRowItemId(collection, slot, step.fields);
  const prefix = RESEARCH_PATHWAY_ROW_SPECS[collection].prefix;
  if (step.fields[`${prefix}-${slot}-status`] === "selected") return "Change the selected status before archiving this row.";
  if (collection === "problems") {
    const baseline = readStepDraft(pathwayDraft, COLLECTION_STEP_IDS.baseline).fields;
    const questions = readStepDraft(pathwayDraft, COLLECTION_STEP_IDS.questions).fields;
    const baselineRoster = researchPathwayRowRoster(baseline, "baseline");
    const questionRoster = researchPathwayRowRoster(questions, "questions");
    const baselineLinked = [...baselineRoster.active, ...baselineRoster.archived]
      .some((row) => linkedIds(baseline[`baseline-${row}-linked-frames`]).includes(itemId));
    const questionLinked = [...questionRoster.active, ...questionRoster.archived]
      .some((row) => linkedIds(questions[`question-${row}-linked-frames`]).includes(itemId));
    if (baselineLinked || questionLinked) return "Remove the baseline or question links before archiving this problem frame.";
  }
  if (collection === "baseline") {
    const questions = readStepDraft(pathwayDraft, COLLECTION_STEP_IDS.questions).fields;
    const questionRoster = researchPathwayRowRoster(questions, "questions");
    const linked = [...questionRoster.active, ...questionRoster.archived]
      .some((row) => linkedIds(questions[`question-${row}-linked-baseline`]).includes(itemId));
    if (linked) return "Remove the research-question links before archiving this baseline entry.";
  }
  return null;
}

function nextSlot(roster: ResearchPathwayRowRoster): string {
  const occupied = new Set([...roster.active, ...roster.archived]);
  let index = 1;
  while (occupied.has(`p3-${index}`)) index += 1;
  return `p3-${index}`;
}

function withRoster(fields: Record<string, string>, collection: ResearchPathwayRowCollection, active: readonly string[], archived: readonly string[]): Record<string, string> {
  return {
    ...fields,
    [researchPathwayRosterFieldKey(collection, "active")]: serializeRoster(active),
    [researchPathwayRosterFieldKey(collection, "archived")]: serializeRoster(archived),
  };
}

export function addResearchPathwayRow(fields: Record<string, string>, collection: ResearchPathwayRowCollection): { fields: Record<string, string>; slot: string | null } {
  const roster = researchPathwayRowRoster(fields, collection);
  if (roster.active.length + roster.archived.length >= roster.maximumRows) return { fields, slot: null };
  const slot = nextSlot(roster);
  const status = collection === "parking" ? "parked" : "exploring";
  const itemId = researchPathwayRowItemId(collection, slot, fields);
  return {
    slot,
    fields: {
      ...withRoster(fields, collection, [...roster.active, slot], roster.archived),
      [researchPathwayRowKey(collection, slot, "id")]: itemId,
      [researchPathwayRowKey(collection, slot, "status")]: status,
    },
  };
}

export function moveResearchPathwayRow(fields: Record<string, string>, collection: ResearchPathwayRowCollection, slot: string, direction: -1 | 1): Record<string, string> {
  const roster = researchPathwayRowRoster(fields, collection);
  const index = roster.active.indexOf(slot);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= roster.active.length) return fields;
  const active = [...roster.active];
  [active[index], active[target]] = [active[target], active[index]];
  return withRoster(fields, collection, active, roster.archived);
}

export function archiveResearchPathwayRow(fields: Record<string, string>, collection: ResearchPathwayRowCollection, slot: string): Record<string, string> {
  const roster = researchPathwayRowRoster(fields, collection);
  const status = fields[researchPathwayRowKey(collection, slot, "status")];
  if (roster.active.length <= 1 || !roster.active.includes(slot) || status === "selected") return fields;
  const active = roster.active.filter((item) => item !== slot);
  const archived = [...roster.archived.filter((item) => item !== slot), slot];
  return {
    ...withRoster(fields, collection, active, archived),
    [researchPathwayRowKey(collection, slot, "status")]: collection === "parking" ? "rejected" : "parked",
  };
}

export function restoreResearchPathwayRow(fields: Record<string, string>, collection: ResearchPathwayRowCollection, slot: string): Record<string, string> {
  const roster = researchPathwayRowRoster(fields, collection);
  if (!roster.archived.includes(slot)) return fields;
  const active = [...roster.active, slot];
  const archived = roster.archived.filter((item) => item !== slot);
  return {
    ...withRoster(fields, collection, active, archived),
    [researchPathwayRowKey(collection, slot, "status")]: collection === "parking" ? "parked" : "exploring",
  };
}

export function removeEmptyResearchPathwayRow(fields: Record<string, string>, collection: ResearchPathwayRowCollection, slot: string): Record<string, string> {
  const roster = researchPathwayRowRoster(fields, collection);
  const status = fields[researchPathwayRowKey(collection, slot, "status")];
  if (roster.active.length <= 1 || !roster.active.includes(slot) || status === "selected" || researchPathwayRowHasContent(fields, collection, slot)) return fields;
  const next = withRoster(fields, collection, roster.active.filter((item) => item !== slot), roster.archived);
  for (const suffix of RESEARCH_PATHWAY_ROW_SPECS[collection].suffixes) delete next[researchPathwayRowKey(collection, slot, suffix)];
  return next;
}

export function isPhase3ResearchPathwayField(stepId: string, key: string): boolean {
  const collection: ResearchPathwayRowCollection | null = stepId === "stage-01-capture-concern"
    ? key.startsWith("parking-") || key.includes("-parking-") ? "parking" : "ideas"
    : stepId === "stage-01-shape-problems" ? "problems"
      : stepId === "stage-01-explore-baseline" ? "baseline"
        : stepId === "stage-01-develop-questions" ? "questions"
          : null;
  if (!collection) return false;
  if (key === researchPathwayRosterFieldKey(collection, "active") || key === researchPathwayRosterFieldKey(collection, "archived")) return true;
  const spec = RESEARCH_PATHWAY_ROW_SPECS[collection];
  return spec.suffixes.some((suffix) => new RegExp(`^${spec.prefix}-(?:\\d+|p3-[1-9]\\d*)-${suffix.replaceAll("-", "\\-")}$`).test(key));
}

export function replaceStepDraftFields(stepDraft: StepDraft, fields: Record<string, string>): StepDraft {
  return { ...stepDraft, fields };
}
