# Phase 7 — Local Research Host

Status:

- Phase 7.1 structured local collection implemented on 2026-07-27.
- Phase 7.2 bounded local audio responses implemented on 2026-07-28.
- Phase 7.3 bounded local video responses implemented on 2026-07-28.
- Phase 7.4 pilot validation, production launch gating, and analysis-safe
  pilot/production separation implemented on 2026-07-28.

Phase 7.1 turns a verified immutable Experimental Studio release into a
researcher-operated local collection service. Participant response data stays on
the researcher's Mac; Cerise Scholar, Supabase, Azure, OpenRouter, and OpenAI are
not response-storage dependencies.

## Product flow

1. The researcher completes the Phase 6 release review and freezes a release.
2. Release Center creates a `.cerisehost` file containing the immutable release,
   local participant runner, codebook, execution label, and a whole-bundle
   SHA-256 checksum. Participant responses are never included.
3. Cerise Local Research Host verifies both the release checksum and the
   whole-bundle checksum before importing anything.
4. The researcher chooses **This Mac only** or **Trusted local network** and
   explicitly starts collection.
5. Participants open the displayed URL or QR code. Structured checkpoints write
   to local SQLite after each meaningful transition.
6. The researcher can pause, resume, stop, recover, inspect session status,
   create a consistent backup, or export the research package.

## Implementation choice

The current macOS host is a small native SwiftUI and Network.framework
application built with SwiftPM. The machine did not have a Rust toolchain, and
installing one only to wrap a local server would add avoidable development and
disk overhead. Native Swift also provides macOS network permissions, lifecycle
handling, SQLite access, and a real application bundle without Electron.

This choice does not decide the Windows implementation. A later cross-platform
boundary may share the `.cerisehost` contract and participant runner while using
Tauri, a native Windows shell, or another reviewed host.

## Bundle contract

- Current format: `cerise-local-research-host`, version 5.
- Versions 1–4 remain importable.
- Maximum bundle size: 8 MB.
- Current runner package version: 6. Versions 4 and 5 are retained only for
  compatible version 1 and 2 bundles.
- Checkpoint endpoint: exactly `/api/checkpoints`.
- Audio endpoint for bundles containing audio: exactly `/api/audio`.
- Video endpoint for version 3 and newer bundles containing video: exactly
  `/api/video`.
- Data policy: local-only participant responses, SQLite storage, no cloud
  upload, a prepared media directory, and `localhost-only` audio/video
  boundaries. Versions 4 and 5 freeze separate-mode exports and the native
  preflight-and-rehearsal production gate. Version 5 also binds the Phase 8
  analysis-contract checksum and readiness summary into the codebook.
- The release and codebook must agree on release ID, number, checksum, and the
  `browser-measured` timing claim.
- The host recalculates the release checksum and then the whole-bundle checksum.
  Any altered study, codebook, execution label, or runner is refused.
- If an imported release ID already has a local workspace, its immutable
  checksum must match before Cerise reuses that response database.

## Local data layout

The app stores each imported release under:

`~/Library/Application Support/Cerise Local Research Host/Studies/<release-id>/`

Each study has the original bundle, frozen release, codebook, SQLite database,
assets directory, prepared media directory, exports directory, and backups
directory. The app recovers the last verified study after a crash but leaves
collection stopped until the researcher explicitly restarts it.

SQLite uses write-ahead logging, full synchronous writes, bounded requests,
monotonic checkpoint sequences, and idempotency keys. A delayed checkpoint
cannot replace a newer session state. Withdrawal deletes earlier checkpoint
payloads and retains only a scrubbed withdrawal record.

## Network boundary

**This Mac only** binds to `127.0.0.1`.

**Trusted local network** selects an available port and exposes the participant
runner to nearby devices. It is intended for supervised laboratories,
classrooms, and in-person pilots—not public internet recruitment. The
participant server:

