# Cerise Local Research Host

Phase 7.1 provides a native macOS host for frozen Experimental Studio releases.
Phase 7.2 adds bounded, consent-linked audio responses for same-Mac localhost
sessions. Audio files stay in the study workspace and never use Cerise cloud,
Supabase, OpenRouter, or an automatic transcription service.
Phase 7.3 adds bounded, consent-linked video responses with a participant-owned
camera check and start/stop controls. Video is also same-Mac only; optional
microphone audio is off by default and requires separate audio consent.
Phase 7.4 adds a release-bound launch-readiness review. Production collection
stays locked until the local database and study folder pass preflight, available
storage covers the collection plan, a pilot session is completed, and the
researcher confirms the consent, withdrawal, recovery, device, condition, and
data-separation rehearsals.
Phase 8.0 adds an independently checksummed analysis contract to new immutable
releases and exports it as `analysis-contract.json`. The contract contains
planning and provenance metadata only, never participant responses.
It verifies a `.cerisehost` bundle, starts a same-computer or trusted-LAN
participant URL, stores structured checkpoints in local SQLite, and produces
auditable research exports without uploading participant responses to Cerise
Scholar or another cloud service.

## Run locally

```bash
./script/build_and_run.sh
```

The Run action in Codex uses the same script. Use `--verify` to run the integrity
and SQLite recovery self-test, verify the staged app signature, launch it, and
confirm the process is active.

## Research and security boundary

- Import only `.cerisehost` bundles downloaded from a verified immutable release.
- Same-computer mode binds to `127.0.0.1`.
- Trusted-LAN mode exposes only the participant runner, health endpoint, and
  same-origin checkpoint endpoint. There is no remote researcher dashboard.
- Camera and microphone access are enabled only when required by a verified
  media release served on the same Mac through `127.0.0.1`. Trusted-LAN mode
  refuses every audio/video release, and geolocation remains denied.
- General study consent does not authorize media capture. Audio and video use
  separate, preceding consent blocks; video-with-audio requires both.
- Media duration and byte caps are frozen into the release, and chunk requests
  are bounded again by the native host.
- Participant responses, trial records, backups, and exports remain in local
  Application Support or in the researcher-selected export directory.
- The imported bundle fixes each session as `pilot` or `production`; participant
  requests cannot change that verified mode.
- Research exports place analysis-ready production data under `production/` and
  rehearsal data under `pilot/`. The combined SQLite recovery copy is clearly
  isolated under `audit/`.
- Launch-readiness confirmations are stored only in the private study workspace
  and reset when the immutable release checksum changes.
- Withdrawn sessions have their structured payloads, media metadata, and local
  media files deleted before a scrubbed withdrawal record is retained.
- Timing is browser-measured and is not represented as certified millisecond
  precision.
- The host performs no cloud upload, transcription, face/emotion analysis,
  eye tracking, or AI processing of recordings.
- The current bundle is ad-hoc signed for local testing. Distribution signing,
  notarization, Windows packaging, and automatic updates are later boundaries.

The Phase 7.4 checklist is a collection safeguard, not institutional approval,
an ethics determination, or a guarantee that a browser/device combination is
scientifically valid. Researchers remain responsible for the approved protocol
and for documenting the actual rehearsal devices and findings.
