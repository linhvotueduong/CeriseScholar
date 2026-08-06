# Build 2 Phase 5 — Proposed Study Contract

Verified for: 2026-08-05

## Outcome

Stage 2 Step 5 is now a functional proposal product rather than a free-text roadmap. It converts every selected Stage 1 research question and its researcher-reviewed Phase 4 gap into one inspectable contract entry with six separate responsibilities:

1. the question's purpose in the proposed study;
2. the evidence needed to answer it;
3. the relevant population, source, case, dataset, material, or evidence unit;
4. the proposed method direction;
5. the proposed analysis direction; and
6. the uncertainty that Stage 3 still needs to resolve.

The contract also records cross-question feasibility and resources, access and permissions, and ethics, rights, privacy, and sensitivity considerations. It remains proposal-level intent: it does not create a runnable study, validate a method, calculate power, issue an ethics or compliance determination, preregister a study, or approve collection.

## Product workflow

The Step 5 studio shows the exact canonical Stage 1 route, including setting, assignment, audience, data sensitivity, and possible special procedures. It then presents route-specific scholarly prompts, a bounded research-question navigator, the exact researcher-reviewed Phase 4 gap linked to the active question, six structured planning fields, cross-question handoff fields, derived integrity issues, and the authority boundary.

The normal researcher flow is:

1. Inspect the Stage 1 route and route-specific planning lens.
2. Select a question contract.
3. Review its Stage 1 scope and exact Phase 4 gap.
4. Define the six question-level responsibilities.
5. Define feasibility, access, and ethics/sensitivity responsibilities for the whole proposal.
6. Review blockers and advisories.
7. Save the draft at any time.
8. Continue only when readiness is derived as complete.

Suggestions are editable starting points. They never overwrite researcher prose automatically, select a method, or mark an entry complete.

## Derived readiness contract

Step 5 becomes ready only when:

- the current Phase 4 synthesis is ready and its source-review ledger has no unresolved conflict;
- at least one current Stage 1 question is selected;
- the Stage 1 intent and method family are determined;
- the contract's full route snapshot matches the current Stage 1 intent, method family, assignment, setting, audience, data sensitivity, and possible special procedures;
- exactly one contract entry exists for every selected question;
- no entry belongs to a deselected question;
- every selected question retains a researcher-reviewed Phase 4 gap;
- all six question-level responsibilities contain researcher-authored content; and
- feasibility, access, and ethics/sensitivity handoff notes are all present.

Randomization, protected audiences, restricted or identifiable data, and special procedures create visible Stage 3 advisories. They do not create false Phase 5 blockers where the unresolved responsibility genuinely belongs to implementation and governance in Stage 3.

## Route and change architecture

The contract stores a complete route snapshot. A change from laboratory to online/home, randomized to non-randomized, adult to minor, public to restricted data, or any change in possible procedures is therefore detectable even when intent and method family stay the same.

When route drift occurs, Cerise preserves every contract entry and displays an explicit review action. The researcher must inspect the consequences and choose **Align after review**. This prevents silent reinterpretation of previously written method, access, analysis, or ethics plans.

When selected questions change, the draft reconciler:

- creates one stable empty entry for every newly selected question;
- does not duplicate an already represented question; and
- preserves entries for removed questions until the researcher explicitly removes them.

No prose is silently deleted.

## Route-specific behavior

### Quantitative primary research

Prompts align population and units, sampling or assignment, measures, comparison, analysis, inference, bias reduction, missingness, exclusions, uncertainty, and sensitivity checks. Reporting guidance is used only to expose missing planning responsibilities.

### Qualitative primary research

Prompts align qualitative tradition, context, sampling logic, data generation, analytic approach, reflexivity, participant meaning, and divergent cases. The product does not force hypotheses, variables, statistical power, or effect-size fields onto interpretive work.

### Mixed-methods primary research

Prompts require a reason for mixing, clear strand-specific samples or sources, timing, priority, dependency, a visible point of integration, and a plan for divergence. Suggested designs remain editable proposal directions, not automatic selections.

### Secondary-data research

