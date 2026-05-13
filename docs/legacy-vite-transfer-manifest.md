# Legacy Vite Transfer Manifest

Last updated: 2026-05-11

This manifest records what may and may not be reused from the quarantined Vite repo at `/Users/mrperfect/Documents/Website`.

## Source Of Truth

Real Cerise Scholar app:

- Local path: `/Users/mrperfect/Documents/CeriseScholar`
- GitHub repo: `linhvotueduong/CeriseScholar`
- Framework: Next.js
- Azure Static Web App: `cerise-scholar-main`
- Azure default URL: `https://thankful-desert-03241fd0f.7.azurestaticapps.net`
- Active custom domain: `https://app.cerisescholar.com`

Quarantined legacy app:

- Local path: `/Users/mrperfect/Documents/Website`
- Framework: Vite
- Deleted Azure Static Web App: `cerise-scholar`
- Deleted/legacy default URL: `https://icy-sky-033baac0f.7.azurestaticapps.net`

## Reusable Artifacts

These legacy files were identified as reusable only as reference material. They must be reviewed and adapted to the real Next.js app before use.

- `/Users/mrperfect/Documents/Website/scripts/local-agent.mjs`
- `/Users/mrperfect/Documents/Website/scripts/mock-local-agent.mjs`
- `/Users/mrperfect/Documents/Website/scripts/local-agent-doctor.mjs`
- `/Users/mrperfect/Documents/Website/scripts/local-permission-contract.mjs`
- `/Users/mrperfect/Documents/Website/scripts/local-vault-contract.mjs`
- `/Users/mrperfect/Documents/Website/CERISE_SCHOLAR_LOCAL_FIRST_AGENT_BUILD_PLAN.md`

Current real-repo counterparts already exist:

- `scripts/local-agent.mjs`
- `scripts/mock-local-agent.mjs`
- `scripts/local-agent-doctor.mjs`
- `scripts/local-permission-contract.mjs`
- `scripts/local-vault-contract.mjs`
- `docs/local-first-agent-migration.md`

Future work should verify the real-repo versions directly. Do not re-copy the legacy files over the real files.

## Do Not Transfer

Do not copy or deploy these legacy materials into the real app:

- Vite UI/app shell: `index.html`, `vite.config.js`, `src/main.jsx`, `src/CeriseScholarApp.jsx`
- Legacy build output: `dist/`
- Legacy Azure workflow: `.github/workflows/azure-static-web-apps-icy-sky-033baac0f.yml`
- Legacy production/deploy docs: `APP_CERISESCHOLAR_DEPLOYMENT_CHECKLIST.md`, `APP_CERISESCHOLAR_PRODUCTION_HANDOFF.md`, `AZURE_FREE_DEPLOYMENT_PLAN.md`
- Legacy local data: `data/workspaces.json`
- Legacy API folder: `api/`
- Legacy environment files: `.env`, `.env.example`

## Active Guardrails

- `npm run check:legacy` must pass before deployment.
- The real repo must only deploy through `.github/workflows/azure-static-web-apps-thankful-desert-03241fd0f.yml`.
- Any reference to `icy-sky`, `Scholara`, `scholara_`, `CeriseScholarApp`, `ScholaraApp`, or `/Users/mrperfect/Documents/Website` in active production paths should be treated as a blocker.
- The sibling `Website` repo should not be deleted or rewritten without explicit user approval and a backup/archive note.
