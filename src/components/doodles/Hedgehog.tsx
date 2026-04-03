"use client";

// Cute scholar hedgehog mascot for Cerise Scholar
// Hand-drawn style with cerise accent — multiple poses

export function HedgehogHero({ className = "", size = 300 }: { className?: string; size?: number }) {
  // Main hero hedgehog: standing, holding a book, wearing tiny round glasses
  return (
    <svg width={size} height={size} viewBox="0 0 300 300" fill="none" className={className}>
      {/* Back spines */}
      <path d="M95 105 Q80 70 110 60 Q100 35 135 40 Q130 15 165 25 Q170 5 200 20 Q215 8 225 35 Q245 25 240 55 Q265 50 250 80 Q275 78 258 105" stroke="#2D2D2D" strokeWidth="3.5" fill="#F5F0EB" strokeLinecap="round" strokeLinejoin="round" />
      {/* Spine detail lines */}
      <path d="M110 60 L130 90" stroke="#2D2D2D" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <path d="M135 40 L148 78" stroke="#2D2D2D" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <path d="M165 25 L165 75" stroke="#2D2D2D" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <path d="M200 20 L185 72" stroke="#2D2D2D" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <path d="M225 35 L205 78" stroke="#2D2D2D" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <path d="M240 55 L220 88" stroke="#2D2D2D" strokeWidth="2" strokeLinecap="round" opacity="0.4" />

      {/* Body */}
      <ellipse cx="175" cy="165" rx="80" ry="72" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="3.5" />

      {/* Belly */}
      <ellipse cx="170" cy="175" rx="45" ry="42" fill="#FFF8F0" stroke="#2D2D2D" strokeWidth="2" opacity="0.6" />

      {/* Left arm holding book */}
      <path d="M105 155 Q85 165 80 185 Q78 195 85 200" stroke="#2D2D2D" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      {/* Little hand/paw */}
      <circle cx="85" cy="200" r="6" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="2.5" />

      {/* Book in left hand */}
      <rect x="60" y="188" width="40" height="30" rx="3" fill="#DE3163" stroke="#2D2D2D" strokeWidth="2.5" />
      <line x1="80" y1="188" x2="80" y2="218" stroke="#2D2D2D" strokeWidth="2" />
      <line x1="67" y1="197" x2="77" y2="197" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="67" y1="203" x2="75" y2="203" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="67" y1="209" x2="73" y2="209" stroke="white" strokeWidth="1.5" strokeLinecap="round" />

      {/* Right arm waving */}
      <path d="M245 150 Q265 140 275 120 Q280 110 275 105" stroke="#2D2D2D" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      {/* Right paw */}
      <circle cx="275" cy="105" r="6" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="2.5" />

      {/* Head */}
      <ellipse cx="170" cy="115" rx="52" ry="45" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="3.5" />

      {/* Ears */}
      <ellipse cx="130" cy="82" rx="12" ry="15" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="2.5" transform="rotate(-15 130 82)" />
      <ellipse cx="130" cy="82" rx="6" ry="8" fill="#FFCDD2" stroke="none" transform="rotate(-15 130 82)" />
      <ellipse cx="210" cy="82" rx="12" ry="15" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="2.5" transform="rotate(15 210 82)" />
      <ellipse cx="210" cy="82" rx="6" ry="8" fill="#FFCDD2" stroke="none" transform="rotate(15 210 82)" />

      {/* Glasses */}
      <circle cx="152" cy="110" r="14" stroke="#2D2D2D" strokeWidth="2.5" fill="none" />
      <circle cx="188" cy="110" r="14" stroke="#2D2D2D" strokeWidth="2.5" fill="none" />
      <line x1="166" y1="110" x2="174" y2="110" stroke="#2D2D2D" strokeWidth="2.5" />
      <line x1="138" y1="108" x2="128" y2="103" stroke="#2D2D2D" strokeWidth="2" strokeLinecap="round" />
      <line x1="202" y1="108" x2="212" y2="103" stroke="#2D2D2D" strokeWidth="2" strokeLinecap="round" />
      {/* Lens shine */}
      <circle cx="147" cy="105" r="3" fill="white" opacity="0.6" />
      <circle cx="183" cy="105" r="3" fill="white" opacity="0.6" />

      {/* Eyes behind glasses */}
      <circle cx="152" cy="112" r="4" fill="#2D2D2D" />
      <circle cx="188" cy="112" r="4" fill="#2D2D2D" />
      {/* Eye sparkle */}
      <circle cx="154" cy="110" r="1.5" fill="white" />
      <circle cx="190" cy="110" r="1.5" fill="white" />

      {/* Nose */}
      <ellipse cx="170" cy="125" rx="5" ry="4" fill="#2D2D2D" />

      {/* Smile */}
      <path d="M158 132 Q170 142 182 132" stroke="#2D2D2D" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* Blush cheeks */}
      <ellipse cx="138" cy="125" rx="8" ry="5" fill="#DE3163" opacity="0.25" />
      <ellipse cx="202" cy="125" rx="8" ry="5" fill="#DE3163" opacity="0.25" />

      {/* Feet */}
      <ellipse cx="145" cy="235" rx="18" ry="10" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="2.5" />
      <ellipse cx="200" cy="235" rx="18" ry="10" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="2.5" />

      {/* Sparkle accents */}
      <path d="M50 80 L53 73 L56 80 L63 83 L56 86 L53 93 L50 86 L43 83Z" fill="#DE3163" opacity="0.6" />
      <path d="M260 145 L262 140 L264 145 L269 147 L264 149 L262 154 L260 149 L255 147Z" fill="#DE3163" opacity="0.4" />
      <circle cx="280" cy="85" r="3" fill="#DE3163" opacity="0.3" />
    </svg>
  );
}