Prompts separate the scientific question from what a dataset can validly represent. They expose source and version provenance, analysis units, period and coverage, required variables, permissions, linkage, measurement fit, missingness, and reproducible transformations.

### Evidence synthesis

Prompts define eligible evidence units, information sources, selection, appraisal, and synthesis direction. The contract can support systematic, scoping, qualitative, mixed-method, or mapping directions without claiming that the protocol has been implemented or registered.

## Scholarly guidance boundary

The Phase 5 registry pins seven current sources:

- [NIH rigor and reproducibility](https://www.grants.nih.gov/policy-and-compliance/policy-topics/reproducibility) informs prospective attention to rigor, bias, reproducibility, and transparency.
- [STROBE in the EQUATOR registry](https://www.equator-network.org/reporting-guidelines/strobe/) informs quantitative completeness prompts while remaining explicitly a reporting guideline.
- [JARS-Qual and MMARS in the EQUATOR registry](https://www.equator-network.org/reporting-guidelines/journal-article-reporting-standards-for-qualitative-primary-qualitative-meta-analytic-and-mixed-methods-research-in-psychology-the-apa-publications-and-communications-board-task-force-report/) informs qualitative and mixed-method completeness prompts.
- [NIH OBSSR mixed-methods guidance](https://obssr.od.nih.gov/research-resources/mixed-methods-research) informs purpose, timing, priority, integration, and strand integrity.
- [UK Data Service study-level documentation](https://ukdataservice.ac.uk/learning-hub/research-data-management/document-your-data/study-level-documentation/) informs secondary-data provenance and documentation responsibilities.
- [PRISMA-P](https://www.prisma-statement.org/protocols) informs evidence-synthesis protocol completeness.
- [HHS OHRP guidance registry](https://www.hhs.gov/ohrp/regulations-and-policy/guidance/index.html) keeps human-subjects questions visible for institutional resolution.

Every source is stored with its role, version, HTTPS URL, access date, and the same boundary: a planning prompt is not a design prescription, quality score, compliance determination, or approval. Cerise paraphrases responsibilities and does not reproduce a licensed checklist.

## Canonical persistence and continuity

The `ProposedStudyContract` is owned by the canonical `ResearchProposalDocument`. Saving creates a new proposal revision and checksum, retains exact Stage 1 source lineage, writes the project-scoped verified device cache, and uses the existing serialized optimistic cloud write. If device and secure versions both changed, the existing explicit version-choice flow remains authoritative.

The old theme/short-term/medium-term/long-term roadmap and long-term vision fields remain editable in a collapsed continuity panel. They are optional planning context and do not satisfy the canonical contract.

## Verification

Run:

```bash
npm run verify:build2-phase5
npx tsx --test src/lib/research/proposalStudyContractPhase5.test.ts
npx tsc --noEmit
```

Generated reports:

- `output/build-2-phase-5-verification.json`
- `output/build-2-phase-5-verification.md`

The report covers all 12 canonical route fixtures and 20 acceptance responsibilities: question cardinality, draft reconciliation, full route drift, the six entry fields, global handoff notes, current-gap lineage, route-specific scholarly integrity, authority boundaries, legacy roadmap continuity, readiness, optimistic persistence, responsive performance, and non-activation safeguards.

Final local verification also passed the 399-test repository suite, TypeScript, all Build 2 Phase 1–5 verification reports, focused Phase 5 lint, and the optimized Next.js production build. Full-repository lint completed with zero errors and 17 pre-existing warnings outside the Phase 5 files.

The Browser plugin was listed during QA, but its required callable browser-control runtime was not exposed in this session. The testing policy does not permit silently substituting standalone Playwright without prior authorization, so authenticated rendered interaction, console, viewport, and screenshot checks remain explicitly unverified. HTTP health checks confirmed that `http://localhost:3020/login` returns 200 and the unauthenticated project route redirects to login rather than returning an internal server error.

## Activation boundary

- The Build 2 Phase 1 Supabase migration remains unapplied.
- No remote deployment was performed.
- No participant rows or responses were stored.
- No AI method or study decision was generated or applied.
- No methodology, ethics, legal compliance, preregistration, or approval status was certified.
