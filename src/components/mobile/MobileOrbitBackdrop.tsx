/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from "react";
import HEDGEHOG from "@/lib/hedgehog";

const scene = {
  height: 280,
  width: 498,
};

const center = { x: 249, y: 142 };

function seeded(index: number, salt: number) {
  return Math.abs(Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453) % 1;
}

function asteroidArc({
  count,
  end,
  opacity,
  radius,
  salt,
  start,
  width,
}: {
  count: number;
  end: number;
  opacity: number;
  radius: number;
  salt: number;
  start: number;
  width: number;
}) {
  return Array.from({ length: count }, (_, index) => {
    const progress = count === 1 ? 0 : index / (count - 1);
    const angle = ((start + (end - start) * progress + (seeded(index, salt) - 0.5) * 3.6) * Math.PI) / 180;
    const noisyRadius = radius + (seeded(index, salt + 1) - 0.5) * width;
    const x = center.x + Math.cos(angle) * noisyRadius;
    const y = center.y + Math.sin(angle) * noisyRadius;

    return {
      opacity: opacity * (0.42 + seeded(index, salt + 3) * 0.72),
      radius: 0.45 + seeded(index, salt + 4) * 1.35,
      x,
      y,
    };
  });
}

function starField(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    delay: index * -310,
    duration: 7 + (index % 7) * 0.55,
    opacity: 0.18 + seeded(index, 33) * 0.44,
    radius: 0.65 + seeded(index, 34) * 1.35,
    x: 8 + seeded(index, 31) * (scene.width - 16),
    y: 8 + seeded(index, 32) * (scene.height - 16),
  }));
}

const asteroidDots = [
  ...asteroidArc({ count: 320, start: 112, end: 250, radius: 216, width: 28, opacity: 0.78, salt: 1 }),
  ...asteroidArc({ count: 160, start: 116, end: 246, radius: 195, width: 18, opacity: 0.34, salt: 5 }),
  ...asteroidArc({ count: 320, start: -70, end: 70, radius: 218, width: 28, opacity: 0.76, salt: 9 }),
  ...asteroidArc({ count: 150, start: -64, end: 66, radius: 240, width: 16, opacity: 0.32, salt: 13 }),
  ...asteroidArc({ count: 88, start: 248, end: 312, radius: 154, width: 14, opacity: 0.25, salt: 17 }),
];

const stars = starField(56);

const planets = [
  {
    angle: 174,
    background: "#fff",
    border: "#f0b945",
    delay: 0,
    duration: 146,
    image: HEDGEHOG.hedgehog06Clasped,
    radius: 190,
    size: 30,
    trail: 10,
  },
  {
    angle: 214,
    background: "#fff",
    border: "#ded6ce",
    delay: 0,
    duration: 138,
    image: HEDGEHOG.hedgehog05Laptop,
    radius: 96,
    size: 25,
    trail: 8,
  },
  {
    angle: -39,
    background: "#edf5ff",
    border: "#8bb8f2",
    delay: 0,
    duration: 142,
    image: HEDGEHOG.hedgehog11LitBook,
    radius: 128,
    size: 48,
    trail: 9,
  },
  {
    angle: -2,
    background: "#fff8e6",
    border: "#f0b945",
    delay: 0,
    duration: 134,
    image: HEDGEHOG.hedgehog02Writing,
    radius: 246,
    size: 31,
    trail: 9,
  },
  {
    angle: 78,
    background: "#fff",
    border: "#ded6ce",
    delay: 0,
    duration: 148,
    image: HEDGEHOG.hedgehog10Magnifier,
    radius: 95,
    size: 31,
    trail: 10,
  },
  {
    angle: 156,
    background: "#fff",
    border: "#ded6ce",
    delay: 0,
    duration: 122,
    image: HEDGEHOG.hedgehog04RedPen,
    radius: 62,
    size: 22,
    trail: 6,
  },
];

const trailDots = Array.from({ length: 12 }, (_, index) => ({
  angle: 5.8 * (index + 1),
  opacity: Math.max(0.08, 0.58 - index * 0.045),
  radius: Math.max(0.7, 2.2 - index * 0.11),
}));

