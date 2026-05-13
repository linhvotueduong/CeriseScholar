# Deploying Cerise Scholar

Cerise Scholar currently deploys to Azure Static Web Apps Free.

Before changing deployment, DNS, Azure, Cloudflare, billing-sensitive resources, or preview-server behavior, read:

- `docs/azure-static-webapps-safety-protocol.md`
- `docs/legacy-vite-quarantine.md`

## Current Live Target

- Azure Static Web App: `cerise-scholar-main`
- Resource group: `cerise-scholar-free-rg`
- SKU: Free
- Azure default URL: `https://thankful-desert-03241fd0f.7.azurestaticapps.net`
- Custom subdomain: `https://app.cerisescholar.com`

Do not use the older wrong Static Web App for the real app:

- `cerise-scholar`
- the sibling Vite repo named `Website`
- the older lowercase GitHub repo with the same app-like name

## Required Safety Flow

1. Run and review a local preview first.
2. Use a unique local port if another Codex/chat session is active.
3. Verify the change remains inside Azure Static Web Apps Free limits.
4. Confirm no paid Azure resources are being created or upgraded.
5. Ask the user for explicit final approval before deploying.
6. After deployment, verify both the Azure default URL and `https://app.cerisescholar.com`.

## Local Preview

Check for active preview servers first:

```bash
lsof -nP -iTCP -sTCP:LISTEN | grep -E ':(3000|3001|3002|3003|3004)'
```

Start on a free port:

```bash
npm run dev -- -p 3001
```

If `3001` is already used by another session, choose the next free port and tell the user which preview belongs to this session.

## Pre-deploy Checks

```bash
git status --short
npm run lint
npm run check:legacy
npm run build
du -sh .next
find .next -type f | wc -l
```

Do not stage unrelated dirty files. This project may contain cleanup changes, generated folders, or work from another session.

## After Feature Work

To save Mac storage, offer safe generated-cache cleanup after the user is done previewing. Safe examples include `.next/cache` or temporary build caches. Do not delete source code, assets, PDFs, `.env*`, Supabase data, docs, or anything with unclear ownership.

## Legacy Cloudflare Tunnel Note

The old Cloudflare Tunnel setup was replaced for `app.cerisescholar.com`. Do not restore the tunnel route unless the user explicitly requests a rollback plan.

`cerisescholar.com` root and `www` are intentionally reserved for later and must not be switched without explicit approval.
