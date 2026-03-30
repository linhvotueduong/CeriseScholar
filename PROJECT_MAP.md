# Cerise Scholar — Project Map

> This file is kept up to date as the project evolves. It describes every folder and file so you always know what's where.

**Last updated:** 2026-03-30 (Phase 6 — OCR)

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
├── .env.local                          # Supabase keys (NOT in Git — kept secret)
├── .gitignore                          # Files Git should ignore
├── package.json                        # Dependencies and scripts
├── package-lock.json                   # Exact dependency versions
├── tsconfig.json                       # TypeScript configuration
├── next.config.ts                      # Next.js configuration
├── postcss.config.mjs                  # PostCSS config (for Tailwind)
├── eslint.config.mjs                   # Code linting rules
├── PROJECT_MAP.md                      # THIS FILE
│
├── public/                             # Static files (images, icons)
│
├── src/
│   ├── app/                            # Pages (Next.js App Router)
│   │   ├── layout.tsx                  # Root layout — wraps every page
│   │   ├── page.tsx                    # Home page — landing with Login/Signup links
│   │   ├── globals.css                 # Global Tailwind CSS
│   │   ├── favicon.ico                 # Browser tab icon
│   │   │
│   │   ├── login/
│   │   │   └── page.tsx               # Login page
│   │   ├── signup/
│   │   │   └── page.tsx               # Signup page
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts           # Handles email confirmation redirect
│   │   │
│   │   └── dashboard/
│   │       ├── layout.tsx             # Dashboard layout (Navbar + Sidebar + content)
│   │       ├── page.tsx               # Dashboard home (grid of uploaded PDFs)
│   │       ├── upload/
│   │       │   └── page.tsx           # PDF upload page (drag & drop)
│   │       ├── viewer/
│   │       │   └── [id]/
│   │       │       ├── page.tsx       # PDF viewer page (server — fetches PDF data)
│   │       │       └── ViewerClient.tsx # PDF viewer client wrapper
│   │       └── literature-review/
│   │           └── page.tsx           # Literature review table page
│   │
│   ├── app/api/
│   │   └── ocr/
│   │       └── route.ts              # Server-side OCR endpoint (Tesseract.js)
│   │
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx          # Email/password login form
│   │   │   └── SignupForm.tsx         # Email/password signup form
│   │   ├── layout/
│   │   │   ├── Navbar.tsx             # Top navigation bar with logout
│   │   │   └── Sidebar.tsx            # Left sidebar (My PDFs, Upload, Lit Review)
│   │   └── ui/
│   │       └── Spinner.tsx            # Loading spinner component
│   │
│   │
│   ├── components/pdf/
│   │   ├── PdfViewer.tsx              # Main viewer — toolbar + page + sidebar
│   │   ├── PdfPage.tsx                # Renders one PDF page (canvas + text + highlights)
│   │   ├── PdfToolbar.tsx             # Page nav, zoom, highlight mode toggle
│   │   └── HighlightLayer.tsx         # Detects text selection, renders highlight rects
│   │
│   ├── components/annotations/
│   │   ├── AnnotationSidebar.tsx      # Right panel showing all highlights + notes
│   │   └── NoteModal.tsx              # Modal for adding notes to highlights
│   │
│   ├── components/literature-review/
│   │   ├── ReviewTable.tsx            # Main table with all columns
│   │   ├── ReviewTableRow.tsx         # Single row with inline-editable cells
│   │   ├── ReviewTableFilters.tsx     # Filter by source PDF, search by theme/text
│   │   └── ExportButton.tsx           # Export table to CSV file
│   │
│   ├── hooks/
│   │   ├── useUser.ts                 # Hook to get the logged-in user
│   │   ├── usePdf.ts                  # Hook for PDF loading, page nav, zoom
│   │   ├── useHighlights.ts           # CRUD for highlights + auto-creates lit review entry
│   │   ├── useAnnotations.ts          # CRUD for sticky notes/comments
│   │   └── useLiteratureReview.ts     # Fetch, update, delete lit review entries
│   │
│   ├── components/ocr/
│   │   └── OcrStatusBadge.tsx         # Shows OCR status (Pending/Processing/Ready/Failed)
│   │
│   ├── lib/ocr/
│   │   └── runOcr.ts                  # Client-side utility to trigger OCR API
│   │
│   ├── lib/pdf/
│   │   └── loadPdf.ts                 # Loads a PDF document using PDF.js
│   │
│   ├── types/
│   │   ├── pdf.ts                     # PDF type definition
│   │   ├── annotation.ts             # Highlight & Annotation type definitions
│   │   └── literature-review.ts      # Literature review entry type definition
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # Browser-side Supabase client
│   │   │   └── server.ts             # Server-side Supabase client
│   │   └── utils/
│   │       └── cn.ts                  # Tailwind class merge utility
│   │
│   └── middleware.ts                   # Auth middleware (protects /dashboard, redirects)
```

---

## Key Files Explained

| File | What it does |
|------|-------------|
| `.env.local` | Stores Supabase URL and anon key (never uploaded to GitHub) |
| `src/middleware.ts` | Runs on every request — redirects unauthenticated users to /login |
| `src/lib/supabase/client.ts` | Creates a Supabase connection for browser-side code |
| `src/lib/supabase/server.ts` | Creates a Supabase connection for server-side code |
| `src/hooks/useUser.ts` | React hook that returns the currently logged-in user |
| `src/components/auth/LoginForm.tsx` | The login form with email and password fields |
| `src/components/auth/SignupForm.tsx` | The signup form — shows "check your email" after success |
| `src/components/layout/Navbar.tsx` | Top bar showing "Cerise Scholar", user email, and logout |
| `src/app/auth/callback/route.ts` | Handles the redirect when a user clicks their email confirmation link |

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
| `canvas` | latest | Server-side canvas for PDF page rendering (OCR) |

---

## Build Phases Progress

- [x] Phase 0: Project Setup + GitHub Repository
- [x] Phase 1: Supabase Auth (Sign Up / Log In / Log Out)
- [x] Phase 2: Database + PDF Upload
- [x] Phase 3: PDF Viewer
- [x] Phase 4: Highlighting + Annotations
- [x] Phase 5: Literature Review Table
- [x] Phase 6: OCR
- [ ] Phase 7: Text-to-Speech
- [ ] Phase 8: Polish + Landing Page + Cloudflare Deployment