- has no remote researcher dashboard;
- accepts only the runner route and same-origin JSON checkpoint posts;
- limits headers, request bodies, active connections, and connection lifetime;
- returns no-store, anti-framing, no-referrer, and no-sniff headers;
- denies geolocation and grants camera/microphone only when a verified
  same-Mac media release requires them;
- never changes firewall, router, certificate, or operating-system settings.

LAN HTTP is therefore restricted to structured Phase 7.1 responses. Any release
containing audio or video can only run in **This Mac only** mode, and the host
refuses to expose it through Trusted LAN.

## Phase 7.2 audio-response boundary

Phase 7.2 adds two explicit Studio blocks:

- **Audio recording consent**, which records a separate agree/decline decision
  for microphone recording and local voice-file storage.
- **Audio response**, which records a bounded participant response only after a
  preceding audio-consent block has been accepted.

Audio capture is deliberately narrower than structured response collection:

- it runs only in the native Local Research Host at a `127.0.0.1` participant
  URL on the same Mac;
- the participant must first run a microphone permission check and then
  explicitly start recording;
- the runner shows a persistent recording indicator, elapsed time, byte count,
  and a stop control;
- recordings are split into small chunks, with a maximum per-chunk size, total
  response size, and duration frozen into the release;
- chunks are sent only to same-origin `/api/audio` and written beneath the
  release's private `media` directory;
- finalization assembles the ordered chunks into one local recording while
  retaining per-chunk checksums for audit and recovery;
- file names and paths are derived from validated session, block, upload, and
  chunk identifiers rather than participant-entered text;
- SQLite records the relative path, MIME type, byte count, and SHA-256 checksum
  for every accepted chunk;
- a withdrawal removes the session's earlier structured payloads, audio
  metadata, and audio files before retaining the scrubbed withdrawal record;
- exports use anonymous session/block/upload identifiers and include an audio
  manifest plus the local media files.

Audio never goes to Cerise Scholar, Supabase, Azure, OpenRouter, OpenAI, or an
automatic transcription service. The host does not install certificates,
change firewall settings, expose a public endpoint, or request microphone
permission itself; the participant browser owns the permission prompt.

Researchers must treat raw voice as potentially identifying and sensitive
research data. The release review warns that browser codecs vary, microphone
quality must be piloted on representative hardware, and Phase 7.2 does not
claim calibrated acoustic measurement or certified audio latency.

## Phase 7.3 video-response boundary

Phase 7.3 adds two additional Studio blocks:

- **Video recording consent**, which records a separate agree/decline decision
  for camera recording and local video-file storage.
- **Video response**, which records one bounded participant-controlled camera
  response after the linked video-consent decision has been accepted.

Microphone audio is disabled by default for a video response. When a researcher
explicitly enables it, the release must also link a separate, preceding
**Audio recording consent** block. General study consent is not treated as
camera or microphone consent.

Video capture follows a deliberately narrow contract:

- it runs only from the verified native Local Research Host through
  `127.0.0.1`; video releases cannot start in Trusted LAN mode;
- the participant performs a camera check before recording, sees a live muted
  preview, and explicitly starts and stops the recording;
- the camera preview is not stored and camera tracks are stopped on navigation,
  completion, withdrawal, error, or page exit;
- duration and total-byte limits are frozen into the immutable release, while
  each upload request is also subject to a smaller fixed chunk limit;
- ordered chunks are sent only to same-origin `/api/video`, checksummed, stored
  in the release's private media directory, and assembled locally;
- optional microphone audio uses the same video container and is accepted only
  when both the frozen video configuration and separate audio consent allow it;
- withdrawal deletes the session's structured payloads, media metadata, and
  local audio/video files before retaining a scrubbed withdrawal record;
- exports contain anonymous IDs, video and audio manifests, checksums, and the
  local media files—never participant names supplied by a response field.

The video path has no cloud upload, streaming, AI access, transcription, face
recognition, emotion inference, biometric template, or eye-tracking behavior.
Cerise does not claim clinical-grade capture, calibrated audiovisual latency,
or certified frame timing. Researchers must pilot the supported browser,
camera, codec, lighting, storage estimate, consent language, and withdrawal
process on representative hardware before production collection.

