"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppIcon } from "@/components/app-shell/AppIcons";
import {
  createExperimentBlock,
  MAX_EXPERIMENT_BLOCKS,
  MAX_EXPERIMENT_TRIAL_TABLES,
  MAX_EXPERIMENT_TRIAL_ROWS,
  type ExperimentBlock,
  type ExperimentStudioDocument,
  type ExperimentTrialLoopConfig,
} from "@/lib/research/experimentStudio";
import { experimentTrialRowRecord } from "@/lib/research/experimentTrials";
import styles from "./ExperimentTrialsPanel.module.css";

interface ExperimentTrialsPanelProps {
  studio: ExperimentStudioDocument;
  onChange: (updater: (current: ExperimentStudioDocument) => ExperimentStudioDocument) => void;
  onOpenBlock: (blockId: string) => void;
}

const OPTIONAL_MAPPING_LABELS: ReadonlyArray<{
  field: keyof ExperimentTrialLoopConfig;
  label: string;
}> = [
  { field: "correctAnswerColumn", label: "Correct answer" },
  { field: "allowedKeysColumn", label: "Allowed keys" },
  { field: "responseDeadlineColumn", label: "Deadline (ms)" },
  { field: "conditionColumn", label: "Condition" },
  { field: "practiceColumn", label: "Practice flag" },
];

function makeLoopBlockId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `trial-loop-${crypto.randomUUID()}`;
  }
  return `trial-loop-${Date.now().toString(36)}`;
}

function loopTitle(tableName: string): string {
  return /\btrials?$/i.test(tableName.trim()) ? tableName : `${tableName} trials`;
}

function insertBeforeDebrief(blocks: ExperimentBlock[], loop: ExperimentBlock): ExperimentBlock[] {
  const debriefIndex = blocks.findIndex((block) => block.type === "debrief");
  if (debriefIndex < 0) return [...blocks, loop];
  return [...blocks.slice(0, debriefIndex), loop, ...blocks.slice(debriefIndex)];
}

