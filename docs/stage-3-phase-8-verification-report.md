# Stage 3 Phase 8 Verification Report

Date: 2026-08-01

## Verification contract

Phase 8 is accepted only when:

- schemas 1–3 migrate without enabling specialized content;
- legal or medical keywords never activate modules;
- only explicit human profile requirements and procedure mappings create suggestions;
- regulated-intervention alternatives, injury, and costs remain protected;
- specimen, result-return, sharing, future-use, and broad-consent contracts remain internally consistent;
- HIPAA/GDPR text stays institution-controlled and only metadata/checksums enter Cerise;
- FDA electronic-consent controls remain an external-system specification;
- specialist review precedes ordinary artifact review;
- any source edit invalidates specialist, artifact, and dependent language review;
- no participant data or regulated runtime claim enters the Phase 8 state; and
- the version and review-package checksum include Phase 8.

## Commands

Run from the repository root:

```text
npm run verify:consent-phase8
npm test
npx tsc --noEmit
npm run lint
npm run build   # isolated copy while the development server owns .next
```

## Current result

- `npm run verify:consent-phase8`: **63/63 passed** across the authority,
  compiler foundation, Phase 5, Phase 6, Phase 7, and Phase 8 contracts.
- Phase 8 adds **14 independent fixtures**.
- `npm test`: **252/252 passed** across the full repository.
- `npm run lint`: passed. Babel printed only size/deoptimization notices for
  existing generated `.next-account-qa` files.
- isolated `npm run build`: passed with Next.js 16.2.1; TypeScript passed, 59
  static pages generated, and all dynamic routes compiled.
- Edge/Playwright desktop verification at 1536 × 1024: all eight modules,
  explicit regulatory profile, required-module ledger, procedure mapping,
  governed specimen fields, dual review, and source links rendered with
  **0 console errors**.
- Review-order interaction: ordinary artifact review remained disabled until a
  named specialist, role/credentials, and review reference were explicitly
  recorded; ordinary review then cleared the remaining module issue.
- Privacy interaction: after explicit applicability selection, the
  metadata/checksum-only addendum control rendered with no console errors.
- responsive verification at 390 × 844: the two-column workspace collapsed to
  one column without horizontal clipping or hidden controls.

Captured evidence:

- `output/playwright/phase8-specialized-modules.png`
- `output/playwright/phase8-specialized-modules-mobile.png`

The in-app browser runtime was not exposed after the required discovery pass,
so verification used the Playwright CLI with installed Microsoft Edge. A
temporary preview route was mounted only in the isolated build copy; it is not
part of the delivered source.
