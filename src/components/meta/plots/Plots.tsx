"use client";

import { useMemo } from "react";
import type { StudyEffect, PlotType } from "@/types/meta-analysis";
import {
  poolEffects,
  studyWeights,
  leaveOneOut,
  baujatCoords,
  cumulativeMeta,
  correlation,
  normalCdf,
  type MetaMethod,
} from "@/lib/meta/stats";

// ===== Shared SVG helpers =====
function scale(v: number, [d0, d1]: [number, number], [r0, r1]: [number, number]) {
  if (d1 === d0) return (r0 + r1) / 2;
  return r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
}

function ticks(min: number, max: number, count = 5): number[] {
  if (min === max) return [min];
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, i) => min + step * i);
}

const COLORS = {
  bg: "#ffffff",
  grid: "#e6e3dc",
  axis: "#4b5563",
  label: "#4b5563",
  marker: "#1a1208",
  markerStroke: "#000000",
  diamond: "#1a1208",
  ci: "#1a1208",
  ref: "#8a8576",
};

// =======================
// FOREST PLOT
// =======================
export function ForestPlot({ effects, method = "random", effectLabel = "Effect size" }: {
  effects: StudyEffect[]; method?: MetaMethod; effectLabel?: string;
}) {
  const rowH = 26, padL = 160, padR = 120, padT = 20;
  const pooled = useMemo(() => poolEffects(effects, method), [effects, method]);
  const weights = useMemo(() => studyWeights(effects, method), [effects, method]);
  const height = padT + effects.length * rowH + 80;
  const width = 640;
  const plotW = width - padL - padR;

  const allLo = Math.min(...effects.map(e => e.ci[0]), pooled.ci[0]);
  const allHi = Math.max(...effects.map(e => e.ci[1]), pooled.ci[1]);
  const pad = (allHi - allLo) * 0.1 || 0.5;
  const xMin = allLo - pad, xMax = allHi + pad;
  const xs = (v: number) => scale(v, [xMin, xMax], [padL, padL + plotW]);

  return (
    <div className="overflow-auto">
      <svg width={width} height={height} className="text-xs">
        {/* header */}
        <text x={8} y={14} fill={COLORS.label}>Study</text>
        <text x={padL + plotW + 8} y={14} fill={COLORS.label}>d [95% CI]</text>
        <text x={padL + plotW / 2} y={14} fill={COLORS.label} textAnchor="middle">{effectLabel}</text>
        {/* reference line at 0 */}
        <line x1={xs(0)} y1={padT} x2={xs(0)} y2={padT + effects.length * rowH} stroke={COLORS.ref} strokeDasharray="3 3" />
        {/* studies */}
        {effects.map((e, i) => {
          const cy = padT + i * rowH + rowH / 2;
          const size = 4 + Math.sqrt(weights[i]) * 1.4;
          return (
            <g key={e.name}>
              <text x={8} y={cy + 3} fill="#111">{e.name}</text>
              <line x1={xs(e.ci[0])} y1={cy} x2={xs(e.ci[1])} y2={cy} stroke={COLORS.ci} strokeWidth={1.5} />
              <rect x={xs(e.effect) - size} y={cy - size} width={size * 2} height={size * 2} fill={COLORS.marker} />
              <text x={padL + plotW + 8} y={cy + 3} fill={COLORS.label}>
                {e.effect.toFixed(2)} [{e.ci[0].toFixed(2)}, {e.ci[1].toFixed(2)}]
              </text>
            </g>
          );
        })}
        {/* pooled diamond */}
        {(() => {
          const cy = padT + effects.length * rowH + 20;
          const cx = xs(pooled.effect);
          const l = xs(pooled.ci[0]), r = xs(pooled.ci[1]);
          return (
            <g>
              <text x={8} y={cy + 3} fill="#111" fontWeight={600}>Pooled ({method === "random" ? "RE" : "FE"})</text>
              <polygon points={`${l},${cy} ${cx},${cy - 7} ${r},${cy} ${cx},${cy + 7}`} fill={COLORS.diamond} />
              <text x={padL + plotW + 8} y={cy + 3} fill="#111" fontWeight={600}>
                {pooled.effect.toFixed(2)} [{pooled.ci[0].toFixed(2)}, {pooled.ci[1].toFixed(2)}]
              </text>
            </g>
          );
        })()}
        {/* x-axis */}
        {ticks(xMin, xMax, 5).map(t => (
          <g key={t}>
            <line x1={xs(t)} y1={padT + effects.length * rowH + 32} x2={xs(t)} y2={padT + effects.length * rowH + 36} stroke={COLORS.axis} />
            <text x={xs(t)} y={padT + effects.length * rowH + 50} fill={COLORS.label} textAnchor="middle">{t.toFixed(1)}</text>
          </g>
        ))}
        <line x1={padL} y1={padT + effects.length * rowH + 32} x2={padL + plotW} y2={padT + effects.length * rowH + 32} stroke={COLORS.axis} />
      </svg>
      <div className="mt-2 text-xs text-ink-muted flex gap-4 flex-wrap">
        <span>Pooled: <b className="text-ink">{pooled.effect.toFixed(3)}</b></span>
        <span>95% CI: [{pooled.ci[0].toFixed(2)}, {pooled.ci[1].toFixed(2)}]</span>
        <span>I²: {pooled.I2.toFixed(1)}%</span>
        <span>Q: {pooled.Q.toFixed(2)} (df={pooled.df})</span>
        <span>p: {pooled.pValue.toFixed(4)}</span>
      </div>
    </div>
  );
}

