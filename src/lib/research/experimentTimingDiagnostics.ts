export const EXPERIMENT_TIMING_DIAGNOSTIC_SCHEMA_VERSION = 1 as const;
export const EXPERIMENT_TIMING_ENGINE_VERSION = "cerise-browser-timing-1" as const;
export const MAX_EXPERIMENT_TIMING_DIAGNOSTIC_REPORTS = 12;

export type ExperimentTimingDiagnosticStatus = "stable" | "review" | "interrupted";

export interface ExperimentTimingDiagnosticSummary {
  schemaVersion: typeof EXPERIMENT_TIMING_DIAGNOSTIC_SCHEMA_VERSION;
  diagnosticId: string;
  engineVersion: typeof EXPERIMENT_TIMING_ENGINE_VERSION;
  recordedAt: string;
  status: ExperimentTimingDiagnosticStatus;
  performanceNowResolutionMs: number;
  animationFrameSampleCount: number;
  animationFrameMedianMs: number;
  animationFrameP95Ms: number;
  animationFrameJankRate: number;
  timeoutSampleCount: number;
  timeoutTargetMs: number;
  timeoutMedianDriftMs: number;
  timeoutP95DriftMs: number;
  interruptionCount: number;
}

export interface ExperimentTimingDiagnosticEnvironment {
  userAgent: string;
  language: string;
  platform: string;
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  hardwareConcurrency: number | null;
  deviceMemoryGb: number | null;
  secureContext: boolean;
  crossOriginIsolated: boolean;
}

export interface ExperimentTimingDiagnosticSamples {
  performanceNowDeltasMs: number[];
  animationFrameIntervalsMs: number[];
  timeoutDriftsMs: number[];
}

export interface ExperimentTimingDiagnosticReport extends ExperimentTimingDiagnosticSummary {
  projectId: string;
  environment: ExperimentTimingDiagnosticEnvironment;
  samples: ExperimentTimingDiagnosticSamples;
  reviewNotes: string[];
  limitation: string;
}

export interface RunExperimentTimingDiagnosticOptions {
  projectId: string;
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
}

export const EXPERIMENT_TIMING_DIAGNOSTIC_LIMITATION =
  "This engineering check measures scheduling observed by the current browser under current conditions. "
  + "It does not measure physical display onset, input-device latency, audio latency, or certify millisecond precision.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function boundedNumber(value: unknown, min: number, max: number, fallback = 0): number {
  return Math.min(max, Math.max(min, finiteNumber(value, fallback)));
}

function safeString(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.slice(0, maxLength) : "";
}

function roundMetric(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function percentile(values: readonly number[], quantile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const position = (sorted.length - 1) * Math.min(1, Math.max(0, quantile));
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower] ?? 0;
  const lowerValue = sorted[lower] ?? 0;
  const upperValue = sorted[upper] ?? lowerValue;
  return lowerValue + (upperValue - lowerValue) * (position - lower);
}

