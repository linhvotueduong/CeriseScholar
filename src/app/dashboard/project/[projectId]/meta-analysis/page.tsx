"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Papa from "papaparse";
import { parseSavFile } from "@/lib/data/parseSav";
import { createClient } from "@/lib/supabase/client";
import { logDashboardActivity } from "@/lib/dashboard/activity";
import {
  mean, stdDev, correlation, tTest, cohensD, hedgesG, poolEffects,
  studyWeights, type MetaMethod,
} from "@/lib/meta/stats";
import { PlotRenderer, PLOT_CATALOG } from "@/components/meta/plots/Plots";
import type {
  HypothesisType, CanvasBlock, ColumnMapping, StudyEffect, PlotType,
} from "@/types/meta-analysis";

// ========== TYPES ==========
interface DataRow { [key: string]: string | number | null; }
interface StudyData { columns: string[]; rows: DataRow[]; filename: string; }

const HYPOTHESIS_TYPES: { key: HypothesisType; title: string; desc: string }[] = [
  { key: "moderation",       title: "Moderation / Interaction",     desc: "Testing whether the effect of X on Y depends on a third variable Z" },
  { key: "group_comparison", title: "Group comparison",             desc: "Comparing means between two or more groups" },
  { key: "correlation",      title: "Relationship / Correlation",   desc: "Testing whether two continuous variables are related" },
  { key: "prediction",       title: "Prediction / Regression",      desc: "Testing whether one or more variables predict an outcome" },
  { key: "mediation",        title: "Mediation",                    desc: "Testing whether X affects Y through an intermediate variable M" },
];

// ========== SAMPLE DATASET ==========
function sampleDataset(): StudyData {
  // Precomputed Cohen's d + SE per study, with a moderator and binary event counts
  const rows: DataRow[] = [
    { study: "Smith 2021",   n: 142, effect: 0.82, se: 0.173, moderator: 2021, events_treat: 45, total_treat: 71,  events_ctrl: 32, total_ctrl: 71 },
    { study: "Lee 2022",     n: 89,  effect: 0.51, se: 0.213, moderator: 2022, events_treat: 25, total_treat: 45,  events_ctrl: 20, total_ctrl: 44 },
    { study: "Patel 2022",   n: 201, effect: 0.68, se: 0.142, moderator: 2022, events_treat: 60, total_treat: 101, events_ctrl: 42, total_ctrl: 100 },
    { study: "Nguyen 2023",  n: 95,  effect: 0.44, se: 0.207, moderator: 2023, events_treat: 22, total_treat: 48,  events_ctrl: 18, total_ctrl: 47 },
    { study: "Garcia 2023",  n: 178, effect: 0.91, se: 0.154, moderator: 2023, events_treat: 62, total_treat: 89,  events_ctrl: 40, total_ctrl: 89 },
    { study: "Kim 2023",     n: 133, effect: 0.37, se: 0.176, moderator: 2023, events_treat: 32, total_treat: 67,  events_ctrl: 26, total_ctrl: 66 },
    { study: "Rossi 2024",   n: 212, effect: 0.74, se: 0.138, moderator: 2024, events_treat: 70, total_treat: 106, events_ctrl: 50, total_ctrl: 106 },
    { study: "Chen 2024",    n: 104, effect: 0.29, se: 0.198, moderator: 2024, events_treat: 24, total_treat: 52,  events_ctrl: 20, total_ctrl: 52 },
  ];
  return {
    filename: "sample_geopolitical_stress.csv",
    columns: ["study", "n", "effect", "se", "moderator", "events_treat", "total_treat", "events_ctrl", "total_ctrl"],
    rows,
  };
}

