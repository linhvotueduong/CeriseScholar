"use client";

interface TtsControlsProps {
  isSpeaking: boolean;
  isPaused: boolean;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  rate: number;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onVoiceChange: (voice: SpeechSynthesisVoice) => void;
  onRateChange: (rate: number) => void;
}

export default function TtsControls({
  isSpeaking,
  isPaused,
  voices,
  selectedVoice,
  rate,
  onPause,
  onResume,
  onStop,
  onVoiceChange,
  onRateChange,
}: TtsControlsProps) {
  if (!isSpeaking) return null;

  return (
    <div className="flex items-center gap-3 bg-white border-t border-gray-200 px-4 py-2">
      {/* Pause / Resume */}
      <button
        onClick={isPaused ? onResume : onPause}
        className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
      >
        {isPaused ? "Resume" : "Pause"}
      </button>

      {/* Stop */}
      <button
        onClick={onStop}
        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
      >
        Stop
      </button>

      {/* Speed slider */}
      <div className="flex items-center gap-2 ml-4">
        <label className="text-xs text-gray-500">Speed:</label>
        <input
          type="range"
          min={0.5}
          max={2}
          step={0.25}
          value={rate}
          onChange={(e) => onRateChange(parseFloat(e.target.value))}
          className="w-20 accent-[#DE3163]"
        />
        <span className="text-xs text-gray-600 w-8">{rate}x</span>
      </div>

      {/* Voice selector */}
      <div className="flex items-center gap-2 ml-4">
        <label className="text-xs text-gray-500">Voice:</label>
        <select
          value={selectedVoice?.name || ""}
          onChange={(e) => {
            const voice = voices.find((v) => v.name === e.target.value);
            if (voice) onVoiceChange(voice);
          }}
          className="text-xs border border-gray-300 rounded px-1 py-1 max-w-[180px]"
        >
          {voices.map((v) => (
            <option key={v.name} value={v.name}>
              {v.name} ({v.lang})
            </option>
          ))}
        </select>
      </div>

      {/* Speaking indicator */}
      <span className="ml-auto text-xs text-[#DE3163] font-medium animate-pulse">
        {isPaused ? "Paused" : "Speaking..."}
      </span>
    </div>
  );
}
