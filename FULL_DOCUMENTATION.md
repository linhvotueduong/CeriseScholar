# Cerise Scholar — Complete Project Documentation

> This document describes every aspect of Cerise Scholar in enough detail to recreate the entire project from scratch.

**Live URL:** https://cerise-scholar.vercel.app
**GitHub:** https://github.com/linhvotueduong/CeriseScholar

---

## 1. PROJECT OVERVIEW

Cerise Scholar is a web-based research tool that streamlines academic literature review workflows. Researchers can upload PDFs, highlight key passages, synthesize literature reviews, ask AI-powered research questions, and write structured research papers with auto-imported materials.

**Target users:** Graduate students, academic researchers, anyone conducting literature reviews or meta-analyses.

---

## 2. TECH STACK

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 16.2.1 (React 19 + TypeScript 5) | Full-stack React framework |
| Styling | Tailwind CSS 4 (PostCSS) | Utility-first CSS |
| Database | Supabase (PostgreSQL) | Database + Auth + Storage |
| AI Model | Ollama Cloud (Kimi K2.5) | Research synthesis, chat, paper analysis |
| Academic Search | OpenAlex API (free, no key) | Search millions of papers |
| PDF Rendering | pdfjs-dist 4.8.69 | Render PDFs in browser |
| OCR | Tesseract.js 7 | OCR scanned PDFs server-side |
| TTS | msedge-tts (Microsoft Edge Neural) | Natural AI voices (free) |
| TTS (instant) | Browser Web Speech API | Instant local voices |
| Data Parsing | Custom SPSS .sav parser | Parse ICPSR datasets |
| Animations | Framer Motion + GSAP | UI animations |
| Markdown | react-markdown + remark-gfm | Render AI responses |
| Hosting | Vercel | Auto-deploy from GitHub |

---

## 3. ENVIRONMENT VARIABLES

```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
OLLAMA_API_KEY=<your-ollama-cloud-api-key>
OLLAMA_MODEL=kimi-k2.5
```

---

## 4. DATABASE SCHEMA (6 tables, all with RLS)

### projects
- id (UUID PK), user_id (FK), name, description, color, created_at, updated_at

### pdfs
- id (UUID PK), user_id (FK), project_id (FK), filename, display_name, storage_path, page_count, ocr_status, ocr_text, file_size, pdf_author, pdf_title, pdf_subject, created_at, updated_at

### highlights
- id (UUID PK), user_id (FK), pdf_id (FK), page_number, highlighted_text, color, rects (JSONB), code_id (FK), created_at

### annotations
- id (UUID PK), user_id (FK), pdf_id (FK), highlight_id (FK), page_number, content, position_x, position_y, created_at, updated_at

### literature_review_entries
- id (UUID PK), user_id (FK), pdf_id (FK), project_id (FK), highlight_id (FK), source, authors, year, page_number, highlighted_text, theme_category, user_notes, code_name, apa_reference, synthesis_paragraph, date_added

### codes
- id (UUID PK), user_id (FK), project_id (FK), name, color, sort_order, created_at

### paper_sections
- id (UUID PK), user_id (FK), project_id (FK), section_key, content, updated_at
- UNIQUE(project_id, section_key)

**All tables have Row-Level Security:** `auth.uid() = user_id`

---

## 5. ALL FEATURES

### A. Multi-Project Workspace
- Create/delete research projects with name, description, color
- Each project has its own PDFs, highlights, codes, lit review entries, paper sections
- Dashboard shows project cards with creation date

### B. PDF Viewer
- Upload PDFs (drag & drop, max 50MB)
- Full-page scrolling with zoom (25%-300%)
- Page navigation (prev/next, go-to-page)
- Selectable text layer (PDF.js TextLayer)
- OCR for scanned PDFs (Tesseract.js server-side)
- Document panel (list/switch between project PDFs)
- 8-hour signed URLs for long research sessions

### C. Smart Highlighting & Annotations
- Toggle highlight mode in toolbar
- Select text → choose color (6 options) → assign section code → add note
- Highlights rendered as colored overlays on PDF pages
- Sticky notes attached to highlights
- Re-highlight: update text selection on existing highlight
- Bidirectional sync: editing note in sidebar updates lit review table and vice versa

### D. Code System (MAXQDA-inspired)
- Default codes: Abstract, Introduction, Literature Review, Methodology, Results, Discussion, Conclusion
- Custom codes with custom colors
- Assign codes to highlights for organizing by paper section
- Per-project code sets

