# Cerise Scholar — Project Map

> This file is kept up to date as the project evolves. It describes every folder and file so you always know what's where.

**Last updated:** 2026-04-01

---

## Tech Stack

- **Framework:** Next.js 16.2.1 (React 19.2.4 + TypeScript 5)
- **Styling:** Tailwind CSS 4 (via PostCSS)
- **PDF Rendering:** pdfjs-dist (Mozilla PDF.js)
- **OCR:** tesseract.js (server-side)
- **TTS:** Browser Web Speech API
- **Auth + Database + Storage:** Supabase (PostgreSQL + RLS)
- **AI:** Ollama API (Kimi K2.5 model)
- **Academic Search:** OpenAlex API
- **Data Parsing:** SPSS .sav parser (custom)
- **Hosting:** Cloudflare tunnel (setup guide in DEPLOY.md)

---

## Folder Structure

```
CeriseScholar/
├── .env.local                          # Supabase keys, Ollama API key/model (NOT in Git)
├── .gitignore                          # Files Git should ignore
├── package.json                        # Dependencies and scripts
├── next.config.ts                      # Next.js + webpack config (canvas external)
├── tsconfig.json                       # TypeScript config (@/* → ./src/*)
├── postcss.config.mjs                  # Tailwind CSS v4 PostCSS plugin
├── eslint.config.mjs                   # ESLint 9 + Next.js core web vitals
├── start.sh                            # Quick start script (./start.sh)
├── DEPLOY.md                           # Cloudflare tunnel deployment guide
├── PROJECT_MAP.md                      # THIS FILE
│
├── supabase/migrations/
│   ├── 001_initial_schema.sql          # pdfs, highlights, annotations, literature_review_entries + RLS
│   ├── 002_code_system.sql             # codes table + code_id/code_name columns
│   ├── 003_projects.sql                # projects table + project_id on pdfs/codes/lit review
│   └── 004_paper_sections.sql          # paper_sections table (project_id, section_key, content)
│
├── public/
│   └── pdf.worker.min.mjs             # PDF.js web worker (copied via postinstall)
│
├── src/
│   ├── middleware.ts                   # Auth middleware (session refresh, route protection)
│   │
│   ├── app/                            # Pages (Next.js App Router)
│   │   ├── layout.tsx                  # Root layout (Geist fonts, metadata)
│   │   ├── page.tsx                    # Landing page (hero, 6 features, how-it-works)
│   │   ├── loading.tsx                 # Root loading skeleton
│   │   ├── not-found.tsx               # 404 page
│   │   ├── globals.css                 # Global styles + PDF text layer CSS
│   │   │
│   │   ├── login/page.tsx              # Login page
│   │   ├── signup/page.tsx             # Signup page
│   │   ├── about/page.tsx              # About page
│   │   ├── research-guidance/page.tsx  # Step-by-step research guide
│   │   ├── auth/callback/route.ts      # Email confirmation → session exchange
│   │   │
│   │   ├── api/
│   │   │   ├── auth/callback/route.ts  # OAuth callback handler
│   │   │   ├── ocr/route.ts            # Server-side OCR (pdfjs + tesseract, 300s timeout)
│   │   │   ├── research/route.ts       # ScholarAsk: 6 queries → OpenAlex → Ollama synthesis
│   │   │   └── ai/route.ts             # Generic AI: summarize, suggest_keywords, paper_analysis
│   │   │
│   │   └── dashboard/
│   │       ├── layout.tsx              # Dashboard layout (Navbar + Sidebar)
│   │       ├── page.tsx                # My Projects (create/delete, color picker, card grid)
│   │       ├── loading.tsx             # Dashboard loading skeleton
│   │       ├── upload/page.tsx         # PDF upload (drag & drop, metadata extraction, OCR trigger)
│   │       ├── literature-review/page.tsx  # User-wide lit review table (all projects)
│   │       ├── viewer/[id]/            # Old viewer path (deprecated, replaced by project-scoped)
│   │       │   ├── page.tsx
│   │       │   └── ViewerClient.tsx
│   │       └── project/[projectId]/
│   │           ├── page.tsx            # Project workspace (loads first PDF, nav to sub-pages)
│   │           ├── loading.tsx         # Project loading state
│   │           ├── viewer/[id]/
│   │           │   └── page.tsx        # Project-scoped PDF viewer
│   │           ├── literature-review/
│   │           │   ├── page.tsx        # Project-scoped lit review table
│   │           │   └── loading.tsx
│   │           ├── paper-writer/
│   │           │   ├── page.tsx        # 8-section paper editor (auto-save, material sync)
│   │           │   └── loading.tsx
│   │           ├── scholar-ask/
│   │           │   ├── page.tsx        # AI research assistant (multi-turn, deep research toggle)
│   │           │   └── loading.tsx
│   │           └── meta-analysis/
│   │               ├── page.tsx        # Meta-analysis tools
│   │               └── loading.tsx
│   │
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx           # Email/password login
│   │   │   └── SignupForm.tsx          # Signup form
│   │   ├── layout/
│   │   │   ├── Navbar.tsx              # Top navigation bar
│   │   │   └── Sidebar.tsx             # Dashboard sidebar
│   │   ├── ui/
│   │   │   ├── Spinner.tsx             # Loading spinner
│   │   │   ├── CollapsibleSection.tsx  # Collapsible container
│   │   │   └── ResizablePanel.tsx      # Resizable panel
│   │   ├── pdf/
│   │   │   ├── PdfViewer.tsx           # Main viewer (panels, highlights, annotations, TTS, codes)
│   │   │   ├── PdfPage.tsx             # Single page renderer
│   │   │   ├── PdfToolbar.tsx          # Page nav + zoom controls
│   │   │   ├── DocumentPanel.tsx       # List of PDFs in project
│   │   │   ├── PdfCard.tsx             # PDF card display
│   │   │   └── HighlightLayer.tsx      # Highlight overlay on page
│   │   ├── annotations/
│   │   │   ├── AnnotationSidebar.tsx   # Right sidebar with page annotations
│   │   │   ├── NoteModal.tsx           # Create/edit note modal
│   │   │   └── HighlightDetailModal.tsx # Highlight detail view
│   │   ├── literature-review/
│   │   │   ├── ReviewTable.tsx         # Main table component
│   │   │   ├── ReviewTableRow.tsx      # Editable row for single entry
│   │   │   ├── ReviewTableFilters.tsx  # Filter controls
│   │   │   └── ExportButton.tsx        # CSV export
│   │   ├── codes/
│   │   │   └── CodeSystemPanel.tsx     # Manage research codes (paper sections)
│   │   ├── tts/
│   │   │   └── TtsControls.tsx         # Text-to-speech playback controls
│   │   ├── meta/
│   │   │   └── MethodologyGuide.tsx    # Meta-analysis methodology guide
│   │   └── ocr/
│   │       └── OcrStatusBadge.tsx      # OCR status indicator
│   │
│   ├── hooks/
│   │   ├── useUser.ts                  # Current user (session + auth listener)
│   │   ├── usePdf.ts                   # PDF loading, page nav, zoom
│   │   ├── useHighlights.ts            # Highlights CRUD + auto lit review entry + APA reference
│   │   ├── useAnnotations.ts           # Annotations CRUD + sync with lit review notes
│   │   ├── useLiteratureReview.ts      # Lit review CRUD + bidirectional annotation sync
│   │   ├── useCodes.ts                 # Codes CRUD + auto-init defaults + per-project
│   │   ├── usePaperWriter.ts           # Paper sections load/save (debounced) + syncMaterials()
│   │   └── useTts.ts                   # TTS state (speak, pause, resume, stop, voices)
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts              # Browser Supabase client
│   │   │   └── server.ts              # Server Supabase client (cookie-based auth)
│   │   ├── pdf/
│   │   │   ├── loadPdf.ts             # PDF.js document loader
│   │   │   ├── extractText.ts         # Extract text from PDF page
│   │   │   └── extractMetadata.ts     # Extract title, author, subject, page count
│   │   ├── tts/
│   │   │   └── speak.ts              # Web Speech API wrapper
│   │   ├── ocr/
│   │   │   └── runOcr.ts             # Trigger OCR API (fire-and-forget)
│   │   ├── data/
│   │   │   └── parseSav.ts           # SPSS .sav file parser (binary, compressed/uncompressed)
│   │   └── utils/
│   │       └── cn.ts                 # Tailwind class merge (clsx + tailwind-merge)
│   │
│   └── types/
│       ├── pdf.ts                     # Pdf type (filename, storage_path, ocr_status, metadata)
│       ├── annotation.ts              # Highlight + Annotation types
│       ├── code.ts                    # Code type + DEFAULT_CODES (7 paper sections)
│       ├── literature-review.ts       # LiteratureReviewEntry type
│       ├── paper-section.ts           # PaperSection + SECTION_LABELS + SECTION_GUIDANCE
│       └── project.ts                # Project type (name, description, color)
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
- [x] Phase 9: Multi-Project Support
- [x] Phase 10: Code System (paper section tagging)
- [x] Phase 11: ScholarAsk (AI research assistant + OpenAlex)
- [x] Phase 12: Paper Writer (8-section editor + material sync)
- [x] Phase 13: Meta-Analysis Tools
