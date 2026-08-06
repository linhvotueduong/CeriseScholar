# Build 2 — Stage 2 Step 1 — Phase 0 Experience Contract

Status: implemented and verified locally on 2026-08-06. This phase establishes the product contract for the approved redesign of Stage 2 Step 1. It does not replace the current interface, change the canonical proposal schema, apply a migration, or deploy remotely.

## Product decision

Stage 2 Step 1 will be presented as **Set Up Your Proposal**, with **Proposal brief and requirements** retained as its scholarly descriptor. Its job is to turn the exact Stage 1 handoff into a researcher-confirmed, versioned Proposal Planning Contract for the remaining proposal workflow.

The experience must serve researchers with different levels of familiarity without creating different scientific standards. Guided, Balanced, and Concise presentation levels control explanation depth. Comfortable and Dense views control information density. These preferences are presentation-only and can never change requirements, readiness, revision history, or checksums.

The interface is not a proposal writer, study builder, ethics review, institutional approval, funder compliance check, or submission release. The existing deterministic proposal requirements compiler remains the sole owner of canonical requirements and compiler issues.

## Natural-language workflow

The step must answer four questions in order:

1. What research direction arrived from Stage 1?
2. What kind of proposal is the researcher preparing?
3. Who or what sets its requirements?
4. Is the resulting proposal plan correct and current?

The visible progress model groups the work into three phases:

1. **Review Stage 1** — inspect the selected problem, questions, route, rationale, unresolved uncertainty, revision, and checksum.
2. **Choose proposal requirements** — identify proposal purpose, controlling source, applicable structure, language, citation style, length, and local constraints.
3. **Confirm the plan** — review generated requirements, authority provenance, limitations, unresolved decisions, and the non-certification boundary.

The detailed decision sequence is:

```text
exact Stage 1 handoff
  -> proposal purpose
  -> requirements authority or explicit provisional status
  -> deterministic structure recommendation
  -> practical constraints
  -> generated requirements review
  -> researcher confirmation
  -> checksum-bound proposal revision
  -> Stage 2 evidence strategy
```

## Information architecture

### Desktop

The workspace uses the available canvas up to 1,600 pixels. A roughly 34% context column contains the read-only Stage 1 handoff. A roughly 66% working column contains proposal decisions and the contract review. The context column may remain sticky inside the Stage 2 workspace while the configuration column scrolls.

Long text remains constrained to approximately 72 characters per line. The extra desktop width is used for clearer grouping, comparison, provenance, and review—not excessively long paragraphs.

### Tablet and mobile

On tablet, the Stage 1 handoff becomes a collapsible summary above the configuration workspace. On mobile, the workflow becomes one column with persistent progress and actions. Only bounded data tables may use horizontal scrolling; all decisions and recovery actions need a non-table small-screen presentation.

### Primary and technical language

The primary interface uses questions such as **What are you preparing?** and **Who sets the requirements?** Necessary scholarly concepts remain visible with short explanations. Terms such as compiler, schema version, source lineage, profile ID, and checksum belong in Technical details unless they are directly needed to explain a conflict or stale revision.

Researchers are never labelled Beginner or Expert. Guidance depth and information density describe the interface, not the person.

## State model and precedence

The experience resolver consumes readiness facts owned by canonical systems. It does not independently infer scientific validity.

State precedence is:

1. Loading.
2. Device/secure version conflict.
3. Stage 1 changed.
4. Authority source changed.
5. Stage 1 incomplete or route unresolved.
6. Required controlling authority missing.
7. Proposal not yet configured.
8. Provisional requirements.
9. Researcher review needed.
10. Confirmed contract is being persisted.
11. Ready.

Only **Ready** can complete the step. Confirmation is necessary but not sufficient. Ready additionally requires a current Stage 1 handoff, resolved route, acceptable authority state, persisted compiled requirements, no authority drift, and no unresolved version conflict.