export function HedgehogReading({ className = "", size = 200 }: { className?: string; size?: number }) {
  // Sitting hedgehog reading a book
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" className={className}>
      {/* Back spines */}
      <path d="M55 75 Q42 48 68 42 Q60 22 88 28 Q88 10 115 18 Q125 5 142 22 Q158 15 155 40 Q172 38 162 62" stroke="#2D2D2D" strokeWidth="3" fill="#F5F0EB" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M68 42 L82 62" stroke="#2D2D2D" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <path d="M88 28 L95 55" stroke="#2D2D2D" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <path d="M115 18 L110 52" stroke="#2D2D2D" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <path d="M142 22 L128 55" stroke="#2D2D2D" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />

      {/* Body - sitting */}
      <ellipse cx="110" cy="130" rx="55" ry="50" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="3" />
      <ellipse cx="108" cy="138" rx="32" ry="30" fill="#FFF8F0" stroke="#2D2D2D" strokeWidth="1.5" opacity="0.6" />

      {/* Head */}
      <ellipse cx="108" cy="82" rx="38" ry="33" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="3" />

      {/* Ears */}
      <ellipse cx="78" cy="58" rx="8" ry="11" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="2" transform="rotate(-15 78 58)" />
      <ellipse cx="78" cy="58" rx="4" ry="6" fill="#FFCDD2" transform="rotate(-15 78 58)" />
      <ellipse cx="138" cy="58" rx="8" ry="11" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="2" transform="rotate(15 138 58)" />
      <ellipse cx="138" cy="58" rx="4" ry="6" fill="#FFCDD2" transform="rotate(15 138 58)" />

      {/* Glasses */}
      <circle cx="96" cy="80" r="10" stroke="#2D2D2D" strokeWidth="2" fill="none" />
      <circle cx="120" cy="80" r="10" stroke="#2D2D2D" strokeWidth="2" fill="none" />
      <line x1="106" y1="80" x2="110" y2="80" stroke="#2D2D2D" strokeWidth="2" />

      {/* Eyes */}
      <circle cx="96" cy="82" r="3" fill="#2D2D2D" />
      <circle cx="120" cy="82" r="3" fill="#2D2D2D" />
      <circle cx="97.5" cy="80.5" r="1" fill="white" />
      <circle cx="121.5" cy="80.5" r="1" fill="white" />

      {/* Nose & smile */}
      <ellipse cx="108" cy="90" rx="3.5" ry="3" fill="#2D2D2D" />
      <path d="M100 95 Q108 102 116 95" stroke="#2D2D2D" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Blush */}
      <ellipse cx="85" cy="90" rx="6" ry="3.5" fill="#DE3163" opacity="0.25" />
      <ellipse cx="131" cy="90" rx="6" ry="3.5" fill="#DE3163" opacity="0.25" />

      {/* Arms holding open book */}
      <path d="M65 120 Q50 128 48 142" stroke="#2D2D2D" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M155 120 Q170 128 172 142" stroke="#2D2D2D" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* Open book */}
      <path d="M45 140 L45 170 Q75 160 108 170 Q140 160 172 170 L172 140 Q140 130 108 140 Q75 130 45 140Z" fill="white" stroke="#2D2D2D" strokeWidth="2.5" strokeLinejoin="round" />
      <line x1="108" y1="140" x2="108" y2="170" stroke="#2D2D2D" strokeWidth="2" />
      {/* Text lines on book */}
      <line x1="55" y1="150" x2="95" y2="148" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="58" y1="157" x2="90" y2="155" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="115" y1="148" x2="160" y2="150" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="118" y1="155" x2="155" y2="157" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" />

      {/* Highlight line on book in cerise */}
      <line x1="55" y1="163" x2="88" y2="161" stroke="#DE3163" strokeWidth="2.5" strokeLinecap="round" />

      {/* Feet */}
      <ellipse cx="88" cy="178" rx="14" ry="8" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="2" />
      <ellipse cx="132" cy="178" rx="14" ry="8" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="2" />
    </svg>
  );
}

