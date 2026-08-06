# Phase 6 — Validate, Release, and Run the Study

Status: Phase 6.2 implemented locally on 2026-07-26.

Phase 6 is the research-execution boundary for Experimental Studio. It turns an editable study draft into a versioned, reviewable, locally runnable research instrument without making Cerise Scholar a participant-data host.

## Product outcome

The researcher moves through one traceable sequence:

1. Build an editable study draft.
2. Run deterministic rehearsals and explicitly tagged pilots.
3. Run representative-device browser timing diagnostics when the procedure depends on exposure duration or reaction time.
4. Resolve blocking technical checks and review scientific warnings.
5. Ask the researcher-side AI reviewer for advisory feedback when desired.
6. Complete the explicit rehearsal, consent/withdrawal, variable/condition, and pilot-data attestations.
7. Freeze an immutable release with a release number and SHA-256 integrity checksum.
8. Run either the portable single-participant HTML fallback, the developer Local Pilot Collector, or the Phase 7.1 native Local Research Host.
9. Export responses together with the exact release, codebook, validation report, and execution metadata that produced them.

## Non-negotiable boundaries

- Published releases are immutable. A change creates a new editable draft and then a new release.
- Every response record identifies its release ID, release number, and checksum.
- Participant responses never enter Supabase, Azure, OpenRouter, or Cerise Scholar telemetry in Phase 6.
- Participant execution never calls AI. AI is available only to the signed-in researcher while designing or reviewing a study.
- Timing is described as **browser-measured timing** until platform-specific benchmarks justify a narrower claim.
- The portable runner is a fallback. IndexedDB checkpoints are best-effort recovery, not a durability guarantee.
- The Local Pilot Collector is the preferred in-person collection mode. It stores responses in a local SQLite database and exposes no public internet endpoint.
- LAN mode does not support camera, microphone, or other secure-context-only study blocks.
- No firewall, certificate, DNS, or operating-system security setting is changed automatically.

## Architecture

### Draft layer

`experiment_studios` remains the mutable, owner-scoped Supabase document. It stores only the study specification. A versioned browser copy remains available for fail-open editing.

### Release layer

`experiment_releases` stores owner-scoped immutable snapshots. The application may select and insert releases, but it receives no update or delete privilege. The frozen payload includes:

- release identity and notes;
- the normalized study specification;
- variable and condition counts;
- validation summary;
- execution/storage claims;
- SHA-256 checksum;
- researcher review attestations and their timestamp.

### Participant layer

The portable runner embeds one frozen release and uses no network path. The developer Local Pilot Collector and the Phase 7.1 native Local Research Host serve the same frozen release over localhost or the researcher's LAN and write idempotent checkpoints to SQLite after each screen.

### AI review layer

The existing OpenRouter BYOK route remains the only Experimental Studio AI boundary. Phase 6 review prompts may challenge construct alignment, confounds, missing checks, participant burden, stimulus requirements, and analysis readiness. Suggestions remain review-before-apply and cannot alter a frozen release.

## Validation levels

- **Blocking:** invalid variables, broken or cyclic flow, missing content, invalid timings, oversized specification, duplicate IDs, or a release-integrity failure.
- **Warning:** missing consent/debrief, unreachable screens, extreme allocation imbalance, incomplete accessibility text, or an execution choice that needs a documented decision.
- **Advisory:** good-practice improvements such as attention checks, participant-burden review, device rehearsal, or stronger analysis documentation.

Blocking issues prevent release creation. Warnings do not silently pass: they remain in the frozen validation report and should be addressed or justified in release notes.

## Behavioral engine scope

Phase 6 supports bounded browser studies composed from consent, instructions, survey questions, fixation intervals, keyboard-response trials, attention checks, and debrief screens. Researchers can define conditions, weighted allocation, branching, response deadlines, correct answers, practice trials, reproducible choice randomization, fullscreen requests, focus/tab-switch logging, and embedded image stimuli.

### Phase 6.1 — bounded trial matrices

Phase 6.1 adds a reviewable trial-table boundary without turning Experimental Studio into a general-purpose scripting environment:

