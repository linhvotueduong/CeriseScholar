"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ResearchArtifactChecksum } from "@/lib/research/artifactIdentity";
import { appendLocalMentorInsight } from "@/lib/research/mentorContextEnvelope";
import type { ProposalHandoffPackage } from "@/lib/research/proposalHandoffPhase7";
import {
  compileProposalReview,
  compileStage2KnowledgeEntries,
  createProposalExternalReviewReceipt,
  createProposalReviewExportBundle,
  createReviewedProposalBaseline,
  reviewedProposalBaselineIsCurrent,
  type ProposalExternalReviewAttachmentReceipt,
  type ProposalExternalReviewKind,
  type ProposalExternalReviewOutcome,
  type ProposalExternalReviewReceipt,
  type ProposalExternalReviewReceiptDraft,
  type ProposalResearcherReviewDraft,
  type ProposalResearcherRole,
  type ReviewedProposalBaselinePackage,
} from "@/lib/research/proposalReviewPhase9";
import {
  readProposalReviewCache,
  reconcileProposalReviewCache,
  writeProposalReviewCache,
} from "@/lib/research/proposalReviewCache";
import {
  fetchProposalReviewCloudState,
  saveProposalReviewBaseline,
} from "@/lib/research/proposalReviewPersistence";
import { appendResearchKnowledgeEntry, loadResearchFoundationSnapshot } from "@/lib/research/researchFoundationPersistence";
import { verifyResearchKnowledgeEntry, type ResearchKnowledgeEntry } from "@/lib/research/livingResearchRecord";
import type { ProjectEvidenceAssessment, ResearchProposalDocument } from "@/lib/research/researchProposalDocument";
import { createClient } from "@/lib/supabase/client";
import styles from "./Stage2ProposalReviewPhase9.module.css";

interface ProposalReviewReleaseStudioProps {
  assessments: readonly ProjectEvidenceAssessment[];
  cloudUserId: string | null;
  document: ResearchProposalDocument;
  handoff: ProposalHandoffPackage | null;
  handoffCurrent: boolean;
  onBaselineChange: (baseline: ReviewedProposalBaselinePackage | null) => void;
  onReadyChange: (ready: boolean) => void;
  onStatusChange: (status: string) => void;
  projectId: string;
}

interface ReviewConflict {
  device: ReviewedProposalBaselinePackage;
  cloud: ReviewedProposalBaselinePackage;
  expectedCloudChecksum: ResearchArtifactChecksum;
}

const DEFAULT_REVIEW: ProposalResearcherReviewDraft = { reviewerRole: "independent-researcher", reviewStatement: "" };
const ROLES: Array<[ProposalResearcherRole, string]> = [
  ["principal-investigator", "Principal investigator"],
  ["student-researcher", "Student researcher"],
  ["research-team-member", "Research team member"],
  ["independent-researcher", "Independent researcher"],
];
const REVIEW_KINDS: Array<[ProposalExternalReviewKind, string]> = [["advisor", "Advisor"], ["funder", "Funder"], ["supervisor", "Supervisor"], ["peer", "Peer"], ["other", "Other"]];
const REVIEW_OUTCOMES: Array<[ProposalExternalReviewOutcome, string]> = [["comments-recorded", "Comments recorded"], ["changes-requested", "Changes requested"], ["no-changes-requested", "No changes requested (advisory only)"]];

function newExternalDraft(): ProposalExternalReviewReceiptDraft {
  return { id: `external-review-${crypto.randomUUID()}`, kind: "advisor", reviewerLabel: "", organization: "", outcome: "comments-recorded", summary: "", reviewedAt: new Date().toISOString().slice(0, 10), attachment: null };
}

function shortChecksum(value: string): string {
  return `${value.slice(0, 15)}…${value.slice(-9)}`;
}

