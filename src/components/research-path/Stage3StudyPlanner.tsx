"use client";

import { useMemo, useState } from "react";
import type { ResearchPathStep } from "@/lib/research/researchPathConfig";
import type { ResearchPathDraft } from "@/lib/research/researchPathDraft";
import type { ProposalHandoffPackage, ProposalHandoffTarget } from "@/lib/research/proposalHandoffPhase7";
import type { ReviewedProposalBaselinePackage } from "@/lib/research/proposalReviewPhase9";
import {
  STUDY_DESIGN_OPTIONS,
  collectPathwayResearchQuestions,
  estimateTwoGroupSampleSize,
  getRecommendedDesigns,
  updateStudySpecification,
  validateStudyStep,
  type ConstructRole,
  type HybridStudySetting,
  type ParticipantPlan,
  type ResearchQuestionPlan,
  type StudyDesignDecision,
  type StudyDesignDocument,
  type StudyDesignGoal,
  type StudySetting,
  type StudyValidationIssue,
} from "@/lib/research/studyDesign";
import styles from "./ResearchPathWorkspace.module.css";

interface Stage3StudyPlannerProps {
  pathwayDraft: ResearchPathDraft;
  proposalHandoff: ProposalHandoffPackage | null;
  proposalHandoffCurrent: boolean;
  reviewedProposalBaseline: ReviewedProposalBaselinePackage | null;
  reviewedProposalBaselineCurrent: boolean;
  step: ResearchPathStep;
  studyDesign: StudyDesignDocument;
  updateStudyDesign: (updater: (current: StudyDesignDocument) => StudyDesignDocument) => void;
}

const DESIGN_GOALS: ReadonlyArray<{ value: Exclude<StudyDesignGoal, "">; label: string }> = [
  { value: "test-causal-effect", label: "Test a causal effect" },
  { value: "compare-groups", label: "Compare groups or conditions" },
  { value: "describe-pattern", label: "Describe a pattern or association" },
  { value: "track-change", label: "Track change over time" },
  { value: "explore-experience", label: "Explore experiences or mechanisms" },
];

const STUDY_SETTINGS: ReadonlyArray<{ value: Exclude<StudySetting, "">; label: string }> = [
  { value: "online", label: "Online" },
  { value: "laboratory", label: "Laboratory" },
  { value: "field", label: "Field or real-world setting" },
  { value: "hybrid", label: "Hybrid" },
];

const HYBRID_SETTINGS: ReadonlyArray<{ value: HybridStudySetting; label: string }> = [
  { value: "online", label: "Online / participant home" },
  { value: "laboratory", label: "Research laboratory" },
  { value: "field", label: "Field / real-world setting" },
];

const CONSTRUCT_ROLES: ReadonlyArray<{ value: Exclude<ConstructRole, "">; label: string }> = [
  { value: "predictor", label: "Predictor / independent variable" },
  { value: "outcome", label: "Outcome / dependent variable" },
  { value: "mediator", label: "Mediator" },
  { value: "moderator", label: "Moderator" },
  { value: "qualitative-concept", label: "Qualitative concept" },
];

function ValidationSummary({ issues }: { issues: StudyValidationIssue[] }) {
  const required = issues.filter((issue) => issue.severity === "required");
  const warnings = issues.filter((issue) => issue.severity === "warning");

  if (issues.length === 0) {
    return (
      <div className={styles.studyReadyNotice} role="status">
        <span aria-hidden="true">✓</span>
        This step is ready to complete.
      </div>
    );
  }

  return (
    <aside className={styles.studyValidation} aria-label="Step validation">
      <div>
        <strong>{required.length} required</strong>
        <span>{warnings.length} recommendation{warnings.length === 1 ? "" : "s"}</span>
      </div>
      <ul>
        {issues.slice(0, 4).map((issue) => (
          <li className={issue.severity === "required" ? styles.validationRequired : styles.validationWarning} key={issue.id}>
            {issue.message}
          </li>
        ))}
      </ul>
    </aside>
  );
}

