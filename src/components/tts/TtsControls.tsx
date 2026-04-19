"use client";

interface TtsControlsProps {
  isSpeaking: boolean;
  isPaused: boolean;
  loading?: boolean;
  voices: { id: string; label: string }[];
  selectedVoice: string;
  rate: number;
  useAiVoice?: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onVoiceChange: (voiceId: string) => void;
  onRateChange: (rate: number) => void;
  onToggleAiVoice?: (on: boolean) => void;
}

export default function TtsControls({
  isSpeaking,
  isPaused,
  loading,
  voices,
  selectedVoice,
  rate,
  useAiVoice,
  onPause,
  onResume,
  onStop,
  onVoiceChange,
  onRateChange,
  onToggleAiVoice,
}: TtsControlsProps) {
  if (!isSpeaking && !loading) return null;

  return (
    <div className="flex items-center gap-3 bg-white border-t border-gray-200 px-4 py-2">
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border border-gray-300 border-t-[#111111]" />
          <span className="text-xs text-gray-500">Generating AI voice...</span>
        </div>
      ) : (
        <>
          <button onClick={isPaused ? onResume : onPause} className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200">
            {isPaused ? "Resume" : "Pause"}
          </button>
          <button onClick={onStop} className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200">
            Stop
          </button>

          {/* Speed */}
          <div className="flex items-center gap-2 ml-2">
            <label className="text-xs text-gray-500">Speed:</label>
            <input type="range" min={0.5} max={2} step={0.25} value={rate} onChange={(e) => onRateChange(parseFloat(e.target.value))} className="w-16 accent-[#111111]" />
            <span className="text-xs text-gray-600 w-8">{rate}x</span>
          </div>

          {/* AI Voice toggle */}
          {onToggleAiVoice && (
            <div className="flex items-center gap-2 ml-2">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <div
                  onClick={() => onToggleAiVoice(!useAiVoice)}
                  className={`w-7 h-3.5 rounded-full transition-colors relative cursor-pointer ${useAiVoice ? "bg-[#111111]" : "bg-gray-300"}`}
                >
                  <div className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-transform shadow ${useAiVoice ? "translate-x-3.5" : "translate-x-0.5"}`} />
                </div>
                <span className="text-xs text-gray-600">AI Voice</span>
              </label>
            </div>
          )}

          {/* Voice selector — only when AI voice is on */}
          {useAiVoice && (
            <div className="flex items-center gap-1 ml-1">
              <select value={selectedVoice} onChange={(e) => onVoiceChange(e.target.value)} className="text-xs border border-gray-300 rounded px-1 py-1 max-w-[120px]">
                {voices.map((v) => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </select>
            </div>
          )}

          <span className="ml-auto text-xs text-[#111111] font-medium animate-pulse">
            {isPaused ? "Paused" : useAiVoice ? "AI Speaking..." : "Speaking..."}
          </span>
        </>
      )}
    </div>
  );
}
