"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
  type SyntheticEvent,
} from "react";
import { AppIcon } from "@/components/app-shell/AppIcons";
import {
  MAX_QUALITATIVE_SOURCES,
  buildQualitativeAnalysisExport,
  buildQualitativeCodeSourceMatrix,
  createLoadedQualitativeSource,
  createQualitativeAnalysisDocument,
  createQualitativeSegment,
  freezeQualitativeCodebook,
  isQualitativeAnalysisReady,
  markQualitativeAnalysisReviewed,
  readQualitativeAnalysisDocument,
  updateQualitativeAnalysisDocument,
  verifyLoadedQualitativeSource,
  writeQualitativeAnalysisDocument,
  type IntegrationRelationship,
  type LoadedQualitativeSource,
  type MemoScope,
  type MixedMethodsDesign,
  type QualitativeAnalysisDocument,
  type QualitativeCode,
  type QualitativeConsentScope,
  type QualitativeLaneMode,
  type QualitativeSegment,
  type QualitativeTheme,
  type RedactionStatus,
  type TriangulationKind,
  type QuotationUse,
} from "@/lib/research/qualitativeAnalysis";
import styles from "./QualitativeAnalysisWorkspace.module.css";

interface QualitativeAnalysisWorkspaceProps {
  projectId: string;
  projectName: string;
}

type PanelId =
  | "scope"
  | "sources"
  | "codebook"
  | "coding"
  | "memos"
  | "themes"
  | "integration"
  | "review";

const PANELS: Array<{ id: PanelId; label: string; short: string }> = [
  { id: "scope", label: "Inquiry scope", short: "Scope" },
  { id: "sources", label: "Local sources", short: "Sources" },
  { id: "codebook", label: "Versioned codebook", short: "Codebook" },
  { id: "coding", label: "Manual coding", short: "Coding" },
  { id: "memos", label: "Analytic memos", short: "Memos" },
  { id: "themes", label: "Themes & triangulation", short: "Themes" },
  { id: "integration", label: "Mixed-method integration", short: "Integrate" },
  { id: "review", label: "Review & export", short: "Export" },
];

const CODE_COLORS = [
  "#8b3151",
  "#245c6f",
  "#6c5b24",
  "#3d6b4f",
  "#604281",
  "#8a4b24",
];

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function safeExportName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "cerise-qualitative-analysis";
}

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function formatDate(value: string): string {
  if (!value) return "Not yet";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "Not yet"
    : new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(parsed);
}

function readinessLabel(document: QualitativeAnalysisDocument): string {
  const labels: Record<QualitativeAnalysisDocument["readiness"]["status"], string> = {
    "needs-scope": "Scope required",
    "needs-sources": "Sources required",
    "needs-coding": "Coding required",
    "needs-themes": "Theme review required",
    "needs-integration": "Integration required",
    "needs-review": "Confirmation required",
    "needs-export": "Export required",
    ready: "Ready",
  };
  return labels[document.readiness.status];
}

function GateItem({ complete, label }: { complete: boolean; label: string }) {
  return (
    <li className={complete ? styles.gateComplete : ""}>
      <span>{complete ? <AppIcon name="check-square" /> : null}</span>
      {label}
    </li>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <textarea
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        value={value}
      />
    </label>
  );
}