export function HedgehogHighlighting({ className = "", size = 200 }: { className?: string; size?: number }) {
  // Hedgehog with a big cerise highlighter pen
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" className={className}>
      {/* Back spines */}
      <path d="M60 80 Q48 55 72 48 Q65 28 92 32 Q92 14 118 22 Q128 10 145 25 Q160 18 157 44 Q174 42 165 65" stroke="#2D2D2D" strokeWidth="3" fill="#F5F0EB" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M72 48 L86 67" stroke="#2D2D2D" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <path d="M92 32 L100 60" stroke="#2D2D2D" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <path d="M118 22 L113 57" stroke="#2D2D2D" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <path d="M145 25 L132 58" stroke="#2D2D2D" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />

      {/* Body */}
      <ellipse cx="112" cy="125" rx="52" ry="48" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="3" />
      <ellipse cx="110" cy="132" rx="30" ry="28" fill="#FFF8F0" stroke="#2D2D2D" strokeWidth="1.5" opacity="0.6" />

      {/* Head */}
      <ellipse cx="112" cy="82" rx="36" ry="32" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="3" />

      {/* Ears */}
      <ellipse cx="84" cy="60" rx="7" ry="10" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="2" transform="rotate(-15 84 60)" />
      <ellipse cx="84" cy="60" rx="3.5" ry="5.5" fill="#FFCDD2" transform="rotate(-15 84 60)" />
      <ellipse cx="140" cy="60" rx="7" ry="10" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="2" transform="rotate(15 140 60)" />
      <ellipse cx="140" cy="60" rx="3.5" ry="5.5" fill="#FFCDD2" transform="rotate(15 140 60)" />

      {/* Glasses */}
      <circle cx="100" cy="80" r="10" stroke="#2D2D2D" strokeWidth="2" fill="none" />
      <circle cx="124" cy="80" r="10" stroke="#2D2D2D" strokeWidth="2" fill="none" />
      <line x1="110" y1="80" x2="114" y2="80" stroke="#2D2D2D" strokeWidth="2" />

      {/* Eyes - excited, looking at paper */}
      <circle cx="100" cy="80" r="3.5" fill="#2D2D2D" />
      <circle cx="124" cy="80" r="3.5" fill="#2D2D2D" />
      <circle cx="101.5" cy="78.5" r="1.2" fill="white" />
      <circle cx="125.5" cy="78.5" r="1.2" fill="white" />

      {/* Nose & big smile */}
      <ellipse cx="112" cy="90" rx="3.5" ry="3" fill="#2D2D2D" />
      <path d="M102 96 Q112 105 122 96" stroke="#2D2D2D" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Blush */}
      <ellipse cx="88" cy="90" rx="6" ry="3.5" fill="#DE3163" opacity="0.25" />
      <ellipse cx="136" cy="90" rx="6" ry="3.5" fill="#DE3163" opacity="0.25" />

      {/* Right arm holding highlighter */}
      <path d="M158 115 Q172 108 178 95" stroke="#2D2D2D" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* Highlighter pen */}
      <rect x="170" y="58" width="14" height="45" rx="3" fill="#DE3163" stroke="#2D2D2D" strokeWidth="2" transform="rotate(15 177 80)" />
      <rect x="172" y="48" width="10" height="14" rx="2" fill="#c4294f" stroke="#2D2D2D" strokeWidth="1.5" transform="rotate(15 177 55)" />
      <path d="M173 102 L177 112 L181 102" fill="#DE3163" stroke="#2D2D2D" strokeWidth="1.5" transform="rotate(15 177 107)" />

      {/* Left arm */}
      <path d="M66 118 Q52 125 48 135" stroke="#2D2D2D" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="48" cy="135" r="5" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="2" />

      {/* Paper with highlight */}
      <rect x="25" y="138" width="50" height="42" rx="2" fill="white" stroke="#2D2D2D" strokeWidth="2" />
      <line x1="32" y1="148" x2="68" y2="148" stroke="#ddd" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="32" y1="155" x2="65" y2="155" stroke="#ddd" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="30" y="159" width="40" height="6" rx="1" fill="#DE3163" opacity="0.3" />
      <line x1="32" y1="162" x2="68" y2="162" stroke="#ddd" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="32" y1="169" x2="55" y2="169" stroke="#ddd" strokeWidth="1.5" strokeLinecap="round" />

      {/* Feet */}
      <ellipse cx="92" cy="172" rx="13" ry="7" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="2" />
      <ellipse cx="132" cy="172" rx="13" ry="7" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="2" />

      {/* Sparkle */}
      <path d="M40 55 L42 50 L44 55 L49 57 L44 59 L42 64 L40 59 L35 57Z" fill="#DE3163" opacity="0.5" />
    </svg>
  );
}