### E. Literature Review Table
- Auto-populated from highlights
- Columns: Document Name (with author/year), APA Reference, Section/Code, Quotes from Sources, My Insights/Notes, Synthesis Paragraph
- All fields editable inline
- Filter by source PDF, section/code, or search text
- Export as CSV
- Per-project scoping

### F. ScholarAsk (AI Research Assistant)
- LeapSpace-inspired conversational UI
- Enter research question → AI searches OpenAlex for papers → synthesizes professor-level answer
- "Deep Research" toggle for more papers
- Features:
  - Multi-turn conversation with follow-up questions
  - Clickable citation numbers [1] [2] that open right panel
  - Right panel shows: paper title, authors, abstract, "Read paper" link, AI analysis of how paper supports the answer
  - Summary table in markdown
  - Confidence level assessment
  - 3 follow-up suggestions
  - Chat history persisted in localStorage
  - Delete conversations
- Searches: 6 queries generated from user question → 4 parallel OpenAlex searches → up to 50 deduplicated papers → AI analyzes top 10-12
- Conversation sidebar on left

### G. AI Chat (in PDF Workspace)
- Speechify-style dark floating panel (bottom-right)
- Ask questions about the current PDF
- AI reads up to 30 pages of the PDF for context (cached per PDF)
- Voice input via browser Speech Recognition API
- Markdown rendering for AI responses
- Quick suggestions: "What is this paper about?", "Summarize the key findings", etc.
- Resizable panel (drag top-left corner)
- "Read aloud" button on each AI response

### H. Text-to-Speech
- **Instant mode (default):** Browser Web Speech API, starts in 1-3 seconds
- **AI Voice mode (toggle):** Microsoft Edge Neural TTS with 8 natural voices (Jenny, Aria, Sara, Nancy, Amber, Guy, Davis, Tony)
- Speechify-style floating widget on right side:
  - Play/pause button
  - Speed control (0.5x-3x) with preset buttons
  - Voice selector panel
  - AI Voice toggle
  - Sound wave animation
- Paragraph hover play button: small blue circle appears next to text when hovering (not in highlight mode)
  - Click to start reading from that paragraph
  - Turns red (stop) while speaking
- Toolbar buttons: "Read Page", "Read Selection"

### I. Meta-Analysis Tools
- 5 tabs: Methodology Guide, Data Upload, Analyze Data, Effect Sizes, Results & Forest Plot
- Upload CSV, TSV, or SPSS .sav files
- Custom client-side SPSS .sav binary parser (no dependencies)
- Statistical calculations (all pure JavaScript):
  - Descriptive statistics (mean, SD, min, max)
  - Pearson correlation
  - Independent samples t-test
  - Cohen's d and Hedges' g effect sizes
  - Heterogeneity (Q statistic, I²)
- SVG forest plot generation
- Methodology Guide: 5 hypothesis types, ICPSR data source suggestions, variable mapping, auto-generated methodology write-up

### J. Paper Writer
- 8 sections: Abstract, Introduction, Literature Review, Methodology, Results, Discussion, Conclusion, References
- Text editor per section with serif font
- Auto-save with 1-second debounce (upsert to database)
- Word count per section and total
- "Sync Materials" button:
  - Pulls synthesis paragraphs from lit review table (grouped by code/section)
  - Pulls APA references
  - Side panel for inserting into editor
- Writing guidance tips for each section
- Section-specific hints (e.g., "Write Abstract last", "Import synthesis paragraphs")
- Navigation sidebar with green dots for completed sections

### K. Research Guidance Page
- 5-step guide: Brainstorm → Find Sources → Analyze Data → Build Lit Review → Write Paper
- Task checklists per step
- Tips with lightbulb icons
- Action buttons linking to workspace tools and ICPSR

---

## 6. API ROUTES

### POST /api/research
- Searches OpenAlex with 6 auto-generated queries (parallel)
- Deduplicates up to 50 papers
- Sends top 10-12 papers to Ollama AI for synthesis
- Returns: answer (markdown with [N] citations), references (paper metadata), counts
- 3-minute timeout
- Rate limit: 10/min per user

### POST /api/ai
- Generic AI tasks: paper_analysis, summarize, suggest_keywords, ask
- For paper_analysis: generates paragraph explaining how a paper supports the main answer
- Rate limit: 15/min per user

### POST /api/tts
- Generates MP3 audio from text using Microsoft Edge Neural TTS
- 8 voices, adjustable speed
- Returns binary audio/mpeg
- Rate limit: 20/min per user

### GET /api/tts
- Returns list of available voices

### POST /api/ocr
- Server-side OCR for scanned PDFs
- Uses PDF.js + canvas + Tesseract.js
- 5-minute timeout
- Rate limit: 5/hour per user

