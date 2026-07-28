"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppIcon } from "@/components/app-shell/AppIcons";
import {
  MAX_ANALYSIS_RULES,
  MAX_ANALYSIS_TEXT_LENGTH,
  type AnalysisDesignation,
  type AnalysisUnit,
  type AnalysisVariableRole,
} from "@/lib/research/analysisContract";
import {
  collectAnalysisPlanReadiness,
  createAnalysisPlanDocument,
  readAnalysisPlanDocument,
  writeAnalysisPlanDocument,
  type AnalysisEstimand,
  type AnalysisPlanDocument,
  type AnalysisPlanResearchQuestion,
  type AnalysisPlanSection,
} from "@/lib/research/analysisPlan";
import type { ExperimentRelease } from "@/lib/research/experimentRelease";
import {
  fetchExperimentReleases,
  readLocalExperimentReleases,
  verifiedExperimentReleases,
} from "@/lib/research/experimentReleasePersistence";
import styles from "./AnalysisPlanEditor.module.css";

interface AnalysisPlanEditorProps {
  projectId: string;
  projectName: string;
}

const SECTIONS: ReadonlyArray<{
  id: AnalysisPlanSection;
  icon: "file" | "help" | "list" | "sliders" | "shield";
  label: string;
}> = [
  { id: "release", icon: "file", label: "Release & contract" },
  { id: "questions", icon: "help", label: "Research questions" },
  { id: "variables", icon: "list", label: "Variables" },
  { id: "global", icon: "sliders", label: "Global decisions" },
  { id: "readiness", icon: "shield", label: "Readiness" },
];

const DESIGNATIONS: ReadonlyArray<{ value: Exclude<AnalysisDesignation, "unspecified">; label: string }> = [
  { value: "primary", label: "Primary" },
  { value: "secondary", label: "Secondary" },
  { value: "exploratory", label: "Exploratory" },
];

const ANALYSIS_UNITS: ReadonlyArray<{ value: AnalysisUnit; label: string }> = [
  { value: "unspecified", label: "Select a unit" },
  { value: "participant", label: "Participant" },
  { value: "trial", label: "Trial" },
  { value: "response", label: "Response" },
];

const VARIABLE_ROLES: ReadonlyArray<{ value: AnalysisVariableRole; label: string }> = [
  { value: "outcome", label: "Outcome" },
  { value: "predictor", label: "Predictor" },
  { value: "covariate", label: "Covariate" },
  { value: "mediator", label: "Mediator" },
  { value: "moderator", label: "Moderator" },
  { value: "group", label: "Group" },
  { value: "identifier", label: "Identifier" },
  { value: "administrative", label: "Administrative" },
  { value: "qualitative", label: "Qualitative" },
];

const ESTIMAND_FIELDS: ReadonlyArray<{
  key: keyof AnalysisEstimand;
  label: string;
  placeholder: string;
}> = [
  { key: "population", label: "Population", placeholder: "Who or what does the estimate represent?" },
  { key: "exposureOrIntervention", label: "Exposure / intervention", placeholder: "What is compared or varied?" },
  { key: "comparator", label: "Comparator", placeholder: "Compared with what?" },
  { key: "outcome", label: "Outcome", placeholder: "Which outcome is estimated?" },
  { key: "summaryMeasure", label: "Summary measure", placeholder: "Mean difference, odds ratio, theme…" },
  { key: "timepoint", label: "Timepoint", placeholder: "When is the outcome evaluated?" },
];

function shortChecksum(checksum: string): string {
  return checksum.length > 14 ? `${checksum.slice(0, 7)}…${checksum.slice(-5)}` : checksum;
}

function safeExportName(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return normalized || "cerise-analysis-plan";
}

function downloadJson(filename: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json",
  }));
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  window.document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function linesToRules(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.slice(0, MAX_ANALYSIS_TEXT_LENGTH))
    .slice(0, MAX_ANALYSIS_RULES);
}

function releaseSupportsAnalysisPlan(release: ExperimentRelease): boolean {
  return Boolean(
    release.manifest.analysisContract
    && release.manifest.analysisContractChecksum
    && release.manifest.analysisContractSchemaVersion,
  );
}

