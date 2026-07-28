import Papa from "papaparse";
import { sha256Checksum } from "./experimentRelease";
import {
  MAX_EXPERIMENT_TIMING_MS,
  MAX_EXPERIMENT_TRIAL_CELL_LENGTH,
  MAX_EXPERIMENT_TRIAL_COLUMNS,
  MAX_EXPERIMENT_TRIAL_ROWS,
  resolveExperimentNextBlockId,
  type ExperimentBlock,
  type ExperimentStudioDocument,
  type ExperimentTrialLoopConfig,
  type ExperimentTrialOrder,
  type ExperimentTrialTable,
} from "./experimentStudio";

export const MAX_EXPERIMENT_TRIAL_CSV_BYTES = 320 * 1024;

export interface ExperimentTrialImportResult {
  table: ExperimentTrialTable;
  suggestedLoop: ExperimentTrialLoopConfig;
}

export interface ExperimentRuntimeTrial {
  tableId: string;
  tableName: string;
  loopBlockId: string;
  sourceRowIndex: number;
  trialId: string;
  repetition: number;
  orderIndex: number;
  stimulus: string;
  source: Record<string, string>;
}

export type ExperimentRuntimeBlock = ExperimentBlock & {
  runtimeTrial?: ExperimentRuntimeTrial;
};

const HEADER_ALIASES = {
  trialIdColumn: ["trial_id", "trialid", "id", "item_id", "itemid"],
  stimulusColumn: ["stimulus", "prompt", "word", "item", "text"],
  correctAnswerColumn: ["correct_key", "correctkey", "correct_answer", "correctanswer", "answer"],
  allowedKeysColumn: ["allowed_keys", "allowedkeys", "keys", "response_keys", "responsekeys"],
  responseDeadlineColumn: ["duration_ms", "durationms", "deadline_ms", "deadlinems", "response_deadline_ms"],
  conditionColumn: ["condition", "group", "arm"],
  practiceColumn: ["practice", "is_practice", "phase"],
} as const;

