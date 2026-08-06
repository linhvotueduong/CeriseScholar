import assert from "node:assert/strict";
import test from "node:test";
import { createExperimentBlock, createExperimentCondition, createExperimentStudioDocument } from "./experimentStudio";
import {
  materializeExperimentTrialBlocks,
  parseExperimentTrialCsv,
  resolveExperimentRuntimeNextIndex,
} from "./experimentTrials";

const SAMPLE_CSV = `trial_id,condition,stimulus,correct_key,allowed_keys,duration_ms,practice
t1,control,RED,r,r|b,1000,true
t2,control,BLUE,b,r|b,1200,false
t3,intervention,GREEN,g,g|y,900,false`;

test("CSV trial import creates a checksummed compact table and useful mappings", async () => {
  const imported = await parseExperimentTrialCsv(SAMPLE_CSV, "stroop-trials.csv");

  assert.equal(imported.table.rows.length, 3);
  assert.deepEqual(imported.table.columns.slice(0, 3), ["trial_id", "condition", "stimulus"]);
  assert.match(imported.table.sourceChecksum, /^sha256:[a-f0-9]{64}$/);
  assert.equal(imported.suggestedLoop.trialIdColumn, "trial_id");
  assert.equal(imported.suggestedLoop.stimulusColumn, "stimulus");
  assert.equal(imported.suggestedLoop.responseDeadlineColumn, "duration_ms");
});

test("CSV trial import rejects duplicate headers and malformed row widths", async () => {
  await assert.rejects(
    parseExperimentTrialCsv("trial_id,trial_id\n1,2", "duplicate.csv"),
    /headers must be unique/,
  );
  await assert.rejects(
    parseExperimentTrialCsv("trial_id,stimulus\n1,RED,extra", "wide.csv"),
    /more cells than the header row/,
  );
});

test("trial loops filter by condition and preserve row-level response settings", async () => {
  const imported = await parseExperimentTrialCsv(SAMPLE_CSV, "stroop-trials.csv");
  const document = createExperimentStudioDocument("project-1");
  document.conditions = [
    createExperimentCondition("control", "Control"),
    createExperimentCondition("intervention", "Intervention"),
  ];
  document.trialTables = [imported.table];
  const loop = createExperimentBlock("trial-loop", "loop-1");
  loop.trialLoop = { ...imported.suggestedLoop, tableId: imported.table.id, order: "fixed" };
  document.blocks.splice(3, 0, loop);

  const runtime = materializeExperimentTrialBlocks(document, "participant-1", "control");
  const trials = runtime.filter((block) => block.runtimeTrial);

  assert.deepEqual(trials.map((block) => block.runtimeTrial?.trialId), ["t1", "t2"]);
  assert.deepEqual(trials[0].allowedKeys, ["r", "b"]);
  assert.equal(trials[0].correctAnswer, "r");
  assert.equal(trials[0].responseDeadlineMs, 1_000);
  assert.equal(trials[0].practice, true);
});

test("shuffle and rotate orders are deterministic for the same participant", async () => {
  const imported = await parseExperimentTrialCsv(SAMPLE_CSV, "stroop-trials.csv");
  const document = createExperimentStudioDocument("project-1");
  document.trialTables = [imported.table];
  const loop = createExperimentBlock("trial-loop", "loop-1");
  loop.trialLoop = {
    ...imported.suggestedLoop,
    tableId: imported.table.id,
    conditionColumn: "",
    repetitions: 2,
    order: "shuffle",
  };
  document.blocks.splice(3, 0, loop);

  const first = materializeExperimentTrialBlocks(document, "participant-7", "condition-all")
    .flatMap((block) => block.runtimeTrial?.trialId ?? []);
  const second = materializeExperimentTrialBlocks(document, "participant-7", "condition-all")
    .flatMap((block) => block.runtimeTrial?.trialId ?? []);
  assert.deepEqual(first, second);
  assert.equal(first.length, 6);

  loop.trialLoop.order = "rotate";
  const rotated = materializeExperimentTrialBlocks(document, "participant-7", "condition-all")
    .flatMap((block) => block.runtimeTrial?.trialId ?? []);
  assert.equal(rotated.length, 6);
});

test("runtime navigation enters a materialized loop and leaves it in the frozen block order", async () => {
  const imported = await parseExperimentTrialCsv(SAMPLE_CSV, "stroop-trials.csv");
  const document = createExperimentStudioDocument("project-1");
  document.trialTables = [imported.table];
  const loop = createExperimentBlock("trial-loop", "loop-1");
  loop.trialLoop = { ...imported.suggestedLoop, tableId: imported.table.id, conditionColumn: "", order: "fixed" };
  document.blocks.splice(3, 0, loop);
  const runtime = materializeExperimentTrialBlocks(document, "participant-1", "condition-all");
  const beforeLoopIndex = runtime.findIndex((block) => block.id === document.blocks[2].id);
  const firstTrialIndex = runtime.findIndex((block) => block.runtimeTrial?.loopBlockId === loop.id);
  const finalTrialIndex = runtime.findLastIndex((block) => block.runtimeTrial?.loopBlockId === loop.id);

  assert.equal(resolveExperimentRuntimeNextIndex(document, runtime, beforeLoopIndex, {}, "condition-all"), firstTrialIndex);
  assert.equal(resolveExperimentRuntimeNextIndex(document, runtime, firstTrialIndex, {}, "condition-all"), firstTrialIndex + 1);
  assert.equal(resolveExperimentRuntimeNextIndex(document, runtime, finalTrialIndex, {}, "condition-all"), finalTrialIndex + 1);
  assert.equal(runtime[finalTrialIndex + 1]?.id, document.blocks[4].id);
});
