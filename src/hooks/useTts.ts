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
  // Default: AI (server-generated MP3). This guarantees identical playback on
  // macOS, Windows, Linux — any browser that can play audio/mpeg. The browser
  // Web Speech API is kept as a fallback because Windows Chrome often ships
  // with zero available voices, which silently breaks native TTS.
  const [useAiVoice, setUseAiVoice] = useState(true);
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

  // Browser TTS — instant, no network call. Returns false if the platform
  // has no usable voices (common on Windows Chrome with no language packs),
  // so the caller can fall back to AI TTS.
  const speakBrowser = useCallback(
    (text: string): boolean => {
      if (typeof window === "undefined" || !window.speechSynthesis) return false;
      cleanup();
      window.speechSynthesis.cancel();

      // Voices on Chrome are populated asynchronously. If none yet, wait once.
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) {
        // Give the browser one chance to populate the voice list.
        // If still empty after ~300ms, bail out — caller should fall back.
        let resolved = false;
        const onVoices = () => {
          if (resolved) return;
          resolved = true;
          window.speechSynthesis.removeEventListener("voiceschanged", onVoices);
          const ready = window.speechSynthesis.getVoices();
          if (ready.length > 0) speakBrowserInternal(text);
        };
        window.speechSynthesis.addEventListener("voiceschanged", onVoices);
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            window.speechSynthesis.removeEventListener("voiceschanged", onVoices);
          }
        }, 300);
        return false;
      }

      speakBrowserInternal(text);
      return true;

      function speakBrowserInternal(t: string) {
        const utterance = new SpeechSynthesisUtterance(t);
        utterance.rate = rate;
        utterance.onend = () => { setIsSpeaking(false); setIsPaused(false); };
        utterance.onerror = () => { setIsSpeaking(false); setIsPaused(false); };
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
        setIsPaused(false);
      }
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
        if (!blob || blob.size === 0) throw new Error("Empty audio");
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
        cleanup();
        // Server TTS failed — try the browser as a last resort so the user
        // still hears something, even if it's a lower-quality local voice.
        const ok = speakBrowser(text);
        if (!ok) {
          setIsSpeaking(false);
          setIsPaused(false);
        }
      }
    },
    [rate, selectedVoice, cleanup, speakBrowser]
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