// =======================
// FUNNEL PLOT
// =======================
export function FunnelPlot({ effects, method = "random" }: { effects: StudyEffect[]; method?: MetaMethod }) {
  const pooled = useMemo(() => poolEffects(effects, method), [effects, method]);
  const width = 560, height = 380, padL = 60, padR = 20, padT = 20, padB = 50;
  const plotW = width - padL - padR, plotH = height - padT - padB;

  const seMax = Math.max(...effects.map(e => e.se)) * 1.1;
  const effMin = Math.min(...effects.map(e => e.effect - 2 * e.se), pooled.effect - 2 * pooled.se);
  const effMax = Math.max(...effects.map(e => e.effect + 2 * e.se), pooled.effect + 2 * pooled.se);
  const xs = (v: number) => scale(v, [effMin, effMax], [padL, padL + plotW]);
  const ys = (v: number) => scale(v, [0, seMax], [padT, padT + plotH]); // higher SE = lower in plot

  // Pseudo-CI funnel edges
  const seSteps = Array.from({ length: 30 }, (_, i) => (i / 29) * seMax);
  const leftPts = seSteps.map(se => `${xs(pooled.effect - 1.96 * se)},${ys(se)}`).join(" ");
  const rightPts = seSteps.map(se => `${xs(pooled.effect + 1.96 * se)},${ys(se)}`).join(" ");

  return (
    <div>
      <svg width={width} height={height} className="text-xs">
        {/* pseudo-CI triangle */}
        <polygon points={`${xs(pooled.effect)},${ys(0)} ${leftPts.split(" ").slice(-1)[0]} ${rightPts.split(" ").slice(-1)[0]}`} fill={COLORS.marker} opacity={0.05} />
        <polyline points={leftPts} fill="none" stroke={COLORS.marker} strokeDasharray="3 3" opacity={0.6} />
        <polyline points={rightPts} fill="none" stroke={COLORS.marker} strokeDasharray="3 3" opacity={0.6} />
        {/* center line */}
        <line x1={xs(pooled.effect)} y1={ys(0)} x2={xs(pooled.effect)} y2={ys(seMax)} stroke={COLORS.ref} />
        {/* axes */}
        <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke={COLORS.axis} />
        <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke={COLORS.axis} />
        {ticks(effMin, effMax, 5).map(t => (
          <g key={t}>
            <line x1={xs(t)} y1={padT + plotH} x2={xs(t)} y2={padT + plotH + 4} stroke={COLORS.axis} />
            <text x={xs(t)} y={padT + plotH + 18} fill={COLORS.label} textAnchor="middle">{t.toFixed(2)}</text>
          </g>
        ))}
        {ticks(0, seMax, 5).map(t => (
          <g key={t}>
            <line x1={padL - 4} y1={ys(t)} x2={padL} y2={ys(t)} stroke={COLORS.axis} />
            <text x={padL - 8} y={ys(t) + 3} fill={COLORS.label} textAnchor="end">{t.toFixed(2)}</text>
          </g>
        ))}
        {/* points */}
        {effects.map(e => (
          <circle key={e.name} cx={xs(e.effect)} cy={ys(e.se)} r={5} fill={COLORS.marker} stroke={COLORS.markerStroke} />
        ))}
        <text x={padL + plotW / 2} y={height - 8} fill={COLORS.label} textAnchor="middle">Effect size</text>
        <text x={14} y={padT + plotH / 2} fill={COLORS.label} transform={`rotate(-90 14 ${padT + plotH / 2})`} textAnchor="middle">Standard error</text>
      </svg>
      <p className="text-xs text-ink-muted mt-2">Asymmetry suggests potential publication bias. Points should scatter symmetrically inside the dashed funnel.</p>
    </div>
  );
}