---

## 7. SECURITY

- **Authentication:** Supabase Auth (JWT-based, email/password)
- **Row-Level Security:** All 6 tables enforce `auth.uid() = user_id`
- **Middleware:** Validates JWT on every dashboard request, redirects unauthenticated users
- **Rate Limiting:** In-memory sliding window per user per route
- **API Key Protection:** Ollama key is server-side only (never sent to browser)
- **Security Headers:** X-Frame-Options: DENY, X-Content-Type-Options: nosniff, HSTS, Referrer-Policy, Permissions-Policy
- **Input Sanitization:** TTS strips HTML tags, text length capped at 5000 chars

---

## 8. KEY DESIGN PATTERNS

- **Hooks pattern:** All data fetching via custom hooks (useHighlights, useLiteratureReview, etc.)
- **Optimistic updates:** Local state updates immediately, then syncs to database
- **Debounced saves:** Paper Writer saves 1 second after typing stops
- **React.memo:** ScholarAsk response content is memoized to prevent re-renders when panel state changes
- **Bidirectional sync:** Notes sync between annotations table and literature_review_entries.user_notes
- **Atomic operations:** Creating a highlight also creates a literature_review_entry in the same function
- **Cascade deletes:** Deleting a project cascades to all related data
- **Signed URLs:** 8-hour expiry for PDF storage access

---

## 9. FILE STRUCTURE

```
CeriseScholar/
├── .env.local                     # Environment variables (not in Git)
├── next.config.ts                 # Next.js config (canvas alias, security headers)
├── package.json                   # Dependencies
├── start.sh                       # Dev server start script
├── supabase/migrations/           # 5 SQL migration files
├── public/pdf.worker.min.mjs      # PDF.js web worker
├── src/
│   ├── middleware.ts               # Auth middleware
│   ├── app/                        # Pages & API routes
│   │   ├── page.tsx                # Homepage
│   │   ├── login/page.tsx          # Login
│   │   ├── signup/page.tsx         # Signup
│   │   ├── about/page.tsx          # About
│   │   ├── research-guidance/page.tsx
│   │   ├── api/ai/route.ts        # AI endpoint
│   │   ├── api/research/route.ts   # Research endpoint
│   │   ├── api/tts/route.ts        # TTS endpoint
│   │   ├── api/ocr/route.ts        # OCR endpoint
│   │   └── dashboard/
│   │       ├── page.tsx            # Projects list
│   │       └── project/[projectId]/
│   │           ├── page.tsx        # PDF workspace
│   │           ├── literature-review/page.tsx
│   │           ├── scholar-ask/page.tsx
│   │           ├── meta-analysis/page.tsx
│   │           └── paper-writer/page.tsx
│   ├── components/
│   │   ├── pdf/                    # PdfViewer, PdfPage, PdfToolbar, HighlightLayer, DocumentPanel
│   │   ├── annotations/           # AnnotationSidebar, NoteModal, HighlightDetailModal
│   │   ├── literature-review/     # ReviewTable, ReviewTableRow, Filters, ExportButton
│   │   ├── codes/                 # CodeSystemPanel
│   │   ├── meta/                  # MethodologyGuide
│   │   ├── tts/                   # TtsWidget, TtsControls
│   │   ├── doodles/               # SVG doodle illustrations
│   │   ├── auth/                  # LoginForm, SignupForm
│   │   ├── layout/                # Navbar, Sidebar
│   │   └── ui/                    # Spinner, CollapsibleSection, ResizablePanel
│   ├── hooks/                     # useUser, usePdf, useHighlights, useAnnotations,
│   │                              # useLiteratureReview, useCodes, useTts, usePaperWriter
│   ├── lib/
│   │   ├── supabase/              # client.ts, server.ts
│   │   ├── pdf/                   # loadPdf, extractText, extractMetadata
│   │   ├── tts/                   # speak.ts (browser TTS)
│   │   ├── ocr/                   # runOcr.ts
│   │   ├── data/                  # parseSav.ts (SPSS parser)
│   │   └── utils/                 # cn.ts, rateLimit.ts
│   └── types/                     # annotation, code, literature-review, pdf, project, paper-section
```

---

## 10. DEPLOYMENT

**Vercel (current):**
- Auto-deploys from GitHub main branch
- Environment variables set in Vercel dashboard
- Domain: cerise-scholar.vercel.app

**Required services:**
1. Supabase project (database + auth + storage)
2. Ollama Cloud account with API key (for AI features)
3. OpenAlex API (free, no key needed)
4. Microsoft Edge TTS (free, no key needed, via msedge-tts npm package)
