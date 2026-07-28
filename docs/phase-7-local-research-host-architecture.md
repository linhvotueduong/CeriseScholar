# Phase 7.1 — Local Research Host

Status: implemented locally on 2026-07-27.

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

- Format: `cerise-local-research-host`, version 1.
- Maximum bundle size: 8 MB.
- Runner package version: 4.
- Checkpoint endpoint: exactly `/api/checkpoints`.
- Data policy: local-only participant responses, SQLite storage, no cloud
  upload, and a prepared media directory.
- The release and codebook must agree on release ID, number, checksum, and the
  `browser-measured` timing claim.
- The host recalculates the release checksum and then the whole-bundle checksum.
  Any altered study, codebook, execution label, or runner is refused.

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
- denies camera, microphone, and geolocation;
- never changes firewall, router, certificate, or operating-system settings.

LAN HTTP is therefore restricted to structured Phase 7.1 responses. Features
that require secure browser contexts remain outside this boundary.

## Exports and recovery

The local export package contains:

- formula-safe participant CSV;
- long-format trial CSV;
- structured response JSON;
- a consistent SQLite backup;
- immutable `release.json`;
- `codebook.json`;
- a README recording release and bundle checksums and the local-only data claim.

The Storage view shows actual local database/assets/media size and a planning
estimate based on expected sessions and structured-data size. Audio storage is
not included because audio is not part of Phase 7.1.

## Verification

The native host provides `--self-test`, which checks:

- valid bundle acceptance and tampered runner rejection;
- idempotent checkpoint handling;
- newest-sequence-wins recovery;
- spreadsheet-formula-safe CSV export;
- consistent SQLite backup;
- withdrawal payload scrubbing.

The TypeScript bundle tests independently check creation, size/data-policy
claims, and tampering. A cross-runtime check generates a real bundle in the web
application and verifies it with the Swift host.

## Explicitly not included

- public Cerise-hosted participant links or cloud response storage;
- microphone/audio capture (Phase 7.2);
- webcam/video capture (Phase 7.3);
- eye tracking or medical-device workflows;
- automatic firewall or certificate changes;
- arbitrary researcher scripts;
- certified millisecond timing or PsychoPy/Gorilla parity;
- Apple distribution signing/notarization, Windows signing, installers, or
  automatic updates.

The locally staged app is ad-hoc signed for development testing only. A
distribution release requires a separate security review and signing pipeline.