// =======================
// BUBBLE PLOT (moderator)
// =======================
export function BubblePlot({ effects, method = "random" }: { effects: StudyEffect[]; method?: MetaMethod }) {
  const withMod = effects.filter(e => typeof e.moderator === "number" && !isNaN(e.moderator));
  if (withMod.length < 3) {
    return <p className="text-xs text-ink-muted">Select a moderator column in Step 4 to enable the bubble plot. Need ≥3 studies with moderator values.</p>;
  }
  const weights = studyWeights(effects, method).filter((_, i) => typeof effects[i].moderator === "number");
  const width = 560, height = 380, padL = 50, padR = 20, padT = 20, padB = 50;
  const plotW = width - padL - padR, plotH = height - padT - padB;
  const xs_ = withMod.map(e => e.moderator as number);
  const ys_ = withMod.map(e => e.effect);
  const xMin = Math.min(...xs_), xMax = Math.max(...xs_);
  const yMin = Math.min(...ys_), yMax = Math.max(...ys_);
  const xPad = (xMax - xMin) * 0.1 || 1, yPad = (yMax - yMin) * 0.1 || 0.5;
  const xs = (v: number) => scale(v, [xMin - xPad, xMax + xPad], [padL, padL + plotW]);
  const ys = (v: number) => scale(v, [yMin - yPad, yMax + yPad], [padT + plotH, padT]);

  // Simple weighted regression
  const wSum = weights.reduce((a, b) => a + b, 0);
  const xw = xs_.reduce((s, x, i) => s + x * weights[i], 0) / wSum;
  const yw = ys_.reduce((s, y, i) => s + y * weights[i], 0) / wSum;
  const num = xs_.reduce((s, x, i) => s + weights[i] * (x - xw) * (ys_[i] - yw), 0);
  const den = xs_.reduce((s, x, i) => s + weights[i] * (x - xw) ** 2, 0);
  const slope = den === 0 ? 0 : num / den;
  const intercept = yw - slope * xw;
  const r = correlation(xs_, ys_);

  return (
    <div>
      <svg width={width} height={height} className="text-xs">
        <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke={COLORS.axis} />
        <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke={COLORS.axis} />
        {ticks(xMin, xMax, 5).map(t => (
          <g key={t}>
            <line x1={xs(t)} y1={padT + plotH} x2={xs(t)} y2={padT + plotH + 4} stroke={COLORS.axis} />
            <text x={xs(t)} y={padT + plotH + 18} fill={COLORS.label} textAnchor="middle">{t.toFixed(1)}</text>
          </g>
        ))}
        {ticks(yMin, yMax, 5).map(t => (
          <g key={t}>
            <line x1={padL - 4} y1={ys(t)} x2={padL} y2={ys(t)} stroke={COLORS.axis} />
            <text x={padL - 8} y={ys(t) + 3} fill={COLORS.label} textAnchor="end">{t.toFixed(2)}</text>
          </g>
        ))}
        {/* regression line */}
        <line
          x1={xs(xMin - xPad)} y1={ys(intercept + slope * (xMin - xPad))}
          x2={xs(xMax + xPad)} y2={ys(intercept + slope * (xMax + xPad))}
          stroke={COLORS.marker} strokeDasharray="4 3" opacity={0.7}
        />
        {/* bubbles */}
        {withMod.map((e, i) => (
          <circle key={e.name} cx={xs(e.moderator as number)} cy={ys(e.effect)} r={3 + Math.sqrt(weights[i]) * 1.5}
            fill={COLORS.marker} opacity={0.55} stroke={COLORS.markerStroke} />
        ))}
        <text x={padL + plotW / 2} y={height - 8} fill={COLORS.label} textAnchor="middle">Moderator</text>
        <text x={14} y={padT + plotH / 2} fill={COLORS.label} transform={`rotate(-90 14 ${padT + plotH / 2})`} textAnchor="middle">Effect size</text>
      </svg>
      <p className="text-xs text-ink-muted mt-2">Slope: <b className="text-ink">{slope.toFixed(3)}</b> · Intercept: {intercept.toFixed(3)} · r: {r.toFixed(3)}</p>
    </div>
  );
}

