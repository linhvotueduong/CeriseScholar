"use client";

import { useState, useCallback, useRef } from "react";

const AI_VOICES = [
  { id: "jenny", label: "Jenny (Female)" },
  { id: "aria", label: "Aria (Female)" },
  { id: "sara", label: "Sara (Female)" },
  { id: "nancy", label: "Nancy (Female)" },
  { id: "guy", label: "Guy (Male)" },
  { id: "davis", label: "Davis (Male)" },
  { id: "tony", label: "Tony (Male)" },
];

export function useTts() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState("jenny");
  const [rate, setRate] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [useAiVoice, setUseAiVoice] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    // Stop AI audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    // Stop browser TTS
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // Browser TTS — instant, no network call
  const speakBrowser = useCallback(
    (text: string) => {
      cleanup();
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.onend = () => { setIsSpeaking(false); setIsPaused(false); };
      utterance.onerror = () => { setIsSpeaking(false); setIsPaused(false); };
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
      setIsPaused(false);
    },
    [rate, cleanup]
  );

  // AI TTS — natural voice, takes a few seconds to generate
  const speakAi = useCallback(
    async (text: string) => {
      cleanup();
      setLoading(true);
      setIsSpeaking(true);
      setIsPaused(false);

      try {
        const ratePercent = Math.round((rate - 1.0) * 100);
        const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;

        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: text.slice(0, 5000), voice: selectedVoice, rate: rateStr }),
        });

        if (!res.ok) throw new Error("TTS failed");

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => { setIsSpeaking(false); setIsPaused(false); cleanup(); };
        audio.onerror = () => { setIsSpeaking(false); setIsPaused(false); cleanup(); };

        setLoading(false);
        await audio.play();
      } catch {
        setLoading(false);
        setIsSpeaking(false);
        setIsPaused(false);
        cleanup();
      }
    },
    [rate, selectedVoice, cleanup]
  );

  // Main speak function — picks browser or AI based on toggle
  const speak = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      if (useAiVoice) {
        speakAi(text);
      } else {
        speakBrowser(text);
      }
    },
    [useAiVoice, speakAi, speakBrowser]
  );

  const pause = useCallback(() => {
    if (useAiVoice && audioRef.current) {
      audioRef.current.pause();
    } else {
      window.speechSynthesis?.pause();
    }
    setIsPaused(true);
  }, [useAiVoice]);

  const resume = useCallback(() => {
    if (useAiVoice && audioRef.current) {
      audioRef.current.play();
    } else {
      window.speechSynthesis?.resume();
    }
    setIsPaused(false);
  }, [useAiVoice]);

  const stop = useCallback(() => {
    cleanup();
    setIsSpeaking(false);
    setIsPaused(false);
  }, [cleanup]);

  return {
    supported: true,
    isSpeaking,
    isPaused,
    loading,
    voices: AI_VOICES,
    selectedVoice,
    rate,
    useAiVoice,
    speak,
    pause,
    resume,
    stop,
    setSelectedVoice,
    setRate,
    setUseAiVoice,
  };
}
