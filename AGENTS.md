<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Cerise Scholar Safety Protocol

Before changing deployment, domain, Azure, Cloudflare, Supabase, auth, billing, or preview-server behavior, read:

- `docs/azure-static-webapps-safety-protocol.md`
- `docs/legacy-vite-quarantine.md`
- `docs/local-first-agent-migration.md`
- `docs/local-agent-installer-plan.md`

Current production-safe target:

- Azure Static Web App: `cerise-scholar-main`
- Azure resource group: `cerise-scholar-free-rg`
- Azure default URL: `https://thankful-desert-03241fd0f.7.azurestaticapps.net`
- Active custom subdomain: `https://app.cerisescholar.com`
- Do not use the older wrong Static Web App `cerise-scholar` for the real app.
- Do not use the sibling Vite repo named `Website` as the product app; it is quarantined legacy material.
- Product name is exactly **Cerise Scholar**. Never call it "Cerise Scholara."
- `ScholarAsk` is a valid current feature name. Do not confuse the `ScholarAsk` substring with the old/wrong "Scholara" project name.

Deployment rules:

- Always preview locally first and ask for user approval before deploying.
- Before deploying, verify the change still fits Azure Static Web Apps Free limits and does not create paid Azure resources.
- Do not switch `cerisescholar.com` root or `www` unless the user explicitly approves that exact domain switch.
- When multiple sessions are active, each session must use a unique preview port and must not stop or overwrite another session's preview server.
- After finishing feature/function work, offer safe generated-cache cleanup to save Mac storage; never delete source code, assets, user data, `.env*`, Supabase data, or project documents as "cache."
- Run `npm run check:legacy` before deployment to prevent wrong-app material from re-entering active production paths.
- Run `npm run check:storage-strategy` before deployment-sensitive source-file work. New research source files should go through the Local Agent/local vault path, not new Supabase Storage upload/download paths.