// =======================
// BAUJAT PLOT
// =======================
export function BaujatPlot({ effects, method = "random" }: { effects: StudyEffect[]; method?: MetaMethod }) {
  const coords = useMemo(() => baujatCoords(effects, method), [effects, method]);
  const width = 560, height = 380, padL = 50, padR = 20, padT = 20, padB = 50;
  const plotW = width - padL - padR, plotH = height - padT - padB;
  const xMax = Math.max(...coords.map(c => c.x)) * 1.1 || 1;
  const yMax = Math.max(...coords.map(c => c.y)) * 1.1 || 1;
  const xs = (v: number) => scale(v, [0, xMax], [padL, padL + plotW]);
  const ys = (v: number) => scale(v, [0, yMax], [padT + plotH, padT]);

  return (
    <div>
      <svg width={width} height={height} className="text-xs">
        <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke={COLORS.axis} />
        <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke={COLORS.axis} />
        {ticks(0, xMax, 5).map(t => (
          <g key={t}>
            <line x1={xs(t)} y1={padT + plotH} x2={xs(t)} y2={padT + plotH + 4} stroke={COLORS.axis} />
            <text x={xs(t)} y={padT + plotH + 18} fill={COLORS.label} textAnchor="middle">{t.toFixed(2)}</text>
          </g>
        ))}
        {ticks(0, yMax, 5).map(t => (
          <g key={t}>
            <line x1={padL - 4} y1={ys(t)} x2={padL} y2={ys(t)} stroke={COLORS.axis} />
            <text x={padL - 8} y={ys(t) + 3} fill={COLORS.label} textAnchor="end">{t.toFixed(2)}</text>
          </g>
        ))}
        {coords.map((c, i) => (
          <g key={effects[i].name}>
            <circle cx={xs(c.x)} cy={ys(c.y)} r={5} fill={COLORS.marker} stroke={COLORS.markerStroke} />
            <text x={xs(c.x) + 8} y={ys(c.y) + 3} fill={COLORS.label}>{effects[i].name}</text>
          </g>
        ))}
        <text x={padL + plotW / 2} y={height - 8} fill={COLORS.label} textAnchor="middle">Contribution to heterogeneity (Q)</text>
        <text x={14} y={padT + plotH / 2} fill={COLORS.label} transform={`rotate(-90 14 ${padT + plotH / 2})`} textAnchor="middle">Influence on pooled effect</text>
      </svg>
      <p className="text-xs text-ink-muted mt-2">Upper-right studies contribute most to heterogeneity and most influence the pooled estimate — candidate outliers.</p>
    </div>
  );
}

