# Kokoro TTS Upgrade Handoff

## Goal

Upgrade Cerise Scholar text-to-speech from the current Microsoft Edge neural voice backend toward Kokoro, while keeping the app free-tier friendly, storage-safe, and reliable for students.

## Current State

- TTS hook: `src/hooks/useTts.ts`
- TTS API route: `src/app/api/tts/route.ts`
- Floating TTS UI: `src/components/tts/TtsWidget.tsx`
- PDF integration: `src/components/pdf/PdfViewer.tsx`
- Current backend uses `msedge-tts`.
- Current app has browser speech fallback through `window.speechSynthesis`.

## Kokoro Audit Summary

Kokoro is a strong future candidate because:

- It is open/free under Apache-2.0.
- It can run locally in the browser through `kokoro-js` and Transformers.js.
- It avoids OpenAI TTS cost and Azure AI Speech cost.
- It can keep spoken text local to the user's device after the model loads.

Main risks:

- First use may download around 90 MB or more into browser cache.
- It may be slow on older devices.
- Bundling model files into the repo or Azure Static Web App could risk storage limits.
- It needs careful fallback behavior if WebGPU/WASM inference fails.

Useful references:

- `https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX`
- `https://huggingface.co/docs/transformers.js/index`
- `https://www.npmjs.com/package/kokoro-js`

## Recommended Architecture

Use browser-local Kokoro, not server-side Azure Kokoro.

Implementation shape:

1. Keep existing Microsoft/browser TTS as fallback.
2. Add Kokoro as a new engine option, likely named `Local AI Voice`.
3. Lazy-load `kokoro-js` only when the user uses Kokoro.
4. Do not commit Kokoro model files into the repo.
5. Load the quantized ONNX model from Hugging Face/CDN on demand.
6. Start with a few curated voices instead of exposing every voice.
7. Cache the loaded model in memory during the session.
8. Show a gentle first-load message: `Preparing local voice for the first time...`

## Suggested Voice Labels

Map technical Kokoro voice IDs to Cerise Scholar-friendly labels.

Initial candidates:

- `af_heart`: Gentle Scholar
- `af_bella`: Warm Lecturer
- `af_nicole`: Focus Reader
- `am_liam` or another stronger male voice after testing: Clear Scholar
- Optional later: British or multilingual voices if they fit the product.

Do not expose low-quality voices by default.

## UX Requirements

The TTS experience should feel calm and academic, not technical.

Keep:

- Pause
- Resume
- Stop
- Speed control
- Read selected text
- Read current page
- Read highlight

Add:

- Voice profile selector
- Short preview button
- First-load status text
- Fallback notice only if Kokoro fails

Avoid:

- Showing model names like `q8f16` to normal users
- Making users choose device/runtime
- Downloading model files during page load

## Safety Protocol For Future Build

Before editing:

1. Confirm current git status.
2. Do not touch unrelated files.
3. Do not download the Kokoro model into the repo.
4. Do not remove existing TTS fallback.
5. Do not deploy until local tests pass.

Build steps:

1. Add a small Kokoro client module, likely `src/lib/tts/kokoro.ts`.
2. Update `useTts.ts` to support an engine setting:
   - `kokoro`
   - `edge`
   - `browser`
3. Update `TtsWidget.tsx` with user-friendly voice profiles and preview.
4. Keep `/api/tts` unchanged as fallback first.
5. Test locally with real PDF text and highlights.
6. Commit only Kokoro/TTS files.
7. Deploy only after approval.

## Local Test Checklist

- Read current page.
- Read selected text.
- Read one highlight.
- Stop while speaking.
- Pause and resume.
- Switch speed.
- Switch voices.
- Try a long paragraph.
- Try a short highlight.
- Confirm no model file appears inside the repo.
- Confirm Azure build size remains safe.
- Confirm fallback still works if Kokoro fails.

## Decision To Revisit Later

Only after the proof of concept works:

- Decide whether Kokoro becomes default.
- Decide whether Microsoft Edge TTS stays as fallback.
- Decide whether to keep browser speech as a third fallback.
- Decide whether to add more voices or languages.