function InheritedContext({ pathwayDraft, proposalHandoff, proposalHandoffCurrent, reviewedProposalBaseline, reviewedProposalBaselineCurrent, target }: { pathwayDraft: ResearchPathDraft; proposalHandoff: ProposalHandoffPackage | null; proposalHandoffCurrent: boolean; reviewedProposalBaseline: ReviewedProposalBaselinePackage | null; reviewedProposalBaselineCurrent: boolean; target: ProposalHandoffTarget }) {
  const draftQuestions = collectPathwayResearchQuestions(pathwayDraft).filter(Boolean);
  const questions = proposalHandoff?.questionHandoffs.map((question) => question.questionText) ?? draftQuestions;
  const responsibilities = proposalHandoff?.responsibilities.filter((item) => item.disposition === "carry-to-stage3" && item.stage3Target === target) ?? [];
  return (
    <section className={`${styles.studyContext} ${proposalHandoffCurrent && reviewedProposalBaselineCurrent ? styles.studyHandoffCurrent : styles.studyHandoffMissing}`}>
      <div>
        <span>{proposalHandoffCurrent && reviewedProposalBaselineCurrent ? "Current verified Stage 2 handoff · researcher-reviewed baseline" : proposalHandoffCurrent ? "Researcher review required" : proposalHandoff ? "Stale Stage 2 handoff" : "Stage 2 handoff required"}</span>
        <strong>{reviewedProposalBaseline ? `Proposal r${reviewedProposalBaseline.proposalRevision} · review baseline r${reviewedProposalBaseline.revision}` : proposalHandoff ? `Technical handoff r${proposalHandoff.revision}` : "Draft context only"}</strong>
        {reviewedProposalBaseline ? <small title={reviewedProposalBaseline.identity.checksum}>{reviewedProposalBaseline.identity.checksum.slice(0, 24)}…{reviewedProposalBaselineCurrent ? "" : " · review reconciliation required"}</small> : proposalHandoff ? <small title={proposalHandoff.identity.checksum}>{proposalHandoff.identity.checksum.slice(0, 24)}… · complete researcher review</small> : <small>Freeze and review the current proposal baseline before completing this step.</small>}
      </div>
      {questions.length > 0 ? (
        <ol>
          {questions.map((question, index) => (
            <li key={`${question}-${index}`}>
              <span>RQ{index + 1}</span>
              {question}
            </li>
          ))}
        </ol>
      ) : (
        <p>Return to Stage 1 → Formulate Research Questions to create the traceable starting point for this study.</p>
      )}
      {responsibilities.length ? <div className={styles.studyHandoffResponsibilities}><strong>{responsibilities.length} responsibility item{responsibilities.length === 1 ? "" : "s"} assigned here</strong>{responsibilities.map((item) => <p key={item.id}>{item.sourceText}</p>)}</div> : null}
    </section>
  );
}

function LegacyNotes({ note }: { note?: string }) {
  if (!note) return null;
  return (
    <details className={styles.legacyStudyNotes}>
      <summary>Imported notes from the previous Stage 3 form</summary>
      <p>{note}</p>
    </details>
  );
}

