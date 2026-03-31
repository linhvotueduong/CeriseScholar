"use client";

import { useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Papa from "papaparse";
import Link from "next/link";

interface DataRow {
  [key: string]: string | number;
}

interface StudyData {
  columns: string[];
  rows: DataRow[];
  filename: string;
}

// Effect size calculations
function cohensD(mean1: number, mean2: number, sd1: number, sd2: number, n1: number, n2: number) {
  const pooledSD = Math.sqrt(((n1 - 1) * sd1 * sd1 + (n2 - 1) * sd2 * sd2) / (n1 + n2 - 2));
  const d = (mean1 - mean2) / pooledSD;
  const se = Math.sqrt((n1 + n2) / (n1 * n2) + (d * d) / (2 * (n1 + n2)));
  return { d, se, ci_lower: d - 1.96 * se, ci_upper: d + 1.96 * se };
}

function hedgesG(d: number, n1: number, n2: number) {
  const df = n1 + n2 - 2;
  const correction = 1 - 3 / (4 * df - 1);
  const g = d * correction;
  const se = Math.sqrt((n1 + n2) / (n1 * n2) + (g * g) / (2 * (n1 + n2))) * correction;
  return { g, se, ci_lower: g - 1.96 * se, ci_upper: g + 1.96 * se };
}

// Heterogeneity
function heterogeneity(effects: { effect: number; se: number }[]) {
  const weights = effects.map((e) => 1 / (e.se * e.se));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const weightedMean = weights.reduce((sum, w, i) => sum + w * effects[i].effect, 0) / totalWeight;
  const Q = weights.reduce((sum, w, i) => sum + w * Math.pow(effects[i].effect - weightedMean, 2), 0);
  const df = effects.length - 1;
  const I2 = df > 0 ? Math.max(0, ((Q - df) / Q) * 100) : 0;
  const seMean = Math.sqrt(1 / totalWeight);

  return {
    pooledEffect: weightedMean,
    pooledSE: seMean,
    pooledCI: [weightedMean - 1.96 * seMean, weightedMean + 1.96 * seMean] as [number, number],
    Q,
    df,
    pValue: df > 0 ? 1 - chi2CDF(Q, df) : 1,
    I2,
  };
}

// Simple chi-squared CDF approximation
function chi2CDF(x: number, k: number): number {
  if (x <= 0) return 0;
  const a = k / 2;
  let sum = 0;
  let term = 1 / a;
  sum = term;
  for (let n = 1; n < 200; n++) {
    term *= x / (2 * (a + n));
    sum += term;
    if (term < 1e-10) break;
  }
  return sum * Math.exp(-x / 2) * Math.pow(x / 2, a) / gamma(a);
}

function gamma(z: number): number {
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  z -= 1;
  const g = 7;
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

type Tab = "upload" | "calculator" | "results";

export default function MetaAnalysisPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>("upload");
  const [datasets, setDatasets] = useState<StudyData[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<number | null>(null);

  // Calculator state
  const [studies, setStudies] = useState<{
    name: string;
    mean1: string; sd1: string; n1: string;
    mean2: string; sd2: string; n2: string;
  }[]>([
    { name: "Study 1", mean1: "", sd1: "", n1: "", mean2: "", sd2: "", n2: "" },
  ]);
  const [results, setResults] = useState<{
    effects: { name: string; d: number; g: number; se: number; ci: [number, number] }[];
    meta: ReturnType<typeof heterogeneity> | null;
  } | null>(null);

  // Upload CSV
  const handleFileUpload = useCallback((file: File) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (result.data && result.data.length > 0) {
          const columns = Object.keys(result.data[0] as object);
          setDatasets((prev) => [
            ...prev,
            { columns, rows: result.data as DataRow[], filename: file.name },
          ]);
          setSelectedDataset(datasets.length);
          setTab("upload");
        }
      },
    });
  }, [datasets.length]);

  // Add study row
  function addStudy() {
    setStudies((prev) => [
      ...prev,
      { name: `Study ${prev.length + 1}`, mean1: "", sd1: "", n1: "", mean2: "", sd2: "", n2: "" },
    ]);
  }

  function updateStudy(index: number, field: string, value: string) {
    setStudies((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  }

  function removeStudy(index: number) {
    setStudies((prev) => prev.filter((_, i) => i !== index));
  }

  // Calculate effect sizes
  function calculate() {
    const validStudies = studies.filter(
      (s) => s.mean1 && s.sd1 && s.n1 && s.mean2 && s.sd2 && s.n2
    );

    if (validStudies.length === 0) return;

    const effects = validStudies.map((s) => {
      const m1 = parseFloat(s.mean1), m2 = parseFloat(s.mean2);
      const s1 = parseFloat(s.sd1), s2 = parseFloat(s.sd2);
      const n1 = parseFloat(s.n1), n2 = parseFloat(s.n2);
      const cd = cohensD(m1, m2, s1, s2, n1, n2);
      const hg = hedgesG(cd.d, n1, n2);
      return {
        name: s.name,
        d: cd.d,
        g: hg.g,
        se: hg.se,
        ci: [hg.ci_lower, hg.ci_upper] as [number, number],
      };
    });

    const meta = effects.length >= 2
      ? heterogeneity(effects.map((e) => ({ effect: e.g, se: e.se })))
      : null;

    setResults({ effects, meta });
    setTab("results");
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-4">
        <Link href={`/dashboard/project/${projectId}`} className="text-sm text-gray-500 hover:text-[#DE3163]">
          &larr; Back to project
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Meta-Analysis</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(["upload", "calculator", "results"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-[#DE3163] text-[#DE3163]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "upload" ? "Data Upload" : t === "calculator" ? "Effect Size Calculator" : "Results & Forest Plot"}
          </button>
        ))}
      </div>

      {/* TAB: Data Upload */}
      {tab === "upload" && (
        <div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="font-semibold text-gray-800 mb-3">Upload Dataset</h2>
            <p className="text-sm text-gray-500 mb-4">
              Upload CSV files with your study data. The data will be previewed below.
            </p>
            <div
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-[#DE3163] transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <p className="text-gray-500">Drop a CSV file here or click to browse</p>
              <p className="text-xs text-gray-400 mt-1">.csv files supported</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
                e.target.value = "";
              }}
            />
          </div>

          {/* Dataset list */}
          {datasets.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800">Uploaded Datasets ({datasets.length})</h3>
              {datasets.map((ds, i) => (
                <div
                  key={i}
                  className={`bg-white rounded-xl border p-4 cursor-pointer transition-all ${
                    selectedDataset === i ? "border-[#DE3163]" : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedDataset(i)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-800">{ds.filename}</h4>
                    <span className="text-xs text-gray-400">
                      {ds.rows.length} rows &times; {ds.columns.length} columns
                    </span>
                  </div>

                  {selectedDataset === i && (
                    <div className="overflow-x-auto mt-3">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50">
                            {ds.columns.map((col) => (
                              <th key={col} className="px-2 py-1 text-left font-semibold text-gray-600 border-b">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {ds.rows.slice(0, 20).map((row, ri) => (
                            <tr key={ri} className="hover:bg-gray-50">
                              {ds.columns.map((col) => (
                                <td key={col} className="px-2 py-1 border-b border-gray-100 text-gray-700">
                                  {String(row[col] ?? "")}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {ds.rows.length > 20 && (
                        <p className="text-xs text-gray-400 mt-2 text-center">
                          Showing first 20 of {ds.rows.length} rows
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: Effect Size Calculator */}
      {tab === "calculator" && (
        <div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-800 mb-1">Effect Size Calculator</h2>
            <p className="text-sm text-gray-500 mb-4">
              Enter group statistics for each study. Cohen&apos;s d and Hedges&apos; g will be calculated automatically.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-600">
                    <th className="px-2 py-2 text-left">Study Name</th>
                    <th className="px-2 py-2 text-center" colSpan={3}>Group 1 (Treatment)</th>
                    <th className="px-2 py-2 text-center" colSpan={3}>Group 2 (Control)</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                  <tr className="bg-gray-50 text-xs text-gray-500">
                    <th></th>
                    <th className="px-2 py-1">Mean</th>
                    <th className="px-2 py-1">SD</th>
                    <th className="px-2 py-1">N</th>
                    <th className="px-2 py-1">Mean</th>
                    <th className="px-2 py-1">SD</th>
                    <th className="px-2 py-1">N</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {studies.map((study, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="px-1 py-1">
                        <input
                          value={study.name}
                          onChange={(e) => updateStudy(i, "name", e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
                        />
                      </td>
                      {(["mean1", "sd1", "n1", "mean2", "sd2", "n2"] as const).map((field) => (
                        <td key={field} className="px-1 py-1">
                          <input
                            type="number"
                            step="any"
                            value={study[field]}
                            onChange={(e) => updateStudy(i, field, e.target.value)}
                            className="w-20 px-2 py-1 text-sm border border-gray-200 rounded text-center"
                            placeholder="0"
                          />
                        </td>
                      ))}
                      <td className="px-1 py-1">
                        <button
                          onClick={() => removeStudy(i)}
                          className="text-gray-300 hover:text-red-500 text-sm"
                        >
                          &times;
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={addStudy}
                className="text-sm text-[#DE3163] hover:underline"
              >
                + Add Study
              </button>
              <button
                onClick={calculate}
                className="px-4 py-2 text-sm bg-[#DE3163] text-white rounded-lg hover:bg-[#c4294f]"
              >
                Calculate Effect Sizes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Results & Forest Plot */}
      {tab === "results" && (
        <div>
          {!results ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-500">No results yet. Go to the Effect Size Calculator tab and enter your study data.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Effect sizes table */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="font-semibold text-gray-800 mb-4">Effect Sizes</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-600">
                      <th className="px-3 py-2 text-left">Study</th>
                      <th className="px-3 py-2 text-center">Cohen&apos;s d</th>
                      <th className="px-3 py-2 text-center">Hedges&apos; g</th>
                      <th className="px-3 py-2 text-center">SE</th>
                      <th className="px-3 py-2 text-center">95% CI</th>
                    </tr>
                  </thead>
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
                <div className="overflow-x-auto">
                  <svg width="700" height={results.effects.length * 40 + (results.meta ? 60 : 20)} className="text-sm">
                    {/* Axis */}
                    <line x1="350" y1="10" x2="350" y2={results.effects.length * 40 + (results.meta ? 50 : 10)} stroke="#ccc" strokeDasharray="4" />
                    <text x="350" y={results.effects.length * 40 + (results.meta ? 55 : 15) + 10} textAnchor="middle" fontSize="10" fill="#999">0</text>

                    {results.effects.map((e, i) => {
                      const y = 30 + i * 40;
                      const scale = 100; // pixels per unit
                      const cx = 350 + e.g * scale;
                      const ciLeft = 350 + e.ci[0] * scale;
                      const ciRight = 350 + e.ci[1] * scale;

                      return (
                        <g key={i}>
                          {/* Study name */}
                          <text x="10" y={y + 4} fontSize="12" fill="#333">{e.name}</text>
                          {/* CI line */}
                          <line x1={Math.max(100, ciLeft)} y1={y} x2={Math.min(600, ciRight)} y2={y} stroke="#333" strokeWidth="1" />
                          {/* Effect point */}
                          <rect x={cx - 5} y={y - 5} width="10" height="10" fill="#DE3163" />
                          {/* CI text */}
                          <text x="620" y={y + 4} fontSize="10" fill="#666">
                            {e.g.toFixed(2)} [{e.ci[0].toFixed(2)}, {e.ci[1].toFixed(2)}]
                          </text>
                        </g>
                      );
                    })}

                    {/* Pooled effect (diamond) */}
                    {results.meta && (() => {
                      const y = 30 + results.effects.length * 40 + 10;
                      const scale = 100;
                      const cx = 350 + results.meta.pooledEffect * scale;
                      const ciLeft = 350 + results.meta.pooledCI[0] * scale;
                      const ciRight = 350 + results.meta.pooledCI[1] * scale;

                      return (
                        <g>
                          <text x="10" y={y + 4} fontSize="12" fontWeight="bold" fill="#333">Pooled</text>
                          <polygon
                            points={`${ciLeft},${y} ${cx},${y - 8} ${ciRight},${y} ${cx},${y + 8}`}
                            fill="#DE3163"
                            opacity="0.7"
                          />
                          <text x="620" y={y + 4} fontSize="10" fontWeight="bold" fill="#333">
                            {results.meta.pooledEffect.toFixed(2)} [{results.meta.pooledCI[0].toFixed(2)}, {results.meta.pooledCI[1].toFixed(2)}]
                          </text>
                        </g>
                      );
                    })()}
                  </svg>
                </div>
              </div>

              {/* Heterogeneity */}
              {results.meta && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="font-semibold text-gray-800 mb-4">Heterogeneity Statistics</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">p-value (Q test)</p>
                      <p className="text-lg font-semibold">{results.meta.pValue < 0.001 ? "< .001" : results.meta.pValue.toFixed(3)}</p>
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-gray-600">
                    <p>
                      <strong>Interpretation:</strong>{" "}
                      {results.meta.I2 < 25
                        ? "Low heterogeneity — effects are consistent across studies."
                        : results.meta.I2 < 75
                        ? "Moderate heterogeneity — some variation in effects across studies."
                        : "High heterogeneity — substantial variation in effects. Consider moderator analysis."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
