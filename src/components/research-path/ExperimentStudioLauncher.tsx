"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppIcon, type AppIconName } from "@/components/app-shell/AppIcons";
import {
  collectExperimentVariables,
  experimentStudioStorageKey,
  isExperimentStudioReady,
  readExperimentStudioDocument,
  validateExperimentStudio,
  writeExperimentStudioDocument,
  type ExperimentStudioDocument,
} from "@/lib/research/experimentStudio";
import { compileStudyBuildProfileVariants } from "@/lib/research/studyBuildCompiler";
import {
  createStudyBuildCreationReceipt,
  createStudyBuildMaterializationPreview,
  suggestedStudyBuildDecision,
  writeStudyBuildCreationReceipt,
  type StudyBuildDecisionAction,
  type StudyBuildMaterializationInput,
  type StudyBuildMaterializationPreview,
  type StudyBuildRecommendationDecision,
} from "@/lib/research/studyBuildMaterializer";
import {
  createStudioSourceLink,
  readStudioSourceLink,
  writeStudioSourceLink,
  type StudioSourceLink,
} from "@/lib/research/studyBuildReconciliation";
import {
  collectStudyBuildProfileReadiness,
  type StudyBuildModuleRecommendation,
  type StudyBuildProfile,
  type StudyBuildProfileVariant,
} from "@/lib/research/studyBuildProfile";
import { STUDY_DESIGN_OPTIONS, type StudyDesignDocument } from "@/lib/research/studyDesign";
import styles from "./StudyBuildProfile.module.css";
import StudyBuildReconciliationPanel from "./StudyBuildReconciliationPanel";

interface ExperimentStudioLauncherProps {
  onReadyChange: (ready: boolean) => void;
  projectId: string;
  projectName: string;
  studyDesign: StudyDesignDocument;
}

interface StudioStatus {
  document: ExperimentStudioDocument | null;
  exists: boolean;
  sourceLink: StudioSourceLink | null;
}

interface DecisionDraft {
  action: StudyBuildDecisionAction;
  note: string;
}

interface CompiledProfileState {
  sourceKey: string;
  createdAt: string;
  profiles: Record<StudyBuildProfileVariant, StudyBuildProfile> | null;
  error: string;
}

interface PreviewState {
  key: string;
  preview: StudyBuildMaterializationPreview;
}

const EMPTY_DECISIONS: Record<string, DecisionDraft> = {};

const VARIANT_OPTIONS: ReadonlyArray<{
  id: StudyBuildProfileVariant;
  label: string;
  description: string;
}> = [
  { id: "guided", label: "Guided", description: "Required and recommended modules" },
  { id: "minimal-compatible", label: "Minimal compatible", description: "Required modules only" },
  { id: "blank-with-requirements", label: "Blank", description: "Requirements without optional scaffolds" },
];

const DECISION_OPTIONS: ReadonlyArray<{ id: StudyBuildDecisionAction; label: string }> = [
  { id: "accept", label: "Accept" },
  { id: "modify", label: "Modify" },
  { id: "decline", label: "Decline" },
  { id: "defer", label: "Defer" },
];

const MODULE_LABELS: Readonly<Record<string, string>> = {
  "flow.welcome": "Welcome and participant support",
  "flow.consent-reference": "Consent form reference",
  "flow.debrief-and-close": "Debrief and study close",
  "flow.participant-exit-support": "Refusal, withdrawal, and support",
  "participants.flow-and-eligibility": "Participant entry and eligibility",
  "measures.evidence-map": "Research-question evidence map",
  "accessibility.participant-flow": "Accessible participant flow",
  "design.survey.measure-sections": "Survey measure sections",
  "design.survey.skip-logic": "Survey skip logic",
  "design.survey.demographics": "Optional demographic items",
  "setting.online.responsive-layout": "Responsive participant layout",
  "setting.online.interruption-recovery": "Interruption recovery",
  "setting.online.shared-device-privacy": "Shared-device privacy",
  "design.randomized.allocation": "Random allocation",
  "design.randomized.condition-routing": "Condition routing and task",
  "design.randomized.manipulation-check": "Manipulation check",
  "design.randomized.outcomes": "Comparable outcome measures",
  "setting.lab.researcher-handoff": "Researcher setup and handoff",
  "setting.lab.equipment-check": "Equipment and room readiness",
  "setting.lab.session-reset": "Session close and reset",
};

