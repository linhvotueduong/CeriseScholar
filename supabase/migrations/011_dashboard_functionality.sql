-- ============================================
-- Cerise Scholar — Dashboard Functionality
-- Lightweight dashboard metadata only.
-- Do not store private source text, OCR output, local indexes, or files here.
-- ============================================

CREATE TABLE IF NOT EXISTS public.dashboard_project_settings (
  id                       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id               UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  current_section_id        TEXT DEFAULT 'meta-analysis',
  preferred_daily_minutes   INT DEFAULT 35,
  target_completion_date    DATE,
  created_at               TIMESTAMPTZ DEFAULT now(),
  updated_at               TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, project_id)
);

ALTER TABLE public.dashboard_project_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own dashboard settings"
  ON public.dashboard_project_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own dashboard settings"
  ON public.dashboard_project_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own dashboard settings"
  ON public.dashboard_project_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own dashboard settings"
  ON public.dashboard_project_settings FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_dashboard_settings_user_project
  ON public.dashboard_project_settings(user_id, project_id);

CREATE TABLE IF NOT EXISTS public.dashboard_tasks (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_date       DATE NOT NULL,
  scheduled_time  TEXT DEFAULT '',
  title           TEXT NOT NULL,
  subtitle        TEXT DEFAULT '',
  section_id      TEXT DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'completed')),
  sort_order      INT NOT NULL DEFAULT 0,
  generation_key  TEXT NOT NULL,
  deleted_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, project_id, task_date, generation_key)
);

ALTER TABLE public.dashboard_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own dashboard tasks"
  ON public.dashboard_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own dashboard tasks"
  ON public.dashboard_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own dashboard tasks"
  ON public.dashboard_tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own dashboard tasks"
  ON public.dashboard_tasks FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_dashboard_tasks_user_project_date
  ON public.dashboard_tasks(user_id, project_id, task_date, sort_order);

CREATE INDEX IF NOT EXISTS idx_dashboard_tasks_user_project_deleted
  ON public.dashboard_tasks(user_id, project_id, deleted_at);

CREATE INDEX IF NOT EXISTS idx_dashboard_tasks_user_project_completed
  ON public.dashboard_tasks(user_id, project_id, completed_at DESC);

CREATE TABLE IF NOT EXISTS public.dashboard_activity_events (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  section_id  TEXT DEFAULT '',
  label       TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.dashboard_activity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own dashboard activity"
  ON public.dashboard_activity_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own dashboard activity"
  ON public.dashboard_activity_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own dashboard activity"
  ON public.dashboard_activity_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own dashboard activity"
  ON public.dashboard_activity_events FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_dashboard_activity_user_project_created
  ON public.dashboard_activity_events(user_id, project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dashboard_activity_user_project_type
  ON public.dashboard_activity_events(user_id, project_id, event_type);
