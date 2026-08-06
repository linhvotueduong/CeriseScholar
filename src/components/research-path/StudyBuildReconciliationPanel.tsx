"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppIcon } from "@/components/app-shell/AppIcons";
import {
  readExperimentStudioDocument,
  writeExperimentStudioDocument,
  type ExperimentStudioDocument,
} from "@/lib/research/experimentStudio";
import type {
  StudyBuildMaterializationPreview,
  StudyBuildRecommendationDecision,
} from "@/lib/research/studyBuildMaterializer";
import type { StudyBuildProfile } from "@/lib/research/studyBuildProfile";
import {
  applyStudyBuildReconciliation,
  createRebuiltStudyDraft,
  createStudyBuildReconciliationPreview,
  writeRebuiltStudyDraft,
  writeStudioSourceLink,
  type ReconciliationDecision,
  type StudioSourceLink,
  type StudyBuildReconciliationChange,
  type StudyBuildReconciliationPreview,
} from "@/lib/research/studyBuildReconciliation";
import { STUDY_DESIGN_OPTIONS, type StudyDesignDocument } from "@/lib/research/studyDesign";
import styles from "./StudyBuildProfile.module.css";

interface StudyBuildReconciliationPanelProps {
  currentDocument: ExperimentStudioDocument;
  onChanged: () => void;
  profile: StudyBuildProfile;
  projectId: string;
  proposedPreview: StudyBuildMaterializationPreview | null;
  recommendationDecisions: readonly StudyBuildRecommendationDecision[];
  sourceLink: StudioSourceLink;
  studyDesign: StudyDesignDocument;
}

interface DecisionDraft {
  action: ReconciliationDecision["action"];
  rationale: string;
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
  return `${value.slice(0, 14)}…${value.slice(-6)}`;
}

function valueSummary(value: unknown): string {
  if (value === null || value === undefined) return "Not present";
  if (typeof value === "string") return value;
  if (typeof value !== "object") return String(value);
  const record = value as Record<string, unknown>;
  for (const key of ["heading", "prompt", "title", "name", "method"]) {
    if (typeof record[key] === "string" && record[key]) return record[key] as string;
  }
  return JSON.stringify(value).slice(0, 180);
}

function changeLabel(change: StudyBuildReconciliationChange): string {
  const semanticName = change.semanticId.split(":").slice(1).join(":").replaceAll("-", " ");
  return `${change.operation === "add" ? "Add" : change.operation === "remove" ? "Remove" : "Update"} ${semanticName}`;
}

