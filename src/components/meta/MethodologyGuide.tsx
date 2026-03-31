"use client";

import { useState, useMemo } from "react";

interface DataRow { [key: string]: string | number | null; }
interface StudyData { columns: string[]; rows: DataRow[]; filename: string; }

// ========== HYPOTHESIS TYPES ==========
type HypothesisType = "comparison" | "correlation" | "prediction" | "moderation" | "mediation";

interface HypothesisInfo {
  type: HypothesisType;
  label: string;
  description: string;
  example: string;
  ivType: string;
  dvType: string;
  suggestedTests: string[];
  suggestedVisualizations: string[];
}

const HYPOTHESIS_TYPES: HypothesisInfo[] = [
  {
    type: "comparison",
    label: "Group Comparison",
    description: "Comparing means between two or more groups",
    example: "Students exposed to geopolitical disruption will show higher stress than those not exposed.",
    ivType: "categorical",
    dvType: "continuous",
    suggestedTests: ["Independent Samples T-Test", "One-Way ANOVA", "Mann-Whitney U (if non-normal)"],
    suggestedVisualizations: ["Box Plot", "Bar Chart with Error Bars"],
  },
  {
    type: "correlation",
    label: "Relationship / Correlation",
    description: "Testing whether two continuous variables are related",
    example: "There is a significant relationship between technology use and anxiety levels among students.",
    ivType: "continuous",
    dvType: "continuous",
    suggestedTests: ["Pearson Correlation", "Spearman Correlation (if non-normal)", "Partial Correlation (with covariates)"],
    suggestedVisualizations: ["Scatter Plot", "Correlation Matrix Heatmap"],
  },
  {
    type: "prediction",
    label: "Prediction / Regression",
    description: "Testing whether one or more variables predict an outcome",
    example: "Geopolitical uncertainty and technology disruption predict psychological stress in college students.",
    ivType: "continuous or categorical",
    dvType: "continuous",
    suggestedTests: ["Simple Linear Regression", "Multiple Linear Regression", "Hierarchical Regression"],
    suggestedVisualizations: ["Scatter Plot with Regression Line", "Residual Plot", "Coefficient Plot"],
  },
  {
    type: "moderation",
    label: "Moderation / Interaction",
    description: "Testing whether the effect of X on Y depends on a third variable",
    example: "The effect of geopolitical disruption on stress is stronger for students with high technology dependence.",
    ivType: "continuous or categorical",
    dvType: "continuous",
    suggestedTests: ["Moderated Regression (interaction term)", "Two-Way ANOVA", "PROCESS Model 1"],
    suggestedVisualizations: ["Interaction Plot", "Simple Slopes Plot"],
  },
  {
    type: "mediation",
    label: "Mediation",
    description: "Testing whether X affects Y through an intermediate variable M",
    example: "Geopolitical uncertainty increases stress through reduced sense of control.",
    ivType: "continuous or categorical",
    dvType: "continuous",
    suggestedTests: ["Baron & Kenny Steps", "Sobel Test", "Bootstrap Mediation (PROCESS Model 4)"],
    suggestedVisualizations: ["Path Diagram", "Indirect Effect Plot"],
  },
];

// ========== DATA SUGGESTIONS ==========
const KEYWORD_TO_SCALES: Record<string, string[]> = {
  stress: ["Perceived Stress Scale (PSS)", "Depression Anxiety Stress Scale (DASS)", "Student Stress Inventory"],
  anxiety: ["GAD-7", "Beck Anxiety Inventory (BAI)", "State-Trait Anxiety Inventory (STAI)"],
  depression: ["PHQ-9", "Beck Depression Inventory (BDI)", "CES-D"],
  mental: ["K6/K10 Distress Scale", "SF-36 Mental Health", "WHO-5 Well-Being Index"],
  wellbeing: ["WHO-5 Well-Being Index", "Satisfaction with Life Scale (SWLS)", "Ryff Psychological Well-Being"],
  technology: ["Technology Use Survey", "Problematic Internet Use Scale", "Digital Stress Scale"],
  geopolitical: ["Political Uncertainty Scale", "Perceived Threat Scale", "World Assumptions Scale"],
  resilience: ["Connor-Davidson Resilience Scale (CD-RISC)", "Brief Resilience Scale (BRS)"],
  academic: ["Academic Performance (GPA)", "Academic Motivation Scale", "Student Engagement"],
  coping: ["Brief COPE", "Ways of Coping Questionnaire", "Coping Strategy Indicator"],
  social: ["Multidimensional Scale of Perceived Social Support", "UCLA Loneliness Scale", "Social Network Index"],
};