function StudyDesignCanvas({
  pathwayDraft,
  proposalHandoff,
  proposalHandoffCurrent,
  reviewedProposalBaseline,
  reviewedProposalBaselineCurrent,
  studyDesign,
  updateStudyDesign,
}: Omit<Stage3StudyPlannerProps, "step">) {
  const [showAllDesigns, setShowAllDesigns] = useState(false);
  const decision = studyDesign.spec.design;
  const recommendedIds = getRecommendedDesigns(decision.goal);
  const visibleOptions = showAllDesigns
    ? STUDY_DESIGN_OPTIONS
    : recommendedIds
        .map((id) => STUDY_DESIGN_OPTIONS.find((option) => option.id === id))
        .filter((option): option is (typeof STUDY_DESIGN_OPTIONS)[number] => Boolean(option));
  const issues = validateStudyStep(studyDesign.spec, "stage-03-step-01");

  const updateDecision = <Key extends keyof StudyDesignDecision>(key: Key, value: StudyDesignDecision[Key]) => {
    updateStudyDesign((current) => updateStudySpecification(current, (spec) => ({
      ...spec,
      design: {
        ...spec.design,
        [key]: value,
        ...(key === "goal" || key === "setting" || key === "hybridSettings" || key === "selectedDesign" || key === "selectionRationale" ? { approved: false } : null),
      },
    })));
  };

  const toggleHybridSetting = (setting: HybridStudySetting) => {
    const selected = decision.hybridSettings.includes(setting);
    updateDecision(
      "hybridSettings",
      selected
        ? decision.hybridSettings.filter((item) => item !== setting)
        : [...decision.hybridSettings, setting],
    );
  };

  return (
    <div className={styles.studyPlanningCanvas}>
      <InheritedContext pathwayDraft={pathwayDraft} proposalHandoff={proposalHandoff} proposalHandoffCurrent={proposalHandoffCurrent} reviewedProposalBaseline={reviewedProposalBaseline} reviewedProposalBaselineCurrent={reviewedProposalBaselineCurrent} target="select-design" />
      <div className={styles.studyPlanningBody}>
        <section className={styles.studySection}>
          <div className={styles.studySectionHeading}>
            <div>
              <span>1 · Study intent</span>
              <h2>What must this study establish?</h2>
            </div>
            <p>These decisions narrow the designs shown below. They do not make the final choice for you.</p>
          </div>
          <div className={styles.studyFieldGrid}>
            <label>
              <span>Primary goal</span>
              <select value={decision.goal} onChange={(event) => updateDecision("goal", event.target.value as StudyDesignGoal)}>
                <option value="">Select the evidence needed</option>
                {DESIGN_GOALS.map((goal) => <option key={goal.value} value={goal.value}>{goal.label}</option>)}
              </select>
            </label>
            <label>
              <span>Study setting</span>
              <select value={decision.setting} onChange={(event) => {
                const setting = event.target.value as StudySetting;
                updateDecision("setting", setting);
                if (setting !== "hybrid") updateDecision("hybridSettings", []);
              }}>
                <option value="">Select a setting</option>
                {STUDY_SETTINGS.map((setting) => <option key={setting.value} value={setting.value}>{setting.label}</option>)}
              </select>
            </label>
            {decision.setting === "hybrid" ? (
              <fieldset className={styles.hybridSettingPicker}>
                <legend>Which settings are part of this hybrid study?</legend>
                <p>Select at least two. Step 04 will create a shared core and named setting-specific branches.</p>
                {HYBRID_SETTINGS.map((setting) => (
                  <label key={setting.value}>
                    <input
                      checked={decision.hybridSettings.includes(setting.value)}
                      onChange={() => toggleHybridSetting(setting.value)}
                      type="checkbox"
                    />
                    <span>{setting.label}</span>
                  </label>
                ))}
              </fieldset>
            ) : null}
            <label>
              <span>Practical or ethical constraints</span>
              <textarea rows={4} value={decision.constraints} onChange={(event) => updateDecision("constraints", event.target.value)} placeholder="Time, access, recruitment, manipulation, risk, or approval constraints…" />
            </label>
            <label>
              <span>Available devices and environment</span>
              <textarea rows={4} value={decision.availableDevices} onChange={(event) => updateDecision("availableDevices", event.target.value)} placeholder="Laptop, phone, lab computer, audio, keyboard, quiet room…" />
            </label>
          </div>
        </section>

        <section className={styles.studySection}>
          <div className={styles.studySectionHeading}>
            <div>
              <span>2 · Compare options</span>
              <h2>Designs worth considering</h2>
            </div>
            <button className={styles.textButton} onClick={() => setShowAllDesigns((current) => !current)} type="button">
              {showAllDesigns ? "Show recommended" : "View all designs"}
            </button>
          </div>
          <div className={styles.designOptionGrid}>
            {visibleOptions.map((option) => {
              const selected = decision.selectedDesign === option.id;
              return (
                <button
                  aria-pressed={selected}
                  className={selected ? styles.designOptionSelected : styles.designOption}
                  key={option.id}
                  onClick={() => updateDecision("selectedDesign", option.id)}
                  type="button"
                >
                  <span>{selected ? "Selected" : "Consider"}</span>
                  <strong>{option.title}</strong>
                  <p>{option.summary}</p>
                  <small><b>Best for:</b> {option.bestFor}</small>
                </button>
              );
            })}
          </div>
        </section>

        <section className={styles.studySection}>
          <div className={styles.studySectionHeading}>
            <div>
              <span>3 · Researcher decision</span>
              <h2>Justify and approve the design</h2>
            </div>
          </div>
          <label className={styles.studyWideField}>
            <span>Why can this design answer the research questions within the stated constraints?</span>
            <textarea rows={6} value={decision.selectionRationale} onChange={(event) => updateDecision("selectionRationale", event.target.value)} placeholder="Compare the chosen design with the alternatives, including what it can and cannot establish…" />
          </label>
          <label className={styles.studyApproval}>
            <input checked={decision.approved} onChange={(event) => updateDecision("approved", event.target.checked)} type="checkbox" />
            <span>
              <strong>Approve this design decision</strong>
              I reviewed its fit, limitations, feasibility, and relationship to the research questions.
            </span>
          </label>
          <LegacyNotes note={studyDesign.spec.legacyNotes["stage-03-step-01"]} />
        </section>
      </div>
      <ValidationSummary issues={issues} />
    </div>
  );
}