async function attachmentReceipt(file: File): Promise<ProposalExternalReviewAttachmentReceipt> {
  const accepted = new Set<ProposalExternalReviewAttachmentReceipt["mediaType"]>(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"]);
  if (!accepted.has(file.type as ProposalExternalReviewAttachmentReceipt["mediaType"])) throw new Error("Use a PDF, DOCX, or plain-text review file.");
  if (file.size < 1 || file.size > 10 * 1024 * 1024) throw new Error("The review file must be no larger than 10 MB.");
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return { filename: file.name.slice(0, 240), mediaType: file.type as ProposalExternalReviewAttachmentReceipt["mediaType"], sizeBytes: file.size, checksum: `sha256:${hex}`, fileBytesStored: false };
}

async function verifiedKnowledgeEntries(values: readonly unknown[], checksums?: readonly string[]): Promise<ResearchKnowledgeEntry[]> {
  const expected = checksums ? new Set(checksums) : null;
  const candidates = values.filter((item): item is ResearchKnowledgeEntry => Boolean(item && typeof item === "object"));
  const verified = (await Promise.all(candidates.map(async (entry) => await verifyResearchKnowledgeEntry(entry) ? entry : null))).filter((entry): entry is ResearchKnowledgeEntry => Boolean(entry));
  return verified.filter((entry) => !expected || expected.has(entry.checksum)).slice(0, 3);
}

export function ProposalReviewReleaseStudio({ assessments, cloudUserId, document, handoff, handoffCurrent, onBaselineChange, onReadyChange, onStatusChange, projectId }: ProposalReviewReleaseStudioProps) {
  const [review, setReview] = useState<ProposalResearcherReviewDraft>(DEFAULT_REVIEW);
  const [externalDraft, setExternalDraft] = useState<ProposalExternalReviewReceiptDraft>(() => newExternalDraft());
  const [externalReceipts, setExternalReceipts] = useState<ProposalExternalReviewReceipt[]>([]);
  const [baseline, setBaseline] = useState<ReviewedProposalBaselinePackage | null>(null);
  const [knowledgeEntries, setKnowledgeEntries] = useState<ResearchKnowledgeEntry[]>([]);
  const [conflict, setConflict] = useState<ReviewConflict | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const expectedCloudChecksum = useRef<ResearchArtifactChecksum | null>(null);
  const cloudAvailable = useRef(true);

  const compilation = useMemo(() => compileProposalReview({ proposal: document, handoff, handoffCurrent, researcherReview: review, currentBaseline: baseline }), [baseline, document, handoff, handoffCurrent, review]);
  const baselineCurrent = reviewedProposalBaselineIsCurrent(baseline, handoff) && handoffCurrent;
  const draftDiffers = Boolean(baseline && (
    baseline.researcherReview.reviewerRole !== review.reviewerRole
    || baseline.researcherReview.reviewStatement !== review.reviewStatement.trim()
    || JSON.stringify(baseline.externalReviewReceipts.map((item) => item.checksum)) !== JSON.stringify(externalReceipts.map((item) => item.checksum))
  ));

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [cache, cloud, foundation] = await Promise.all([
        readProposalReviewCache(window.localStorage, projectId),
        cloudUserId ? fetchProposalReviewCloudState(createClient(), cloudUserId, projectId) : Promise.resolve({ baseline: null, storedChecksum: null, available: false, reason: "not-signed-in" }),
        cloudUserId ? loadResearchFoundationSnapshot(createClient(), projectId).catch(() => null) : Promise.resolve(null),
      ]);
      if (cancelled) return;
      cloudAvailable.current = cloud.available;
      const reconciled = reconcileProposalReviewCache({ cache, cloud: cloud.baseline, cloudStoredChecksum: cloud.storedChecksum });
      const selected = reconciled.kind === "review-required" ? reconciled.device : reconciled.baseline;
      expectedCloudChecksum.current = reconciled.expectedCloudChecksum;
      setConflict(reconciled.kind === "review-required" ? { device: reconciled.device, cloud: reconciled.cloud, expectedCloudChecksum: reconciled.expectedCloudChecksum } : null);
      setBaseline(selected);
      setReview(cache?.draftReview ?? (selected ? { reviewerRole: selected.researcherReview.reviewerRole, reviewStatement: selected.researcherReview.reviewStatement } : DEFAULT_REVIEW));
      setExternalReceipts(cache?.draftExternalReceipts.length ? cache.draftExternalReceipts : selected?.externalReviewReceipts ?? []);
      const cachedEntries = await verifiedKnowledgeEntries(cache?.knowledgeEntries ?? [], selected?.livingResearchEntryChecksums);
      const foundationEntries = await verifiedKnowledgeEntries(foundation?.knowledgeEntries ?? [], selected?.livingResearchEntryChecksums);
      setKnowledgeEntries(cachedEntries.length === 3 ? cachedEntries : foundationEntries);
      setLoaded(true);
      onBaselineChange(selected);
      if (reconciled.kind === "review-required") onStatusChange("Choose which reviewed proposal baseline to retain");
    };
    void load().catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [cloudUserId, onBaselineChange, onStatusChange, projectId]);

  useEffect(() => {
    if (!loaded) return;
    writeProposalReviewCache(window.localStorage, { projectId, baseline, draftReview: review, draftExternalReceipts: externalReceipts, knowledgeEntries, lastSyncedChecksum: expectedCloudChecksum.current, dirty: Boolean(baseline && baseline.identity.checksum !== expectedCloudChecksum.current) });
  }, [baseline, externalReceipts, knowledgeEntries, loaded, projectId, review]);

  useEffect(() => {
    const ready = loaded && !conflict && baselineCurrent;
    onReadyChange(ready);
    onBaselineChange(baseline);
  }, [baseline, baselineCurrent, conflict, loaded, onBaselineChange, onReadyChange]);

  const persist = async (next: ReviewedProposalBaselinePackage, expected: ResearchArtifactChecksum | null) => {
    if (!cloudUserId || !cloudAvailable.current) {
      onStatusChange("Reviewed proposal baseline saved on this device");
      return;
    }
    const result = await saveProposalReviewBaseline(createClient(), cloudUserId, next, expected);
    if (result.status === "saved") {
      expectedCloudChecksum.current = result.baseline.identity.checksum;
      onStatusChange(result.compatibilityWarnings.length ? "Reviewed baseline saved; artifact index sync needs retry" : "Reviewed proposal baseline saved securely");
      return;
    }
    if (result.status === "conflict" && result.current && result.currentStoredChecksum) {
      setConflict({ device: next, cloud: result.current, expectedCloudChecksum: result.currentStoredChecksum });
      onStatusChange("Choose which reviewed proposal baseline to retain");
      return;
    }
    if (result.status === "unavailable" && /42P01|PGRST205|research_proposal_review_baselines/i.test(result.reason)) cloudAvailable.current = false;
    onStatusChange("Reviewed proposal baseline saved on this device");
  };

  const addExternalReceipt = async () => {
    if (!handoff || !handoffCurrent) return;
    setBusy(true);
    setMessage(null);
    try {
      const next = await createProposalExternalReviewReceipt(externalDraft, handoff);
      if (externalReceipts.some((item) => item.id === next.id)) throw new Error("This external review receipt is already present.");
      setExternalReceipts((current) => [...current, next]);
      setExternalDraft(newExternalDraft());
      setMessage("The advisory receipt was added to the review draft. Create a new baseline to bind it.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The external review receipt could not be added.");
    } finally {
      setBusy(false);
    }
  };

  const freeze = async () => {
    if (!handoff || !compilation.readyToFreeze || conflict) return;
    setBusy(true);
    setMessage(null);
    try {
      const now = new Date().toISOString();
      const entries = await compileStage2KnowledgeEntries({ proposal: document, handoff, createdAt: now });
      const next = await createReviewedProposalBaseline({ proposal: document, handoff, compilation, researcherReview: review, externalReviewReceipts: externalReceipts, knowledgeEntries: entries, previous: baseline, now });
      const expected = expectedCloudChecksum.current;
      setBaseline(next);
      setKnowledgeEntries(entries);
      onBaselineChange(next);
      for (const entry of entries) appendLocalMentorInsight(window.localStorage, projectId, entry);
      if (cloudUserId) {
        const client = createClient();
        const saved = await Promise.allSettled(entries.map((entry) => appendResearchKnowledgeEntry(client, cloudUserId, entry)));
        if (saved.some((result) => result.status === "rejected")) setMessage("The baseline was created, but one Living Research Record cloud copy needs retry. The device copy is preserved.");
      }
      await persist(next, expected);
      setMessage((current) => current ?? "Reviewed baseline created. Stage 3 now identifies this exact proposal revision.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The reviewed proposal baseline could not be created.");
    } finally {
      setBusy(false);
    }
  };

  const exportBundle = async () => {
    if (!baseline || !handoff || knowledgeEntries.length !== 3) {
      setMessage("The three checksum-bound Living Research Record entries must be available before export.");
      return;
    }
    setBusy(true);
    try {
      const bundle = await createProposalReviewExportBundle({ baseline, proposal: document, handoff, assessments, knowledgeEntries, exportedAt: new Date().toISOString() });
      const blob = new Blob([`${JSON.stringify(bundle, null, 2)}\n`], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = `cerise-reviewed-proposal-${projectId}-r${baseline.revision}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage(`Portable proposal, evidence manifest, and knowledge record exported · ${shortChecksum(bundle.bundleChecksum)}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The review package could not be exported.");
    } finally {
      setBusy(false);
    }
  };

  const useSecureVersion = () => {
    if (!conflict) return;
    expectedCloudChecksum.current = conflict.expectedCloudChecksum;
    setBaseline(conflict.cloud);
    setReview({ reviewerRole: conflict.cloud.researcherReview.reviewerRole, reviewStatement: conflict.cloud.researcherReview.reviewStatement });
    setExternalReceipts(conflict.cloud.externalReviewReceipts);
    setConflict(null);
    onBaselineChange(conflict.cloud);
  };

  const rebaseDeviceReview = () => {
    if (!conflict) return;
    expectedCloudChecksum.current = conflict.expectedCloudChecksum;
    setBaseline(conflict.cloud);
    setReview({ reviewerRole: conflict.device.researcherReview.reviewerRole, reviewStatement: conflict.device.researcherReview.reviewStatement });
    setExternalReceipts(conflict.device.externalReviewReceipts);
    setConflict(null);
    setMessage("The device review is preserved as a draft. Create a new baseline above the secure revision.");
  };

  return (
    <section className={styles.reviewStudio} data-testid="proposal-review-release-studio">
      <header className={styles.hero}>
        <div><span>Build 2 · Phase 9</span><h2>Review, Record, and Release the Proposal Baseline</h2><p>Complete a human review of the exact deterministic handoff, preserve Stage 2 knowledge, and export the proposal with its evidence manifest.</p></div>
        <b className={baselineCurrent ? styles.current : compilation.readyToFreeze ? styles.ready : styles.blocked}>{baselineCurrent ? "Reviewed baseline current" : compilation.readyToFreeze ? "Ready for review freeze" : "Review blocked"}</b>
      </header>

      {conflict ? <div className={styles.conflict} role="alert"><div><strong>Two reviewed baselines changed independently</strong><p>Neither was overwritten. Keep the secure revision, or preserve the device review as a draft above it.</p></div><div><button onClick={useSecureVersion} type="button">Use secure baseline</button><button onClick={rebaseDeviceReview} type="button">Rebase device review</button></div></div> : null}

      <div className={styles.checkGrid}>{compilation.checks.map((check) => <article className={check.status === "passed" ? styles.checkPassed : styles.checkBlocked} key={check.id}><span aria-hidden="true">{check.status === "passed" ? "✓" : "—"}</span><div><strong>{check.label}</strong><p>{check.detail}</p></div><b>{check.status === "passed" ? "Passed" : "Resolve"}</b></article>)}</div>

      <div className={styles.reviewGrid}>
        <div>
          <section className={styles.panel}>
            <div className={styles.panelHeading}><div><span>Researcher-owned review</span><h3>Record what you inspected</h3></div><small>This is not institutional approval.</small></div>
            <div className={styles.formGrid}>
              <label><span>Your role for this review</span><select onChange={(event) => setReview((current) => ({ ...current, reviewerRole: event.target.value as ProposalResearcherRole }))} value={review.reviewerRole}>{ROLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className={styles.fullField}><span>Review statement</span><textarea onChange={(event) => setReview((current) => ({ ...current, reviewStatement: event.target.value }))} placeholder="Describe the proposal, evidence links, method intent, limitations, and Stage 3 responsibilities you reviewed." rows={5} value={review.reviewStatement} /></label>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeading}><div><span>Optional advisory evidence</span><h3>External review receipts</h3></div><small>{externalReceipts.length}/25</small></div>
            {externalReceipts.length ? <div className={styles.receiptList}>{externalReceipts.map((receipt) => <article key={receipt.id}><div><strong>{receipt.reviewerLabel}</strong><span>{receipt.kind} · {receipt.outcome}</span><p>{receipt.summary}</p>{receipt.attachment ? <small>{receipt.attachment.filename} · checksum receipt only; file bytes not stored</small> : null}</div><button aria-label={`Remove review receipt from ${receipt.reviewerLabel}`} onClick={() => setExternalReceipts((current) => current.filter((item) => item.id !== receipt.id))} type="button">Remove</button></article>)}</div> : <p className={styles.empty}>No external review is required by Cerise. Add a receipt only when a real advisor, supervisor, peer, or funder reviewed this exact handoff.</p>}
            <details className={styles.receiptComposer}>
              <summary>Add an advisory receipt</summary>
              <div className={styles.formGrid}>
                <label><span>Review type</span><select onChange={(event) => setExternalDraft((current) => ({ ...current, kind: event.target.value as ProposalExternalReviewKind }))} value={externalDraft.kind}>{REVIEW_KINDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label><span>Reviewer label</span><input onChange={(event) => setExternalDraft((current) => ({ ...current, reviewerLabel: event.target.value }))} placeholder="Role or name you are permitted to record" value={externalDraft.reviewerLabel} /></label>
                <label><span>Organization <small>optional</small></span><input onChange={(event) => setExternalDraft((current) => ({ ...current, organization: event.target.value }))} value={externalDraft.organization} /></label>
                <label><span>Outcome</span><select onChange={(event) => setExternalDraft((current) => ({ ...current, outcome: event.target.value as ProposalExternalReviewOutcome }))} value={externalDraft.outcome}>{REVIEW_OUTCOMES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label><span>Review date</span><input onChange={(event) => setExternalDraft((current) => ({ ...current, reviewedAt: event.target.value }))} type="date" value={externalDraft.reviewedAt.slice(0, 10)} /></label>
                <label><span>Review file <small>optional; receipt only</small></span><input accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" disabled={attachmentBusy} onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; setAttachmentBusy(true); void attachmentReceipt(file).then((attachment) => setExternalDraft((current) => ({ ...current, attachment }))).catch((error) => setMessage(error instanceof Error ? error.message : "The review file could not be fingerprinted.")).finally(() => setAttachmentBusy(false)); }} type="file" /></label>
                <label className={styles.fullField}><span>What did the reviewer communicate?</span><textarea onChange={(event) => setExternalDraft((current) => ({ ...current, summary: event.target.value }))} rows={3} value={externalDraft.summary} /></label>
              </div>
              {externalDraft.attachment ? <p className={styles.attachmentReceipt}>Fingerprint ready: {externalDraft.attachment.filename} · {shortChecksum(externalDraft.attachment.checksum)}. The file itself will not be stored.</p> : null}
              <button className={styles.secondaryButton} disabled={busy || attachmentBusy || !handoffCurrent} onClick={() => void addExternalReceipt()} type="button">Add receipt to review draft</button>
            </details>
          </section>
        </div>

        <aside>
          <section className={styles.panel}><span>Exact source baseline</span><dl><div><dt>Proposal revision</dt><dd>{document.revision}</dd></div><div><dt>Proposal checksum</dt><dd title={document.identity.checksum}>{shortChecksum(document.identity.checksum)}</dd></div><div><dt>Handoff revision</dt><dd>{handoff?.revision ?? "Not frozen"}</dd></div><div><dt>Evidence decisions</dt><dd>{assessments.length}</dd></div><div><dt>External receipts</dt><dd>{externalReceipts.length}</dd></div><div><dt>Stage 2 knowledge entries</dt><dd>{baselineCurrent ? `${knowledgeEntries.length}/3 available` : "Created at review freeze"}</dd></div></dl></section>
          <section className={styles.boundary}><span>Authority boundary</span><p>“Researcher reviewed” means the researcher inspected this exact internal record. External receipts record advisory input only. Neither label means institutional, ethics, legal, methodological, funder, publication, or collection approval.</p></section>
        </aside>
      </div>

      <section className={styles.tracePanel}><div className={styles.panelHeading}><div><span>Functional traceability</span><h3>Research question → gap → proposed method → analysis</h3></div><small>{compilation.traceability.length} question path{compilation.traceability.length === 1 ? "" : "s"}</small></div><div className={styles.traceScroll} tabIndex={0}><table><thead><tr><th>Research question</th><th>Reviewed gap</th><th>Proposed method</th><th>Analysis direction</th></tr></thead><tbody>{compilation.traceability.map((row) => <tr key={row.questionId}><td><strong>{row.questionId}</strong><span>{row.questionText}</span></td><td>{row.gapClaimIds.join(", ") || "Missing"}</td><td>{row.proposedMethod || "Missing"}</td><td>{row.analysisDirection || "Missing"}</td></tr>)}</tbody></table></div></section>

      {compilation.issues.length ? <div className={styles.issues} role="status"><strong>{compilation.issues.length} review item{compilation.issues.length === 1 ? "" : "s"} to resolve</strong>{compilation.issues.map((item) => <p key={item.id}>{item.message}</p>)}</div> : null}
      {message ? <p className={styles.message} role="status">{message}</p> : null}

      <footer className={styles.footer}><div>{baseline ? <><span>Reviewed proposal baseline · revision {baseline.revision}</span><strong>{shortChecksum(baseline.identity.checksum)}</strong><small>{baselineCurrent ? "This baseline matches the current proposal handoff." : "Preserved history; the current handoff requires a new review."}</small></> : <><span>No reviewed proposal baseline yet</span><strong>Complete the researcher review after the deterministic handoff is current.</strong></>}</div><div>{baseline ? <button className={styles.exportButton} disabled={busy || !baselineCurrent || knowledgeEntries.length !== 3} onClick={() => void exportBundle()} type="button">Export proposal + evidence manifest</button> : null}<button className={styles.primaryButton} disabled={busy || !compilation.readyToFreeze || Boolean(conflict) || (baselineCurrent && !draftDiffers)} onClick={() => void freeze()} type="button">{busy ? "Working…" : baselineCurrent && !draftDiffers ? "Current reviewed baseline" : "Create reviewed baseline"}</button></div></footer>
    </section>
  );
}