function downloadCSV(ds: StudyData) {
  const csv = [ds.columns.join(","), ...ds.rows.map(r => ds.columns.map(c => r[c] ?? "").join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = ds.filename;
  a.click();
  URL.revokeObjectURL(url);
}

function getNumericValues(rows: DataRow[], col: string): number[] {
  return rows.map(r => Number(r[col])).filter(v => !isNaN(v) && isFinite(v));
}

// ========== STEP PROGRESS BAR ==========
function StepProgress({ step, onStep, completed }: { step: number; onStep: (n: number) => void; completed: boolean[] }) {
  const labels = ["Define question", "Upload data", "Analyze", "Effect sizes", "Results"];
  return (
    <div className="flex items-center gap-2 text-xs">
      {labels.map((label, i) => {
        const n = i + 1;
        const isCurrent = n === step;
        const isDone = completed[i];
        return (
          <div key={n} className="flex items-center gap-2">
            <button
              onClick={() => onStep(n)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors ${
                isCurrent
                  ? "border-secondary text-ink bg-secondary-soft"
                  : isDone
                    ? "border-success/40 text-success hover:bg-success/10"
                    : "border-edge text-ink-faint hover:text-ink-muted"
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                isCurrent ? "bg-primary text-ink"
                : isDone ? "bg-success text-paper"
                : "bg-paper-sunken text-ink-muted"
              }`}>{isDone ? "✓" : n}</span>
              <span>{label}</span>
            </button>
            {n < 5 && <span className="text-ink-faint">—</span>}
          </div>
        );
      })}
    </div>
  );
}

// ========== MAIN PAGE ==========
export default function MetaAnalysisPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = useMemo(() => createClient(), []);

  // Wizard state
  const [step, setStep] = useState(1);
  const [projectName, setProjectName] = useState("");

  // Step 1
  const [researchQuestion, setResearchQuestion] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [hypothesisType, setHypothesisType] = useState<HypothesisType>("");

  // Step 2
  const [datasets, setDatasets] = useState<StudyData[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Step 3
  const [analyzeType, setAnalyzeType] = useState<"descriptive" | "correlation" | "ttest">("correlation");
  const [groupCol, setGroupCol] = useState("");
  const [valueCol, setValueCol] = useState("");

  // Step 4 — column mapping
  const [mapping, setMapping] = useState<ColumnMapping>({});

  // Step 5 — canvas
  const [method, setMethod] = useState<MetaMethod>("random");
  const [canvas, setCanvas] = useState<CanvasBlock[]>([]);
  const canvasSeededRef = useRef(false);

  // Supabase row id (lazily created)
  const [metaRowId, setMetaRowId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const activeDataset = selectedDataset !== null ? datasets[selectedDataset] : null;
  const numericCols = useMemo(() => {
    if (!activeDataset) return [];
    return activeDataset.columns.filter(col => {
      const vals = getNumericValues(activeDataset.rows, col);
      return vals.length > activeDataset.rows.length * 0.5;
    });
  }, [activeDataset]);

  // Auto-guess mapping when dataset changes
  useEffect(() => {
    if (!activeDataset) return;
    const cols = activeDataset.columns;
    const lower = cols.map(c => c.toLowerCase());
    const pick = (...keys: string[]) => {
      for (const k of keys) {
        const i = lower.findIndex(c => c === k || c.includes(k));
        if (i >= 0) return cols[i];
      }
      return undefined;
    };
    setMapping(m => ({
      study: m.study || pick("study", "name", "author"),
      n: m.n || pick("n", "sample", "total"),
      effect: m.effect || pick("effect", "d", "hedges", "smd"),
      se: m.se || pick("se", "stderr", "standard_error"),
      m1: m.m1 || pick("m1", "mean1", "mean_t"),
      sd1: m.sd1 || pick("sd1"),
      n1: m.n1 || pick("n1"),
      m2: m.m2 || pick("m2", "mean2"),
      sd2: m.sd2 || pick("sd2"),
      n2: m.n2 || pick("n2"),
      moderator: m.moderator || pick("moderator", "year", "age"),
      events1: m.events1 || pick("events_treat", "events1"),
      total1: m.total1 || pick("total_treat", "total1"),
      events2: m.events2 || pick("events_ctrl", "events2"),
      total2: m.total2 || pick("total_ctrl", "total2"),
    }));
  }, [activeDataset]);

  // Compute per-study effects from mapping
  const effects: StudyEffect[] = useMemo(() => {
    if (!activeDataset) return [];
    const out: StudyEffect[] = [];
    for (const row of activeDataset.rows) {
      const name = mapping.study ? String(row[mapping.study] ?? "") : `Study ${out.length + 1}`;
      let effect: number | null = null, se: number | null = null;
      const n = mapping.n ? Number(row[mapping.n]) : NaN;
      if (mapping.effect && mapping.se) {
        effect = Number(row[mapping.effect]);
        se = Number(row[mapping.se]);
      } else if (mapping.m1 && mapping.sd1 && mapping.n1 && mapping.m2 && mapping.sd2 && mapping.n2) {
        const m1 = Number(row[mapping.m1]), s1 = Number(row[mapping.sd1]), r1 = Number(row[mapping.n1]);
        const m2 = Number(row[mapping.m2]), s2 = Number(row[mapping.sd2]), r2 = Number(row[mapping.n2]);
        if ([m1, s1, r1, m2, s2, r2].every(v => isFinite(v)) && s1 > 0 && s2 > 0 && r1 >= 2 && r2 >= 2) {
          const cd = cohensD(m1, m2, s1, s2, r1, r2);
          const hg = hedgesG(cd.d, r1, r2);
          effect = hg.g; se = hg.se;
        }
      }
      if (effect === null || se === null || !isFinite(effect) || !isFinite(se) || se <= 0) continue;
      const mod = mapping.moderator ? Number(row[mapping.moderator]) : undefined;
      const e1 = mapping.events1 ? Number(row[mapping.events1]) : undefined;
      const t1 = mapping.total1 ? Number(row[mapping.total1]) : undefined;
      const e2 = mapping.events2 ? Number(row[mapping.events2]) : undefined;
      const t2 = mapping.total2 ? Number(row[mapping.total2]) : undefined;
      out.push({
        name, n: isFinite(n) ? n : 0,
        effect, se,
        ci: [effect - 1.96 * se, effect + 1.96 * se],
        weight: 0,
        moderator: isFinite(mod ?? NaN) ? mod : undefined,
        events1: isFinite(e1 ?? NaN) ? e1 : undefined,
        total1: isFinite(t1 ?? NaN) ? t1 : undefined,
        events2: isFinite(e2 ?? NaN) ? e2 : undefined,
        total2: isFinite(t2 ?? NaN) ? t2 : undefined,
      });
    }
    const weights = studyWeights(out.map(e => ({ effect: e.effect, se: e.se })), method);
    return out.map((e, i) => ({ ...e, weight: weights[i] }));
  }, [activeDataset, mapping, method]);

  const pooled = useMemo(() =>
    effects.length >= 2 ? poolEffects(effects.map(e => ({ effect: e.effect, se: e.se })), method) : null,
  [effects, method]);

  // ========== SUPABASE HYDRATE ==========
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: proj } = await supabase.from("projects").select("name").eq("id", projectId).single();
        if (proj && !cancelled) setProjectName(proj.name);

        const { data: row, error: selErr } = await supabase
          .from("meta_analyses")
          .select("*")
          .eq("project_id", projectId)
          .maybeSingle();

        if (cancelled) return;
        if (selErr) {
          // Table missing or RLS blocked — page still works, just no persistence
          console.warn("meta_analyses read failed:", selErr.message);
        } else if (row) {
          setMetaRowId(row.id);
          setResearchQuestion(row.research_question || "");
          setHypothesis(row.hypothesis || "");
          setHypothesisType((row.hypothesis_type || "") as HypothesisType);
          setCanvas(Array.isArray(row.canvas_blocks) ? row.canvas_blocks : []);
          setMapping(row.column_mapping || {});
        } else {
          const { data: userData } = await supabase.auth.getUser();
          if (userData?.user) {
            const { data: ins, error: insErr } = await supabase
              .from("meta_analyses")
              .insert({ project_id: projectId, user_id: userData.user.id })
              .select()
              .single();
            if (insErr) console.warn("meta_analyses insert failed:", insErr.message);
            else if (ins && !cancelled) setMetaRowId(ins.id);
          }
        }
      } catch (e) {
        console.warn("meta-analysis hydrate error", e);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId, supabase]);

  // Seed the canvas with a Forest plot the first time Step 5 opens with valid effects
  useEffect(() => {
    if (step !== 5 || canvasSeededRef.current || !hydrated) return;
    if (canvas.length === 0 && effects.length >= 2) {
      setCanvas([{ id: Math.random().toString(36).slice(2), type: "forest", config: {} }]);
    }
    canvasSeededRef.current = true;
  }, [step, canvas.length, effects.length, hydrated]);

  // ========== SUPABASE PERSIST (debounced) ==========
  useEffect(() => {
    if (!hydrated || !metaRowId) return;
    const t = setTimeout(() => {
      supabase.from("meta_analyses").update({
        research_question: researchQuestion,
        hypothesis,
        hypothesis_type: hypothesisType,
        canvas_blocks: canvas,
        column_mapping: mapping,
        updated_at: new Date().toISOString(),
      }).eq("id", metaRowId).then(() => {
        void logDashboardActivity({
          projectId,
          eventType: "meta_analysis_updated",
          sectionId: "meta-analysis",
          label: "Updated meta-analysis",
        });
      });
    }, 600);
    return () => clearTimeout(t);
  }, [researchQuestion, hypothesis, hypothesisType, canvas, mapping, metaRowId, hydrated, projectId, supabase]);

  // ========== UPLOAD ==========
  const handleFileUpload = useCallback(async (file: File) => {
    setUploadError(null); setUploading(true);
    try {
      if (file.name.endsWith(".sav")) {
        const result = await parseSavFile(file);
        if (result.rows.length > 0) {
          const newIdx = datasets.length;
          setDatasets(prev => [...prev, { columns: result.columns, rows: result.rows, filename: file.name }]);
          setSelectedDataset(newIdx);
        } else setUploadError("No data found in the SPSS file.");
      } else {
        await new Promise<void>((resolve) => {
          Papa.parse(file, {
            header: true, dynamicTyping: true, skipEmptyLines: true, delimiter: "",
            complete: (result) => {
              if (result.data?.length > 0) {
                const columns = Object.keys(result.data[0] as object);
                const newIdx = datasets.length;
                setDatasets(prev => [...prev, { columns, rows: result.data as DataRow[], filename: file.name }]);
                setSelectedDataset(newIdx);
              } else setUploadError("No data found in the file.");
              resolve();
            },
            error: (err) => { setUploadError(`Parse error: ${err.message}`); resolve(); },
          });
        });
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to parse file.");
    }
    setUploading(false);
  }, [datasets.length]);

  const loadSampleData = () => {
    const ds = sampleDataset();
    const newIdx = datasets.length;
    setDatasets(prev => [...prev, ds]);
    setSelectedDataset(newIdx);
  };

  const completed = [
    !!(researchQuestion && hypothesis && hypothesisType),
    !!activeDataset,
    !!activeDataset,
    effects.length >= 2,
    canvas.length > 0,
  ];

  // ========== RENDER ==========
  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* Top nav */}
      <header className="border-b border-rule bg-paper-soft">
        <div className="max-w-6xl mx-auto flex items-center justify-end px-6 py-3">
          <nav className="flex items-center gap-5 text-sm">
            <span className="text-ink font-medium border-b-2 border-secondary pb-2 -mb-2">Meta-Analysis</span>
            <Link href={`/dashboard/project/${projectId}/scholar-ask`} className="text-ink-muted hover:text-ink">ScholarAsk</Link>
            <Link href={`/dashboard/project/${projectId}`} className="text-ink-muted hover:text-ink">Workspace</Link>
            <Link href={`/dashboard/project/${projectId}/literature-review`} className="text-ink-muted hover:text-ink">Literature Review</Link>
            <Link href={`/dashboard/project/${projectId}/paper-writer`} className="text-ink-muted hover:text-ink">Paper Writer</Link>
          </nav>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Page header */}
        <div className="mb-5">
          <h1 className="text-xl font-bold text-ink">Meta-Analysis</h1>
          <p className="text-xs text-ink-faint">{projectName || "Project"}</p>
        </div>

        {/* Progress */}
        <div className="mb-7">
          <StepProgress step={step} onStep={setStep} completed={completed} />
        </div>

        {/* STEP 1 — Define question */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-ink mb-1">Define your research question</h2>
              <p className="text-xs text-ink-faint">Start by writing your research question and hypothesis. This will guide every step of your meta-analysis.</p>
            </div>
            <div className="bg-secondary-soft border border-secondary/30 rounded-md px-4 py-3 text-xs text-[#f4a9c0]">
              A meta-analysis combines results from multiple studies to find an overall effect. You need a clear, focused question before you can search for relevant studies.
            </div>
            <div className="bg-paper-soft border border-rule rounded-lg p-5 space-y-4">
              <div>
                <label className="text-xs text-ink-muted block mb-1">Research question</label>
                <textarea
                  value={researchQuestion}
                  onChange={e => setResearchQuestion(e.target.value)}
                  placeholder="What is the effect of X on Y?"
                  className="w-full bg-paper border border-rule rounded-md px-3 py-2 text-sm text-ink focus:border-secondary focus:outline-none resize-none"
                  rows={2}
                />
              </div>
              <div>
                <label className="text-xs text-ink-muted block mb-1">Hypothesis</label>
                <textarea
                  value={hypothesis}
                  onChange={e => setHypothesis(e.target.value)}
                  placeholder="We predict that..."
                  className="w-full bg-paper border border-rule rounded-md px-3 py-2 text-sm text-ink focus:border-secondary focus:outline-none resize-none"
                  rows={2}
                />
              </div>
            </div>

            <div className="bg-paper-soft border border-rule rounded-lg p-5">
              <h3 className="text-sm font-semibold text-ink mb-3">What type of hypothesis is this?</h3>
              <div className="grid md:grid-cols-3 gap-3">
                {HYPOTHESIS_TYPES.map(ht => (
                  <button
                    key={ht.key}
                    onClick={() => setHypothesisType(ht.key)}
                    className={`text-left rounded-md border p-3 transition-colors ${
                      hypothesisType === ht.key
                        ? "border-secondary bg-secondary-soft"
                        : "border-rule hover:border-edge"
                    }`}
                  >
                    <div className={`text-sm font-medium mb-1 ${hypothesisType === ht.key ? "text-secondary" : "text-ink"}`}>{ht.title}</div>
                    <div className="text-xs text-ink-faint">{ht.desc}</div>
                  </button>
                ))}
                <div className="rounded-md border border-dashed border-edge p-3 text-center flex flex-col justify-center">
                  <div className="text-xs text-ink-faint">Not sure?</div>
                  <Link href={`/dashboard/project/${projectId}/scholar-ask`} className="text-xs text-secondary hover:underline">Get AI help</Link>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                disabled={!completed[0]}
                onClick={() => setStep(2)}
                className="px-4 py-2 text-sm bg-primary text-ink rounded-md hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed"
              >Continue to data upload ›</button>
            </div>
          </div>
        )}

        {/* STEP 2 — Upload data */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-ink mb-1">Upload your dataset</h2>
              <p className="text-xs text-ink-faint">Upload a CSV, TSV, or SPSS .sav file containing your study data. Each row should represent one study or participant.</p>
            </div>
            <div className="bg-secondary-soft border border-secondary/30 rounded-md px-4 py-3 text-xs text-[#f4a9c0]">
              Not sure what format to use? Download the sample dataset to see exactly what columns are expected for your hypothesis type.
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="bg-paper-soft border-2 border-dashed border-edge hover:border-secondary rounded-lg p-10 text-center cursor-pointer transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-secondary-soft mx-auto mb-3 flex items-center justify-center">
                <svg className="w-6 h-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0-12l-4 4m4-4l4 4M4 20h16" />
                </svg>
              </div>
              <p className="text-sm text-ink font-medium">{uploading ? "Parsing file..." : "Drop your file here"}</p>
              <p className="text-xs text-ink-faint mt-1">CSV, TSV, or SPSS .sav · max 50MB</p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); downloadCSV(sampleDataset()); }}
                className="mt-4 px-3 py-1.5 text-xs bg-paper border border-edge rounded-md hover:border-ink text-ink"
              >↓ Download sample dataset</button>
              <input ref={fileInputRef} type="file" accept=".csv,.tsv,.txt,.sav" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }} />
            </div>
            {uploadError && <p className="text-red-400 text-xs">{uploadError}</p>}

            {datasets.length > 0 && (
              <div className="space-y-2">
                {datasets.map((ds, i) => (
                  <div key={i} onClick={() => setSelectedDataset(i)}
                    className={`bg-paper-soft rounded-lg border p-3 cursor-pointer ${selectedDataset === i ? "border-secondary" : "border-rule"}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-ink">{ds.filename}</span>
                      <span className="text-xs text-ink-faint">{ds.rows.length} rows × {ds.columns.length} cols</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(1)} className="px-4 py-2 text-sm border border-edge text-ink rounded-md hover:border-ink">‹ Back</button>
              <button
                disabled={!activeDataset}
                onClick={() => setStep(3)}
                className="px-4 py-2 text-sm bg-primary text-ink rounded-md hover:bg-black disabled:opacity-40"
              >Continue to analysis ›</button>
              <button onClick={loadSampleData} className="ml-auto px-3 py-2 text-xs text-ink-muted hover:text-ink">Load sample data →</button>
            </div>
          </div>
        )}

        {/* STEP 3 — Analyze */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-ink mb-1">Analyze data</h2>
              <p className="text-xs text-ink-faint">Review descriptive statistics and run your hypothesis test. All calculations happen in your browser — no data is sent to a server.</p>
            </div>
            {!activeDataset ? (
              <div className="text-center py-12 bg-paper-soft border border-rule rounded-lg text-sm text-ink-faint">Upload a dataset in Step 2 to begin.</div>
            ) : (
              <>
                {/* Stat tiles */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(() => {
                    const tiles = [
                      { value: activeDataset.rows.length, label: "Studies" },
                      { value: mapping.n ? getNumericValues(activeDataset.rows, mapping.n).reduce((a, b) => a + b, 0) : "—", label: "Total N" },
                      { value: mapping.effect ? mean(getNumericValues(activeDataset.rows, mapping.effect)).toFixed(2) : "—", label: `Mean ${mapping.effect || "effect"}` },
                      { value: mapping.effect ? stdDev(getNumericValues(activeDataset.rows, mapping.effect)).toFixed(2) : "—", label: "Std deviation" },
                    ];
                    return tiles.map(t => (
                      <div key={t.label} className="bg-paper-soft border border-rule rounded-lg p-4">
                        <div className="text-2xl font-bold text-ink">{t.value}</div>
                        <div className="text-xs text-ink-faint mt-1">{t.label}</div>
                      </div>
                    ));
                  })()}
                </div>

                {/* Correlation matrix */}
                {numericCols.length >= 2 && (
                  <div className="bg-paper-soft border border-rule rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-ink mb-3">Correlation matrix</h3>
                    <div className="overflow-auto">
                      <table className="text-xs w-full">
                        <thead>
                          <tr className="text-ink-muted">
                            <th className="text-left p-2"></th>
                            {numericCols.slice(0, 5).map(c => <th key={c} className="text-left p-2">{c}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {numericCols.slice(0, 5).map(rowCol => (
                            <tr key={rowCol} className="border-t border-rule">
                              <td className="p-2 text-ink-muted font-medium">{rowCol}</td>
                              {numericCols.slice(0, 5).map(colCol => {
                                const r = correlation(getNumericValues(activeDataset.rows, rowCol), getNumericValues(activeDataset.rows, colCol));
                                const sig = Math.abs(r) > 0.5 ? "**" : Math.abs(r) > 0.3 ? "*" : "";
                                return <td key={colCol} className={`p-2 ${rowCol === colCol ? "text-ink" : sig ? "text-secondary" : "text-ink-muted"}`}>{r.toFixed(2)}{sig}</td>;
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[10px] text-ink-faint mt-2">* |r| &gt; 0.3 &nbsp; ** |r| &gt; 0.5</p>
                  </div>
                )}

                {/* T-test */}
                <div className="bg-paper-soft border border-rule rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-ink">Independent samples t-test</h3>
                    <div className="flex gap-2 text-xs">
                      <select value={groupCol} onChange={e => setGroupCol(e.target.value)} className="bg-paper border border-rule rounded px-2 py-1 text-ink">
                        <option value="">Group column</option>
                        {activeDataset.columns.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <select value={valueCol} onChange={e => setValueCol(e.target.value)} className="bg-paper border border-rule rounded px-2 py-1 text-ink">
                        <option value="">Value column</option>
                        {numericCols.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  {groupCol && valueCol ? (() => {
                    const groups: Record<string, number[]> = {};
                    for (const row of activeDataset.rows) {
                      const g = String(row[groupCol] ?? "");
                      const v = Number(row[valueCol]);
                      if (!isFinite(v)) continue;
                      (groups[g] = groups[g] || []).push(v);
                    }
                    const keys = Object.keys(groups).filter(k => groups[k].length >= 2);
                    if (keys.length < 2) return <p className="text-xs text-ink-faint">Need ≥2 groups with ≥2 values each.</p>;
                    const [a, b] = [groups[keys[0]], groups[keys[1]]];
                    const res = tTest(a, b);
                    const p = 2 * (1 - (1 / (1 + Math.exp(-1.7 * Math.abs(res.t)))));
                    const sig = p < 0.05;
                    return (
                      <table className="text-xs w-full">
                        <thead><tr className="text-ink-muted">
                          <th className="text-left p-2">Group</th><th className="p-2">n</th><th className="p-2">Mean</th><th className="p-2">SD</th><th className="p-2">t</th><th className="p-2">p-value</th><th className="p-2">Result</th>
                        </tr></thead>
                        <tbody>
                          <tr className="border-t border-rule">
                            <td className="p-2 text-ink-muted">{keys[0]}</td><td className="p-2 text-center">{a.length}</td>
                            <td className="p-2 text-center">{mean(a).toFixed(2)}</td><td className="p-2 text-center">{stdDev(a).toFixed(2)}</td>
                            <td className="p-2 text-center" rowSpan={2}>{res.t.toFixed(2)}</td>
                            <td className={`p-2 text-center ${sig ? "text-secondary" : ""}`} rowSpan={2}>{p < 0.001 ? "<0.001" : p.toFixed(3)}</td>
                            <td className="p-2" rowSpan={2}>{sig && <span className="px-2 py-0.5 bg-success/15 text-success text-[10px] rounded">Significant</span>}</td>
                          </tr>
                          <tr className="border-t border-rule">
                            <td className="p-2 text-ink-muted">{keys[1]}</td><td className="p-2 text-center">{b.length}</td>
                            <td className="p-2 text-center">{mean(b).toFixed(2)}</td><td className="p-2 text-center">{stdDev(b).toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>
                    );
                  })() : <p className="text-xs text-ink-faint">Pick a group column and value column to run a t-test.</p>}
                </div>
              </>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(2)} className="px-4 py-2 text-sm border border-edge text-ink rounded-md hover:border-ink">‹ Back</button>
              <button onClick={() => setStep(4)} className="px-4 py-2 text-sm bg-primary text-ink rounded-md hover:bg-black">Continue to effect sizes ›</button>
            </div>
          </div>
        )}

        {/* STEP 4 — Effect sizes */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-ink mb-1">Effect sizes</h2>
              <p className="text-xs text-ink-faint">Effect sizes tell you how meaningful the difference is, not just whether it&apos;s statistically significant. Cohen&apos;s d &lt; 0.2 is small, 0.5 is medium, 0.8+ is large.</p>
            </div>

            {/* Column mapping */}
            {activeDataset && (
              <div className="bg-paper-soft border border-rule rounded-lg p-4">
                <h3 className="text-sm font-semibold text-ink mb-3">Map your columns</h3>
                <p className="text-xs text-ink-faint mb-3">Either provide <b>effect</b> + <b>se</b>, or group stats (<b>m1/sd1/n1</b> + <b>m2/sd2/n2</b>). Map more columns to unlock more plots.</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {(["study", "n", "effect", "se", "m1", "sd1", "n1", "m2", "sd2", "n2", "moderator", "events1", "total1", "events2", "total2"] as (keyof ColumnMapping)[]).map(key => (
                    <label key={key} className="block">
                      <span className="text-ink-muted">{key}</span>
                      <select
                        value={mapping[key] || ""}
                        onChange={e => setMapping(m => ({ ...m, [key]: e.target.value || undefined }))}
                        className="w-full mt-1 bg-paper border border-rule rounded px-2 py-1 text-ink"
                      >
                        <option value="">—</option>
                        {activeDataset.columns.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Summary tiles */}
            {pooled && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-paper-soft border border-rule rounded-lg p-4">
                  <div className="text-2xl font-bold text-secondary">{pooled.effect.toFixed(2)}</div>
                  <div className="text-xs text-ink-faint mt-1">Cohen&apos;s d (pooled)</div>
                </div>
                <div className="bg-paper-soft border border-rule rounded-lg p-4">
                  <div className="text-2xl font-bold text-secondary">[{pooled.ci[0].toFixed(2)}, {pooled.ci[1].toFixed(2)}]</div>
                  <div className="text-xs text-ink-faint mt-1">95% CI</div>
                </div>
                <div className="bg-paper-soft border border-rule rounded-lg p-4">
                  <div className="text-2xl font-bold text-secondary">{pooled.I2.toFixed(0)}%</div>
                  <div className="text-xs text-ink-faint mt-1">I² heterogeneity</div>
                </div>
                <div className="bg-paper-soft border border-rule rounded-lg p-4">
                  <div className="text-2xl font-bold text-secondary">{pooled.pValue < 0.001 ? "<0.001" : pooled.pValue.toFixed(3)}</div>
                  <div className="text-xs text-ink-faint mt-1">p-value</div>
                </div>
              </div>
            )}

            {pooled && pooled.I2 > 50 && (
              <div className="bg-warning/10 border border-warning/40 rounded-md px-4 py-3 text-xs text-warning">
                I² = {pooled.I2.toFixed(0)}% indicates substantial heterogeneity. Consider running a random-effects model or moderator analysis to account for variability between studies.
              </div>
            )}

            {/* Per-study table */}
            {effects.length > 0 && (
              <div className="bg-paper-soft border border-rule rounded-lg p-4">
                <h3 className="text-sm font-semibold text-ink mb-3">Effect size per study</h3>
                <div className="overflow-auto">
                  <table className="text-xs w-full">
                    <thead><tr className="text-ink-muted">
                      <th className="text-left p-2">Study</th><th className="p-2">n</th><th className="p-2">Effect</th><th className="p-2">95% CI</th><th className="p-2">Weight</th><th className="p-2">Interpretation</th>
                    </tr></thead>
                    <tbody>
                      {effects.map(e => {
                        const abs = Math.abs(e.effect);
                        const interp = abs < 0.2 ? "Small" : abs < 0.5 ? "Small" : abs < 0.8 ? "Medium" : "Large";
                        const color = interp === "Large" ? "bg-success/15 text-success" : interp === "Medium" ? "bg-warning/15 text-warning" : "bg-paper-sunken text-ink-muted";
                        return (
                          <tr key={e.name} className="border-t border-rule">
                            <td className="p-2 text-ink">{e.name}</td>
                            <td className="p-2 text-center text-ink-muted">{e.n}</td>
                            <td className="p-2 text-center text-secondary">{e.effect.toFixed(2)}</td>
                            <td className="p-2 text-center text-ink-muted">[{e.ci[0].toFixed(2)}, {e.ci[1].toFixed(2)}]</td>
                            <td className="p-2 text-center text-ink-muted">{e.weight.toFixed(1)}%</td>
                            <td className="p-2"><span className={`px-2 py-0.5 rounded text-[10px] ${color}`}>{interp}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(3)} className="px-4 py-2 text-sm border border-edge text-ink rounded-md hover:border-ink">‹ Back</button>
              <button
                disabled={effects.length < 2}
                onClick={() => setStep(5)}
                className="px-4 py-2 text-sm bg-primary text-ink rounded-md hover:bg-black disabled:opacity-40"
              >Continue to results ›</button>
            </div>
          </div>
        )}

        {/* STEP 5 — Results canvas */}
        {step === 5 && (
          <ResultsCanvas
            effects={effects}
            method={method}
            setMethod={setMethod}
            canvas={canvas}
            setCanvas={setCanvas}
            projectName={projectName}
            onBack={() => setStep(4)}
          />
        )}
      </div>
    </div>
  );
}

// ========== RESULTS CANVAS ==========
function ResultsCanvas({
  effects, method, setMethod, canvas, setCanvas, projectName, onBack,
}: {
  effects: StudyEffect[]; method: MetaMethod; setMethod: (m: MetaMethod) => void;
  canvas: CanvasBlock[]; setCanvas: (b: CanvasBlock[]) => void;
  projectName: string; onBack: () => void;
}) {
  const addBlock = (type: PlotType) => {
    setCanvas([...canvas, { id: crypto.randomUUID(), type, config: {} }]);
  };
  const removeBlock = (id: string) => setCanvas(canvas.filter(b => b.id !== id));
  const clearAll = () => setCanvas([]);
  const exportAll = () => {
    const svgs = Array.from(document.querySelectorAll("[data-plot-svg] svg"));
    svgs.forEach((svg, i) => {
      const serializer = new XMLSerializer();
      const blob = new Blob([serializer.serializeToString(svg)], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `plot-${i + 1}.svg`; a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="grid grid-cols-[220px_1fr] gap-4">
      {/* Left rail */}
      <aside className="bg-paper-soft border border-rule rounded-lg p-3 h-fit sticky top-4">
        <p className="text-[10px] uppercase tracking-wider text-ink-faint mb-2">Plots</p>
        <p className="text-[10px] text-ink-faint mb-3">Click any block to add it</p>
        <div className="space-y-1">
          {PLOT_CATALOG.map(p => (
            <button
              key={p.type}
              onClick={() => addBlock(p.type)}
              className="w-full text-left px-2 py-2 rounded-md hover:bg-secondary-soft hover:text-ink transition-colors group"
            >
              <div className="text-xs font-medium text-ink group-hover:text-secondary">{p.label}</div>
              <div className="text-[10px] text-ink-faint">{p.hint}</div>
            </button>
          ))}
        </div>
        <div className="border-t border-rule mt-3 pt-3">
          <p className="text-[10px] uppercase tracking-wider text-ink-faint mb-2">Statistical models</p>
          <div className="space-y-1">
            <button
              onClick={() => setMethod("random")}
              className={`w-full text-left text-xs px-2 py-1.5 rounded ${method === "random" ? "bg-secondary-soft text-secondary" : "text-ink-muted hover:text-ink"}`}
            >Random-effects</button>
            <button
              onClick={() => setMethod("fixed")}
              className={`w-full text-left text-xs px-2 py-1.5 rounded ${method === "fixed" ? "bg-secondary-soft text-secondary" : "text-ink-muted hover:text-ink"}`}
            >Fixed-effects</button>
          </div>
        </div>
      </aside>

      {/* Canvas */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">Analysis canvas</h2>
            <p className="text-xs text-ink-faint">{projectName || "Project"} · {effects.length} studies</p>
          </div>
          <div className="flex gap-2">
            <button onClick={clearAll} className="px-3 py-1.5 text-xs border border-edge text-ink-muted rounded-md hover:border-ink">Clear all</button>
            <button onClick={exportAll} className="px-3 py-1.5 text-xs bg-primary text-paper rounded-md hover:bg-black">↓ Export all</button>
          </div>
        </div>

        {canvas.length === 0 ? (
          <div className="bg-paper-soft border border-dashed border-edge rounded-lg p-16 text-center">
            <p className="text-sm text-ink-muted">Click a plot block from the left rail to add it to your canvas.</p>
            <p className="text-xs text-ink-faint mt-1">Tip: start with a Forest plot.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {canvas.map(block => {
              const meta = PLOT_CATALOG.find(p => p.type === block.type);
              return (
                <div key={block.id} className="bg-paper-soft border border-rule rounded-lg">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-rule">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 bg-secondary-soft text-secondary rounded">Plot</span>
                      <span className="text-sm font-medium text-ink">{meta?.label}</span>
                      <span className="text-xs text-ink-faint">· {meta?.hint}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-ink-faint">Model:</span>
                      <div className="flex bg-paper rounded overflow-hidden border border-rule">
                        <button onClick={() => setMethod("random")} className={`px-2 py-0.5 ${method === "random" ? "bg-primary text-ink" : "text-ink-muted"}`}>Random</button>
                        <button onClick={() => setMethod("fixed")} className={`px-2 py-0.5 ${method === "fixed" ? "bg-primary text-ink" : "text-ink-muted"}`}>Fixed</button>
                      </div>
                      <button onClick={() => removeBlock(block.id)} className="text-ink-faint hover:text-red-400 text-lg leading-none">×</button>
                    </div>
                  </div>
                  <div className="p-4" data-plot-svg>
                    <PlotRenderer type={block.type} effects={effects} method={method} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button onClick={onBack} className="px-4 py-2 text-sm border border-edge text-ink rounded-md hover:border-ink">‹ Back</button>
        </div>
      </section>
    </div>
  );
}
