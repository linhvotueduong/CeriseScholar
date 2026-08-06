# Build 2 Phase 3 — Versioned Evidence Strategy and Project Review Ledger

Verified for: 2026-08-05

## Outcome

Stage 2 Steps 2 and 3 are now functional products rather than tool placeholders.

The Evidence Strategy connects every selected Stage 1 question to searchable concepts, alternate terms, evidence source types, eligibility boundaries, append-only search versions, and a researcher-authored stopping or update rationale. A saved search version cannot be edited in place. Researchers may record it as planned or executed, with an exact run time and optional result count.

The Project Source Review Ledger lets a researcher add a reusable Evidence Library source without modifying its global metadata. Each project separately owns the source’s candidate, awaiting-review, included, or excluded status; question links; appraisal lens and domain responses; caveats; notes; decision rationale; review time; revision; checksum; and exact source fingerprint.

## Scholarly architecture

The strategy registry is grounded in current authoritative guidance while remaining route-sensitive:

- [Cochrane Handbook Chapter 4](https://training.cochrane.org/handbook/current/chapter-04) informs concept-based, multi-source, reproducible search conduct and explicit selection planning.
- [PRISMA-S](https://www.prisma-statement.org/prisma-search) informs traceable search-version reporting for evidence syntheses.
- [CASP’s current checklist registry](https://casp-uk.net/casp-tools-checklists/) informs structured domain review without turning a checklist into a universal score.
- [MMAT 2018](https://escholarship.mcgill.ca/downloads/v118rj210) informs the mixed-methods lens.
- [JBI’s current critical-appraisal registry](https://jbi.global/critical-appraisal-tools) informs design-aware quantitative review and the requirement to use a controlling design-specific tool when appropriate.

Cerise paraphrases planning domains instead of reproducing a licensed checklist. The six internal lenses are general scholarly source, quantitative study, qualitative study, mixed-methods study, secondary-dataset fitness, and review/synthesis report. They never calculate an overall source-quality score.

## Route behavior

All routes require question coverage, concepts, alternate terms, evidence types, eligibility boundaries, one saved search version, and a stopping rationale. Evidence-synthesis routes additionally require at least one executed search before the strategy is ready. Primary and secondary research can proceed from a planned version, with a visible reminder to log the run later.

The source-review lens is recommended from the Stage 1 route and saved source type. This is a starting aid, not a methodological determination; researchers can change it. Every final include/exclude decision requires a rationale and review time. Included sources must link to a selected question. Every No, Unclear, or Not applicable appraisal response requires an explanation.

Step 3 readiness is derived only when:

- at least one source is in the project ledger;
- every added source has a resolved included or excluded decision;
- final decisions have a structured appraisal and required explanations;
- included sources link to current Stage 1 questions; and
- every selected question has at least one reviewed included source.

## Persistence and concurrency

The proposal’s Evidence Strategy remains inside the canonical `ResearchProposalDocument` revision and checksum lineage. Search history is append-only within that proposal structure.

Project source assessments use independent optimistic concurrency. The device cache is versioned, project-scoped, checksum verified, and limited to 500 assessment records. Cloud writes compare the expected assessment checksum and run through a serialized queue. A conflict is isolated to one source; neither version is overwritten, and the researcher chooses the secure or device copy.

The Phase 1 Supabase migration remains unapplied. Until it is activated through the separately reviewed migration workflow, the interface uses the verified device cache. No remote deployment was performed.

## Product boundaries

- Evidence Library metadata is reusable and remains separate from project judgment.
- Search planning does not certify completeness, validity, or methodological quality.
- Appraisal domains do not certify truth, novelty, or universal source quality.
- Cerise does not make include/exclude decisions.
- No participant rows, participant responses, AI prompts, or AI chat transcripts are stored by Phase 3.
- Synthesis and gap claims remain Build 2 Phase 4 responsibilities.

## Verification

Run:

```bash
npm run verify:build2-phase3
npx tsx --test src/lib/research/proposalEvidencePhase3.test.ts src/lib/research/projectEvidenceAssessmentCache.test.ts
npx tsc --noEmit
```

Generated reports:

- `output/build-2-phase-3-verification.json`
- `output/build-2-phase-3-verification.md`

The Browser plugin was listed in this session, but its required callable browser-control runtime was not exposed. Under the frontend testing policy, rendered QA was recorded as unavailable rather than silently substituted with standalone Playwright. The production build, TypeScript, lint, domain tests, and full repository test suite were still run locally.
