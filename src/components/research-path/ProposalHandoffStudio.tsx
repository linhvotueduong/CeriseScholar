"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useProjectEvidenceAssessments } from "@/hooks/useProjectEvidenceAssessments";
import type { ResearchArtifactChecksum, ResearchArtifactReference } from "@/lib/research/artifactIdentity";
import {
  compileProposalHandoff,
  createProposalHandoffPackage,
  createProposalHandoffResponsibilityDraft,
  type ProposalHandoffDisposition,
  type ProposalHandoffPackage,
  type ProposalHandoffResponsibility,
  type ProposalHandoffTarget,
} from "@/lib/research/proposalHandoffPhase7";
import {
  readProposalHandoffCache,
  reconcileProposalHandoffCache,
  writeProposalHandoffCache,
} from "@/lib/research/proposalHandoffCache";
import {
  fetchProposalHandoffCloudState,
  saveProposalHandoffPackage,
} from "@/lib/research/proposalHandoffPersistence";
import { compileEvidenceReview } from "@/lib/research/proposalEvidencePhase3";
import { compileProposalSynthesis } from "@/lib/research/proposalSynthesisPhase4";
import { compileProposedStudyContract, type ProposalStudyQuestion, type ProposalStudyRoute } from "@/lib/research/proposalStudyContractPhase5";
import { compileProposalComposition } from "@/lib/research/proposalCompositionPhase6";
import type { ResearchProposalDocument } from "@/lib/research/researchProposalDocument";
import type { ReviewedProposalBaselinePackage } from "@/lib/research/proposalReviewPhase9";
import { createClient } from "@/lib/supabase/client";
import { ProposalReviewReleaseStudio } from "./ProposalReviewReleaseStudio";
import styles from "./Stage2ProposalHandoffPhase7.module.css";

interface ProposalHandoffStudioProps {
  cloudUserId: string | null;
  document: ResearchProposalDocument;
  evidenceStrategyReady: boolean;
  onBaselineChange: (baseline: ReviewedProposalBaselinePackage | null) => void;
  onHandoffChange: (packageValue: ProposalHandoffPackage | null) => void;
  onReadyChange: (ready: boolean) => void;
  onStatusChange: (status: string) => void;
  pathwayReady: boolean;
  pathwayReference: ResearchArtifactReference;
  projectId: string;
  questions: ProposalStudyQuestion[];
  requirementsReady: boolean;
  route: ProposalStudyRoute;
}

interface HandoffConflict {
  device: ProposalHandoffPackage;
  cloud: ProposalHandoffPackage;
  expectedCloudChecksum: ResearchArtifactChecksum;
}

const DISPOSITIONS: Array<{ value: ProposalHandoffDisposition; label: string }> = [
  { value: "unreviewed", label: "Choose a disposition" },
  { value: "carry-to-stage3", label: "Carry into Stage 3" },
  { value: "retained-proposal-limitation", label: "Retain as proposal limitation" },
  { value: "not-applicable", label: "Not applicable after review" },
  { value: "resolve-in-stage2", label: "Return and resolve in Stage 2" },
];

const TARGETS: Array<{ value: Exclude<ProposalHandoffTarget, "">; label: string }> = [
  { value: "select-design", label: "Select the Study Design" },
  { value: "map-measures", label: "Map Measures and Evidence" },
  { value: "plan-participants", label: "Plan Participants or Sources" },
  { value: "build-study", label: "Build the Study" },
  { value: "consent-and-rights", label: "Consent and Participant Rights" },
  { value: "verify-data-analysis-contract", label: "Verify Data and Analysis Contract" },
];

function display(value: string): string {
  return value.replaceAll("-", " ");
}

function shortChecksum(value: string): string {
  return `${value.slice(0, 16)}…${value.slice(-10)}`;
}

function PipelineRow({ label, ready, detail }: { label: string; ready: boolean; detail: string }) {
  return <article className={ready ? styles.pipelineReady : styles.pipelineBlocked}><span aria-hidden="true">{ready ? "✓" : "—"}</span><div><strong>{label}</strong><small>{detail}</small></div><b>{ready ? "Verified" : "Needs work"}</b></article>;
}

