# Stage 3 Phase 9 — Verification report

Verification date: August 1, 2026

Result: Phase 9's automated domain and consent-regression suite passes, and the
deterministic desktop/mobile browser acceptance fixture passes.

## Verification contract

Phase 9 is accepted only if all of the following remain true:

- AI can be absent without breaking consent compilation, validation, review,
  versioning, or export;
- model input is explicit-scope, redacted, and excludes participant data,
  uploaded files, approval correspondence, governance decisions, and authority
  identifiers;
- malformed or adversarial output cannot target protected or absent content;
- no suggestion applies without one researcher action;
- apply fails closed after scoped content changes;
- applied text returns to deterministic human review;
- accepted and rejected suggestions can receive separate bounded researcher
  decision records without storing chat transcripts;
- AI findings never change deterministic readiness or human approval state.

## Automated evidence

Command:

```text
npm run verify:consent-phase9
```

Result:

```text
73 tests passed
0 failed
```

The command includes the Phase 9 assistant tests and every consent authority,
compiler, base-form, behavioral/lifecycle, protected-audience/language, and
biomedical/data-use regression test from Phases 0–8.

Focused Phase 9 tests: 10 passed, 0 failed.

Repository-wide regression command:

```text
npm test
```

Result: 262 passed, 0 failed.

Additional verification:

- targeted ESLint: pass;
- clean isolated TypeScript check: pass;
- clean isolated Next.js 16.2.1 production build: pass, including dynamic route
  `/api/ai/consent-assistant`;
- `git diff --check`: pass.

| Scenario | Result | Evidence |
| --- | --- | --- |
| Selected-scope context | Pass | One clause by default; entire form requires an explicit allowed mode and flag |
| Identifier redaction | Pass | Email, phone, street address, titled name, signature, and institutional-ID patterns are replaced |
| Contact protection | Pass | Contact/signature clause text is replaced wholesale |
| File/governance exclusion | Pass | Attachment filename/content and institution/waiver references are absent from provider context |
| Request normalization | Pass | Missing, absent, and implicitly broadened targets reject |
| Server-owned current text | Pass | Model-supplied current wording is ignored |
| Locked/fill-only/conditional target | Pass | Patch rejects |
| Fact-sensitive target | Pass | Risks and other governed factual clauses can yield findings/questions only |
| Cross-form or absent target | Pass | Patch rejects |
| Invented approval/contact/ID | Pass | Patch rejects |
| New placeholder or HTML | Pass | Patch rejects |
| Redaction-token write-back | Pass | Patch rejects rather than inserting a disclosure marker into the form |
| Malformed/oversized output | Pass | Invalid entries drop and accepted suggestions remain capped at eight |
| Unknown fact reference | Pass | Suggestion rejects |
| Governance/readiness fields in output | Pass | Parser drops fields outside its vocabulary |
| Stale revision | Pass | Scoped SHA-256 changes after clause edit |
| Decision record privacy | Pass | Actions and checksums persist; full wording and chat do not |
| Ledger bound | Pass | Only the most recent 200 normalized records persist |

## Endpoint and source review

Source inspection confirms:

- POST requires same-origin JSON and an authenticated user;
- the project row must match both project ID and user ID;
- only strict BYOK credentials are accepted;
- there is no fallback to the shared Cerise key;
- paid model chains require an OpenRouter USD limit;
- exhausted spending limits, rate limits, daily caps, or unavailable safety
  checks fail closed;
- response headers include `private, no-store, max-age=0` and `Pragma:
  no-cache`;
- provider input is generated on the server from normalized context;
- the user prompt is redacted again on the server;
- usage logging contains metadata, model, tokens, and cost—not research text;
- prompt history is neither accepted nor persisted.

## Research and legal-boundary review

The interface and system prompt were checked against current
[45 CFR 46.116](https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-A/part-46/subpart-A/section-46.116),
[45 CFR 46.117](https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-A/part-46/subpart-A/section-46.117),
and the joint [HHS OHRP/FDA electronic informed-consent guidance](https://www.hhs.gov/ohrp/regulations-and-policy/guidance/use-electronic-informed-consent-questions-and-answers/index.html).
The implemented claims preserve investigator responsibility, human authority
review, understandable-language goals, voluntariness, and the prohibition on
exculpatory wording. Cerise does not claim that this automated review creates
legally effective consent or satisfies institution-, jurisdiction-, FDA-, or
IRB-specific requirements.

The control design also uses the voluntary
[NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework) and
[NIST Generative AI Profile](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence)
as risk-management references for bounded scope, human oversight, privacy,
confabulation controls, measurement, and documented failure behavior. No NIST
certification claim is made.

## Browser acceptance evidence

The Playwright CLI drove Microsoft Edge against a temporary deterministic
public inspection fixture. The fixture was removed after capture. Provider
traffic was mocked only for reproducible UI states; endpoint security and
parsing are covered by source review and automated tests above.

| Browser scenario | Result |
| --- | --- |
| Copilot begins collapsed and optional | Pass |
| Five mode controls are exposed as semantic buttons | Pass |
| Selected clause remains the default scope after choosing final advisory review | Pass |
| Entire selected form requires a separate checkbox | Pass |
| Disclosure changes from 1 clause / 1 fact to 11 clauses / 6 facts only after that checkbox | Pass |
| Contact content produces a redaction count in full-form scope | Pass |
| BYOK-connected state states that no Cerise fallback key is used | Pass |
| Missing-BYOK state disables Send and shows the Settings → AI link | Pass |
| Structured patch, finding, and question cards expose rationale, uncertainty, conflicts, and fact IDs | Pass |
| Apply, Edit manually, and Keep current are per suggestion | Pass |
| No bulk-apply control exists | Pass |
| 1,536 × 1,024 desktop layout matches the established Consent visual system | Pass |
| 390 × 844 narrow layout reflows into one column | Pass |
| Narrow layout has no document-level horizontal overflow | Pass: 375 px client width and 375 px scroll width |
| Browser console | Pass: 0 errors; warnings were existing unused development font-preload notices |

Captured evidence:

- `output/playwright/phase9-consent-copilot-desktop-open.png`
- `output/playwright/phase9-consent-copilot-desktop-review.png`
- `output/playwright/phase9-consent-copilot-mobile-review.png`

Visual comparison against the accepted Phase 8 Consent workspace confirms that
Phase 9 reuses the same pale-blue stage canvas, warm paper panels, cerise
selection language, compact provenance labels, shield boundary treatment, and
responsive workbench structure. The new dark header distinguishes the optional
AI advisory layer without making it look like institutional governance.

## Deferred and not represented as verified

- Provider-model semantic quality cannot be guaranteed by parser tests.
- Redaction reduces common identifier exposure but cannot prove that arbitrary
  researcher free text is anonymous.
- No external IRB, legal, clinical, privacy, translation, or accessibility
  authority reviewed or approved this implementation.
- Phase 10 participant consent runtime and Phase 11 release/governance binding
  were not built or tested in this phase.