const ICPSR_SEARCH_SUGGESTIONS: Record<string, string[]> = {
  stress: ["mental health survey", "stress college students", "psychological well-being"],
  anxiety: ["anxiety disorder survey", "mental health services", "student mental health"],
  depression: ["depression survey national", "mental health epidemiology"],
  technology: ["technology use survey", "internet use behavior", "digital media"],
  geopolitical: ["political attitudes survey", "national security perceptions", "conflict exposure"],
  academic: ["education longitudinal study", "student outcomes survey", "academic achievement"],
  health: ["national health survey", "health behavior", "substance use"],
};

type Step = 1 | 1.5 | 2 | 3;

interface MethodologyGuideProps {
  datasets: StudyData[];
  selectedDataset: number | null;
  numericCols: string[];
  onRunTTest: (groupCol: string, valueCol: string) => void;
  onRunCorrelation: (cols: string[]) => void;
}

export default function MethodologyGuide({
  datasets,
  selectedDataset,
  numericCols,
}: MethodologyGuideProps) {
  const [step, setStep] = useState<Step>(1);

  // Step 1 state
  const [researchQuestion, setResearchQuestion] = useState("");
  const [hypothesisText, setHypothesisText] = useState("");
  const [selectedType, setSelectedType] = useState<HypothesisType | null>(null);
  const [ivName, setIvName] = useState("");
  const [dvName, setDvName] = useState("");
  const [moderator, setModerator] = useState("");

  // Step 2 state
  const [ivColumn, setIvColumn] = useState("");
  const [dvColumn, setDvColumn] = useState("");
  const [moderatorColumn, setModeratorColumn] = useState("");
  const [covariateColumns, setCovariateColumns] = useState<string[]>([]);

  const activeDataset = selectedDataset !== null ? datasets[selectedDataset] : null;
  const allCols = activeDataset?.columns || [];

  // Extract keywords from research question for suggestions
  const detectedKeywords = useMemo(() => {
    const text = (researchQuestion + " " + hypothesisText + " " + ivName + " " + dvName).toLowerCase();
    return Object.keys(KEYWORD_TO_SCALES).filter(k => text.includes(k));
  }, [researchQuestion, hypothesisText, ivName, dvName]);

  const selectedHypothesis = HYPOTHESIS_TYPES.find(h => h.type === selectedType);

  // Step 3: Generate recommendations
  const recommendations = useMemo(() => {
    if (!selectedType || !ivColumn || !dvColumn || !activeDataset) return null;

    const info = HYPOTHESIS_TYPES.find(h => h.type === selectedType)!;

    // Check if IV is categorical or continuous
    const ivVals = activeDataset.rows.map(r => r[ivColumn]).filter(v => v !== null);
    const uniqueIV = new Set(ivVals);
    const ivIsCategorical = uniqueIV.size <= 10;
    const ivGroups = ivIsCategorical ? uniqueIV.size : 0;

    // Check DV normality (simple skewness check)
    const dvVals = activeDataset.rows.map(r => Number(r[dvColumn])).filter(v => !isNaN(v));
    const n = dvVals.length;
    const dvMean = dvVals.reduce((a, b) => a + b, 0) / n;
    const dvSD = Math.sqrt(dvVals.reduce((s, v) => s + (v - dvMean) ** 2, 0) / (n - 1));
    const skewness = dvVals.reduce((s, v) => s + ((v - dvMean) / dvSD) ** 3, 0) / n;
    const isNormal = Math.abs(skewness) < 2;

    const tests: { name: string; reason: string; priority: "recommended" | "alternative" | "optional" }[] = [];
    const visualizations: { name: string; reason: string }[] = [];

    if (selectedType === "comparison") {
      if (ivGroups === 2) {
        tests.push({ name: "Independent Samples T-Test", reason: `Your IV "${ivColumn}" has 2 groups — t-test compares means between them.`, priority: "recommended" });
        if (!isNormal) tests.push({ name: "Mann-Whitney U Test", reason: `Data may not be normally distributed (skewness = ${skewness.toFixed(2)}). This is the non-parametric alternative.`, priority: "alternative" });
      } else if (ivGroups > 2) {
        tests.push({ name: "One-Way ANOVA", reason: `Your IV "${ivColumn}" has ${ivGroups} groups — ANOVA compares means across 3+ groups.`, priority: "recommended" });
        tests.push({ name: "Post-Hoc Tests (Tukey HSD)", reason: "If ANOVA is significant, post-hoc tests show which specific groups differ.", priority: "optional" });
      }
      if (covariateColumns.length > 0) {
        tests.push({ name: "ANCOVA", reason: `Controls for covariates: ${covariateColumns.join(", ")}`, priority: "optional" });
      }
      visualizations.push({ name: "Box Plot", reason: "Shows distribution of DV across groups" });
      visualizations.push({ name: "Bar Chart with Error Bars", reason: "Shows group means with confidence intervals" });
    }

    if (selectedType === "correlation") {
      tests.push({ name: "Pearson Correlation", reason: `Tests linear relationship between "${ivColumn}" and "${dvColumn}".`, priority: isNormal ? "recommended" : "alternative" });
      if (!isNormal) tests.push({ name: "Spearman Rank Correlation", reason: "Non-parametric alternative — doesn't assume normal distribution.", priority: "recommended" });
      visualizations.push({ name: "Scatter Plot", reason: "Visualizes the relationship between two variables" });
      visualizations.push({ name: "Correlation Matrix", reason: "Shows relationships between multiple variables at once" });
    }

    if (selectedType === "prediction") {
      if (covariateColumns.length === 0) {
        tests.push({ name: "Simple Linear Regression", reason: `Predicts "${dvColumn}" from "${ivColumn}".`, priority: "recommended" });
      } else {
        tests.push({ name: "Multiple Linear Regression", reason: `Predicts "${dvColumn}" from "${ivColumn}" + ${covariateColumns.length} covariates.`, priority: "recommended" });
      }
      tests.push({ name: "Check Assumptions", reason: "Test normality of residuals, homoscedasticity, multicollinearity (VIF).", priority: "optional" });
      visualizations.push({ name: "Scatter Plot with Regression Line", reason: "Shows the predictive relationship" });
      visualizations.push({ name: "Residual Plot", reason: "Checks if regression assumptions are met" });
    }

    if (selectedType === "moderation") {
      tests.push({ name: "Moderated Regression", reason: `Tests if "${moderatorColumn || moderator}" changes the effect of "${ivColumn}" on "${dvColumn}".`, priority: "recommended" });
      tests.push({ name: "Two-Way ANOVA", reason: "Alternative if both IV and moderator are categorical.", priority: "alternative" });
      visualizations.push({ name: "Interaction Plot", reason: "Shows how the relationship changes at different moderator levels" });
    }

    if (selectedType === "mediation") {
      tests.push({ name: "Baron & Kenny 4 Steps", reason: "Classic mediation test: test paths a, b, c, and c'.", priority: "recommended" });
      tests.push({ name: "Sobel Test", reason: "Tests significance of the indirect effect.", priority: "optional" });
      visualizations.push({ name: "Path Diagram", reason: "Shows direct and indirect effects" });
    }

    return { tests, visualizations, n, dvMean, dvSD, skewness, isNormal, ivIsCategorical, ivGroups };
  }, [selectedType, ivColumn, dvColumn, moderatorColumn, moderator, covariateColumns, activeDataset]);

  return (
    <div className="space-y-6">
      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {([1, 1.5, 2, 3] as Step[]).map((s) => (
          <button key={s} onClick={() => setStep(s)}
            className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
              step === s ? "bg-[#DE3163] text-white" : s < step ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
            }`}>
            {s === 1 ? "1. Hypothesis" : s === 1.5 ? "1.5 Data Sources" : s === 2 ? "2. Map Variables" : "3. Recommendations"}
          </button>
        ))}
      </div>

      {/* ===== STEP 1: Research Question & Hypothesis ===== */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <h2 className="font-semibold text-gray-800 text-lg">Step 1: Define Your Research Question & Hypothesis</h2>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Research Question</label>
            <textarea value={researchQuestion} onChange={e => setResearchQuestion(e.target.value)}
              placeholder="e.g., Does the combination of geopolitical and technological disruption have an additive or compounded effect on student psychological stress?"
              rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#DE3163] resize-none" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Hypothesis</label>
            <textarea value={hypothesisText} onChange={e => setHypothesisText(e.target.value)}
              placeholder="e.g., Students exposed to both geopolitical and technological disruption will report significantly higher psychological stress than those exposed to only one type of disruption."
              rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#DE3163] resize-none" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">What type of hypothesis is this?</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {HYPOTHESIS_TYPES.map(h => (
                <button key={h.type} onClick={() => setSelectedType(h.type)}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    selectedType === h.type ? "border-[#DE3163] bg-pink-50" : "border-gray-200 hover:border-gray-300"
                  }`}>
                  <p className="font-medium text-sm">{h.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{h.description}</p>
                  <p className="text-xs text-gray-400 mt-1 italic">e.g., {h.example.substring(0, 80)}...</p>
                </button>
              ))}
            </div>
          </div>

          {selectedType && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Independent Variable (IV) — what you think causes the effect
                </label>
                <input value={ivName} onChange={e => setIvName(e.target.value)}
                  placeholder="e.g., Geopolitical disruption exposure"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#DE3163]" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Dependent Variable (DV) — what you're measuring
                </label>
                <input value={dvName} onChange={e => setDvName(e.target.value)}
                  placeholder="e.g., Psychological stress level"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#DE3163]" />
              </div>
              {(selectedType === "moderation" || selectedType === "mediation") && (
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    {selectedType === "moderation" ? "Moderator Variable" : "Mediator Variable"}
                  </label>
                  <input value={moderator} onChange={e => setModerator(e.target.value)}
                    placeholder={selectedType === "moderation" ? "e.g., Technology dependence level" : "e.g., Sense of control"}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#DE3163]" />
                </div>
              )}
            </div>
          )}

          <button onClick={() => setStep(1.5)} disabled={!selectedType || !researchQuestion}
            className="px-4 py-2 bg-[#DE3163] text-white text-sm rounded-lg hover:bg-[#c4294f] disabled:opacity-50">
            Next: Data Source Suggestions &rarr;
          </button>
        </div>
      )}

      {/* ===== STEP 1.5: Data Source Suggestions ===== */}
      {step === 1.5 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <h2 className="font-semibold text-gray-800 text-lg">Step 1.5: What Data Do You Need?</h2>

          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-blue-800 mb-2">Based on your hypothesis, your dataset should include:</h3>
            <ul className="space-y-2 text-sm text-blue-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">&#9679;</span>
                <span><strong>Independent Variable:</strong> A measure of <em>{ivName || "your IV"}</em> {selectedHypothesis?.ivType === "categorical" ? "(categorical — groups/categories)" : "(continuous — numeric scale)"}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">&#9679;</span>
                <span><strong>Dependent Variable:</strong> A measure of <em>{dvName || "your DV"}</em> (continuous — numeric scale/score)</span>
              </li>
              {moderator && (
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">&#9679;</span>
                  <span><strong>{selectedType === "moderation" ? "Moderator" : "Mediator"}:</strong> A measure of <em>{moderator}</em></span>
                </li>
              )}
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">&#9679;</span>
                <span><strong>Demographics:</strong> Age, gender, education level (for sample description)</span>
              </li>
            </ul>
          </div>

          {/* Suggested scales */}
          {detectedKeywords.length > 0 && (
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-medium text-green-800 mb-2">Suggested Measurement Scales:</h3>
              {detectedKeywords.map(kw => (
                <div key={kw} className="mb-2">
                  <p className="text-sm font-medium text-green-700 capitalize">{kw}:</p>
                  <ul className="text-sm text-green-600 ml-4">
                    {KEYWORD_TO_SCALES[kw].map(scale => (
                      <li key={scale}>• {scale}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* ICPSR search suggestions */}
          {detectedKeywords.length > 0 && (
            <div className="bg-amber-50 rounded-lg p-4">
              <h3 className="font-medium text-amber-800 mb-2">Search ICPSR for:</h3>
              <div className="flex flex-wrap gap-2">
                {detectedKeywords.flatMap(kw => ICPSR_SEARCH_SUGGESTIONS[kw] || []).map((term, i) => (
                  <a key={i} href={`https://www.icpsr.umich.edu/web/ICPSR/search/studies?q=${encodeURIComponent(term)}`}
                    target="_blank" className="px-2 py-1 bg-white border border-amber-300 rounded text-xs text-amber-700 hover:bg-amber-100">
                    {term} &nearr;
                  </a>
                ))}
              </div>
              <p className="text-xs text-amber-600 mt-2">Click a keyword to search ICPSR directly. Download the <strong>SPSS</strong> format.</p>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">&larr; Back</button>
            <button onClick={() => setStep(2)} className="px-4 py-2 bg-[#DE3163] text-white text-sm rounded-lg hover:bg-[#c4294f]">
              Next: Map Variables &rarr;
            </button>
          </div>
        </div>
      )}

      {/* ===== STEP 2: Variable Mapping ===== */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <h2 className="font-semibold text-gray-800 text-lg">Step 2: Map Your Variables</h2>

          {!activeDataset ? (
            <div className="bg-amber-50 rounded-lg p-4">
              <p className="text-sm text-amber-800">You need to upload a dataset first. Go to the <strong>Data Upload</strong> tab, upload your CSV or SPSS file, then come back here.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500">Using dataset: <strong>{activeDataset.filename}</strong> ({activeDataset.rows.length} rows, {activeDataset.columns.length} columns)</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    IV: {ivName || "Independent Variable"}
                  </label>
                  <select value={ivColumn} onChange={e => setIvColumn(e.target.value)}
                    className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#DE3163]">
                    <option value="">Select column...</option>
                    {allCols.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    DV: {dvName || "Dependent Variable"}
                  </label>
                  <select value={dvColumn} onChange={e => setDvColumn(e.target.value)}
                    className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#DE3163]">
                    <option value="">Select column...</option>
                    {numericCols.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {(selectedType === "moderation" || selectedType === "mediation") && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      {selectedType === "moderation" ? "Moderator" : "Mediator"}: {moderator}
                    </label>
                    <select value={moderatorColumn} onChange={e => setModeratorColumn(e.target.value)}
                      className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#DE3163]">
                      <option value="">Select column...</option>
                      {allCols.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}
                <div className={selectedType === "moderation" || selectedType === "mediation" ? "" : "col-span-2"}>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Covariates (optional)</label>
                  <div className="flex flex-wrap gap-1.5">
                    {numericCols.filter(c => c !== ivColumn && c !== dvColumn && c !== moderatorColumn).map(c => (
                      <button key={c} onClick={() => setCovariateColumns(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c])}
                        className={`px-2 py-0.5 text-xs rounded ${covariateColumns.includes(c) ? "bg-[#DE3163] text-white" : "bg-gray-100 text-gray-600"}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1.5)} className="px-4 py-2 text-sm text-gray-600">&larr; Back</button>
                <button onClick={() => setStep(3)} disabled={!ivColumn || !dvColumn}
                  className="px-4 py-2 bg-[#DE3163] text-white text-sm rounded-lg hover:bg-[#c4294f] disabled:opacity-50">
                  Next: Get Recommendations &rarr;
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ===== STEP 3: Recommendations ===== */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-800 text-lg mb-4">Step 3: Recommended Analysis Plan</h2>

            {!recommendations ? (
              <p className="text-sm text-gray-500">Complete Steps 1 and 2 first.</p>
            ) : (
              <div className="space-y-6">
                {/* Data summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-800 mb-2">Data Summary</h3>
                  <div className="grid grid-cols-4 gap-3 text-sm">
                    <div><span className="text-gray-500">N:</span> <strong>{recommendations.n}</strong></div>
                    <div><span className="text-gray-500">DV Mean:</span> <strong>{recommendations.dvMean.toFixed(2)}</strong></div>
                    <div><span className="text-gray-500">DV SD:</span> <strong>{recommendations.dvSD.toFixed(2)}</strong></div>
                    <div><span className="text-gray-500">Normality:</span> <strong className={recommendations.isNormal ? "text-green-600" : "text-amber-600"}>{recommendations.isNormal ? "Normal" : "Non-normal"}</strong> (skew={recommendations.skewness.toFixed(2)})</div>
                  </div>
                  {recommendations.ivIsCategorical && (
                    <p className="text-sm mt-2"><span className="text-gray-500">IV Groups:</span> <strong>{recommendations.ivGroups}</strong></p>
                  )}
                </div>

                {/* Recommended tests */}
                <div>
                  <h3 className="font-medium text-gray-800 mb-3">Recommended Statistical Tests</h3>
                  <div className="space-y-2">
                    {recommendations.tests.map((t, i) => (
                      <div key={i} className={`p-3 rounded-lg border ${
                        t.priority === "recommended" ? "border-green-200 bg-green-50" :
                        t.priority === "alternative" ? "border-amber-200 bg-amber-50" :
                        "border-gray-200 bg-gray-50"
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            t.priority === "recommended" ? "bg-green-200 text-green-800" :
                            t.priority === "alternative" ? "bg-amber-200 text-amber-800" :
                            "bg-gray-200 text-gray-700"
                          }`}>{t.priority}</span>
                          <span className="font-medium text-sm">{t.name}</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{t.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommended visualizations */}
                <div>
                  <h3 className="font-medium text-gray-800 mb-3">Recommended Visualizations</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {recommendations.visualizations.map((v, i) => (
                      <div key={i} className="p-3 rounded-lg border border-blue-200 bg-blue-50">
                        <p className="font-medium text-sm text-blue-800">{v.name}</p>
                        <p className="text-xs text-blue-600 mt-0.5">{v.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Methodology write-up */}
                <div>
                  <h3 className="font-medium text-gray-800 mb-3">Draft Methodology Write-Up</h3>
                  <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-700 leading-relaxed space-y-2">
                    <p><strong>Participants.</strong> The sample consisted of N = {recommendations.n} participants from the dataset ({activeDataset?.filename}).</p>
                    <p><strong>Measures.</strong> The independent variable was {ivName || ivColumn} ({recommendations.ivIsCategorical ? `categorical, ${recommendations.ivGroups} groups` : "continuous"}). The dependent variable was {dvName || dvColumn} (M = {recommendations.dvMean.toFixed(2)}, SD = {recommendations.dvSD.toFixed(2)}).{moderator ? ` The ${selectedType === "moderation" ? "moderator" : "mediator"} variable was ${moderator}.` : ""}{covariateColumns.length > 0 ? ` Covariates included: ${covariateColumns.join(", ")}.` : ""}</p>
                    <p><strong>Analysis Plan.</strong> {recommendations.tests.filter(t => t.priority === "recommended").map(t => t.name).join(" and ")} {recommendations.tests.filter(t => t.priority === "recommended").length === 1 ? "was" : "were"} conducted to test the hypothesis. {!recommendations.isNormal ? `Due to non-normal distribution (skewness = ${recommendations.skewness.toFixed(2)}), ${recommendations.tests.find(t => t.priority === "alternative")?.name || "non-parametric alternatives"} was also considered. ` : ""}Statistical significance was set at p &lt; .05.</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">This is a draft — edit it to match your specific study context.</p>
                </div>

                <button onClick={() => setStep(1)} className="px-4 py-2 text-sm text-gray-600">&larr; Start Over</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
