# Phase 4 verification report

Verification date: July 31, 2026

## Automated result

| Verification | Result |
| --- | ---: |
| Phase 4 focused materializer and reconciliation tests | 13 / 13 passed |
| Full research and AI unit suite | 198 / 198 passed |
| Phase 2 design × setting compiler matrix | 32 / 32 passed |
| Profile source/rationale assertions | 444 / 444 passed |
| TypeScript | passed |
| Targeted Phase 4 ESLint | passed |
| Optimized Next.js production build | passed |
| Git whitespace integrity | passed |

## Phase 4 materialization matrix

The focused suite executes all 32 design × setting pairs:

- 28 combinations create a candidate that passes the current Experimental
  Studio error validator;
- 4 longitudinal combinations return the explicit
  `longitudinal-authoring-only` boundary;
- 0 combinations silently fall back to a generic unknown profile;
- 0 AI or network calls are required.

## Scientific safety assertions

The tests establish that:

- within-subjects responses have stable condition × research-question
  identities and a visible order source;
- quasi-experimental candidates use no random assignment and say that Cerise
  does not randomize the groups;
- hybrid candidates contain one branch per explicitly selected setting plus a
  shared protocol core;
- mixed methods retains separate quantitative and qualitative lanes;
- longitudinal candidates cannot claim runnable follow-up;
- every candidate passes the existing Studio validator without blocking
  errors.

## Reconciliation assertions

The tests establish that:

- generated elements use stable semantic IDs;
- manually added blocks survive upstream source changes;
- a researcher-edited generated block is classified as researcher-owned;
- keeping that block requires a rationale;
- applying a source over researcher-owned content requires a rationale;
- accepted recommendation IDs and decisions are retained in the source link;
- the new baseline, current checksum, profile checksum, and source fingerprint
  remain linked;
- rebuilding produces a separate alternate-draft artifact.

## Browser verification

The Browser/IAB control was unavailable, so the required Playwright CLI
fallback used the installed Microsoft Edge channel against local port 3020.
The pass verified:

1. profile suggestions and exact-candidate creation;
2. creation of the source link beside the new Studio document;
3. synchronized existing-study presentation;
4. a changed research-question source;
5. classification of a manually edited generated block as researcher-owned;
6. disabled apply before a decision and rationale;
7. `Keep current` plus rationale and successful reconciliation;
8. preservation after applying zero updates and retaining one override;
9. alternate-draft creation without changing the active Studio document;
10. 1440 × 1000 desktop and 430 × 932 compact mobile layouts.

There were zero browser product errors. The six warnings were Next development
font-preload warnings and did not identify Phase 4 behavior or layout failures.

The accepted visual reference is the generated Phase 4 reconciliation concept
stored by Codex at:

`/Users/mrperfect/.codex/generated_images/019fb04a-d357-72b1-903f-9e81c4802c0c/exec-8e40da84-aab6-41ac-b62a-d877b7069644.png`

### Fidelity ledger

| Comparison point | Concept | Browser render | Result |
| --- | --- | --- | --- |
| Protected state | protection notice and no silent write | source profile and existing work remain visibly protected | matched |
| Container model | open three-column list with inspector | open proposed/current/decision grid with persistent inspector | matched |
| Semantic identity | every row exposes a stable semantic ID | stable block ID visible in row and inspector | matched |
| Conflict behavior | manual/researcher-owned content requires review | unresolved conflict disables apply until choice and rationale | matched |
| Source evidence | selected row exposes provenance | exact design and measure recommendation IDs shown | matched |
| Action rail | selected count, unresolved count, rebuild, apply | same four-part sticky rail on desktop and mobile | matched |
| Mobile continuation | inspector moves inline and actions remain reachable | inline inspector, 44-pixel decisions, two-row sticky footer | matched |
| Palette and typography | powder blue, white, blush, restrained rules | existing Cerise tokens retained without a second visual system | matched |

The implementation intentionally shows the real number of detected changes
rather than the four illustrative concept rows. No material visual mismatch
remains.

## Integrity interpretation

Checksums and source links establish identity and enable safe comparison. They
do not establish scientific validity, consent adequacy, ethics approval, pilot
approval, operational readiness, or release approval.
