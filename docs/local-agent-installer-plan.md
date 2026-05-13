# Cerise Scholar Local Agent Installer Plan

Last updated: 2026-05-12

## Purpose

Cerise Scholar needs a user-friendly laptop setup path. The web app can guide, detect, and explain setup, but it must not silently install desktop software, download models, run terminal commands, or read project files from the browser.

This plan turns the current developer scripts into a future packaged Cerise Scholar Local Agent installer.

## Current Developer Setup

The current local setup is suitable for development only:

- `npm run local-agent`
- `npm run local-agent:doctor`
- `npm run mock:local-agent`
- `npm run dev:local`

It assumes Node.js, a cloned repo, terminal comfort, and manual Ollama setup. Public beta users should not need this path.

## Target User Setup

### macOS First

The first packaged installer should target macOS because the current tested local environment is macOS with Ollama Desktop.

User-facing flow:

1. User signs up or opens the dashboard on a personal/trusted laptop.
2. Cerise Scholar shows the local setup prompt.
3. User chooses `Set up laptop AI first`.
4. Cerise Scholar explains:
   - setup usually takes 8-15 minutes;
   - the laptop should stay open and connected;
   - full AI-heavy features are for personal/trusted laptops, not public/shared desktops.
5. User downloads the official Ollama Desktop app from `https://ollama.com/download`.
6. User downloads the Cerise Scholar Local Agent installer.
7. The Local Agent installer:
   - installs/runs the Local Agent on `127.0.0.1:43110`;
   - starts on login only if the user chooses that option;
   - never exposes the agent on a public network interface;
   - checks Ollama version and localhost binding;
   - asks before pulling an approved starter model;
   - shows readiness and errors in plain language.
8. The web app detects readiness through `GET http://127.0.0.1:43110/health`.

### Windows Later

Windows support should be a separate phase. Do not advertise full Windows setup until the installer can handle:

- official Ollama installation/update path;
- Windows firewall prompts;
- startup registration;
- localhost binding checks;
- extra caution around Ollama updater/security advisories;
- uninstall instructions.

### Public/Shared Desktop Rule

Cerise Scholar full local AI setup is intended for a personal or trusted laptop.

Shared/public desktops should be treated as light-review devices only because:

- local source files may remain on disk;
- model caches can be large;
- background services may continue running;
- browser profiles/localStorage may persist user metadata;
- other people may have OS-level access.

## Installer Responsibilities

The Local Agent installer should own:

- placing the Local Agent executable/app in the right OS location;
- creating an app launcher;
- optional start-on-login registration;
- opening a local status window or tray/menu-bar item;
- checking Ollama version;
- checking Ollama localhost-only binding;
- pulling an approved starter model only after user approval;
- starting/restarting the Local Agent;
- displaying logs/status without exposing secrets;
- uninstall guidance.

The web app should own:

- account login/signup;
- setup explanation and estimated time;
- readiness polling;
- mobile/shared-device gating messages;
- AI-heavy feature gating;
- saving "email me when ready" preference after the email provider is connected.

The Local Agent should not own:

- user passwords;
- Supabase service role keys;
- Cloudflare/Azure deployment secrets;
- automatic source-file upload to cloud;
- arbitrary command execution;
- arbitrary Ollama endpoint proxying.

## Local Agent Health Contract

The installer must produce a local service compatible with:

- Base URL: `http://127.0.0.1:43110`
- Health: `GET /health`
- Local chat: `POST /ai/chat`
- Source chat: `POST /ai/source-chat`
- Vault/source/index actions already documented in `docs/local-first-agent-migration.md`

Minimum health requirements before the web app unlocks local AI:

- `ok: true`
- `capabilities.localAi: true`
- `ollama.connected: true`
- `ollama.ok: true`
- `ollama.security.ok: true`
- `ollama.security.versionSafe: true`
- `ollama.security.localhostOnly: true`
- `ollama.selectedModel` is present

## Ollama Safety Gate

The installer and doctor must enforce the same gate as the web app:

