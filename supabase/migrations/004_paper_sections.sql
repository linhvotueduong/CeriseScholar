-- ============================================
-- Cerise Scholar — Paper Writer Sections
-- Stores the content of each research paper section per project.
-- ============================================

CREATE TABLE public.paper_sections (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id    UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  section_key   TEXT NOT NULL,
  content       TEXT DEFAULT '',
  updated_at    TIMESTAMPTZ DEFAULT now(),

  -- One row per section per project
  UNIQUE(project_id, section_key)
);

-- RLS for paper_sections
ALTER TABLE public.paper_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own paper sections" ON public.paper_sections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own paper sections" ON public.paper_sections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own paper sections" ON public.paper_sections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own paper sections" ON public.paper_sections FOR DELETE USING (auth.uid() = user_id);
