# Cerise Scholar — Project Map

> This file is kept up to date as the project evolves. It describes every folder and file so you always know what's where.

**Last updated:** 2026-03-29 (Phase 0 — Project Setup)

---

## Tech Stack

- **Framework:** Next.js 16 (React 19 + TypeScript)
- **Styling:** Tailwind CSS 4
- **PDF Rendering:** pdfjs-dist (Mozilla PDF.js)
- **OCR:** tesseract.js
- **TTS:** Browser Web Speech API
- **Auth + Database:** Supabase (PostgreSQL)
- **Hosting:** Cloudflare tunnel

---

## Folder Structure

```
CeriseScholar/
├── .git/                       # Git version control (don't touch)
├── .gitignore                  # Files Git should ignore (node_modules, .env, etc.)
├── node_modules/               # Installed packages (don't touch, auto-managed by npm)
│
├── package.json                # Project config — lists dependencies and scripts
├── package-lock.json           # Exact dependency versions (auto-generated)
├── tsconfig.json               # TypeScript configuration
├── next.config.ts              # Next.js configuration
├── postcss.config.mjs          # PostCSS config (needed by Tailwind)
├── eslint.config.mjs           # Code linting rules
│
├── public/                     # Static files served directly (images, icons)
│   └── (empty for now)
│
├── src/                        # All source code lives here
│   └── app/                    # Pages and layouts (Next.js App Router)
│       ├── layout.tsx          # Root layout — wraps every page (<html>, <body>)
│       ├── page.tsx            # Home page (currently shows default Next.js content)
│       ├── globals.css         # Global CSS styles (Tailwind imports)
│       └── favicon.ico         # Browser tab icon
│
├── PROJECT_MAP.md              # THIS FILE — project structure reference
├── CLAUDE.md                   # AI assistant instructions (auto-generated)
├── AGENTS.md                   # Agent configuration (auto-generated)
└── README.md                   # Project description for GitHub
```

---

## Key Files Explained

| File | What it does |
|------|-------------|
| `package.json` | Lists all libraries the project uses, and defines commands like `npm run dev` |
| `src/app/layout.tsx` | The "shell" of every page — contains the `<html>` and `<body>` tags |
| `src/app/page.tsx` | The home page — what you see at http://localhost:3000 |
| `src/app/globals.css` | Global styles — currently just Tailwind CSS imports |
| `next.config.ts` | Settings for Next.js (we'll modify this for PDF.js later) |
| `.gitignore` | Tells Git to skip files like `node_modules/` and `.env` |
| `.env.local` | (Will be created in Phase 1) — stores secret keys like Supabase credentials |

---

## Installed Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 16.2.1 | Web framework (React-based) |
| `react` / `react-dom` | 19.2.4 | UI library |
| `@supabase/supabase-js` | ^2.100.1 | Supabase database client |
| `@supabase/ssr` | ^0.9.0 | Supabase auth for server-side rendering |
| `pdfjs-dist` | ^5.6.205 | Renders PDFs in the browser |
| `tesseract.js` | ^7.0.0 | OCR — reads text from scanned images |
| `uuid` | ^13.0.0 | Generates unique IDs |
| `papaparse` | ^5.5.3 | Exports tables to CSV files |
| `clsx` | ^2.1.1 | CSS class name helper |
| `tailwind-merge` | ^3.5.0 | Merges Tailwind CSS classes |

---

## Build Phases Progress

- [x] Phase 0: Project Setup + GitHub Repository
- [ ] Phase 1: Supabase Auth (Sign Up / Log In / Log Out)
- [ ] Phase 2: Database + PDF Upload
- [ ] Phase 3: PDF Viewer
- [ ] Phase 4: Highlighting + Annotations
- [ ] Phase 5: Literature Review Table
- [ ] Phase 6: OCR
- [ ] Phase 7: Text-to-Speech
- [ ] Phase 8: Polish + Landing Page + Cloudflare Deployment