export function HedgehogListening({ className = "", size = 200 }: { className?: string; size?: number }) {
  // Hedgehog wearing headphones (for TTS feature)
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" className={className}>
      {/* Back spines */}
      <path d="M55 80 Q42 52 68 45 Q60 25 88 30 Q88 12 115 20 Q125 8 142 22 Q158 16 155 42 Q172 40 162 65" stroke="#2D2D2D" strokeWidth="3" fill="#F5F0EB" strokeLinecap="round" strokeLinejoin="round" />

      {/* Body */}
      <ellipse cx="110" cy="132" rx="52" ry="48" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="3" />
      <ellipse cx="108" cy="140" rx="30" ry="28" fill="#FFF8F0" stroke="#2D2D2D" strokeWidth="1.5" opacity="0.6" />

      {/* Head */}
      <ellipse cx="110" cy="82" rx="36" ry="32" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="3" />

      {/* Ears */}
      <ellipse cx="82" cy="60" rx="7" ry="10" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="2" transform="rotate(-15 82 60)" />
      <ellipse cx="82" cy="60" rx="3.5" ry="5.5" fill="#FFCDD2" transform="rotate(-15 82 60)" />
      <ellipse cx="138" cy="60" rx="7" ry="10" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="2" transform="rotate(15 138 60)" />
      <ellipse cx="138" cy="60" rx="3.5" ry="5.5" fill="#FFCDD2" transform="rotate(15 138 60)" />

      {/* Headphone band */}
      <path d="M68 72 Q68 40 110 38 Q152 40 152 72" stroke="#2D2D2D" strokeWidth="4" fill="none" strokeLinecap="round" />
      {/* Left headphone cup */}
      <rect x="58" y="65" width="18" height="24" rx="8" fill="#DE3163" stroke="#2D2D2D" strokeWidth="2.5" />
      {/* Right headphone cup */}
      <rect x="144" y="65" width="18" height="24" rx="8" fill="#DE3163" stroke="#2D2D2D" strokeWidth="2.5" />

      {/* Glasses */}
      <circle cx="98" cy="80" r="10" stroke="#2D2D2D" strokeWidth="2" fill="none" />
      <circle cx="122" cy="80" r="10" stroke="#2D2D2D" strokeWidth="2" fill="none" />
      <line x1="108" y1="80" x2="112" y2="80" stroke="#2D2D2D" strokeWidth="2" />

      {/* Eyes - closed/happy, enjoying music */}
      <path d="M93 80 Q98 76 103 80" stroke="#2D2D2D" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M117 80 Q122 76 127 80" stroke="#2D2D2D" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* Nose */}
      <ellipse cx="110" cy="90" rx="3.5" ry="3" fill="#2D2D2D" />

      {/* Happy smile */}
      <path d="M100 96 Q110 106 120 96" stroke="#2D2D2D" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Blush */}
      <ellipse cx="86" cy="90" rx="6" ry="3.5" fill="#DE3163" opacity="0.25" />
      <ellipse cx="134" cy="90" rx="6" ry="3.5" fill="#DE3163" opacity="0.25" />

      {/* Arms swaying */}
      <path d="M65 120 Q48 130 45 145" stroke="#2D2D2D" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M155 120 Q172 130 175 145" stroke="#2D2D2D" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* Music notes */}
      <path d="M42 50 L42 38 L50 35 L50 47" stroke="#DE3163" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="42" cy="50" r="3.5" fill="#DE3163" />
      <circle cx="50" cy="47" r="3.5" fill="#DE3163" />

      <path d="M165 42 L165 30" stroke="#DE3163" strokeWidth="2" strokeLinecap="round" />
      <circle cx="165" cy="42" r="3" fill="#DE3163" opacity="0.6" />

      {/* Feet */}
      <ellipse cx="90" cy="178" rx="13" ry="7" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="2" />
      <ellipse cx="130" cy="178" rx="13" ry="7" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="2" />
    </svg>
  );
}

