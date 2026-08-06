# Build 1 Phase 2 — Five-step Research Framing Workflow

Status: implemented and verified locally on 2026-08-03. No remote deployment was performed. This phase does not require a new table migration; it evolves the checksum-bound pathway document from schema v1 to v2 and can upgrade verified v1 records on read.

## Researcher outcome

Stage 1 now follows five semantic steps:

1. Capture the Concern
2. Shape Candidate Problems
3. Explore the Baseline and Perspectives
4. Develop Candidate Research Questions
5. Choose a Provisional Pathway

The canvases preserve the researcher’s language and alternatives. They do not require early variables, hypotheses, or a universal backcasting exercise. Fixed internal row sets keep long tables within the workspace; expandable rows remain explicitly assigned to Build 1 Phase 3.

## Architecture

`ResearchPathwayDocument` schema v2 adds richer, stable idea, problem, baseline, question, scope, criteria, route, and decision structures. A v1 document is accepted only after its historical identity checksum verifies. Migration creates a new v2 identity with the v1 identity as a source reference; old workspace fields and completion states remain available for rollback and compatibility.

Readiness is compiled from content conditions. It checks traceable problem framing, baseline evidence states, question comparison and links, selected items, rationale, a consistent route, and an explicit backcasting choice. Stage 1 no longer treats a manual completion checkbox as evidence.

The route compiler supports primary-data, secondary-data, and evidence-synthesis workflows. It changes terminology and later-stage applicability without silently rewriting the researcher’s choice. Qualitative pathways are not forced into variable or hypothesis fields, secondary-data pathways surface coverage and measurement, and evidence syntheses receive no participant-planning language.

When readiness passes, the compiler creates a checksum-bound Research Pathway Brief containing the exact selected problems and questions, active baseline, rationale, evidence links, route, unresolved uncertainties, and applicable backcasting notes. Secure saves also attempt to update the Build 0 route profile and append checksum-bound Stage 1 entries to the Living Research Record. Missing foundation tables produce compatibility warnings while the device pathway remains saved.

## Researcher-visible verification

- The Stage 1 rail contains five steps and shows derived progress.
- Each step uses a bounded internal workspace instead of expanding the whole page.
- Secondary data and evidence synthesis change the evidence terminology and downstream route.
- Qualitative questions can complete without a variable or hypothesis.
- Step 5 previews selected problems/questions, remaining readiness issues, and the exact Stage 2 handoff.
- “What changed?” compares the current pathway with the prior meaningful revision.
- Revisiting an earlier frame preserves the previous checksum-bound document.

## Verification

Run:

```bash
npm run verify:build1-phase2
npx tsx --test src/lib/research/researchPathwayPhase2.test.ts
npm test
npm run build
```

Deterministic reports are written to `output/build-1-phase-2-verification.json` and `output/build-1-phase-2-verification.md`.
