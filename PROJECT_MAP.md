# Cerise Scholar — Project Map

> This file is kept up to date as the project evolves. It describes every folder and file so you always know what's where.

**Last updated:** 2026-03-30 (Phase 8 — All Phases Complete)

---

## Tech Stack

- **Framework:** Next.js 16 (React 19 + TypeScript)
- **Styling:** Tailwind CSS 4
- **PDF Rendering:** pdfjs-dist (Mozilla PDF.js)
- **OCR:** tesseract.js (server-side)
- **TTS:** Browser Web Speech API
- **Auth + Database:** Supabase (PostgreSQL)
- **Hosting:** Cloudflare tunnel (setup guide in DEPLOY.md)

---

## Folder Structure

```
CeriseScholar/
├── .env.local                          # Supabase keys (NOT in Git)
├── .gitignore                          # Files Git should ignore
├── package.json                        # Dependencies and scripts
├── next.config.ts                      # Next.js + webpack configuration
├── start.sh                            # Quick start script (./start.sh)
├── DEPLOY.md                           # Cloudflare tunnel deployment guide
├── PROJECT_MAP.md                      # THIS FILE
│
├── supabase/migrations/
│   └── 001_initial_schema.sql          # Database tables + RLS policies
│
├── public/
│   └── pdf.worker.min.mjs             # PDF.js web worker
│
├── src/
│   ├── app/                            # Pages (Next.js App Router)
│   │   ├── layout.tsx                  # Root layout
│   │   ├── page.tsx                    # Landing page (hero, features, CTA)
│   │   ├── not-found.tsx               # 404 page
│   │   ├── globals.css                 # Global styles + PDF text layer CSS
│   │   │
│   │   ├── login/page.tsx              # Login page
│   │   ├── signup/page.tsx             # Signup page
│   │   ├── auth/callback/route.ts      # Email confirmation handler
│   │   │
│   │   ├── api/ocr/route.ts            # Server-side OCR endpoint
│   │   │
│   │   └── dashboard/
│   │       ├── layout.tsx              # Dashboard layout (Navbar + Sidebar)
│   │       ├── page.tsx                # PDF grid with OCR badges
│   │       ├── loading.tsx             # Loading spinner for dashboard
│   │       ├── upload/page.tsx         # PDF upload (drag & drop)
│   │       ├── viewer/[id]/
│   │       │   ├── page.tsx            # PDF viewer (server component)
│   │       │   └── ViewerClient.tsx    # PDF viewer (client wrapper)
│   │       └── literature-review/
│   │           └── page.tsx            # Literature review table
│   │
│   ├── components/
│   │   ├── auth/                       # LoginForm, SignupForm
│   │   ├── layout/                     # Navbar, Sidebar
│   │   ├── ui/                         # Spinner
│   │   ├── pdf/                        # PdfViewer, PdfPage, PdfToolbar, HighlightLayer
│   │   ├── annotations/               # AnnotationSidebar, NoteModal
│   │   ├── literature-review/          # ReviewTable, ReviewTableRow, Filters, ExportButton
│   │   ├── tts/                        # TtsControls
│   │   └── ocr/                        # OcrStatusBadge
│   │
│   ├── hooks/
│   │   ├── useUser.ts                  # Current logged-in user
│   │   ├── usePdf.ts                   # PDF loading, page nav, zoom
│   │   ├── useHighlights.ts            # Highlights + auto lit review entry
│   │   ├── useAnnotations.ts           # Sticky notes CRUD
│   │   ├── useLiteratureReview.ts      # Lit review table CRUD
│   │   └── useTts.ts                   # Text-to-speech state
│   │
│   ├── lib/
│   │   ├── supabase/client.ts          # Browser Supabase client
│   │   ├── supabase/server.ts          # Server Supabase client
│   │   ├── pdf/loadPdf.ts              # PDF.js document loader
│   │   ├── pdf/extractText.ts          # Extract text from PDF page
│   │   ├── tts/speak.ts               # Web Speech API wrapper
│   │   ├── ocr/runOcr.ts              # Trigger OCR API
│   │   └── utils/cn.ts                # Tailwind class merge
│   │
│   ├── types/                          # TypeScript definitions (pdf, annotation, lit review)
│   └── middleware.ts                   # Auth middleware
```

---

## How to Run

```bash
# Start the app
./start.sh
# Then open http://localhost:3000
```

---

## Build Phases — ALL COMPLETE

- [x] Phase 0: Project Setup + GitHub Repository
- [x] Phase 1: Supabase Auth (Sign Up / Log In / Log Out)
- [x] Phase 2: Database + PDF Upload
- [x] Phase 3: PDF Viewer
- [x] Phase 4: Highlighting + Annotations
- [x] Phase 5: Literature Review Table
- [x] Phase 6: OCR
- [x] Phase 7: Text-to-Speech
- [x] Phase 8: Polish + Landing Page + Cloudflare Deployment