export function HedgehogWriting({ className = "", size = 200 }: { className?: string; size?: number }) {
  // Hedgehog writing at a desk with pen
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" className={className}>
      {/* Back spines */}
      <path d="M50 72 Q38 45 62 38 Q55 20 82 24 Q82 6 108 14 Q118 2 135 18 Q150 12 148 36 Q164 34 155 58" stroke="#2D2D2D" strokeWidth="3" fill="#F5F0EB" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M62 38 L76 58" stroke="#2D2D2D" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <path d="M82 24 L90 50" stroke="#2D2D2D" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <path d="M108 14 L105 48" stroke="#2D2D2D" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />

      {/* Body */}
      <ellipse cx="105" cy="120" rx="50" ry="45" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="3" />
      <ellipse cx="103" cy="128" rx="28" ry="26" fill="#FFF8F0" stroke="#2D2D2D" strokeWidth="1.5" opacity="0.6" />

      {/* Head */}
      <ellipse cx="105" cy="74" rx="35" ry="30" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="3" />

      {/* Ears */}
      <ellipse cx="78" cy="52" rx="7" ry="10" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="2" transform="rotate(-15 78 52)" />
      <ellipse cx="78" cy="52" rx="3.5" ry="5.5" fill="#FFCDD2" transform="rotate(-15 78 52)" />
      <ellipse cx="132" cy="52" rx="7" ry="10" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="2" transform="rotate(15 132 52)" />
      <ellipse cx="132" cy="52" rx="3.5" ry="5.5" fill="#FFCDD2" transform="rotate(15 132 52)" />

      {/* Glasses */}
      <circle cx="93" cy="72" r="10" stroke="#2D2D2D" strokeWidth="2" fill="none" />
      <circle cx="117" cy="72" r="10" stroke="#2D2D2D" strokeWidth="2" fill="none" />
      <line x1="103" y1="72" x2="107" y2="72" stroke="#2D2D2D" strokeWidth="2" />

      {/* Eyes - focused */}
      <circle cx="93" cy="73" r="3" fill="#2D2D2D" />
      <circle cx="117" cy="73" r="3" fill="#2D2D2D" />
      <circle cx="94" cy="71.5" r="1" fill="white" />
      <circle cx="118" cy="71.5" r="1" fill="white" />

      {/* Nose & concentrated smile */}
      <ellipse cx="105" cy="82" rx="3" ry="2.5" fill="#2D2D2D" />
      <path d="M98 87 Q105 92 112 87" stroke="#2D2D2D" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Blush */}
      <ellipse cx="82" cy="82" rx="5" ry="3" fill="#DE3163" opacity="0.25" />
      <ellipse cx="128" cy="82" rx="5" ry="3" fill="#DE3163" opacity="0.25" />

      {/* Desk */}
      <rect x="15" y="148" width="170" height="8" rx="3" fill="#E8D5B7" stroke="#2D2D2D" strokeWidth="2" />

      {/* Paper on desk */}
      <rect x="30" y="120" width="55" height="30" rx="2" fill="white" stroke="#2D2D2D" strokeWidth="2" />
      <line x1="37" y1="128" x2="78" y2="128" stroke="#ddd" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="37" y1="134" x2="75" y2="134" stroke="#ddd" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="37" y1="140" x2="60" y2="140" stroke="#DE3163" strokeWidth="2" strokeLinecap="round" />

      {/* Right arm with pen */}
      <path d="M148 110 Q158 118 155 132" stroke="#2D2D2D" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Pen */}
      <line x1="152" y1="125" x2="72" y2="140" stroke="#2D2D2D" strokeWidth="3" strokeLinecap="round" />
      <line x1="152" y1="125" x2="158" y2="122" stroke="#DE3163" strokeWidth="3" strokeLinecap="round" />

      {/* Left arm on desk */}
      <path d="M60 110 Q45 120 42 130" stroke="#2D2D2D" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="42" cy="130" r="5" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="2" />

      {/* Coffee mug */}
      <rect x="145" y="130" width="22" height="18" rx="3" fill="white" stroke="#2D2D2D" strokeWidth="2" />
      <path d="M167 135 Q175 138 167 144" stroke="#2D2D2D" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Steam */}
      <path d="M152 125 Q150 118 154 112" stroke="#2D2D2D" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.3" />
      <path d="M158 125 Q160 118 158 112" stroke="#2D2D2D" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.3" />

      {/* Feet under desk */}
      <ellipse cx="85" cy="165" rx="12" ry="6" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="2" />
      <ellipse cx="122" cy="165" rx="12" ry="6" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="2" />
    </svg>
  );
}

