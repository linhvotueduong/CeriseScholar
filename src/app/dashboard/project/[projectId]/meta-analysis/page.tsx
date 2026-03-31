"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Papa from "papaparse";
import { parseSavFile } from "@/lib/data/parseSav";
import MethodologyGuide from "@/components/meta/MethodologyGuide";
import Link from "next/link";

interface DataRow { [key: string]: string | number | null; }
interface StudyData { columns: string[]; rows: DataRow[]; filename: string; }

// ========== STATISTICS FUNCTIONS ==========

function mean(arr: number[]) { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function stdDev(arr: number[]) {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
}
function correlation(x: number[], y: number[]) {
  const n = Math.min(x.length, y.length);
  const mx = mean(x.slice(0, n)), my = mean(y.slice(0, n));
  const sx = stdDev(x.slice(0, n)), sy = stdDev(y.slice(0, n));
  if (sx === 0 || sy === 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += (x[i] - mx) * (y[i] - my);
  return sum / ((n - 1) * sx * sy);
}
function tTest(a: number[], b: number[]) {
  const ma = mean(a), mb = mean(b), sa = stdDev(a), sb = stdDev(b);
  const se = Math.sqrt(sa ** 2 / a.length + sb ** 2 / b.length);
  const t = (ma - mb) / se;
  const df = a.length + b.length - 2;
  return { t, df, meanDiff: ma - mb, se, cohensD: (ma - mb) / Math.sqrt((sa ** 2 + sb ** 2) / 2) };
}

function cohensD(m1: number, m2: number, s1: number, s2: number, n1: number, n2: number) {
  const pooledSD = Math.sqrt(((n1 - 1) * s1 ** 2 + (n2 - 1) * s2 ** 2) / (n1 + n2 - 2));
  const d = (m1 - m2) / pooledSD;
  const se = Math.sqrt((n1 + n2) / (n1 * n2) + d ** 2 / (2 * (n1 + n2)));
  return { d, se, ci_lower: d - 1.96 * se, ci_upper: d + 1.96 * se };
}
function hedgesG(d: number, n1: number, n2: number) {
  const df = n1 + n2 - 2;
  const c = 1 - 3 / (4 * df - 1);
  const g = d * c, se = Math.sqrt((n1 + n2) / (n1 * n2) + g ** 2 / (2 * (n1 + n2))) * c;
  return { g, se, ci_lower: g - 1.96 * se, ci_upper: g + 1.96 * se };
}
function heterogeneity(effects: { effect: number; se: number }[]) {
  const w = effects.map(e => 1 / e.se ** 2);
  const tw = w.reduce((a, b) => a + b, 0);
  const wm = w.reduce((s, wi, i) => s + wi * effects[i].effect, 0) / tw;
  const Q = w.reduce((s, wi, i) => s + wi * (effects[i].effect - wm) ** 2, 0);
  const df = effects.length - 1;
  const I2 = df > 0 ? Math.max(0, (Q - df) / Q * 100) : 0;
  return { pooledEffect: wm, pooledSE: Math.sqrt(1 / tw), pooledCI: [wm - 1.96 * Math.sqrt(1 / tw), wm + 1.96 * Math.sqrt(1 / tw)] as [number, number], Q, df, I2 };
}

function getNumericValues(rows: DataRow[], col: string): number[] {
  return rows.map(r => Number(r[col])).filter(v => !isNaN(v) && v !== null);
}

type Tab = "guide" | "upload" | "analyze" | "calculator" | "results";

export default function MetaAnalysisPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>("guide");
  const [datasets, setDatasets] = useState<StudyData[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<number | null>(null);

  // Analyze tab state
  const [analyzeType, setAnalyzeType] = useState<"descriptive" | "correlation" | "ttest">("descriptive");
  const [selectedCols, setSelectedCols] = useState<string[]>([]);
  const [groupCol, setGroupCol] = useState("");
  const [valueCol, setValueCol] = useState("");

  // Calculator state
  const [studies, setStudies] = useState([
    { name: "Study 1", mean1: "", sd1: "", n1: "", mean2: "", sd2: "", n2: "" },
  ]);
  const [results, setResults] = useState<{
    effects: { name: string; d: number; g: number; se: number; ci: [number, number] }[];
    meta: ReturnType<typeof heterogeneity> | null;
  } | null>(null);

  const activeDataset = selectedDataset !== null ? datasets[selectedDataset] : null;

  // Detect numeric columns
  const numericCols = useMemo(() => {
    if (!activeDataset) return [];
    return activeDataset.columns.filter(col => {
      const vals = getNumericValues(activeDataset.rows, col);
      return vals.length > activeDataset.rows.length * 0.5; // >50% numeric
    });
  }, [activeDataset]);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Upload — handles CSV, TSV, and SPSS .sav files
  const handleFileUpload = useCallback(async (file: File) => {
    setUploadError(null);
    setUploading(true);

    try {
      if (file.name.endsWith(".sav")) {
        // SPSS .sav file
        const result = await parseSavFile(file);
        if (result.rows.length > 0) {
          const newIdx = datasets.length;
          setDatasets(prev => [...prev, { columns: result.columns, rows: result.rows, filename: file.name }]);
          setSelectedDataset(newIdx);
        } else {
          setUploadError("No data found in the SPSS file.");
        }
      } else {
        // CSV / TSV
        await new Promise<void>((resolve) => {
          Papa.parse(file, {
            header: true, dynamicTyping: true, skipEmptyLines: true,
            delimiter: "", // auto-detect
            complete: (result) => {
              if (result.data?.length > 0) {
                const columns = Object.keys(result.data[0] as object);
                const newIdx = datasets.length;
                setDatasets(prev => [...prev, { columns, rows: result.data as DataRow[], filename: file.name }]);
                setSelectedDataset(newIdx);
              } else {
                setUploadError("No data found in the file.");
              }
              resolve();
            },
            error: (err) => {
              setUploadError(`Parse error: ${err.message}`);
              resolve();
            },
          });
        });
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to parse file.");
    }

    setUploading(false);
  }, [datasets.length]);

  // Column stats
  function colStats(col: string) {
    if (!activeDataset) return null;
    const vals = getNumericValues(activeDataset.rows, col);
    if (vals.length === 0) return null;
    const sorted = [...vals].sort((a, b) => a - b);
    return {
      n: vals.length, mean: mean(vals), sd: stdDev(vals),
      min: sorted[0], max: sorted[sorted.length - 1],
      median: sorted[Math.floor(sorted.length / 2)],
    };
  }

  // Calculator functions
  function addStudy() {
    setStudies(p => [...p, { name: `Study ${p.length + 1}`, mean1: "", sd1: "", n1: "", mean2: "", sd2: "", n2: "" }]);
  }
  function updateStudy(i: number, f: string, v: string) {
    setStudies(p => p.map((s, idx) => idx === i ? { ...s, [f]: v } : s));
  }
  function calculate() {
    const valid = studies.filter(s => s.mean1 && s.sd1 && s.n1 && s.mean2 && s.sd2 && s.n2);
    if (!valid.length) return;
    const effects = valid.map(s => {
      const cd = cohensD(+s.mean1, +s.mean2, +s.sd1, +s.sd2, +s.n1, +s.n2);
      const hg = hedgesG(cd.d, +s.n1, +s.n2);
      return { name: s.name, d: cd.d, g: hg.g, se: hg.se, ci: [hg.ci_lower, hg.ci_upper] as [number, number] };
    });
    const meta = effects.length >= 2 ? heterogeneity(effects.map(e => ({ effect: e.g, se: e.se }))) : null;
    setResults({ effects, meta });
    setTab("results");
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-4">
        <Link href={`/dashboard/project/${projectId}`} className="text-sm text-gray-500 hover:text-[#DE3163]">&larr; Back to project</Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Meta-Analysis</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {([["guide", "Methodology Guide"], ["upload", "Data Upload"], ["analyze", "Analyze Data"], ["calculator", "Effect Sizes"], ["results", "Results & Forest Plot"]] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-[#DE3163] text-[#DE3163]" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ===== TAB: METHODOLOGY GUIDE ===== */}
      {tab === "guide" && (
        <MethodologyGuide
          datasets={datasets}
          selectedDataset={selectedDataset}
          numericCols={numericCols}
          onRunTTest={() => { setTab("analyze"); }}
          onRunCorrelation={() => { setTab("analyze"); }}
        />
      )}

      {/* ===== TAB: DATA UPLOAD ===== */}
      {tab === "upload" && (
        <div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="font-semibold text-gray-800 mb-2">Upload Dataset</h2>
            <p className="text-sm text-gray-500 mb-1">
              Upload <strong>CSV</strong>, <strong>TSV</strong>, or <strong>SPSS (.sav)</strong> files.
              For ICPSR data, download the <strong>SPSS</strong> format and upload the .sav file directly.
            </p>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-[#DE3163] transition-colors"
              onClick={() => fileInputRef.current?.click()}>
              {uploading ? (
                <p className="text-[#DE3163] font-medium">Parsing file...</p>
              ) : (
                <>
                  <p className="text-gray-500">Drop a file here or click to browse</p>
                  <p className="text-xs text-gray-400 mt-1">.csv, .tsv, .txt, .sav (SPSS)</p>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept=".csv,.tsv,.txt,.sav" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }} />
            {uploadError && <p className="text-red-600 text-sm mt-2">{uploadError}</p>}
          </div>

          {datasets.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800">Datasets ({datasets.length})</h3>
              {datasets.map((ds, i) => (
                <div key={i} className={`bg-white rounded-xl border p-4 cursor-pointer ${selectedDataset === i ? "border-[#DE3163]" : "border-gray-200"}`}
                  onClick={() => setSelectedDataset(i)}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-800">{ds.filename}</h4>
                    <span className="text-xs text-gray-400">{ds.rows.length} rows × {ds.columns.length} cols</span>
                  </div>
                  {selectedDataset === i && (
                    <>
                      {/* Column statistics */}
                      <div className="mb-3 overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead><tr className="bg-blue-50">
                            <th className="px-2 py-1 text-left font-semibold">Column</th>
                            <th className="px-2 py-1 text-center">N</th>
                            <th className="px-2 py-1 text-center">Mean</th>
                            <th className="px-2 py-1 text-center">SD</th>
                            <th className="px-2 py-1 text-center">Min</th>
                            <th className="px-2 py-1 text-center">Max</th>
                            <th className="px-2 py-1 text-center">Median</th>
                          </tr></thead>
                          <tbody>
                            {numericCols.slice(0, 20).map(col => {
                              const s = colStats(col);
                              if (!s) return null;
                              return (
                                <tr key={col} className="border-b border-gray-50">
                                  <td className="px-2 py-1 font-medium text-gray-700">{col}</td>
                                  <td className="px-2 py-1 text-center">{s.n}</td>
                                  <td className="px-2 py-1 text-center">{s.mean.toFixed(2)}</td>
                                  <td className="px-2 py-1 text-center">{s.sd.toFixed(2)}</td>
                                  <td className="px-2 py-1 text-center">{s.min}</td>
                                  <td className="px-2 py-1 text-center">{s.max}</td>
                                  <td className="px-2 py-1 text-center">{s.median}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        {numericCols.length > 20 && <p className="text-xs text-gray-400 mt-1">Showing first 20 of {numericCols.length} numeric columns</p>}
                      </div>
                      {/* Data preview */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead><tr className="bg-gray-50">
                            {ds.columns.map(col => <th key={col} className="px-2 py-1 text-left font-semibold text-gray-600 border-b">{col}</th>)}
                          </tr></thead>
                          <tbody>
                            {ds.rows.slice(0, 10).map((row, ri) => (
                              <tr key={ri} className="hover:bg-gray-50">
                                {ds.columns.map(col => <td key={col} className="px-2 py-1 border-b border-gray-100">{String(row[col] ?? "")}</td>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {ds.rows.length > 10 && <p className="text-xs text-gray-400 mt-1">Showing 10 of {ds.rows.length} rows</p>}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== TAB: ANALYZE DATA ===== */}
      {tab === "analyze" && (
        <div>
          {!activeDataset ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-500">Upload a dataset first in the Data Upload tab.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Analysis type selector */}
              <div className="flex gap-2">
                {([["descriptive", "Descriptive Stats"], ["correlation", "Correlation Matrix"], ["ttest", "T-Test"]] as ["descriptive" | "correlation" | "ttest", string][]).map(([t, label]) => (
                  <button key={t} onClick={() => { setAnalyzeType(t); setSelectedCols([]); }}
                    className={`px-3 py-1.5 text-sm rounded-lg ${analyzeType === t ? "bg-[#DE3163] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    {label}
                  </button>
                ))}
              </div>

              {/* DESCRIPTIVE STATS */}
              {analyzeType === "descriptive" && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="font-semibold text-gray-800 mb-3">Descriptive Statistics</h2>
                  <p className="text-sm text-gray-500 mb-3">Select columns to analyze:</p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {numericCols.map(col => (
                      <button key={col} onClick={() => setSelectedCols(p => p.includes(col) ? p.filter(c => c !== col) : [...p, col])}
                        className={`px-2 py-1 text-xs rounded ${selectedCols.includes(col) ? "bg-[#DE3163] text-white" : "bg-gray-100 text-gray-600"}`}>
                        {col}
                      </button>
                    ))}
                  </div>
                  {selectedCols.length > 0 && (
                    <table className="w-full text-sm">
                      <thead><tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left">Variable</th>
                        <th className="px-3 py-2 text-center">N</th>
                        <th className="px-3 py-2 text-center">Mean</th>
                        <th className="px-3 py-2 text-center">SD</th>
                        <th className="px-3 py-2 text-center">Min</th>
                        <th className="px-3 py-2 text-center">Max</th>
                        <th className="px-3 py-2 text-center">Median</th>
                      </tr></thead>
                      <tbody>
                        {selectedCols.map(col => {
                          const s = colStats(col);
                          if (!s) return null;
                          return (
                            <tr key={col} className="border-b border-gray-100">
                              <td className="px-3 py-2 font-medium">{col}</td>
                              <td className="px-3 py-2 text-center">{s.n}</td>
                              <td className="px-3 py-2 text-center">{s.mean.toFixed(3)}</td>
                              <td className="px-3 py-2 text-center">{s.sd.toFixed(3)}</td>
                              <td className="px-3 py-2 text-center">{s.min}</td>
                              <td className="px-3 py-2 text-center">{s.max}</td>
                              <td className="px-3 py-2 text-center">{s.median}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* CORRELATION MATRIX */}
              {analyzeType === "correlation" && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="font-semibold text-gray-800 mb-3">Correlation Matrix</h2>
                  <p className="text-sm text-gray-500 mb-3">Select variables (at least 2):</p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {numericCols.map(col => (
                      <button key={col} onClick={() => setSelectedCols(p => p.includes(col) ? p.filter(c => c !== col) : [...p, col])}
                        className={`px-2 py-1 text-xs rounded ${selectedCols.includes(col) ? "bg-[#DE3163] text-white" : "bg-gray-100 text-gray-600"}`}>
                        {col}
                      </button>
                    ))}
                  </div>
                  {selectedCols.length >= 2 && (
                    <div className="overflow-x-auto">
                      <table className="text-sm">
                        <thead><tr>
                          <th className="px-3 py-2"></th>
                          {selectedCols.map(c => <th key={c} className="px-3 py-2 text-center font-medium text-xs">{c}</th>)}
                        </tr></thead>
                        <tbody>
                          {selectedCols.map(row => (
                            <tr key={row}>
                              <td className="px-3 py-2 font-medium text-xs">{row}</td>
                              {selectedCols.map(col => {
                                const x = getNumericValues(activeDataset.rows, row);
                                const y = getNumericValues(activeDataset.rows, col);
                                const r = row === col ? 1 : correlation(x, y);
                                const bg = r > 0.5 ? "bg-green-100" : r < -0.5 ? "bg-red-100" : r > 0.3 || r < -0.3 ? "bg-yellow-50" : "";
                                return (
                                  <td key={col} className={`px-3 py-2 text-center text-xs ${bg}`}>
                                    {r.toFixed(3)}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="text-xs text-gray-400 mt-2">Green = strong positive (r &gt; .5), Red = strong negative (r &lt; -.5)</p>
                    </div>
                  )}
                </div>
              )}

              {/* T-TEST */}
              {analyzeType === "ttest" && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="font-semibold text-gray-800 mb-3">Independent Samples T-Test</h2>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-sm text-gray-600 block mb-1">Grouping Variable (categorical):</label>
                      <select value={groupCol} onChange={e => setGroupCol(e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg">
                        <option value="">Select...</option>
                        {activeDataset.columns.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 block mb-1">Test Variable (numeric):</label>
                      <select value={valueCol} onChange={e => setValueCol(e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg">
                        <option value="">Select...</option>
                        {numericCols.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  {groupCol && valueCol && (() => {
                    const groups = [...new Set(activeDataset.rows.map(r => String(r[groupCol])))].filter(Boolean).slice(0, 2);
                    if (groups.length < 2) return <p className="text-sm text-gray-500">Need at least 2 groups. This variable has {groups.length}.</p>;
                    const g1 = activeDataset.rows.filter(r => String(r[groupCol]) === groups[0]).map(r => Number(r[valueCol])).filter(v => !isNaN(v));
                    const g2 = activeDataset.rows.filter(r => String(r[groupCol]) === groups[1]).map(r => Number(r[valueCol])).filter(v => !isNaN(v));
                    if (g1.length < 2 || g2.length < 2) return <p className="text-sm text-gray-500">Not enough data in groups.</p>;
                    const res = tTest(g1, g2);
                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-blue-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500">Group: {groups[0]}</p>
                            <p className="text-sm">N={g1.length}, M={mean(g1).toFixed(3)}, SD={stdDev(g1).toFixed(3)}</p>
                          </div>
                          <div className="bg-blue-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500">Group: {groups[1]}</p>
                            <p className="text-sm">N={g2.length}, M={mean(g2).toFixed(3)}, SD={stdDev(g2).toFixed(3)}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500">t-statistic</p>
                            <p className="text-lg font-semibold">{res.t.toFixed(3)}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500">df</p>
                            <p className="text-lg font-semibold">{res.df}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500">Mean Difference</p>
                            <p className="text-lg font-semibold">{res.meanDiff.toFixed(3)}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500">Cohen&apos;s d</p>
                            <p className="text-lg font-semibold">{res.cohensD.toFixed(3)}</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">
                          <strong>Interpretation:</strong> {Math.abs(res.t) > 1.96 ? "Statistically significant (p < .05)" : "Not statistically significant (p > .05)"}. Effect size is {Math.abs(res.cohensD) < 0.2 ? "negligible" : Math.abs(res.cohensD) < 0.5 ? "small" : Math.abs(res.cohensD) < 0.8 ? "medium" : "large"}.
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===== TAB: EFFECT SIZE CALCULATOR ===== */}
      {tab === "calculator" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-1">Effect Size Calculator</h2>
          <p className="text-sm text-gray-500 mb-4">Enter group statistics from published studies.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-600">
                  <th className="px-2 py-2 text-left">Study</th>
                  <th className="px-2 py-2 text-center" colSpan={3}>Group 1 (Treatment)</th>
                  <th className="px-2 py-2 text-center" colSpan={3}>Group 2 (Control)</th>
                  <th></th>
                </tr>
                <tr className="bg-gray-50 text-xs text-gray-500">
                  <th></th><th className="px-2 py-1">Mean</th><th className="px-2 py-1">SD</th><th className="px-2 py-1">N</th>
                  <th className="px-2 py-1">Mean</th><th className="px-2 py-1">SD</th><th className="px-2 py-1">N</th><th></th>
                </tr>
              </thead>
              <tbody>
                {studies.map((s, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="px-1 py-1"><input value={s.name} onChange={e => updateStudy(i, "name", e.target.value)} className="w-full px-2 py-1 text-sm border border-gray-200 rounded" /></td>
                    {(["mean1","sd1","n1","mean2","sd2","n2"] as const).map(f => (
                      <td key={f} className="px-1 py-1"><input type="number" step="any" value={s[f]} onChange={e => updateStudy(i, f, e.target.value)} className="w-20 px-2 py-1 text-sm border border-gray-200 rounded text-center" placeholder="0" /></td>
                    ))}
                    <td className="px-1"><button onClick={() => setStudies(p => p.filter((_, idx) => idx !== i))} className="text-gray-300 hover:text-red-500">&times;</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={addStudy} className="text-sm text-[#DE3163] hover:underline">+ Add Study</button>
            <button onClick={calculate} className="px-4 py-2 text-sm bg-[#DE3163] text-white rounded-lg hover:bg-[#c4294f]">Calculate</button>
          </div>
        </div>
      )}

      {/* ===== TAB: RESULTS & FOREST PLOT ===== */}
      {tab === "results" && (
        <div>
          {!results ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-500">No results yet. Use the Effect Sizes tab first.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="font-semibold text-gray-800 mb-4">Effect Sizes</h2>
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 text-xs text-gray-600">
                    <th className="px-3 py-2 text-left">Study</th>
                    <th className="px-3 py-2 text-center">Cohen&apos;s d</th>
                    <th className="px-3 py-2 text-center">Hedges&apos; g</th>
                    <th className="px-3 py-2 text-center">SE</th>
                    <th className="px-3 py-2 text-center">95% CI</th>
                  </tr></thead>
                  <tbody>
                    {results.effects.map((e, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="px-3 py-2 font-medium">{e.name}</td>
                        <td className="px-3 py-2 text-center">{e.d.toFixed(3)}</td>
                        <td className="px-3 py-2 text-center">{e.g.toFixed(3)}</td>
                        <td className="px-3 py-2 text-center">{e.se.toFixed(3)}</td>
                        <td className="px-3 py-2 text-center">[{e.ci[0].toFixed(3)}, {e.ci[1].toFixed(3)}]</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Forest Plot */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="font-semibold text-gray-800 mb-4">Forest Plot</h2>
                <svg width="700" height={results.effects.length * 40 + (results.meta ? 60 : 20)}>
                  <line x1="350" y1="10" x2="350" y2={results.effects.length * 40 + (results.meta ? 50 : 10)} stroke="#ccc" strokeDasharray="4" />
                  {results.effects.map((e, i) => {
                    const y = 30 + i * 40, s = 100;
                    return (
                      <g key={i}>
                        <text x="10" y={y + 4} fontSize="12" fill="#333">{e.name}</text>
                        <line x1={Math.max(100, 350 + e.ci[0] * s)} y1={y} x2={Math.min(600, 350 + e.ci[1] * s)} y2={y} stroke="#333" />
                        <rect x={350 + e.g * s - 5} y={y - 5} width="10" height="10" fill="#DE3163" />
                        <text x="620" y={y + 4} fontSize="10" fill="#666">{e.g.toFixed(2)} [{e.ci[0].toFixed(2)}, {e.ci[1].toFixed(2)}]</text>
                      </g>
                    );
                  })}
                  {results.meta && (() => {
                    const y = 30 + results.effects.length * 40 + 10, s = 100;
                    const cx = 350 + results.meta.pooledEffect * s;
                    return (
                      <g>
                        <text x="10" y={y + 4} fontSize="12" fontWeight="bold" fill="#333">Pooled</text>
                        <polygon points={`${350 + results.meta.pooledCI[0] * s},${y} ${cx},${y - 8} ${350 + results.meta.pooledCI[1] * s},${y} ${cx},${y + 8}`} fill="#DE3163" opacity="0.7" />
                        <text x="620" y={y + 4} fontSize="10" fontWeight="bold">{results.meta.pooledEffect.toFixed(2)} [{results.meta.pooledCI[0].toFixed(2)}, {results.meta.pooledCI[1].toFixed(2)}]</text>
                      </g>
                    );
                  })()}
                </svg>
              </div>

              {/* Heterogeneity */}
              {results.meta && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="font-semibold text-gray-800 mb-4">Heterogeneity</h2>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Pooled Effect (g)</p>
                      <p className="text-lg font-semibold">{results.meta.pooledEffect.toFixed(3)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Q Statistic</p>
                      <p className="text-lg font-semibold">{results.meta.Q.toFixed(3)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">I² (Heterogeneity)</p>
                      <p className="text-lg font-semibold">{results.meta.I2.toFixed(1)}%</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-3">
                    <strong>Interpretation:</strong> {results.meta.I2 < 25 ? "Low heterogeneity — consistent effects." : results.meta.I2 < 75 ? "Moderate heterogeneity — some variation." : "High heterogeneity — consider moderator analysis."}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
