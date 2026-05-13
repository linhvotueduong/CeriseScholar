# Local-First Agent Migration

Last updated: 2026-05-12

## Goal

Cerise Scholar should keep the real Next.js/Supabase app as the product surface while moving AI-heavy project work toward the user's laptop. Browser/cloud services coordinate account access, project navigation, and lightweight metadata. Local source files, local indexes, approval-gated vault actions, and Ollama-backed AI-heavy work belong to the Cerise Scholar Local Agent on the user's laptop.

## Local Agent Contract

- Base URL: `http://127.0.0.1:43110`
- Health endpoint: `GET /health`
- Local AI endpoint: `POST /ai/chat`
- Source-grounded AI endpoint: `POST /ai/source-chat`
- Vault creation endpoint: `POST /projects/create-vault`
- Source indexing endpoint: `POST /projects/index`
- Retrieval index endpoint: `POST /projects/build-retrieval-index`
- Storage usage endpoint: `GET /storage/usage`
- Cleanup preview endpoint: `POST /storage/cleanup-preview`
- Cleanup execution endpoint: `POST /storage/cleanup`

The Local Agent must not expose Ollama as a general-purpose proxy. The following Ollama endpoints are explicitly blocked by Cerise Scholar because they can create/import/push model assets and are outside the approved beta safety surface:

- `/api/create`
- `/api/blobs`
- `/api/push`

Required approval phrases:

- `CREATE_CERISE_SCHOLAR_VAULT`
- `READ_CERISE_SCHOLAR_SOURCES`
- `BUILD_CERISE_SCHOLAR_RETRIEVAL_INDEX`
- `CLEAN_CERISE_SCHOLAR_GENERATED_DATA`

## Product Rules

- The dashboard may check local-agent status from the browser.
- The browser must not silently install Ollama, download models, run terminal commands, or read project files.
- Mobile users can sign in and review lighter views, but AI-heavy/local-file features must show a laptop-required message.
- Full AI-heavy features are intended for a personal or trusted laptop, not a shared/public desktop.
- Ollama-backed features must stay blocked until Ollama is reachable, patched to at least `0.17.1`, listening only on localhost, and has an installed model.
- The Local Agent may call Ollama chat/model-readiness endpoints only. It must not proxy arbitrary Ollama endpoints or allow uploaded model files during beta.
- Cloud AI remains an explicit fallback only. Do not enable it accidentally through a renamed project, old repo, or hidden default.
- Source-file storage policy lives in `docs/local-file-storage-strategy.md`.
- New source-file workflows should use the Local Agent/local vault path, not new Supabase Storage uploads.

## Migration Status

Completed in this recovery pass:

- Local-agent scripts and safety contracts copied into the real Next.js repo.
- Dashboard-level Local Agent status card added.
- Read-only setup doctor added through `npm run local-agent:doctor`.
- Legacy guard script added through `npm run check:legacy`.
- ScholarAsk source discovery now prepares a local-agent prompt payload instead of requiring server AI synthesis.
- ScholarAsk answers, ScholarAsk source-panel analysis, PDF chat, Cerise Coach, and APA citation generation now call the laptop Local Agent from the browser.
- Mobile/no-agent/Ollama-not-ready states show laptop-required or Ollama-required messages instead of silently using server AI.
- Local file storage strategy documented.
- `npm run check:storage-strategy` added to prevent new cloud source-file storage paths outside the approved transitional allowlist.
- Dashboard local vault controls added with exact approval phrases for vault creation, source reading, retrieval index generation, storage measurement, cleanup preview, and generated-data cleanup.
- Post-signup dashboard onboarding added. It asks whether the user wants to use Cerise Scholar immediately or set up laptop AI first, shows an 8-15 minute setup estimate, checks the local agent on a timer, links to the official Ollama download, and explains that browser setup can guide and detect readiness but cannot silently install laptop software.
- Step 7.5 Ollama security gate added. Local AI stays blocked unless Ollama is patched, localhost-only, and running on a trusted personal laptop setup. The doctor now reports the gate, and the web UI shows a safety-check state instead of unlocking AI.
- Step 9 installer plan added in `docs/local-agent-installer-plan.md`. The public setup path is macOS-first, personal/trusted laptop only for full AI-heavy features, and explicitly separates webapp guidance from desktop software installation.
- Step 10 provider-gated setup-ready email path added. The setup popup can save a user's reminder preference, and when the same signed-in browser detects that local setup is ready it calls an authenticated server route. Real email only sends if `SETUP_READY_EMAILS_ENABLED=true`, `RESEND_API_KEY`, and `RESEND_FROM_EMAIL` are configured.

Still future work:

- Build the first internal Local Agent archive from the installer plan, then package/sign the Cerise Scholar Local Agent as a user-friendly laptop installer after separate approval.
- Add a background notification worker for "email me when laptop setup is ready" so delivery does not require the user's browser to remain open after setup completes.
- Add streaming/progress UI for longer local-agent generations.
- Build the local-vault source picker/indexing UI and gradually retire the transitional Supabase PDF path.
