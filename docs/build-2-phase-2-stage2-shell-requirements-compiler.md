# Build 2 Phase 2 — Stage 2 Shell and Requirements Compiler

Verified for: 2026-08-05

## Outcome

Stage 2 is now a seven-step proposal workflow:

1. Confirm the Proposal Brief and Requirements.
2. Plan the Evidence Strategy.
3. Review and Appraise Sources.
4. Synthesize the Evidence and Establish the Gap.
5. Define the Proposed Study.
6. Write the Research Proposal.
7. Verify the Proposal and Create the Stage 3 Handoff.

Phase 2 fully implements the first step and the shared shell. Later steps retain their real existing tools and show canonical artifact status, but deliberately do not claim that the later Build 2 editors, ledgers, or release workflow already exist.

## Migration-safe navigation

The prior three persisted step IDs remain attached to their closest semantic successor:

- `stage-02-step-01` → Plan the Evidence Strategy.
- `stage-02-step-02` → Define the Proposed Study, including the existing research-question roadmap fields.
- `stage-02-step-03` → Write the Research Proposal, including the existing six Paper Writer proposal sections.

New semantic IDs are used for the four new workflow responsibilities. Historical local data is not deleted, renamed, or overwritten merely because visible order and titles changed. Manual completion state is no longer treated as Stage 2 readiness.

## Requirements compiler

The compiler accepts the exact Stage 1 route, proposal purpose, language, citation style, optional word limit, local notes, template selection, and researcher confirmation. It returns a versioned `ProposalRequirementsProfile`, blocking and advisory issues, recommended profiles, and a derived readiness result.

The authority registry pins:

- NIH/PHS SF424 (R&R) Forms Version I and PHS 398 Research Plan instructions.
- NSF PAPPG NSF 24-1 plus the two policy supplements that NSF lists as current on the verification date.
- PRISMA-P 2015.
- APA JARS-Qual and MMARS through the EQUATOR record.

NIH and NSF profiles always remind researchers that the active opportunity and institution control the actual submission. JARS-Qual and MMARS are explicitly labeled prospective planning lenses because they are reporting standards for completed work. No profile can represent compliance, approval, methodological validation, novelty, or submission readiness.

## Route behavior

The compiler is tested against the 12 canonical project-route fixtures. Important negative requirements are explicit:

- qualitative routes do not receive mandatory variable or hypothesis fields;
- evidence-synthesis routes do not receive participant-study language;
- custom funder and protocol profiles fail closed until requirements and a controlling HTTPS source are recorded;
- a changed registered authority version makes the stored profile stale;
- a changed Stage 1 checksum resets confirmation and creates a new proposal revision rather than silently rebasing an old approval.

## Persistence and conflict safety

The Stage 2 cache has its own versioned, project-scoped key. Cached proposal documents are checksum verified before use. Secure writes use the Phase 1 optimistic checksum contract and a serialized save queue. When both the secure proposal and the device copy changed after their last shared checksum, neither is overwritten and the researcher must choose which version becomes current.

The Phase 1 Supabase migration remains unapplied. Until it is applied through the normal reviewed migration workflow, the new interface falls back to the checksum-verified device cache and keeps the legacy Paper Writer compatibility path.

## User-interface boundaries

On desktop, the Stage 2 studio owns a fixed-height canvas and scrolls internally. Requirement tables and the preserved research-roadmap table have their own horizontal overflow surfaces. Mobile layouts intentionally release the fixed height and stack the handoff and compiler panels.

Step 1 displays the exact Stage 1 revision, checksum, selected problem, selected questions, route, rationale, and unresolved uncertainties. Completion is derived from a valid Stage 1 brief, a compatible requirements profile, researcher review, current source lineage, current authority snapshots, and the absence of a version conflict.

## Verification

Run:

```bash
npm run verify:build2-phase2
npx tsx --test src/lib/research/proposalRequirementsCompiler.test.ts src/lib/research/researchProposalCache.test.ts src/lib/research/researchPathConfig.test.ts
npx tsc --noEmit
```

Generated reports:

- `output/build-2-phase-2-verification.json`
- `output/build-2-phase-2-verification.md`

The in-app Browser plugin was listed but did not expose its required callable runtime in this session. The implementation therefore records rendered Browser QA as unverified instead of switching silently to a different browser surface. No remote deployment was performed.
