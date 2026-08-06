"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ResearchArtifactChecksum, ResearchArtifactReference } from "@/lib/research/artifactIdentity";
import {
  PROPOSAL_REQUIREMENT_TEMPLATES,
  assessProposalRequirementAuthorityDrift,
  compileProposalRequirements,
  createDefaultProposalRequirementDraft,
  proposalRequirementDraftFromProfile,
  type ProposalRequirementDraft,
} from "@/lib/research/proposalRequirementsCompiler";
import {
  compileResearchPathwayBrief,
  type ResearchPathwayBrief,
} from "@/lib/research/researchPathwayBrief";
import type { ResearchPathwayDocument } from "@/lib/research/researchPathwayDocument";
import type { ResearchPathDraft, StepDraft } from "@/lib/research/researchPathDraft";
import type { ResearchPathStep } from "@/lib/research/researchPathConfig";
import { selectedResearchQuestionsFromDraft } from "@/lib/research/researchPathwayPhase2Model";
import {
  createResearchProposalDocument,
  type ClaimEvidenceMap,
  type ProposalEvidenceStrategy,
  type ProposedStudyContract,
  type ResearchProposalDocument,
  type ResearchProposalRevisionRecord,
  type ResearchProposalSection,
} from "@/lib/research/researchProposalDocument";
import {
  compileEvidenceStrategy,
  createDefaultEvidenceStrategy,
} from "@/lib/research/proposalEvidencePhase3";
import {
  loadOrImportResearchProposal,
  saveResearchProposalDocument,
} from "@/lib/research/researchProposalPersistence";
import {
  readResearchProposalCache,
  reconcileResearchProposalCache,
  writeResearchProposalCache,
} from "@/lib/research/researchProposalCache";
import { ProposalEvidenceStrategyStudio, type ProposalEvidenceQuestion } from "./ProposalEvidenceStrategyStudio";
import { ProposalEvidenceReviewStudio } from "./ProposalEvidenceReviewStudio";
import { ProposalStudyContractStudio } from "./ProposalStudyContractStudio";
import { ProposalSynthesisStudio } from "./ProposalSynthesisStudio";
import { ProposalComposerStudio } from "./ProposalComposerStudio";
import { ProposalHandoffStudio } from "./ProposalHandoffStudio";
import type { ProposalStudyQuestion, ProposalStudyRoute } from "@/lib/research/proposalStudyContractPhase5";
import type { ProposalHandoffPackage } from "@/lib/research/proposalHandoffPhase7";
import type { ReviewedProposalBaselinePackage } from "@/lib/research/proposalReviewPhase9";
import styles from "./Stage2ProposalStudio.module.css";

const EmbeddedScholarAsk = dynamic(
  () => import("@/app/dashboard/project/[projectId]/scholar-ask/page").then(
    (module) => module.default as ComponentType<{ embedded?: boolean; projectId?: string }>,
  ),
  { loading: () => <ToolLoading label="ScholarAsk" />, ssr: false },
);
const EmbeddedLiteratureReview = dynamic(
  () => import("@/components/literature-review/LiteratureReviewWorkspace").then((module) => module.LiteratureReviewWorkspace),
  { loading: () => <ToolLoading label="Literature Review" />, ssr: false },
);
const EmbeddedEvidenceLibrary = dynamic(
  () => import("@/components/evidence-library/EvidenceLibraryWorkspace").then((module) => module.EvidenceLibraryEmbedded),
  { loading: () => <ToolLoading label="Evidence Library" />, ssr: false },
);
const EmbeddedProjectWorkspace = dynamic(
  () => import("@/components/workspace/ProjectDocumentWorkspace"),
  { loading: () => <ToolLoading label="Workspace" />, ssr: false },
);

type ProposalToolId = "strategy" | "workspace" | "scholarask" | "literature-review" | "evidence-library";

interface Stage2ProposalStudioProps {
  cloudUserId: string | null;
  onBaselineChange: (baseline: ReviewedProposalBaselinePackage | null) => void;
  onHandoffChange: (packageValue: ProposalHandoffPackage | null) => void;
  onProposalChange: (document: ResearchProposalDocument | null) => void;
  onReadyChange: (ready: boolean) => void;
  onStatusChange: (status: string) => void;
  pathwayDocument: ResearchPathwayDocument | null;
  pathwayDraft: ResearchPathDraft;
  projectId: string;
  projectName: string;
  step: ResearchPathStep;
  stepDraft: StepDraft;
  updateField: (key: string, value: string) => void;
}

interface ProposalConflict {
  device: ResearchProposalDocument;
  cloud: ResearchProposalDocument;
  expectedCloudChecksum: ResearchArtifactChecksum;
}

const PURPOSE_OPTIONS: Array<[ProposalRequirementDraft["purpose"], string]> = [
  ["thesis", "Thesis"],
  ["dissertation", "Dissertation"],
  ["coursework", "Coursework"],
  ["internal", "Internal proposal"],
  ["funder", "Funder application"],
  ["review-protocol", "Review protocol"],
  ["custom", "Other purpose"],
];

const TOOL_TABS: Array<[ProposalToolId, string]> = [
  ["strategy", "Strategy"],
  ["workspace", "Workspace"],
  ["scholarask", "ScholarAsk"],
  ["literature-review", "Lit Review"],
  ["evidence-library", "Evidence Library"],
];

const ROADMAP_ROWS = Array.from({ length: 4 }, (_, index) => index);

function ToolLoading({ label }: { label: string }) {
  return <div className={styles.toolLoading} role="status"><span />Loading {label}…</div>;
}

function sourceReference(document: ResearchPathwayDocument | null): ResearchArtifactReference[] {
  return document ? [{
    artifactKind: document.identity.artifactKind,
    artifactId: document.identity.artifactId,
    schemaVersion: document.identity.artifactSchemaVersion,
    checksum: document.identity.checksum,
  }] : [];
}