export default function StudyBuildReconciliationPanel({
  currentDocument,
  onChanged,
  profile,
  projectId,
  proposedPreview,
  recommendationDecisions,
  sourceLink,
  studyDesign,
}: StudyBuildReconciliationPanelProps) {
  const [reconciliation, setReconciliation] = useState<StudyBuildReconciliationPreview | null>(null);
  const [activeChangeId, setActiveChangeId] = useState("");
  const [decisions, setDecisions] = useState<Record<string, DecisionDraft>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!proposedPreview) return () => { cancelled = true; };
    void createStudyBuildReconciliationPreview(sourceLink, currentDocument, proposedPreview, profile)
      .then((value) => {
        if (cancelled) return;
        setReconciliation(value);
        setActiveChangeId((current) => current || value.changes[0]?.id || "");
        setDecisions(Object.fromEntries(value.changes
          .filter((change) => change.risk === "safe")
          .map((change) => [change.id, { action: "apply", rationale: "" }])));
      });
    return () => { cancelled = true; };
  }, [currentDocument, profile, proposedPreview, sourceLink]);

  const activeChange = reconciliation?.changes.find((change) => change.id === activeChangeId)
    ?? reconciliation?.changes[0]
    ?? null;
  const unresolved = reconciliation?.changes.filter((change) => !decisions[change.id]).length ?? 0;
  const rationaleMissing = reconciliation?.changes.filter((change) => {
    const decision = decisions[change.id];
    return decision && (
      decision.action === "keep" || (decision.action === "apply" && change.risk === "researcher-owned")
    ) && !decision.rationale.trim();
  }).length ?? 0;
  const selectedUpdates = Object.values(decisions).filter((decision) => decision.action === "apply").length;
  const canApply = Boolean(
    proposedPreview?.candidate
    && reconciliation
    && reconciliation.issues.length === 0
    && unresolved === 0
    && rationaleMissing === 0,
  );

  const chooseDecision = useCallback((changeId: string, action: DecisionDraft["action"]) => {
    setDecisions((current) => ({
      ...current,
      [changeId]: { action, rationale: current[changeId]?.rationale ?? "" },
    }));
    setActiveChangeId(changeId);
    setMessage("");
  }, []);

  const decisionList = useMemo<ReconciliationDecision[]>(() => Object.entries(decisions).map(([changeId, decision]) => ({
    changeId,
    action: decision.action,
    rationale: decision.rationale,
  })), [decisions]);

  const applySelected = useCallback(async () => {
    if (!canApply || !reconciliation || !proposedPreview) return;
    setBusy(true);
    setMessage("");
    try {
      const persist = async () => {
        const latest = readExperimentStudioDocument(window.localStorage, projectId, studyDesign);
        if (!latest) throw new Error("The current Studio document is unavailable. Refresh and try again.");
        const result = await applyStudyBuildReconciliation(
          reconciliation,
          latest,
          proposedPreview,
          profile,
          decisionList,
          recommendationDecisions,
          new Date().toISOString(),
          sourceLink,
        );
        const recoveryKey = `cerise-study-reconcile-recovery:${projectId}:v1`;
        window.localStorage.setItem(recoveryKey, JSON.stringify({ document: latest, sourceLink }));
        writeExperimentStudioDocument(window.localStorage, result.document);
        writeStudioSourceLink(window.localStorage, result.sourceLink);
        window.localStorage.removeItem(recoveryKey);
        return result;
      };
      const result = navigator.locks
        ? await navigator.locks.request(`cerise-study-build:${projectId}`, { mode: "exclusive" }, persist)
        : await persist();
      setMessage(`${result.appliedChangeIds.length} selected update${result.appliedChangeIds.length === 1 ? "" : "s"} applied. ${result.keptChangeIds.length} researcher decision${result.keptChangeIds.length === 1 ? "" : "s"} preserved with rationale.`);
      onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No changes were applied. Refresh the reconciliation and try again.");
    } finally {
      setBusy(false);
    }
  }, [canApply, decisionList, onChanged, profile, projectId, proposedPreview, recommendationDecisions, reconciliation, sourceLink, studyDesign]);

  const rebuildAsNewDraft = useCallback(async () => {
    if (!proposedPreview?.canCreate) return;
    setBusy(true);
    try {
      const draft = await createRebuiltStudyDraft(
        proposedPreview,
        profile,
        recommendationDecisions,
        new Date().toISOString(),
      );
      writeRebuiltStudyDraft(window.localStorage, draft);
      setMessage(`New protected draft ${draft.draftId} stored separately. The current Studio document was not changed.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The alternate draft could not be stored. The current Studio document was not changed.");
    } finally {
      setBusy(false);
    }
  }, [profile, proposedPreview, recommendationDecisions]);

  if (!proposedPreview || !reconciliation) {
    return <div className={styles.studyBuilderLoading} role="status"><span />Comparing sources with the protected Studio draft…</div>;
  }

  const changedCount = reconciliation.changes.length;
  const conflictCount = reconciliation.changes.filter((change) => change.risk === "researcher-owned").length;
  const sourceBlocked = proposedPreview.issues.length > 0 || reconciliation.issues.length > 0;

  return (
    <div className={styles.studyBuilder}>
      <section className={styles.profileStrip} aria-label="Study Build Profile">
        <div><span>Design</span><strong>{designLabel(profile)}</strong></div>
        <div><span>Setting</span><strong>{settingLabel(profile.setting)}</strong></div>
        <div><span>Source profile</span><strong>{reconciliation.sourceChanged ? "Changed · review required" : "Synchronized"}</strong></div>
        <div className={conflictCount > 0 ? styles.profileBlocked : styles.profileReview}><span>Existing work</span><strong>Protected</strong></div>
      </section>

      <section className={sourceBlocked ? styles.reconciliationBlocked : styles.reconciliationNotice}>
        <AppIcon name={sourceBlocked ? "alert" : "shield"} />
        <div>
          <h2>{sourceBlocked
            ? "The new source profile cannot be reconciled yet"
            : changedCount > 0
              ? `${changedCount} source-linked change${changedCount === 1 ? " needs" : "s need"} review`
              : reconciliation.sourceChanged
                ? "The source changed without altering the Studio scaffold"
                : "This Studio draft is synchronized"}</h2>
          <p>{sourceBlocked
            ? proposedPreview.issues[0]?.message ?? reconciliation.issues[0]
            : "Nothing is applied until you review the exact semantic changes. Manual blocks and researcher-owned edits remain protected."}</p>
        </div>
        <Link href={`/experimental-studio/${projectId}`} rel="noopener noreferrer" target="_blank">Open Studio <AppIcon name="external-link" /></Link>
      </section>

      {!sourceBlocked ? (
        <section className={styles.reconciliationWorkspace} aria-label="Source-change reconciliation">
          <div className={styles.reconciliationList}>
            <div className={styles.reconciliationHeader}>
              <span>Proposed update</span><span>Current Studio</span><span>Researcher decision</span>
            </div>
            {reconciliation.changes.map((change, index) => {
              const decision = decisions[change.id];
              const selected = activeChange?.id === change.id;
              return (
                <article className={`${styles.reconciliationRow} ${selected ? styles.reconciliationRowActive : ""}`} key={change.id}>
                  <button className={styles.reconciliationChange} onClick={() => setActiveChangeId(change.id)} type="button">
                    <span className={change.risk === "safe" ? styles.changeSafe : styles.changeConflict}>{index + 1}</span>
                    <span><strong>{changeLabel(change)}</strong><small>{change.risk === "safe" ? "Safe source update" : "Researcher-owned content differs"}</small><code>{change.semanticId}</code></span>
                  </button>
                  <button className={styles.currentStudioValue} onClick={() => setActiveChangeId(change.id)} type="button">
                    <strong>{valueSummary(change.currentValue)}</strong>
                    <small>{change.operation === "add" ? "Not currently present" : "Protected draft value"}</small>
                  </button>
                  <div className={styles.reconciliationChoices} role="group" aria-label={`Decision for ${change.semanticId}`}>
                    <button aria-pressed={decision?.action === "apply"} onClick={() => chooseDecision(change.id, "apply")} type="button">Apply update</button>
                    <button aria-pressed={decision?.action === "keep"} onClick={() => chooseDecision(change.id, "keep")} type="button">Keep current</button>
                  </div>
                  {selected ? (
                    <div className={styles.mobileReconciliationInspector}>
                      <ReconciliationInspector
                        change={change}
                        decision={decision}
                        onRationale={(rationale) => setDecisions((current) => ({
                          ...current,
                          [change.id]: { action: current[change.id]?.action ?? "keep", rationale },
                        }))}
                      />
                    </div>
                  ) : null}
                </article>
              );
            })}
            {reconciliation.changes.length === 0 ? (
              <div className={styles.reconciliationEmpty}>
                <AppIcon name="check-square" />
                <div><strong>No Studio elements changed</strong><p>You can acknowledge the updated source fingerprint without changing the current document.</p></div>
              </div>
            ) : null}
            {reconciliation.preservedManualSemanticIds.length > 0 ? (
              <p className={styles.manualPreserved}><AppIcon name="lock" /> {reconciliation.preservedManualSemanticIds.length} manual Studio element{reconciliation.preservedManualSemanticIds.length === 1 ? " is" : "s are"} outside the generated scaffold and will be preserved.</p>
            ) : null}
          </div>
          <aside className={styles.reconciliationInspector} aria-label="Selected change details">
            {activeChange ? (
              <ReconciliationInspector
                change={activeChange}
                decision={decisions[activeChange.id]}
                onRationale={(rationale) => setDecisions((current) => ({
                  ...current,
                  [activeChange.id]: { action: current[activeChange.id]?.action ?? "keep", rationale },
                }))}
              />
            ) : (
              <div className={styles.inspectorContent}><h3>Source identity</h3><p>{shortChecksum(profile.sourceFingerprint.checksum)}</p></div>
            )}
          </aside>
        </section>
      ) : null}

      <footer className={styles.reconciliationFooter}>
        <div><span>Selected updates</span><strong>{selectedUpdates} of {changedCount}</strong></div>
        <div><span>Unresolved</span><strong>{unresolved + rationaleMissing}</strong></div>
        <button disabled={busy || !proposedPreview.canCreate} onClick={rebuildAsNewDraft} type="button">Rebuild as new draft</button>
        <button className={styles.createButton} disabled={busy || !canApply} onClick={applySelected} type="button">
          <AppIcon name="check-square" /> {changedCount === 0 ? "Acknowledge source update" : "Apply selected updates"}
        </button>
      </footer>
      <p className={styles.reconciliationIntegrity}><AppIcon name="lock" /> No action overwrites researcher-owned content silently. Checksums prove identity, not scientific, ethics, pilot, or release approval.</p>
      {message ? <p className={styles.creationMessage} role="status">{message}</p> : null}
    </div>
  );
}

function ReconciliationInspector({
  change,
  decision,
  onRationale,
}: {
  change: StudyBuildReconciliationChange;
  decision?: DecisionDraft;
  onRationale: (rationale: string) => void;
}) {
  const rationaleRequired = decision?.action === "keep" || (decision?.action === "apply" && change.risk === "researcher-owned");
  return (
    <div className={styles.inspectorContent}>
      <p className={styles.eyebrow}>Selected change</p>
      <h3>{changeLabel(change)}</h3>
      <p>{change.risk === "safe"
        ? "The current element still matches the last synchronized scaffold, so this update can be applied without replacing researcher edits."
        : "This element differs from the last synchronized scaffold. Applying the source requires an explicit rationale because researcher-owned content would be replaced."}</p>
      <dl>
        <div><dt>Stable semantic ID</dt><dd><code>{change.semanticId}</code></dd></div>
        <div><dt>Source recommendations</dt><dd>{change.recommendationIds.length ? change.recommendationIds.join(" · ") : "Document-level source change"}</dd></div>
        <div><dt>Current Studio</dt><dd>{valueSummary(change.currentValue)}</dd></div>
        <div><dt>Proposed source</dt><dd>{valueSummary(change.proposedValue)}</dd></div>
        <div><dt>Protection</dt><dd>{change.risk === "safe" ? "Safe to update" : "Researcher-owned conflict"}</dd></div>
      </dl>
      {rationaleRequired ? (
        <label className={styles.modifyNote}>
          <span>Rationale required</span>
          <textarea
            maxLength={2_000}
            onChange={(event) => onRationale(event.target.value)}
            placeholder={decision?.action === "keep"
              ? "Explain why the current Studio value remains appropriate despite the source change."
              : "Explain why the new source should replace the researcher-owned Studio value."}
            rows={5}
            value={decision?.rationale ?? ""}
          />
        </label>
      ) : null}
    </div>
  );
}