function ResponsibilityEditor({ item, onChange }: { item: ProposalHandoffResponsibility; onChange: (next: ProposalHandoffResponsibility) => void }) {
  return (
    <article className={item.disposition === "unreviewed" || item.disposition === "resolve-in-stage2" ? styles.responsibilityOpen : styles.responsibilityReviewed}>
      <header><div><span>{display(item.kind)}</span><strong>{item.sourceId}</strong></div><b>{display(item.disposition)}</b></header>
      <blockquote>{item.sourceText}</blockquote>
      <div className={styles.responsibilityControls}>
        <label><span>Disposition</span><select onChange={(event) => onChange({ ...item, disposition: event.target.value as ProposalHandoffDisposition, stage3Target: event.target.value === "carry-to-stage3" ? item.stage3Target : "" })} value={item.disposition}>{DISPOSITIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        {item.disposition === "carry-to-stage3" ? <label><span>Owning Stage 3 product</span><select onChange={(event) => onChange({ ...item, stage3Target: event.target.value as ProposalHandoffTarget })} value={item.stage3Target}><option value="">Choose the owner</option>{TARGETS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label> : null}
        {item.disposition !== "unreviewed" && item.disposition !== "resolve-in-stage2" ? <label className={styles.rationaleField}><span>Researcher rationale</span><textarea onChange={(event) => onChange({ ...item, rationale: event.target.value })} placeholder="Explain why this disposition is appropriate and what the next stage must preserve." rows={3} value={item.rationale} /></label> : null}
      </div>
    </article>
  );
}

export function ProposalHandoffStudio({
  cloudUserId,
  document,
  evidenceStrategyReady,
  onBaselineChange,
  onHandoffChange,
  onReadyChange,
  onStatusChange,
  pathwayReady,
  pathwayReference,
  projectId,
  questions,
  requirementsReady,
  route,
}: ProposalHandoffStudioProps) {
  const ledger = useProjectEvidenceAssessments({ cloudUserId, onStatusChange, projectId, route });
  const [responsibilities, setResponsibilities] = useState<ProposalHandoffResponsibility[]>(() => createProposalHandoffResponsibilityDraft(document));
  const deferredResponsibilities = useDeferredValue(responsibilities);
  const [packageValue, setPackageValue] = useState<ProposalHandoffPackage | null>(null);
  const [conflict, setConflict] = useState<HandoffConflict | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [freezing, setFreezing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [reviewBaselineReady, setReviewBaselineReady] = useState(false);
  const expectedCloudChecksum = useRef<ResearchArtifactChecksum | null>(null);
  const cloudAvailable = useRef(true);

  const evidenceReview = useMemo(() => compileEvidenceReview({ selectedQuestionIds: questions.map((question) => question.id), assessments: ledger.assessments }), [ledger.assessments, questions]);
  const synthesis = useMemo(() => compileProposalSynthesis({ route, selectedQuestionIds: questions.map((question) => question.id), assessments: ledger.assessments, claimEvidenceMap: document.claimEvidenceMap, evidenceStrategyReady, evidenceReviewReady: evidenceReview.ready && ledger.conflicts.length === 0 }), [document.claimEvidenceMap, evidenceReview.ready, evidenceStrategyReady, ledger.assessments, ledger.conflicts.length, questions, route]);
  const contract = useMemo(() => compileProposedStudyContract({ route, questions, claimEvidenceMap: document.claimEvidenceMap, contract: document.proposedStudyContract, synthesisReady: synthesis.ready && ledger.conflicts.length === 0 }), [document.claimEvidenceMap, document.proposedStudyContract, ledger.conflicts.length, questions, route, synthesis.ready]);
  const composition = useMemo(() => compileProposalComposition({ route, requirements: document.requirements, claimEvidenceMap: document.claimEvidenceMap, proposedStudyContract: document.proposedStudyContract, assessments: ledger.assessments, sections: document.sections, requirementsReady, synthesisReady: synthesis.ready && ledger.conflicts.length === 0, contractReady: contract.ready }), [contract.ready, document.claimEvidenceMap, document.proposedStudyContract, document.requirements, document.sections, ledger.assessments, ledger.conflicts.length, requirementsReady, route, synthesis.ready]);
  const compilation = useMemo(() => compileProposalHandoff({ proposal: document, pathwayReference, assessments: ledger.assessments, responsibilities: deferredResponsibilities, currentPackage: packageValue, pathwayReady, requirementsReady, evidenceReviewReady: evidenceReview.ready, synthesisReady: synthesis.ready, studyContractReady: contract.ready, compositionReady: composition.ready, evidenceConflictCount: ledger.conflicts.length }), [composition.ready, contract.ready, deferredResponsibilities, document, evidenceReview.ready, ledger.assessments, ledger.conflicts.length, packageValue, pathwayReady, pathwayReference, requirementsReady, synthesis.ready]);
  const isChecking = deferredResponsibilities !== responsibilities;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [cache, cloud] = await Promise.all([
        readProposalHandoffCache(window.localStorage, projectId),
        cloudUserId ? fetchProposalHandoffCloudState(createClient(), cloudUserId, projectId) : Promise.resolve({ package: null, storedChecksum: null, available: false, reason: "not-signed-in" }),
      ]);
      if (cancelled) return;
      cloudAvailable.current = cloud.available;
      const reconciled = reconcileProposalHandoffCache({ cache, cloud: cloud.package, cloudStoredChecksum: cloud.storedChecksum });
      const selected = reconciled.kind === "review-required" ? reconciled.device : reconciled.package;
      expectedCloudChecksum.current = reconciled.expectedCloudChecksum;
      setConflict(reconciled.kind === "review-required" ? { device: reconciled.device, cloud: reconciled.cloud, expectedCloudChecksum: reconciled.expectedCloudChecksum } : null);
      setPackageValue(selected);
      setDirty(reconciled.kind === "device-current" && (cache?.dirty ?? false));
      const previousDraft = cache?.draftProposalChecksum === document.identity.checksum ? cache.draftResponsibilities : selected?.responsibilities ?? [];
      setResponsibilities(createProposalHandoffResponsibilityDraft(document, previousDraft));
      setLoaded(true);
      onHandoffChange(selected);
      if (reconciled.kind === "review-required") onStatusChange("Choose which frozen proposal handoff to keep");
      else if (cloud.available) onStatusChange("Proposal handoff loaded securely");
      else onStatusChange("Proposal handoff available on this device");
    };
    void load().catch(() => { if (!cancelled) { setLoaded(true); onStatusChange("Proposal handoff could not be loaded"); } });
    return () => { cancelled = true; };
  }, [cloudUserId, document, onHandoffChange, onStatusChange, projectId]);

  useEffect(() => {
    if (!loaded) return;
    writeProposalHandoffCache(window.localStorage, { projectId, package: packageValue, draftProposalChecksum: document.identity.checksum, draftResponsibilities: responsibilities, lastSyncedChecksum: expectedCloudChecksum.current, dirty });
  }, [dirty, document.identity.checksum, loaded, packageValue, projectId, responsibilities]);

  useEffect(() => {
    const ready = loaded && !ledger.loading && !conflict && !isChecking && compilation.currentPackage && reviewBaselineReady;
    onReadyChange(ready);
    onHandoffChange(packageValue);
  }, [compilation.currentPackage, conflict, isChecking, ledger.loading, loaded, onHandoffChange, onReadyChange, packageValue, reviewBaselineReady]);

  const updateResponsibility = (next: ProposalHandoffResponsibility) => {
    setResponsibilities((current) => current.map((item) => item.id === next.id ? next : item));
    setMessage(null);
  };

  const persist = async (next: ProposalHandoffPackage, expected: ResearchArtifactChecksum | null) => {
    if (!cloudUserId || !cloudAvailable.current) {
      onStatusChange("Frozen handoff saved on this device");
      return;
    }
    const result = await saveProposalHandoffPackage(createClient(), cloudUserId, next, expected);
    if (result.status === "saved") {
      expectedCloudChecksum.current = result.package.identity.checksum;
      setDirty(false);
      onStatusChange(result.compatibilityWarnings.length ? "Handoff saved; artifact index sync needs retry" : "Handoff saved securely");
      return;
    }
    if (result.status === "conflict" && result.current && result.currentStoredChecksum) {
      setConflict({ device: next, cloud: result.current, expectedCloudChecksum: result.currentStoredChecksum });
      onStatusChange("Choose which frozen proposal handoff to keep");
      return;
    }
    if (result.status === "unavailable" && /42P01|PGRST205|research_proposal_handoffs/i.test(result.reason)) cloudAvailable.current = false;
    onStatusChange("Frozen handoff saved on this device");
  };

  const freeze = async () => {
    if (!compilation.readyToFreeze || isChecking || conflict) return;
    setFreezing(true);
    setMessage(null);
    try {
      const next = await createProposalHandoffPackage({ proposal: document, pathwayReference, assessments: ledger.assessments, questions, route, responsibilities, compilation, previous: packageValue, now: new Date().toISOString() });
      const expected = expectedCloudChecksum.current;
      setPackageValue(next);
      setDirty(true);
      onHandoffChange(next);
      setMessage("A new immutable Stage 3 handoff baseline was created.");
      await persist(next, expected);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The proposal handoff could not be frozen.");
    } finally {
      setFreezing(false);
    }
  };

  const chooseSecureVersion = () => {
    if (!conflict) return;
    expectedCloudChecksum.current = conflict.expectedCloudChecksum;
    setPackageValue(conflict.cloud);
    setResponsibilities(createProposalHandoffResponsibilityDraft(document, conflict.cloud.responsibilities));
    setDirty(false);
    setConflict(null);
    onHandoffChange(conflict.cloud);
    onStatusChange("Secure proposal handoff selected");
  };

  const chooseDeviceVersion = async () => {
    if (!conflict) return;
    const selected = conflict;
    const selectedResponsibilities = createProposalHandoffResponsibilityDraft(document, selected.device.responsibilities);
    const selectedCompilation = compileProposalHandoff({
      proposal: document,
      pathwayReference,
      assessments: ledger.assessments,
      responsibilities: selectedResponsibilities,
      currentPackage: selected.device,
      pathwayReady,
      requirementsReady,
      evidenceReviewReady: evidenceReview.ready,
      synthesisReady: synthesis.ready,
      studyContractReady: contract.ready,
      compositionReady: composition.ready,
      evidenceConflictCount: ledger.conflicts.length,
    });
    if (!selectedCompilation.readyToFreeze) {
      setMessage("This device’s decisions no longer match the current proposal. Review the responsibility ledger before freezing a replacement.");
      setPackageValue(selected.device);
      setResponsibilities(selectedResponsibilities);
      setConflict(null);
      setDirty(true);
      onHandoffChange(selected.device);
      return;
    }
    setFreezing(true);
    try {
      const rebased = await createProposalHandoffPackage({ proposal: document, pathwayReference, assessments: ledger.assessments, questions, route, responsibilities: selectedResponsibilities, compilation: selectedCompilation, previous: selected.cloud, now: new Date().toISOString() });
      expectedCloudChecksum.current = selected.expectedCloudChecksum;
      setPackageValue(rebased);
      setResponsibilities(selectedResponsibilities);
      setConflict(null);
      setDirty(true);
      onHandoffChange(rebased);
      onStatusChange("Saving the rebased device handoff…");
      await persist(rebased, selected.expectedCloudChecksum);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The device handoff could not be rebased.");
    } finally {
      setFreezing(false);
    }
  };

  const exportPackage = () => {
    if (!packageValue) return;
    const blob = new Blob([`${JSON.stringify(packageValue, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = `cerise-stage3-handoff-${projectId}-r${packageValue.revision}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const lanes = [
    ["Current Stage 1 pathway", pathwayReady && document.identity.sourceFingerprint.sources.some((source) => source.checksum === pathwayReference.checksum), "Exact pathway revision and checksum"],
    ["Requirements profile", requirementsReady, "Current selected authority and requirement mapping"],
    ["Evidence review", evidenceReview.ready && ledger.conflicts.length === 0, `${ledger.assessments.length} project-specific decisions`],
    ["Claim and gap synthesis", synthesis.ready, `${document.claimEvidenceMap.claims.length} current claims`],
    ["Proposed Study Contract", contract.ready, `${document.proposedStudyContract.entries.length} question contracts`],
    ["Source-linked proposal", composition.ready, `${composition.sectionSummaries.filter((item) => item.ready).length}/6 sections ready`],
    ["Stage 3 responsibility ledger", compilation.reviewedResponsibilityCount === compilation.responsibilityCount, `${compilation.reviewedResponsibilityCount}/${compilation.responsibilityCount} dispositioned`],
  ] as const;

  return (
    <div className={styles.handoff} data-testid="proposal-handoff-studio">
      <header className={styles.hero}><div><span>Build 2 · Phase 7</span><h2>Verify the Proposal and Create the Stage 3 Handoff</h2><p>Bind the exact reviewed proposal, evidence decisions, question contracts, and implementation responsibilities into one immutable Stage 3 input.</p></div><div className={compilation.currentPackage ? styles.currentBadge : compilation.readyToFreeze ? styles.freezeBadge : styles.blockedBadge}>{isChecking ? "Checking…" : compilation.currentPackage ? "Current baseline" : compilation.readyToFreeze ? "Ready to freeze" : "Blocked"}</div></header>

      {conflict ? <section className={styles.conflictPanel} role="alert"><div><strong>Two handoff baselines changed independently</strong><p>Neither package was overwritten. Choose the exact immutable baseline to keep.</p><small>Secure {shortChecksum(conflict.cloud.identity.checksum)} · Device {shortChecksum(conflict.device.identity.checksum)}</small></div><div><button onClick={chooseSecureVersion} type="button">Use secure version</button><button onClick={() => void chooseDeviceVersion()} type="button">Use this device’s version</button></div></section> : null}

      <section className={styles.baselineBand}><div><span>Proposal baseline</span><strong>Revision {document.revision}</strong><small>{shortChecksum(document.identity.checksum)}</small></div><div><span>Pathway source</span><strong>{pathwayReference.schemaVersion === 2 ? "Canonical Stage 1" : "Stage 1"}</strong><small>{shortChecksum(pathwayReference.checksum)}</small></div><div><span>Evidence manifest</span><strong>{compilation.evidenceReceiptCount} decisions</strong><small>{compilation.includedEvidenceCount} included · {compilation.excludedEvidenceCount} excluded</small></div><div><span>Stage 3 responsibilities</span><strong>{compilation.reviewedResponsibilityCount}/{compilation.responsibilityCount} reviewed</strong><small>Explicit owner and rationale</small></div></section>

      <div className={styles.mainGrid}>
        <main>
          <section className={styles.sectionHeading}><div><span>Deterministic verification</span><h3>Seven independent integrity lanes</h3></div><p>A later lane cannot hide an earlier source, evidence, or contract problem.</p></section>
          <div className={styles.pipeline}>{lanes.map(([label, ready, detail]) => <PipelineRow detail={detail} key={label} label={label} ready={ready} />)}</div>

          <section className={styles.sectionHeading}><div><span>Functional handoff ledger</span><h3>Decide what Stage 3 must own</h3></div><p>Return genuine Stage 2 contradictions upstream. Carry only explicit implementation work, or preserve a defensible proposal limitation.</p></section>
          <div className={styles.responsibilities}>{responsibilities.map((item) => <ResponsibilityEditor item={item} key={item.id} onChange={updateResponsibility} />)}</div>

          <section className={styles.issuePanel}><div><span>Freeze blockers and advisories</span><h3>{compilation.issues.length ? `${compilation.issues.length} item${compilation.issues.length === 1 ? "" : "s"} to inspect` : "No unresolved verification item"}</h3></div>{compilation.issues.length ? <div>{compilation.issues.map((item) => <article className={item.severity === "blocking" ? styles.blockingIssue : styles.advisoryIssue} key={item.id}><strong>{display(item.lane)} · {item.severity}</strong><p>{item.message}</p></article>)}</div> : <p className={styles.success}>The current proposal and responsibility ledger can be frozen.</p>}</section>
        </main>

        <aside className={styles.rightRail}>
          <section><span>Stage 3 input preview</span><h3>{questions.length} research question{questions.length === 1 ? "" : "s"}</h3>{questions.map((question) => <article key={question.id}><strong>{question.id.toUpperCase()}</strong><p>{question.text}</p></article>)}</section>
          <section><span>Source manifest</span><dl><div><dt>Proposal</dt><dd>{shortChecksum(document.identity.checksum)}</dd></div><div><dt>Pathway</dt><dd>{shortChecksum(pathwayReference.checksum)}</dd></div><div><dt>Evidence receipts</dt><dd>{ledger.assessments.length}</dd></div><div><dt>Participant rows</dt><dd>Excluded</dd></div></dl></section>
          <section className={styles.boundary}><span>Authority boundary</span><p>This verifies internal consistency and provenance for Stage 3. It is not factual or novelty verification, methodological validation, ethics or legal approval, preregistration, submission certification, funding approval, or permission to collect data.</p></section>
        </aside>
      </div>

      <footer className={styles.freezeFooter}><div>{packageValue ? <><span>Latest frozen package · revision {packageValue.revision}</span><strong>{shortChecksum(packageValue.identity.checksum)}</strong><small>{compilation.currentPackage ? "This package matches the current proposal and evidence manifest." : "Preserved but not current; freeze a new baseline after review."}</small></> : <><span>No Stage 3 handoff package yet</span><strong>{message ?? "Complete verification and disposition every responsibility."}</strong></>}</div><div>{packageValue ? <button className={styles.exportButton} onClick={exportPackage} type="button">Export verified JSON</button> : null}<button className={styles.freezeButton} disabled={!compilation.readyToFreeze || compilation.currentPackage || isChecking || freezing || ledger.loading || Boolean(conflict)} onClick={() => void freeze()} type="button">{freezing ? "Freezing…" : compilation.currentPackage ? "Current baseline frozen" : "Freeze Stage 3 handoff"}</button></div></footer>

      <ProposalReviewReleaseStudio
        assessments={ledger.assessments}
        cloudUserId={cloudUserId}
        document={document}
        handoff={packageValue}
        handoffCurrent={compilation.currentPackage}
        onBaselineChange={onBaselineChange}
        onReadyChange={setReviewBaselineReady}
        onStatusChange={onStatusChange}
        projectId={projectId}
      />
    </div>
  );
}
