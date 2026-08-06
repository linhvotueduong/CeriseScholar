# Build 2 Phase 4 — Evidence Synthesis and Gap Studio

Verified for: 2026-08-05

## Outcome

Stage 2 Step 4 is now a functional synthesis product. Researchers can build a versioned, inspectable argument from reviewed sources to:

1. context;
2. the documented problem;
3. what is known;
4. contested or divergent evidence;
5. a bounded research gap;
6. why that gap matters; and
7. the proposed contribution.

Each claim records its exact text, role, researcher-selected status, selected Stage 1 question links, included Phase 3 evidence-assessment links, and caveats. The complete claim map is saved inside the canonical `ResearchProposalDocument`, so it receives a new revision, checksum, source lineage, device-cache entry, and optimistic cloud write through the existing proposal persistence path.

## Product workflow

The studio begins with route-aware synthesis guidance. It then presents a bounded claim navigator, a structured claim editor, upstream evidence links, derived integrity issues, authoritative guidance, and a single explicit Save synthesis map action.

The normal researcher flow is:

1. Review the route-specific synthesis cautions.
2. Add a Context, Problem, or What is known claim.
3. Link the claim to selected research questions and researcher-included Phase 3 sources.
4. Select the claim status and record limitations, certainty, applicability, context, or interpretive boundaries.
5. Preserve contested evidence as its own claim instead of averaging disagreement away.
6. Add a gap claim, mark it Researcher reviewed, and state the evidence/search boundary that limits it.
7. Explain why the bounded gap matters.
8. Save the draft at any time; readiness remains derived from the artifacts.

Draft saving and step readiness are intentionally separate. A researcher may preserve incomplete reasoning without falsely marking the synthesis complete.

## Derived readiness contract

Step 4 becomes ready only when:

- the current Evidence Strategy is ready;
- the Project Source Review Ledger is ready and has no unresolved per-source version conflict;
- at least one reviewed context, problem, or what-is-known claim exists;
- at least one researcher-reviewed, explicitly bounded gap exists;
- at least one reviewed significance claim explains why the gap matters;
- every claim has text, a final researcher status, and at least one current selected-question link;
- claims that require evidence link only to currently included assessments;
- supported claims have included evidence;
- contested claims retain at least two included sources and a caveat describing the disagreement;
- unsupported claims retain an explicit support limitation;
- every selected question connects through the claim map to included evidence and a researcher-reviewed gap; and
- every included Phase 3 source is used by at least one claim or returned to the review ledger for a different decision.

Stale question links, missing assessments, links to excluded evidence, empty claim text, draft statuses, and unresolved upstream state fail closed. The researcher’s content remains preserved.

## Scholarly architecture

The internal guidance registry is pinned to five authoritative sources:

- [Cochrane Handbook Chapter 15](https://training.cochrane.org/handbook/current/chapter-15) informs cautious interpretation, communication of uncertainty, and the rule that conclusions must not extend beyond the evidence.
- [Cochrane Handbook Chapter 14](https://training.cochrane.org/handbook/current/chapter-14) informs the separation of a finding from certainty in the body of evidence and the need to document judgment reasons.
- [Cochrane Handbook Chapter 21](https://training.cochrane.org/handbook/current/chapter-21) informs qualitative attention to context, experience, interpretation, implementation, divergent cases, and mixed-method integration.
- [AHRQ Frameworks for Determining Research Gaps During Systematic Reviews](https://effectivehealthcare.ahrq.gov/sites/default/files/pdf/methods-future-research-steps-framework_research.pdf) informs explicit characterization of why and where evidence is insufficient instead of treating “no result found” as proof of novelty.
- [PRISMA 2020 expanded checklist](https://www.prisma-statement.org/s/PRISMA_2020_expanded_checklist-yc78.pdf) informs general interpretation in the context of other evidence, review-process limitations, and certainty reporting for evidence syntheses.

Cerise paraphrases responsibilities from these sources. It does not reproduce a licensed checklist, calculate an overall quality score, or pretend that one certainty framework applies to every research route.

## Route behavior

### Quantitative primary research

The prompts separate direction or association from precision, bias, applicability, and practical importance. They distinguish null, imprecise, inconsistent, and absent evidence.

### Qualitative primary research

The prompts preserve context, participant perspectives, researcher interpretation, and divergent cases. A gap may concern meaning, experience, mechanism, implementation, context, or whose voice is absent. No effect-size or statistical-certainty field is imposed.

### Mixed-methods primary research

The prompts keep qualitative and quantitative strands distinguishable before integration. Divergence between strands remains visible, and a gap may concern either strand or the integration itself.

### Secondary-data research

The prompts separate an important question from what a dataset can represent. Population, period, setting, variables, measurement, missingness, linkage, access, licensing, and version provenance can all bound the gap.

### Evidence synthesis

Every final claim must record a certainty, applicability, or review-process caveat. The prompts expose heterogeneity, indirectness, imprecision, missing evidence, and search/review limitations. An empty search result is never treated as proof that no study exists.

## Data and concurrency boundaries

The proposal’s `ClaimEvidenceMap` is the canonical owner of claim-to-assessment links. Phase 4 does not create a second synthesis database or duplicate source metadata. It reads the independent, checksum-verified Phase 3 assessment ledger and stores only stable assessment IDs in the proposal claim map.

Proposal saving retains:

- project-scoped device caching;
- checksum verification on load;
- append-only proposal revision history;
- serialized secure writes;
- optimistic expected-checksum comparison; and
- explicit secure/device choice when both proposal versions changed.

Phase 3 evidence conflicts remain isolated to their source assessment and must be resolved in Step 3. Phase 4 never silently chooses a source-decision version.

## Safety boundaries

- Cerise does not infer, certify, or guarantee novelty.
- A gap claim must be explicitly marked Researcher reviewed; it cannot be marked ready merely because Cerise sees no source.
- Cerise does not certify truth, certainty, methodological quality, ethics, compliance, publication readiness, or approval.
- Cerise does not auto-generate or auto-apply claim text or status in this phase.
- No participant rows, participant responses, AI prompts, or AI chat transcripts are stored.
- The unapplied Build 2 Phase 1 Supabase migration remains unapplied.
- No remote deployment was performed.

## Verification

Run:

```bash
npm run verify:build2-phase4
npx tsx --test src/lib/research/proposalSynthesisPhase4.test.ts
npx tsc --noEmit
```

Generated reports:

- `output/build-2-phase-4-verification.json`
- `output/build-2-phase-4-verification.md`

The verification matrix covers all 12 canonical project routes and 20 acceptance responsibilities, including negative fixtures for unbounded gaps, human-review status, stale upstream links, contested evidence, included-source accountability, route language, persistence, responsive layout, and non-activation boundaries.

The Browser plugin was listed during verification, but its required callable browser-control runtime was not exposed. The frontend testing policy does not permit silently substituting standalone Playwright without prior authorization, so rendered interaction and screenshot QA are recorded as unavailable. Domain tests, the full repository suite, TypeScript, lint, and the production build were still run locally.
