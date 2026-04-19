-- ============================================
-- Cerise Scholar — Meta-Analysis
-- One meta-analysis per project (1:1).
-- Stores the research question, hypothesis, hypothesis type,
-- and the canvas state (list of plot blocks) from Step 5.
-- ============================================

CREATE TABLE IF NOT EXISTS public.meta_analyses (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id       UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  research_question TEXT DEFAULT '',
  hypothesis       TEXT DEFAULT '',
  hypothesis_type  TEXT DEFAULT '',        -- 'moderation' | 'group_comparison' | 'correlation' | 'prediction' | 'mediation'
  canvas_blocks    JSONB DEFAULT '[]'::jsonb, -- [{id, type, config}]
  column_mapping   JSONB DEFAULT '{}'::jsonb, -- {study, n, effect, se, moderator, ...}
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.meta_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own meta-analyses" ON public.meta_analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own meta-analyses" ON public.meta_analyses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own meta-analyses" ON public.meta_analyses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own meta-analyses" ON public.meta_analyses FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_meta_analyses_project ON public.meta_analyses(project_id);
