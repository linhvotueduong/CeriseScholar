"use client";

// Hand-drawn style SVG doodle illustrations for Cerise Scholar
// All black & white with optional cerise accent

export function DoodleScientist({ className = "", size = 120 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" className={className}>
      {/* Head */}
      <circle cx="60" cy="35" r="18" stroke="black" strokeWidth="2.5" strokeLinecap="round" />
      {/* Glasses */}
      <circle cx="53" cy="33" r="5" stroke="black" strokeWidth="2" />
      <circle cx="67" cy="33" r="5" stroke="black" strokeWidth="2" />
      <line x1="58" y1="33" x2="62" y2="33" stroke="black" strokeWidth="2" />
      {/* Eyes */}
      <circle cx="53" cy="33" r="1.5" fill="black" />
      <circle cx="67" cy="33" r="1.5" fill="black" />
      {/* Smile */}
      <path d="M55 40 Q60 45 65 40" stroke="black" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Hair - messy scientist */}
      <path d="M42 28 Q38 18 45 15 Q50 12 55 17" stroke="black" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M65 17 Q70 12 75 15 Q82 18 78 28" stroke="black" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M48 18 Q52 10 58 14" stroke="black" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Body - lab coat */}
      <path d="M45 53 L42 95 L78 95 L75 53" stroke="black" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="60" y1="53" x2="60" y2="90" stroke="black" strokeWidth="2" strokeDasharray="4 3" />
      {/* Arms */}
      <path d="M42 60 L25 75 L30 80" stroke="black" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M78 60 L95 70 L90 78" stroke="black" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Beaker in hand */}
      <path d="M22 78 L20 95 L35 95 L33 78 Z" stroke="black" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M23 88 Q27 85 32 88" stroke="#DE3163" strokeWidth="2" fill="none" />
      {/* Pocket */}
      <rect x="50" y="70" width="8" height="10" rx="1" stroke="black" strokeWidth="1.5" fill="none" />
      <line x1="53" y1="70" x2="53" y2="75" stroke="#DE3163" strokeWidth="1.5" />
    </svg>
  );
}

export function DoodleBook({ className = "", size = 80 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" className={className}>
      <path d="M15 15 L15 65 L65 65 L65 15 Z" stroke="black" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
      <path d="M15 15 L10 18 L10 68 L15 65" stroke="black" strokeWidth="2" fill="none" strokeLinejoin="round" />
      <line x1="25" y1="28" x2="55" y2="28" stroke="black" strokeWidth="2" strokeLinecap="round" />
      <line x1="25" y1="36" x2="50" y2="36" stroke="black" strokeWidth="2" strokeLinecap="round" />
      <line x1="25" y1="44" x2="45" y2="44" stroke="black" strokeWidth="2" strokeLinecap="round" />
      {/* Bookmark */}
      <path d="M55 15 L55 30 L58 27 L61 30 L61 15" fill="#DE3163" stroke="#DE3163" strokeWidth="1" />
    </svg>
  );
}