function createDiagnosticId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `timing-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new Error("Timing diagnostic cancelled.");
}

export function summarizeExperimentTimingDiagnostic(
  samples: ExperimentTimingDiagnosticSamples,
  input: {
    diagnosticId: string;
    recordedAt: string;
    interruptionCount: number;
    timeoutTargetMs: number;
  },
): ExperimentTimingDiagnosticSummary & { reviewNotes: string[] } {
  const clockDeltas = samples.performanceNowDeltasMs.filter((value) => Number.isFinite(value) && value > 0);
  const frameIntervals = samples.animationFrameIntervalsMs.filter((value) => Number.isFinite(value) && value > 0);
  const timeoutDrifts = samples.timeoutDriftsMs.filter((value) => Number.isFinite(value) && value >= 0);
  const resolution = clockDeltas.length > 0 ? Math.min(...clockDeltas) : 0;
  const frameMedian = percentile(frameIntervals, 0.5);
  const frameP95 = percentile(frameIntervals, 0.95);
  const jankThreshold = Math.max(frameMedian * 1.75, frameMedian + 4);
  const frameJankRate = frameIntervals.length > 0
    ? frameIntervals.filter((value) => value > jankThreshold).length / frameIntervals.length
    : 1;
  const timeoutMedian = percentile(timeoutDrifts, 0.5);
  const timeoutP95 = percentile(timeoutDrifts, 0.95);
  const reviewNotes: string[] = [];

  if (clockDeltas.length === 0 || resolution > 2) {
    reviewNotes.push("The browser clock resolution was coarse for reaction-time interpretation.");
  }
  if (frameIntervals.length < 30) {
    reviewNotes.push("Too few animation frames were observed for a useful stability check.");
  } else {
    if (frameP95 > jankThreshold) {
      reviewNotes.push("Animation-frame pacing varied substantially during this run.");
    }
    if (frameJankRate > 0.05) {
      reviewNotes.push("More than 5% of observed animation frames met the engineering jank threshold.");
    }
  }
  if (timeoutDrifts.length < 10) {
    reviewNotes.push("Too few timer samples were observed for a useful stability check.");
  } else if (timeoutP95 > 25) {
    reviewNotes.push("Browser timer drift exceeded the engineering review threshold.");
  }
  if (input.interruptionCount > 0) {
    reviewNotes.push("The tab lost focus or became hidden during the check.");
  }

  return {
    schemaVersion: EXPERIMENT_TIMING_DIAGNOSTIC_SCHEMA_VERSION,
    diagnosticId: input.diagnosticId,
    engineVersion: EXPERIMENT_TIMING_ENGINE_VERSION,
    recordedAt: input.recordedAt,
    status: input.interruptionCount > 0 ? "interrupted" : reviewNotes.length > 0 ? "review" : "stable",
    performanceNowResolutionMs: roundMetric(resolution),
    animationFrameSampleCount: frameIntervals.length,
    animationFrameMedianMs: roundMetric(frameMedian),
    animationFrameP95Ms: roundMetric(frameP95),
    animationFrameJankRate: roundMetric(frameJankRate, 4),
    timeoutSampleCount: timeoutDrifts.length,
    timeoutTargetMs: roundMetric(input.timeoutTargetMs),
    timeoutMedianDriftMs: roundMetric(timeoutMedian),
    timeoutP95DriftMs: roundMetric(timeoutP95),
    interruptionCount: Math.max(0, Math.trunc(input.interruptionCount)),
    reviewNotes,
  };
}

function collectPerformanceNowDeltas(sampleCount = 5_000): number[] {
  const deltas: number[] = [];
  let previous = performance.now();
  for (let index = 0; index < sampleCount; index += 1) {
    const current = performance.now();
    const delta = current - previous;
    if (delta > 0) deltas.push(delta);
    previous = current;
  }
  return deltas.slice(0, 200);
}

async function collectAnimationFrameIntervals(
  sampleCount: number,
  signal: AbortSignal | undefined,
  onProgress?: (progress: number) => void,
): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const intervals: number[] = [];
    let previous: number | null = null;
    let frameRequest = 0;

    const cancel = () => {
      cancelAnimationFrame(frameRequest);
      reject(new Error("Timing diagnostic cancelled."));
    };
    signal?.addEventListener("abort", cancel, { once: true });

    const sample = (timestamp: number) => {
      if (signal?.aborted) return;
      if (previous !== null) intervals.push(timestamp - previous);
      previous = timestamp;
      onProgress?.(0.15 + (intervals.length / sampleCount) * 0.55);
      if (intervals.length >= sampleCount) {
        signal?.removeEventListener("abort", cancel);
        resolve(intervals);
        return;
      }
      frameRequest = requestAnimationFrame(sample);
    };
    frameRequest = requestAnimationFrame(sample);
  });
}

async function collectTimeoutDrifts(
  sampleCount: number,
  targetMs: number,
  signal: AbortSignal | undefined,
  onProgress?: (progress: number) => void,
): Promise<number[]> {
  const drifts: number[] = [];
  for (let index = 0; index < sampleCount; index += 1) {
    throwIfAborted(signal);
    const startedAt = performance.now();
    await new Promise<void>((resolve, reject) => {
      const finish = () => {
        signal?.removeEventListener("abort", cancel);
        resolve();
      };
      const timer = window.setTimeout(finish, targetMs);
      const cancel = () => {
        window.clearTimeout(timer);
        reject(new Error("Timing diagnostic cancelled."));
      };
      signal?.addEventListener("abort", cancel, { once: true });
    });
    drifts.push(Math.max(0, performance.now() - startedAt - targetMs));
    onProgress?.(0.7 + ((index + 1) / sampleCount) * 0.3);
  }
  return drifts;
}

export async function runExperimentTimingDiagnostic(
  options: RunExperimentTimingDiagnosticOptions,
): Promise<ExperimentTimingDiagnosticReport> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("Timing diagnostics require a browser.");
  }
  if (document.visibilityState !== "visible" || !document.hasFocus()) {
    throw new Error("Keep this tab visible and focused before starting the timing check.");
  }

  throwIfAborted(options.signal);
  let interruptionCount = 0;
  const recordInterruption = () => {
    if (document.visibilityState !== "visible" || !document.hasFocus()) interruptionCount += 1;
  };
  document.addEventListener("visibilitychange", recordInterruption);
  window.addEventListener("blur", recordInterruption);

  try {
    options.onProgress?.(0.02);
    const performanceNowDeltasMs = collectPerformanceNowDeltas();
    options.onProgress?.(0.15);
    const animationFrameIntervalsMs = await collectAnimationFrameIntervals(72, options.signal, options.onProgress);
    const timeoutTargetMs = 20;
    const timeoutDriftsMs = await collectTimeoutDrifts(24, timeoutTargetMs, options.signal, options.onProgress);
    const diagnosticId = createDiagnosticId();
    const recordedAt = new Date().toISOString();
    const summary = summarizeExperimentTimingDiagnostic(
      { performanceNowDeltasMs, animationFrameIntervalsMs, timeoutDriftsMs },
      { diagnosticId, recordedAt, interruptionCount, timeoutTargetMs },
    );
    const navigatorWithMemory = navigator as Navigator & { deviceMemory?: number };

    return {
      ...summary,
      projectId: options.projectId,
      environment: {
        userAgent: navigator.userAgent.slice(0, 1_000),
        language: navigator.language.slice(0, 40),
        platform: navigator.platform.slice(0, 120),
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
        hardwareConcurrency: Number.isFinite(navigator.hardwareConcurrency)
          ? navigator.hardwareConcurrency
          : null,
        deviceMemoryGb: Number.isFinite(navigatorWithMemory.deviceMemory)
          ? navigatorWithMemory.deviceMemory ?? null
          : null,
        secureContext: window.isSecureContext,
        crossOriginIsolated: window.crossOriginIsolated,
      },
      samples: {
        performanceNowDeltasMs,
        animationFrameIntervalsMs,
        timeoutDriftsMs,
      },
      reviewNotes: summary.reviewNotes,
      limitation: EXPERIMENT_TIMING_DIAGNOSTIC_LIMITATION,
    };
  } finally {
    document.removeEventListener("visibilitychange", recordInterruption);
    window.removeEventListener("blur", recordInterruption);
  }
}

export function normalizeExperimentTimingDiagnosticSummary(
  value: unknown,
): ExperimentTimingDiagnosticSummary | null {
  if (!isRecord(value)) return null;
  const diagnosticId = safeString(value.diagnosticId, 100);
  const recordedAt = safeString(value.recordedAt, 40);
  const status = value.status === "stable" || value.status === "review" || value.status === "interrupted"
    ? value.status
    : null;
  if (!diagnosticId || !recordedAt || !status) return null;
  return {
    schemaVersion: EXPERIMENT_TIMING_DIAGNOSTIC_SCHEMA_VERSION,
    diagnosticId,
    engineVersion: EXPERIMENT_TIMING_ENGINE_VERSION,
    recordedAt,
    status,
    performanceNowResolutionMs: boundedNumber(value.performanceNowResolutionMs, 0, 10_000),
    animationFrameSampleCount: Math.trunc(boundedNumber(value.animationFrameSampleCount, 0, 10_000)),
    animationFrameMedianMs: boundedNumber(value.animationFrameMedianMs, 0, 10_000),
    animationFrameP95Ms: boundedNumber(value.animationFrameP95Ms, 0, 10_000),
    animationFrameJankRate: boundedNumber(value.animationFrameJankRate, 0, 1),
    timeoutSampleCount: Math.trunc(boundedNumber(value.timeoutSampleCount, 0, 10_000)),
    timeoutTargetMs: boundedNumber(value.timeoutTargetMs, 0, 10_000),
    timeoutMedianDriftMs: boundedNumber(value.timeoutMedianDriftMs, 0, 10_000),
    timeoutP95DriftMs: boundedNumber(value.timeoutP95DriftMs, 0, 10_000),
    interruptionCount: Math.trunc(boundedNumber(value.interruptionCount, 0, 10_000)),
  };
}

function normalizeReport(value: unknown, projectId: string): ExperimentTimingDiagnosticReport | null {
  if (!isRecord(value) || !isRecord(value.environment) || !isRecord(value.samples)) return null;
  const summary = normalizeExperimentTimingDiagnosticSummary(value);
  if (!summary || safeString(value.projectId, 100) !== projectId) return null;
  const numberArray = (candidate: unknown) => (
    Array.isArray(candidate)
      ? candidate.slice(0, 200).flatMap((entry) => (
          typeof entry === "number" && Number.isFinite(entry) ? [entry] : []
        ))
      : []
  );
  return {
    ...summary,
    projectId,
    environment: {
      userAgent: safeString(value.environment.userAgent, 1_000),
      language: safeString(value.environment.language, 40),
      platform: safeString(value.environment.platform, 120),
      viewportWidth: Math.trunc(boundedNumber(value.environment.viewportWidth, 0, 100_000)),
      viewportHeight: Math.trunc(boundedNumber(value.environment.viewportHeight, 0, 100_000)),
      devicePixelRatio: boundedNumber(value.environment.devicePixelRatio, 0, 100),
      hardwareConcurrency: typeof value.environment.hardwareConcurrency === "number"
        ? Math.trunc(boundedNumber(value.environment.hardwareConcurrency, 1, 1_000))
        : null,
      deviceMemoryGb: typeof value.environment.deviceMemoryGb === "number"
        ? boundedNumber(value.environment.deviceMemoryGb, 0, 10_000)
        : null,
      secureContext: value.environment.secureContext === true,
      crossOriginIsolated: value.environment.crossOriginIsolated === true,
    },
    samples: {
      performanceNowDeltasMs: numberArray(value.samples.performanceNowDeltasMs),
      animationFrameIntervalsMs: numberArray(value.samples.animationFrameIntervalsMs),
      timeoutDriftsMs: numberArray(value.samples.timeoutDriftsMs),
    },
    reviewNotes: Array.isArray(value.reviewNotes)
      ? value.reviewNotes.slice(0, 12).map((note) => safeString(note, 240)).filter(Boolean)
      : [],
    limitation: EXPERIMENT_TIMING_DIAGNOSTIC_LIMITATION,
  };
}

function diagnosticStorageKey(projectId: string): string {
  return `cerise:experiment-timing-diagnostics:v${EXPERIMENT_TIMING_DIAGNOSTIC_SCHEMA_VERSION}:${
    projectId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 100)
  }`;
}

export function readExperimentTimingDiagnosticReports(
  storage: Pick<Storage, "getItem">,
  projectId: string,
): ExperimentTimingDiagnosticReport[] {
  try {
    const stored = storage.getItem(diagnosticStorageKey(projectId));
    if (!stored) return [];
    const value: unknown = JSON.parse(stored);
    if (!Array.isArray(value)) return [];
    return value
      .slice(0, MAX_EXPERIMENT_TIMING_DIAGNOSTIC_REPORTS)
      .flatMap((report) => {
        const normalized = normalizeReport(report, projectId);
        return normalized ? [normalized] : [];
      });
  } catch {
    return [];
  }
}

export function writeExperimentTimingDiagnosticReport(
  storage: Pick<Storage, "getItem" | "setItem">,
  report: ExperimentTimingDiagnosticReport,
): ExperimentTimingDiagnosticReport[] {
  const reports = [
    report,
    ...readExperimentTimingDiagnosticReports(storage, report.projectId)
      .filter((candidate) => candidate.diagnosticId !== report.diagnosticId),
  ].slice(0, MAX_EXPERIMENT_TIMING_DIAGNOSTIC_REPORTS);
  storage.setItem(diagnosticStorageKey(report.projectId), JSON.stringify(reports));
  return reports;
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function experimentTimingDiagnosticCsv(report: ExperimentTimingDiagnosticReport): string {
  const rows: Array<[string, unknown]> = [
    ["diagnostic_id", report.diagnosticId],
    ["recorded_at", report.recordedAt],
    ["status", report.status],
    ["engine_version", report.engineVersion],
    ["clock_resolution_ms", report.performanceNowResolutionMs],
    ["animation_frame_samples", report.animationFrameSampleCount],
    ["animation_frame_median_ms", report.animationFrameMedianMs],
    ["animation_frame_p95_ms", report.animationFrameP95Ms],
    ["animation_frame_jank_rate", report.animationFrameJankRate],
    ["timeout_target_ms", report.timeoutTargetMs],
    ["timeout_samples", report.timeoutSampleCount],
    ["timeout_median_drift_ms", report.timeoutMedianDriftMs],
    ["timeout_p95_drift_ms", report.timeoutP95DriftMs],
    ["interruptions", report.interruptionCount],
    ["platform", report.environment.platform],
    ["viewport", `${report.environment.viewportWidth}x${report.environment.viewportHeight}`],
    ["device_pixel_ratio", report.environment.devicePixelRatio],
    ["secure_context", report.environment.secureContext],
    ["cross_origin_isolated", report.environment.crossOriginIsolated],
    ["limitation", report.limitation],
  ];
  return ["metric,value", ...rows.map(([metric, value]) => `${csvCell(metric)},${csvCell(value)}`)].join("\n");
}