export function HedgehogIdea({ className = "", size = 200 }: { className?: string; size?: number }) {
  // Hedgehog with lightbulb moment (for AI/ScholarAsk)
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" className={className}>
      {/* Back spines - excited, slightly raised */}
      <path d="M55 82 Q40 50 68 44 Q58 22 88 28 Q86 8 118 18 Q128 4 148 22 Q162 14 158 42 Q178 40 165 68" stroke="#2D2D2D" strokeWidth="3" fill="#F5F0EB" strokeLinecap="round" strokeLinejoin="round" />

      {/* Body */}
      <ellipse cx="112" cy="135" rx="52" ry="46" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="3" />
      <ellipse cx="110" cy="142" rx="30" ry="27" fill="#FFF8F0" stroke="#2D2D2D" strokeWidth="1.5" opacity="0.6" />

      {/* Head */}
      <ellipse cx="110" cy="85" rx="36" ry="32" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="3" />

      {/* Ears */}
      <ellipse cx="82" cy="62" rx="7" ry="10" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="2" transform="rotate(-15 82 62)" />
      <ellipse cx="82" cy="62" rx="3.5" ry="5.5" fill="#FFCDD2" transform="rotate(-15 82 62)" />
      <ellipse cx="138" cy="62" rx="7" ry="10" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="2" transform="rotate(15 138 62)" />
      <ellipse cx="138" cy="62" rx="3.5" ry="5.5" fill="#FFCDD2" transform="rotate(15 138 62)" />

      {/* Glasses */}
      <circle cx="98" cy="83" r="10" stroke="#2D2D2D" strokeWidth="2" fill="none" />
      <circle cx="122" cy="83" r="10" stroke="#2D2D2D" strokeWidth="2" fill="none" />
      <line x1="108" y1="83" x2="112" y2="83" stroke="#2D2D2D" strokeWidth="2" />

      {/* Eyes - wide and excited */}
      <circle cx="98" cy="83" r="4.5" fill="#2D2D2D" />
      <circle cx="122" cy="83" r="4.5" fill="#2D2D2D" />
      <circle cx="100" cy="81" r="2" fill="white" />
      <circle cx="124" cy="81" r="2" fill="white" />

      {/* Nose */}
      <ellipse cx="110" cy="93" rx="3.5" ry="3" fill="#2D2D2D" />

      {/* Excited open mouth */}
      <ellipse cx="110" cy="102" rx="8" ry="5" fill="#2D2D2D" stroke="#2D2D2D" strokeWidth="1.5" />
      <ellipse cx="110" cy="101" rx="5" ry="3" fill="#E57373" />

      {/* Blush */}
      <ellipse cx="86" cy="93" rx="6" ry="3.5" fill="#DE3163" opacity="0.3" />
      <ellipse cx="134" cy="93" rx="6" ry="3.5" fill="#DE3163" opacity="0.3" />

      {/* Arms raised in excitement */}
      <path d="M65 120 Q42 105 38 85" stroke="#2D2D2D" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="38" cy="85" r="5" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="2" />
      <path d="M155 118 Q178 100 180 82" stroke="#2D2D2D" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="180" cy="82" r="5" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="2" />

      {/* Lightbulb above head */}
      <path d="M110 28 Q95 28 95 42 Q95 50 102 53 L102 58 L118 58 L118 53 Q125 50 125 42 Q125 28 110 28Z" fill="#FDCB40" stroke="#2D2D2D" strokeWidth="2.5" strokeLinejoin="round" />
      <line x1="104" y1="61" x2="116" y2="61" stroke="#2D2D2D" strokeWidth="2" strokeLinecap="round" />
      <line x1="105" y1="64" x2="115" y2="64" stroke="#2D2D2D" strokeWidth="2" strokeLinecap="round" />
      {/* Filament */}
      <path d="M106 45 Q110 40 114 45" stroke="#2D2D2D" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {/* Light rays */}
      <line x1="110" y1="15" x2="110" y2="8" stroke="#FDCB40" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="130" y1="22" x2="135" y2="16" stroke="#FDCB40" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="90" y1="22" x2="85" y2="16" stroke="#FDCB40" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="138" y1="38" x2="145" y2="36" stroke="#FDCB40" strokeWidth="2" strokeLinecap="round" />
      <line x1="82" y1="38" x2="75" y2="36" stroke="#FDCB40" strokeWidth="2" strokeLinecap="round" />

      {/* Feet */}
      <ellipse cx="92" cy="178" rx="13" ry="7" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="2" />
      <ellipse cx="130" cy="178" rx="13" ry="7" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="2" />

      {/* Sparkles */}
      <path d="M30 65 L32 60 L34 65 L39 67 L34 69 L32 74 L30 69 L25 67Z" fill="#DE3163" opacity="0.5" />
      <path d="M172 55 L174 50 L176 55 L181 57 L176 59 L174 64 L172 59 L167 57Z" fill="#FDCB40" opacity="0.5" />
    </svg>
  );
}