- Import bounded CSV source tables of up to 5,000 rows, 40 columns, and 320 KB each.
- Preserve the source filename, import timestamp, normalized rows, and SHA-256 source checksum in the study specification and immutable release.
- Map required trial ID and stimulus columns plus optional correct-answer, allowed-key, response-deadline, condition, and practice columns.
- Run fixed order, seeded shuffle, or seeded rotation for one to twenty repetitions.
- Keep the worst-case materialized procedure at or below 10,000 trials across all loops and repetitions.
- Derive the order deterministically from the frozen assignment seed, participant/session ID, loop block, and repetition.
- Rehearse the same materialized trial flow inside Experimental Studio before release.
- Record the exact trial order, source-row index, response, correctness, browser-measured reaction time, deadline result, and completion reason.
- Export participant-level CSV/JSON and a separate long-format trial CSV. Local Collector joins trial rows back to the frozen source columns without uploading participant data.

Trial tables are configuration data and remain inside the release. Participant records contain stable table/trial/source-row references instead of copying the complete source row into every checkpoint. This keeps local checkpoints bounded and preserves an auditable join to the frozen release.

This release does **not** claim PsychoPy or Gorilla feature parity. Audio-response capture, microphone/camera/eye-tracking integrations, adaptive psychophysics algorithms, arbitrary user scripts, and certified millisecond timing remain future behavioral-engine extensions. Studies that depend on those capabilities should continue to use a validated specialist platform until Cerise implements and benchmarks them.

### Phase 6.2 — browser timing diagnostics

Phase 6.2 adds a bounded researcher-side engineering diagnostic before release:

- Measure the smallest positive `performance.now()` increment observed during the check.
- Sample animation-frame intervals and report median, p95, and the proportion crossing a documented engineering jank threshold.
- Sample short browser timers and report median and p95 scheduling drift.
- Mark a run as interrupted if the tab loses focus or becomes hidden.
- Record browser/device context in a detailed local report for interpretation.
- Keep at most twelve detailed reports per project in versioned browser storage.
- Export a detailed JSON report or formula-safe summary CSV.
- Save only the selected aggregate diagnostic ID, engine version, timestamp, status, and metrics with the Studio draft and frozen release.
- Include the diagnostic provenance in runner results, Local Collector codebook, release manifest, and README.

The statuses are deliberately limited to **no instability detected**, **review recommended**, and **run interrupted**. The engineering thresholds are triage signals, not scientific validity cutoffs. A stable short run does not measure physical display onset, keyboard hardware latency, audio latency, or guarantee that a participant's device will behave the same way.

Researchers should repeat the diagnostic on every planned browser, operating system, and device class, under representative workload and with actual study assets. Studies making physical-onset or certified timing claims still require external hardware validation and a documented supported-device benchmark matrix.

## Local Collector security model

- Binds to `127.0.0.1` by default; LAN exposure is an explicit command-line choice.
- Chooses an available port rather than assuming a fixed port.
- Uses a random researcher admin token that is printed locally and never embedded in the participant page.
- Uses random session IDs and monotonically sequenced idempotency keys so delayed writes cannot replace newer checkpoints.
- Limits each checkpoint request to 4 MB and validates release/session identity before each SQLite write.
- Rejects cross-origin checkpoint posts and sends restrictive framing, referrer, and device-permission headers.
- Purges prior checkpoint payloads when a participant withdraws, retaining only the empty withdrawal record.
- Stores no authentication secrets, API keys, or participant data in the Cerise web application.
- Exports formula-safe participant and trial CSV plus JSON, codebook, release manifest, and README.

## Phase 7 handoff

Phase 7.1 now provides a native double-click macOS Local Research Host, a
checksummed `.cerisehost` bundle contract, local SQLite recovery, start/pause/stop controls,
trusted-LAN participant launching, storage planning, and packaged research
exports. See `phase-7-local-research-host-architecture.md`.

Still postponed:

- distribution signing and notarization;
- Windows packaging;
- installer pipelines and auto-update/rollback;
- Audio capture (Phase 7.2) and bounded same-Mac webcam/video capture
  (Phase 7.3) are implemented in the separate native Local Research Host.
  See `phase-7-local-research-host-architecture.md` for their consent, storage,
  export, withdrawal, and non-cloud boundaries.
- certified timing claims and a supported-device benchmark matrix.

Public Cerise-hosted participant links and cloud response storage remain a separate future decision. They are not part of Phase 6 or Phase 7 by default.
