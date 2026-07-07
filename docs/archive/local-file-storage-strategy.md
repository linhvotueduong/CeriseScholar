# Local File Storage Strategy

Last updated: 2026-05-12

## Purpose

Cerise Scholar is moving from cloud-stored research PDFs toward a laptop-first source-file model. The web app remains the account, navigation, metadata, and learning surface. User source files, generated source indexes, local vault metadata, and AI-heavy source work should live on the user's laptop through the Cerise Scholar Local Agent.

This keeps the public laptop beta aligned with the product promise:

- source files stay on the user's device by default;
- AI-heavy work uses the user's laptop agent and Ollama when available;
- mobile users can sign in and review lighter workspace state, but local-file and AI-heavy features require the laptop;
- cloud storage remains a transitional compatibility path, not the future default.

## Storage Classification

### Local-Only

These should be handled through the Cerise Scholar Local Agent and the local vault:

- original PDFs, DOCX files, datasets, notes exports, and source folders selected by the user;
- extracted document text used for AI synthesis;
- OCR outputs generated from local source files;
- vector/retrieval indexes;
- local source manifests;
- temporary AI context bundles;
- cleanup previews and cleanup execution for generated vault data.

The local vault folder is `.cerise-scholar/` inside the user-selected project folder. Original user files are not deleted by cleanup. Generated vault cleanup requires the approval phrase `CLEAN_CERISE_SCHOLAR_GENERATED_DATA`.

### Cloud Metadata

These can remain in Supabase because they are lightweight app state:

- user auth profile and beta agreement metadata;
- project names, descriptions, colors, and timestamps;
- course enrollment/progress;
- admin course/module/video records;
- literature-review rows that contain citations, highlights, notes, code labels, and local source references;
- paper-writer sections;
- meta-analysis settings/results where the user explicitly saves structured outputs;
- local-agent status summaries that do not include source file contents.

Cloud metadata must not include raw full-text source content unless the user explicitly opts into a future cloud-storage feature.

### Transitional Cloud File Storage

The current app still has a legacy Supabase Storage PDF path. It is allowed only so the product remains usable while local-vault UI is migrated.

Approved transitional files:

- `src/app/dashboard/upload/page.tsx`
- `src/components/pdf/DocumentPanel.tsx`
- `src/app/dashboard/viewer/[id]/page.tsx`
- `src/app/dashboard/project/[projectId]/page.tsx`
- `src/app/dashboard/project/[projectId]/viewer/[id]/page.tsx`
- `src/app/api/ocr/route.ts`
- `src/app/dashboard/page.tsx`

No new source-file cloud storage locations should be added. Run `npm run check:storage-strategy` before deploy-sensitive work.

## Migration Path

1. Keep current Supabase PDF upload/viewer behavior as a temporary legacy path.
2. Add local-vault UI that lets laptop users create or connect a local project vault.
3. Add source selection/indexing through the Local Agent using `READ_CERISE_SCHOLAR_SOURCES` and `BUILD_CERISE_SCHOLAR_RETRIEVAL_INDEX`.
4. Add local source references to metadata rows so literature review, paper writer, and ScholarAsk can point back to local sources without uploading originals.
5. Shift new PDF/source upload controls to "Add local sources" on laptop. Mobile should show a laptop-required message.
6. Keep old cloud PDFs readable for existing users until there is a clear export/migrate/delete flow.
7. After migration is stable, remove the transitional cloud PDF upload path and the Supabase Storage dependency for source files.

## UX Rules

- Laptop with Local Agent: show local vault/source controls.
- Laptop without Local Agent: show setup/status and do not expose file-read actions as if they will work.
- Mobile: allow sign-in and light review, but show a laptop-required message for source files, vaults, OCR, indexes, and AI-heavy work.
- Cleanup suggestions should target generated vault data first. Suggest deleting completed projects only as a user choice, never automatic deletion.

## Guardrail

`npm run check:storage-strategy` fails when a new `supabase.storage`, signed URL, upload, or download reference appears outside the transitional allowlist.

If a future session truly needs a temporary exception, update this document first with:

- why the exception is needed;
- which file owns it;
- when it should be removed;
- how the user is informed that this is cloud file storage.
