"use client";

import Link from "next/link";
import { useState } from "react";
import { AppIcon } from "@/components/app-shell/AppIcons";
import {
  assessResearchPathwayReadiness,
  compareResearchPathwayRevisions,
  terminologyForResearchIntent,
} from "@/lib/research/researchPathwayBrief";
import type { ResearchPathwayDocument } from "@/lib/research/researchPathwayDocument";
import {
  RESEARCH_BASELINE_SOURCES,
  RESEARCH_CRITERION_RATINGS,
  RESEARCH_IDEA_KINDS,
  RESEARCH_QUESTION_FAMILIES,
} from "@/lib/research/researchPathwayPhase2Model";
import type { ResearchPathDraft, StepDraft } from "@/lib/research/researchPathDraft";
import {
  addResearchPathwayRow,
  archiveResearchPathwayRow,
  moveResearchPathwayRow,
  removeEmptyResearchPathwayRow,
  researchPathwayArchiveProtectionReason,
  researchPathwayRowHasContent,
  researchPathwayRowRoster,
  restoreResearchPathwayRow,
  type ResearchPathwayRowCollection,
} from "@/lib/research/researchPathwayPhase3Rows";
import styles from "./Stage1ResearchFramingStudio.module.css";

const ACTIVE_ITEM_STATUSES = ["exploring", "promising", "selected"] as const;

interface Stage1ResearchFramingStudioProps {
  activeStepId: string;
  document: ResearchPathwayDocument | null;
  previousDocument: ResearchPathwayDocument | null;
  pathwayDraft: ResearchPathDraft;
  projectId: string;
  stepDraft: StepDraft;
  mutateFields: (updater: (fields: Record<string, string>) => Record<string, string>) => void;
  updateField: (key: string, value: string) => void;
}

function rowSummary(collection: ResearchPathwayRowCollection, slot: string, fields: Record<string, string>): string {
  if (collection === "ideas") return fields[`idea-${slot}-text`] || "Untitled idea";
  if (collection === "parking") return fields[`parking-${slot}-text`] || "Empty parked thought";
  if (collection === "problems") return fields[`frame-${slot}-title`] || fields[`frame-${slot}-uncertainty`] || "Untitled problem frame";
  if (collection === "baseline") return fields[`baseline-${slot}-known`] || fields[`baseline-${slot}-missing`] || "Untitled baseline entry";
  return fields[`question-${slot}-text`] || "Untitled research question";
}

function CollectionHeader({ collection, label, mutateFields, roster }: {
  collection: ResearchPathwayRowCollection;
  label: string;
  mutateFields: Stage1ResearchFramingStudioProps["mutateFields"];
  roster: ReturnType<typeof researchPathwayRowRoster>;
}) {
  const atLimit = roster.active.length + roster.archived.length >= roster.maximumRows;
  return (
    <div className={styles.collectionActions}>
      <span>{roster.active.length} active · {roster.archived.length} archived · {roster.maximumRows} maximum</span>
      <button disabled={atLimit} onClick={() => mutateFields((fields) => addResearchPathwayRow(fields, collection).fields)} type="button">
        <AppIcon name="plus" />Add {label}
      </button>
    </div>
  );
}

function RowActions({ collection, index, pathwayDraft, roster, slot, stepDraft, mutateFields }: {
  collection: ResearchPathwayRowCollection;
  index: number;
  pathwayDraft: ResearchPathDraft;
  roster: ReturnType<typeof researchPathwayRowRoster>;
  slot: string;
  stepDraft: StepDraft;
  mutateFields: Stage1ResearchFramingStudioProps["mutateFields"];
}) {
  const hasContent = researchPathwayRowHasContent(stepDraft.fields, collection, slot);
  const protection = researchPathwayArchiveProtectionReason(collection, slot, pathwayDraft);
  const onlyRow = roster.active.length <= 1;
  const removeLabel = hasContent ? "Archive row" : "Remove empty row";
  const remove = () => mutateFields((fields) => hasContent
    ? archiveResearchPathwayRow(fields, collection, slot)
    : removeEmptyResearchPathwayRow(fields, collection, slot));
  return (
    <div className={styles.rowActions}>
      <button aria-label="Move row up" disabled={index === 0} onClick={() => mutateFields((fields) => moveResearchPathwayRow(fields, collection, slot, -1))} type="button"><AppIcon name="arrow-left" /></button>
      <button aria-label="Move row down" disabled={index === roster.active.length - 1} onClick={() => mutateFields((fields) => moveResearchPathwayRow(fields, collection, slot, 1))} type="button"><AppIcon name="arrow-right" /></button>
      <button aria-label={removeLabel} disabled={onlyRow || Boolean(protection)} onClick={remove} title={protection ?? (onlyRow ? "Keep at least one active row." : removeLabel)} type="button"><AppIcon name="trash" /></button>
    </div>
  );
}

