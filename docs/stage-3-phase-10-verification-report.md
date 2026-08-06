# Stage 3 Phase 10 — Verification Report

Verification date: August 1, 2026

Result: Phase 10 passes its automated domain, runner, collector, native-host,
and desktop/mobile browser checks.

## Automated evidence

Command:

```bash
npm run verify:consent-phase10
```

Result: **114 tests passed; 0 failed**.

Coverage includes:

- supported adult English acknowledgement compilation;
- fail-closed signed, protected-audience, FDA, broad-consent, and external
  authorization paths;
- artifact/form SHA-256 verification and stale/tampered refusal;
- consent-independent source fingerprint stability after semantic binding;
- exact first-block placement and legacy consent replacement;
- accepted, optional-decline, refused, withdrawn, and amended receipts;
- state-machine transition rejection;
- no pre-consent assignment, study logging, checkpoint, or media capture;
- exact participant copy identity;
- refresh/recovery binding;
- collector refusal/withdrawal payload scrubbing while retaining the receipt;
- runner syntax, CSP, same-origin storage, audio/video gates, and export safety;
- all Phase 5–9 authority, compiler, consent-family, and AI-copilot regressions.

Commands:

```bash
npx eslint src/lib/research/consentRuntime.ts \
  src/lib/research/consentRuntime.test.ts \
  src/lib/research/consentPhase5.ts \
  src/lib/research/experimentStudio.ts \
  src/lib/research/experimentRunnerPackage.ts \
  src/lib/research/experimentCollectorPackage.ts \
  src/lib/research/experimentCollectorPackage.test.ts \
  src/lib/research/experimentHostBundle.ts \
  src/components/research-path/ConsentRuntimePanel.tsx \
  src/components/research-path/ConsentWorkspace.tsx \
  src/components/experimental-studio/ExperimentPackagePanel.tsx

npx tsc --noEmit --pretty false
```

Result: **clean; 0 errors and 0 warnings** for the targeted lint surface, and a
clean project TypeScript check after regenerating Next route types.

Native-host commands:

```bash
swift run CeriseLocalResearchHost --self-test
```

Result: **`LOCAL_HOST_SELF_TEST_OK`**. The native database independently accepts
`refused` and `withdrawn`, scrubs all participant study payload fields, removes
prior checkpoints and local media, and counts both states separately.

## Browser and visual evidence

The real generated runner was rehearsed in Microsoft Edge at desktop and 390 px
mobile widths. The test exercised binding, exact-form review, separate choices,
confirmation, correction with preserved choices, acceptance with optional audio
declined, persistent withdrawal, confirmed withdrawal, and main-study refusal.
There were no runtime console errors; the only console messages were Next
development-mode font-preload warnings outside the generated runner.

Reviewed artifacts:

- `output/playwright/phase10-researcher-binding-desktop.png`
- `output/playwright/phase10-consent-runtime-desktop-review.png`
- `output/playwright/phase10-consent-runtime-desktop-confirm.png`
- `output/playwright/phase10-consent-runtime-withdrawal.png`
- `output/playwright/phase10-consent-runtime-mobile-viewport.png`

The temporary inspection route used to construct the deterministic reviewed
fixture was removed after QA; none of its fixture identities or wording ship in
the application.

## Manual verification contract

A reviewer should verify the following in the generated participant runner:

1. The reviewed text is readable before any choice and the participant can
   download or print a checksum-identified copy.
2. Main participation and each applicable optional/recording choice start
   unselected.
3. After main-study acceptance, continue remains unavailable until every
   applicable separate choice is explicit. Main-study refusal does not require
   or synthesize unrelated optional decisions.
4. The confirmation screen accurately summarizes choices and **Change
   choices** returns without losing the review context.
5. Refusal shows a neutral end state, creates no assignment or study payload,
   and does not use coercive language.
6. Acceptance begins the first non-consent screen and only then creates the
   condition assignment and study start.
7. **Stop or withdraw** remains keyboard reachable and explains the frozen data
   boundary before final withdrawal.
8. Mobile reflow does not hide contacts, decisions, copy controls, confirmation,
   or withdrawal.

## Known, intentional limits

- The receipt is not a signature, identity proof, IRB approval, or compliance
  certificate.
- Only adult English self-consent with acknowledgement/implied documentation is
  executable.
- The reconsent state machine and receipt chaining exist, but cross-release
  release-format and Stage 4 governance binding remain Phase 11.
- Phase 10 does not authorize a study for pilot or production collection.
- Browser timing remains browser-measured and is not certified physical-onset
  timing.

## Source review

Engineering decisions were checked against
[45 CFR 46.116](https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-A/part-46/subpart-A/section-46.116),
[OHRP/FDA electronic-consent guidance](https://www.hhs.gov/ohrp/regulations-and-policy/guidance/use-electronic-informed-consent-questions-and-answers/index.html),
[OHRP withdrawal guidance](https://www.hhs.gov/ohrp/regulations-and-policy/guidance/guidance-on-withdrawal-of-subject/index.html),
and [WCAG 2.2 error-prevention guidance](https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html).
