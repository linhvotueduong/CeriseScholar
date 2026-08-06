# Phase 6 verification report

Verification date: July 31, 2026

## Automated result

| Verification | Result |
| --- | ---: |
| Phase 5 + Phase 6 focused consent suite | 38 / 38 passed |
| Phase 6 domain and fixture-inspection tests | 19 / 19 passed |
| Full research and AI unit suite | 227 / 227 passed |
| Phase 2 design × setting compiler matrix | 32 / 32 passed |
| Profile source/rationale assertions | 444 / 444 passed |
| Phase 4 materializer/reconciliation regression | 13 / 13 passed |
| TypeScript | passed |
| Targeted Phase 6 ESLint | passed |
| Production Next.js build | passed |
| Git whitespace integrity | passed |
| Browser interaction QA | passed |
| Desktop and mobile visual QA | passed |
| Product browser-console errors | 0 |

The production build retained the repository's existing Next.js middleware-
convention deprecation warning and Node legacy-build guidance. Neither warning
identified a Phase 6 compile, runtime, or route failure.

The repository-wide legacy/storage policy scripts still report existing
retired-architecture phrases in unrelated handoff, architecture, and checker
files. Phase 6 adds none of the reported phrases and does not alter those
user-owned documents.

## Focused verification coverage

The focused `verify:consent-phase6` target covers the authority registry,
compiler foundations, Phase 5 regression suite, and the new Phase 6 behavioral,
remote, and lifecycle suite.

The Phase 6 domain suite establishes that:

- randomized or experimental design facts can suggest behavioral review but
  never enable incomplete disclosure or deception;
- requested or proposed disclosure alterations remain blocking until a human
  approval and reference are recorded;
- a no-debrief path requires its own human determination and rationale;
- focus-group artifacts contain a realistic group-confidentiality limitation
  and apparent guarantees are rejected;
- telephone eligibility screening and main-study consent compile as distinct
  artifacts with distinct screening-data retention/deletion fields;
- declining optional recording or an optional sub-study can preserve the main
  study decision;
- waiver of consent and waiver of signed documentation remain independent
  approval gates;
- changed-information triggers require a human disposition and can compile an
  addendum and renewed-consent artifact;
- compiled artifacts require explicit human review and preserve review only
  while participant content and artifact provenance remain unchanged;
- bounded legacy Phase 5 documents migrate to schema version 2 without losing
  their existing consent materials.
- interactive updates preserve researcher spacing while keeping every field
  bounded by the schema.
- complete adult behavioral, deception/debrief, focus-group, telephone,
  recording, and changed-information/reconsent fixtures each reach zero Phase 6
  blockers after their required human reviews;
- recording-module content compiles into the existing audio/video participant
  form and preserves the independent refusal path;
- lifecycle addendum/reconsent artifacts are withheld until a human disposition
  selects that path and carry the triggering authority reference;
- a changed authority reference invalidates the artifact's prior human review.

## Browser verification

The in-app browser controller was unavailable, so the Playwright skill's CLI
fallback used the installed Microsoft Edge channel against the existing local
development server on port 3020. A temporary public QA route seeded a
representative randomized laboratory study; it was removed after verification.

The real interaction pass verified:

1. the six-step navigation orders Protocol modules between Study facts and
   Form;
2. randomized design facts show Behavioral task and randomization as
   **Suggested** while Incomplete disclosure remains **Available** and starts
   in full-disclosure mode;
3. applying the disclosure module exposes source/reference controls before
   disclosure details;
4. selecting proposed deception and requested waiver/alteration produces the
   exact blocking human-approval repair message;
5. the human-governance boundary remains visible in the selected-module
   inspector;
6. unresolved module issues increase the shared blocking count and leave the
   shared Export review package action disabled;
7. primary guidance links are reachable from the module inspector;
8. Participant preview remains reachable on a 430 × 932 mobile viewport;
9. the mobile page width equals the viewport width, while the six-step workflow
   uses its intentional internal horizontal scroller;
10. the browser recorded zero product console errors. The six warnings were
    development-only unused-font-preload notices from the surrounding app.