// =======================
// RADIAL (GALBRAITH) PLOT
// =======================
export function RadialPlot({ effects, method = "random" }: { effects: StudyEffect[]; method?: MetaMethod }) {
  const pooled = useMemo(() => poolEffects(effects, method), [effects, method]);
  const width = 560, height = 380, padL = 60, padR = 20, padT = 20, padB = 50;
  const plotW = width - padL - padR, plotH = height - padT - padB;
  const pts = effects.map(e => ({ x: 1 / e.se, y: e.effect / e.se, name: e.name }));
  const xMax = Math.max(...pts.map(p => p.x)) * 1.1;
  const yMin = Math.min(...pts.map(p => p.y)) - 1;
  const yMax = Math.max(...pts.map(p => p.y)) + 1;
  const xs = (v: number) => scale(v, [0, xMax], [padL, padL + plotW]);
  const ys = (v: number) => scale(v, [yMin, yMax], [padT + plotH, padT]);

  return (
    <div>
      <svg width={width} height={height} className="text-xs">
        <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke={COLORS.axis} />
        <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke={COLORS.axis} />
        {/* slope line through origin with pooled effect slope */}
        <line x1={xs(0)} y1={ys(0)} x2={xs(xMax)} y2={ys(pooled.effect * xMax)} stroke={COLORS.marker} />
        <line x1={xs(0)} y1={ys(0 + 1.96)} x2={xs(xMax)} y2={ys(pooled.effect * xMax + 1.96)} stroke={COLORS.marker} strokeDasharray="3 3" opacity={0.5} />
        <line x1={xs(0)} y1={ys(0 - 1.96)} x2={xs(xMax)} y2={ys(pooled.effect * xMax - 1.96)} stroke={COLORS.marker} strokeDasharray="3 3" opacity={0.5} />
        {ticks(0, xMax, 5).map(t => (
          <g key={t}>
            <line x1={xs(t)} y1={padT + plotH} x2={xs(t)} y2={padT + plotH + 4} stroke={COLORS.axis} />
            <text x={xs(t)} y={padT + plotH + 18} fill={COLORS.label} textAnchor="middle">{t.toFixed(1)}</text>
          </g>
        ))}
        {ticks(yMin, yMax, 5).map(t => (
          <g key={t}>
            <line x1={padL - 4} y1={ys(t)} x2={padL} y2={ys(t)} stroke={COLORS.axis} />
            <text x={padL - 8} y={ys(t) + 3} fill={COLORS.label} textAnchor="end">{t.toFixed(1)}</text>
          </g>
        ))}
        {pts.map(p => (
          <circle key={p.name} cx={xs(p.x)} cy={ys(p.y)} r={5} fill={COLORS.marker} stroke={COLORS.markerStroke} />
        ))}
        <text x={padL + plotW / 2} y={height - 8} fill={COLORS.label} textAnchor="middle">Precision (1/SE)</text>
        <text x={14} y={padT + plotH / 2} fill={COLORS.label} transform={`rotate(-90 14 ${padT + plotH / 2})`} textAnchor="middle">Standardized effect (effect/SE)</text>
      </svg>
      <p className="text-xs text-ink-muted mt-2">Points should fall within ±1.96 of the regression line. Outliers suggest heterogeneity or unusual studies.</p>
    </div>
  );
}

