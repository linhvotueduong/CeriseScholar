# Build 2 Phase 6 — Source-linked Proposal Composer

Verified for: 2026-08-05

## Outcome

Stage 2 Step 6 is now a functional, source-linked proposal product. It composes the six existing Cerise proposal sections without changing their stable identities or silently rewriting legacy prose:

1. Background;
2. Statement of the Problem;
3. Literature Review;
4. Current Study;
5. Method and Materials; and
6. References.

Each section stores exact researcher-authored prose separately from its traceability metadata: synthesis claim IDs, included evidence-assessment IDs, Proposed Study Contract entry IDs, selected-profile requirement IDs, citation keys, project knowledge IDs, asset IDs, unresolved support notes, and explicit researcher review state.

This is the Stage 2 proposal. It is not the Stage 8 final publication manuscript and it does not certify facts, novelty, methodological validity, ethics or legal compliance, submission readiness, or funding approval.

## Researcher workflow

1. Inspect the selected proposal profile, citation style, aggregate word limit, current word count, and requirement coverage.
2. Read the route-aware writing lens derived from the canonical Stage 1 route.
3. Navigate the six canonical sections in a bounded sidebar.
4. Write or revise exact proposal prose.
5. Link current Phase 4 synthesis claims. Linking a claim also links its currently included supporting evidence, but never inserts prose.
6. Optionally choose **Insert as editable note** to place the exact claim and its recorded boundary into the editor. This requires a researcher action and remains editable working text.
7. Link every current Proposed Study Contract entry in Current Study and Method/Materials.
8. Link included evidence, selected requirements, citation keys, project knowledge, and registered assets.
9. Record unsupported, contested, provisional, or wording limitations explicitly.
10. Inspect section and proposal integrity issues.
11. Mark the current section reviewed only after checking its current prose and provenance.
12. Save an incomplete draft at any time; continue only when readiness is derived from the current artifact graph.

Any prose or provenance change resets that section's review state. A previous review therefore cannot silently cover changed writing.

## Six distinct section contracts

The composer does not treat the six sections as interchangeable text boxes.

- **Background** requires at least one current background, known, or contested claim.
- **Statement of the Problem** requires both the bounded gap and why it matters.
- **Literature Review** requires current synthesis claims and included evidence provenance.
- **Current Study** requires the bounded gap, significance, or proposed contribution and must trace every current research-question contract.
- **Method and Materials** must trace every current research-question contract and the relevant method/profile requirements.
- **References** must cover every evidence assessment used in narrative sections and retain at least one inspectable citation or reference identifier for each.

Claim links are closed over currently included evidence. If a linked claim depends on an included assessment, that assessment must also be linked to the section. A formerly included, excluded, or missing assessment cannot satisfy the contract. Unsupported claims require an explicit support-limit note.

## Derived readiness

Step 6 becomes ready only when:

- the current Proposal Requirements Profile is reconfirmed and source-current;
- Phase 4 synthesis is ready and its review ledger has no unresolved device/cloud conflict;
- the current Proposed Study Contract is ready;
- all six canonical sections exist exactly once and contain prose;
- each section has been explicitly reviewed against its current prose and provenance;
- section-specific claim and contract responsibilities are satisfied;
- all claim-to-included-evidence links are closed;
- every required profile item maps to at least one section;
- References covers all narrative evidence;
- no link targets a stale or unknown claim, assessment, contract entry, or requirement; and
- the total word count does not exceed the selected profile limit, when one exists.

Readiness is derived, not a completion checkbox. Additional legacy or custom sections are preserved and shown as advisory compatibility content; they do not replace any of the six canonical responsibilities.

## Route-aware scholarly behavior

### Quantitative primary research

Prompts align design, sample or assignment, measures, comparison, analysis, inference, bias reduction, missingness, exclusions, uncertainty, and sensitivity work. The proposal does not claim that the study is implemented, sufficiently powered, or validated.

### Qualitative primary research

Prompts keep context, sampling logic, researcher positioning, reflexivity, participant meaning, analytic tradition, and divergent cases visible. Cerise does not invent hypotheses, variables, power calculations, or effect-size language for interpretive work.

### Mixed-methods research