function downloadSampleCsv() {
  const csv = [
    "trial_id,stimulus,allowed_keys,correct_key,duration_ms,condition,practice",
    "practice-01,Press F for this practice item,f|j,f,1500,,true",
    "trial-01,Press J for this item,f|j,j,1200,Condition A,false",
    "trial-02,Press F for this item,f|j,f,1200,Condition B,false",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "cerise-trial-table-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function ExperimentTrialsPanel({
  studio,
  onChange,
  onOpenBlock,
}: ExperimentTrialsPanelProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [selectedTableId, setSelectedTableId] = useState(studio.trialTables[0]?.id ?? "");
  const [importState, setImportState] = useState("Import a CSV to create the first deterministic trial loop.");
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (studio.trialTables.some((table) => table.id === selectedTableId)) return;
    setSelectedTableId(studio.trialTables[0]?.id ?? "");
  }, [selectedTableId, studio.trialTables]);

  const selectedTable = useMemo(
    () => studio.trialTables.find((table) => table.id === selectedTableId) ?? studio.trialTables[0] ?? null,
    [selectedTableId, studio.trialTables],
  );
  const linkedLoops = useMemo(
    () => studio.blocks.filter((block) => block.type === "trial-loop" && block.trialLoop?.tableId === selectedTable?.id),
    [selectedTable?.id, studio.blocks],
  );
  const activeLoop = linkedLoops[0] ?? null;
  const previewRows = selectedTable?.rows.slice(0, 8) ?? [];
  const generatedTrialCount = selectedTable && activeLoop?.trialLoop
    ? selectedTable.rows.length * activeLoop.trialLoop.repetitions
    : 0;

  const updateLoop = (patch: Partial<ExperimentTrialLoopConfig>) => {
    if (!activeLoop) return;
    onChange((current) => ({
      ...current,
      blocks: current.blocks.map((block) => block.id === activeLoop.id
        ? { ...block, trialLoop: { ...(block.trialLoop as ExperimentTrialLoopConfig), ...patch } }
        : block),
    }));
  };

  const importCsv = async (file: File) => {
    setImporting(true);
    setImportState("Checking and importing the trial table…");
    try {
      const [{ parseExperimentTrialCsv }, csv] = await Promise.all([
        import("@/lib/research/experimentTrials"),
        file.text(),
      ]);
      const result = await parseExperimentTrialCsv(csv, file.name);
      const existingChecksumMatch = studio.trialTables.find((table) => table.sourceChecksum === result.table.sourceChecksum);
      if (!existingChecksumMatch && studio.trialTables.length >= MAX_EXPERIMENT_TRIAL_TABLES) {
        throw new Error(`Remove an imported table before adding another; the current limit is ${MAX_EXPERIMENT_TRIAL_TABLES} tables.`);
      }
      const existingLoop = existingChecksumMatch && studio.blocks.some((block) => block.trialLoop?.tableId === existingChecksumMatch.id);
      if (!existingLoop && studio.blocks.length >= MAX_EXPERIMENT_BLOCKS) {
        throw new Error(`Remove a study block before importing a new trial loop; the current limit is ${MAX_EXPERIMENT_BLOCKS} blocks.`);
      }
      let importedTableId = existingChecksumMatch?.id ?? result.table.id;
      let suffix = 2;
      while (!existingChecksumMatch && studio.trialTables.some((table) => table.id === importedTableId)) {
        importedTableId = `${result.table.id}-${suffix}`;
        suffix += 1;
      }
      onChange((current) => {
        const checksumMatch = current.trialTables.find((table) => table.sourceChecksum === result.table.sourceChecksum);
        if (checksumMatch) {
          const hasLoop = current.blocks.some((block) => block.type === "trial-loop" && block.trialLoop?.tableId === checksumMatch.id);
          if (hasLoop) return current;
          const loop = createExperimentBlock("trial-loop", makeLoopBlockId());
          return {
            ...current,
            blocks: insertBeforeDebrief(current.blocks, {
              ...loop,
              title: loopTitle(checksumMatch.name),
              internalName: `${checksumMatch.id}_loop`.replace(/[^a-z0-9_]+/gi, "_").slice(0, 80),
              trialLoop: { ...result.suggestedLoop, tableId: checksumMatch.id },
            }),
          };
        }
        const table = { ...result.table, id: importedTableId };
        const loop = createExperimentBlock("trial-loop", makeLoopBlockId());
        const block: ExperimentBlock = {
          ...loop,
          title: loopTitle(table.name),
          internalName: `${table.id}_loop`.replace(/[^a-z0-9_]+/gi, "_").slice(0, 80),
          trialLoop: { ...result.suggestedLoop, tableId: table.id },
        };
        return { ...current, trialTables: [...current.trialTables, table], blocks: insertBeforeDebrief(current.blocks, block) };
      });
      setSelectedTableId(importedTableId);
      setImportState(`Imported ${result.table.rows.length.toLocaleString()} trials from ${file.name}.`);
    } catch (error) {
      setImportState(error instanceof Error ? error.message : "The CSV could not be imported.");
    } finally {
      setImporting(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const removeSelectedTable = () => {
    if (!selectedTable) return;
    const approved = window.confirm(
      `Remove “${selectedTable.name}” and its ${linkedLoops.length} linked trial loop${linkedLoops.length === 1 ? "" : "s"}?`,
    );
    if (!approved) return;
    onChange((current) => ({
      ...current,
      trialTables: current.trialTables.filter((table) => table.id !== selectedTable.id),
      blocks: current.blocks.filter((block) => block.trialLoop?.tableId !== selectedTable.id),
      branchRules: current.branchRules.filter((rule) => !linkedLoops.some((loop) => (
        rule.sourceBlockId === loop.id || rule.targetBlockId === loop.id
      ))),
    }));
    setImportState(`Removed ${selectedTable.name} and its linked loop safely.`);
  };

  return (
    <main className={styles.workspace}>
      <aside className={styles.library}>
        <header>
          <span>Trial library</span>
          <strong>{studio.trialTables.length}</strong>
        </header>
        <input
          accept=".csv,text/csv"
          className={styles.hiddenInput}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importCsv(file);
          }}
          ref={fileInput}
          type="file"
        />
        <button className={styles.importButton} disabled={importing} onClick={() => fileInput.current?.click()} type="button">
          <AppIcon name="upload" />
          {importing ? "Importing…" : "Import trial CSV"}
        </button>
        <button className={styles.sampleButton} onClick={downloadSampleCsv} type="button">Download CSV template</button>
        <p className={styles.importState} aria-live="polite">{importState}</p>
        <nav aria-label="Imported trial tables">
          {studio.trialTables.map((table) => (
            <button
              className={table.id === selectedTable?.id ? styles.tableActive : undefined}
              key={table.id}
              onClick={() => setSelectedTableId(table.id)}
              type="button"
            >
              <span><AppIcon name="file" /></span>
              <span><strong>{table.name}</strong><small>{table.rows.length.toLocaleString()} rows · {table.columns.length} columns</small></span>
            </button>
          ))}
        </nav>
        <small className={styles.limitNote}>Per table: up to {MAX_EXPERIMENT_TRIAL_ROWS.toLocaleString()} rows. Imported data becomes part of the frozen release.</small>
      </aside>

      <section className={styles.preview}>
        {selectedTable ? (
          <>
            <header className={styles.previewHeader}>
              <div>
                <span>Imported CSV</span>
                <h1>{selectedTable.name}</h1>
                <p>{selectedTable.sourceFilename} · checksum {selectedTable.sourceChecksum.slice(0, 12)}…</p>
              </div>
              <div className={styles.metrics}>
                <span><strong>{selectedTable.rows.length.toLocaleString()}</strong> source rows</span>
                <span><strong>{generatedTrialCount.toLocaleString()}</strong> generated trials</span>
              </div>
            </header>
            <div className={styles.tableScroller}>
              <table>
                <thead><tr><th>#</th>{selectedTable.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
                <tbody>
                  {previewRows.map((row, rowIndex) => {
                    const record = experimentTrialRowRecord(selectedTable, row);
                    return (
                      <tr key={`${selectedTable.id}-${rowIndex}`}>
                        <td>{rowIndex + 1}</td>
                        {selectedTable.columns.map((column) => <td key={column}>{record[column]}</td>)}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {selectedTable.rows.length > previewRows.length ? (
              <p className={styles.previewNote}>Previewing the first {previewRows.length} of {selectedTable.rows.length.toLocaleString()} rows.</p>
            ) : null}
          </>
        ) : (
          <div className={styles.emptyState}>
            <AppIcon name="sliders" />
            <h1>Build a repeatable behavioral trial loop</h1>
            <p>Import a bounded CSV. Cerise will preserve the source table, generate a deterministic order, and record the exact order used for every rehearsal or participant session.</p>
            <button onClick={() => fileInput.current?.click()} type="button">Import the first trial table</button>
          </div>
        )}
      </section>

      <aside className={styles.configuration}>
        {selectedTable && activeLoop?.trialLoop ? (
          <>
            <header><span>Trial loop</span><h2>{activeLoop.title}</h2></header>
            <label>
              <span>Trial ID <em>Required</em></span>
              <select onChange={(event) => updateLoop({ trialIdColumn: event.target.value })} value={activeLoop.trialLoop.trialIdColumn}>
                {selectedTable.columns.map((column) => <option key={column} value={column}>{column}</option>)}
              </select>
            </label>
            <label>
              <span>Stimulus / prompt <em>Required</em></span>
              <select onChange={(event) => updateLoop({ stimulusColumn: event.target.value })} value={activeLoop.trialLoop.stimulusColumn}>
                {selectedTable.columns.map((column) => <option key={column} value={column}>{column}</option>)}
              </select>
            </label>
            {OPTIONAL_MAPPING_LABELS.map(({ field, label }) => (
              <label key={field}>
                <span>{label}</span>
                <select onChange={(event) => updateLoop({ [field]: event.target.value })} value={String(activeLoop.trialLoop?.[field] ?? "")}>
                  <option value="">Not mapped</option>
                  {selectedTable.columns.map((column) => <option key={column} value={column}>{column}</option>)}
                </select>
              </label>
            ))}
            <div className={styles.twoColumn}>
              <label>
                <span>Order</span>
                <select onChange={(event) => updateLoop({ order: event.target.value as ExperimentTrialLoopConfig["order"] })} value={activeLoop.trialLoop.order}>
                  <option value="shuffle">Seeded shuffle</option>
                  <option value="rotate">Seeded rotation</option>
                  <option value="fixed">Fixed CSV order</option>
                </select>
              </label>
              <label>
                <span>Repetitions</span>
                <input
                  max={20}
                  min={1}
                  onChange={(event) => updateLoop({ repetitions: Math.max(1, Math.min(20, Number(event.target.value) || 1)) })}
                  type="number"
                  value={activeLoop.trialLoop.repetitions}
                />
              </label>
            </div>
            <div className={styles.boundaryNote}><strong>Deterministic by release and session.</strong><span>Shuffle and rotation can be reproduced from the frozen specification and participant session ID.</span></div>
            <button className={styles.openBlock} onClick={() => onOpenBlock(activeLoop.id)} type="button">Open base trial screen <AppIcon name="arrow-right" /></button>
            <button className={styles.removeButton} onClick={removeSelectedTable} type="button"><AppIcon name="trash" />Remove table and loop</button>
          </>
        ) : selectedTable ? (
          <p className={styles.missingLoop}>This table has no linked loop. Re-import the same CSV to create one without duplicating its data.</p>
        ) : (
          <div className={styles.configurationEmpty}><strong>Column mapping</strong><p>Trial controls appear after import.</p></div>
        )}
      </aside>
    </main>
  );
}
