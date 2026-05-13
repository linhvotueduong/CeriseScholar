# Azure Static Web Apps Safety Protocol

Last updated: 2026-05-09

This file records the current Cerise Scholar Azure/Cloudflare state and the safety protocol for future Codex sessions. Read it before touching deployment, DNS, Cloudflare, Azure resources, billing-sensitive features, or preview servers.

## Current Live Hosting State

Cerise Scholar is hosted on Azure Static Web Apps Free.

Primary live app:

- Azure Static Web App: `cerise-scholar-main`
- Resource group: `cerise-scholar-free-rg`
- Region: East US 2
- SKU: Free
- Azure default URL: `https://thankful-desert-03241fd0f.7.azurestaticapps.net`
- Custom subdomain: `https://app.cerisescholar.com`
- GitHub deployment workflow: Azure Static Web Apps CI/CD on the CeriseScholar repo

Important DNS state:

- `app.cerisescholar.com` is a Cloudflare DNS-only CNAME pointing to `thankful-desert-03241fd0f.7.azurestaticapps.net`.
- `cerisescholar.com` root is intentionally not switched to Azure yet.
- `www.cerisescholar.com` is intentionally not switched to Azure yet.
- The old Cloudflare Tunnel route for `app` was replaced. Do not restore it unless the user explicitly requests rollback.

Do not use for the real app:

- Azure Static Web App: `cerise-scholar`
- Local wrong repo: the sibling Vite repo named `Website`
- GitHub wrong repo: the older lowercase Cerise Scholar repo

The wrong Vite app is quarantined in `docs/legacy-vite-quarantine.md`. Do not deploy it, copy its UI, or treat renamed Vite landing-page files as real Cerise Scholar product code.

## Safety Rules For Future Sessions

1. Preview before deploy.

   Every UI, API, auth, or feature change must be tested locally first. Give the user the local preview URL and ask for approval before deployment.

2. Keep preview sessions separate.

   The user may run multiple Codex/chat sessions at once. Each session must:

   - Check active ports before starting a dev server.
   - Use a unique local port, such as `3000`, `3001`, `3002`, or the next free port.
   - Tell the user which port belongs to this session.
   - Avoid killing, reusing, or overwriting another session's server.
   - Avoid editing another session's branch/worktree unless explicitly asked.

3. Do not deploy without explicit final approval.

   Even if local tests pass, stop before live deployment and ask the user to approve deployment. Deployment approval must be specific to the change being shipped.

4. Check Azure Free limits before deployment.

   Before deploying, verify the change does not push the app outside Azure Static Web Apps Free boundaries. As of Microsoft Learn docs checked on 2026-05-07, key Free-plan limits include:

   - Max app size: 250 MB per app
   - Total storage: 500 MB across all environments
   - Preview environments: 3 per app
   - Custom domains: 2 per app
   - Included bandwidth: 100 GB/month
   - File count: 15,000

   Treat these as current known limits, not permanent facts. If a deployment, storage, billing, plan, or quota decision depends on them, re-check official Microsoft docs.

5. Do not create paid resources casually.

   Never create or upgrade these without a separate safety review and explicit user approval:

   - Azure Static Web Apps Standard plan
   - Azure Functions outside the managed/free Static Web Apps setup
   - Azure Cosmos DB beyond the already discussed free-tier design
   - Azure Storage accounts
   - Azure AI/OpenAI/Cognitive Services
   - Application Insights with unexpected ingestion costs
   - Any paid marketplace/resource add-on

6. Keep secrets safe.

   Never commit API keys, Supabase secrets, OpenAI keys, Azure tokens, Cloudflare tokens, or `.env.local`. Use Azure Static Web Apps configuration/environment variables for live secrets.

7. Protect domains.

   Do not change DNS for these without explicit approval:

   - `cerisescholar.com`
   - `www.cerisescholar.com`

   The currently approved custom domain is only:

   - `app.cerisescholar.com`

8. Work with dirty git safely.

   This repo may contain unrelated user changes or cleanup changes. Do not revert, delete, or stage unrelated files. Commit only the intended files for the active task.

9. Clean generated caches safely after feature work.

   The user's Mac storage is limited. At the end of feature/function work, offer to remove unnecessary generated caches that are safe to regenerate, especially when build/dev steps created them.

   Safe cleanup candidates:

   - `.next/cache`
   - `.next` after the user is done previewing that local build
   - temporary build/test cache folders created during the session

   Never delete as "cache":

   - source code
   - `public/` assets
   - uploaded PDFs or user research data
   - `.env*` files
   - Supabase data/config
   - project notes, docs, or handoff files
   - files with unclear ownership or purpose

   Before deleting anything outside obvious generated caches, ask the user first. Prefer reporting the expected storage savings before cleanup.

## Recommended Preview Workflow

Use this pattern when starting work:

```bash
git status --short
lsof -nP -iTCP -sTCP:LISTEN | grep -E ':(3000|3001|3002|3003|3004)'
npm run dev -- -p 3001
```

Pick a free port. If another session is already using `3001`, choose another port and tell the user.

Before asking for deployment approval:

```bash
npm run lint
npm run build
du -sh .next
find .next -type f | wc -l
git status --short
```

If `npm run build` creates a standalone/server bundle that is not exactly the Azure artifact, still use it as a safety signal, then rely on GitHub Actions/Azure deployment logs for the final artifact check.

## Recommended Deployment Checklist

Before deployment:

- Confirm the user approved this exact deployment.
- Confirm this branch contains only intended changes.
- Run `npm run check:legacy`.
- Confirm app size/file count are comfortably inside Azure Static Web Apps Free limits.
- Confirm no new paid Azure resources are required.
- Confirm domain behavior will remain `app.cerisescholar.com` unless the user explicitly asks otherwise.

After deployment:

- Check GitHub Actions / Azure Static Web Apps CI/CD succeeded.
- Verify `https://thankful-desert-03241fd0f.7.azurestaticapps.net`.
- Verify `https://app.cerisescholar.com`.
- Verify at least one public route, one protected route redirect, and any changed feature.
- Report what was deployed and what was not changed.

## Sources To Re-check When Costs Or Domains Matter

- Azure Static Web Apps quotas: https://learn.microsoft.com/en-us/azure/static-web-apps/quotas
- Azure Static Web Apps hosting plans: https://learn.microsoft.com/azure/static-web-apps/plans
- Azure Static Web Apps custom domain with external DNS: https://learn.microsoft.com/azure/static-web-apps/custom-domain-external
- Azure free account and avoiding charges: https://learn.microsoft.com/azure/cost-management-billing/manage/avoid-charges-free-account
- Azure spending limit: https://learn.microsoft.com/azure/cost-management-billing/manage/spending-limit