- Ollama version must be `0.17.1` or newer.
- Ollama must be reachable only through localhost.
- Unsafe Ollama endpoints are not proxied by Cerise Scholar:
  - `/api/create`
  - `/api/blobs`
  - `/api/push`
- Arbitrary user-supplied model files are not accepted during beta.
- Approved starter models should be listed explicitly.

## Recommended Packaging Path

### Phase A: Developer Archive

Create a reproducible local-agent bundle from the current scripts:

- `scripts/local-agent.mjs`
- `scripts/local-agent-doctor.mjs`
- `scripts/local-ollama-security.mjs`
- `scripts/local-permission-contract.mjs`
- `scripts/local-vault-contract.mjs`
- minimal `package.json`
- README for beta testers

This is a zip/archive for internal testing only.

### Phase B: macOS App Wrapper

Package the Local Agent as a small macOS app that starts a local Node runtime or bundled executable.

Options to evaluate later:

- Node single executable application build.
- Electron/Tauri wrapper with a small status window.
- Native Swift menu-bar wrapper that launches the Node/local-agent binary.

Selection criteria:

- easiest signed/notarized distribution;
- minimal disk size;
- reliable localhost service;
- visible user controls;
- simple uninstall.

### Phase C: Signed Beta Installer

Before public beta installer distribution:

- sign and notarize macOS app;
- include official download page links;
- publish checksum;
- document uninstall;
- test on a clean macOS user account;
- verify `npm run local-agent:doctor` equivalent is built into the app.

## User-Facing Copy Requirements

Setup prompt should keep the current soft language:

- "Use a personal or trusted laptop for full AI-heavy features."
- "Setup usually takes 8-15 minutes."
- "Keep this laptop open and connected while setup finishes."
- "You can still use lighter Cerise Scholar features now."
- "Mobile sign-in is available for review and lighter workspace access."

Avoid:

- telling users the browser will install software automatically;
- promising setup-ready email unless the provider-gated email route is configured;
- implying public/shared desktops are suitable for private local AI work.

## Readiness And Email

Current state:

- The setup popup saves `local_setup_email_when_ready_status: "requested"` in user metadata when the user asks for a setup-ready note.
- When the browser later detects a ready local setup, it calls `POST /api/local-setup/ready-email`.
- The route is authenticated and only sends if `SETUP_READY_EMAILS_ENABLED=true`, `RESEND_API_KEY`, and `RESEND_FROM_EMAIL` are configured.
- If email delivery is not configured, the route records `local_setup_email_when_ready_status: "provider_not_configured"` and the UI keeps showing readiness in the browser.
- Email is never sent from the browser and the API key is never exposed to the client.

Configured email flow:

1. User asks for setup-ready email.
2. Web app stores preference.
3. Local setup reaches ready state.
4. Browser reports readiness to the authenticated server route.
5. Email provider sends a soft "Cerise Scholar is ready on your laptop" message if provider env vars are configured.
6. User metadata records `local_setup_email_when_ready_status: "sent"` and the provider message id.

Provider notes:

- The current implementation uses Resend's `POST /emails` API shape with `from`, `to`, `subject`, `html`, and `text` fields. See the official Resend email API reference: https://resend.com/docs/api-reference/emails
- Use a verified Cerise Scholar sender domain before enabling production sends.
- Keep `SETUP_READY_EMAILS_ENABLED` unset or `false` until sending policy and sender domain are approved.
- A future background worker can reuse the same metadata contract, but the current beta path only sends after the signed-in browser detects readiness.

## Test Matrix

Before release, test:

- macOS with Ollama already installed and safe.
- macOS with no Ollama.
- macOS with old Ollama.
- macOS with Ollama listening beyond localhost.
- macOS with no model installed.
- macOS with Local Agent not running.
- Mobile browser.
- Shared/public desktop copy path.
- User dismisses setup and continues light use.
- User requests setup-ready email preference.

## Step 9 Exit Criteria

Step 9 is complete when:

- installer architecture is documented;
- macOS-first setup path is documented;
- public/shared desktop rule is documented;
- installer and webapp responsibilities are separated;
- current setup popup has matching product language;
- no executable installer is shipped yet without a separate explicit approval.