export function HedgehogSearch({ className = "", size = 200 }: { className?: string; size?: number }) {
  // Hedgehog with magnifying glass (for search/review)
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" className={className}>
      {/* Back spines */}
      <path d="M60 78 Q48 52 72 45 Q65 26 92 30 Q92 12 118 20 Q128 8 145 22 Q160 16 157 40 Q174 38 165 62" stroke="#2D2D2D" strokeWidth="3" fill="#F5F0EB" strokeLinecap="round" strokeLinejoin="round" />

      {/* Body */}
      <ellipse cx="112" cy="128" rx="52" ry="48" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="3" />
      <ellipse cx="110" cy="136" rx="30" ry="28" fill="#FFF8F0" stroke="#2D2D2D" strokeWidth="1.5" opacity="0.6" />

      {/* Head */}
      <ellipse cx="110" cy="80" rx="36" ry="32" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="3" />

      {/* Ears */}
      <ellipse cx="82" cy="58" rx="7" ry="10" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="2" transform="rotate(-15 82 58)" />
      <ellipse cx="82" cy="58" rx="3.5" ry="5.5" fill="#FFCDD2" transform="rotate(-15 82 58)" />
      <ellipse cx="138" cy="58" rx="7" ry="10" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="2" transform="rotate(15 138 58)" />
      <ellipse cx="138" cy="58" rx="3.5" ry="5.5" fill="#FFCDD2" transform="rotate(15 138 58)" />

      {/* Glasses */}
      <circle cx="98" cy="78" r="10" stroke="#2D2D2D" strokeWidth="2" fill="none" />
      <circle cx="122" cy="78" r="10" stroke="#2D2D2D" strokeWidth="2" fill="none" />
      <line x1="108" y1="78" x2="112" y2="78" stroke="#2D2D2D" strokeWidth="2" />

      {/* Eyes - curious, looking through magnifier */}
      <circle cx="98" cy="78" r="3" fill="#2D2D2D" />
      <circle cx="122" cy="78" r="3" fill="#2D2D2D" />
      <circle cx="99" cy="76.5" r="1" fill="white" />
      <circle cx="123" cy="76.5" r="1" fill="white" />

      {/* Nose & smile */}
      <ellipse cx="110" cy="88" rx="3.5" ry="3" fill="#2D2D2D" />
      <path d="M103 93 Q110 99 117 93" stroke="#2D2D2D" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Blush */}
      <ellipse cx="86" cy="88" rx="6" ry="3.5" fill="#DE3163" opacity="0.25" />
      <ellipse cx="134" cy="88" rx="6" ry="3.5" fill="#DE3163" opacity="0.25" />

      {/* Right arm holding magnifying glass */}
      <path d="M155 115 Q170 105 175 92" stroke="#2D2D2D" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* Magnifying glass */}
      <circle cx="175" cy="65" r="22" stroke="#2D2D2D" strokeWidth="3.5" fill="white" fillOpacity="0.3" />
      <line x1="190" y1="82" x2="178" y2="72" stroke="#2D2D2D" strokeWidth="4" strokeLinecap="round" />
      {/* Shine on glass */}
      <path d="M165 55 Q167 50 172 52" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6" />

      {/* Left arm */}
      <path d="M68 118 Q52 125 48 138" stroke="#2D2D2D" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="48" cy="138" r="5" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="2" />

      {/* Feet */}
      <ellipse cx="92" cy="175" rx="13" ry="7" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="2" />
      <ellipse cx="132" cy="175" rx="13" ry="7" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="2" />
    </svg>
  );
}

