/**
 * Text-to-Speech utility using the browser's built-in Web Speech API.
 * Free, private (text never leaves the device), works offline with local voices.
 */

export function isTtsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function getVoices(): SpeechSynthesisVoice[] {
  if (!isTtsSupported()) return [];
  return window.speechSynthesis.getVoices();
}

export function speakText(
  text: string,
  options?: {
    rate?: number;
    pitch?: number;
    voice?: SpeechSynthesisVoice;
    onEnd?: () => void;
    onError?: () => void;
  }
): SpeechSynthesisUtterance | null {
  if (!isTtsSupported()) return null;

  // Stop any current speech first
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options?.rate ?? 1.0;
  utterance.pitch = options?.pitch ?? 1.0;

  if (options?.voice) {
    utterance.voice = options.voice;
  }

  if (options?.onEnd) {
    utterance.onend = options.onEnd;
  }

  if (options?.onError) {
    utterance.onerror = options.onError;
  }

  window.speechSynthesis.speak(utterance);
  return utterance;
}

export function stopSpeaking() {
  if (isTtsSupported()) {
    window.speechSynthesis.cancel();
  }
}

export function pauseSpeaking() {
  if (isTtsSupported()) {
    window.speechSynthesis.pause();
  }
}

export function resumeSpeaking() {
  if (isTtsSupported()) {
    window.speechSynthesis.resume();
  }
}