// =======================
// L'ABBÉ PLOT (binary outcomes)
// =======================
export function LAbbePlot({ effects }: { effects: StudyEffect[] }) {
  const binary = effects.filter(e =>
    typeof e.events1 === "number" && typeof e.total1 === "number" &&
    typeof e.events2 === "number" && typeof e.total2 === "number"
  );
  if (binary.length < 2) {
    return <p className="text-xs text-ink-muted">L&apos;Abbé plot needs binary outcome columns (events &amp; totals per group). Map these columns in Step 4.</p>;
  }
  const width = 420, height = 420, padL = 50, padR = 20, padT = 20, padB = 50;
  const plotW = width - padL - padR, plotH = height - padT - padB;
  const xs = (v: number) => scale(v, [0, 1], [padL, padL + plotW]);
  const ys = (v: number) => scale(v, [0, 1], [padT + plotH, padT]);

  return (
    <div>
      <svg width={width} height={height} className="text-xs">
        <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke={COLORS.axis} />
        <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke={COLORS.axis} />
        <line x1={xs(0)} y1={ys(0)} x2={xs(1)} y2={ys(1)} stroke={COLORS.ref} strokeDasharray="3 3" />
        {[0, 0.25, 0.5, 0.75, 1].map(t => (
          <g key={t}>
            <line x1={xs(t)} y1={padT + plotH} x2={xs(t)} y2={padT + plotH + 4} stroke={COLORS.axis} />
            <text x={xs(t)} y={padT + plotH + 18} fill={COLORS.label} textAnchor="middle">{t}</text>
            <line x1={padL - 4} y1={ys(t)} x2={padL} y2={ys(t)} stroke={COLORS.axis} />
            <text x={padL - 8} y={ys(t) + 3} fill={COLORS.label} textAnchor="end">{t}</text>
          </g>
        ))}
        {binary.map(e => {
          const rControl = (e.events2 as number) / (e.total2 as number);
          const rTreat = (e.events1 as number) / (e.total1 as number);
          const r = 3 + Math.sqrt((e.total1 as number) + (e.total2 as number)) / 2;
          return <circle key={e.name} cx={xs(rControl)} cy={ys(rTreat)} r={r} fill={COLORS.marker} opacity={0.55} stroke={COLORS.markerStroke} />;
        })}
        <text x={padL + plotW / 2} y={height - 8} fill={COLORS.label} textAnchor="middle">Event rate (control)</text>
        <text x={14} y={padT + plotH / 2} fill={COLORS.label} transform={`rotate(-90 14 ${padT + plotH / 2})`} textAnchor="middle">Event rate (treatment)</text>
      </svg>
      <p className="text-xs text-ink-muted mt-2">Points above the diagonal favor treatment. Bubble size reflects total sample.</p>
    </div>
  );
}