Prompts require a reason for mixing, preserve each strand, expose timing and priority, identify the point of integration, and require a plan for divergence. Every question must map to a strand or integration responsibility capable of answering it.

### Secondary-data research

Prompts distinguish the scientific question from what the selected dataset or records can represent. Version, provenance, population coverage, measurement fit, missingness, access, licensing, linkage, and transformation limitations remain visible.

### Evidence synthesis

Prompts treat the proposal as a protocol and expose eligibility, information sources, selection, appraisal, synthesis direction, and search limitations. Cerise does not claim protocol registration, completeness, or reporting compliance.

## Authority and format boundary

The Phase 6 registry stores six dated, HTTPS-linked sources:

- [NIH Advice on Application Sections](https://grants.nih.gov/grants-process/write-application/advice-on-application-sections)
- [UKRI ESRC: How to write a good application](https://www.ukri.org/councils/esrc/guidance-for-applicants/how-to-write-a-good-application/)
- [UKRI core application section questions and assessment](https://www.ukri.org/apply-for-funding/develop-your-application/responsive-mode-opportunities-funding-service-core-application-section-questions-and-assessment/)
- [PRISMA-P](https://www.prisma-statement.org/protocols)
- [SPIRIT 2025](https://jamanetwork.com/journals/jama/fullarticle/2833408)
- [EQUATOR's definition of a reporting guideline](https://www.equator-network.org/about-us/what-is-a-reporting-guideline/)

These sources inform completeness and traceability prompts only. The selected institution, funder opportunity, degree program, journal, or researcher-defined profile remains controlling. Reporting guidelines are not design prescriptions, quality scores, factual verification, format compliance, or approval. Phase 6 does not reproduce licensed checklist text.

## Persistence and compatibility

The `ResearchProposalDocument` owns all section prose and traceability. Saving:

- creates a new deterministic canonical proposal revision and checksum;
- keeps exact Stage 1 source lineage;
- updates the verified project-scoped device cache;
- uses the existing serialized optimistic cloud write and explicit conflict resolution;
- projects the same six exact prose fields into the existing `paper_sections` compatibility store; and
- never stores participant rows, chat transcripts, or generated proposal prose.

The Phase 1 Supabase migration remains unapplied. Phase 6 works through the existing local-first and compatibility paths until that migration is explicitly approved and applied.

## User-interface architecture

The workspace follows the accepted Stage 2 visual system: profile and route context at the top, a bounded section navigator, a large researcher-owned editor, collapsible provenance drawers, explicit review, integrity findings, and a sticky save/handoff footer.

Large source lists use deferred compilation and browser rendering containment. The desktop two-column workspace collapses into a single-column layout with a horizontally scrollable section selector on compact screens. Saving remains available for incomplete drafts.

No AI endpoint is invoked. Deterministic notes are inserted only after an explicit researcher action. A future writing copilot must use the Build 0 writing-patch and AI review ledger boundaries; it cannot silently modify the canonical proposal.

## Verification

Run:

```bash
npm run verify:build2-phase6
npx tsx --test src/lib/research/proposalCompositionPhase6.test.ts
npx tsc --noEmit
```

Generated reports:

- `output/build-2-phase-6-verification.json`
- `output/build-2-phase-6-verification.md`

The independent report covers 12 canonical route fixtures and 20 acceptance responsibilities: six-section compatibility, exact legacy preservation, independent content/review state, upstream gates, claim/evidence closure, distinct rhetorical contracts, question-contract coverage, requirement and word-limit derivation, route-specific scholarly integrity, authority boundaries, researcher-controlled insertion, functional Stage 2 readiness, canonical plus compatibility persistence, responsive performance, and non-activation boundaries.

The Browser plugin was listed during QA, but its required callable browser-control runtime was not exposed in this session. The testing policy does not permit silently substituting standalone Playwright without prior authorization, so authenticated rendered interaction, console, viewport, and screenshot checks remain explicitly unverified. HTTP health checks are recorded separately from rendered verification.

## Activation boundary

- Build 2 Phase 1 Supabase migration applied: no.
- Remote deployment performed: no.
- Participant rows or responses stored: no.
- AI proposal prose generated or applied: no.
- Final Stage 8 manuscript composed: no.
- Factual verification, novelty, methodological validation, ethics/legal compliance, submission certification, or funding approval: no.