function MeasuresCanvas({
  pathwayDraft,
  proposalHandoff,
  proposalHandoffCurrent,
  reviewedProposalBaseline,
  reviewedProposalBaselineCurrent,
  studyDesign,
  updateStudyDesign,
}: Omit<Stage3StudyPlannerProps, "step">) {
  const [activeQuestion, setActiveQuestion] = useState(0);
  const inheritedQuestions = collectPathwayResearchQuestions(pathwayDraft);
  const current = studyDesign.spec.researchQuestions[activeQuestion];
  const issues = validateStudyStep(studyDesign.spec, "stage-03-step-02");

  const updateQuestion = <Key extends keyof ResearchQuestionPlan>(key: Key, value: ResearchQuestionPlan[Key]) => {
    updateStudyDesign((document) => updateStudySpecification(document, (spec) => ({
      ...spec,
      researchQuestions: spec.researchQuestions.map((question, index) => (
        index === activeQuestion ? { ...question, [key]: value } : question
      )),
    })));
  };

  const refreshQuestions = () => {
    updateStudyDesign((document) => updateStudySpecification(document, (spec) => ({
      ...spec,
      researchQuestions: spec.researchQuestions.map((question, index) => ({
        ...question,
        question: question.question.trim() || inheritedQuestions[index] || "",
      })),
    })));
  };

  return (
    <div className={styles.studyPlanningCanvas}>
      <InheritedContext pathwayDraft={pathwayDraft} proposalHandoff={proposalHandoff} proposalHandoffCurrent={proposalHandoffCurrent} reviewedProposalBaseline={reviewedProposalBaseline} reviewedProposalBaselineCurrent={reviewedProposalBaselineCurrent} target="map-measures" />
      <div className={styles.measureQuestionTabs} role="tablist" aria-label="Research question measurement plans">
        {studyDesign.spec.researchQuestions.map((question, index) => (
          <button aria-selected={index === activeQuestion} className={index === activeQuestion ? styles.measureQuestionActive : undefined} key={question.id} onClick={() => setActiveQuestion(index)} role="tab" type="button">
            <span>RQ{index + 1}</span>
            <small>{question.question || inheritedQuestions[index] || "Add research question"}</small>
          </button>
        ))}
        <button className={styles.refreshQuestionsButton} onClick={refreshQuestions} type="button">Import unanswered RQs</button>
      </div>

      <div className={styles.studyPlanningBody}>
        <section className={styles.studySection}>
          <div className={styles.studySectionHeading}>
            <div>
              <span>Traceability matrix · RQ{activeQuestion + 1}</span>
              <h2>From question to observable evidence</h2>
            </div>
            <p>A qualitative question may use a purpose statement and qualitative concept instead of a directional hypothesis.</p>
          </div>
          <label className={styles.studyWideField}>
            <span>Research question</span>
            <textarea rows={3} value={current.question} onChange={(event) => updateQuestion("question", event.target.value)} placeholder={`Define RQ${activeQuestion + 1}`} />
          </label>
          <div className={styles.studyFieldGrid}>
            <label>
              <span>Hypothesis or qualitative purpose</span>
              <textarea rows={5} value={current.hypothesis} onChange={(event) => updateQuestion("hypothesis", event.target.value)} placeholder="State the expected relationship, difference, change, or exploratory purpose…" />
            </label>
            <label>
              <span>Expected direction or pattern</span>
              <textarea rows={5} value={current.expectedDirection} onChange={(event) => updateQuestion("expectedDirection", event.target.value)} placeholder="Higher, lower, positive association, thematic pattern, or intentionally non-directional…" />
            </label>
            <label>
              <span>Construct or qualitative concept</span>
              <input value={current.construct} onChange={(event) => updateQuestion("construct", event.target.value)} placeholder="e.g., perceived stress" />
            </label>
            <label>
              <span>Role in the study</span>
              <select value={current.constructRole} onChange={(event) => updateQuestion("constructRole", event.target.value as ConstructRole)}>
                <option value="">Select a role</option>
                {CONSTRUCT_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
              </select>
            </label>
            <label>
              <span>Operational definition</span>
              <textarea rows={6} value={current.operationalDefinition} onChange={(event) => updateQuestion("operationalDefinition", event.target.value)} placeholder="Describe exactly how this concept will be recognized, manipulated, scored, or coded…" />
            </label>
            <label>
              <span>Measure, task, interview guide, or data source</span>
              <textarea rows={6} value={current.measure} onChange={(event) => updateQuestion("measure", event.target.value)} placeholder="Name the instrument or describe what must be developed…" />
            </label>
          </div>
          <label className={styles.studyWideField}>
            <span>Evidence for measurement quality and suitability</span>
            <textarea rows={4} value={current.evidenceNote} onChange={(event) => updateQuestion("evidenceNote", event.target.value)} placeholder="Citations, reliability or validity evidence, licensing, population fit, language, and limitations…" />
          </label>
          <LegacyNotes note={studyDesign.spec.legacyNotes["stage-03-step-02"]} />
        </section>

        <section className={styles.studySection}>
          <div className={styles.studySectionHeading}>
            <div>
              <span>Whole-study check</span>
              <h2>RQ-to-measure coverage</h2>
            </div>
          </div>
          <div className={styles.traceabilityTableWrap}>
            <table className={styles.traceabilityTable}>
              <thead><tr><th>RQ</th><th>Question</th><th>Construct</th><th>Operational definition</th><th>Measure</th></tr></thead>
              <tbody>
                {studyDesign.spec.researchQuestions.filter((question) => question.question.trim()).map((question) => (
                  <tr key={question.id}>
                    <th>{question.id.toUpperCase()}</th>
                    <td>{question.question}</td>
                    <td>{question.construct || "Missing"}</td>
                    <td>{question.operationalDefinition || "Missing"}</td>
                    <td>{question.measure || "Missing"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <ValidationSummary issues={issues} />
    </div>
  );
}

function ParticipantsCanvas({
  pathwayDraft,
  proposalHandoff,
  proposalHandoffCurrent,
  reviewedProposalBaseline,
  reviewedProposalBaselineCurrent,
  studyDesign,
  updateStudyDesign,
}: Omit<Stage3StudyPlannerProps, "step">) {
  const participants = studyDesign.spec.participants;
  const issues = validateStudyStep(studyDesign.spec, "stage-03-step-03");
  const estimate = useMemo(
    () => estimateTwoGroupSampleSize(Number(participants.expectedEffectSize), participants.alpha, participants.power),
    [participants.alpha, participants.expectedEffectSize, participants.power],
  );

  const updateParticipants = <Key extends keyof ParticipantPlan>(key: Key, value: ParticipantPlan[Key]) => {
    updateStudyDesign((document) => updateStudySpecification(document, (spec) => ({
      ...spec,
      participants: {
        ...spec.participants,
        [key]: value,
        ...(key !== "approved" ? { approved: false } : null),
      },
    })));
  };

  const useEstimate = () => {
    if (!estimate) return;
    updateStudyDesign((document) => updateStudySpecification(document, (spec) => ({
      ...spec,
      participants: {
        ...spec.participants,
        plannedSampleSize: String(estimate),
        sampleSizeRationale: spec.participants.sampleSizeRationale || `Approximate two-group planning estimate using d=${spec.participants.expectedEffectSize}, two-sided α=${spec.participants.alpha}, and power=${spec.participants.power}. A statistician or discipline-appropriate method should verify this before launch.`,
        approved: false,
      },
    })));
  };

  return (
    <div className={styles.studyPlanningCanvas}>
      <InheritedContext pathwayDraft={pathwayDraft} proposalHandoff={proposalHandoff} proposalHandoffCurrent={proposalHandoffCurrent} reviewedProposalBaseline={reviewedProposalBaseline} reviewedProposalBaselineCurrent={reviewedProposalBaselineCurrent} target="plan-participants" />
      <div className={styles.participantSummaryBar}>
        <div><span>Selected design</span><strong>{STUDY_DESIGN_OPTIONS.find((option) => option.id === studyDesign.spec.design.selectedDesign)?.title ?? "Not selected"}</strong></div>
        <div><span>Research questions</span><strong>{studyDesign.spec.researchQuestions.filter((question) => question.question.trim()).length}</strong></div>
        <div><span>Planning only</span><strong>No participant data stored</strong></div>
      </div>
      <div className={styles.studyPlanningBody}>
        <section className={styles.studySection}>
          <div className={styles.studySectionHeading}>
            <div><span>1 · Population and access</span><h2>Who or what will contribute evidence?</h2></div>
          </div>
          <div className={styles.studyFieldGrid}>
            <label><span>Target population or data source</span><textarea rows={5} value={participants.targetPopulation} onChange={(event) => updateParticipants("targetPopulation", event.target.value)} placeholder="Population, setting, archive, dataset, organization, or sampling frame…" /></label>
            <label><span>Recruitment or access channel</span><textarea rows={5} value={participants.recruitmentChannel} onChange={(event) => updateParticipants("recruitmentChannel", event.target.value)} placeholder="Panel, institution, community, clinic, public dataset, archive…" /></label>
            <label><span>Inclusion criteria</span><textarea rows={5} value={participants.inclusionCriteria} onChange={(event) => updateParticipants("inclusionCriteria", event.target.value)} placeholder="Who or what can be included, and why?" /></label>
            <label><span>Exclusion criteria</span><textarea rows={5} value={participants.exclusionCriteria} onChange={(event) => updateParticipants("exclusionCriteria", event.target.value)} placeholder="Define exclusions without using results observed after collection…" /></label>
            <label><span>Sampling strategy</span><textarea rows={5} value={participants.samplingStrategy} onChange={(event) => updateParticipants("samplingStrategy", event.target.value)} placeholder="Probability, purposive, convenience, stratified, theoretical, census, or another justified strategy…" /></label>
            <label><span>Accessibility and inclusion requirements</span><textarea rows={5} value={participants.accessibilityRequirements} onChange={(event) => updateParticipants("accessibilityRequirements", event.target.value)} placeholder="Language, vision, motor, cognitive, audio, reading, timing, or device accommodations…" /></label>
          </div>
        </section>

        <section className={styles.studySection}>
          <div className={styles.studySectionHeading}>
            <div><span>2 · Sample-size decision</span><h2>Record a defensible planning basis</h2></div>
            <p>The calculator is an approximate two-independent-group estimate, not a substitute for a design-specific power analysis.</p>
          </div>
          <div className={styles.powerPlanner}>
            <label><span>Expected standardized effect (d)</span><input inputMode="decimal" min="0.01" step="0.01" type="number" value={participants.expectedEffectSize} onChange={(event) => updateParticipants("expectedEffectSize", event.target.value)} placeholder="0.50" /></label>
            <label><span>Two-sided alpha</span><select value={participants.alpha} onChange={(event) => updateParticipants("alpha", event.target.value as ParticipantPlan["alpha"])}><option value="0.05">0.05</option><option value="0.01">0.01</option></select></label>
            <label><span>Target power</span><select value={participants.power} onChange={(event) => updateParticipants("power", event.target.value as ParticipantPlan["power"])}><option value="0.80">0.80</option><option value="0.90">0.90</option></select></label>
            <div className={styles.powerEstimate}><span>Approximate total</span><strong>{estimate ?? "—"}</strong><button disabled={!estimate} onClick={useEstimate} type="button">Use estimate</button></div>
          </div>
          <div className={styles.studyFieldGrid}>
            <label><span>Planned sample size or source count</span><input inputMode="numeric" value={participants.plannedSampleSize} onChange={(event) => updateParticipants("plannedSampleSize", event.target.value)} placeholder="e.g., 128 participants" /></label>
            <label><span>Sample-size rationale</span><textarea rows={5} value={participants.sampleSizeRationale} onChange={(event) => updateParticipants("sampleSizeRationale", event.target.value)} placeholder="Power analysis, saturation, available population, precision target, prior study, or feasibility justification…" /></label>
          </div>
        </section>

        <section className={styles.studySection}>
          <div className={styles.studySectionHeading}>
            <div><span>3 · Conditions and assignment</span><h2>How will observations enter the study?</h2></div>
          </div>
          <div className={styles.studyFieldGrid}>
            <label><span>Conditions, cohorts, or observation groups</span><textarea rows={5} value={participants.conditions} onChange={(event) => updateParticipants("conditions", event.target.value)} placeholder="List conditions and explain what differs between them…" /></label>
            <label><span>Assignment or allocation method</span><textarea rows={5} value={participants.allocationMethod} onChange={(event) => updateParticipants("allocationMethod", event.target.value)} placeholder="Simple randomization, block randomization, matched groups, natural groups, not applicable…" /></label>
            <label><span>Allocation ratio</span><input value={participants.allocationRatio} onChange={(event) => updateParticipants("allocationRatio", event.target.value)} placeholder="e.g., 1:1 or not applicable" /></label>
            <label><span>Counterbalancing or order control</span><input value={participants.counterbalancing} onChange={(event) => updateParticipants("counterbalancing", event.target.value)} placeholder="Latin square, randomized order, fixed order, not applicable…" /></label>
            <label><span>Device and environment requirements</span><textarea rows={4} value={participants.deviceRequirements} onChange={(event) => updateParticipants("deviceRequirements", event.target.value)} placeholder="Browser, keyboard, screen, audio, full-screen, location, privacy, or laboratory requirements…" /></label>
          </div>
          <label className={styles.studyApproval}>
            <input checked={participants.approved} onChange={(event) => updateParticipants("approved", event.target.checked)} type="checkbox" />
            <span><strong>Approve the participant and sampling plan</strong>I reviewed feasibility, inclusion, assignment, and the limits of the sample-size rationale.</span>
          </label>
          <LegacyNotes note={studyDesign.spec.legacyNotes["stage-03-step-03"]} />
        </section>
      </div>
      <ValidationSummary issues={issues} />
    </div>
  );
}

export default function Stage3StudyPlanner(props: Stage3StudyPlannerProps) {
  if (props.step.canvas === "study-design") {
    return <StudyDesignCanvas pathwayDraft={props.pathwayDraft} proposalHandoff={props.proposalHandoff} proposalHandoffCurrent={props.proposalHandoffCurrent} reviewedProposalBaseline={props.reviewedProposalBaseline} reviewedProposalBaselineCurrent={props.reviewedProposalBaselineCurrent} studyDesign={props.studyDesign} updateStudyDesign={props.updateStudyDesign} />;
  }
  if (props.step.canvas === "study-measures") {
    return <MeasuresCanvas pathwayDraft={props.pathwayDraft} proposalHandoff={props.proposalHandoff} proposalHandoffCurrent={props.proposalHandoffCurrent} reviewedProposalBaseline={props.reviewedProposalBaseline} reviewedProposalBaselineCurrent={props.reviewedProposalBaselineCurrent} studyDesign={props.studyDesign} updateStudyDesign={props.updateStudyDesign} />;
  }
  if (props.step.canvas === "study-participants") {
    return <ParticipantsCanvas pathwayDraft={props.pathwayDraft} proposalHandoff={props.proposalHandoff} proposalHandoffCurrent={props.proposalHandoffCurrent} reviewedProposalBaseline={props.reviewedProposalBaseline} reviewedProposalBaselineCurrent={props.reviewedProposalBaselineCurrent} studyDesign={props.studyDesign} updateStudyDesign={props.updateStudyDesign} />;
  }
  return null;
}