The automated domain suite, rather than fabricated browser approval data,
verifies the complete telephone, focus-group, debrief-artifact, optional-choice,
and changed-information/reconsent paths.

## Adult fixture inspection — July 31, 2026

The six requested adult fixtures were inspected as complete, independent
contracts rather than as isolated field tests:

| Fixture | Compiled participant result | Safety/gate result |
| --- | --- | --- |
| Behavioral/randomization | Behavioral disclosure artifact | Assignment, task-risk, and stopping content required; human review required |
| Deception/debrief | Debrief artifact | Experiment selection never enables deception; approval evidence and debrief decision remain human gates |
| Focus group | Focus-group privacy artifact | Realistic participant-to-participant confidentiality limitation is mandatory; false guarantees block |
| Telephone | Separate screening and main-study scripts | Agreement precedes substantive questions; screening and enrollment decisions remain separate |
| Recording | Existing audio/video participant decision form | Research use/access/retention compile into the form; decline can preserve the main study |
| Changed information/reconsent | Addendum plus renewed-consent artifacts | No artifact before a human disposition; triggering authority reference is preserved |

The real browser pass opened all six inspectors, confirmed their authority
boundaries and expected controls, exercised recording authoring through the
participant form, confirmed the wider package export remained disabled while
unresolved, and recorded zero product console errors at desktop and 430-pixel
mobile widths. The only console warnings were existing development-only unused
font-preload messages.

## Researcher acceptance checklist

1. Open Stage 03 **Design Consent and Participant Rights**.
2. Confirm the six ordered views include **Protocol modules** between study
   facts and forms.
3. Confirm a randomized design labels the behavioral module **Suggested** but
   leaves incomplete disclosure unconfigured and in full-disclosure mode.
4. Apply incomplete disclosure, leave approval requested, and confirm export
   remains disabled with an exact human-approval repair target.
5. Record the human approval and configure debriefing; confirm a debrief
   artifact appears in participant preview and remains review-gated.
6. Apply focus-group confidentiality and confirm the realistic group limit is
   compiled even if researcher safeguards are stronger.
7. Apply telephone screening and main-study consent together and confirm two
   separately named preview artifacts appear.
8. Apply a lifecycle trigger with full renewed consent and confirm both changed
   information and renewed-consent artifacts appear.
9. Add an optional sub-study and confirm its preview decision is
   `separate optional choice`.
10. Save a draft and export only after all Phase 5 and Phase 6 blocking issues
    and human-review states are resolved.

## Visual evidence

Generated implementation concept:

`/Users/mrperfect/.codex/generated_images/019fb04a-d357-72b1-903f-9e81c4802c0c/exec-619d1fc1-4710-450e-9f89-c14da66ac5a8.png`

Browser captures:

- `output/playwright/phase6/cerise-phase6-desktop.png`
- `output/playwright/phase6/cerise-phase6-disclosure-blocked.png`
- `output/playwright/phase6/cerise-phase6-mobile.png`

### Fidelity ledger

| Comparison point | Generated concept | Browser render | Result |
| --- | --- | --- | --- |
| Six-step information architecture | Dedicated Protocol modules step | Exact ordered six-step navigation | matched |
| Module catalog | Two-column cards with status and inspector | Seven source-aware cards and selected inspector | matched and expanded |
| Human control | Experiment design cannot authorize deception | Exact non-authorization callout plus source/reference fields | matched |
| Blocking approval state | Requested alteration with blank approval | Shared issue rail and disabled export | matched |
| Flow variants | Behavioral, focus group, disclosure, recording, telephone, lifecycle, optional | All seven implemented | matched |
| Mobile continuation | Stacked cards and inspector | 430 px layout with no document-level overflow | matched |
| Visual language | Powder blue, warm paper, ink, restrained cerise | Existing Cerise system retained | matched |

## Integrity interpretation

The verification proves deterministic software behavior and artifact identity.
It does not prove that a given human determination, script, consent process,
waiver, alteration, debrief, addendum, or renewed-consent decision is legally,
ethically, institutionally, or protocol appropriate.
