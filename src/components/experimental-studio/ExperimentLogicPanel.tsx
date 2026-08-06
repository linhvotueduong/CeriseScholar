"use client";

import { useMemo } from "react";
import { AppIcon } from "@/components/app-shell/AppIcons";
import {
  createExperimentBranchRule,
  createExperimentCondition,
  EXPERIMENT_BRANCH_OPERATOR_OPTIONS,
  MAX_EXPERIMENT_BRANCH_RULES,
  MAX_EXPERIMENT_CONDITIONS,
  MAX_EXPERIMENT_TIMING_MS,
  previewExperimentAssignments,
  type ExperimentBlock,
  type ExperimentBranchRule,
  type ExperimentCondition,
  type ExperimentStudioDocument,
} from "@/lib/research/experimentStudio";
import styles from "./ExperimentalStudio.module.css";

interface ExperimentLogicPanelProps {
  activeBlockId: string;
  onActiveBlockIdChange: (blockId: string) => void;
  onChange: (updater: (current: ExperimentStudioDocument) => ExperimentStudioDocument) => void;
  studio: ExperimentStudioDocument;
}

function makeClientId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}`;
}

function clampInteger(value: string, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

export default function ExperimentLogicPanel({
  activeBlockId,
  onActiveBlockIdChange,
  onChange,
  studio,
}: ExperimentLogicPanelProps) {
  const activeBlock = studio.blocks.find((block) => block.id === activeBlockId) ?? studio.blocks[0];
  const responseBlocks = studio.blocks.filter((block) => block.responseType !== "none");
  const assignments = useMemo(() => previewExperimentAssignments(studio, 20), [studio]);
  const assignmentCounts = useMemo(() => {
    const counts = new Map<string, number>();
    assignments.forEach((condition) => counts.set(condition.id, (counts.get(condition.id) ?? 0) + 1));
    return counts;
  }, [assignments]);

  function updateCondition(conditionId: string, patch: Partial<ExperimentCondition>) {
    onChange((current) => ({
      ...current,
      conditions: current.conditions.map((condition) => (
        condition.id === conditionId ? { ...condition, ...patch } : condition
      )),
    }));
  }

  function addCondition() {
    if (studio.conditions.length >= MAX_EXPERIMENT_CONDITIONS) return;
    const condition = createExperimentCondition(
      makeClientId("condition"),
      `Condition ${studio.conditions.length + 1}`,
    );
    onChange((current) => ({ ...current, conditions: [...current.conditions, condition] }));
  }

  function deleteCondition(conditionId: string) {
    if (studio.conditions.length <= 1) return;
    onChange((current) => {
      const conditions = current.conditions.filter((condition) => condition.id !== conditionId);
      return {
        ...current,
        conditions,
        assignment: conditions.length < 2 ? { ...current.assignment, method: "single" } : current.assignment,
        branchRules: current.branchRules.map((rule) => (
          rule.conditionId === conditionId ? { ...rule, conditionId: "" } : rule
        )),
      };
    });
  }

  function updateRule(ruleId: string, patch: Partial<ExperimentBranchRule>) {
    onChange((current) => ({
      ...current,
      branchRules: current.branchRules.map((rule) => rule.id === ruleId ? { ...rule, ...patch } : rule),
    }));
  }

  function addRule() {
    if (studio.branchRules.length >= MAX_EXPERIMENT_BRANCH_RULES) return;
    const source = responseBlocks[0] ?? studio.blocks[0];
    const sourceIndex = source ? studio.blocks.findIndex((block) => block.id === source.id) : -1;
    const target = studio.blocks[sourceIndex + 1]?.id ?? "__end__";
    const rule = createExperimentBranchRule(makeClientId("rule"), source?.id ?? "", target);
    onChange((current) => ({ ...current, branchRules: [...current.branchRules, rule] }));
  }

  function deleteRule(ruleId: string) {
    onChange((current) => ({
      ...current,
      branchRules: current.branchRules.filter((rule) => rule.id !== ruleId),
    }));
  }

  function updateActiveBlock(patch: Partial<ExperimentBlock>) {
    if (!activeBlock) return;
    onChange((current) => ({
      ...current,
      blocks: current.blocks.map((block) => block.id === activeBlock.id ? { ...block, ...patch } : block),
    }));
  }

  return (
    <main className={styles.logicWorkspace}>
      <aside className={styles.conditionsRail}>
        <div className={styles.logicSectionHeading}>
          <h1>Conditions</h1>
          <span title="Conditions define the study variants participants can be assigned to.">?</span>
        </div>
        <ol>
          {studio.conditions.map((condition, index) => (
            <li key={condition.id}>
              <span>{index + 1}</span>
              <input
                aria-label={`Condition ${index + 1} name`}
                maxLength={100}
                onChange={(event) => updateCondition(condition.id, { name: event.target.value })}
                value={condition.name}
              />
              <button
                aria-label={`Delete ${condition.name}`}
                disabled={studio.conditions.length <= 1}
                onClick={() => deleteCondition(condition.id)}
                title="Delete condition"
                type="button"
              >
                <AppIcon name="trash" />
              </button>
            </li>
          ))}
        </ol>
        <button
          className={styles.outlineAction}
          disabled={studio.conditions.length >= MAX_EXPERIMENT_CONDITIONS}
          onClick={addCondition}
          type="button"
        >
          <AppIcon name="plus" />
          Add condition
        </button>
      </aside>

      <section className={styles.logicCanvas}>
        <h1>Assignment and flow</h1>

        <section className={styles.assignmentPanel}>
          <h2>Assignment</h2>
          <div className={styles.assignmentControls}>
            <label>
              <span>Assignment method</span>
              <select
                onChange={(event) => onChange((current) => ({
                  ...current,
                  assignment: { ...current.assignment, method: event.target.value as "single" | "random" },
                }))}
                value={studio.assignment.method}
              >
                <option value="single">One shared condition</option>
                <option disabled={studio.conditions.length < 2} value="random">Random assignment</option>
              </select>
            </label>
            <label>
              <span>Deterministic preview seed</span>
              <input
                max={2_147_483_647}
                min={0}
                onChange={(event) => onChange((current) => ({
                  ...current,
                  assignment: {
                    ...current.assignment,
                    previewSeed: clampInteger(event.target.value, current.assignment.previewSeed, 0, 2_147_483_647),
                  },
                }))}
                type="number"
                value={studio.assignment.previewSeed}
              />
              <small>Same seed and rehearsal number produce the same assignment.</small>
            </label>
          </div>

          <div className={styles.allocationRows}>
            <div className={styles.allocationHeader}>
              <span>Allocation weights</span>
              <span>Distribution preview · first 20 rehearsals</span>
            </div>
            {studio.conditions.map((condition) => {
              const count = assignmentCounts.get(condition.id) ?? 0;
              const percent = assignments.length > 0 ? Math.round((count / assignments.length) * 100) : 0;
              return (
                <div className={styles.allocationRow} key={condition.id}>
                  <strong>{condition.name || "Unnamed condition"}</strong>
                  <label>
                    <span className={styles.srOnly}>Weight for {condition.name}</span>
                    <input
                      max={100}
                      min={1}
                      onChange={(event) => updateCondition(condition.id, {
                        weight: clampInteger(event.target.value, condition.weight, 1, 100),
                      })}
                      type="number"
                      value={condition.weight}
                    />
                  </label>
                  <div className={styles.distributionTrack} aria-label={`${percent}% assigned to ${condition.name}`}>
                    <span style={{ width: `${percent}%` }} />
                  </div>
                  <span>{count} ({percent}%)</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className={styles.rulesPanel}>
          <div className={styles.logicSectionHeading}>
            <h2>Branching rules</h2>
            <span title="The first matching rule is used; otherwise the block follows its normal destination.">?</span>
          </div>
          {studio.branchRules.length > 0 ? (
            <div className={styles.rulesTableWrap}>
              <table>
                <thead>
                  <tr><th>When</th><th>Comparison</th><th>Condition</th><th>Go to</th><th /></tr>
                </thead>
                <tbody>
                  {studio.branchRules.map((rule) => (
                    <tr key={rule.id}>
                      <td>
                        <select onChange={(event) => updateRule(rule.id, { sourceBlockId: event.target.value })} value={rule.sourceBlockId}>
                          {responseBlocks.map((block) => <option key={block.id} value={block.id}>{block.title}</option>)}
                        </select>
                      </td>
                      <td>
                        <div className={styles.ruleComparison}>
                          <select onChange={(event) => updateRule(rule.id, { operator: event.target.value as ExperimentBranchRule["operator"] })} value={rule.operator}>
                            {EXPERIMENT_BRANCH_OPERATOR_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                          {rule.operator !== "answered" && rule.operator !== "not-answered" ? (
                            <input
                              aria-label="Comparison value"
                              maxLength={200}
                              onChange={(event) => updateRule(rule.id, { value: event.target.value })}
                              placeholder="Value"
                              value={rule.value}
                            />
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <select onChange={(event) => updateRule(rule.id, { conditionId: event.target.value })} value={rule.conditionId}>
                          <option value="">Any condition</option>
                          {studio.conditions.map((condition) => <option key={condition.id} value={condition.id}>{condition.name}</option>)}
                        </select>
                      </td>
                      <td>
                        <select onChange={(event) => updateRule(rule.id, { targetBlockId: event.target.value })} value={rule.targetBlockId}>
                          {studio.blocks.map((block) => <option key={block.id} value={block.id}>{block.title}</option>)}
                          <option value="__end__">End study</option>
                        </select>
                      </td>
                      <td>
                        <button aria-label="Delete branching rule" onClick={() => deleteRule(rule.id)} type="button"><AppIcon name="trash" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.logicEmpty}>No response-based branches. Each block continues using its normal destination.</p>
          )}
          <button
            className={styles.outlineAction}
            disabled={responseBlocks.length === 0 || studio.branchRules.length >= MAX_EXPERIMENT_BRANCH_RULES}
            onClick={addRule}
            type="button"
          >
            <AppIcon name="plus" />
            Add branching rule
          </button>
        </section>

        <section className={styles.flowDiagram}>
          <div className={styles.logicSectionHeading}>
            <h2>Flow diagram</h2>
            <span title="A compact preview of the default screen order and any response branches.">?</span>
          </div>
          <div className={styles.flowSequence}>
            {studio.blocks.slice(0, 6).map((block, index) => (
              <div key={block.id}>
                <button className={block.id === activeBlock?.id ? styles.flowNodeActive : undefined} onClick={() => onActiveBlockIdChange(block.id)} type="button">
                  <strong>{block.title}</strong>
                  <span>Block {index + 1}</span>
                </button>
                {index < Math.min(studio.blocks.length, 6) - 1 ? <AppIcon name="arrow-right" /> : null}
              </div>
            ))}
            {studio.blocks.length > 6 ? <span>+{studio.blocks.length - 6} more</span> : null}
          </div>
          {studio.branchRules.length > 0 ? (
            <ul className={styles.branchSummary}>
              {studio.branchRules.slice(0, 3).map((rule) => {
                const source = studio.blocks.find((block) => block.id === rule.sourceBlockId)?.title ?? "Missing block";
                const target = rule.targetBlockId === "__end__"
                  ? "End study"
                  : studio.blocks.find((block) => block.id === rule.targetBlockId)?.title ?? "Missing destination";
                return <li key={rule.id}><strong>{source}</strong><AppIcon name="arrow-right" /><span>{target}</span></li>;
              })}
            </ul>
          ) : null}
        </section>
      </section>

      <aside className={styles.executionInspector}>
        <h1>Execution settings</h1>
        <label>
          <span>Configure block</span>
          <select onChange={(event) => onActiveBlockIdChange(event.target.value)} value={activeBlock?.id ?? ""}>
            {studio.blocks.map((block) => <option key={block.id} value={block.id}>{block.title}</option>)}
          </select>
        </label>
        <label>
          <span>Display duration (ms)</span>
          <input
            max={MAX_EXPERIMENT_TIMING_MS}
            min={0}
            onChange={(event) => updateActiveBlock({
              displayDurationMs: clampInteger(event.target.value, activeBlock?.displayDurationMs ?? 0, 0, MAX_EXPERIMENT_TIMING_MS),
            })}
            type="number"
            value={activeBlock?.displayDurationMs ?? 0}
          />
          <small>0 keeps the screen visible until the participant continues.</small>
        </label>
        <label>
          <span>Response deadline (ms)</span>
          <input
            max={MAX_EXPERIMENT_TIMING_MS}
            min={0}
            onChange={(event) => updateActiveBlock({
              responseDeadlineMs: clampInteger(event.target.value, activeBlock?.responseDeadlineMs ?? 0, 0, MAX_EXPERIMENT_TIMING_MS),
            })}
            type="number"
            value={activeBlock?.responseDeadlineMs ?? 0}
          />
          <small>0 means no response deadline.</small>
        </label>
        <label className={styles.logicToggle}>
          <input
            checked={studio.execution.allowBackNavigation}
            onChange={(event) => onChange((current) => ({
              ...current,
              execution: { ...current.execution, allowBackNavigation: event.target.checked },
            }))}
            type="checkbox"
          />
          <span>Allow back navigation</span>
        </label>
        <label className={styles.logicToggle}>
          <input
            checked={studio.execution.requireFullscreen}
            onChange={(event) => onChange((current) => ({
              ...current,
              execution: { ...current.execution, requireFullscreen: event.target.checked },
            }))}
            type="checkbox"
          />
          <span>Request fullscreen when the study begins</span>
        </label>
        <label className={styles.logicToggle}>
          <input
            checked={studio.execution.logFocusChanges}
            onChange={(event) => onChange((current) => ({
              ...current,
              execution: { ...current.execution, logFocusChanges: event.target.checked },
            }))}
            type="checkbox"
          />
          <span>Log browser focus and tab visibility changes</span>
        </label>
        <div className={styles.timingNotice}>
          <AppIcon name="help" />
          <p>Timing in this browser rehearsal is an estimate. Phase 3 does not claim certified millisecond precision.</p>
        </div>
      </aside>
    </main>
  );
}
