# Cerise Local Research Host

Phase 7.1 provides a native macOS host for frozen Experimental Studio releases.
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
- Camera, microphone, and geolocation are denied in Phase 7.1.
- Participant responses, trial records, backups, and exports remain in local
  Application Support or in the researcher-selected export directory.
- Timing is browser-measured and is not represented as certified millisecond
  precision.
- The current bundle is ad-hoc signed for local testing. Distribution signing,
  notarization, Windows packaging, and automatic updates are later boundaries.
