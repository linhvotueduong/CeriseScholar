# Build 0 — Cross-stage Research Foundation

Status: implemented locally on 2026-08-03. Not deployed. The Supabase migration is authored but has not been applied to a connected environment.

## Outcome

Build 0 gives all eight Cerise Scholar stages one compatible research model. It is infrastructure, not a ninth user stage.

The foundation now provides:

- 38 canonical artifact definitions with explicit domain ownership and participant-data exclusions.
- A 71-edge acyclic dependency graph from route selection through preservation release.
- A deterministic route/applicability compiler with 12 representative workflow fixtures.
- Checksum-bound lifecycle evaluation and transitive stale-state propagation.
- An append-oriented Living Research Record that keeps planned, actual, reconciled, stale, and superseded knowledge distinct.
- A venue-neutral canonical manuscript AST and lossless bridge from existing `paper_sections` rows.
- Review-before-apply writing patches that reject changed or tampered bases.
- A unified researcher decision ledger that stores bounded decisions and checksums, not prompts or chat transcripts.
- A figure/table/supplement registry with provenance, accessibility, and rights gates.
- A versioned publication-template registry and exact project pins.
- Seven additive Supabase tables with owner/project RLS and supporting indexes.
- A protected advanced Foundation Inspector route at `/dashboard/project/{projectId}/foundation`.

## Architectural boundaries

Existing domain tables remain authoritative for editable payloads. `research_artifact_index` stores identity and lineage only. Build 0 does not copy participant rows, recordings, consent receipts, signatures, or uploaded file contents.

The existing `paper_sections` table is preserved. A project can be imported into the canonical manuscript without changing legacy text, and canonical saves can dual-write the legacy rows until the later publication composer is approved and proven.

AI output remains advisory. A writing patch must match the exact base manuscript checksum, every operation must receive an explicit researcher decision and reason, and at least one operation must be accepted before a new revision can be created.

## Persistence

Migration: `supabase/migrations/20260803090000_build0_research_foundation.sql`

Tables:

1. `research_artifact_index`
2. `project_route_profiles`
3. `research_knowledge_entries`
4. `manuscript_documents`
5. `research_decision_events`
6. `research_asset_records`
7. `project_template_pins`

Each table:

- references both the owning project and user;
- enables RLS;
- denies anonymous table access;
- checks both `user_id = auth.uid()` and project ownership;
- has foreign-key/RLS lookup indexes;
- bounds JSON payload sizes.

## Verification

Run:

```bash
npm run verify:build0
npm test
npx tsc --noEmit
npm run build
```

The deterministic report is written to:

- `output/build-0-foundation-verification.json`
- `output/build-0-foundation-verification.md`

Current verification:

- Build 0 acceptance: 16/16 passed.
- Complete automated suite: 286/286 passed.
- TypeScript: passed.
- Production build: passed.
- Focused ESLint for every Build 0 file: passed.
- Unauthorized browser access to the Inspector: redirected to login as intended.

Repository-wide `npm run lint` remains noisy and failing outside Build 0 because the current ESLint configuration scans historical `.next-*` QA build caches and existing unrelated source errors. Build 0 does not change or hide those unrelated findings.

## Activation sequence

1. Review the SQL migration and verification report.
2. Apply the migration to a non-production Supabase environment.
3. Open a signed-in project’s Foundation Inspector and confirm empty-state loading.
4. Wire Stage 1 route confirmation and each later stage save into the foundation persistence API in their approved stage builds.
5. Re-run the migration and owner-isolation tests before any production deployment.

Build 0 deliberately does not redesign Stage 1, build the Stage 8 publication composer, generate recruitment or conference posters, apply AI suggestions automatically, or deploy anything.