const MODULE_ORDER = [
  "flow.welcome",
  "setting.lab.researcher-handoff",
  "flow.consent-reference",
  "participants.flow-and-eligibility",
  "setting.online.shared-device-privacy",
  "setting.lab.equipment-check",
  "design.randomized.allocation",
  "design.randomized.condition-routing",
  "design.survey.measure-sections",
  "measures.evidence-map",
  "design.survey.skip-logic",
  "design.randomized.manipulation-check",
  "design.randomized.outcomes",
  "design.survey.demographics",
  "setting.online.responsive-layout",
  "setting.online.interruption-recovery",
  "accessibility.participant-flow",
  "flow.participant-exit-support",
  "flow.debrief-and-close",
  "setting.lab.session-reset",
];

const SOURCE_LABELS: Readonly<Record<string, string>> = {
  "study-design-decision": "Step 01 · Design",
  "study-measures": "Step 02 · Measures",
  "study-participant-plan": "Step 03 · Participants",
  "study-build-registry": "Cerise architecture rules",
  "study-runtime-capabilities": "Experimental Studio runtime",
};

function moduleLabel(module: StudyBuildModuleRecommendation): string {
  return MODULE_LABELS[module.id] ?? module.moduleKind
    .split("-")
    .map((word) => `${word.slice(0, 1).toLocaleUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function moduleRationale(module: StudyBuildModuleRecommendation): string {
  return module.id === "flow.consent-reference"
    ? "The scaffold reserves a binding point for the separately authored and reviewed consent process added in Stage 03 Step 05."
    : module.rationale;
}

function moduleIcon(module: StudyBuildModuleRecommendation): AppIconName {
  if (module.id.includes("consent") || module.id.includes("privacy") || module.id.includes("exit")) return "shield";
  if (module.id.includes("allocation") || module.id.includes("routing") || module.id.includes("logic")) return "workflow";
  if (module.id.includes("accessibility") || module.id.includes("participant")) return "user";
  if (module.id.includes("equipment") || module.id.includes("responsive")) return "laptop";
  if (module.id.includes("debrief") || module.id.includes("reset")) return "check-square";
  return "list";
}

function orderedModules(profile: StudyBuildProfile): StudyBuildModuleRecommendation[] {
  return [...profile.modules].sort((left, right) => {
    const leftIndex = MODULE_ORDER.indexOf(left.id);
    const rightIndex = MODULE_ORDER.indexOf(right.id);
    return (leftIndex < 0 ? 999 : leftIndex) - (rightIndex < 0 ? 999 : rightIndex)
      || left.id.localeCompare(right.id);
  });
}

function designLabel(profile: StudyBuildProfile): string {
  return STUDY_DESIGN_OPTIONS.find((option) => option.id === profile.designKind)?.title ?? profile.designKind;
}

function settingLabel(setting: StudyBuildProfile["setting"]): string {
  return ({
    online: "Online / participant home",
    laboratory: "Research laboratory",
    field: "Field setting",
    hybrid: "Hybrid settings",
  })[setting];
}

function shortChecksum(value: string): string {
  return `${value.slice(0, 15)}…${value.slice(-6)}`;
}

function gateIssueMessage(
  issue: StudyBuildMaterializationPreview["issues"][number] | undefined,
  modules: readonly StudyBuildModuleRecommendation[],
): string {
  if (!issue) return "Review every module before creation.";
  const recommendation = modules.find((item) => item.id === issue.recommendationId);
  if (!recommendation) return issue.message;
  const label = moduleLabel(recommendation);
  if (issue.id.startsWith("decision-missing-")) return `Choose how to handle ${label}.`;
  if (issue.id.startsWith("modify-note-")) return `Describe the intended modification for ${label}.`;
  if (issue.id.startsWith("required-excluded-")) return `${label} is required for this starting study. Accept it or record a modification.`;
  return issue.message.replace(recommendation.id, label);
}

export default function ExperimentStudioLauncher({
  onReadyChange,
  projectId,
  projectName,
  studyDesign,
}: ExperimentStudioLauncherProps) {
  const [status, setStatus] = useState<StudioStatus>({ document: null, exists: false, sourceLink: null });
  const [compiledState, setCompiledState] = useState<CompiledProfileState | null>(null);
  const [variant, setVariant] = useState<StudyBuildProfileVariant>("guided");
  const [decisionScopes, setDecisionScopes] = useState<Record<string, Record<string, DecisionDraft>>>({});
  const [activeModuleId, setActiveModuleId] = useState("");
  const [previewState, setPreviewState] = useState<PreviewState | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [creationMessage, setCreationMessage] = useState("");
  const sourceKey = `${studyDesign.projectId}:${studyDesign.updatedAt}`;

  const refreshStatus = useCallback(() => {
    try {
      const exists = Boolean(window.localStorage.getItem(experimentStudioStorageKey(projectId)));
      const document = exists
        ? readExperimentStudioDocument(window.localStorage, projectId, studyDesign)
        : null;
      const sourceLink = exists ? readStudioSourceLink(window.localStorage, projectId) : null;
      setStatus({ document, exists, sourceLink });
    } catch {
      setStatus({ document: null, exists: false, sourceLink: null });
    }
  }, [projectId, studyDesign]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(refreshStatus, 0);
    window.addEventListener("focus", refreshStatus);
    window.addEventListener("storage", refreshStatus);
    return () => {
      window.clearTimeout(initialRefresh);
      window.removeEventListener("focus", refreshStatus);
      window.removeEventListener("storage", refreshStatus);
    };
  }, [refreshStatus]);

  useEffect(() => {
    let cancelled = false;
    void compileStudyBuildProfileVariants(studyDesign).then((compiled) => {
      if (!cancelled) setCompiledState({
        sourceKey,
        createdAt: new Date().toISOString(),
        profiles: compiled,
        error: "",
      });
    }).catch(() => {
      if (!cancelled) setCompiledState({
        sourceKey,
        createdAt: new Date().toISOString(),
        profiles: null,
        error: "Finish the design and setting decisions in Step 01 before the Study Build Profile can be compiled.",
      });
    });
    return () => { cancelled = true; };
  }, [sourceKey, studyDesign]);

  const profiles = compiledState?.sourceKey === sourceKey ? compiledState.profiles : null;
  const profileError = compiledState?.sourceKey === sourceKey ? compiledState.error : "";
  const profile = profiles?.[variant] ?? null;
  const modules = useMemo(() => profile ? orderedModules(profile) : [], [profile]);
  const activeModule = modules.find((module) => module.id === activeModuleId) ?? modules[0] ?? null;
  const decisionScope = `${sourceKey}:${variant}`;
  const decisions = useMemo(
    () => decisionScopes[decisionScope] ?? EMPTY_DECISIONS,
    [decisionScope, decisionScopes],
  );

  const updateDecisions = useCallback((
    updater: (current: Record<string, DecisionDraft>) => Record<string, DecisionDraft>,
  ) => {
    setDecisionScopes((scopes) => ({
      ...scopes,
      [decisionScope]: updater(scopes[decisionScope] ?? {}),
    }));
  }, [decisionScope]);

  const decisionList = useMemo<StudyBuildRecommendationDecision[]>(() => modules.flatMap((module) => {
    const decision = decisions[module.id];
    return decision ? [{ recommendationId: module.id, ...decision }] : [];
  }), [decisions, modules]);

  const reconciliationDecisionList = useMemo<StudyBuildRecommendationDecision[]>(() => {
    if (!status.exists || !status.sourceLink) return decisionList;
    const previous = new Map(status.sourceLink.recommendationDecisions.map((decision) => [decision.recommendationId, decision]));
    return modules.map((module) => previous.get(module.id) ?? {
      recommendationId: module.id,
      action: suggestedStudyBuildDecision(module),
      note: module.selectionDefault === "configure"
        ? "Create the bounded starter and revise it in Experimental Studio."
        : "",
    });
  }, [decisionList, modules, status.exists, status.sourceLink]);

  const materializationInput = useMemo<StudyBuildMaterializationInput | null>(() => profile ? ({
    profile,
    studyDesign,
    projectName,
    decisions: reconciliationDecisionList,
    createdAt: compiledState?.createdAt ?? studyDesign.updatedAt,
    existingDocument: status.exists && !status.sourceLink,
  }) : null, [compiledState?.createdAt, profile, projectName, reconciliationDecisionList, status.exists, status.sourceLink, studyDesign]);

  const previewKey = useMemo(() => materializationInput ? JSON.stringify({
    sourceKey,
    variant,
    decisions: reconciliationDecisionList,
    existingDocument: status.exists && !status.sourceLink,
    createdAt: materializationInput.createdAt,
  }) : "", [materializationInput, reconciliationDecisionList, sourceKey, status.exists, status.sourceLink, variant]);

  useEffect(() => {
    let cancelled = false;
    if (!materializationInput || !previewKey) return () => { cancelled = true; };
    void createStudyBuildMaterializationPreview(materializationInput).then((nextPreview) => {
      if (!cancelled) setPreviewState({ key: previewKey, preview: nextPreview });
    });
    return () => { cancelled = true; };
  }, [materializationInput, previewKey]);

  const preview = previewState?.key === previewKey ? previewState.preview : null;
  const previewBusy = Boolean(materializationInput && previewState?.key !== previewKey);

  const validationIssues = useMemo(
    () => status.document ? validateExperimentStudio(status.document) : [],
    [status.document],
  );
  const validationErrors = validationIssues.filter((issue) => issue.severity === "error").length;
  const validationWarnings = validationIssues.length - validationErrors;
  const variables = status.document ? collectExperimentVariables(status.document).length : 0;
  const ready = Boolean(status.exists && status.document && isExperimentStudioReady(status.document));

  useEffect(() => {
    onReadyChange(ready);
  }, [onReadyChange, ready]);

  const chooseDecision = useCallback((recommendationId: string, action: StudyBuildDecisionAction) => {
    updateDecisions((current) => ({
      ...current,
      [recommendationId]: {
        action,
        note: action === "modify" ? current[recommendationId]?.note ?? "" : "",
      },
    }));
    setActiveModuleId(recommendationId);
    setCreationMessage("");
  }, [updateDecisions]);

  const applySuggestedDecisions = useCallback(() => {
    if (!profile) return;
    updateDecisions(() => Object.fromEntries(profile.modules.map((module) => {
      const action = suggestedStudyBuildDecision(module);
      return [module.id, {
        action,
        note: action === "modify" ? "Create the bounded starter and revise it in Experimental Studio." : "",
      }];
    })));
    setCreationMessage("Profile suggestions applied for review. Nothing has been created yet.");
  }, [profile, updateDecisions]);

  const createDraft = useCallback(async () => {
    if (!preview?.canCreate || !preview.candidate || !materializationInput || !profile) return;
    try {
      const sourceLink = await createStudioSourceLink(
        preview,
        profile,
        materializationInput.decisions,
        materializationInput.createdAt,
      );
      const persistCandidate = () => {
        if (window.localStorage.getItem(experimentStudioStorageKey(projectId))) return false;
        const receipt = createStudyBuildCreationReceipt(preview, materializationInput);
        writeStudyBuildCreationReceipt(window.localStorage, receipt);
        writeStudioSourceLink(window.localStorage, sourceLink);
        writeExperimentStudioDocument(window.localStorage, preview.candidate!);
        return true;
      };
      const created = navigator.locks
        ? await navigator.locks.request(`cerise-study-build:${projectId}`, { mode: "exclusive" }, persistCandidate)
        : persistCandidate();
      if (!created) {
        setCreationMessage("Creation stopped because an Experimental Studio document now exists. Existing work was not changed.");
        refreshStatus();
        return;
      }
      setCreationMessage("Study draft created from the exact reviewed candidate. Existing-work protection is now active.");
      refreshStatus();
    } catch {
      setCreationMessage("The study draft could not be saved on this device. No existing Studio document was changed.");
    }
  }, [materializationInput, preview, profile, projectId, refreshStatus]);

  if (profileError) {
    return (
      <div className={styles.studyBuilderState} role="status">
        <AppIcon name="alert" />
        <div>
          <h2>Study profile is waiting for its source decisions</h2>
          <p>{profileError}</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <div className={styles.studyBuilderLoading} role="status"><span />Compiling the source-linked Study Build Profile…</div>;
  }

  const profileReadiness = collectStudyBuildProfileReadiness(profile);
  const resolvedDecisions = decisionList.length;
  const accepted = decisionList.filter((decision) => decision.action === "accept" || decision.action === "modify").length;
  const deferred = decisionList.filter((decision) => decision.action === "defer").length;
  const declined = decisionList.filter((decision) => decision.action === "decline").length;

  if (status.exists) {
    if (status.document && status.sourceLink) {
      return (
        <StudyBuildReconciliationPanel
          currentDocument={status.document}
          onChanged={refreshStatus}
          profile={profile}
          projectId={projectId}
          proposedPreview={preview}
          recommendationDecisions={reconciliationDecisionList}
          sourceLink={status.sourceLink}
          studyDesign={studyDesign}
        />
      );
    }
    return (
      <div className={styles.studyBuilder}>
        <section className={styles.profileStrip} aria-label="Study Build Profile">
          <div><span>Design</span><strong>{designLabel(profile)}</strong></div>
          <div><span>Setting</span><strong>{settingLabel(profile.setting)}</strong></div>
          <div><span>Source profile</span><strong>Synced from Steps 01–03</strong></div>
          <div><span>Existing work</span><strong>Protected</strong></div>
        </section>
        <section className={styles.existingStudy}>
          <div className={styles.existingIcon}><AppIcon name="lock" /></div>
          <div>
            <p className={styles.eyebrow}>Existing Experimental Studio document</p>
            <h2>Continue the current study without regeneration</h2>
            <p>
              This document predates the stable Phase 4 source link, so Cerise cannot safely distinguish generated content from later researcher edits. Existing work remains untouched; open Studio or create a separately stored draft after completing a source-linked rebuild.
            </p>
          </div>
          <Link className={styles.primaryLink} href={`/experimental-studio/${projectId}`} rel="noopener noreferrer" target="_blank">
            Open existing Studio <AppIcon name="external-link" />
          </Link>
        </section>
        <section className={styles.existingMetrics} aria-label="Existing Studio status">
          <div><span>Participant screens</span><strong>{status.document?.blocks.length ?? 0}</strong></div>
          <div><span>Conditions</span><strong>{status.document?.conditions.length ?? 0}</strong></div>
          <div><span>Variables</span><strong>{variables}</strong></div>
          <div className={validationErrors > 0 ? styles.metricBlocked : styles.metricReady}>
            <span>Studio validation</span>
            <strong>{validationErrors > 0 ? `${validationErrors} required fix${validationErrors === 1 ? "" : "es"}` : "No blocking errors"}</strong>
            <small>{validationWarnings} warning{validationWarnings === 1 ? "" : "s"} to review</small>
          </div>
        </section>
        {creationMessage ? <p className={styles.creationMessage} role="status">{creationMessage}</p> : null}
      </div>
    );
  }

  return (
    <div className={styles.studyBuilder}>
      <section className={styles.profileStrip} aria-label="Study Build Profile">
        <div><span>Design</span><strong>{designLabel(profile)}</strong></div>
        <div><span>Setting</span><strong>{settingLabel(profile.setting)}</strong></div>
        <div><span>Source profile</span><strong>Synced from Steps 01–03</strong></div>
        <div className={profileReadiness.status === "blocked" ? styles.profileBlocked : styles.profileReview}>
          <span>Capability status</span>
          <strong>{profileReadiness.status === "ready" ? "Supported" : profileReadiness.status === "review" ? "Supported with limits" : "Blocked"}</strong>
        </div>
      </section>

      <section className={styles.variantSection} aria-labelledby="starting-mode-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Starting structure</p>
            <h2 id="starting-mode-title">Choose how much scaffolding to review</h2>
          </div>
          <button className={styles.suggestionButton} onClick={applySuggestedDecisions} type="button">
            Apply profile suggestions
          </button>
        </div>
        <div className={styles.variantTabs} role="radiogroup" aria-label="Study scaffold mode">
          {VARIANT_OPTIONS.map((option) => (
            <button
              aria-checked={variant === option.id}
              className={variant === option.id ? styles.variantActive : undefined}
              key={option.id}
              onClick={() => setVariant(option.id)}
              role="radio"
              type="button"
            >
              <strong>{option.label}</strong>
              <span>{option.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.sequenceSection} aria-labelledby="recommended-sequence-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Proposal · no changes applied</p>
            <h2 id="recommended-sequence-title">Review every recommended module</h2>
            <p>Choose how each source-linked recommendation should be handled before Cerise creates one new Studio draft.</p>
          </div>
          <span className={styles.decisionProgress}>{resolvedDecisions}/{modules.length} decided</span>
        </div>

        <div className={styles.sequenceWorkspace}>
          <div className={styles.moduleList} aria-label="Recommended study modules">
            {modules.map((module, index) => {
              const decision = decisions[module.id];
              const selected = activeModule?.id === module.id;
              return (
                <article className={`${styles.moduleRow} ${selected ? styles.moduleRowActive : ""}`} key={module.id}>
                  <button className={styles.moduleSummary} onClick={() => setActiveModuleId(module.id)} type="button">
                    <span className={styles.moduleNumber}>{String(index + 1).padStart(2, "0")}</span>
                    <span className={styles.moduleIcon}><AppIcon name={moduleIcon(module)} /></span>
                    <span className={styles.moduleCopy}>
                      <strong>{moduleLabel(module)}</strong>
                      <small>{module.status} · {moduleRationale(module)}</small>
                    </span>
                    <AppIcon name="chevron-down" />
                  </button>
                  <div className={styles.decisionGroup} role="group" aria-label={`Decision for ${moduleLabel(module)}`}>
                    {DECISION_OPTIONS.map((option) => (
                      <button
                        aria-pressed={decision?.action === option.id}
                        className={decision?.action === option.id ? styles.decisionActive : undefined}
                        key={option.id}
                        onClick={() => chooseDecision(module.id, option.id)}
                        type="button"
                      >{option.label}</button>
                    ))}
                  </div>
                  {selected ? (
                    <div className={styles.mobileInspector}>
                      <ModuleInspector
                        decision={decision}
                        module={module}
                        onNoteChange={(note) => updateDecisions((current) => ({
                          ...current,
                          [module.id]: { action: current[module.id]?.action ?? "modify", note },
                        }))}
                      />
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
          <aside className={styles.inspector} aria-label="Selected module rationale">
            {activeModule ? (
              <ModuleInspector
                decision={decisions[activeModule.id]}
                module={activeModule}
                onNoteChange={(note) => updateDecisions((current) => ({
                  ...current,
                  [activeModule.id]: { action: current[activeModule.id]?.action ?? "modify", note },
                }))}
              />
            ) : null}
          </aside>
        </div>
      </section>

      <section className={styles.capabilityNote}>
        <AppIcon name={preview?.slice ? "shield" : "alert"} />
        <div>
          <strong>{preview?.slice === "online-survey"
            ? "Online/home survey materialization is supported in Phase 3."
            : preview?.slice === "randomized-laboratory"
              ? "Randomized laboratory materialization is supported in Phase 3."
          : preview?.slice === "longitudinal-authoring-only"
            ? "Longitudinal planning is authoring/export-only until identity, scheduling, reminders, and recontact are supported."
            : "This design and setting use the Phase 4 composable materializer."}</strong>
          <p>Consent content stays in Step 05. Checksums establish content identity only; they do not establish scientific, ethics, pilot, or release approval.</p>
        </div>
      </section>

      <section className={styles.changeReview}>
        <button aria-expanded={reviewOpen} onClick={() => setReviewOpen((current) => !current)} type="button">
          <AppIcon name="file" />
          <span>
            <strong>Review exact changes</strong>
            <small>{accepted} included · {declined} declined · {deferred} deferred · 0 destructive changes</small>
          </span>
          <AppIcon name="chevron-down" />
        </button>
        {reviewOpen ? (
          <div className={styles.changeLedger}>
            {previewBusy ? <p>Calculating the exact candidate…</p> : null}
            {!previewBusy && preview?.changes.length ? (
              <ol>
                {preview.changes.map((item) => (
                  <li key={item.id}>
                    <span>{item.kind}</span>
                    <div><strong>{item.summary}</strong><small>{item.path}</small></div>
                  </li>
                ))}
              </ol>
            ) : null}
            {!previewBusy && preview && preview.changes.length === 0 ? (
              <p>Resolve all module decisions to calculate the candidate change ledger.</p>
            ) : null}
            {preview?.candidateChecksum ? (
              <p className={styles.checksum}>Candidate {shortChecksum(preview.candidateChecksum)} · {preview.exactChangedPaths.length} exact changed paths</p>
            ) : null}
          </div>
        ) : null}
      </section>

      <footer className={styles.builderFooter}>
        <div className={styles.gateSummary}>
          <strong>{preview?.canCreate ? "Exact candidate ready for creation" : `${preview?.issues.length ?? modules.length} item${(preview?.issues.length ?? modules.length) === 1 ? "" : "s"} block creation`}</strong>
          <small>{preview?.canCreate
            ? "Creation writes one new local Studio document and a checksum-bound receipt."
            : gateIssueMessage(preview?.issues[0], modules)}</small>
        </div>
        <span className={styles.disabledStudioLink} aria-disabled="true">Open existing Studio</span>
        <button className={styles.createButton} disabled={!preview?.canCreate || previewBusy} onClick={createDraft} type="button">
          <AppIcon name="check-square" /> Create study draft
        </button>
      </footer>
      {creationMessage ? <p className={styles.creationMessage} role="status">{creationMessage}</p> : null}
    </div>
  );
}

function ModuleInspector({
  decision,
  module,
  onNoteChange,
}: {
  decision?: DecisionDraft;
  module: StudyBuildModuleRecommendation;
  onNoteChange: (note: string) => void;
}) {
  return (
    <div className={styles.inspectorContent}>
      <p className={styles.eyebrow}>Why this module?</p>
      <h3>{moduleLabel(module)}</h3>
      <p>{moduleRationale(module)}</p>
      <dl>
        <div>
          <dt>Source references</dt>
          <dd>{module.sourceReferences.map((source) => (
            <span key={`${source.artifactKind}-${source.artifactId}`} title={source.checksum}>
              {SOURCE_LABELS[source.artifactKind] ?? source.artifactKind}
            </span>
          ))}</dd>
        </div>
        <div>
          <dt>Proposed blocks</dt>
          <dd>{module.proposedBlockRoles.length ? module.proposedBlockRoles.join(" · ") : "No new participant block; verifies configuration or runtime behavior"}</dd>
        </div>
        <div>
          <dt>Variables</dt>
          <dd>{module.proposedVariableRoles.length ? module.proposedVariableRoles.join(" · ") : "No new research variable"}</dd>
        </div>
        <div>
          <dt>Requirement</dt>
          <dd>{module.status} · profile suggestion: {module.selectionDefault}</dd>
        </div>
      </dl>
      {decision?.action === "modify" ? (
        <label className={styles.modifyNote}>
          <span>What should change?</span>
          <textarea
            maxLength={2_000}
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder="Describe the intended Studio edit. The safe starter is created first; this note is preserved in the creation receipt."
            rows={4}
            value={decision.note}
          />
        </label>
      ) : null}
    </div>
  );
}