function mergeReleases(cloud: ExperimentRelease[], local: ExperimentRelease[]): ExperimentRelease[] {
  return [...cloud, ...local.filter((localRelease) => (
    !cloud.some((cloudRelease) => cloudRelease.releaseId === localRelease.releaseId)
  ))]
    .filter(releaseSupportsAnalysisPlan)
    .sort((left, right) => right.releaseNumber - left.releaseNumber);
}

function QuestionVariableMapping({
  label,
  names,
  selected,
  onToggle,
}: {
  label: string;
  names: string[];
  selected: string[];
  onToggle: (name: string) => void;
}) {
  return (
    <fieldset className={styles.mappingRow}>
      <legend>{label}</legend>
      <div className={styles.mappingChoices}>
        {names.length === 0 ? <span>No frozen variables are available.</span> : names.map((name) => (
          <label key={name}>
            <input
              checked={selected.includes(name)}
              onChange={() => onToggle(name)}
              type="checkbox"
            />
            <span>{name}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function RuleField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string[];
  placeholder: string;
  onChange: (rules: string[]) => void;
}) {
  return (
    <label className={styles.inlineTextArea}>
      <span>{label}</span>
      <textarea
        onChange={(event) => onChange(linesToRules(event.target.value))}
        placeholder={placeholder}
        rows={2}
        value={value.join("\n")}
      />
    </label>
  );
}

function QuestionEditor({
  plan,
  selectedQuestionId,
  onSelectQuestion,
  onUpdateQuestion,
}: {
  plan: AnalysisPlanDocument;
  selectedQuestionId: string;
  onSelectQuestion: (id: string) => void;
  onUpdateQuestion: (updater: (question: AnalysisPlanResearchQuestion) => void) => void;
}) {
  const question = plan.researchQuestions.find((item) => item.id === selectedQuestionId)
    ?? plan.researchQuestions[0];
  if (!question) {
    return (
      <div className={styles.emptyPanel}>
        <AppIcon name="alert" />
        <h2>No research question in this release</h2>
        <p>Return to Study Design, add the research questions, and freeze a new release.</p>
      </div>
    );
  }
  const names = plan.variables.map((variable) => variable.name);

  function toggleVariable(
    key: "outcomeVariables" | "predictorVariables" | "covariateVariables",
    name: string,
  ) {
    onUpdateQuestion((draft) => {
      draft[key] = draft[key].includes(name)
        ? draft[key].filter((item) => item !== name)
        : [...draft[key], name];
    });
  }

  return (
    <div className={styles.questionEditor}>
      <div className={styles.questionHeading}>
        <div>
          {plan.researchQuestions.length > 1 ? (
            <label className={styles.questionSelect}>
              <span>Research question</span>
              <select
                onChange={(event) => onSelectQuestion(event.target.value)}
                value={question.id}
              >
                {plan.researchQuestions.map((item, index) => (
                  <option key={item.id} value={item.id}>RQ{index + 1} · {item.question}</option>
                ))}
              </select>
            </label>
          ) : <span className={styles.rqLabel}>RQ1</span>}
          <h1>{question.question}</h1>
        </div>
        <fieldset className={styles.designationControl}>
          <legend>Analysis designation</legend>
          <div>
            {DESIGNATIONS.map((option) => (
              <label
                className={question.designation === option.value ? styles.designationSelected : ""}
                key={option.value}
              >
                <input
                  checked={question.designation === option.value}
                  name={`designation-${question.id}`}
                  onChange={() => onUpdateQuestion((draft) => {
                    draft.designation = option.value;
                  })}
                  type="radio"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <section className={styles.editorSection}>
        <header>
          <h2>Estimand</h2>
          <p>Define the target of inference without changing the frozen research question.</p>
        </header>
        <div className={styles.estimandGrid}>
          {ESTIMAND_FIELDS.map((field) => (
            <label key={field.key}>
              <span>{field.label}</span>
              <input
                maxLength={MAX_ANALYSIS_TEXT_LENGTH}
                onChange={(event) => onUpdateQuestion((draft) => {
                  draft.estimand[field.key] = event.target.value;
                })}
                placeholder={field.placeholder}
                value={question.estimand[field.key]}
              />
            </label>
          ))}
        </div>
      </section>

      <section className={styles.editorSection}>
        <header>
          <h2>Variable mapping</h2>
          <p>Only variables frozen in this release can be mapped.</p>
        </header>
        <QuestionVariableMapping
          label="Outcome variables"
          names={names}
          onToggle={(name) => toggleVariable("outcomeVariables", name)}
          selected={question.outcomeVariables}
        />
        <QuestionVariableMapping
          label="Predictor variables"
          names={names}
          onToggle={(name) => toggleVariable("predictorVariables", name)}
          selected={question.predictorVariables}
        />
        <QuestionVariableMapping
          label="Covariates"
          names={names}
          onToggle={(name) => toggleVariable("covariateVariables", name)}
          selected={question.covariateVariables}
        />
      </section>

      <section className={styles.editorSection}>
        <header>
          <h2>Method and effect</h2>
          <p>Record the intended analysis; Cerise does not select a method automatically.</p>
        </header>
        <div className={styles.twoColumnFields}>
          <label>
            <span>Planned analysis method</span>
            <input
              maxLength={MAX_ANALYSIS_TEXT_LENGTH}
              onChange={(event) => onUpdateQuestion((draft) => {
                draft.plannedMethod = event.target.value;
              })}
              placeholder="e.g., linear regression with prespecified covariates"
              value={question.plannedMethod}
            />
          </label>
          <label>
            <span>Effect-size measure</span>
            <input
              maxLength={MAX_ANALYSIS_TEXT_LENGTH}
              onChange={(event) => onUpdateQuestion((draft) => {
                draft.effectSize = event.target.value;
              })}
              placeholder="e.g., standardized mean difference"
              value={question.effectSize}
            />
          </label>
        </div>
        <label className={styles.inlineTextArea}>
          <span>Unit of analysis</span>
          <select
            onChange={(event) => onUpdateQuestion((draft) => {
              draft.unitOfAnalysis = event.target.value as AnalysisUnit;
            })}
            value={question.unitOfAnalysis}
          >
            {ANALYSIS_UNITS.map((unit) => (
              <option key={unit.value} value={unit.value}>{unit.label}</option>
            ))}
          </select>
        </label>
        <label className={styles.inlineTextArea}>
          <span>Missing-data strategy</span>
          <textarea
            maxLength={MAX_ANALYSIS_TEXT_LENGTH}
            onChange={(event) => onUpdateQuestion((draft) => {
              draft.missingDataStrategy = event.target.value;
            })}
            placeholder="How will missingness be described, handled, and tested?"
            rows={2}
            value={question.missingDataStrategy}
          />
        </label>
        <RuleField
          label="Exclusion rules"
          onChange={(rules) => onUpdateQuestion((draft) => { draft.exclusionRules = rules; })}
          placeholder="One prespecified rule per line"
          value={question.exclusionRules}
        />
        <RuleField
          label="Transformations"
          onChange={(rules) => onUpdateQuestion((draft) => { draft.transformations = rules; })}
          placeholder="One planned transformation per line"
          value={question.transformations}
        />
        <label className={styles.inlineTextArea}>
          <span>Multiplicity</span>
          <textarea
            maxLength={MAX_ANALYSIS_TEXT_LENGTH}
            onChange={(event) => onUpdateQuestion((draft) => {
              draft.multiplicityStrategy = event.target.value;
            })}
            placeholder="State the adjustment or explicitly justify no adjustment."
            rows={2}
            value={question.multiplicityStrategy}
          />
        </label>
        <RuleField
          label="Sensitivity analyses"
          onChange={(rules) => onUpdateQuestion((draft) => { draft.sensitivityAnalyses = rules; })}
          placeholder="One planned robustness or sensitivity analysis per line"
          value={question.sensitivityAnalyses}
        />
      </section>
    </div>
  );
}

function ReleasePanel({
  release,
  plan,
}: {
  release: ExperimentRelease;
  plan: AnalysisPlanDocument;
}) {
  const contract = release.manifest.analysisContract;
  return (
    <div className={styles.detailPage}>
      <header>
        <span>Immutable provenance</span>
        <h1>Release & contract</h1>
        <p>The plan is editable. The release and its frozen analysis contract are not.</p>
      </header>
      <dl className={styles.provenanceList}>
        <div><dt>Release</dt><dd>v{release.releaseNumber}</dd></div>
        <div><dt>Release ID</dt><dd>{release.releaseId}</dd></div>
        <div><dt>Release checksum</dt><dd><code>{release.checksum}</code></dd></div>
        <div><dt>Contract schema</dt><dd>v{plan.contractSchemaVersion}</dd></div>
        <div><dt>Contract checksum</dt><dd><code>{plan.contractChecksum}</code></dd></div>
        <div><dt>Contract frozen</dt><dd>{new Date(plan.contractFrozenAt).toLocaleString()}</dd></div>
        <div><dt>Timing claim</dt><dd>{release.manifest.timingClaim}</dd></div>
        <div><dt>Participant-data boundary</dt><dd>{release.manifest.participantDataBoundary}</dd></div>
      </dl>
      <div className={styles.sourceNote}>
        <AppIcon name="lock" />
        <div>
          <strong>Frozen scientific source</strong>
          <p>
            This editor copies planning fields into a separate local draft. It cannot rewrite
            the release, contract, research-question wording, or frozen variable definitions.
          </p>
        </div>
      </div>
      {contract ? (
        <section className={styles.contractSnapshot}>
          <h2>Design snapshot</h2>
          <dl>
            <div><dt>Design</dt><dd>{contract.design.kind || "Not specified"}</dd></div>
            <div><dt>Setting</dt><dd>{contract.design.setting || "Not specified"}</dd></div>
            <div><dt>Target population</dt><dd>{contract.design.targetPopulation || "Not specified"}</dd></div>
            <div><dt>Planned sample</dt><dd>{contract.design.plannedSampleSize || "Not specified"}</dd></div>
          </dl>
        </section>
      ) : null}
    </div>
  );
}

function VariablesPanel({
  plan,
  onUpdate,
}: {
  plan: AnalysisPlanDocument;
  onUpdate: (updater: (draft: AnalysisPlanDocument) => void) => void;
}) {
  function toggleRole(variableName: string, role: AnalysisVariableRole) {
    onUpdate((draft) => {
      const variable = draft.variables.find((item) => item.name === variableName);
      if (!variable) return;
      const current: AnalysisVariableRole[] = variable.roles.filter(
        (item): item is Exclude<AnalysisVariableRole, "unassigned"> => item !== "unassigned",
      );
      variable.roles = current.includes(role)
        ? current.filter((item) => item !== role)
        : [...current, role];
      if (variable.roles.length === 0) variable.roles = ["unassigned"];
    });
  }

  return (
    <div className={styles.detailPage}>
      <header>
        <span>Frozen data dictionary</span>
        <h1>Variable roles</h1>
        <p>Classify every collected variable without changing its frozen name or response type.</p>
      </header>
      <div className={styles.variableTableWrap}>
        <table className={styles.variableTable}>
          <thead>
            <tr>
              <th>Variable</th>
              <th>Source</th>
              <th>Response</th>
              <th>Analysis roles</th>
            </tr>
          </thead>
          <tbody>
            {plan.variables.map((variable) => (
              <tr key={variable.name}>
                <td>
                  <strong>{variable.name}</strong>
                  <span>{variable.required ? "Required response" : "Optional response"}</span>
                </td>
                <td>{variable.blockTitle}</td>
                <td>{variable.responseType}</td>
                <td>
                  <div className={styles.roleChoices}>
                    {VARIABLE_ROLES.map((role) => (
                      <label key={role.value}>
                        <input
                          checked={variable.roles.includes(role.value)}
                          onChange={() => toggleRole(variable.name, role.value)}
                          type="checkbox"
                        />
                        <span>{role.label}</span>
                      </label>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GlobalPlanPanel({
  plan,
  onUpdate,
}: {
  plan: AnalysisPlanDocument;
  onUpdate: (updater: (draft: AnalysisPlanDocument) => void) => void;
}) {
  return (
    <div className={styles.detailPage}>
      <header>
        <span>Study-wide decisions</span>
        <h1>Global analysis decisions</h1>
        <p>Record rules that apply across research questions. Question-specific decisions remain in each RQ.</p>
      </header>
      <div className={styles.globalForm}>
        <label>
          <span>Default unit of analysis</span>
          <select
            onChange={(event) => onUpdate((draft) => {
              draft.globalPlan.unitOfAnalysis = event.target.value as AnalysisUnit;
            })}
            value={plan.globalPlan.unitOfAnalysis}
          >
            {ANALYSIS_UNITS.map((unit) => (
              <option key={unit.value} value={unit.value}>{unit.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Study-wide missing-data strategy</span>
          <textarea
            maxLength={MAX_ANALYSIS_TEXT_LENGTH}
            onChange={(event) => onUpdate((draft) => {
              draft.globalPlan.missingDataStrategy = event.target.value;
            })}
            placeholder="Describe the common missingness assessment and handling rules."
            rows={4}
            value={plan.globalPlan.missingDataStrategy}
          />
        </label>
        <RuleField
          label="Study-wide exclusion rules"
          onChange={(rules) => onUpdate((draft) => { draft.globalPlan.exclusionRules = rules; })}
          placeholder="One rule per line"
          value={plan.globalPlan.exclusionRules}
        />
        <RuleField
          label="Study-wide transformations"
          onChange={(rules) => onUpdate((draft) => { draft.globalPlan.transformations = rules; })}
          placeholder="One transformation per line"
          value={plan.globalPlan.transformations}
        />
        <label>
          <span>Study-wide multiplicity strategy</span>
          <textarea
            maxLength={MAX_ANALYSIS_TEXT_LENGTH}
            onChange={(event) => onUpdate((draft) => {
              draft.globalPlan.multiplicityStrategy = event.target.value;
            })}
            placeholder="Describe the family of tests and planned error-rate control."
            rows={4}
            value={plan.globalPlan.multiplicityStrategy}
          />
        </label>
        <RuleField
          label="Study-wide sensitivity analyses"
          onChange={(rules) => onUpdate((draft) => { draft.globalPlan.sensitivityAnalyses = rules; })}
          placeholder="One planned sensitivity analysis per line"
          value={plan.globalPlan.sensitivityAnalyses}
        />
      </div>
    </div>
  );
}

function ReadinessPanel({
  plan,
  onOpenQuestion,
  onOpenVariables,
}: {
  plan: AnalysisPlanDocument;
  onOpenQuestion: (id: string) => void;
  onOpenVariables: () => void;
}) {
  return (
    <div className={styles.detailPage}>
      <header>
        <span>Decision review</span>
        <h1>Analysis-plan readiness</h1>
        <p>
          Readiness means the required planning fields are recorded. It is not preregistration,
          peer review, or proof that the method is valid.
        </p>
      </header>
      {plan.readiness.issues.length === 0 ? (
        <div className={styles.readyState}>
          <AppIcon name="shield" />
          <div>
            <h2>Planning fields complete</h2>
            <p>Export this draft for review before Phase 8.2 data intake.</p>
          </div>
        </div>
      ) : (
        <ul className={styles.issueList}>
          {plan.readiness.issues.map((issue) => (
            <li key={issue.id}>
              <AppIcon name="alert" />
              <div>
                <strong>
                  {issue.researchQuestionId
                    ? `Research question · ${issue.researchQuestionId}`
                    : issue.variableName
                      ? `Variable · ${issue.variableName}`
                      : "Plan"}
                </strong>
                <p>{issue.message}</p>
              </div>
              {issue.researchQuestionId ? (
                <button onClick={() => onOpenQuestion(issue.researchQuestionId!)} type="button">
                  Review RQ
                </button>
              ) : issue.variableName ? (
                <button onClick={onOpenVariables} type="button">Review variables</button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReadinessInspector({
  plan,
  selectedQuestion,
  onChangeDataAccess,
}: {
  plan: AnalysisPlanDocument;
  selectedQuestion: AnalysisPlanResearchQuestion | null;
  onChangeDataAccess: (value: AnalysisPlanDocument["dataAccessDeclaration"]) => void;
}) {
  const questionChecks = selectedQuestion ? [
    { label: "Designation recorded", complete: selectedQuestion.designation !== "unspecified" },
    { label: "Population defined", complete: Boolean(selectedQuestion.estimand.population.trim()) },
    { label: "Estimand outcome defined", complete: Boolean(selectedQuestion.estimand.outcome.trim()) },
    { label: "Outcome mapped", complete: selectedQuestion.outcomeVariables.length > 0 },
    { label: "Method recorded", complete: Boolean(selectedQuestion.plannedMethod.trim()) },
    { label: "Unit recorded", complete: selectedQuestion.unitOfAnalysis !== "unspecified" },
    { label: "Missingness recorded", complete: Boolean(selectedQuestion.missingDataStrategy.trim()) },
    { label: "Multiplicity recorded", complete: Boolean(selectedQuestion.multiplicityStrategy.trim()) },
  ] : [];
  const completed = questionChecks.filter((item) => item.complete).length;
  const total = questionChecks.length;

  return (
    <aside className={styles.readinessInspector}>
      <header>
        <h2>Readiness</h2>
        <p>{completed} of {total} RQ decisions</p>
        <div className={styles.progressTrack}>
          <span style={{ width: `${total > 0 ? Math.round((completed / total) * 100) : 0}%` }} />
        </div>
      </header>
      <ul className={styles.checkList}>
        {questionChecks.map((item) => (
          <li className={item.complete ? styles.checkComplete : styles.checkWarning} key={item.label}>
            <AppIcon name={item.complete ? "check-square" : "alert"} />
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
      <div className={styles.inspectorNote}>
        <AppIcon name="help" />
        <p>This draft does not change the frozen release.</p>
      </div>
      <fieldset className={styles.dataAccess}>
        <legend>Data access</legend>
        <p>Make an explicit, honest declaration. Cerise does not infer this status.</p>
        <label>
          <input
            checked={plan.dataAccessDeclaration === "not-accessed"}
            onChange={() => onChangeDataAccess("not-accessed")}
            type="radio"
          />
          <span>Not accessed</span>
        </label>
        <label>
          <input
            checked={plan.dataAccessDeclaration === "accessed-before-planning"}
            onChange={() => onChangeDataAccess("accessed-before-planning")}
            type="radio"
          />
          <span>Accessed before planning</span>
        </label>
        {plan.dataAccessDeclaration === "not-declared" ? (
          <small>Declaration required before readiness.</small>
        ) : null}
      </fieldset>
      <div className={styles.overallStatus}>
        <span>Overall plan</span>
        <strong>
          {plan.readiness.completedDecisions} / {plan.readiness.totalDecisions} decisions
        </strong>
      </div>
    </aside>
  );
}

export default function AnalysisPlanEditor({
  projectId,
  projectName,
}: AnalysisPlanEditorProps) {
  const [releases, setReleases] = useState<ExperimentRelease[]>([]);
  const [selectedReleaseId, setSelectedReleaseId] = useState("");
  const [plan, setPlan] = useState<AnalysisPlanDocument | null>(null);
  const [selectedSection, setSelectedSection] = useState<AnalysisPlanSection>("questions");
  const [selectedQuestionId, setSelectedQuestionId] = useState("");
  const [loadState, setLoadState] = useState<"loading" | "ready" | "empty">("loading");
  const [saveState, setSaveState] = useState("Loading plan…");
  const saveTimer = useRef<number | null>(null);

  const selectedRelease = useMemo(
    () => releases.find((release) => release.releaseId === selectedReleaseId) ?? releases[0] ?? null,
    [releases, selectedReleaseId],
  );
  const selectedQuestion = useMemo(
    () => plan?.researchQuestions.find((question) => question.id === selectedQuestionId)
      ?? plan?.researchQuestions[0]
      ?? null,
    [plan, selectedQuestionId],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const localCandidates = readLocalExperimentReleases(window.localStorage, projectId);
      const local = (await verifiedExperimentReleases(localCandidates, projectId))
        .filter(releaseSupportsAnalysisPlan);
      if (cancelled) return;
      setReleases(local);
      setSelectedReleaseId(local[0]?.releaseId ?? "");
      setLoadState(local.length > 0 ? "ready" : "empty");
      try {
        const cloud = await fetchExperimentReleases(projectId);
        if (cancelled) return;
        const merged = mergeReleases(cloud, local);
        setReleases(merged);
        setSelectedReleaseId((current) => (
          merged.some((release) => release.releaseId === current)
            ? current
            : merged[0]?.releaseId ?? ""
        ));
        setLoadState(merged.length > 0 ? "ready" : "empty");
      } catch {
        if (!cancelled) setLoadState(local.length > 0 ? "ready" : "empty");
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  useEffect(() => {
    if (!selectedRelease) return;
    const release = selectedRelease;
    const hydrateTimer = window.setTimeout(() => {
      const stored = readAnalysisPlanDocument(window.localStorage, release);
      const next = stored ?? createAnalysisPlanDocument(release);
      setPlan(next);
      setSelectedQuestionId(next?.researchQuestions[0]?.id ?? "");
      setSaveState(stored ? "Saved on this device" : "New local draft");
    }, 0);
    return () => window.clearTimeout(hydrateTimer);
  }, [selectedRelease]);

  useEffect(() => {
    if (!plan || !selectedRelease || plan.releaseId !== selectedRelease.releaseId) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      try {
        writeAnalysisPlanDocument(window.localStorage, selectedRelease, plan);
        setSaveState("Saved on this device");
      } catch {
        setSaveState("Draft could not be saved");
      }
    }, 350);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [plan, selectedRelease]);

  const updatePlan = useCallback((updater: (draft: AnalysisPlanDocument) => void) => {
    setSaveState("Saving…");
    setPlan((current) => {
      if (!current) return current;
      const draft = structuredClone(current);
      updater(draft);
      draft.updatedAt = new Date().toISOString();
      draft.readiness = collectAnalysisPlanReadiness(draft);
      return draft;
    });
  }, []);

  const updateQuestion = useCallback(
    (updater: (question: AnalysisPlanResearchQuestion) => void) => {
      updatePlan((draft) => {
        const question = draft.researchQuestions.find((item) => item.id === selectedQuestionId)
          ?? draft.researchQuestions[0];
        if (question) updater(question);
      });
    },
    [selectedQuestionId, updatePlan],
  );

  function exportPlan() {
    if (!plan || !selectedRelease) return;
    const exportDocument = {
      exportType: "cerise-analysis-plan-draft",
      exportedAt: new Date().toISOString(),
      warning: "Editable local draft; not a preregistration or immutable release.",
      source: {
        releaseId: selectedRelease.releaseId,
        releaseChecksum: selectedRelease.checksum,
        contractChecksum: plan.contractChecksum,
      },
      plan,
    };
    downloadJson(
      `${safeExportName(projectName)}-analysis-plan-v${selectedRelease.releaseNumber}.json`,
      exportDocument,
    );
  }

  function openQuestion(id: string) {
    setSelectedQuestionId(id);
    setSelectedSection("questions");
  }

  if (
    loadState === "loading"
    || (selectedRelease && plan?.releaseId !== selectedRelease.releaseId)
  ) {
    return (
      <main className={styles.loadingScreen} role="status">
        <span />
        Verifying frozen releases…
      </main>
    );
  }

  if (loadState === "empty" || !selectedRelease || !plan) {
    return (
      <main className={styles.emptyScreen}>
        <div>
          <AppIcon name="lock" />
          <h1>No analysis-ready release yet</h1>
          <p>
            Phase 8.1 starts from a verified format-v5 release. Open Experimental Studio,
            complete Release checks, and freeze a new release first.
          </p>
          <div>
            <Link href={`/dashboard/project/${projectId}`}>
              <AppIcon name="arrow-left" />
              Research Path
            </Link>
            <Link className={styles.emptyPrimary} href={`/experimental-studio/${projectId}`}>
              Open Experimental Studio
              <AppIcon name="arrow-right" />
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className={styles.analysisApp}>
      <header className={styles.topBar}>
        <Link className={styles.brand} href="/projects">Cerise Scholar</Link>
        <Link className={styles.returnLink} href={`/dashboard/project/${projectId}`}>
          <AppIcon name="arrow-left" />
          Research Path
        </Link>
        <strong className={styles.projectTitle}>{projectName}</strong>
        <div className={styles.topActions}>
          <span aria-live="polite">
            <AppIcon name="save" />
            {saveState}
          </span>
          <button onClick={exportPlan} type="button">Export plan</button>
          <button
            className={styles.reviewButton}
            onClick={() => setSelectedSection("readiness")}
            type="button"
          >
            Review readiness
          </button>
        </div>
      </header>

      <div className={styles.contextBar}>
        <div>
          <strong>Analysis Plan</strong>
          <span>Editable planning layer</span>
        </div>
        <div className={styles.releaseContext}>
          {releases.length > 1 ? (
            <label>
              <span className={styles.visuallyHidden}>Select frozen release</span>
              <select
                onChange={(event) => setSelectedReleaseId(event.target.value)}
                value={selectedRelease.releaseId}
              >
                {releases.map((release) => (
                  <option key={release.releaseId} value={release.releaseId}>
                    Release v{release.releaseNumber}
                  </option>
                ))}
              </select>
            </label>
          ) : <span>Release v{selectedRelease.releaseNumber}</span>}
          <AppIcon name="lock" />
          <code>{shortChecksum(selectedRelease.checksum)}</code>
        </div>
      </div>

      <div className={styles.workspace}>
        <aside className={styles.sectionRail}>
          <span className={styles.railLabel}>Plan sections</span>
          <nav aria-label="Analysis plan sections">
            {SECTIONS.map((section) => (
              <button
                aria-current={selectedSection === section.id ? "page" : undefined}
                className={selectedSection === section.id ? styles.sectionSelected : ""}
                key={section.id}
                onClick={() => setSelectedSection(section.id)}
                type="button"
              >
                <AppIcon name={section.icon} />
                <span>{section.label}</span>
              </button>
            ))}
          </nav>
          <div className={styles.frozenSource}>
            <strong>
              <AppIcon name="lock" />
              Frozen source
            </strong>
            <span>Release v{selectedRelease.releaseNumber}</span>
            <span>Contract v{plan.contractSchemaVersion}</span>
            <span>No participant data</span>
          </div>
        </aside>

        <main className={styles.editorCanvas}>
          {selectedSection === "questions" ? (
            <QuestionEditor
              onSelectQuestion={setSelectedQuestionId}
              onUpdateQuestion={updateQuestion}
              plan={plan}
              selectedQuestionId={selectedQuestionId}
            />
          ) : null}
          {selectedSection === "release" ? <ReleasePanel plan={plan} release={selectedRelease} /> : null}
          {selectedSection === "variables" ? <VariablesPanel onUpdate={updatePlan} plan={plan} /> : null}
          {selectedSection === "global" ? <GlobalPlanPanel onUpdate={updatePlan} plan={plan} /> : null}
          {selectedSection === "readiness" ? (
            <ReadinessPanel
              onOpenQuestion={openQuestion}
              onOpenVariables={() => setSelectedSection("variables")}
              plan={plan}
            />
          ) : null}
        </main>

        <ReadinessInspector
          onChangeDataAccess={(value) => updatePlan((draft) => {
            draft.dataAccessDeclaration = value;
          })}
          plan={plan}
          selectedQuestion={selectedQuestion}
        />
      </div>
    </div>
  );
}
