# Build 1 Phase 7 — Gentle Support-Opportunity Detection

## Outcome

Phase 7 adds a deterministic, local-only signal layer to the Stage 1 Research Mentor. It can offer optional help when several task-relevant signs converge, while treating ordinary thinking time as normal and preserving the researcher’s authority.

The feature does not diagnose a person, infer a psychological condition, rank research directions, change a project, or send raw activity history to AI.

## Researcher experience

- **Gentle mode** is the default. When support qualifies, the existing Mentor launcher receives a quiet breathing ring. Nothing opens automatically.
- **On request only** keeps the Mentor available but disables all proactive indications.
- **Focus mode** disables proactive indications and hides work-state observations until the researcher changes the setting.
- Opening a qualified opportunity shows neutral, task-level language plus five researcher-controlled actions:
  - **Talk about this** prepares a bounded prompt but does not send it or change the project.
  - **Not an issue** corrects the inference and pauses that category for seven days.
  - **Why did Cerise notice this?** reveals the exact task signals used.
  - **Don’t suggest this again** permanently suppresses the category for this project until restored.
  - **I need something else** lets the researcher replace Cerise’s framing.
- Suppressed categories can be restored from the same Quiet support settings.

## Detection contract

The engine evaluates only at natural work boundaries: project return, field blur, explicit save, or Stage 1 step navigation.

A proactive indication requires all of the following:

1. Gentle mode is active.
2. The current Stage 1 step is unfinished.
3. At least two independent task-relevant signals are present.
4. At least one signal describes an interaction pattern or an explicit researcher request—not content structure alone.
5. The resulting category is neither in cooldown nor suppressed.

Supported task signals are:

- repeated movement between unfinished Stage 1 steps;
- several unresolved ideas, frames, evidence gaps, questions, or pathway decisions;
- repeated revisions or add/remove cycles across separate breakpoints;
- a deterministic route contradiction;
- return to a previously unfinished Stage 1 session;
- explicit researcher wording such as “I’m stuck” or “I don’t know what to do next.”

An unfinished pause is deliberately weak. It may provide context after two minutes and at least two edits, but it never counts toward the two-signal threshold and can never produce a ring by itself.

## Privacy and safety architecture

- Activity counters live only in component memory for the current browser session.
- Raw field values, timestamps, navigation histories, and revision histories are not written to storage or uploaded.
- Project-scoped local preferences contain only the support mode, category cooldowns, category suppressions, and one bounded unfinished-session marker.
- The bounded marker stores the step ID, readiness flag, pathway checksum, and timestamp. It stores no prose.
- Explicit help wording is detected locally. The matching phrase is not copied into the signal or preference record.
- The Mentor AI context compiler receives the existing bounded project context only; Phase 7 activity counters are not part of any API request.
- Copy is restricted to observable task friction. Psychological and clinical labels are prohibited by both domain tests and deterministic verification.

## Architecture

`researchSupportOpportunity.ts` owns the pure signal, threshold, categorization, cooldown, suppression, and storage-normalization rules. `ResearchPathWorkspace.tsx` emits natural breakpoints. `ResearchMentorPanel.tsx` keeps session activity in a ref, derives opportunities locally, and renders the correction-first UI.

This separation keeps signal logic testable and prevents the UI or AI route from silently weakening the safety contract.

## Verification criteria

The phase is accepted when:

- quiet waiting produces no proactive indication;
- two qualifying signals produce one neutral opportunity at a natural breakpoint;
- Focus and On request only produce zero proactive indications;
- correction, suppression, and restoration change future behavior;
- stored preferences contain no raw signal history;
- no psychological labels occur in generated opportunity data;
- the desktop and phone workflows remain usable without automatic popups or layout overflow;
- the full automated suite, lint, and production build pass.

The reproducible acceptance artifacts are `output/build-1-phase-7-verification.json` and `output/build-1-phase-7-verification.md`.

## Activation boundary

Phase 7 requires no database migration. It does not apply the existing Build 0/Build 1 migrations and does not deploy the application.
