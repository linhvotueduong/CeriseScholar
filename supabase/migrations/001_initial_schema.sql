-- ============================================
-- Cerise Scholar — Initial Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- Table 1: PDFs — stores metadata about every uploaded PDF
CREATE TABLE public.pdfs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename      TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  storage_path  TEXT NOT NULL,
  page_count    INTEGER,
  ocr_status    TEXT DEFAULT 'pending'
      CHECK (ocr_status IN ('pending','processing','completed','failed')),
  ocr_text      TEXT,
  file_size     BIGINT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Table 2: Highlights — every text highlight a user makes in a PDF
CREATE TABLE public.highlights (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pdf_id          UUID NOT NULL REFERENCES public.pdfs(id) ON DELETE CASCADE,
  page_number     INTEGER NOT NULL,
  highlighted_text TEXT NOT NULL,
  color           TEXT DEFAULT '#FFD700',
  rects           JSONB NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Table 3: Annotations — sticky notes and comments
CREATE TABLE public.annotations (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pdf_id          UUID NOT NULL REFERENCES public.pdfs(id) ON DELETE CASCADE,
  highlight_id    UUID REFERENCES public.highlights(id) ON DELETE SET NULL,
  page_number     INTEGER NOT NULL,
  content         TEXT NOT NULL,
  position_x      FLOAT NOT NULL,
  position_y      FLOAT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Table 4: Literature Review Entries — the synthesized lit review table
CREATE TABLE public.literature_review_entries (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pdf_id            UUID NOT NULL REFERENCES public.pdfs(id) ON DELETE CASCADE,
  highlight_id      UUID REFERENCES public.highlights(id) ON DELETE SET NULL,
  source            TEXT NOT NULL,
  authors           TEXT DEFAULT '',
  year              TEXT DEFAULT '',
  page_number       INTEGER NOT NULL,
  highlighted_text  TEXT NOT NULL,
  theme_category    TEXT DEFAULT '',
  user_notes        TEXT DEFAULT '',
  date_added        TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Row Level Security (RLS) — users can only see their own data
-- ============================================

-- PDFs
ALTER TABLE public.pdfs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own PDFs" ON public.pdfs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own PDFs" ON public.pdfs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own PDFs" ON public.pdfs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own PDFs" ON public.pdfs FOR DELETE USING (auth.uid() = user_id);

-- Highlights
ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own highlights" ON public.highlights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own highlights" ON public.highlights FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own highlights" ON public.highlights FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own highlights" ON public.highlights FOR DELETE USING (auth.uid() = user_id);

-- Annotations
ALTER TABLE public.annotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own annotations" ON public.annotations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own annotations" ON public.annotations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own annotations" ON public.annotations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own annotations" ON public.annotations FOR DELETE USING (auth.uid() = user_id);

-- Literature Review Entries
ALTER TABLE public.literature_review_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own entries" ON public.literature_review_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own entries" ON public.literature_review_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own entries" ON public.literature_review_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own entries" ON public.literature_review_entries FOR DELETE USING (auth.uid() = user_id);