export function DoodleMagnifier({ className = "", size = 70 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 70 70" fill="none" className={className}>
      <circle cx="28" cy="28" r="18" stroke="black" strokeWidth="2.5" />
      <line x1="41" y1="41" x2="60" y2="60" stroke="black" strokeWidth="3" strokeLinecap="round" />
      {/* Shine */}
      <path d="M20 18 Q22 14 26 16" stroke="black" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function DoodleLightbulb({ className = "", size = 60 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none" className={className}>
      <path d="M30 8 Q15 8 15 25 Q15 35 23 38 L23 46 L37 46 L37 38 Q45 35 45 25 Q45 8 30 8Z" stroke="black" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
      <line x1="25" y1="50" x2="35" y2="50" stroke="black" strokeWidth="2" strokeLinecap="round" />
      <line x1="26" y1="53" x2="34" y2="53" stroke="black" strokeWidth="2" strokeLinecap="round" />
      {/* Rays */}
      <line x1="30" y1="2" x2="30" y2="0" stroke="#DE3163" strokeWidth="2" strokeLinecap="round" />
      <line x1="48" y1="10" x2="50" y2="8" stroke="#DE3163" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="10" x2="10" y2="8" stroke="#DE3163" strokeWidth="2" strokeLinecap="round" />
      <line x1="52" y1="25" x2="55" y2="25" stroke="#DE3163" strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="25" x2="5" y2="25" stroke="#DE3163" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function DoodlePDF({ className = "", size = 65 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 65 80" fill="none" className={className}>
      <path d="M10 5 L10 75 L55 75 L55 18 L42 5 Z" stroke="black" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
      <path d="M42 5 L42 18 L55 18" stroke="black" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
      <line x1="20" y1="35" x2="45" y2="35" stroke="black" strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="43" x2="42" y2="43" stroke="black" strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="51" x2="38" y2="51" stroke="black" strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="59" x2="35" y2="59" stroke="black" strokeWidth="2" strokeLinecap="round" />
      {/* PDF label */}
      <rect x="16" y="22" width="24" height="10" rx="2" fill="#DE3163" />
      <text x="22" y="30" fill="white" fontSize="7" fontWeight="bold" fontFamily="sans-serif">PDF</text>
    </svg>
  );
}

export function DoodlePencil({ className = "", size = 60 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none" className={className}>
      <path d="M45 5 L55 15 L20 50 L8 53 L11 41 Z" stroke="black" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
      <line x1="38" y1="12" x2="48" y2="22" stroke="black" strokeWidth="2" />
      <path d="M8 53 L11 41 L20 50 Z" fill="#DE3163" stroke="black" strokeWidth="1.5" />
    </svg>
  );
}

export function DoodleBrain({ className = "", size = 80 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" className={className}>
      <path d="M40 70 L40 55" stroke="black" strokeWidth="2" strokeLinecap="round" />
      <path d="M25 55 Q15 50 15 38 Q15 28 25 25 Q22 15 32 12 Q40 5 48 12 Q58 15 55 25 Q65 28 65 38 Q65 50 55 55 Q48 58 40 55 Q32 58 25 55Z" stroke="black" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
      {/* Brain squiggle */}
      <path d="M30 30 Q35 25 40 30 Q45 35 50 30" stroke="black" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M28 40 Q33 35 38 40 Q43 45 48 40" stroke="black" strokeWidth="2" fill="none" strokeLinecap="round" />
      <line x1="40" y1="25" x2="40" y2="50" stroke="black" strokeWidth="1.5" strokeDasharray="3 2" />
    </svg>
  );
}

export function DoodleChart({ className = "", size = 70 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 70 70" fill="none" className={className}>
      {/* Axes */}
      <line x1="15" y1="55" x2="60" y2="55" stroke="black" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="15" y1="55" x2="15" y2="10" stroke="black" strokeWidth="2.5" strokeLinecap="round" />
      {/* Bars */}
      <rect x="22" y="38" width="8" height="17" rx="1" stroke="black" strokeWidth="2" fill="none" />
      <rect x="34" y="25" width="8" height="30" rx="1" stroke="black" strokeWidth="2" fill="#DE3163" fillOpacity="0.3" />
      <rect x="46" y="18" width="8" height="37" rx="1" stroke="black" strokeWidth="2" fill="none" />
      {/* Trend line */}
      <path d="M18 42 L30 35 L42 22 L54 15" stroke="#DE3163" strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray="4 3" />
    </svg>
  );
}

export function DoodleStars({ className = "" }: { className?: string }) {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" className={className}>
      <path d="M15 2 L17 12 L27 12 L19 18 L22 28 L15 22 L8 28 L11 18 L3 12 L13 12Z" stroke="#DE3163" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

export function DoodleArrow({ className = "" }: { className?: string }) {
  return (
    <svg width="40" height="20" viewBox="0 0 40 20" fill="none" className={className}>
      <path d="M2 10 Q10 5 20 10 Q30 15 38 10" stroke="black" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M33 6 L38 10 L33 14" stroke="black" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DoodleUnderline({ className = "", width = 200 }: { className?: string; width?: number }) {
  return (
    <svg width={width} height="12" viewBox={`0 0 ${width} 12`} fill="none" className={className}>
      <path d={`M2 8 Q${width * 0.25} 2 ${width * 0.5} 8 Q${width * 0.75} 14 ${width - 2} 6`} stroke="#DE3163" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function DoodleCircle({ className = "", size = 40 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      <path d="M20 3 Q35 3 37 20 Q35 37 20 37 Q5 37 3 20 Q5 3 20 3" stroke="black" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}