## Exports and recovery

The local export package contains:

- a `production/` folder containing only production formula-safe CSV,
  long-format trial CSV, structured JSON, media manifests, and media;
- a separate `pilot/` folder containing the same artifacts for pilot sessions;
- an `audit/all-responses.sqlite` consistent backup containing both modes for
  recovery and audit, clearly separated from the analysis-ready folder;
- immutable `release.json`;
- `codebook.json`;
- `analysis-contract.json` for version 5 bundles;
- a README recording release and bundle checksums and the local-only data claim.

The Storage view shows actual local database/assets/media size and a planning
estimate based on expected sessions, structured-data size, and the frozen
audio/video limits contained in the release.

## Phase 7.4 launch-readiness boundary

The imported study workspace now contains a bounded `launch-readiness.json`
record tied to the immutable release checksum. It is local researcher state,
not participant data, and is reset automatically when the release checksum
changes.

Pilot bundles remain easy to run. A production bundle cannot start until:

- the release and Local Host bundle were verified at import;
- the private workspace passes a real write probe;
- SQLite passes `quick_check`;
- planned collection capacity plus a 100 MB operational reserve is available;
- at least one completed pilot session exists for the same release;
- the researcher confirms representative-device/browser rehearsal;
- consent and refusal paths were rehearsed;
- withdrawal deletion was verified;
- interruption and checkpoint recovery were rehearsed;
- condition allocation, variables, and missing-data behavior were reviewed;
- the researcher confirms pilot data will be excluded from production analysis.

The expected workflow is to export and run the release in pilot mode first,
finish the rehearsals, and then import the production-mode bundle for that same
immutable release. Both modes resolve to the same private release workspace so
the completed pilot and checksum-bound readiness record can unlock production,
while their response rows and media remain mode-separated.

The participant checkpoint endpoint now enforces the pilot/production mode
frozen into the verified bundle. A modified request cannot relabel a pilot
session as production or vice versa. The Sessions view can filter by mode, and
research exports physically separate both modes, including local media.

These checks are operational safeguards, not an ethics approval, scientific
validity certification, device certification, or guarantee that every target
browser will behave identically. The researcher still owns the approved
protocol, representative-device test plan, monitoring, and institutional
research-data requirements.

## Verification

The native host provides `--self-test`, which checks:

- valid bundle acceptance and tampered runner rejection;
- version 1 structured, version 2 audio, version 3 video, version 4 launch
  policy, and version 5 analysis-contract verification;
- idempotent checkpoint handling;
- bounded, same-origin audio-chunk ingestion;
- bounded, same-origin video-chunk ingestion and finalization;
- newest-sequence-wins recovery;
- spreadsheet-formula-safe CSV export;
- consistent SQLite backup;
- withdrawal payload and all session-media deletion;
- release-bound launch-readiness persistence;
- rejection of a reused release ID with a different immutable checksum;
- server-side rejection of pilot/production mode relabeling;
- mode-filtered CSV export and SQLite health checks;
- package-level separation of production, pilot, and combined audit data.

The TypeScript bundle tests independently check creation, size/data-policy
claims, and tampering. A cross-runtime check generates a real bundle in the web
application and verifies it with the Swift host.

## Explicitly not included

- public Cerise-hosted participant links or cloud response storage;
- LAN or public-internet audio/video capture;
- automatic transcription, speech/face/emotion analysis, biometric templates,
  or AI access to recordings;
- calibrated audiovisual measurement or certified audio/video latency;
- eye tracking or medical-device workflows;
- automatic firewall or certificate changes;
- arbitrary researcher scripts;
- certified millisecond timing or PsychoPy/Gorilla parity;
- Apple distribution signing/notarization, Windows signing, installers, or
  automatic updates.

The locally staged app is ad-hoc signed for development testing only. A
distribution release requires a separate security review and signing pipeline.
