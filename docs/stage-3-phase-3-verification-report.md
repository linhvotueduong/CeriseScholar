# Phase 3 — Study Builder verification report

Verification date: July 31, 2026

## Automated results

- Focused materializer suite: 7/7 passing.
- Full research and AI suite: 192/192 passing.
- TypeScript: passing with no emitted files.
- ESLint on changed product and verification files: passing.
- Production Next.js build: passing; 59 static pages generated and all dynamic
  routes compiled.

Run the focused suite with:

```bash
npm run verify:study-builder
```

## Domain cases

| Case | Expected result | Result |
| --- | --- | --- |
| Guided online/home survey | Valid single-condition Studio document, responsive/home-safe execution, source-linked measure, skip branch, consent refusal | Pass |
| Guided randomized laboratory experiment | Two named weighted conditions, random assignment, condition routing, task starter, manipulation check, outcomes, reset boundary | Pass |
| Structural contrast | Survey and laboratory documents have different checksums, blocks, conditions, assignment, and execution | Pass |
| Required recommendation declined | Candidate is absent and creation is blocked | Pass |
| Modify without note | Candidate is absent and creation is blocked | Pass |
| Existing Studio document | Candidate is absent and regeneration is blocked | Pass |
| Randomized source lacks conditions/allocation | No conditions are invented; creation directs the researcher back to Step 03 | Pass |
| Consent refusal | Runtime resolves directly to end without continuing through study measures | Pass |
| Creation receipt | Exact source fingerprint, profile, decisions, semantic changes, and candidate checksum are bound | Pass |
| Unapproved Phase 4 combination | Profile remains visible; materialization fails closed | Pass |

## Component and browser cases

The actual Step 04 component was exercised in Microsoft Edge through a
synthetic local route containing no account or research data. The route was
removed after verification.

| View / path | Verification | Result |
| --- | --- | --- |
| Survey desktop, 1440 × 1100 | Profile summary, three variants, 13 module decisions, source inspector, semantic ledger, enabled creation after suggested review | Pass |
| Laboratory desktop, 1440 × 1100 | Distinct 14-module architecture with handoff, equipment, allocation, routing, manipulation, outcomes, and reset | Pass |
| Survey mobile, 430 × 932 | 2 × 2 profile summary, three visible variants, inline rationale, 44-pixel decisions, sticky safe actions | Pass |
| Required consent module declined | Decision remains visible and `Create study draft` becomes disabled | Pass |
| Restored consent and create | Exact candidate is persisted and the component switches to protected existing-study state | Pass |
| Browser console | Zero product errors; only Next development font-preload notices | Pass |

The isolated browser session did not reuse the researcher's authenticated
session and no credentials were requested. Authentication was not weakened for
the verification.

## Visual fidelity ledger

The final implementation was compared directly with the approved survey,
laboratory, and mobile concepts:

1. Preserved the Cerise pale-blue project canvas, restrained rules, black type,
   warm blush selection state, and compact academic labeling.
2. Preserved the profile strip linking design, setting, Steps 01–03, and honest
   capability status.
3. Preserved the three starting modes and made profile suggestions an explicit
   non-persisting action.
4. Preserved the module-list/inspector architecture and expanded the concepts'
   abbreviated sequences to all 13 or 14 deterministic compiler modules.
5. Preserved per-module Accept, Modify, Decline, and Defer decisions and added
   required modification notes to make overrides auditable.
6. Preserved the inline capability boundary, exact-change ledger, and gated
   creation controls.
7. Preserved the mobile inline-inspector and sticky-action model while adapting
   profile facts to a non-clipping 2 × 2 grid.

## Safety interpretation

Passing means the bounded scaffold is internally valid and the creation path
behaves as specified. It does not mean the study design, consent process,
ethics pathway, measurement validity, pilot result, or release is approved.