export function HedgehogWaving({ className = "", size = 120 }: { className?: string; size?: number }) {
  // Small hedgehog waving — used in nav/footer
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" className={className}>
      {/* Spines */}
      <path d="M30 48 Q22 30 40 26 Q36 14 52 16 Q52 5 68 10 Q75 3 85 14 Q95 9 93 24 Q105 22 98 40" stroke="#2D2D2D" strokeWidth="2.5" fill="#F5F0EB" strokeLinecap="round" strokeLinejoin="round" />

      {/* Body */}
      <ellipse cx="65" cy="72" rx="32" ry="28" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="2.5" />
      <ellipse cx="64" cy="77" rx="18" ry="16" fill="#FFF8F0" stroke="#2D2D2D" strokeWidth="1.2" opacity="0.6" />

      {/* Head */}
      <ellipse cx="63" cy="48" rx="22" ry="19" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="2.5" />

      {/* Ears */}
      <ellipse cx="46" cy="35" rx="5" ry="7" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="1.5" transform="rotate(-12 46 35)" />
      <ellipse cx="46" cy="35" rx="2.5" ry="4" fill="#FFCDD2" transform="rotate(-12 46 35)" />
      <ellipse cx="80" cy="35" rx="5" ry="7" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="1.5" transform="rotate(12 80 35)" />
      <ellipse cx="80" cy="35" rx="2.5" ry="4" fill="#FFCDD2" transform="rotate(12 80 35)" />

      {/* Glasses */}
      <circle cx="56" cy="47" r="7" stroke="#2D2D2D" strokeWidth="1.8" fill="none" />
      <circle cx="72" cy="47" r="7" stroke="#2D2D2D" strokeWidth="1.8" fill="none" />
      <line x1="63" y1="47" x2="65" y2="47" stroke="#2D2D2D" strokeWidth="1.8" />

      {/* Eyes */}
      <circle cx="56" cy="48" r="2.2" fill="#2D2D2D" />
      <circle cx="72" cy="48" r="2.2" fill="#2D2D2D" />
      <circle cx="57" cy="47" r="0.8" fill="white" />
      <circle cx="73" cy="47" r="0.8" fill="white" />

      {/* Nose & smile */}
      <ellipse cx="64" cy="54" rx="2.5" ry="2" fill="#2D2D2D" />
      <path d="M59 57 Q64 62 69 57" stroke="#2D2D2D" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {/* Blush */}
      <ellipse cx="49" cy="54" rx="4" ry="2.5" fill="#DE3163" opacity="0.25" />
      <ellipse cx="79" cy="54" rx="4" ry="2.5" fill="#DE3163" opacity="0.25" />

      {/* Waving arm */}
      <path d="M92 65 Q105 55 108 42" stroke="#2D2D2D" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="108" cy="42" r="4" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="1.8" />

      {/* Other arm */}
      <path d="M38 68 Q28 75 25 82" stroke="#2D2D2D" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* Feet */}
      <ellipse cx="52" cy="98" rx="10" ry="5" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="1.8" />
      <ellipse cx="78" cy="98" rx="10" ry="5" fill="#F5F0EB" stroke="#2D2D2D" strokeWidth="1.8" />
    </svg>
  );
}
