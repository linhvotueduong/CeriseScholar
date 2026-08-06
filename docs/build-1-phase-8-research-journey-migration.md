# Build 1 Phase 8 — Research Journey migration and review-before-apply

## Outcome

ScholarAsk now has one responsibility: academic source search, source interrogation, and evidence synthesis. Research framing support lives in the project-aware Research Mentor, where suggestions are structured, checksum-bound, and inert until the researcher reviews them.

This phase does not delete historical Research Journey work. On first local load, conversations containing a legacy `research_journey` assistant message move out of the active ScholarAsk conversation list and into a checksum-verified, read-only project archive. The archive can be inspected or exported as JSON. It is not evidence, current Mentor context, or a Stage 1 readiness signal.

## Responsibility boundary

| Product | Current responsibility | Explicitly excluded |
| --- | --- | --- |
| ScholarAsk | Search papers, synthesize evidence, inspect citations, save sources to the Evidence Library | Framing or selecting a research pathway |
| Research Mentor | Reflect, find bridges, narrow, map evidence, compare alternatives, propose next steps | Silent edits, approvals, novelty claims, or automatic readiness |
| Journey archive | Preserve exact historical local conversations for reading and export | AI generation, pathway writes, or completion credit |
| Stage 1 readiness | Derive completion from the canonical `ResearchPathwayDocument` | Query counts or historical Journey activity |

## Migration flow

1. Read the current and legacy ScholarAsk local-storage keys.
2. Normalize bounded conversation records.
3. Separate any conversation containing a `research_journey` response.
4. Merge it idempotently into `cerise:research-journey-archive:v1:<projectId>`.
5. Bind the archive to a SHA-256 checksum and retain exact message text.
6. Keep evidence-search conversations active in ScholarAsk.
7. Offer a mode-aware “Continue with Mentor” link without copying archive content into current Mentor context.

Malformed or checksum-invalid archive data remains inert. No database migration is required because the legacy conversations were device-local.

## Legacy compatibility

- Saved ScholarAsk URLs containing the old Journey mode render a migration notice and a valid Mentor destination.
- Old API clients sending `answerMode: research_journey` receive a bounded adapter response with the registered Mentor mode and destination. The request does not invoke the removed Journey prompt, alter the pathway, or affect readiness.
- The former free-form Markdown extractor and direct `projects.research_question` write are removed.
- The old Journey prompt branch is removed after parity tests prove that `find bridge`, `narrow`, and `map evidence` all resolve to registered Mentor modes.

## Review-before-apply decisions

Mentor canvas proposals remain separate alternatives. Before adding one, the researcher must either:

- accept the unchanged wording and record why it fits; or
- edit/correct the wording before adding it.

The Build 0 decision ledger records the outcomes as:

- accepted → `applied`;
- edited or corrected → `applied-after-edit`;
- kept outside the canvas → `kept-current`;
- dismissed → `dismissed`.

Reviewed insights saved to the Living Research Record also produce an accepted or edited decision. Prompts and chat transcripts remain excluded from decision records.

## Verification boundaries

- Historical text survives migration exactly and can be exported.
- Tampering invalidates the archive checksum.
- Running the migration twice does not duplicate conversations.
- The Research Journey toggle, starter buttons, Markdown pathway extraction, and direct pathway-save action are absent.
- ScholarAsk evidence queries still use the research-answer prompt.
- Legacy links continue into the correct Mentor capability.
- Mentor suggestions cannot update Stage 1 without freshness checks and explicit review.
- An empty canonical pathway remains not ready even when the Journey archive is populated.
- No remote deployment or database migration is part of Phase 8.
