# Phase 8.2 — Data Intake and Audit

Status: implemented on 2026-07-28.

## Purpose

Phase 8.2 is the controlled boundary between local participant collection and
later research-data preparation. It answers five questions before Cerise allows
the Stage 06 workflow to advance:

1. Did this dataset come from the selected immutable release?
2. Does its independently checksummed analysis contract match?
3. Are production and pilot sessions physically and logically separated?
4. Does the observed response schema match the frozen codebook?
5. Which structural or missingness findings require a researcher decision?

It does not transform data, recommend exclusions, choose analyses, or calculate
inferential statistics.

## Browser workflow

The full-width workspace is available at `/data-intake/[projectId]`.

The researcher selects one complete Local Research Host export folder. Cerise
locates the five required JSON files by their relative paths and ignores media,
SQLite backups, CSV mirrors, and unrelated files. Each required file is:

- limited to 16 MB;
- decoded as strict UTF-8 JSON;
- independently SHA-256 hashed in the browser;
- checked against a 36 MB combined intake limit; and
- validated with conservative object, array, session, variable, and trial-row
  bounds.

Phase 8.2 supports up to 20,000 sessions per mode and 250,000 trial rows per
mode in this browser implementation. Larger exports require a future
streaming/native intake boundary; the browser must fail closed instead of
silently sampling participant data.

## Identity and cohort verification

The imported `release.json` must:

- normalize as a supported Cerise release;
- pass the release checksum verification;
- match the route's selected project and release ID; and
- match the selected release checksum.

`analysis-contract.json` must reproduce the independent checksum frozen in the
release manifest. `codebook.json` must repeat the same release and contract
identity and must reproduce every frozen variable definition.

`production/responses.json` and `pilot/responses.json` must each repeat the
release ID and checksum. Their export-level and session-level execution modes
must match their folders. A duplicated session ID across modes is blocking.

## Aggregate audit

The receipt records only:

- frozen release and contract identity;
- source filenames, sizes, and file checksums;
- export and local audit timestamps;
- the Phase 8.1 plan snapshot and data-access declaration;
- production and pilot status counts;
- trial-row counts;
- condition allocation for completed production sessions;
- expected, observed, unexpected, and never-observed variable names;
- per-variable completed-production missingness;
- primary-outcome missingness;
- duplicate IDs, unknown conditions, invalid timestamps, and withdrawal payload
  violations; and
- bounded blocking, review, and informational issues.

It deliberately excludes response values, session IDs, trial values, event
logs, audio/video metadata, and media.

## Review gate

Blocking issues include:

- release, contract, or codebook mismatch;
- invalid or unbounded export structure;
- execution-mode mismatch;
- duplicate session IDs;
- an unknown frozen condition;
- withdrawn sessions that still contain response data;
- a missing ready Analysis Plan; and
- zero completed production sessions.

Review issues include:

- incomplete production sessions;
- invalid or reversed timestamps;
- unexpected or never-observed fields;
- required-response missingness; and
- planned primary-outcome missingness.

Review issues are not automatically corrected. The researcher can attest that
the read-only report was reviewed, after which Phase 8.3 can record explicit,
reproducible preparation decisions. Blocking issues cannot be attested away.

## Storage and threat boundary

Participant JSON is untrusted local input. The UI never renders participant
values, HTML, SVG, filenames as markup, or uploaded active content. It does not
evaluate formulas or scripts. File selection is restricted to the five
required JSON roles, with path, count, size, encoding, checksum, and schema
checks before aggregation.

Raw rows are held only inside the parsing call and are not placed in React
state. After aggregation returns, they are eligible for garbage collection.
The browser stores only the bounded receipt under:

`cerise-data-intake-audit:<projectId>:<releaseId>:v1`

The receipt is local researcher state. It can be exported for review, but it is
not immutable, signed, remotely backed up, or a trusted audit log.

## Scientific boundaries

Passing Phase 8.2 means only that the selected export passed Cerise's bounded
identity and structural checks and that the researcher reviewed the aggregate
findings. It does not mean:

- the study is valid or sufficiently powered;
- missingness is ignorable;
- exclusions are justified;
- timing is certified;
- the dataset is anonymous;
- the approved protocol or consent was followed; or
- an analysis result is correct.

Those decisions remain the researcher's responsibility and must be recorded in
later reviewable phases.
