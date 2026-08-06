# Stage 3 Phase 2 — Study-Design Capability Compiler

Status: implemented and verified

## Architectural responsibility

The Phase 2 compiler converts the accepted Stage 3 Steps 01–03 source document
into a deterministic proposal. It does not mutate Experiment Studio, call AI,
persist a derived readiness claim, select an IRB pathway, or claim that a study
is approved.

The compiler composes these independent sources:

```text
base participant flow
+ methodological design registry
+ study setting registry
+ measure/evidence registry
+ participant registry
+ assignment registry
+ accessibility registry
+ versioned runtime capability registry
= reviewed Study Build Profile
```

## Module boundaries

- `studyBuildDesignModules.ts` owns the eight methodological design modules and
  their design-specific checks.
- `studyBuildSettingModules.ts` owns online/home, laboratory, field, and hybrid
  environment overlays.
- `studyBuildContextModules.ts` owns source-derived measure, participant,
  assignment, and accessibility contributions.
- `studyBuildCapabilities.ts` states what Experiment Studio v8 and the Local
  Research Host can execute honestly today, including bounded alternatives.
- `studyBuildRegistry.ts` defines registry contribution contracts and explicit
  source precedence.
- `studyBuildCompiler.ts` composes, deduplicates, applies precedence, surfaces
  conflicts, builds source fingerprints, and emits the three profile variants.
- `studyBuildProfile.ts` bounds and normalizes the compiled artifact. Legacy
  Phase 1 profiles without variant-selection metadata normalize to the guided
  behavior instead of being silently discarded.

## Invariants

1. Design and setting are orthogonal. No registry contains a 32-way template
   switch.
2. Every recommendation has a stable semantic ID, rationale, and at least one
   source reference.
3. Duplicate semantic IDs are merged deterministically; contradictory semantic
   kinds become a blocking conflict instead of a silent choice.
4. Higher-safety/runtime and accessibility/participant sources outrank design,
   setting, and generic defaults when a semantic recommendation overlaps.
5. Unsupported required capabilities create blocking findings with bounded
   alternatives. Optional unsupported capabilities remain visible warnings.
6. Qualitative profiles use qualitative concepts and evidence sources without
   requiring quantitative outcome roles.
7. Mixed-methods profiles preserve distinct quantitative and qualitative lanes
   plus integration metadata.
8. Quasi-experimental sources that explicitly declare random assignment are
   blocked as contradictory.
9. Source fingerprints cover semantic Steps 01–03 inputs, the compiler/module
   registry, precedence policy, and the runtime capability registry. Display
   timestamps are excluded.
10. Compilation requires no model, API, or network call.

## Profile variants

- **Guided:** required and recommended modules are included by default;
  optional items remain unselected.
- **Minimal compatible:** required modules are included; recommended and
  optional items remain unselected.
- **Blank with requirements:** nothing is silently constructed; required
  modules remain explicit configuration requirements and all checks remain.

All variants carry the same scientific and capability requirements. A variant
changes the proposed selection posture, not the safety boundary.

## Capability language

- `supported`: the current runtime has a bounded, testable implementation.
- `supported-with-limits`: a safe subset exists and the limitation must be
  reviewed.
- `authoring-export-only`: Cerise can preserve the plan but cannot claim to run
  that capability.
- `unsupported`: the requested runtime behavior is unavailable. A required
  unsupported capability blocks materialization.

Compiler readiness is not ethics approval, scientific approval, pilot
approval, or collection authorization.

## Verification

Run:

```bash
npm test
npm run verify:study-build
```

The generated matrix and its profile checksums are recorded in
`docs/stage-3-phase-2-verification-report.md`.