function shortChecksum(checksum: string | undefined): string {
  return checksum ? `${checksum.slice(0, 13)}…${checksum.slice(-8)}` : "Not available";
}

function routeFromPathway(document: ResearchPathwayDocument | null) {
  return {
    intent: document?.decision.route.intent ?? "undetermined" as const,
    methodFamily: document?.decision.route.methodFamily ?? "undetermined" as const,
  };
}

function studyRouteFromPathway(document: ResearchPathwayDocument | null): ProposalStudyRoute {
  const route = document?.decision.route;
  return {
    intent: route?.intent ?? "undetermined",
    methodFamily: route?.methodFamily ?? "undetermined",
    assignment: route?.assignment ?? "undetermined",
    setting: route?.setting ?? "undetermined",
    audience: route?.audience ?? "undetermined",
    dataSensitivity: route?.dataSensitivity ?? "undetermined",
    possibleSpecialProcedures: [...(route?.possibleSpecialProcedures ?? [])],
  };
}

function ProposalBriefStep({
  brief,
  compiled,
  conflict,
  document,
  draft,
  pathwayDocument,
  setDraft,
  sourceChanged,
  useDeviceVersion,
  useSecureVersion,
}: {
  brief: ResearchPathwayBrief | null;
  compiled: ReturnType<typeof compileProposalRequirements>;
  conflict: ProposalConflict | null;
  document: ResearchProposalDocument | null;
  draft: ProposalRequirementDraft;
  pathwayDocument: ResearchPathwayDocument | null;
  setDraft: React.Dispatch<React.SetStateAction<ProposalRequirementDraft | null>>;
  sourceChanged: boolean;
  useDeviceVersion: () => void;
  useSecureVersion: () => void;
}) {
  const decision = pathwayDocument?.decision;
  const selectedProblems = pathwayDocument?.problemFrames.filter((item) => decision?.selectedProblemFrameIds.includes(item.id)) ?? [];
  const selectedQuestions = pathwayDocument?.questionCandidates.filter((item) => decision?.selectedQuestionIds.includes(item.id)) ?? [];
  const authorityDrift = document ? assessProposalRequirementAuthorityDrift(document.requirements) : [];
  const update = <K extends keyof ProposalRequirementDraft>(key: K, value: ProposalRequirementDraft[K]) => {
    setDraft((current) => current ? { ...current, [key]: value } : current);
  };

  return (
    <div className={styles.scrollRegion} data-testid="stage2-proposal-brief-scroll">
      <div className={styles.briefLayout}>
        {conflict ? (
          <section className={styles.conflictBanner} role="alert">
            <div>
              <span>Proposal version review</span>
              <h2>Secure storage and this device both changed</h2>
              <p>Neither version was overwritten. Select the version that should become current.</p>
            </div>
            <div className={styles.conflictActions}>
              <button onClick={useSecureVersion} type="button">Use secure version</button>
              <button onClick={useDeviceVersion} type="button">Use this device</button>
            </div>
          </section>
        ) : null}

        {sourceChanged || authorityDrift.length ? (
          <section className={styles.driftBanner} role="alert">
            <strong>Review required before this step can be ready</strong>
            <p>
              {sourceChanged
                ? "The Stage 1 pathway checksum changed after this proposal version was created. Cerise preserved both revisions and reset confirmation."
                : authorityDrift.map((item) => item.message).join(" ")}
            </p>
          </section>
        ) : null}

        <section className={styles.stepGuide} aria-labelledby="proposal-step-guide-title">
          <div className={styles.stepGuideIntro}>
            <h2 id="proposal-step-guide-title">Turn your research direction into a proposal plan</h2>
            <p>This step does not write the proposal yet. It tells Cerise which structure, language, citation style, and constraints to use in every proposal step that follows.</p>
          </div>
          <ol>
            <li><span>1</span><div><strong>Review Stage 1</strong><small>Check the problem, questions, and study direction carried forward.</small></div></li>
            <li><span>2</span><div><strong>Choose the proposal format</strong><small>Select what you are writing and the closest requirements profile.</small></div></li>
            <li><span>3</span><div><strong>Confirm the plan</strong><small>Review the generated requirements before continuing to evidence strategy.</small></div></li>
          </ol>
        </section>

        <section className={styles.handoffCard} aria-labelledby="stage2-handoff-title">
          <div className={styles.sectionHeading}>
            <div>
              <span>Carried forward from Stage 1</span>
              <h2 id="stage2-handoff-title">Your research direction</h2>
            </div>
            <div className={brief ? styles.readyPill : styles.blockedPill}>{brief ? "Ready to use" : "Needs Stage 1"}</div>
          </div>
          <p className={styles.cardHelper}>This is a read-only summary of the exact Research Pathway Brief. Make changes in Stage 1; Cerise will carry the updated version back here.</p>
          <dl className={styles.provenanceGrid}>
            <div><dt>Pathway revision</dt><dd>{pathwayDocument?.revision ?? "—"}</dd></div>
            <div><dt>Checksum</dt><dd title={pathwayDocument?.identity.checksum}>{shortChecksum(pathwayDocument?.identity.checksum)}</dd></div>
            <div><dt>Intent</dt><dd>{decision?.route.intent ?? "Undetermined"}</dd></div>
            <div><dt>Method family</dt><dd>{decision?.route.methodFamily ?? "Undetermined"}</dd></div>
          </dl>
          <div className={styles.handoffSection}>
            <h3>Selected problem</h3>
            {selectedProblems.length ? selectedProblems.map((item) => (
              <article key={item.id}><strong>{item.title || "Untitled problem frame"}</strong><p>{item.situation || item.consequence}</p></article>
            )) : <p className={styles.emptyCopy}>No selected problem frame is available yet.</p>}
          </div>
          <div className={styles.handoffSection}>
            <h3>Selected research questions</h3>
            {selectedQuestions.length ? <ol>{selectedQuestions.map((item) => <li key={item.id}>{item.text}</li>)}</ol> : <p className={styles.emptyCopy}>No selected research question is available yet.</p>}
          </div>
          <div className={styles.handoffSection}>
            <h3>Selection rationale</h3>
            <p>{decision?.rationale || "No pathway rationale is available yet."}</p>
          </div>
          {decision?.unresolvedQuestions.length ? (
            <div className={styles.handoffSection}>
              <h3>Unresolved uncertainties carried forward</h3>
              <ul>{decision.unresolvedQuestions.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          ) : null}
          {!brief ? <p className={styles.boundaryNote}><strong>Finish Stage 1 before completing this step.</strong> You may explore the proposal options now, but Cerise will not certify or carry forward an incomplete research direction.</p> : null}
        </section>

        <section className={styles.requirementsCard} aria-labelledby="proposal-requirements-title">
          <div className={styles.sectionHeading}>
            <div>
              <span>Proposal setup</span>
              <h2 id="proposal-requirements-title">Choose the format Cerise should prepare</h2>
            </div>
            <div className={compiled.ready && brief && !sourceChanged ? styles.readyPill : styles.blockedPill}>
              {compiled.ready && brief && !sourceChanged ? "Plan ready" : "Needs your review"}
            </div>
          </div>
          <p className={styles.cardHelper}>Choose the closest fit. Cerise uses these selections to organize later sections; they do not replace the requirements of your university, funder, journal, or review body.</p>

          <div className={styles.formGrid}>
            <label>
              <span>What are you writing?</span>
              <select onChange={(event) => update("purpose", event.target.value as ProposalRequirementDraft["purpose"])} value={draft.purpose}>
                {PURPOSE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label>
              <span>Working language</span>
              <input onChange={(event) => update("language", event.target.value)} value={draft.language} />
            </label>
            <label>
              <span>Citation style</span>
              <input onChange={(event) => update("citationStyle", event.target.value)} placeholder="APA 7th edition" value={draft.citationStyle} />
            </label>
            <label>
              <span>Maximum words <small>optional</small></span>
              <input
                inputMode="numeric"
                min={1}
                max={2_000_000}
                onChange={(event) => {
                  const parsed = Number.parseInt(event.target.value, 10);
                  update("maximumWords", Number.isFinite(parsed) ? Math.min(2_000_000, Math.max(1, parsed)) : null);
                }}
                placeholder="No limit recorded"
                type="number"
                value={draft.maximumWords ?? ""}
              />
            </label>
          </div>

          <fieldset className={styles.templateFieldset}>
            <legend>Which structure should Cerise use?</legend>
            <p className={styles.fieldHelp}>Start with a recommended option when available. You can still add local instructions below.</p>
            <div className={styles.templateGrid}>
              {PROPOSAL_REQUIREMENT_TEMPLATES.map((template) => {
                const recommended = compiled.recommendedTemplateIds.includes(template.id);
                const selected = draft.templateId === template.id;
                return (
                  <label className={selected ? styles.templateSelected : styles.templateOption} key={template.id}>
                    <input
                      checked={selected}
                      name="proposal-template"
                      onChange={() => update("templateId", template.id)}
                      type="radio"
                      value={template.id}
                    />
                    <span><strong>{template.shortLabel}</strong>{recommended ? <small>Recommended</small> : null}</span>
                    <p>{template.description}</p>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {draft.templateId === "researcher-defined" ? (
            <div className={styles.customAuthorityPanel}>
              <h3>Researcher-defined source</h3>
              <p>Enter one requirement per line and identify the controlling source when one exists.</p>
              <label className={styles.fullField}>
                <span>Requirements</span>
                <textarea
                  onChange={(event) => update("customRequirementLines", event.target.value.split("\n"))}
                  placeholder={"Proposal summary\nBackground and rationale\nMethod plan"}
                  rows={5}
                  value={draft.customRequirementLines.join("\n")}
                />
              </label>
              <div className={styles.formGrid}>
                <label><span>Authority name</span><input onChange={(event) => update("customAuthorityName", event.target.value)} value={draft.customAuthorityName} /></label>
                <label><span>Version or date</span><input onChange={(event) => update("customAuthorityVersion", event.target.value)} value={draft.customAuthorityVersion} /></label>
                <label className={styles.fullField}><span>HTTPS source page</span><input onChange={(event) => update("customAuthorityUrl", event.target.value)} placeholder="https://…" type="url" value={draft.customAuthorityUrl} /></label>
              </div>
            </div>
          ) : null}

          <label className={styles.fullField}>
            <span>Local instructions and notes <small>optional</small></span>
            <textarea onChange={(event) => update("customNotes", event.target.value)} placeholder="Program, supervisor, course, journal, or opportunity-specific instructions…" rows={4} value={draft.customNotes} />
          </label>

          <div className={styles.requirementSummary}>
            <div>
              <span>{compiled.profile.requirements.length}</span>
              <small>compiled requirements</small>
            </div>
            <div>
              <span>{compiled.profile.authorities.length}</span>
              <small>versioned authorities</small>
            </div>
            <div>
              <span>r{compiled.profile.revision}</span>
              <small>profile revision</small>
            </div>
          </div>

          {compiled.profile.authorities.length ? (
            <div className={styles.authorityList}>
              <h3>Authority snapshots</h3>
              {compiled.profile.authorities.map((item) => (
                <article key={item.authorityId}>
                  <div><strong>{item.name}</strong><p>{item.version}</p></div>
                  <a href={item.sourceUrl} rel="noreferrer" target="_blank">Open official source</a>
                </article>
              ))}
            </div>
          ) : null}

          <details className={styles.requirementsDisclosure}>
            <summary>
              <span><strong>Review the {compiled.profile.requirements.length} generated requirements</strong><small>See what Cerise will carry into the remaining proposal steps.</small></span>
              <span>View details</span>
            </summary>
            <div className={styles.requirementsTableWrap} tabIndex={0}>
              <table className={styles.requirementsTable}>
                <thead><tr><th>Requirement</th><th>Why it is here</th><th>Status</th></tr></thead>
                <tbody>
                  {compiled.profile.requirements.map((item) => (
                    <tr key={item.id}>
                      <td>{item.label}</td>
                      <td>{item.description}</td>
                      <td>{item.required ? "Required" : "Contextual"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>

          {compiled.issues.length ? (
            <div className={styles.issueList}>
              <h3>Compiler review</h3>
              {compiled.issues.map((item) => (
                <div className={item.severity === "blocking" ? styles.blockingIssue : styles.advisoryIssue} key={item.id}>
                  <strong>{item.severity === "blocking" ? "Resolve" : "Remember"}</strong>
                  <span>{item.message}</span>
                </div>
              ))}
            </div>
          ) : null}

          <label className={styles.confirmationBox}>
            <input checked={draft.researcherConfirmed} onChange={(event) => update("researcherConfirmed", event.target.checked)} type="checkbox" />
            <span>
              <strong>I reviewed this proposal setup and its sources.</strong>
              <small>I understand that the current institution, opportunity, supervisor, journal, or review body controls the final requirements. Cerise does not certify compliance or approval.</small>
            </span>
          </label>
        </section>
      </div>
    </div>
  );
}

function ToolTabs({ active, onChange }: { active: ProposalToolId; onChange: (tool: ProposalToolId) => void }) {
  return (
    <div className={styles.toolTabs} role="tablist" aria-label="Proposal evidence tools">
      {TOOL_TABS.map(([id, label]) => (
        <button aria-selected={active === id} className={active === id ? styles.toolTabActive : styles.toolTab} key={id} onClick={() => onChange(id)} role="tab" type="button">{label}</button>
      ))}
    </div>
  );
}

function EvidenceTool({ active, projectId }: { active: ProposalToolId; projectId: string }) {
  if (active === "scholarask") return <EmbeddedScholarAsk embedded projectId={projectId} />;
  if (active === "literature-review") return <EmbeddedLiteratureReview embedded projectId={projectId} />;
  if (active === "evidence-library") return <EmbeddedEvidenceLibrary embedded />;
  return <EmbeddedProjectWorkspace projectId={projectId} />;
}

function FoundationNotice({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className={styles.foundationNotice}>
      <span>Phase 2 foundation</span>
      <h2>{title}</h2>
      <p>{children}</p>
    </section>
  );
}

function EvidenceStrategyStep({
  activeTool,
  onSave,
  onToolChange,
  projectId,
  questions,
  route,
  strategy,
}: {
  activeTool: ProposalToolId;
  onSave: (strategy: ProposalEvidenceStrategy) => Promise<void>;
  onToolChange: (tool: ProposalToolId) => void;
  projectId: string;
  questions: ProposalEvidenceQuestion[];
  route: ReturnType<typeof routeFromPathway>;
  strategy: ProposalEvidenceStrategy;
}) {
  return (
    <div className={styles.toolShell}>
      <FoundationNotice title="Plan first, discover broadly, and preserve every search revision">
        Phase 3 now records question links, concepts, source types, eligibility boundaries, append-only search versions, and a stopping rationale in the canonical proposal. ScholarAsk and the other evidence tools remain available without being mistaken for the strategy itself.
      </FoundationNotice>
      <ToolTabs active={activeTool} onChange={onToolChange} />
      <div className={styles.embeddedTool}>
        {activeTool === "strategy"
          ? <ProposalEvidenceStrategyStudio onSave={onSave} questions={questions} route={route} strategy={strategy} />
          : <EvidenceTool active={activeTool} projectId={projectId} />}
      </div>
    </div>
  );
}

function LegacyRoadmapPanel({ pathwayDraft, stepDraft, updateField }: {
  pathwayDraft: ResearchPathDraft;
  stepDraft: StepDraft;
  updateField: (key: string, value: string) => void;
}) {
  const selectedQuestions = selectedResearchQuestionsFromDraft(pathwayDraft);
  const indexes = selectedQuestions.length ? selectedQuestions.map((_, index) => index) : [0];
  const [activeQuestion, setActiveQuestion] = useState(0);
  const current = indexes.includes(activeQuestion) ? activeQuestion : indexes[0];
  const questionKey = `roadmap-${current}-question`;
  const inheritedQuestion = selectedQuestions[current] ?? "";
  return (
    <div className={styles.studyContractLayout}>
        <p className={styles.boundaryNote}>Stage 2 proposes the study; Stage 3 implements it. This legacy roadmap remains optional planning context and cannot replace the canonical contract.</p>
        <div className={styles.roadmapTabs} role="tablist" aria-label="Research question roadmaps">
          {indexes.map((index) => (
            <button aria-selected={index === current} key={index} onClick={() => setActiveQuestion(index)} role="tab" type="button">
              <span>RQ{index + 1}</span><small>{stepDraft.fields[`roadmap-${index}-question`] || selectedQuestions[index] || "Add research question"}</small>
            </button>
          ))}
        </div>
        <label className={styles.fullField}><span>Research question</span><textarea onChange={(event) => updateField(questionKey, event.target.value)} rows={2} value={stepDraft.fields[questionKey] ?? inheritedQuestion} /></label>
        <div className={styles.roadmapTableWrap} tabIndex={0}>
          <table className={styles.roadmapTable}>
            <thead><tr><th>Theme</th><th>Short-term tasks</th><th>Medium-term tasks</th><th>Long-term tasks</th></tr></thead>
            <tbody>{ROADMAP_ROWS.map((row) => <tr key={row}>{(["theme", "short", "medium", "long"] as const).map((column) => {
              const key = `roadmap-${current}-${row}-${column}`;
              return <td key={column}><textarea aria-label={`RQ${current + 1} ${column} row ${row + 1}`} onChange={(event) => updateField(key, event.target.value)} rows={3} value={stepDraft.fields[key] ?? ""} /></td>;
            })}</tr>)}</tbody>
          </table>
        </div>
        <label className={styles.fullField}><span>Long-term research vision</span><textarea onChange={(event) => updateField(`roadmap-${current}-vision`, event.target.value)} rows={4} value={stepDraft.fields[`roadmap-${current}-vision`] ?? ""} /></label>
    </div>
  );
}

export default function Stage2ProposalStudio({
  cloudUserId,
  onBaselineChange,
  onHandoffChange,
  onProposalChange,
  onReadyChange,
  onStatusChange,
  pathwayDocument,
  pathwayDraft,
  projectId,
  projectName,
  step,
  stepDraft,
  updateField,
}: Stage2ProposalStudioProps) {
  const route = useMemo(() => routeFromPathway(pathwayDocument), [pathwayDocument]);
  const studyRoute = useMemo(() => studyRouteFromPathway(pathwayDocument), [pathwayDocument]);
  const sourceReferences = useMemo(() => sourceReference(pathwayDocument), [pathwayDocument]);
  const [document, setDocument] = useState<ResearchProposalDocument | null>(null);
  const [brief, setBrief] = useState<ResearchPathwayBrief | null>(null);
  const [requirementsDraft, setRequirementsDraft] = useState<ProposalRequirementDraft | null>(null);
  const [conflict, setConflict] = useState<ProposalConflict | null>(null);
  const [activeTool, setActiveTool] = useState<ProposalToolId>("strategy");
  const [reviewReady, setReviewReady] = useState(false);
  const [synthesisReady, setSynthesisReady] = useState(false);
  const [studyContractReady, setStudyContractReady] = useState(false);
  const [compositionReady, setCompositionReady] = useState(false);
  const [handoffReady, setHandoffReady] = useState(false);
  const expectedCloudChecksum = useRef<ResearchArtifactChecksum | null>(null);
  const cloudAvailable = useRef(true);
  const dirty = useRef(false);
  const editGeneration = useRef(0);
  const documentRef = useRef<ResearchProposalDocument | null>(null);
  const pathwayDocumentRef = useRef<ResearchPathwayDocument | null>(pathwayDocument);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const [saveNonce, setSaveNonce] = useState(0);

  useEffect(() => {
    documentRef.current = document;
    onProposalChange(document);
  }, [document, onProposalChange]);

  useEffect(() => {
    pathwayDocumentRef.current = pathwayDocument;
  }, [pathwayDocument]);

  useEffect(() => {
    let cancelled = false;
    const compiledBrief = pathwayDocument
      ? compileResearchPathwayBrief(pathwayDocument)
      : Promise.resolve(null);
    void compiledBrief.then((next) => {
      if (!cancelled) setBrief(next);
    });
    return () => { cancelled = true; };
  }, [pathwayDocument]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      onStatusChange("Loading proposal…");
      const pathwayAtLoad = pathwayDocumentRef.current;
      const sourceReferencesAtLoad = sourceReference(pathwayAtLoad);
      const routeAtLoad = routeFromPathway(pathwayAtLoad);
      const cachePromise = readResearchProposalCache(window.localStorage, projectId);
      const cloudPromise = cloudUserId
        ? loadOrImportResearchProposal({
          supabase: createClient(),
          userId: cloudUserId,
          projectId,
          projectTitle: projectName,
          sourceReferences: sourceReferencesAtLoad,
          importedAt: new Date().toISOString(),
        }).catch(() => null)
        : Promise.resolve(null);
      const [cache, cloudLoad] = await Promise.all([cachePromise, cloudPromise]);
      if (cancelled) return;
      const reconciliation = reconcileResearchProposalCache({
        cache,
        cloud: cloudLoad?.cloudState.canonical ?? null,
        cloudStoredChecksum: cloudLoad?.cloudState.canonicalStoredChecksum ?? null,
      });
      let selected: ResearchProposalDocument;
      if (reconciliation.kind === "review-required") {
        setConflict({ device: reconciliation.device, cloud: reconciliation.cloud, expectedCloudChecksum: reconciliation.expectedCloudChecksum });
        selected = reconciliation.device;
        expectedCloudChecksum.current = reconciliation.expectedCloudChecksum;
        dirty.current = true;
        onStatusChange("Choose which Stage 2 proposal version to keep");
      } else if (reconciliation.kind === "device-current" || reconciliation.kind === "cloud-current") {
        selected = reconciliation.document;
        expectedCloudChecksum.current = reconciliation.expectedCloudChecksum;
        dirty.current = reconciliation.kind === "device-current" && (cache?.dirty ?? false);
        onStatusChange(reconciliation.kind === "cloud-current" ? "Proposal loaded securely" : "Proposal loaded from this device");
      } else if (cloudLoad) {
        selected = cloudLoad.document;
        expectedCloudChecksum.current = cloudLoad.cloudState.canonicalStoredChecksum;
        dirty.current = !cloudLoad.cloudState.canonical;
        onStatusChange(cloudLoad.migratedFromLegacy ? "Legacy proposal imported on this device" : "Proposal ready on this device");
      } else {
        selected = await createResearchProposalDocument({ projectId, title: projectName, sourceReferences: sourceReferencesAtLoad, now: new Date().toISOString() });
        expectedCloudChecksum.current = null;
        dirty.current = true;
        onStatusChange("Proposal ready on this device");
      }
      if (cloudLoad?.migratedFromLegacy && selected.sections.length === 0 && cloudLoad.document.sections.length > 0) {
        selected = await createResearchProposalDocument({
          projectId,
          previous: selected,
          sections: cloudLoad.document.sections,
          sourceReferences: sourceReferencesAtLoad,
          createdBy: "system-migration",
          importedLegacySectionKeys: cloudLoad.document.migration.importedLegacySectionKeys,
          now: new Date().toISOString(),
        });
        dirty.current = true;
        onStatusChange("Legacy proposal sections merged on this device");
      }
      if (cancelled) return;
      setDocument(selected);
      const isEmptyProfile = selected.requirements.requirements.length === 0 && selected.requirements.citationStyle === "undetermined";
      setRequirementsDraft(isEmptyProfile ? createDefaultProposalRequirementDraft(routeAtLoad) : proposalRequirementDraftFromProfile(selected.requirements));
      writeResearchProposalCache(window.localStorage, {
        document: selected,
        lastSyncedChecksum: expectedCloudChecksum.current,
        dirty: dirty.current,
      });
    };
    void load().catch(() => onStatusChange("Proposal could not be loaded"));
    return () => { cancelled = true; };
  }, [cloudUserId, onStatusChange, projectId, projectName]); // source lineage is reconciled separately to avoid overwriting edits

  const sourceChanged = useMemo(() => Boolean(document && pathwayDocument && !document.identity.sourceFingerprint.sources.some((source) => (
    source.artifactId === pathwayDocument.identity.artifactId && source.checksum === pathwayDocument.identity.checksum
  ))), [document, pathwayDocument]);
  const routeChanged = Boolean(document && (
    document.requirements.route.intent !== route.intent
    || document.requirements.route.methodFamily !== route.methodFamily
  ));
  const storedAuthorityDrift = useMemo(
    () => document ? assessProposalRequirementAuthorityDrift(document.requirements) : [],
    [document],
  );
  const effectiveRequirementsDraft = useMemo(() => requirementsDraft && (sourceChanged || routeChanged || storedAuthorityDrift.length > 0)
    ? { ...requirementsDraft, researcherConfirmed: false }
    : requirementsDraft, [requirementsDraft, routeChanged, sourceChanged, storedAuthorityDrift.length]);
  const compiled = useMemo(() => effectiveRequirementsDraft
    ? compileProposalRequirements({ projectId, route, draft: effectiveRequirementsDraft, previous: document?.requirements })
    : null, [document?.requirements, effectiveRequirementsDraft, projectId, route]);
  const proposalQuestions = useMemo<ProposalEvidenceQuestion[]>(() => {
    const selected = new Set(pathwayDocument?.decision.selectedQuestionIds ?? []);
    return pathwayDocument?.questionCandidates
      .filter((question) => selected.has(question.id))
      .map((question) => ({ id: question.id, text: question.text })) ?? [];
  }, [pathwayDocument]);
  const proposalStudyQuestions = useMemo<ProposalStudyQuestion[]>(() => {
    const selected = new Set(pathwayDocument?.decision.selectedQuestionIds ?? []);
    return pathwayDocument?.questionCandidates
      .filter((question) => selected.has(question.id))
      .map((question) => ({
        id: question.id,
        text: question.text,
        family: question.family,
        scope: { ...question.scope },
      })) ?? [];
  }, [pathwayDocument]);
  const evidenceStrategyCompilation = useMemo(() => document ? compileEvidenceStrategy({
    route,
    selectedQuestionIds: proposalQuestions.map((question) => question.id),
    strategy: document.evidenceStrategy,
  }) : null, [document, proposalQuestions, route]);

  useEffect(() => {
    if (!document || !compiled || conflict) return;
    const profileSame = JSON.stringify(document.requirements) === JSON.stringify(compiled.profile);
    const sourcesSame = !sourceChanged;
    const titleSame = document.title === projectName;
    if (profileSame && sourcesSame && titleSame) return;
    const generation = ++editGeneration.current;
    const timer = window.setTimeout(() => {
      void createResearchProposalDocument({
        projectId,
        previous: document,
        title: projectName,
        language: compiled.profile.language,
        requirements: compiled.profile,
        sourceReferences,
        createdBy: "researcher",
        now: new Date().toISOString(),
      }).then((next) => {
        if (generation !== editGeneration.current) return;
        dirty.current = true;
        if (effectiveRequirementsDraft !== requirementsDraft) setRequirementsDraft(effectiveRequirementsDraft);
        setDocument(next);
        writeResearchProposalCache(window.localStorage, {
          document: next,
          lastSyncedChecksum: expectedCloudChecksum.current,
          dirty: true,
        });
        onStatusChange(cloudUserId ? "Saving proposal securely…" : "Proposal saved on this device");
      }).catch(() => onStatusChange("Proposal edit could not be saved"));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [cloudUserId, compiled, conflict, document, effectiveRequirementsDraft, onStatusChange, projectId, projectName, requirementsDraft, sourceChanged, sourceReferences]);

  useEffect(() => {
    if (!document || !dirty.current || conflict) return;
    if (!cloudUserId || !cloudAvailable.current) {
      onStatusChange("Proposal saved on this device");
      return;
    }
    const timer = window.setTimeout(() => {
      const versionBeingSaved = document;
      saveQueue.current = saveQueue.current.then(async () => {
        const result = await saveResearchProposalDocument(createClient(), cloudUserId, versionBeingSaved, expectedCloudChecksum.current);
        if (result.status === "saved") {
          expectedCloudChecksum.current = result.document.identity.checksum;
          const currentDocument = documentRef.current;
          const savedVersionIsCurrent = currentDocument?.identity.checksum === versionBeingSaved.identity.checksum;
          if (savedVersionIsCurrent && currentDocument) {
            dirty.current = false;
            writeResearchProposalCache(window.localStorage, { document: currentDocument, lastSyncedChecksum: result.document.identity.checksum, dirty: false });
          }
          onStatusChange(result.compatibilityWarnings.length ? "Proposal saved; compatibility sync needs retry" : "Proposal saved securely");
          return;
        }
        if (result.status === "conflict" && result.current && result.currentStoredChecksum) {
          setConflict({ device: documentRef.current ?? versionBeingSaved, cloud: result.current, expectedCloudChecksum: result.currentStoredChecksum });
          onStatusChange("Choose which Stage 2 proposal version to keep");
          return;
        }
        if (result.status === "unavailable" && /42P01|PGRST205|research_proposals/i.test(result.reason)) cloudAvailable.current = false;
        onStatusChange("Proposal saved on this device");
      }).catch(() => onStatusChange("Proposal saved on this device"));
    }, 750);
    return () => window.clearTimeout(timer);
  }, [cloudUserId, conflict, document, onStatusChange, saveNonce]);

  const saveEvidenceStrategy = useCallback(async (strategy: ProposalEvidenceStrategy) => {
    if (conflict) throw new Error("Resolve the proposal version conflict before saving the evidence strategy.");
    const current = documentRef.current;
    if (!current) throw new Error("The proposal is still loading.");
    const next = await createResearchProposalDocument({
      projectId,
      previous: current,
      title: projectName,
      language: current.language,
      evidenceStrategy: strategy,
      sourceReferences,
      createdBy: "researcher",
      now: new Date().toISOString(),
    });
    documentRef.current = next;
    dirty.current = true;
    setDocument(next);
    writeResearchProposalCache(window.localStorage, {
      document: next,
      lastSyncedChecksum: expectedCloudChecksum.current,
      dirty: true,
    });
    onStatusChange(cloudUserId ? "Saving evidence strategy securely…" : "Evidence strategy saved on this device");
  }, [cloudUserId, conflict, onStatusChange, projectId, projectName, sourceReferences]);

  const saveClaimEvidenceMap = useCallback(async (claimEvidenceMap: ClaimEvidenceMap) => {
    if (conflict) throw new Error("Resolve the proposal version conflict before saving the synthesis map.");
    const current = documentRef.current;
    if (!current) throw new Error("The proposal is still loading.");
    const next = await createResearchProposalDocument({
      projectId,
      previous: current,
      title: projectName,
      language: current.language,
      claimEvidenceMap,
      sourceReferences,
      createdBy: "researcher",
      now: new Date().toISOString(),
    });
    documentRef.current = next;
    dirty.current = true;
    setDocument(next);
    writeResearchProposalCache(window.localStorage, {
      document: next,
      lastSyncedChecksum: expectedCloudChecksum.current,
      dirty: true,
    });
    onStatusChange(cloudUserId ? "Saving synthesis map securely…" : "Synthesis map saved on this device");
  }, [cloudUserId, conflict, onStatusChange, projectId, projectName, sourceReferences]);

  const saveProposedStudyContract = useCallback(async (proposedStudyContract: ProposedStudyContract) => {
    if (conflict) throw new Error("Resolve the proposal version conflict before saving the Proposed Study Contract.");
    const current = documentRef.current;
    if (!current) throw new Error("The proposal is still loading.");
    const next = await createResearchProposalDocument({
      projectId,
      previous: current,
      title: projectName,
      language: current.language,
      proposedStudyContract,
      sourceReferences,
      createdBy: "researcher",
      now: new Date().toISOString(),
    });
    documentRef.current = next;
    dirty.current = true;
    setDocument(next);
    writeResearchProposalCache(window.localStorage, {
      document: next,
      lastSyncedChecksum: expectedCloudChecksum.current,
      dirty: true,
    });
    onStatusChange(cloudUserId ? "Saving Proposed Study Contract securely…" : "Proposed Study Contract saved on this device");
  }, [cloudUserId, conflict, onStatusChange, projectId, projectName, sourceReferences]);

  const saveProposalSections = useCallback(async (
    sections: ResearchProposalSection[],
    options?: { createdBy?: ResearchProposalRevisionRecord["createdBy"] },
  ): Promise<ResearchProposalDocument> => {
    if (conflict) throw new Error("Resolve the proposal version conflict before saving the proposal sections.");
    const current = documentRef.current;
    if (!current) throw new Error("The proposal is still loading.");
    const next = await createResearchProposalDocument({
      projectId,
      previous: current,
      title: projectName,
      language: current.language,
      sections,
      sourceReferences,
      createdBy: options?.createdBy ?? "researcher",
      now: new Date().toISOString(),
    });
    documentRef.current = next;
    dirty.current = true;
    setDocument(next);
    writeResearchProposalCache(window.localStorage, {
      document: next,
      lastSyncedChecksum: expectedCloudChecksum.current,
      dirty: true,
    });
    onStatusChange(cloudUserId ? "Saving source-linked proposal securely…" : "Source-linked proposal saved on this device");
    return next;
  }, [cloudUserId, conflict, onStatusChange, projectId, projectName, sourceReferences]);

  const profileIsMaterialized = Boolean(document && compiled && JSON.stringify(document.requirements) === JSON.stringify(compiled.profile));
  const stepReady = step.canvas === "proposal-brief"
    ? Boolean(brief && compiled?.ready && profileIsMaterialized && !sourceChanged && storedAuthorityDrift.length === 0 && !conflict)
    : step.canvas === "proposal-evidence-strategy"
      ? Boolean(evidenceStrategyCompilation?.ready && !sourceChanged && !conflict)
      : step.canvas === "proposal-evidence-review"
        ? Boolean(reviewReady && !sourceChanged && !conflict)
        : step.canvas === "proposal-synthesis"
          ? Boolean(synthesisReady && !sourceChanged && !conflict)
          : step.canvas === "proposal-study-contract"
            ? Boolean(studyContractReady && !sourceChanged && !conflict)
          : step.canvas === "proposal-compose"
            ? Boolean(compositionReady && profileIsMaterialized && !sourceChanged && storedAuthorityDrift.length === 0 && !conflict)
          : step.canvas === "proposal-verify"
            ? Boolean(handoffReady && !sourceChanged && !conflict)
        : false;
  useEffect(() => onReadyChange(stepReady), [onReadyChange, stepReady]);

  const useSecureVersion = useCallback(() => {
    if (!conflict) return;
    expectedCloudChecksum.current = conflict.expectedCloudChecksum;
    dirty.current = false;
    setDocument(conflict.cloud);
    setRequirementsDraft(proposalRequirementDraftFromProfile(conflict.cloud.requirements));
    writeResearchProposalCache(window.localStorage, { document: conflict.cloud, lastSyncedChecksum: conflict.expectedCloudChecksum, dirty: false });
    setConflict(null);
    onStatusChange("Secure proposal version selected");
  }, [conflict, onStatusChange]);

  const useDeviceVersion = useCallback(() => {
    if (!conflict) return;
    expectedCloudChecksum.current = conflict.expectedCloudChecksum;
    dirty.current = true;
    setDocument(conflict.device);
    setRequirementsDraft(proposalRequirementDraftFromProfile(conflict.device.requirements));
    writeResearchProposalCache(window.localStorage, { document: conflict.device, lastSyncedChecksum: conflict.expectedCloudChecksum, dirty: true });
    setConflict(null);
    setSaveNonce((value) => value + 1);
    onStatusChange("Saving this device’s proposal version…");
  }, [conflict, onStatusChange]);

  if (!requirementsDraft || !effectiveRequirementsDraft || !compiled) return <ToolLoading label="proposal requirements" />;

  return (
    <div className={styles.studio} data-canvas={step.canvas}>
      {step.canvas === "proposal-brief" ? (
        <ProposalBriefStep
          brief={brief}
          compiled={compiled}
          conflict={conflict}
          document={document}
          draft={effectiveRequirementsDraft}
          pathwayDocument={pathwayDocument}
          setDraft={setRequirementsDraft}
          sourceChanged={sourceChanged}
          useDeviceVersion={useDeviceVersion}
          useSecureVersion={useSecureVersion}
        />
      ) : null}
      {step.canvas === "proposal-evidence-strategy" && document ? <EvidenceStrategyStep
        activeTool={activeTool}
        onSave={saveEvidenceStrategy}
        onToolChange={setActiveTool}
        projectId={projectId}
        questions={proposalQuestions}
        route={route}
        strategy={document.evidenceStrategy.questionIds.length || document.evidenceStrategy.concepts.length || document.evidenceStrategy.searchVersions.length
          ? document.evidenceStrategy
          : createDefaultEvidenceStrategy(route, proposalQuestions.map((question) => question.id))}
      /> : null}
      {step.canvas === "proposal-evidence-review" ? <ProposalEvidenceReviewStudio cloudUserId={cloudUserId} onReadyChange={setReviewReady} onStatusChange={onStatusChange} projectId={projectId} questions={proposalQuestions} route={route} /> : null}
      {step.canvas === "proposal-synthesis" && document ? <ProposalSynthesisStudio
        claimEvidenceMap={document.claimEvidenceMap}
        cloudUserId={cloudUserId}
        evidenceStrategyReady={Boolean(evidenceStrategyCompilation?.ready)}
        key={document.identity.checksum}
        onReadyChange={setSynthesisReady}
        onSave={saveClaimEvidenceMap}
        onStatusChange={onStatusChange}
        projectId={projectId}
        questions={proposalQuestions}
        route={route}
      /> : null}
      {step.canvas === "proposal-study-contract" && document ? <ProposalStudyContractStudio
        claimEvidenceMap={document.claimEvidenceMap}
        cloudUserId={cloudUserId}
        contract={document.proposedStudyContract}
        evidenceStrategyReady={Boolean(evidenceStrategyCompilation?.ready)}
        key={document.identity.checksum}
        legacyRoadmap={<LegacyRoadmapPanel pathwayDraft={pathwayDraft} stepDraft={stepDraft} updateField={updateField} />}
        onReadyChange={setStudyContractReady}
        onSave={saveProposedStudyContract}
        onStatusChange={onStatusChange}
        projectId={projectId}
        questions={proposalStudyQuestions}
        route={studyRoute}
      /> : null}
      {step.canvas === "proposal-compose" && document ? <ProposalComposerStudio
        cloudUserId={cloudUserId}
        document={document}
        evidenceStrategyReady={Boolean(evidenceStrategyCompilation?.ready)}
        key={document.identity.checksum}
        onReadyChange={setCompositionReady}
        onSave={saveProposalSections}
        onStatusChange={onStatusChange}
        projectId={projectId}
        questions={proposalStudyQuestions}
        requirementsReady={Boolean(compiled.ready && profileIsMaterialized && !sourceChanged && storedAuthorityDrift.length === 0)}
        route={studyRoute}
      /> : null}
      {step.canvas === "proposal-verify" && document && sourceReferences[0] ? <ProposalHandoffStudio
        cloudUserId={cloudUserId}
        document={document}
        evidenceStrategyReady={Boolean(evidenceStrategyCompilation?.ready)}
        key={`${document.identity.checksum}:${sourceReferences[0].checksum}`}
        onBaselineChange={onBaselineChange}
        onHandoffChange={onHandoffChange}
        onReadyChange={setHandoffReady}
        onStatusChange={onStatusChange}
        pathwayReady={Boolean(pathwayDocument && !sourceChanged)}
        pathwayReference={sourceReferences[0]}
        projectId={projectId}
        questions={proposalStudyQuestions}
        requirementsReady={Boolean(compiled.ready && profileIsMaterialized && !sourceChanged && storedAuthorityDrift.length === 0)}
        route={studyRoute}
      /> : null}
    </div>
  );
}