const moons = [
  { angle: 184, radius: 220, size: 8 },
  { angle: 166, radius: 118, size: 9 },
  { angle: 128, radius: 74, size: 7 },
  { angle: 337, radius: 170, size: 10 },
  { angle: 88, radius: 124, size: 10 },
  { angle: -21, radius: 218, size: 18 },
];

export default function MobileOrbitBackdrop({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none relative ${className}`}>
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes mobileOrbitSpin {
            from { transform: rotate(0turn); }
            to { transform: rotate(1turn); }
          }
          @keyframes mobileOrbitCounterSpin {
            from { transform: rotate(0turn); }
            to { transform: rotate(-1turn); }
          }
          @keyframes mobileDotTwinkle {
            0%, 100% { opacity: calc(var(--dot-opacity, 0.3) * 0.45); transform: scale(0.86); }
            50% { opacity: var(--dot-opacity, 0.3); transform: scale(1.14); }
          }
          @keyframes mobileAsteroidFloat {
            0%, 100% { opacity: var(--asteroid-opacity, 0.35); }
            50% { opacity: calc(var(--asteroid-opacity, 0.35) * 1.16); }
          }
          @keyframes mobileOrbitDustSpin {
            from { transform: rotate(0turn); }
            to { transform: rotate(1turn); }
          }
          @keyframes mobileCorePulse {
            0%, 100% { opacity: 0.68; transform: translate(-50%, -50%) scale(0.96); }
            50% { opacity: 0.92; transform: translate(-50%, -50%) scale(1.03); }
          }
          .mobile-orbit-spinner { animation: mobileOrbitSpin var(--orbit-duration, 90s) linear infinite; animation-delay: var(--orbit-delay, 0s); will-change: transform; }
          .mobile-orbit-counter { animation: mobileOrbitCounterSpin var(--orbit-duration, 90s) linear infinite; animation-delay: var(--orbit-delay, 0s); will-change: transform; }
          .mobile-orbit-star { animation: mobileDotTwinkle var(--dot-duration, 8s) ease-in-out infinite; animation-delay: var(--dot-delay, 0ms); will-change: opacity, transform; }
          .mobile-orbit-asteroid { animation: mobileAsteroidFloat var(--asteroid-duration, 16s) ease-in-out infinite; animation-delay: var(--asteroid-delay, 0ms); will-change: opacity, transform; }
          .mobile-orbit-dust { animation: mobileOrbitDustSpin 260s linear infinite; transform-box: view-box; transform-origin: ${center.x}px ${center.y}px; will-change: transform; }
          .mobile-orbit-core { animation: mobileCorePulse 5.8s ease-in-out infinite; will-change: opacity, transform; }
        }
      `}</style>

      <div
        className="absolute left-1/2 top-[38px]"
        style={{
          height: scene.height,
          transform: "translateX(-50%) scale(var(--mobile-orbit-scale, 1))",
          transformOrigin: "top center",
          width: scene.width,
        }}
      >
        <svg className="absolute inset-0 h-full w-full overflow-visible" fill="none" viewBox={`0 0 ${scene.width} ${scene.height}`}>
          <circle cx={center.x} cy={center.y} r="76" stroke="#fffdf6" strokeDasharray="1 6" strokeLinecap="round" strokeOpacity="0.22" />
          <circle cx={center.x} cy={center.y} r="132" stroke="#fffdf6" strokeDasharray="1 7" strokeLinecap="round" strokeOpacity="0.3" />
          <circle cx={center.x} cy={center.y} r="188" stroke="#fffdf6" strokeDasharray="1 8" strokeLinecap="round" strokeOpacity="0.36" />
          <circle cx={center.x} cy={center.y} r="228" stroke="#fffdf6" strokeDasharray="1 9" strokeLinecap="round" strokeOpacity="0.16" />

          <g className="mobile-orbit-dust">
            {asteroidDots.map((dot, index) => (
              <circle
                className="mobile-orbit-asteroid"
                cx={dot.x}
                cy={dot.y}
                fill="#f6f2e9"
                key={`asteroid-${index}`}
                r={dot.radius}
                style={
                  {
                    "--asteroid-delay": `${index * -37}ms`,
                    "--asteroid-duration": `${14 + (index % 9)}s`,
                    "--asteroid-opacity": dot.opacity,
                  } as CSSProperties
                }
              />
            ))}
          </g>

          {stars.map((star, index) => (
            <circle
              className="mobile-orbit-star"
              cx={star.x}
              cy={star.y}
              fill="#fffdf6"
              key={`star-${index}`}
              r={star.radius}
              style={
                {
                  "--dot-delay": `${star.delay}ms`,
                  "--dot-duration": `${star.duration}s`,
                  "--dot-opacity": star.opacity,
                } as CSSProperties
              }
            />
          ))}
        </svg>

        <div className="mobile-orbit-core absolute h-[82px] w-[82px] rounded-full border border-[#fffdf6]/65" style={{ left: center.x, top: center.y }} />
        <div
          className="mobile-orbit-core absolute h-[62px] w-[62px] rounded-full border border-[#fffdf6]/70 [animation-delay:-1.1s]"
          style={{ left: center.x, top: center.y }}
        />
        <div
          className="mobile-orbit-core absolute h-[42px] w-[42px] rounded-full border border-[#fffdf6]/75 [animation-delay:-2.2s]"
          style={{ left: center.x, top: center.y }}
        />
        <div
          className="absolute z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#fffdf6]/80 bg-white/90 text-[18px] shadow-[0_10px_24px_rgba(255,255,255,0.12)]"
          style={{ left: center.x, top: center.y }}
        >
          💡
        </div>

        {moons.map((moon) => (
          <span
            className="absolute z-10 rounded-full border border-[#fffdf6]/60 bg-white/90 shadow-[0_6px_16px_rgba(255,255,255,0.12)]"
            key={`${moon.angle}-${moon.radius}`}
            style={{
              left: center.x,
              top: center.y,
              height: moon.size,
              transform: `rotate(${moon.angle}deg) translateX(${moon.radius}px) translate(-50%, -50%)`,
              width: moon.size,
            }}
          />
        ))}

        {planets.map((planet) => (
          <div
            className="absolute z-20 h-0 w-0"
            key={`${planet.image}-${planet.angle}-${planet.radius}`}
            style={{ left: center.x, top: center.y, transform: `rotate(${planet.angle}deg)` }}
          >
            <div
              className="mobile-orbit-spinner absolute left-0 top-0 h-0 w-0"
              style={
                {
                  "--orbit-delay": `${planet.delay}s`,
                  "--orbit-duration": `${planet.duration}s`,
                } as CSSProperties
              }
            >
              {trailDots.slice(0, planet.trail).map((trail, index) => (
                <span
                  className="absolute left-0 top-0 rounded-full bg-[#fffdf6]"
                  key={`trail-${index}`}
                  style={{
                    height: trail.radius,
                    opacity: trail.opacity,
                    transform: `rotate(${-trail.angle}deg) translateX(${planet.radius}px) translate(-50%, -50%)`,
                    width: trail.radius,
                  }}
                />
              ))}

              <div
                className="absolute left-0 top-0"
                style={{ transform: `translateX(${planet.radius}px) translate(-50%, -50%)` }}
              >
                <div style={{ transform: `rotate(${-planet.angle}deg)` }}>
                  <div
                    className="mobile-orbit-counter relative z-10 flex items-center justify-center overflow-hidden rounded-full"
                    style={
                      {
                        "--orbit-delay": `${planet.delay}s`,
                        "--orbit-duration": `${planet.duration}s`,
                        aspectRatio: "1 / 1",
                        background: planet.background,
                        border: `2px solid ${planet.border}`,
                        height: planet.size,
                        width: planet.size,
                      } as CSSProperties
                    }
                  >
                    <img alt="" className="h-full w-full object-contain" src={planet.image} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
