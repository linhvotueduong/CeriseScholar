# Legacy Vite App Quarantine

Last updated: 2026-05-11

## Decision

The real Cerise Scholar app is the Next.js repository at:

- Local path: `/Users/mrperfect/Documents/CeriseScholar`
- GitHub repo: `linhvotueduong/CeriseScholar`
- Azure Static Web App: `cerise-scholar-main`
- Azure URL: `https://thankful-desert-03241fd0f.7.azurestaticapps.net`
- Active custom domain: `https://app.cerisescholar.com`

The sibling Vite repository named `Website` is quarantined as legacy and must not be treated as the Cerise Scholar product app.

## Do Not Use As Production

- Local path: sibling repo named `Website`
- GitHub repo: older lowercase Cerise Scholar repo
- Azure Static Web App: `cerise-scholar` (deleted from Azure during recovery)
- Azure default hostname: `https://icy-sky-033baac0f.7.azurestaticapps.net` (legacy only)

That repo may contain renamed Vite landing-page files, but those files are still from the wrong Vite app lineage and must not be copied into the real app UI.

Naming rule:

- Product name is exactly **Cerise Scholar**. Never call it "Cerise Scholara."
- `ScholarAsk` is a valid current feature name in the real app. Do not flag it as legacy merely because a case-insensitive search for `scholara` overlaps the first letters of `ScholarAsk`.

## Recovery Status

As of 2026-05-11:

- `app.cerisescholar.com` is stable on the real Next.js app after two clean sweeps.
- The wrong Azure Static Web App `cerise-scholar` has been deleted.
- The old Vite asset path no longer serves production JavaScript.
- The real repo contains only the `thankful-desert` Azure workflow.
- `npm run check:legacy` passes in the real repo.

The quarantined `Website` repo still contains legacy deployment material such as:

- `.github/workflows/azure-static-web-apps-icy-sky-033baac0f.yml`
- `APP_CERISESCHOLAR_DEPLOYMENT_CHECKLIST.md`
- `APP_CERISESCHOLAR_PRODUCTION_HANDOFF.md`
- `AZURE_FREE_DEPLOYMENT_PLAN.md`

Those files are historical only. Do not follow them for production deploys.

## Reusable Artifacts Only

Only these categories may be extracted from the legacy repo:

- Local agent scripts
- Mock local agent scripts
- Read-only setup doctor scripts
- Local permission and vault safety contracts
- Local-first architecture notes, rewritten for the Next.js/Supabase app

Do not port the Vite landing page, Vite app shell, Vite Azure workflow, or Cosmos/Vite workspace API as product code.

## Cleanup Rule

Keep this quarantine note until the real app has:

- Correct custom domain routing.
- Local-agent scripts and dashboard status checks.
- Passing `npm run check:legacy`, `npm run lint`, and `npm run build`.

The wrong Azure app is already deleted. The wrong repo should still be archived only after a separate backup note and explicit user approval. Do not delete or rewrite the sibling `Website` repo from this real app recovery branch.