function ChoiceList({
  ariaLabel,
  items,
  selected,
  onToggle,
}: {
  ariaLabel: string;
  items: Array<{ id: string; label: string; color?: string }>;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  if (items.length === 0) return <p className={styles.emptyInline}>Nothing is available yet.</p>;
  return (
    <div aria-label={ariaLabel} className={styles.choiceList}>
      {items.map((item) => (
        <label key={item.id}>
          <input
            checked={selected.includes(item.id)}
            onChange={() => onToggle(item.id)}
            type="checkbox"
          />
          {item.color ? <span style={{ background: item.color }} /> : null}
          {item.label}
        </label>
      ))}
    </div>
  );
}

export default function QualitativeAnalysisWorkspace({
  projectId,
  projectName,
}: QualitativeAnalysisWorkspaceProps) {
  const [analysis, setAnalysis] = useState<QualitativeAnalysisDocument>(() => (
    createQualitativeAnalysisDocument(projectId)
  ));
  const [loadedSources, setLoadedSources] = useState<Record<string, LoadedQualitativeSource>>({});
  const [activePanel, setActivePanel] = useState<PanelId>("scope");
  const [activeSourceId, setActiveSourceId] = useState("");
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [codebookRationale, setCodebookRationale] = useState("");
  const [memoScope, setMemoScope] = useState<MemoScope>("study");
  const [memoTitle, setMemoTitle] = useState("");
  const [memoBody, setMemoBody] = useState("");
  const [memoLinkId, setMemoLinkId] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const transcriptInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = readQualitativeAnalysisDocument(window.localStorage, projectId);
    if (stored) setAnalysis(stored);
    setHydrated(true);
  }, [projectId]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      writeQualitativeAnalysisDocument(window.localStorage, analysis);
    } catch {
      setError("Browser storage is unavailable or the qualitative record is too large.");
    }
  }, [analysis, hydrated]);

  useEffect(() => {
    if (!activeSourceId && analysis.sources[0]) {
      setActiveSourceId(analysis.sources[0].id);
    }
    if (activeSourceId && !analysis.sources.some((source) => source.id === activeSourceId)) {
      setActiveSourceId(analysis.sources[0]?.id ?? "");
    }
  }, [activeSourceId, analysis.sources]);

  const update = useCallback((
    changes: Parameters<typeof updateQualitativeAnalysisDocument>[1],
  ) => {
    try {
      setAnalysis((current) => updateQualitativeAnalysisDocument(current, changes));
      setError("");
      setNotice("Saved locally");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The change could not be saved.");
    }
  }, []);

  const activeLoadedSource = loadedSources[activeSourceId] ?? null;
  const matrix = useMemo(() => buildQualitativeCodeSourceMatrix(analysis), [analysis]);
  const latestCodebook = analysis.codebookVersions.at(-1);
  const selectedText = activeLoadedSource && selection.end > selection.start
    ? activeLoadedSource.text.slice(selection.start, selection.end)
    : "";
  const allSegmentsReviewed = analysis.segments.length > 0 && analysis.segments.every(
    (segment) => (
      segment.codeIds.length > 0
      && segment.quotationUse !== "not-reviewed"
      && segment.redactionStatus !== "not-reviewed"
    ),
  );
  const themesReviewed = analysis.themes.length > 0 && analysis.themes.every(
    (theme) => (
      theme.statement.trim()
      && theme.boundary.trim()
      && theme.supportingSegmentIds.length > 0
      && theme.negativeCaseReview.trim()
    ),
  );
  const sourceReviewComplete = analysis.sources.length > 0 && analysis.sources.every(
    (source) => source.consentScope !== "not-reviewed",
  );

  const importTranscripts = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    if (analysis.sources.length + files.length > MAX_QUALITATIVE_SOURCES) {
      setError(`Phase 8.9 accepts at most ${MAX_QUALITATIVE_SOURCES} transcript sources.`);
      return;
    }
    setProcessing(true);
    setError("");
    setNotice("");
    try {
      let nextDocument = analysis;
      const nextLoaded = { ...loadedSources };
      for (const file of files) {
        const text = await file.text();
        const loaded = await createLoadedQualitativeSource(
          file.name,
          text,
          nextDocument.sources.map((source) => source.id),
        );
        const existing = nextDocument.sources.find(
          (source) => (
            source.textChecksum === loaded.source.textChecksum
            && source.originalFilename === file.name
          ),
        );
        if (existing) {
          const reselected = { source: existing, text };
          if (!await verifyLoadedQualitativeSource(reselected, existing)) {
            throw new Error(`${file.name} does not match the previously imported source.`);
          }
          nextLoaded[existing.id] = reselected;
          setActiveSourceId(existing.id);
        } else {
          nextDocument = updateQualitativeAnalysisDocument(nextDocument, {
            sources: [...nextDocument.sources, loaded.source],
          });
          nextLoaded[loaded.source.id] = loaded;
          setActiveSourceId(loaded.source.id);
        }
      }
      setAnalysis(nextDocument);
      setLoadedSources(nextLoaded);
      setNotice(`${files.length} local transcript file(s) verified in this tab.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The transcript could not be imported.");
    } finally {
      setProcessing(false);
    }
  }, [analysis, loadedSources]);

  const reselectSource = useCallback(async (
    event: ChangeEvent<HTMLInputElement>,
    sourceId: string,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    const expected = analysis.sources.find((source) => source.id === sourceId);
    if (!file || !expected) return;
    setProcessing(true);
    setError("");
    try {
      const loaded: LoadedQualitativeSource = {
        source: expected,
        text: await file.text(),
      };
      if (!await verifyLoadedQualitativeSource(loaded, expected)) {
        throw new Error("That file does not match the stored transcript checksum and size.");
      }
      setLoadedSources((current) => ({ ...current, [sourceId]: loaded }));
      setActiveSourceId(sourceId);
      setNotice(`${expected.label} is verified in this tab.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The transcript could not be verified.");
    } finally {
      setProcessing(false);
    }
  }, [analysis.sources]);

  const updateSource = useCallback((
    sourceId: string,
    patch: Partial<QualitativeAnalysisDocument["sources"][number]>,
  ) => {
    update({
      sources: analysis.sources.map((source) => (
        source.id === sourceId ? { ...source, ...patch } : source
      )),
    });
  }, [analysis.sources, update]);

  const addCode = useCallback(() => {
    const timestamp = new Date().toISOString();
    const code: QualitativeCode = {
      id: newId("code"),
      name: `New code ${analysis.codes.length + 1}`,
      definition: "",
      inclusionCriteria: "",
      exclusionCriteria: "",
      origin: "emergent",
      color: CODE_COLORS[analysis.codes.length % CODE_COLORS.length],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    update({ codes: [...analysis.codes, code] });
  }, [analysis.codes, update]);

  const updateCode = useCallback((codeId: string, patch: Partial<QualitativeCode>) => {
    const timestamp = new Date().toISOString();
    update({
      codes: analysis.codes.map((code) => (
        code.id === codeId ? { ...code, ...patch, updatedAt: timestamp } : code
      )),
    });
  }, [analysis.codes, update]);

  const freezeCodebook = useCallback(async () => {
    setProcessing(true);
    setError("");
    try {
      const next = await freezeQualitativeCodebook(analysis, codebookRationale);
      setAnalysis(next);
      setCodebookRationale("");
      setNotice(`Codebook version ${next.codebookVersions.length} frozen locally.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The codebook could not be frozen.");
    } finally {
      setProcessing(false);
    }
  }, [analysis, codebookRationale]);

  const captureSelection = useCallback((event: SyntheticEvent<HTMLTextAreaElement>) => {
    setSelection({
      start: event.currentTarget.selectionStart,
      end: event.currentTarget.selectionEnd,
    });
  }, []);

  const addSelectedSegment = useCallback(async () => {
    if (!activeLoadedSource) {
      setError("Re-select the exact transcript in this tab before coding.");
      return;
    }
    setProcessing(true);
    setError("");
    try {
      const segment = await createQualitativeSegment(
        activeLoadedSource,
        selection.start,
        selection.end,
        analysis.segments.map((item) => item.id),
      );
      setAnalysis(updateQualitativeAnalysisDocument(analysis, {
        segments: [...analysis.segments, segment],
      }));
      setSelection({ start: 0, end: 0 });
      setNotice("The selected segment was added by offsets and checksum; its raw text was not stored.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The segment could not be added.");
    } finally {
      setProcessing(false);
    }
  }, [activeLoadedSource, analysis, selection.end, selection.start]);

  const updateSegment = useCallback((
    segmentId: string,
    patch: Partial<QualitativeSegment>,
  ) => {
    const updatedAt = new Date().toISOString();
    update({
      segments: analysis.segments.map((segment) => (
        segment.id === segmentId ? { ...segment, ...patch, updatedAt } : segment
      )),
    });
  }, [analysis.segments, update]);

  const addMemo = useCallback(() => {
    if (!memoTitle.trim() || !memoBody.trim()) {
      setError("Add a memo title and analytic reflection first.");
      return;
    }
    const timestamp = new Date().toISOString();
    update({
      memos: [...analysis.memos, {
        id: newId("memo"),
        scope: memoScope,
        sourceId: memoScope === "source" ? memoLinkId : "",
        segmentId: memoScope === "segment" ? memoLinkId : "",
        themeId: memoScope === "theme" ? memoLinkId : "",
        title: memoTitle,
        body: memoBody,
        createdAt: timestamp,
        updatedAt: timestamp,
      }],
    });
    setMemoTitle("");
    setMemoBody("");
    setMemoLinkId("");
  }, [analysis.memos, memoBody, memoLinkId, memoScope, memoTitle, update]);

  const addTheme = useCallback(() => {
    const timestamp = new Date().toISOString();
    const theme: QualitativeTheme = {
      id: newId("theme"),
      title: `Developing theme ${analysis.themes.length + 1}`,
      statement: "",
      boundary: "",
      codeIds: [],
      supportingSegmentIds: [],
      negativeCaseSegmentIds: [],
      negativeCaseReview: "",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    update({ themes: [...analysis.themes, theme] });
  }, [analysis.themes, update]);

  const updateTheme = useCallback((themeId: string, patch: Partial<QualitativeTheme>) => {
    const updatedAt = new Date().toISOString();
    update({
      themes: analysis.themes.map((theme) => (
        theme.id === themeId ? { ...theme, ...patch, updatedAt } : theme
      )),
    });
  }, [analysis.themes, update]);

  const addTriangulation = useCallback(() => {
    update({
      triangulationRecords: [...analysis.triangulationRecords, {
        id: newId("triangulation"),
        kind: analysis.sources.length > 1 ? "across-sources" : "single-source-not-applicable",
        title: "Evidence comparison",
        sourceIds: analysis.sources.map((source) => source.id),
        themeIds: [],
        convergentEvidence: "",
        contradictoryEvidence: "",
        resolution: "",
        limitations: "",
        reviewed: false,
      }],
    });
  }, [analysis.sources, analysis.triangulationRecords, update]);

  const addQuantitativeEvidence = useCallback(() => {
    update({
      quantitativeEvidence: [...analysis.quantitativeEvidence, {
        id: newId("quant"),
        label: `Aggregate finding ${analysis.quantitativeEvidence.length + 1}`,
        sourceReference: "",
        aggregateFinding: "",
        limitations: "",
        researcherVerified: false,
      }],
    });
  }, [analysis.quantitativeEvidence, update]);

  const addJointDisplay = useCallback(() => {
    if (!analysis.themes[0] || !analysis.quantitativeEvidence[0]) {
      setError("Add a qualitative theme and an aggregate quantitative finding first.");
      return;
    }
    update({
      jointDisplays: [...analysis.jointDisplays, {
        id: newId("joint"),
        themeId: analysis.themes[0].id,
        quantitativeEvidenceId: analysis.quantitativeEvidence[0].id,
        relationship: "not-reviewed",
        integratedInterpretation: "",
        metaInference: "",
        limitations: "",
        reviewed: false,
      }],
    });
  }, [analysis.jointDisplays, analysis.quantitativeEvidence, analysis.themes, update]);

  const confirmReview = useCallback(() => {
    setError("");
    try {
      setAnalysis(markQualitativeAnalysisReviewed(analysis));
      setNotice("The researcher review was confirmed. Export is now required.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The review could not be confirmed.");
    }
  }, [analysis]);

  const exportPackage = useCallback(async () => {
    setProcessing(true);
    setError("");
    try {
      const built = await buildQualitativeAnalysisExport(analysis);
      setAnalysis(built.document);
      downloadJson(
        `${safeExportName(projectName)}-phase-8-9-qualitative-analysis.json`,
        built.export,
      );
      setNotice("The checksummed Phase 8.9 package was exported without raw transcript text or media.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The package could not be exported.");
    } finally {
      setProcessing(false);
    }
  }, [analysis, projectName]);

  const removeItem = useCallback((
    event: MouseEvent<HTMLButtonElement>,
    kind: "memo" | "theme" | "triangulation" | "quantitative" | "joint",
    id: string,
  ) => {
    event.preventDefault();
    if (kind === "memo") update({ memos: analysis.memos.filter((item) => item.id !== id) });
    if (kind === "theme") {
      if (
        analysis.jointDisplays.some((item) => item.themeId === id)
        || analysis.memos.some((item) => item.themeId === id)
      ) {
        setError("Remove linked theme memos and joint displays before removing this theme.");
        return;
      }
      update({
        themes: analysis.themes.filter((item) => item.id !== id),
        triangulationRecords: analysis.triangulationRecords.map((record) => ({
          ...record,
          themeIds: record.themeIds.filter((themeId) => themeId !== id),
        })),
      });
    }
    if (kind === "triangulation") {
      update({ triangulationRecords: analysis.triangulationRecords.filter((item) => item.id !== id) });
    }
    if (kind === "quantitative") {
      if (analysis.jointDisplays.some((item) => item.quantitativeEvidenceId === id)) {
        setError("Remove linked joint displays before removing this quantitative finding.");
        return;
      }
      update({ quantitativeEvidence: analysis.quantitativeEvidence.filter((item) => item.id !== id) });
    }
    if (kind === "joint") {
      update({ jointDisplays: analysis.jointDisplays.filter((item) => item.id !== id) });
    }
  }, [analysis, update]);

  return (
    <div className={styles.app}>
      <header className={styles.topbar}>
        <Link className={styles.brand} href="/dashboard">Cerise Scholar</Link>
        <Link className={styles.returnLink} href={`/research-path/${projectId}`}>
          <AppIcon name="arrow-left" />
          Research Path
        </Link>
        <span className={styles.projectName}>{projectName}</span>
        <span className={styles.localBadge}><AppIcon name="lock" /> Local qualitative lane</span>
      </header>

      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Phase 8.9 · Qualitative & Mixed Methods</p>
          <h1>Develop themes from evidence without flattening inquiry into statistics</h1>
          <p>
            Import transcripts locally, code selected segments, preserve codebook
            versions and reflexive memos, test negative cases, and document
            integration. Raw transcripts remain in this tab and media is never opened.
          </p>
        </div>
        <div className={styles.heroBoundary}>
          <AppIcon name="shield" />
          <div>
            <strong>No automated inference or transcription</strong>
            <span>Emotion, face, personality, and behavioral inference are excluded.</span>
          </div>
        </div>
      </section>

      <section className={styles.contextBar} aria-label="Qualitative analysis status">
        <div><span>Lane</span><strong>{analysis.mode.replace("-", " ")}</strong></div>
        <div><span>Sources in record</span><strong>{analysis.sources.length}</strong></div>
        <div><span>Segments / themes</span><strong>{analysis.segments.length} / {analysis.themes.length}</strong></div>
        <div className={isQualitativeAnalysisReady(analysis) ? styles.readyText : ""}>
          <span>Completion gate</span><strong>{readinessLabel(analysis)}</strong>
        </div>
      </section>

      {error || notice ? (
        <div className={error ? styles.errorBanner : styles.noticeBanner} role={error ? "alert" : "status"}>
          <AppIcon name={error ? "alert" : "check-square"} />
          <span>{error || notice}</span>
          <button onClick={() => { setError(""); setNotice(""); }} type="button">Dismiss</button>
        </div>
      ) : null}

      <div className={styles.workspace}>
        <nav className={styles.workflowRail} aria-label="Qualitative workflow">
          <span className={styles.railLabel}>Research workflow</span>
          <ol>
            {PANELS.map((panel, index) => (
              <li key={panel.id}>
                <button
                  aria-current={activePanel === panel.id ? "step" : undefined}
                  className={activePanel === panel.id ? styles.railActive : ""}
                  onClick={() => setActivePanel(panel.id)}
                  type="button"
                >
                  <span>{index + 1}</span>
                  <strong>{panel.label}</strong>
                </button>
              </li>
            ))}
          </ol>
          <div className={styles.railBoundary}>
            <AppIcon name="lock" />
            <p>Transcript text is held only in tab memory and must be re-selected after reload.</p>
          </div>
        </nav>

        <main className={styles.main}>
          {activePanel === "scope" ? (
            <section className={styles.section}>
              <header className={styles.sectionHeading}>
                <span>01 · Inquiry scope</span>
                <h2>Define the qualitative lane on its own terms</h2>
                <p>Choose the lane deliberately. Quantitative-only projects can document a bounded not-applicable decision.</p>
              </header>
              <div className={styles.modeGrid}>
                {([
                  ["qualitative", "Qualitative", "Manual coding, themes, memos, and triangulation."],
                  ["mixed-methods", "Mixed methods", "A qualitative strand plus an explicit integration record."],
                  ["not-applicable", "Not applicable", "Document why the project uses no qualitative evidence."],
                ] as Array<[QualitativeLaneMode, string, string]>).map(([value, title, description]) => (
                  <button
                    className={analysis.mode === value ? styles.modeActive : ""}
                    key={value}
                    onClick={() => update({ mode: value })}
                    type="button"
                  >
                    <strong>{title}</strong>
                    <span>{description}</span>
                  </button>
                ))}
              </div>
              {analysis.mode === "not-applicable" ? (
                <TextAreaField
                  label="Why this lane is not applicable"
                  onChange={(value) => update({ notApplicableRationale: value })}
                  placeholder="State why the project has no qualitative or mixed-methods evidence and which analysis lane is used instead."
                  rows={5}
                  value={analysis.notApplicableRationale}
                />
              ) : (
                <div className={styles.formStack}>
                  <TextAreaField
                    label="Qualitative or mixed-methods research question"
                    onChange={(value) => update({ studyQuestion: value })}
                    placeholder="How do participants describe…?"
                    value={analysis.studyQuestion}
                  />
                  <TextAreaField
                    label="Approach to inquiry"
                    onChange={(value) => update({ inquiryApproach: value })}
                    placeholder="Name and describe the analytic approach; do not rely on a label alone."
                    value={analysis.inquiryApproach}
                  />
                  <TextAreaField
                    label="Researcher positioning and reflexive context"
                    onChange={(value) => update({ researcherPositioning: value })}
                    placeholder="Record relevant background, relationship to the topic, prior understandings, and how these will be managed."
                    rows={5}
                    value={analysis.researcherPositioning}
                  />
                  <TextAreaField
                    label="Manual analysis procedure and unit"
                    onChange={(value) => update({ analysisProcedure: value })}
                    placeholder="Describe familiarization, unit selection, coding, theme development, review, and who performs each step."
                    rows={6}
                    value={analysis.analysisProcedure}
                  />
                </div>
              )}
            </section>
          ) : null}

          {activePanel === "sources" ? (
            <section className={styles.section}>
              <header className={styles.sectionHeading}>
                <span>02 · Local sources</span>
                <h2>Import transcript text without uploading it</h2>
                <p>Accepted formats are UTF-8 TXT, Markdown, SRT, and VTT up to 5 MB each. Media references are labels only.</p>
              </header>
              <input
                accept=".txt,.md,.srt,.vtt,text/plain,text/markdown,text/vtt"
                hidden
                multiple
                onChange={importTranscripts}
                ref={transcriptInput}
                type="file"
              />
              <button
                className={styles.primaryButton}
                disabled={processing}
                onClick={() => transcriptInput.current?.click()}
                type="button"
              >
                <AppIcon name="upload" />
                Import local transcripts
              </button>
              <div className={styles.cardList}>
                {analysis.sources.map((source) => (
                  <article className={styles.card} key={source.id}>
                    <div className={styles.cardHeader}>
                      <div>
                        <span className={styles.kicker}>{source.fileType.toUpperCase()} · {(source.byteLength / 1024).toFixed(1)} KB</span>
                        <h3>{source.label}</h3>
                        <small>{source.textChecksum.slice(0, 24)}…</small>
                      </div>
                      <span className={loadedSources[source.id] ? styles.verifiedBadge : styles.reviewBadge}>
                        {loadedSources[source.id] ? "Verified in tab" : "Re-select required"}
                      </span>
                    </div>
                    <div className={styles.twoColumn}>
                      <Field
                        label="Source label"
                        onChange={(value) => updateSource(source.id, { label: value })}
                        value={source.label}
                      />
                      <Field
                        label="Media reference label (optional)"
                        onChange={(value) => updateSource(source.id, { mediaReference: value })}
                        placeholder="interview-01.wav — no path or upload"
                        value={source.mediaReference}
                      />
                    </div>
                    <TextAreaField
                      label="Collection context"
                      onChange={(value) => updateSource(source.id, { collectionContext: value })}
                      placeholder="When, where, and how was this source collected or selected?"
                      rows={3}
                      value={source.collectionContext}
                    />
                    <label className={styles.field}>
                      <span>Consent and quotation scope</span>
                      <select
                        onChange={(event) => updateSource(source.id, {
                          consentScope: event.target.value as QualitativeConsentScope,
                        })}
                        value={source.consentScope}
                      >
                        <option value="not-reviewed">Not reviewed</option>
                        <option value="analysis-only">Analysis only</option>
                        <option value="analysis-and-anonymized-reporting">Analysis + anonymized reporting</option>
                        <option value="restricted-no-quotation">Restricted — no quotation</option>
                      </select>
                    </label>
                    <label className={styles.secondaryButton}>
                      <AppIcon name="refresh" />
                      Re-select exact file
                      <input
                        accept={`.${source.fileType}`}
                        hidden
                        onChange={(event) => { void reselectSource(event, source.id); }}
                        type="file"
                      />
                    </label>
                  </article>
                ))}
                {analysis.sources.length === 0 ? (
                  <div className={styles.emptyState}>
                    <AppIcon name="file" />
                    <strong>No transcript sources yet</strong>
                    <p>Source text never enters browser storage, Supabase, AI, or the export package.</p>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {activePanel === "codebook" ? (
            <section className={styles.section}>
              <header className={styles.sectionHeading}>
                <span>03 · Versioned codebook</span>
                <h2>Define codes and preserve every frozen version</h2>
                <p>Code changes do not overwrite earlier snapshots. Freeze a new version whenever definitions change.</p>
              </header>
              <div className={styles.actionRow}>
                <button className={styles.primaryButton} onClick={addCode} type="button">
                  <AppIcon name="plus" /> Add code
                </button>
                <span>{analysis.codes.length} current · {analysis.codebookVersions.length} frozen version(s)</span>
              </div>
              <div className={styles.cardList}>
                {analysis.codes.map((code) => (
                  <article className={styles.card} key={code.id}>
                    <div className={styles.codeTitle}>
                      <input
                        aria-label={`${code.name} color`}
                        onChange={(event) => updateCode(code.id, { color: event.target.value })}
                        type="color"
                        value={code.color}
                      />
                      <Field label="Code name" onChange={(value) => updateCode(code.id, { name: value })} value={code.name} />
                      <label className={styles.field}>
                        <span>Origin</span>
                        <select
                          onChange={(event) => updateCode(code.id, {
                            origin: event.target.value as QualitativeCode["origin"],
                          })}
                          value={code.origin}
                        >
                          <option value="a-priori">A priori</option>
                          <option value="emergent">Emergent</option>
                        </select>
                      </label>
                    </div>
                    <TextAreaField label="Definition" onChange={(value) => updateCode(code.id, { definition: value })} value={code.definition} />
                    <div className={styles.twoColumn}>
                      <TextAreaField label="Include when…" onChange={(value) => updateCode(code.id, { inclusionCriteria: value })} rows={3} value={code.inclusionCriteria} />
                      <TextAreaField label="Exclude when…" onChange={(value) => updateCode(code.id, { exclusionCriteria: value })} rows={3} value={code.exclusionCriteria} />
                    </div>
                  </article>
                ))}
              </div>
              <div className={styles.freezeBox}>
                <div>
                  <span className={styles.kicker}>Immutable snapshot</span>
                  <strong>Freeze current codebook as version {analysis.codebookVersions.length + 1}</strong>
                  <small>Latest: {latestCodebook ? `v${latestCodebook.version} · ${formatDate(latestCodebook.createdAt)}` : "None"}</small>
                </div>
                <textarea
                  onChange={(event) => setCodebookRationale(event.target.value)}
                  placeholder="Why is this version being frozen?"
                  rows={3}
                  value={codebookRationale}
                />
                <button className={styles.primaryButton} disabled={processing} onClick={() => { void freezeCodebook(); }} type="button">
                  <AppIcon name="lock" /> Freeze version
                </button>
              </div>
            </section>
          ) : null}

          {activePanel === "coding" ? (
            <section className={styles.section}>
              <header className={styles.sectionHeading}>
                <span>04 · Manual segment coding</span>
                <h2>Select exact meaning units and make every reporting decision explicit</h2>
                <p>Highlight text in the read-only transcript below. Only offsets and a checksum are retained.</p>
              </header>
              <label className={styles.field}>
                <span>Active transcript</span>
                <select onChange={(event) => { setActiveSourceId(event.target.value); setSelection({ start: 0, end: 0 }); }} value={activeSourceId}>
                  <option value="">Choose a source</option>
                  {analysis.sources.map((source) => (
                    <option key={source.id} value={source.id}>{source.label}</option>
                  ))}
                </select>
              </label>
              {activeLoadedSource ? (
                <>
                  <textarea
                    aria-label="Read-only transcript text"
                    className={styles.transcript}
                    onKeyUp={captureSelection}
                    onMouseUp={captureSelection}
                    readOnly
                    value={activeLoadedSource.text}
                  />
                  <div className={styles.selectionBar}>
                    <div>
                      <span>Selected offsets</span>
                      <strong>{selection.start}–{selection.end} · {selectedText.length} characters</strong>
                    </div>
                    <p>{selectedText ? `${selectedText.slice(0, 180)}${selectedText.length > 180 ? "…" : ""}` : "Highlight a non-empty passage."}</p>
                    <button className={styles.primaryButton} disabled={!selectedText || processing} onClick={() => { void addSelectedSegment(); }} type="button">
                      <AppIcon name="plus" /> Create segment
                    </button>
                  </div>
                </>
              ) : (
                <div className={styles.emptyState}>
                  <AppIcon name="refresh" />
                  <strong>Exact source text is not in this tab</strong>
                  <p>Return to Local sources and re-select the transcript whose checksum is stored.</p>
                </div>
              )}
              <div className={styles.cardList}>
                {analysis.segments.map((segment, index) => {
                  const loaded = loadedSources[segment.sourceId];
                  const source = analysis.sources.find((item) => item.id === segment.sourceId);
                  const preview = loaded
                    ? loaded.text.slice(segment.startOffset, segment.endOffset)
                    : "";
                  return (
                    <article className={styles.card} key={segment.id}>
                      <div className={styles.cardHeader}>
                        <div>
                          <span className={styles.kicker}>Segment {index + 1} · {source?.label ?? segment.sourceId}</span>
                          <h3>{segment.startOffset}–{segment.endOffset}</h3>
                          <small>{segment.selectedTextChecksum.slice(0, 24)}…</small>
                        </div>
                        <span className={segment.codeIds.length > 0 ? styles.verifiedBadge : styles.reviewBadge}>
                          {segment.codeIds.length} code(s)
                        </span>
                      </div>
                      <blockquote>{preview || "Re-select the exact source to view this segment."}</blockquote>
                      <span className={styles.fieldLabel}>Applied codes</span>
                      <ChoiceList
                        ariaLabel={`Codes for segment ${index + 1}`}
                        items={analysis.codes.map((code) => ({ id: code.id, label: code.name, color: code.color }))}
                        onToggle={(id) => updateSegment(segment.id, {
                          codeIds: segment.codeIds.includes(id)
                            ? segment.codeIds.filter((item) => item !== id)
                            : [...segment.codeIds, id],
                        })}
                        selected={segment.codeIds}
                      />
                      <div className={styles.twoColumn}>
                        <Field label="Media start reference" onChange={(value) => updateSegment(segment.id, { mediaStart: value })} placeholder="00:12:14" value={segment.mediaStart} />
                        <Field label="Media end reference" onChange={(value) => updateSegment(segment.id, { mediaEnd: value })} placeholder="00:12:42" value={segment.mediaEnd} />
                      </div>
                      <TextAreaField label="Analytic note" onChange={(value) => updateSegment(segment.id, { analyticNote: value })} rows={3} value={segment.analyticNote} />
                      <div className={styles.twoColumn}>
                        <label className={styles.field}>
                          <span>Quotation use</span>
                          <select onChange={(event) => updateSegment(segment.id, { quotationUse: event.target.value as QuotationUse })} value={segment.quotationUse}>
                            <option value="not-reviewed">Not reviewed</option>
                            <option value="paraphrase-only">Paraphrase only</option>
                            <option value="direct-quote-approved">Direct quote approved</option>
                            <option value="not-for-reporting">Not for reporting</option>
                          </select>
                        </label>
                        <label className={styles.field}>
                          <span>Redaction review</span>
                          <select onChange={(event) => updateSegment(segment.id, { redactionStatus: event.target.value as RedactionStatus })} value={segment.redactionStatus}>
                            <option value="not-reviewed">Not reviewed</option>
                            <option value="no-identifiers-observed">No identifiers observed</option>
                            <option value="redacted-copy-reviewed">Redacted copy reviewed</option>
                            <option value="not-applicable">Not applicable</option>
                          </select>
                        </label>
                      </div>
                      <TextAreaField
                        label="Researcher-approved reporting excerpt"
                        onChange={(value) => updateSegment(segment.id, { reportingExcerpt: value })}
                        placeholder="Only add a consented, redaction-reviewed excerpt intended for reporting."
                        rows={3}
                        value={segment.reportingExcerpt}
                      />
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}

          {activePanel === "memos" ? (
            <section className={styles.section}>
              <header className={styles.sectionHeading}>
                <span>05 · Analytic memos</span>
                <h2>Preserve interpretation, reflexivity, and decision context</h2>
                <p>Memos are researcher-authored. Avoid copying direct identifiers or unreviewed quotations into them.</p>
              </header>
              <div className={styles.composer}>
                <div className={styles.twoColumn}>
                  <label className={styles.field}>
                    <span>Memo scope</span>
                    <select onChange={(event) => { setMemoScope(event.target.value as MemoScope); setMemoLinkId(""); }} value={memoScope}>
                      <option value="study">Study</option>
                      <option value="source">Source</option>
                      <option value="segment">Segment</option>
                      <option value="theme">Theme</option>
                    </select>
                  </label>
                  {memoScope !== "study" ? (
                    <label className={styles.field}>
                      <span>Linked {memoScope}</span>
                      <select onChange={(event) => setMemoLinkId(event.target.value)} value={memoLinkId}>
                        <option value="">Choose one</option>
                        {(memoScope === "source"
                          ? analysis.sources.map((item) => ({ id: item.id, label: item.label }))
                          : memoScope === "segment"
                            ? analysis.segments.map((item, index) => ({ id: item.id, label: `Segment ${index + 1}` }))
                            : analysis.themes.map((item) => ({ id: item.id, label: item.title }))
                        ).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                      </select>
                    </label>
                  ) : null}
                </div>
                <Field label="Memo title" onChange={setMemoTitle} value={memoTitle} />
                <TextAreaField label="Analytic or reflexive memo" onChange={setMemoBody} rows={7} value={memoBody} />
                <button className={styles.primaryButton} onClick={addMemo} type="button"><AppIcon name="plus" /> Add memo</button>
              </div>
              <div className={styles.cardList}>
                {analysis.memos.map((memo) => (
                  <article className={styles.card} key={memo.id}>
                    <div className={styles.cardHeader}>
                      <div><span className={styles.kicker}>{memo.scope} memo</span><h3>{memo.title}</h3></div>
                      <button aria-label={`Remove ${memo.title}`} className={styles.iconButton} onClick={(event) => removeItem(event, "memo", memo.id)} type="button"><AppIcon name="trash" /></button>
                    </div>
                    <p className={styles.memoBody}>{memo.body}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {activePanel === "themes" ? (
            <section className={styles.section}>
              <header className={styles.sectionHeading}>
                <span>06 · Theme development</span>
                <h2>Ground every theme and investigate disconfirming evidence</h2>
                <p>Theme statements need supporting segment links, clear boundaries, and a documented negative-case review.</p>
              </header>
              <button className={styles.primaryButton} onClick={addTheme} type="button"><AppIcon name="plus" /> Add developing theme</button>
              <div className={styles.cardList}>
                {analysis.themes.map((theme, index) => (
                  <article className={styles.card} key={theme.id}>
                    <div className={styles.cardHeader}>
                      <span className={styles.kicker}>Theme {index + 1}</span>
                      <button aria-label={`Remove ${theme.title}`} className={styles.iconButton} onClick={(event) => removeItem(event, "theme", theme.id)} type="button"><AppIcon name="trash" /></button>
                    </div>
                    <Field label="Theme title" onChange={(value) => updateTheme(theme.id, { title: value })} value={theme.title} />
                    <TextAreaField label="Evidence-backed theme statement" onChange={(value) => updateTheme(theme.id, { statement: value })} rows={4} value={theme.statement} />
                    <TextAreaField label="Theme boundary and context" onChange={(value) => updateTheme(theme.id, { boundary: value })} rows={3} value={theme.boundary} />
                    <div className={styles.twoColumn}>
                      <div>
                        <span className={styles.fieldLabel}>Contributing codes</span>
                        <ChoiceList
                          ariaLabel={`Codes for ${theme.title}`}
                          items={analysis.codes.map((code) => ({ id: code.id, label: code.name, color: code.color }))}
                          onToggle={(id) => updateTheme(theme.id, {
                            codeIds: theme.codeIds.includes(id)
                              ? theme.codeIds.filter((item) => item !== id)
                              : [...theme.codeIds, id],
                          })}
                          selected={theme.codeIds}
                        />
                      </div>
                      <div>
                        <span className={styles.fieldLabel}>Supporting segments</span>
                        <ChoiceList
                          ariaLabel={`Supporting segments for ${theme.title}`}
                          items={analysis.segments.map((segment, segmentIndex) => ({ id: segment.id, label: `Segment ${segmentIndex + 1}` }))}
                          onToggle={(id) => updateTheme(theme.id, {
                            supportingSegmentIds: theme.supportingSegmentIds.includes(id)
                              ? theme.supportingSegmentIds.filter((item) => item !== id)
                              : [...theme.supportingSegmentIds, id],
                          })}
                          selected={theme.supportingSegmentIds}
                        />
                      </div>
                    </div>
                    <span className={styles.fieldLabel}>Negative or disconfirming cases</span>
                    <ChoiceList
                      ariaLabel={`Negative cases for ${theme.title}`}
                      items={analysis.segments.map((segment, segmentIndex) => ({ id: segment.id, label: `Segment ${segmentIndex + 1}` }))}
                      onToggle={(id) => updateTheme(theme.id, {
                        negativeCaseSegmentIds: theme.negativeCaseSegmentIds.includes(id)
                          ? theme.negativeCaseSegmentIds.filter((item) => item !== id)
                          : [...theme.negativeCaseSegmentIds, id],
                      })}
                      selected={theme.negativeCaseSegmentIds}
                    />
                    <TextAreaField label="Negative-case review" onChange={(value) => updateTheme(theme.id, { negativeCaseReview: value })} placeholder="Explain what contradicted, complicated, or bounded this theme—even when no formal negative case was found." rows={4} value={theme.negativeCaseReview} />
                  </article>
                ))}
              </div>

              <div className={styles.subsectionHeading}>
                <div><span className={styles.kicker}>Triangulation ledger</span><h3>Compare sources, methods, investigators, or participant feedback</h3></div>
                <button className={styles.secondaryButton} onClick={addTriangulation} type="button"><AppIcon name="plus" /> Add record</button>
              </div>
              <div className={styles.cardList}>
                {analysis.triangulationRecords.map((record) => (
                  <article className={styles.card} key={record.id}>
                    <div className={styles.cardHeader}>
                      <Field
                        label="Record title"
                        onChange={(value) => update({
                          triangulationRecords: analysis.triangulationRecords.map((item) => item.id === record.id ? { ...item, title: value } : item),
                        })}
                        value={record.title}
                      />
                      <button aria-label={`Remove ${record.title}`} className={styles.iconButton} onClick={(event) => removeItem(event, "triangulation", record.id)} type="button"><AppIcon name="trash" /></button>
                    </div>
                    <label className={styles.field}>
                      <span>Check type</span>
                      <select
                        onChange={(event) => update({
                          triangulationRecords: analysis.triangulationRecords.map((item) => item.id === record.id ? { ...item, kind: event.target.value as TriangulationKind } : item),
                        })}
                        value={record.kind}
                      >
                        <option value="across-sources">Across sources</option>
                        <option value="across-methods">Across methods</option>
                        <option value="across-investigators">Across investigators</option>
                        <option value="participant-feedback">Participant feedback</option>
                        <option value="negative-case">Negative-case review</option>
                        <option value="single-source-not-applicable">Single-source — cross-source not applicable</option>
                      </select>
                    </label>
                    <div className={styles.twoColumn}>
                      <div>
                        <span className={styles.fieldLabel}>Sources considered</span>
                        <ChoiceList
                          ariaLabel={`Sources for ${record.title}`}
                          items={analysis.sources.map((source) => ({ id: source.id, label: source.label }))}
                          onToggle={(id) => update({
                            triangulationRecords: analysis.triangulationRecords.map((item) => item.id === record.id ? {
                              ...item,
                              sourceIds: item.sourceIds.includes(id) ? item.sourceIds.filter((sourceId) => sourceId !== id) : [...item.sourceIds, id],
                            } : item),
                          })}
                          selected={record.sourceIds}
                        />
                      </div>
                      <div>
                        <span className={styles.fieldLabel}>Themes considered</span>
                        <ChoiceList
                          ariaLabel={`Themes for ${record.title}`}
                          items={analysis.themes.map((theme) => ({ id: theme.id, label: theme.title }))}
                          onToggle={(id) => update({
                            triangulationRecords: analysis.triangulationRecords.map((item) => item.id === record.id ? {
                              ...item,
                              themeIds: item.themeIds.includes(id) ? item.themeIds.filter((themeId) => themeId !== id) : [...item.themeIds, id],
                            } : item),
                          })}
                          selected={record.themeIds}
                        />
                      </div>
                    </div>
                    <TextAreaField label="Convergent evidence" onChange={(value) => update({ triangulationRecords: analysis.triangulationRecords.map((item) => item.id === record.id ? { ...item, convergentEvidence: value } : item) })} rows={3} value={record.convergentEvidence} />
                    <TextAreaField label="Contradictory or absent evidence" onChange={(value) => update({ triangulationRecords: analysis.triangulationRecords.map((item) => item.id === record.id ? { ...item, contradictoryEvidence: value } : item) })} rows={3} value={record.contradictoryEvidence} />
                    <TextAreaField label="Researcher resolution" onChange={(value) => update({ triangulationRecords: analysis.triangulationRecords.map((item) => item.id === record.id ? { ...item, resolution: value } : item) })} rows={3} value={record.resolution} />
                    <TextAreaField label="Limitations of this check" onChange={(value) => update({ triangulationRecords: analysis.triangulationRecords.map((item) => item.id === record.id ? { ...item, limitations: value } : item) })} rows={3} value={record.limitations} />
                    <label className={styles.checkRow}>
                      <input checked={record.reviewed} onChange={(event) => update({ triangulationRecords: analysis.triangulationRecords.map((item) => item.id === record.id ? { ...item, reviewed: event.target.checked } : item) })} type="checkbox" />
                      I reviewed the convergent, contradictory, and missing evidence.
                    </label>
                  </article>
                ))}
              </div>

              {matrix.length > 0 && analysis.sources.length > 0 ? (
                <div className={styles.matrixWrap}>
                  <div className={styles.subsectionHeading}><div><span className={styles.kicker}>Deterministic display</span><h3>Code-by-source matrix</h3></div></div>
                  <table>
                    <thead><tr><th>Code</th>{analysis.sources.map((source) => <th key={source.id}>{source.label}</th>)}<th>Total</th></tr></thead>
                    <tbody>
                      {matrix.map((row) => (
                        <tr key={row.codeId}>
                          <th>{row.codeName}</th>
                          {row.sourceCounts.map((cell) => <td key={cell.sourceId}>{cell.segmentCount}</td>)}
                          <td>{row.totalSegments}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </section>
          ) : null}

          {activePanel === "integration" ? (
            <section className={styles.section}>
              <header className={styles.sectionHeading}>
                <span>07 · Mixed-method integration</span>
                <h2>Keep each strand distinct, then document where integration occurs</h2>
                <p>This lane records aggregate quantitative findings but executes no statistics and makes no claim that a reference was independently verified.</p>
              </header>
              {analysis.mode !== "mixed-methods" ? (
                <div className={styles.emptyState}>
                  <AppIcon name="workflow" />
                  <strong>Integration is inactive</strong>
                  <p>Choose Mixed methods in Inquiry scope to activate joint displays. Qualitative-only work is not forced through this screen.</p>
                </div>
              ) : (
                <>
                  <div className={styles.twoColumn}>
                    <label className={styles.field}>
                      <span>Mixed-methods design</span>
                      <select onChange={(event) => update({ integrationDesign: event.target.value as MixedMethodsDesign })} value={analysis.integrationDesign}>
                        <option value="not-selected">Choose design</option>
                        <option value="convergent">Convergent</option>
                        <option value="explanatory-sequential">Explanatory sequential</option>
                        <option value="exploratory-sequential">Exploratory sequential</option>
                        <option value="embedded">Embedded</option>
                        <option value="multiphase">Multiphase</option>
                        <option value="other">Other</option>
                      </select>
                    </label>
                    <TextAreaField label="Integration rationale" onChange={(value) => update({ integrationRationale: value })} placeholder="Why are both strands needed and where will they be integrated?" rows={4} value={analysis.integrationRationale} />
                  </div>
                  <div className={styles.subsectionHeading}>
                    <div><span className={styles.kicker}>Quantitative strand reference</span><h3>Researcher-verified aggregate findings</h3></div>
                    <button className={styles.secondaryButton} onClick={addQuantitativeEvidence} type="button"><AppIcon name="plus" /> Add finding</button>
                  </div>
                  <div className={styles.cardList}>
                    {analysis.quantitativeEvidence.map((evidence) => (
                      <article className={styles.card} key={evidence.id}>
                        <div className={styles.cardHeader}>
                          <Field label="Finding label" onChange={(value) => update({ quantitativeEvidence: analysis.quantitativeEvidence.map((item) => item.id === evidence.id ? { ...item, label: value } : item) })} value={evidence.label} />
                          <button aria-label={`Remove ${evidence.label}`} className={styles.iconButton} onClick={(event) => removeItem(event, "quantitative", evidence.id)} type="button"><AppIcon name="trash" /></button>
                        </div>
                        <TextAreaField label="Exact aggregate record reference" onChange={(value) => update({ quantitativeEvidence: analysis.quantitativeEvidence.map((item) => item.id === evidence.id ? { ...item, sourceReference: value } : item) })} placeholder="Results Record filename/checksum and analysis ID, or another traceable aggregate source." rows={3} value={evidence.sourceReference} />
                        <TextAreaField label="Aggregate finding" onChange={(value) => update({ quantitativeEvidence: analysis.quantitativeEvidence.map((item) => item.id === evidence.id ? { ...item, aggregateFinding: value } : item) })} rows={4} value={evidence.aggregateFinding} />
                        <TextAreaField label="Quantitative limitations" onChange={(value) => update({ quantitativeEvidence: analysis.quantitativeEvidence.map((item) => item.id === evidence.id ? { ...item, limitations: value } : item) })} rows={3} value={evidence.limitations} />
                        <label className={styles.checkRow}>
                          <input checked={evidence.researcherVerified} onChange={(event) => update({ quantitativeEvidence: analysis.quantitativeEvidence.map((item) => item.id === evidence.id ? { ...item, researcherVerified: event.target.checked } : item) })} type="checkbox" />
                          I verified this aggregate wording against the cited source record.
                        </label>
                      </article>
                    ))}
                  </div>
                  <div className={styles.subsectionHeading}>
                    <div><span className={styles.kicker}>Joint display</span><h3>Compare qualitative and quantitative findings</h3></div>
                    <button className={styles.secondaryButton} onClick={addJointDisplay} type="button"><AppIcon name="plus" /> Add display row</button>
                  </div>
                  <div className={styles.cardList}>
                    {analysis.jointDisplays.map((display) => (
                      <article className={styles.card} key={display.id}>
                        <div className={styles.cardHeader}>
                          <span className={styles.kicker}>Joint display record</span>
                          <button aria-label="Remove joint display" className={styles.iconButton} onClick={(event) => removeItem(event, "joint", display.id)} type="button"><AppIcon name="trash" /></button>
                        </div>
                        <div className={styles.threeColumn}>
                          <label className={styles.field}>
                            <span>Qualitative theme</span>
                            <select onChange={(event) => update({ jointDisplays: analysis.jointDisplays.map((item) => item.id === display.id ? { ...item, themeId: event.target.value } : item) })} value={display.themeId}>
                              {analysis.themes.map((theme) => <option key={theme.id} value={theme.id}>{theme.title}</option>)}
                            </select>
                          </label>
                          <label className={styles.field}>
                            <span>Quantitative finding</span>
                            <select onChange={(event) => update({ jointDisplays: analysis.jointDisplays.map((item) => item.id === display.id ? { ...item, quantitativeEvidenceId: event.target.value } : item) })} value={display.quantitativeEvidenceId}>
                              {analysis.quantitativeEvidence.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                            </select>
                          </label>
                          <label className={styles.field}>
                            <span>Relationship</span>
                            <select onChange={(event) => update({ jointDisplays: analysis.jointDisplays.map((item) => item.id === display.id ? { ...item, relationship: event.target.value as IntegrationRelationship } : item) })} value={display.relationship}>
                              <option value="not-reviewed">Not reviewed</option>
                              <option value="convergence">Convergence</option>
                              <option value="complementarity">Complementarity</option>
                              <option value="divergence">Divergence</option>
                              <option value="expansion">Expansion</option>
                              <option value="silence">Silence</option>
                            </select>
                          </label>
                        </div>
                        <TextAreaField label="Integrated interpretation" onChange={(value) => update({ jointDisplays: analysis.jointDisplays.map((item) => item.id === display.id ? { ...item, integratedInterpretation: value } : item) })} rows={4} value={display.integratedInterpretation} />
                        <TextAreaField label="Meta-inference" onChange={(value) => update({ jointDisplays: analysis.jointDisplays.map((item) => item.id === display.id ? { ...item, metaInference: value } : item) })} placeholder="What insight comes from integration that neither strand supports alone?" rows={4} value={display.metaInference} />
                        <TextAreaField label="Integration limitations" onChange={(value) => update({ jointDisplays: analysis.jointDisplays.map((item) => item.id === display.id ? { ...item, limitations: value } : item) })} rows={3} value={display.limitations} />
                        <label className={styles.checkRow}>
                          <input checked={display.reviewed} onChange={(event) => update({ jointDisplays: analysis.jointDisplays.map((item) => item.id === display.id ? { ...item, reviewed: event.target.checked } : item) })} type="checkbox" />
                          I reviewed this comparison without treating one strand as validation of the other.
                        </label>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </section>
          ) : null}

          {activePanel === "review" ? (
            <section className={styles.section}>
              <header className={styles.sectionHeading}>
                <span>08 · Review & export</span>
                <h2>Close the audit trail without certifying validity</h2>
                <p>The export contains source checksums, decisions, safe excerpts, matrices, and integration records—never raw transcripts or media.</p>
              </header>
              {analysis.mode !== "not-applicable" ? (
                <div className={styles.formStack}>
                  <TextAreaField label="Overall qualitative or integrated conclusion" onChange={(value) => update({ overallConclusion: value })} rows={6} value={analysis.overallConclusion} />
                  <TextAreaField label="Remaining limitations and transferability boundaries" onChange={(value) => update({ remainingLimitations: value })} rows={6} value={analysis.remainingLimitations} />
                </div>
              ) : null}
              <div className={styles.reviewBox}>
                <div>
                  <span className={styles.kicker}>Researcher confirmation</span>
                  <h3>{readinessLabel(analysis)}</h3>
                  <p>
                    Confirmation means the record is complete enough to export. It
                    is not proof of consent sufficiency, methodological integrity,
                    transferability, validity, or publication readiness.
                  </p>
                </div>
                <div className={styles.reviewActions}>
                  <button
                    className={styles.secondaryButton}
                    disabled={analysis.readiness.status !== "needs-review" || analysis.readiness.issues.length > 0}
                    onClick={confirmReview}
                    type="button"
                  >
                    <AppIcon name="check-square" /> Confirm review
                  </button>
                  <button
                    className={styles.primaryButton}
                    disabled={analysis.readiness.status !== "needs-export" || processing}
                    onClick={() => { void exportPackage(); }}
                    type="button"
                  >
                    <AppIcon name="download" /> Export package
                  </button>
                </div>
                <small>Reviewed: {formatDate(analysis.reviewedAt)} · Exported: {formatDate(analysis.exportedAt)}</small>
              </div>
            </section>
          ) : null}
        </main>

        <aside className={styles.gateRail}>
          <span className={styles.railLabel}>Completion gate</span>
          <h3>{readinessLabel(analysis)}</h3>
          <ol>
            {analysis.mode === "not-applicable" ? (
              <>
                <GateItem complete={analysis.notApplicableRationale.trim().length >= 20} label="Not-applicable rationale recorded" />
                <GateItem complete={Boolean(analysis.reviewedAt)} label="Lane decision confirmed" />
                <GateItem complete={Boolean(analysis.exportedAt)} label="Decision record exported" />
              </>
            ) : (
              <>
                <GateItem complete={Boolean(analysis.studyQuestion.trim() && analysis.inquiryApproach.trim() && analysis.researcherPositioning.trim() && analysis.analysisProcedure.trim())} label="Inquiry and reflexive scope documented" />
                <GateItem complete={sourceReviewComplete} label="Local sources and consent scopes reviewed" />
                <GateItem complete={Boolean(latestCodebook && analysis.codes.length > 0)} label="Current codebook version frozen" />
                <GateItem complete={allSegmentsReviewed} label="Segments coded and quotation-reviewed" />
                <GateItem complete={analysis.memos.some((memo) => memo.scope === "study" && memo.body.trim())} label="Study-level analytic memo recorded" />
                <GateItem complete={themesReviewed} label="Themes grounded and negative cases reviewed" />
                <GateItem complete={analysis.triangulationRecords.length > 0 && analysis.triangulationRecords.every((item) => item.reviewed)} label="Triangulation boundary reviewed" />
                {analysis.mode === "mixed-methods" ? (
                  <GateItem complete={analysis.integrationDesign !== "not-selected" && analysis.jointDisplays.length > 0 && analysis.jointDisplays.every((item) => item.reviewed)} label="Mixed-method integration reviewed" />
                ) : null}
                <GateItem complete={Boolean(analysis.reviewedAt)} label="Researcher confirmation recorded" />
                <GateItem complete={Boolean(analysis.exportedAt)} label="Checksummed package exported" />
              </>
            )}
          </ol>
          {analysis.readiness.issues.length > 0 ? (
            <div className={styles.issueList}>
              <strong>Next required decisions</strong>
              <ul>{analysis.readiness.issues.slice(0, 7).map((issue) => <li key={issue}>{issue}</li>)}</ul>
            </div>
          ) : null}
          <div className={styles.privacyCard}>
            <AppIcon name="shield" />
            <strong>Boundary preserved</strong>
            <p>No raw transcripts, media, automatic transcription, or automatic human-state inference.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
