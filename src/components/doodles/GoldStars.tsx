import { palette } from "./palette";

export interface StarDef {
  top: string;
  left?: string;
  right?: string;
  size: number;
  op: number;
  rot: number;
}

/** Render a single gold 5-point star SVG */
function Star({ size, color = palette.gold }: { size: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2 L14.2 9.2 L21.5 9.2 L15.6 13.6 L17.8 20.8 L12 16.4 L6.2 20.8 L8.4 13.6 L2.5 9.2 L9.8 9.2 Z"
        fill={color}
      />
    </svg>
  );
}

/**
 * Scatter gold stars as decorative background elements.
 *
 * Usage:
 *   <div style={{ position: "relative" }}>
 *     <GoldStars stars={[{ top: "8%", left: "5%", size: 7, op: 0.3, rot: -8 }, ...]} />
 *     ...content...
 *   </div>
 *
 * The parent must have `position: relative` (or absolute/fixed).
 */
export default function GoldStars({ stars }: { stars: StarDef[] }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 0,
      }}
      aria-hidden="true"
    >
      {stars.map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: s.top,
            left: s.left,
            right: s.right,
            transform: `rotate(${s.rot}deg)`,
            opacity: s.op,
          }}
        >
          <Star size={s.size} />
        </div>
      ))}
    </div>
  );
}