// =======================
// DRAPERY PLOT
// =======================
export function DraperyPlot({ effects, method = "random" }: { effects: StudyEffect[]; method?: MetaMethod }) {
  const pooled = useMemo(() => poolEffects(effects, method), [effects, method]);
  const width = 560, height = 380, padL = 60, padR = 20, padT = 20, padB = 50;
  const plotW = width - padL - padR, plotH = height - padT - padB;
  // p-value curve: x = effect, y = p (two-tailed) for each study
  const xMin = Math.min(...effects.map(e => e.effect - 3 * e.se));
  const xMax = Math.max(...effects.map(e => e.effect + 3 * e.se));
  const xs = (v: number) => scale(v, [xMin, xMax], [padL, padL + plotW]);
  const ys = (v: number) => scale(v, [0, 1], [padT + plotH, padT]);

  function curve(eff: number, se: number) {
    const steps = 80;
    return Array.from({ length: steps }, (_, i) => {
      const x = xMin + (i / (steps - 1)) * (xMax - xMin);
      const z = (x - eff) / se;
      const p = 2 * (1 - normalCdf(Math.abs(z)));
      return `${xs(x)},${ys(p)}`;
    }).join(" ");
  }

  return (
    <div>
      <svg width={width} height={height} className="text-xs">
        <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke={COLORS.axis} />
        <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke={COLORS.axis} />
        <line x1={padL} y1={ys(0.05)} x2={padL + plotW} y2={ys(0.05)} stroke={COLORS.ref} strokeDasharray="3 3" />
        {effects.map(e => (
          <polyline key={e.name} points={curve(e.effect, e.se)} fill="none" stroke={COLORS.marker} opacity={0.35} strokeWidth={1} />
        ))}
        <polyline points={curve(pooled.effect, pooled.se)} fill="none" stroke="#1a1208" strokeWidth={2} />
        {ticks(xMin, xMax, 5).map(t => (
          <g key={t}>
            <line x1={xs(t)} y1={padT + plotH} x2={xs(t)} y2={padT + plotH + 4} stroke={COLORS.axis} />
            <text x={xs(t)} y={padT + plotH + 18} fill={COLORS.label} textAnchor="middle">{t.toFixed(2)}</text>
          </g>
        ))}
        {[0, 0.05, 0.25, 0.5, 0.75, 1].map(t => (
          <g key={t}>
            <line x1={padL - 4} y1={ys(t)} x2={padL} y2={ys(t)} stroke={COLORS.axis} />
            <text x={padL - 8} y={ys(t) + 3} fill={COLORS.label} textAnchor="end">{t}</text>
          </g>
        ))}
        <text x={padL + plotW / 2} y={height - 8} fill={COLORS.label} textAnchor="middle">Effect size</text>
        <text x={14} y={padT + plotH / 2} fill={COLORS.label} transform={`rotate(-90 14 ${padT + plotH / 2})`} textAnchor="middle">Two-tailed p-value</text>
      </svg>
      <p className="text-xs text-ink-muted mt-2">Each curve is one study&apos;s p-value function. Purple line is the pooled estimate. Intersections with dashed line = p = 0.05 bounds.</p>
    </div>
  );
}

// =======================
// INFLUENCE PLOT (leave-one-out forest)
// =======================
export function InfluencePlot({ effects, method = "random" }: { effects: StudyEffect[]; method?: MetaMethod }) {
  const loo = useMemo(() => leaveOneOut(effects, method), [effects, method]);
  const pooled = useMemo(() => poolEffects(effects, method), [effects, method]);
  const rowH = 24, padL = 160, padR = 40, padT = 30;
  const height = padT + effects.length * rowH + 40;
  const width = 560;
  const plotW = width - padL - padR;
  const xMin = Math.min(...loo.map(p => p.ci[0]), pooled.ci[0]);
  const xMax = Math.max(...loo.map(p => p.ci[1]), pooled.ci[1]);
  const pad = (xMax - xMin) * 0.1 || 0.1;
  const xs = (v: number) => scale(v, [xMin - pad, xMax + pad], [padL, padL + plotW]);

  return (
    <div className="overflow-auto">
      <svg width={width} height={height} className="text-xs">
        <text x={8} y={14} fill={COLORS.label}>Omitted study</text>
        <text x={padL + plotW / 2} y={14} fill={COLORS.label} textAnchor="middle">Pooled effect [95% CI]</text>
        <line x1={xs(pooled.effect)} y1={padT} x2={xs(pooled.effect)} y2={padT + effects.length * rowH} stroke={COLORS.ref} strokeDasharray="3 3" />
        {loo.map((p, i) => {
          const cy = padT + i * rowH + rowH / 2;
          return (
            <g key={effects[i].name}>
              <text x={8} y={cy + 3} fill="#111">– {effects[i].name}</text>
              <line x1={xs(p.ci[0])} y1={cy} x2={xs(p.ci[1])} y2={cy} stroke={COLORS.ci} strokeWidth={1.5} />
              <circle cx={xs(p.effect)} cy={cy} r={4} fill={COLORS.marker} />
            </g>
          );
        })}
      </svg>
      <p className="text-xs text-ink-muted mt-2">Each row is the pooled effect when that study is removed. Big shifts = influential studies.</p>
    </div>
  );
}

