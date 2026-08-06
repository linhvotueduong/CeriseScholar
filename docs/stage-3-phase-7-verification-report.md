# Stage 3 Phase 7 Verification Report

Date: 2026-08-01

## Verification contract

Phase 7 is accepted only when:

- schema 1 and 2 drafts migrate without enabling a protected-audience package;
- no study design automatically chooses a protected-audience rule;
- parent permission and assent remain separate, linkable artifacts;
- required-audience coverage is derived from the institution profile;
- age, parent-count, representative-authority, witness, and short-form rules require human determination evidence;
- translated variants remain bound to their source artifact and source version;
- AI-assisted language remains a draft until named qualified human review;
- qualified language review and general artifact review remain separate gates;
- source changes invalidate prior artifact review;
- short-form and full-summary artifacts are separate and carry interpreter, witness, signature, and copy plans;
- exported review-package checksums include Phase 7 state; and
- all Phase 5 and Phase 6 behavior remains compatible.

## Commands and evidence

Run from the repository root:

```text
npm run verify:consent-phase7
npm test
npx tsc --noEmit
npm run lint
```

Production-build verification must be performed in an isolated copy while a local Next.js development server owns the repository's `.next` directory.

Browser verification covers:

- seven-step navigation;
- institution-profile and required-package controls;
- package applicability and authority controls;
- parent/assent, LAR, accessible oral, translated, and short-form fields;
- issue repair routing;
- participant-preview selection for compiled Phase 7 artifacts;
- disabled general translation review before qualified language review; and
- responsive layout at desktop and narrow viewport widths.

## Result

Passed on 2026-08-01:

- `npm run verify:consent-phase7`: **49/49 passed** across authority, compiler foundation, Phase 5, Phase 6, and Phase 7 contracts.
- `npm test`: **238/238 passed** across the full repository.
- isolated `tsc --noEmit`: passed. The working development cache briefly retained a generated type for the removed temporary preview route; the source-clean isolated check passed without that cache artifact.
- `npm run lint`: passed. Babel printed only size/deoptimization notices for existing generated `.next-account-qa` files.
- isolated `npm run build`: passed with Next.js 16.2.1; 59 static pages generated and all dynamic routes compiled. The first isolated attempt rejected an out-of-root dependency symlink; rerunning with a self-contained hard-linked dependency tree passed.
- Edge/Playwright desktop verification at 1440 × 1000: seven package controls rendered, the assent inspector exposed every required repair field, translated-package activation exposed source/language/provenance/qualified-review fields, and the console reported **0 errors**.
- Edge/Playwright responsive verification at 900 × 1000: the catalog collapsed to one column and the inspector flowed below it without horizontal clipping.

Captured evidence:

- `output/playwright/phase7-audience-packages.png`
- `output/playwright/phase7-responsive.png`

The authenticated project route redirected the isolated browser to sign-in as expected. Visual QA used a temporary local-only preview route mounting the production Phase 7 component; the route was removed after capture and is not part of the delivered source.