function ArchivedRows({ collection, mutateFields, roster, stepDraft }: {
  collection: ResearchPathwayRowCollection;
  mutateFields: Stage1ResearchFramingStudioProps["mutateFields"];
  roster: ReturnType<typeof researchPathwayRowRoster>;
  stepDraft: StepDraft;
}) {
  if (!roster.archived.length) return null;
  return (
    <details className={styles.archivedRows}>
      <summary>Archived rows ({roster.archived.length})</summary>
      <div>{roster.archived.map((slot) => <article key={slot}><span>{rowSummary(collection, slot, stepDraft.fields)}</span><button onClick={() => mutateFields((fields) => restoreResearchPathwayRow(fields, collection, slot))} type="button"><AppIcon name="refresh" />Restore</button></article>)}</div>
    </details>
  );
}

function Field({ label, fieldKey, stepDraft, updateField, placeholder = "", rows: textRows = 3 }: {
  label: string;
  fieldKey: string;
  stepDraft: StepDraft;
  updateField: (key: string, value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <textarea onChange={(event) => updateField(fieldKey, event.target.value)} placeholder={placeholder} rows={textRows} value={stepDraft.fields[fieldKey] ?? ""} />
    </label>
  );
}

function SelectField({ label, fieldKey, options, stepDraft, updateField }: {
  label: string;
  fieldKey: string;
  options: readonly (readonly [string, string])[];
  stepDraft: StepDraft;
  updateField: (key: string, value: string) => void;
}) {
  return (
    <label className={styles.selectField}>
      <span>{label}</span>
      <select onChange={(event) => updateField(fieldKey, event.target.value)} value={stepDraft.fields[fieldKey] ?? ""}>
        <option value="">Choose…</option>
        {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
      </select>
    </label>
  );
}

function CaptureConcern({ mutateFields, pathwayDraft, stepDraft, updateField }: Pick<Stage1ResearchFramingStudioProps, "mutateFields" | "pathwayDraft" | "stepDraft" | "updateField">) {
  const ideaRoster = researchPathwayRowRoster(stepDraft.fields, "ideas");
  const parkingRoster = researchPathwayRowRoster(stepDraft.fields, "parking");
  return (
    <div className={styles.studioBody}>
      <section className={styles.editorialLead}>
        <p className={styles.kicker}>Start in your own language</p>
        <h2>Hold onto the concern before trying to make it sound academic.</h2>
        <p>This is a thinking space. Record observations and curiosities without forcing an early method, variable, hypothesis, or solution.</p>
      </section>
      <div className={styles.leadGrid}>
        <Field fieldKey="concern-narrative" label="What keeps drawing your attention?" placeholder="Describe the event, contradiction, experience, or pattern as you currently see it…" rows={7} stepDraft={stepDraft} updateField={updateField} />
        <div className={styles.stack}>
          <Field fieldKey="concern-affected" label="Who, what, or which context seems affected?" rows={3} stepDraft={stepDraft} updateField={updateField} />
          <Field fieldKey="concern-matters" label="Why might it matter?" rows={3} stepDraft={stepDraft} updateField={updateField} />
        </div>
      </div>
      <section className={styles.sectionBlock}>
        <div className={styles.sectionHeading}><div><p className={styles.kicker}>Idea sparks</p><h3>Keep several threads alive</h3></div><span>Add, order, or archive thoughts without making this page longer.</span></div>
        <CollectionHeader collection="ideas" label="idea" mutateFields={mutateFields} roster={ideaRoster} />
        <div className={styles.tableScroll}>
          <table className={styles.dataTable}>
            <thead><tr><th>Type</th><th>Idea in your words</th><th>Affected context</th><th>Status</th><th>Row</th></tr></thead>
            <tbody>{ideaRoster.active.map((slot, index) => (
              <tr key={slot}>
                <td><select aria-label={`Idea ${index + 1} type`} onChange={(event) => updateField(`idea-${slot}-kind`, event.target.value)} value={stepDraft.fields[`idea-${slot}-kind`] ?? ""}><option value="">Choose…</option>{RESEARCH_IDEA_KINDS.map((item) => <option key={item} value={item}>{item.replaceAll("-", " ")}</option>)}</select></td>
                <td><textarea aria-label={`Idea ${index + 1}`} onChange={(event) => updateField(`idea-${slot}-text`, event.target.value)} rows={2} value={stepDraft.fields[`idea-${slot}-text`] ?? ""} /></td>
                <td><textarea aria-label={`Idea ${index + 1} affected context`} onChange={(event) => updateField(`idea-${slot}-affected`, event.target.value)} rows={2} value={stepDraft.fields[`idea-${slot}-affected`] ?? ""} /></td>
                <td><select aria-label={`Idea ${index + 1} status`} onChange={(event) => updateField(`idea-${slot}-status`, event.target.value)} value={stepDraft.fields[`idea-${slot}-status`] ?? "exploring"}>{ACTIVE_ITEM_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}</select></td>
                <td><RowActions collection="ideas" index={index} mutateFields={mutateFields} pathwayDraft={pathwayDraft} roster={ideaRoster} slot={slot} stepDraft={stepDraft} /></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <ArchivedRows collection="ideas" mutateFields={mutateFields} roster={ideaRoster} stepDraft={stepDraft} />
      </section>
      <section className={styles.parkingLot}>
        <div><p className={styles.kicker}>Parking lot</p><h3>Save useful thoughts without letting them hijack the current path.</h3></div>
        <div className={styles.parkingRows}><CollectionHeader collection="parking" label="thought" mutateFields={mutateFields} roster={parkingRoster} />{parkingRoster.active.map((slot, index) => <div className={styles.parkingRow} key={slot}><input aria-label={`Parked thought ${index + 1}`} onChange={(event) => updateField(`parking-${slot}-text`, event.target.value)} placeholder={`Parked thought ${index + 1}`} value={stepDraft.fields[`parking-${slot}-text`] ?? ""} /><RowActions collection="parking" index={index} mutateFields={mutateFields} pathwayDraft={pathwayDraft} roster={parkingRoster} slot={slot} stepDraft={stepDraft} /></div>)}<ArchivedRows collection="parking" mutateFields={mutateFields} roster={parkingRoster} stepDraft={stepDraft} /></div>
      </section>
    </div>
  );
}

function ShapeProblems({ document, mutateFields, pathwayDraft, stepDraft, updateField }: Pick<Stage1ResearchFramingStudioProps, "document" | "mutateFields" | "pathwayDraft" | "stepDraft" | "updateField">) {
  const roster = researchPathwayRowRoster(stepDraft.fields, "problems");
  const [requestedActive, setActive] = useState(roster.active[0]);
  const active = roster.active.includes(requestedActive) ? requestedActive : roster.active[0];
  const prefix = `frame-${active}`;
  const intent = document?.decision.route.intent;
  return (
    <div className={styles.studioBody}>
      <section className={styles.editorialLead}><p className={styles.kicker}>Alternative frames</p><h2>A concern can support more than one honest problem definition.</h2><p>Compare frames before selecting one. Cerise keeps observed basis, interpretation, assumptions, and alternative explanations distinct.</p></section>
      <div className={styles.contextLine}><span>{intent ? `${intent.replaceAll("-", " ")} language active` : "Route not chosen yet — neutral research language"}</span><strong>Select a row to examine its reasoning</strong></div>
      <CollectionHeader collection="problems" label="problem frame" mutateFields={mutateFields} roster={roster} />
      <div className={`${styles.tableScroll} ${styles.matrixScroll}`}>
        <table className={`${styles.dataTable} ${styles.candidateMatrix}`}>
          <thead><tr><th>Candidate</th><th>Observation or situation</th><th>Who or what is affected</th><th>Consequence or stake</th><th>Uncertain, contested, or unexplained</th><th>Status</th><th>Row</th></tr></thead>
          <tbody>{roster.active.map((slot, index) => <tr className={active === slot ? styles.matrixRowActive : undefined} key={slot}>
            <td><button aria-pressed={active === slot} onClick={() => setActive(slot)} type="button"><span>Frame {index + 1}</span><strong>{stepDraft.fields[`frame-${slot}-title`] || "Untitled frame"}</strong></button></td>
            <td>{stepDraft.fields[`frame-${slot}-situation`] || <span className={styles.emptyCell}>Add situation</span>}</td>
            <td>{stepDraft.fields[`frame-${slot}-affected`] || <span className={styles.emptyCell}>Add affected context</span>}</td>
            <td>{stepDraft.fields[`frame-${slot}-consequence`] || <span className={styles.emptyCell}>Add consequence</span>}</td>
            <td>{stepDraft.fields[`frame-${slot}-uncertainty`] || <span className={styles.emptyCell}>Add uncertainty</span>}</td>
            <td>{stepDraft.fields[`frame-${slot}-status`] || "exploring"}</td>
            <td><RowActions collection="problems" index={index} mutateFields={mutateFields} pathwayDraft={pathwayDraft} roster={roster} slot={slot} stepDraft={stepDraft} /></td>
          </tr>)}</tbody>
        </table>
      </div>
      <ArchivedRows collection="problems" mutateFields={mutateFields} roster={roster} stepDraft={stepDraft} />
      <section className={styles.sectionBlock}>
        <div className={styles.inlineFields}>
          <Field fieldKey={`${prefix}-title`} label="Working title" rows={2} stepDraft={stepDraft} updateField={updateField} />
          <SelectField fieldKey={`${prefix}-status`} label="Status" options={ACTIVE_ITEM_STATUSES.map((item) => [item, item])} stepDraft={stepDraft} updateField={updateField} />
        </div>
        <div className={styles.problemGrid}>
          <Field fieldKey={`${prefix}-situation`} label="Situation or context" placeholder="What is happening, where, and under which conditions?" rows={4} stepDraft={stepDraft} updateField={updateField} />
          <Field fieldKey={`${prefix}-affected`} label="Who or what is affected" rows={4} stepDraft={stepDraft} updateField={updateField} />
          <Field fieldKey={`${prefix}-consequence`} label="Why the situation matters" rows={4} stepDraft={stepDraft} updateField={updateField} />
          <Field fieldKey={`${prefix}-uncertainty`} label="Researchable uncertainty" placeholder="What remains genuinely unknown or contested?" rows={4} stepDraft={stepDraft} updateField={updateField} />
        </div>
      </section>
      <section className={styles.comparisonBand}>
        <div className={styles.sectionHeading}><div><p className={styles.kicker}>Reasoning audit</p><h3>Keep the frame intellectually honest</h3></div></div>
        <div className={styles.comparisonGrid}>
          <Field fieldKey={`${prefix}-observed`} label="Observed or documented basis" rows={4} stepDraft={stepDraft} updateField={updateField} />
          <Field fieldKey={`${prefix}-interpretation`} label="Your current interpretation" rows={4} stepDraft={stepDraft} updateField={updateField} />
          <Field fieldKey={`${prefix}-assumptions`} label="Assumptions being made" rows={4} stepDraft={stepDraft} updateField={updateField} />
          <Field fieldKey={`${prefix}-alternatives`} label="Alternative explanations" rows={4} stepDraft={stepDraft} updateField={updateField} />
        </div>
      </section>
    </div>
  );
}

function ExploreBaseline({ mutateFields, pathwayDraft, projectId, stepDraft, updateField, document }: Pick<Stage1ResearchFramingStudioProps, "mutateFields" | "pathwayDraft" | "projectId" | "stepDraft" | "updateField" | "document">) {
  const roster = researchPathwayRowRoster(stepDraft.fields, "baseline");
  const [requestedActive, setActive] = useState(roster.active[0]);
  const active = roster.active.includes(requestedActive) ? requestedActive : roster.active[0];
  const intent = document?.decision.route.intent ?? null;
  const terms = terminologyForResearchIntent(intent);
  const prefix = `baseline-${active}`;
  return (
    <div className={styles.studioBody}>
      <section className={styles.routeStrip}><div><p className={styles.kicker}>{intent ? intent.replaceAll("-", " ") : "Route still open"}</p><h2>{terms.baselineGuidance}</h2></div><dl><div><dt>Evidence unit</dt><dd>{terms.evidenceUnit}</dd></div><div><dt>Scope</dt><dd>{terms.scopeLabel}</dd></div></dl></section>
      <nav className={styles.toolLinks} aria-label="Baseline evidence tools"><Link href={`/dashboard/project/${projectId}/scholar-ask`}>ScholarAsk <span>Search and question the literature</span></Link><Link href={`/dashboard/upload?project=${projectId}`}>Workspace <span>Read, annotate, and code sources</span></Link><Link href="/evidence-library">Evidence Library <span>Compare saved evidence</span></Link></nav>
      <CollectionHeader collection="baseline" label="baseline entry" mutateFields={mutateFields} roster={roster} />
      <div className={styles.tabScroller}><div className={styles.frameTabs} role="tablist" aria-label="Baseline entries">{roster.active.map((slot, index) => <button aria-selected={active === slot} key={slot} onClick={() => setActive(slot)} role="tab" type="button"><span>Entry {index + 1}</span><strong>{stepDraft.fields[`baseline-${slot}-source`] || "Choose source"}</strong><small>{stepDraft.fields[`baseline-${slot}-status`] || "exploring"}</small></button>)}</div></div>
      <div className={styles.activeRowActions}><span>Arrange or archive the selected baseline entry</span><RowActions collection="baseline" index={roster.active.indexOf(active)} mutateFields={mutateFields} pathwayDraft={pathwayDraft} roster={roster} slot={active} stepDraft={stepDraft} /></div>
      <ArchivedRows collection="baseline" mutateFields={mutateFields} roster={roster} stepDraft={stepDraft} />
      <section className={styles.sectionBlock}>
        <div className={styles.inlineFields}><SelectField fieldKey={`${prefix}-source`} label="Evidence surface" options={RESEARCH_BASELINE_SOURCES.map((item) => [item, item.replaceAll("-", " ")])} stepDraft={stepDraft} updateField={updateField} /><SelectField fieldKey={`${prefix}-status`} label="Status" options={ACTIVE_ITEM_STATUSES.map((item) => [item, item])} stepDraft={stepDraft} updateField={updateField} /><Field fieldKey={`${prefix}-linked-frames`} label="Linked problem-frame IDs" placeholder="problem-frame-1" rows={2} stepDraft={stepDraft} updateField={updateField} /></div>
        <div className={styles.evidenceStateGrid}><Field fieldKey={`${prefix}-known`} label="Known" rows={5} stepDraft={stepDraft} updateField={updateField} /><Field fieldKey={`${prefix}-contested`} label="Contested" rows={5} stepDraft={stepDraft} updateField={updateField} /><Field fieldKey={`${prefix}-missing`} label="Missing" rows={5} stepDraft={stepDraft} updateField={updateField} /><Field fieldKey={`${prefix}-assumed`} label="Assumed" rows={5} stepDraft={stepDraft} updateField={updateField} /></div>
        <div className={styles.problemGrid}><Field fieldKey={`${prefix}-search-terms`} label="Search terms and synonyms" rows={3} stepDraft={stepDraft} updateField={updateField} /><Field fieldKey={`${prefix}-adjacent`} label="Adjacent disciplines or perspectives" rows={3} stepDraft={stepDraft} updateField={updateField} /><Field fieldKey={`${prefix}-missing-voices`} label="Missing voices or source perspectives" rows={3} stepDraft={stepDraft} updateField={updateField} /><Field fieldKey={`${prefix}-evidence-refs`} label="Evidence reference IDs" rows={3} stepDraft={stepDraft} updateField={updateField} /></div>
      </section>
      <Field fieldKey="baseline-synthesis" label="Baseline synthesis" placeholder="Synthesize what is established, contested, missing, and assumed without overstating the evidence." rows={5} stepDraft={stepDraft} updateField={updateField} />
    </div>
  );
}

function DevelopQuestions({ document, mutateFields, pathwayDraft, stepDraft, updateField }: Pick<Stage1ResearchFramingStudioProps, "document" | "mutateFields" | "pathwayDraft" | "stepDraft" | "updateField">) {
  const roster = researchPathwayRowRoster(stepDraft.fields, "questions");
  const [requestedActive, setActive] = useState(roster.active[0]);
  const active = roster.active.includes(requestedActive) ? requestedActive : roster.active[0];
  const prefix = `question-${active}`;
  const terms = terminologyForResearchIntent(document?.decision.route.intent ?? null);
  return (
    <div className={styles.studioBody}>
      <section className={styles.editorialLead}><p className={styles.kicker}>Question workbench</p><h2>{terms.questionGuidance}</h2><p>Qualitative work is not forced into variables or hypotheses. Evidence syntheses use source and evidence-base language instead of participant-study fields.</p></section>
      <CollectionHeader collection="questions" label="candidate question" mutateFields={mutateFields} roster={roster} />
      <div className={styles.tabScroller}><div className={styles.questionList} role="tablist" aria-label="Candidate research questions">{roster.active.map((slot, index) => <button aria-selected={active === slot} key={slot} onClick={() => setActive(slot)} role="tab" type="button"><span>RQ{index + 1}</span><strong>{stepDraft.fields[`question-${slot}-text`] || "Add candidate question"}</strong><small>{stepDraft.fields[`question-${slot}-status`] || "exploring"}</small></button>)}</div></div>
      <div className={styles.activeRowActions}><span>Arrange or archive the selected candidate question</span><RowActions collection="questions" index={roster.active.indexOf(active)} mutateFields={mutateFields} pathwayDraft={pathwayDraft} roster={roster} slot={active} stepDraft={stepDraft} /></div>
      <ArchivedRows collection="questions" mutateFields={mutateFields} roster={roster} stepDraft={stepDraft} />
      <section className={styles.sectionBlock}>
        <Field fieldKey={`${prefix}-text`} label={`Candidate research question ${roster.active.indexOf(active) + 1}`} placeholder="Write one bounded, answerable question…" rows={4} stepDraft={stepDraft} updateField={updateField} />
        <div className={styles.inlineFields}><SelectField fieldKey={`${prefix}-family`} label="Question family" options={RESEARCH_QUESTION_FAMILIES.map((item) => [item, item.replaceAll("-", " ")])} stepDraft={stepDraft} updateField={updateField} /><SelectField fieldKey={`${prefix}-status`} label="Status" options={ACTIVE_ITEM_STATUSES.map((item) => [item, item])} stepDraft={stepDraft} updateField={updateField} /><Field fieldKey={`${prefix}-linked-frames`} label="Linked problem-frame IDs" rows={2} stepDraft={stepDraft} updateField={updateField} /><Field fieldKey={`${prefix}-linked-baseline`} label="Linked baseline-entry IDs" rows={2} stepDraft={stepDraft} updateField={updateField} /></div>
        <div className={styles.scopeGrid}><Field fieldKey={`${prefix}-scope-population`} label={terms.scopeLabel} rows={3} stepDraft={stepDraft} updateField={updateField} /><Field fieldKey={`${prefix}-scope-construct`} label="Construct, phenomenon, or focus" rows={3} stepDraft={stepDraft} updateField={updateField} /><Field fieldKey={`${prefix}-scope-setting`} label="Setting or context" rows={3} stepDraft={stepDraft} updateField={updateField} /><Field fieldKey={`${prefix}-scope-timeframe`} label="Timeframe" rows={3} stepDraft={stepDraft} updateField={updateField} /><Field fieldKey={`${prefix}-scope-comparison`} label="Comparison, contrast, or perspective" rows={3} stepDraft={stepDraft} updateField={updateField} /><Field fieldKey={`${prefix}-scope-evidence`} label="Evidence access" rows={3} stepDraft={stepDraft} updateField={updateField} /></div>
      </section>
      <section className={styles.comparisonBand}><div className={styles.sectionHeading}><div><p className={styles.kicker}>Question comparison</p><h3>Rate the question without pretending the decision is purely mechanical.</h3></div></div><div className={styles.criteriaGrid}>{(["significance", "interest", "feasibility", "ethics", "evidence", "contribution"] as const).map((criterion) => <SelectField fieldKey={`${prefix}-criterion-${criterion}`} key={criterion} label={criterion === "interest" ? "Researcher interest" : criterion === "evidence" ? "Evidence access" : criterion} options={RESEARCH_CRITERION_RATINGS.map((item) => [item, item])} stepDraft={stepDraft} updateField={updateField} />)}</div><div className={styles.problemGrid}><Field fieldKey={`${prefix}-implications`} label="Methodological implications—not commitments" rows={4} stepDraft={stepDraft} updateField={updateField} /><Field fieldKey={`${prefix}-assumptions`} label="Embedded assumptions" rows={4} stepDraft={stepDraft} updateField={updateField} /><Field fieldKey={`${prefix}-comparison-notes`} label="Comparison notes" rows={4} stepDraft={stepDraft} updateField={updateField} /></div></section>
    </div>
  );
}

function ChoosePathway({ document, previousDocument, stepDraft, updateField }: Pick<Stage1ResearchFramingStudioProps, "document" | "previousDocument" | "stepDraft" | "updateField">) {
  const readiness = document ? assessResearchPathwayReadiness(document) : null;
  const difference = document ? compareResearchPathwayRevisions(document, previousDocument) : null;
  const intent = stepDraft.fields["route-intent"] ?? "";
  const onIntent = (value: string) => {
    updateField("route-intent", value);
    if (value === "secondary-data") {
      updateField("route-assignment", "none"); updateField("route-audience", "not-participant"); updateField("route-setting", "import-only");
    } else if (value === "evidence-synthesis") {
      updateField("route-method", "evidence-synthesis"); updateField("route-assignment", "none"); updateField("route-audience", "not-participant"); updateField("route-setting", "not-applicable");
    }
  };
  const selectedProblems = document?.problemFrames.filter((item) => item.status === "selected") ?? [];
  const selectedQuestions = document?.questionCandidates.filter((item) => item.status === "selected") ?? [];
  return (
    <div className={styles.studioBody}>
      <section className={styles.routeStrip}><div><p className={styles.kicker}>Provisional decision</p><h2>Choose a pathway without turning it into an irreversible commitment.</h2><p>Stage 2 receives this exact selection, its rationale, evidence links, and unresolved uncertainties.</p></div><div className={readiness?.readyForStage2 ? styles.readySeal : styles.notReadySeal}>{readiness?.readyForStage2 ? "Ready for Stage 2" : `${readiness?.blockingIssueIds.length ?? 0} readiness items remain`}</div></section>
      <div className={styles.selectionCompare}><section><p className={styles.kicker}>Selected problem</p>{selectedProblems.length ? selectedProblems.map((item) => <article key={item.id}><strong>{item.title || item.uncertainty}</strong><p>{item.situation}</p><small>{item.id}</small></article>) : <p>No frame is marked selected yet.</p>}</section><section><p className={styles.kicker}>Selected question</p>{selectedQuestions.length ? selectedQuestions.map((item) => <article key={item.id}><strong>{item.text}</strong><p>{item.family?.replaceAll("-", " ") || "Family not chosen"}</p><small>{item.id}</small></article>) : <p>No question is marked selected yet.</p>}</section></div>
      <section className={styles.sectionBlock}>
        <div className={styles.sectionHeading}><div><p className={styles.kicker}>Route profile</p><h3>Tell later stages what kind of research product to build.</h3></div><span>Draft routing aid—not methodological, ethical, legal, or institutional approval.</span></div>
        <div className={styles.routeGrid}>
          <label className={styles.selectField}><span>Research intent</span><select onChange={(event) => onIntent(event.target.value)} value={intent}><option value="">Choose…</option><option value="primary-data">Primary data</option><option value="secondary-data">Secondary data</option><option value="evidence-synthesis">Evidence synthesis</option></select></label>
          <SelectField fieldKey="route-method" label="Method family" options={[["quantitative", "Quantitative"], ["qualitative", "Qualitative"], ["mixed-methods", "Mixed methods"], ["evidence-synthesis", "Evidence synthesis"]]} stepDraft={stepDraft} updateField={updateField} />
          <SelectField fieldKey="route-assignment" label="Assignment" options={[["none", "None"], ["non-randomized", "Non-randomized"], ["randomized", "Randomized"], ["undetermined", "Not decided yet"]]} stepDraft={stepDraft} updateField={updateField} />
          <SelectField fieldKey="route-setting" label="Setting" options={[["online-home", "Online / home"], ["laboratory", "Laboratory"], ["field", "Field"], ["telephone", "Telephone"], ["import-only", "Import only"], ["not-applicable", "Not applicable"], ["undetermined", "Not decided yet"]]} stepDraft={stepDraft} updateField={updateField} />
          <SelectField fieldKey="route-audience" label={intent === "primary-data" ? "Participant audience" : "Evidence audience"} options={[["adult", "Adults"], ["minor", "Minors"], ["capacity-limited", "Capacity may be limited"], ["not-participant", "No participant event"], ["undetermined", "Not decided yet"]]} stepDraft={stepDraft} updateField={updateField} />
          <SelectField fieldKey="route-sensitivity" label="Data sensitivity" options={[["public", "Public"], ["deidentified", "Deidentified"], ["restricted", "Restricted"], ["identifiable", "Identifiable"], ["undetermined", "Not decided yet"]]} stepDraft={stepDraft} updateField={updateField} />
          <SelectField fieldKey="route-confidence" label="Route confidence" options={[["low", "Low"], ["medium", "Medium"], ["high", "High"]]} stepDraft={stepDraft} updateField={updateField} />
          <Field fieldKey="route-special-procedures" label="Possible special procedures" placeholder="recording, deception, specimen…" rows={2} stepDraft={stepDraft} updateField={updateField} />
        </div>
      </section>
      <div className={styles.leadGrid}><Field fieldKey="pathway-rationale" label="Why this pathway?" placeholder="Explain what made this problem, question, and route more defensible than the alternatives." rows={7} stepDraft={stepDraft} updateField={updateField} /><Field fieldKey="pathway-uncertainties" label="Unresolved uncertainties" placeholder="One uncertainty per line. Stage 2 receives these exactly." rows={7} stepDraft={stepDraft} updateField={updateField} /></div>
      <section className={styles.backcastingChoice}><div><p className={styles.kicker}>Optional backcasting</p><h3>Use it when a desired future state genuinely helps frame the research.</h3><p>It is often useful for design-oriented, evaluative, implementation, or policy questions; it is not a universal research requirement.</p></div><SelectField fieldKey="backcasting-choice" label="Decision" options={[["use", "Use backcasting"], ["not-use", "Set it aside"]]} stepDraft={stepDraft} updateField={updateField} /></section>
      {stepDraft.fields["backcasting-choice"] === "use" ? <div className={styles.problemGrid}><Field fieldKey="backcasting-vision" label="Desired future state" rows={4} stepDraft={stepDraft} updateField={updateField} /><Field fieldKey="backcasting-baseline" label="Current baseline" rows={4} stepDraft={stepDraft} updateField={updateField} /><Field fieldKey="backcasting-concepts" label="Bridging concepts" rows={4} stepDraft={stepDraft} updateField={updateField} /><Field fieldKey="backcasting-roadmap" label="Research roadmap" rows={4} stepDraft={stepDraft} updateField={updateField} /></div> : null}
      <section className={styles.readinessPanel}><div className={styles.sectionHeading}><div><p className={styles.kicker}>Derived readiness</p><h3>The brief is compiled from resolved evidence—not manual completion boxes.</h3></div></div><div className={styles.readinessSteps}>{readiness?.steps.map((step, index) => <article key={step.stepId}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{step.status.replaceAll("-", " ")}</strong><small>{step.completed}/{step.total} conditions</small></div></article>)}</div>{readiness?.blockingIssueIds.length ? <ul>{readiness.blockingIssueIds.map((item) => <li key={item}>{item.replaceAll("-", " ")}</li>)}</ul> : <p className={styles.successNote}>The checksum-bound Research Pathway Brief can now hand the exact selected questions, rationale, evidence links, route, and uncertainties to Stage 2.</p>}</section>
      <section className={styles.changePanel}><div className={styles.sectionHeading}><div><p className={styles.kicker}>What changed?</p><h3>{difference?.hasPrevious ? `Compared with pathway revision ${difference.previousRevision}` : "A comparison appears after the next meaningful revision"}</h3></div></div>{difference?.hasPrevious ? <dl><div><dt>Primary question</dt><dd>{difference.primaryQuestionChanged ? "Changed" : "Unchanged"}</dd></div><div><dt>Route</dt><dd>{difference.routeChanged ? "Changed" : "Unchanged"}</dd></div><div><dt>Problem frames</dt><dd>+{difference.addedProblemFrameIds.length} / −{difference.removedProblemFrameIds.length} / {difference.changedProblemFrameIds.length} edited</dd></div><div><dt>Questions</dt><dd>+{difference.addedQuestionIds.length} / −{difference.removedQuestionIds.length} / {difference.changedQuestionIds.length} edited</dd></div></dl> : <p>Cerise preserves the earlier revision so changing the frame later does not erase the pathway you previously chose.</p>}</section>
    </div>
  );
}

export default function Stage1ResearchFramingStudio(props: Stage1ResearchFramingStudioProps) {
  let content;
  if (props.activeStepId === "stage-01-capture-concern") content = <CaptureConcern mutateFields={props.mutateFields} pathwayDraft={props.pathwayDraft} stepDraft={props.stepDraft} updateField={props.updateField} />;
  else if (props.activeStepId === "stage-01-shape-problems") content = <ShapeProblems document={props.document} mutateFields={props.mutateFields} pathwayDraft={props.pathwayDraft} stepDraft={props.stepDraft} updateField={props.updateField} />;
  else if (props.activeStepId === "stage-01-explore-baseline") content = <ExploreBaseline document={props.document} mutateFields={props.mutateFields} pathwayDraft={props.pathwayDraft} projectId={props.projectId} stepDraft={props.stepDraft} updateField={props.updateField} />;
  else if (props.activeStepId === "stage-01-develop-questions") content = <DevelopQuestions document={props.document} mutateFields={props.mutateFields} pathwayDraft={props.pathwayDraft} stepDraft={props.stepDraft} updateField={props.updateField} />;
  else content = <ChoosePathway document={props.document} previousDocument={props.previousDocument} stepDraft={props.stepDraft} updateField={props.updateField} />;
  return <div className={styles.studio}>{content}</div>;
}