// =======================
// CUMULATIVE FOREST PLOT
// =======================
export function CumulativePlot({ effects, method = "random" }: { effects: StudyEffect[]; method?: MetaMethod }) {
  const cum = useMemo(() => cumulativeMeta(effects.map(e => ({ effect: e.effect, se: e.se, name: e.name })), method), [effects, method]);
  const rowH = 24, padL = 160, padR = 40, padT = 30;
  const height = padT + cum.length * rowH + 40;
  const width = 560;
  const plotW = width - padL - padR;
  const xMin = Math.min(...cum.map(p => p.ci[0]));
  const xMax = Math.max(...cum.map(p => p.ci[1]));
  const pad = (xMax - xMin) * 0.1 || 0.1;
  const xs = (v: number) => scale(v, [xMin - pad, xMax + pad], [padL, padL + plotW]);

  return (
    <div className="overflow-auto">
      <svg width={width} height={height} className="text-xs">
        <text x={8} y={14} fill={COLORS.label}>Added through</text>
        <text x={padL + plotW / 2} y={14} fill={COLORS.label} textAnchor="middle">Cumulative pooled [95% CI]</text>
        <line x1={xs(0)} y1={padT} x2={xs(0)} y2={padT + cum.length * rowH} stroke={COLORS.ref} strokeDasharray="3 3" />
        {cum.map((p, i) => {
          const cy = padT + i * rowH + rowH / 2;
          return (
            <g key={p.upTo}>
              <text x={8} y={cy + 3} fill="#111">+ {p.upTo}</text>
              <line x1={xs(p.ci[0])} y1={cy} x2={xs(p.ci[1])} y2={cy} stroke={COLORS.ci} strokeWidth={1.5} />
              <circle cx={xs(p.effect)} cy={cy} r={4} fill={COLORS.marker} />
            </g>
          );
        })}
      </svg>
      <p className="text-xs text-ink-muted mt-2">Pooled effect recomputed after each study is added, in order.</p>
    </div>
  );
}

// =======================
// DISPATCH
// =======================
export const PLOT_CATALOG: { type: PlotType; label: string; hint: string; category: "plot" | "model" }[] = [
  { type: "forest", label: "Forest plot", hint: "Effect sizes & CI", category: "plot" },
  { type: "funnel", label: "Funnel plot", hint: "Publication bias", category: "plot" },
  { type: "bubble", label: "Bubble chart", hint: "Moderator analysis", category: "plot" },
  { type: "baujat", label: "Baujat plot", hint: "Heterogeneity sources", category: "plot" },
  { type: "radial", label: "Radial plot", hint: "Galbraith / precision", category: "plot" },
  { type: "labbe", label: "L'Abbé plot", hint: "Event rates comparison", category: "plot" },
  { type: "drapery", label: "Drapery plot", hint: "p-value curves", category: "plot" },
  { type: "influence", label: "Influence plot", hint: "Leave-one-out", category: "plot" },
];

export function PlotRenderer({ type, effects, method }: { type: PlotType; effects: StudyEffect[]; method: MetaMethod }) {
  if (effects.length < 2) return <p className="text-xs text-ink-muted">Need at least 2 studies to render this plot.</p>;
  switch (type) {
    case "forest": return <ForestPlot effects={effects} method={method} />;
    case "funnel": return <FunnelPlot effects={effects} method={method} />;
    case "bubble": return <BubblePlot effects={effects} method={method} />;
    case "baujat": return <BaujatPlot effects={effects} method={method} />;
    case "radial": return <RadialPlot effects={effects} method={method} />;
    case "labbe": return <LAbbePlot effects={effects} />;
    case "drapery": return <DraperyPlot effects={effects} method={method} />;
    case "influence": return <InfluencePlot effects={effects} method={method} />;
  }
}