function normalizedHeader(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function suggestedColumn(columns: string[], aliases: readonly string[]): string {
  const normalized = new Map(columns.map((column) => [normalizedHeader(column), column]));
  for (const alias of aliases) {
    const match = normalized.get(alias);
    if (match) return match;
  }
  return "";
}

export function suggestExperimentTrialLoop(columns: string[]): ExperimentTrialLoopConfig {
  return {
    tableId: "",
    trialIdColumn: suggestedColumn(columns, HEADER_ALIASES.trialIdColumn) || columns[0] || "",
    stimulusColumn: suggestedColumn(columns, HEADER_ALIASES.stimulusColumn) || columns[1] || columns[0] || "",
    correctAnswerColumn: suggestedColumn(columns, HEADER_ALIASES.correctAnswerColumn),
    allowedKeysColumn: suggestedColumn(columns, HEADER_ALIASES.allowedKeysColumn),
    responseDeadlineColumn: suggestedColumn(columns, HEADER_ALIASES.responseDeadlineColumn),
    conditionColumn: suggestedColumn(columns, HEADER_ALIASES.conditionColumn),
    practiceColumn: suggestedColumn(columns, HEADER_ALIASES.practiceColumn),
    order: "shuffle",
    repetitions: 1,
  };
}

function safeTableId(filename: string, checksum: string): string {
  const base = filename
    .replace(/\.[^.]+$/, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "trial-table";
  return `${base}-${checksum.slice(-10)}`;
}

function csvByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export async function parseExperimentTrialCsv(
  csv: string,
  filename = "trial-table.csv",
): Promise<ExperimentTrialImportResult> {
  if (csvByteLength(csv) > MAX_EXPERIMENT_TRIAL_CSV_BYTES) {
    throw new Error(`Keep the CSV at or below ${Math.round(MAX_EXPERIMENT_TRIAL_CSV_BYTES / 1024)} KB for the current immutable release format.`);
  }
  const parsed = Papa.parse<string[]>(csv.replace(/^\uFEFF/, ""), {
    dynamicTyping: false,
    skipEmptyLines: "greedy",
  });
  if (parsed.errors.length > 0) {
    const first = parsed.errors[0];
    throw new Error(`CSV row ${(first.row ?? 0) + 1}: ${first.message}`);
  }
  const matrix = parsed.data;
  if (matrix.length < 2) throw new Error("The CSV needs one header row and at least one trial row.");
  const columns = matrix[0].map((column) => String(column ?? "").trim().slice(0, 80));
  if (columns.some((column) => !column)) throw new Error("Every trial-table column needs a header.");
  if (columns.length > MAX_EXPERIMENT_TRIAL_COLUMNS) {
    throw new Error(`Keep trial tables at or below ${MAX_EXPERIMENT_TRIAL_COLUMNS} columns.`);
  }
  if (new Set(columns).size !== columns.length) throw new Error("Trial-table column headers must be unique.");

  const rows = matrix.slice(1);
  if (rows.length > MAX_EXPERIMENT_TRIAL_ROWS) {
    throw new Error(`Keep trial tables at or below ${MAX_EXPERIMENT_TRIAL_ROWS.toLocaleString()} rows.`);
  }
  const normalizedRows = rows.map((row, rowIndex) => {
    if (row.length > columns.length && row.slice(columns.length).some((cell) => String(cell ?? "").trim())) {
      throw new Error(`CSV row ${rowIndex + 2} has more cells than the header row.`);
    }
    return columns.map((_, columnIndex) => {
      const cell = String(row[columnIndex] ?? "");
      if (cell.length > MAX_EXPERIMENT_TRIAL_CELL_LENGTH) {
        throw new Error(`CSV row ${rowIndex + 2} contains a cell longer than ${MAX_EXPERIMENT_TRIAL_CELL_LENGTH.toLocaleString()} characters.`);
      }
      return cell;
    });
  });
  const checksum = await sha256Checksum({ columns, rows: normalizedRows });
  const table: ExperimentTrialTable = {
    id: safeTableId(filename, checksum),
    name: filename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim().slice(0, 120) || "Trial table",
    sourceFilename: filename.slice(0, 180),
    sourceChecksum: checksum,
    importedAt: new Date().toISOString(),
    columns,
    rows: normalizedRows,
  };
  return {
    table,
    suggestedLoop: { ...suggestExperimentTrialLoop(columns), tableId: table.id },
  };
}

export function experimentTrialRowRecord(table: ExperimentTrialTable, row: string[]): Record<string, string> {
  return Object.fromEntries(table.columns.map((column, index) => [column, row[index] ?? ""]));
}

function hashTrialKey(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function seededUnitInterval(seed: number): number {
  let value = seed + 0x6d2b79f5;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
}

function deterministicOrder<T>(
  rows: T[],
  order: ExperimentTrialOrder,
  seed: number,
): T[] {
  if (order === "fixed" || rows.length < 2) return rows.slice();
  if (order === "rotate") {
    const start = Math.floor(seededUnitInterval(seed) * rows.length);
    return [...rows.slice(start), ...rows.slice(0, start)];
  }
  const output = rows.slice();
  for (let index = output.length - 1; index > 0; index -= 1) {
    const selected = Math.floor(seededUnitInterval(seed + index) * (index + 1));
    [output[index], output[selected]] = [output[selected], output[index]];
  }
  return output;
}

function truthyTrialFlag(value: string): boolean {
  return ["1", "true", "yes", "y", "practice"].includes(value.trim().toLocaleLowerCase());
}

function splitAllowedKeys(value: string, fallback: string[]): string[] {
  const keys = value.split(/[|,;\s]+/).map((key) => key.trim().toLocaleLowerCase()).filter(Boolean);
  return keys.length > 0 ? [...new Set(keys)].slice(0, 12) : fallback;
}

export function materializeExperimentTrialBlocks(
  document: ExperimentStudioDocument,
  participantKey: string,
  conditionId: string,
): ExperimentRuntimeBlock[] {
  const output: ExperimentRuntimeBlock[] = [];
  for (const block of document.blocks) {
    if (block.type !== "trial-loop" || !block.trialLoop) {
      output.push({ ...block });
      continue;
    }
    const loop = block.trialLoop;
    const table = document.trialTables.find((candidate) => candidate.id === loop.tableId);
    if (!table) {
      output.push({ ...block });
      continue;
    }
    const condition = document.conditions.find((candidate) => candidate.id === conditionId);
    const indexedRows = table.rows.map((row, sourceRowIndex) => ({ row, sourceRowIndex }));
    const eligibleRows = loop.conditionColumn
      ? indexedRows.filter(({ row }) => {
          const record = experimentTrialRowRecord(table, row);
          const value = record[loop.conditionColumn].trim().toLocaleLowerCase();
          return !value
            || value === conditionId.toLocaleLowerCase()
            || value === condition?.name.trim().toLocaleLowerCase();
        })
      : indexedRows;
    let orderIndex = 0;
    for (let repetition = 1; repetition <= loop.repetitions; repetition += 1) {
      const seed = hashTrialKey(`${document.assignment.previewSeed}:${participantKey}:${block.id}:${repetition}`);
      const orderedRows = deterministicOrder(eligibleRows, loop.order, seed);
      for (const { row, sourceRowIndex } of orderedRows) {
        const record = experimentTrialRowRecord(table, row);
        const trialId = record[loop.trialIdColumn]?.trim() || `row-${sourceRowIndex + 1}`;
        const deadlineCandidate = Number(record[loop.responseDeadlineColumn]);
        const responseDeadlineMs = loop.responseDeadlineColumn && Number.isInteger(deadlineCandidate)
          ? Math.min(MAX_EXPERIMENT_TIMING_MS, Math.max(0, deadlineCandidate))
          : block.responseDeadlineMs;
        const runtimeId = `${block.id}--${repetition}-${sourceRowIndex + 1}`;
        output.push({
          ...block,
          id: runtimeId,
          title: `${block.title} · ${trialId}`,
          prompt: record[loop.stimulusColumn] ?? block.prompt,
          allowedKeys: loop.allowedKeysColumn
            ? splitAllowedKeys(record[loop.allowedKeysColumn] ?? "", block.allowedKeys ?? [])
            : block.allowedKeys,
          correctAnswer: loop.correctAnswerColumn
            ? (record[loop.correctAnswerColumn] ?? "").trim().toLocaleLowerCase()
            : block.correctAnswer,
          responseDeadlineMs,
          practice: loop.practiceColumn ? truthyTrialFlag(record[loop.practiceColumn] ?? "") : block.practice,
          nextBlockId: "",
          runtimeTrial: {
            tableId: table.id,
            tableName: table.name,
            loopBlockId: block.id,
            sourceRowIndex,
            trialId,
            repetition,
            orderIndex,
            stimulus: record[loop.stimulusColumn] ?? "",
            source: record,
          },
        });
        orderIndex += 1;
      }
    }
  }
  return output;
}

export function resolveExperimentRuntimeNextIndex(
  document: ExperimentStudioDocument,
  runtimeBlocks: ExperimentRuntimeBlock[],
  currentIndex: number,
  responses: Readonly<Record<string, string>>,
  conditionId: string,
): number {
  const block = runtimeBlocks[currentIndex];
  if (!block) return runtimeBlocks.length;
  if (block.runtimeTrial) return Math.min(runtimeBlocks.length, currentIndex + 1);

  const nextId = resolveExperimentNextBlockId(document, block.id, responses, conditionId);
  if (nextId === "__end__") return runtimeBlocks.length;
  const nextIndex = runtimeBlocks.findIndex((candidate) => (
    candidate.id === nextId || candidate.runtimeTrial?.loopBlockId === nextId
  ));
  return nextIndex >= 0 ? nextIndex : runtimeBlocks.length;
}
