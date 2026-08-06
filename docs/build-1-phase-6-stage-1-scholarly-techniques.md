# Build 1 Phase 6 — Stage 1 Scholarly Technique Pack

## Outcome

Phase 6 turns the cross-stage Research Mentor into a structured Stage 1 thinking partner. It adds fifteen scholarly techniques without turning the Mentor into an autonomous topic generator, literature oracle, or pathway author.

The researcher remains the intellectual authority. Every technique follows the same sequence:

1. Select existing researcher-authored project items.
2. Mirror the source boundary without adding a direction.
3. Ask for explicit permission to expand.
4. Return traceable, epistemically labeled alternatives or a structured synthesis.
5. Require a researcher edit or written rationale before a canvas alternative can be added.

## Technique families

### Frame the problem

- Topic-to-problem shaper
- Alternative problem-frame generator
- Stakeholder and missing-voice lens
- Contradiction and boundary-condition finder
- Assumption map

### Explore evidence

- Adjacent-literature bridge
- Search-vocabulary builder

These produce search directions, not claims that literature has been searched or reviewed.

### Develop questions

- Research-question family explorer
- Scope mapper
- Competing-explanation exercise

### Compare and decide

- Contribution canvas
- Feasibility compass
- Path comparison

The system does not rank a direction as best, correct, novel, feasible, or approved.

### Plan the next move

- Smallest-next-step planner
- Supervisor or advisor handoff memo

The handoff memo is a reviewable synthesis and uses the existing review-before-save Living Research Record workflow.

## Architecture

`researchMentorTechniques.ts` is the domain authority. It owns stable technique identities, grouping, recommended Stage 1 steps, output shapes, prompts, permissioned run compilation, source excerpt extraction, checksums, response validation, divergence checks, epistemic-status checks, and the edit-or-rationale application gate.

The existing `/api/ai/research-mentor` route remains the only model boundary. It now optionally verifies a `ResearchMentorTechniqueRun` after the ordinary project and Stage 1 contexts are independently checksum-verified. Technique results pass through the same authentication, owner isolation, origin, request-size, allowance, rate-limit, timeout, redaction, and usage-metering controls as the general Mentor.

The Techniques tab exists only in Stage 1. Later stages keep the project-aware advisory Mentor introduced in Phase 5.

## Epistemic and creativity safeguards

- An empty pathway cannot ask Phase 6 to invent a topic.
- Every accepted option cites at least one selected researcher-authored item ID.
- Fourteen divergent tools require three structurally distinct options.
- Near-identical relabeled options fail the deterministic divergence check.
- Every option is labeled `brainstorming-not-evidence`, `uncertain-needs-evidence`, or `supported-by-approved-evidence`.
- The evidence-backed label requires at least one exact researcher-approved evidence ID from the bounded project context.
- Original wording remains visible and unchanged.
- Canvas application creates a separate `exploring` row; it cannot overwrite, select, link, archive, or approve existing work.
- Unchanged AI wording cannot be applied without an explicit researcher rationale.
- Technique runs are request-scoped. No participant rows, recordings, signatures, raw datasets, behavioral signal history, or chat transcript store is added.

## Activation and verification

Phase 6 requires no new database migration and performs no deployment. Existing unapplied Build 0 and Build 1 migrations remain unchanged.

Run:

```text
npm run verify:build1-phase6
npx tsx --test src/lib/research/researchMentor.test.ts src/lib/research/researchMentorTechniques.test.ts
npm run build
```

The deterministic acceptance report is written to `output/build-1-phase-6-verification.md` and `.json`.
