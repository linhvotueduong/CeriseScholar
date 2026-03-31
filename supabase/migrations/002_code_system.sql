-- ============================================
-- Cerise Scholar — Code System
-- Adds a coding system (like MAXQDA) so users can
-- tag highlights with research paper sections
-- ============================================

-- Table: codes — each code represents a section/category
CREATE TABLE public.codes (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  color         TEXT DEFAULT '#6B7280',
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- RLS for codes
ALTER TABLE public.codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own codes" ON public.codes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own codes" ON public.codes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own codes" ON public.codes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own codes" ON public.codes FOR DELETE USING (auth.uid() = user_id);

-- Add code_id to highlights
ALTER TABLE public.highlights ADD COLUMN code_id UUID REFERENCES public.codes(id) ON DELETE SET NULL;

-- Add code_name to literature_review_entries (denormalized for easy display)
ALTER TABLE public.literature_review_entries ADD COLUMN code_name TEXT DEFAULT '';
