"use client";

import { useState } from "react";

interface TtsWidgetProps {
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

const SPEED_PRESETS = [0.8, 1, 1.2, 1.5, 2, 2.5];

export default function TtsWidget({
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
}: TtsWidgetProps) {
  const [showSpeedPanel, setShowSpeedPanel] = useState(false);
  const [showVoicePanel, setShowVoicePanel] = useState(false);

  if (!isSpeaking && !loading) return null;

  return (
    <>
      {/* Floating widget — fixed on the right side */}
      <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-1">
        {/* Main pill */}
        <div className="bg-[#1E1E2E] rounded-2xl px-2 py-3 flex flex-col items-center gap-2 shadow-2xl min-w-[52px]">
          {loading ? (
            /* Loading state */
            <div className="w-8 h-8 flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-600 border-t-white" />
            </div>
          ) : (
            <>
              {/* Play / Pause button */}
              <button
                onClick={isPaused ? onResume : onPause}
                className="w-9 h-9 bg-[#2A2A3E] rounded-full flex items-center justify-center hover:bg-[#3A3A4E] transition-colors"
              >
                {isPaused ? (
                  <svg className="w-4 h-4 ml-0.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                )}
              </button>

              {/* Speed button */}
              <button
                onClick={() => { setShowSpeedPanel(!showSpeedPanel); setShowVoicePanel(false); }}
                className="text-[11px] text-white font-bold hover:text-blue-300 transition-colors"
              >
                {rate}x
              </button>

              {/* AI Voice toggle */}
              {onToggleAiVoice && (
                <button
                  onClick={() => { setShowVoicePanel(!showVoicePanel); setShowSpeedPanel(false); }}
                  className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[#3A3A4E] transition-colors"
                  title={useAiVoice ? "AI Voice ON" : "AI Voice OFF"}
                >
                  <svg className={`w-3.5 h-3.5 ${useAiVoice ? "text-blue-400" : "text-[#7a6a5a]"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m-4 0h8m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>
              )}

              {/* Stop button */}
              <button
                onClick={onStop}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-red-900/50 transition-colors"
                title="Stop"
              >
                <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth={3} strokeLinecap="round" fill="none" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Speaking indicator */}
        {isSpeaking && !isPaused && !loading && (
          <div className="flex gap-[2px] items-end h-3 mt-1">
            <div className="w-[3px] bg-blue-400 rounded-full animate-[bounce_0.6s_ease-in-out_infinite]" style={{ height: 8 }} />
            <div className="w-[3px] bg-blue-400 rounded-full animate-[bounce_0.6s_ease-in-out_infinite_0.1s]" style={{ height: 12 }} />
            <div className="w-[3px] bg-blue-400 rounded-full animate-[bounce_0.6s_ease-in-out_infinite_0.2s]" style={{ height: 6 }} />
            <div className="w-[3px] bg-blue-400 rounded-full animate-[bounce_0.6s_ease-in-out_infinite_0.3s]" style={{ height: 10 }} />
          </div>
        )}
      </div>

      {/* Speed panel — opens to the left of the widget */}
      {showSpeedPanel && (
        <div className="fixed right-16 top-1/2 -translate-y-1/2 z-50 bg-[#1E1E2E] rounded-2xl p-5 shadow-2xl w-64">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white font-semibold text-sm">
                {rate <= 0.8 ? "Slow" : rate <= 1.2 ? "Normal" : rate <= 1.5 ? "Fast" : "Very Fast"}
              </p>
            </div>
            <button onClick={() => setShowSpeedPanel(false)} className="text-[#7a6a5a] hover:text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* +/- controls */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <button
              onClick={() => onRateChange(Math.max(0.5, rate - 0.1))}
              className="w-10 h-10 bg-[#2A2A3E] rounded-xl flex items-center justify-center text-white text-lg hover:bg-[#3A3A4E] transition-colors"
            >
              -
            </button>
            <span className="text-white font-bold text-xl w-12 text-center">{rate.toFixed(1)}x</span>
            <button
              onClick={() => onRateChange(Math.min(3, rate + 0.1))}
              className="w-10 h-10 bg-[#2A2A3E] rounded-xl flex items-center justify-center text-white text-lg hover:bg-[#3A3A4E] transition-colors"
            >
              +
            </button>
          </div>

          {/* Preset buttons */}
          <div className="grid grid-cols-3 gap-2">
            {SPEED_PRESETS.map((s) => (
              <button
                key={s}
                onClick={() => { onRateChange(s); }}
                className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                  Math.abs(rate - s) < 0.05
                    ? "bg-blue-600 text-white"
                    : "bg-[#2A2A3E] text-[#d4cdc5] hover:bg-[#3A3A4E]"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Voice panel — opens to the left of the widget */}
      {showVoicePanel && (
        <div className="fixed right-16 top-1/2 -translate-y-1/2 z-50 bg-[#1E1E2E] rounded-2xl p-5 shadow-2xl w-56">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white font-semibold text-sm">Voice</p>
            <button onClick={() => setShowVoicePanel(false)} className="text-[#7a6a5a] hover:text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* AI Voice toggle */}
          {onToggleAiVoice && (
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-700">
              <span className="text-xs text-[#d4cdc5]">AI Voice</span>
              <div
                onClick={() => onToggleAiVoice(!useAiVoice)}
                className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${useAiVoice ? "bg-blue-600" : "bg-gray-600"}`}
              >
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform shadow ${useAiVoice ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
            </div>
          )}

          {/* Voice list */}
          {useAiVoice && (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {voices.map((v) => (
                <button
                  key={v.id}
                  onClick={() => onVoiceChange(v.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                    selectedVoice === v.id
                      ? "bg-blue-600 text-white"
                      : "text-[#d4cdc5] hover:bg-[#2A2A3E]"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          )}

          {!useAiVoice && (
            <p className="text-xs text-[#7a6a5a]">Using browser voice (instant). Toggle AI Voice for natural-sounding voices.</p>
          )}
        </div>
      )}
    </>
  );
}