An unknown local destination may use a visible provisional academic baseline for exploration. Provisional never means that local requirements are satisfied, and it cannot complete Step 1.

## Recovery contract

- Incomplete Stage 1 work links to the exact Stage 1 pathway-completion step.
- A material Stage 1 change preserves the prior proposal revision and resets confirmation.
- Authority drift blocks completion until the current source is reviewed.
- Divergent device and secure versions are compared; neither is overwritten automatically.
- Network loss may use a checksum-verified cached profile when available, with its access time disclosed.
- Missing or unavailable sources preserve current work and become an explicit verification issue.

## Authority and recommendation boundaries

Cerise may recommend a profile from proposal purpose and the exact Stage 1 route. The interface must explain why the recommendation was produced and allow comparison with every applicable alternative. A recommendation is not an approval, and the researcher remains responsible for selecting the controlling source.

Authority provenance retains:

- authority name and kind;
- version or effective date;
- HTTPS source location;
- access or verification time;
- boundary explaining which opportunity, institution, journal, supervisor, or review body can supersede the profile.

Custom funder and review-protocol profiles fail closed until a controlling source and at least one requirement are recorded. Unknown university, course, or supervisor instructions remain advisory or provisional without being invented.

## AI Research Mentor boundary

The future contextual mentor may explain terminology, compare registered structures, explain deterministic recommendations, identify questions for a supervisor, extract proposed requirements from a supplied source, and draft a bounded selection rationale.

It cannot confirm the contract, silently change canonical requirements, select an authority without review, invent or certify authoritative requirements, or claim compliance, approval, novelty, truth, methodological validity, or submission readiness. Every content-changing proposal remains review-before-apply and uses the researcher-owned decision ledger without storing full chat transcripts.

## Accessibility contract

All modes must expose equivalent decisions, sources, statuses, and recovery actions through keyboard, screen reader, pointer, mobile, and 200% zoom workflows. The later interface must use semantic fieldsets and groups, visible focus, non-color status indicators, live readiness announcements, minimum 44-pixel targets, reduced-motion support, and a small-screen alternative to comparison tables.

## Canonical implementation boundaries

Phase 0 adds a machine-readable contract and resolver in `src/lib/research/stage2Step1ExperienceContract.ts`. It does not duplicate or replace:

- `compileProposalRequirements` for requirements, recommendations, and compiler issues;
- `ResearchPathwayDocument` for Stage 1 decisions and provenance;
- `ResearchProposalDocument` for proposal revisions and checksum identity;
- authority-drift assessment;
- device/secure reconciliation;
- the unified researcher decision ledger.

Presentation preferences must be stored outside canonical research artifacts. Phase 1 may add backward-compatible proposal-destination and authority-decision fields only after migration and checksum behavior are independently reviewed.

## Phase 0 acceptance criteria

- One versioned experience contract names the route, artifact owner, compiler owner, decisions, states, actions, downstream consumers, and non-goals.
- The terminology registry separates primary, supporting, and technical language.
- Guided, Balanced, and Concise modes explicitly have no artifact impact.
- State resolution makes conflict, upstream change, and authority drift take precedence over confirmation.
- Only the Ready state can complete the step.
- Provisional requirements are useful for exploration but cannot masquerade as completion.
- AI assistance is review-before-apply and cannot confirm or certify.
- Scientific, authority, artifact, stage, accessibility, and participant-data boundaries are executable invariants.
- No live interface, database schema, migration, remote data, or deployment changes occur in Phase 0.

## Verification

Run:

```bash
npm run verify:build2-step1-phase0
npx tsx --test src/lib/research/stage2Step1ExperienceContract.test.ts
```

Generated reports:

- `output/build-2-stage2-step1-phase-0-verification.json`
- `output/build-2-stage2-step1-phase-0-verification.md`

Phase 1 should consume this contract to introduce the backward-compatible experience/view-model foundation. The live Step 1 redesign remains intentionally deferred until its selected visual target and later implementation phase.
