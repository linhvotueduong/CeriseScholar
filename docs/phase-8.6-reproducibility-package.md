# Phase 8.6 — Reproducibility Package

Status: implemented on 2026-07-29.

## Purpose

Phase 8.6 assembles the reviewed Phase 8.0–8.5 analysis record into a
deterministic, locally downloaded USTAR archive. It preserves bounded
provenance, aggregate outputs, interpretation, and machine-verifiable
checksums while leaving restricted research evidence in researcher-controlled
storage.

The full-width workspace is available at:

`/reproducibility-package/[projectId]`

It is linked from the final Stage 08 “Review, Share, and Preserve” step. This
connects the analysis record to preservation work; it does not submit, publish,
upload, or choose a repository.

## Required input and source verification

The researcher must re-select the exact exported Phase 8.5 Results Record.
Before archive editing or construction is enabled, Cerise verifies:

- the immutable release checksum and frozen analysis-contract checksum;
- the ready Phase 8.1 Analysis Plan identity and timestamp;
- the reviewed Phase 8.2 aggregate intake-audit identity;
- the Phase 8.3 operation fingerprint and preparation-package checksum;
- the reviewed and exported Phase 8.4 specification, result, and package
  checksums;
- the reviewed and exported Phase 8.5 interpretation;
- the complete Results Record shape, aggregate output, table and figure
  approvals, interpretation checksum, and whole-package checksum; and
- the explicit `participantRowsIncluded: false` Results Record boundary.

The selected Results Record remains in the current tab and must be selected
again after a reload before Cerise can rebuild or export the archive. Browser
storage retains only bounded context, external-reference decisions,
provenance, checksums, and review/build/export receipts.

## Deterministic archive

The archive has 14 fixed files:

1. `manifest.json`
2. `README.md`
3. `metadata/frozen-release.json`
4. `metadata/data-dictionary.json`
5. `planning/analysis-contract.json`
6. `planning/analysis-plan.json`
7. `audit/data-intake-audit.json`
8. `preparation/operation-log.json`
9. `analysis/phase-8.4-index.json`
10. `results/phase-8.5-results-record.json`
11. `provenance/divergence-and-amendment-register.json`
12. `environment/versions.json`
13. `references/restricted-materials.json`
14. `verification/verification-report.json`

Files are serialized deterministically, paths are fixed and traversal-safe,
and TAR headers use stable ownership, permissions, ordering, and timestamps.
Each non-manifest file receives a raw-byte SHA-256 checksum. The manifest
records the file list, sizes, content roles, source-chain checksums, privacy
declarations, file-set checksum, and its own unsigned-content checksum.

Before an export can be recorded, Cerise:

1. builds the complete TAR;
2. parses the TAR again using the independent import path;
3. validates header checksums, entry types, paths, sizes, file count, and end
   markers;
4. verifies every file against the manifest;
5. verifies the manifest and file-set checksums;
6. verifies the embedded Results Record self-checksum and privacy declaration;
   and
7. binds the result to the selected project, release, and Results Record.

Rebuilding the same reviewed record produces identical bytes and the same
archive checksum. Archives are capped at 24 MB, individual entries at 16 MB,
and the parser at 24 files even though the current file set is exactly 14.

The workspace can also verify a previously exported Cerise TAR without
changing the current workflow receipt.

## Frozen-release boundary

`metadata/frozen-release.json` contains release identity, notes, checksum, and
bounded manifest metadata. The complete frozen Experimental Studio
specification and embedded study media are deliberately excluded. The original
release checksum is verified against the local frozen release before packaging,
but the metadata-only archive file cannot reconstruct that whole release
checksum independently.

The full analysis contract is included separately because it is planning
metadata and contains no participant responses.

## Restricted-material references

The archive never embeds:

- participant response or trial rows;
- derived participant rows;
- raw audio or video;
- the combined Local Research Host SQLite database;
- credentials, API keys, or AI prompts.

For participant data, media, and the combined database, the researcher must
choose either a bounded external reference with access conditions or an
explicit omission. Raw media may be marked not collected only when the frozen
release reports no media. These references are descriptive metadata. Cerise
does not open, copy, test, authenticate, or upload the referenced location.

## Divergence and amendment boundary

The package consolidates Phase 8.4 configuration departures and the Phase 8.5
divergence register. It is explicitly labelled a researcher-authored
divergence register, not a signed or trusted amendment ledger. Phase 8.6 does
not establish whether a decision was prospective or when it was first made.

## Environment and version metadata

The package records Cerise application, engine, archive, and Phase 8 schema
versions. It captures the current browser, platform, time zone, viewport,
device-pixel ratio, hardware-concurrency report, and secure-context flag as
the **archive-build environment**.

Phase 8.4 did not automatically capture a complete analysis-execution
environment. The researcher must add bounded execution-environment notes or
state that the environment was not recorded. The archive never presents the
current browser as proof of the earlier analysis environment.

## Verification and scientific boundaries

Passing Phase 8.6 means that Cerise matched the local Phase 8 source chain,
built the fixed archive, parsed it again, and verified its checksums. SHA-256
checksums can detect later byte changes; they are not:

- a digital signature or proof of authorship;
- a trusted timestamp or preregistration record;
- proof that an external reference is available or correct;
- proof that another environment can reproduce the statistical result;
- scientific-validity, causal-inference, ethics, or data-quality
  certification;
- repository preservation, venue compliance, publication readiness, or a
  submission package.

No Supabase migration, cloud archive path, automatic upload, participant-data
network path, or new cost-bearing service is introduced. Phase 8.6 uses no AI.
