"use client";

import { useState, useEffect, useCallback } from "react";
import {
  isTtsSupported,
  getVoices,
  speakText,
  stopSpeaking,
  pauseSpeaking,
  resumeSpeaking,
} from "@/lib/tts/speak";

export function useTts() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [rate, setRate] = useState(1.0);
  const supported = isTtsSupported();

  // Load voices (they load asynchronously in some browsers)
  useEffect(() => {
    if (!supported) return;

    function loadVoices() {
      const available = getVoices();
      setVoices(available);
      // Auto-select first English voice, or just the first voice
      if (!selectedVoice && available.length > 0) {
        const english = available.find((v) => v.lang.startsWith("en"));
        setSelectedVoice(english || available[0]);
      }
    }

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [supported, selectedVoice]);

  const speak = useCallback(
    (text: string) => {
      if (!text.trim()) return;

      speakText(text, {
        rate,
        voice: selectedVoice || undefined,
        onEnd: () => {
          setIsSpeaking(false);
          setIsPaused(false);
        },
        onError: () => {
          setIsSpeaking(false);
          setIsPaused(false);
        },
      });

      setIsSpeaking(true);
      setIsPaused(false);
    },
    [rate, selectedVoice]
  );

  const pause = useCallback(() => {
    pauseSpeaking();
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    resumeSpeaking();
    setIsPaused(false);
  }, []);

  const stop = useCallback(() => {
    stopSpeaking();
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

  return {
    supported,
    isSpeaking,
    isPaused,
    voices,
    selectedVoice,
    rate,
    speak,
    pause,
    resume,
    stop,
    setSelectedVoice,
    setRate,
  };
}
