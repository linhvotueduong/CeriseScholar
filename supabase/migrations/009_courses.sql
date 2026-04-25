-- ============================================
-- Cerise Scholar — Courses
-- YouTube-embedded video courses with modules,
-- admin management (cerisescholar@gmail.com only),
-- and per-user progress tracking.
-- ============================================

-- ── Modules ──
-- A module is a group of lessons (e.g. "Writing the Introduction").
-- is_published=false hides the module from students (admin still sees it).
CREATE TABLE public.course_modules (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT DEFAULT '',
  module_order  INT NOT NULL DEFAULT 0,
  is_published  BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;

-- Anyone logged in can view PUBLISHED modules
CREATE POLICY "Anyone can view published modules"
  ON public.course_modules FOR SELECT
  USING (is_published = true);

-- Admin can view ALL modules (published + drafts)
CREATE POLICY "Admin can view all modules"
  ON public.course_modules FOR SELECT
  USING ((auth.jwt() ->> 'email') = 'cerisescholar@gmail.com');

-- Admin only: insert modules
CREATE POLICY "Admin can insert modules"
  ON public.course_modules FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'email') = 'cerisescholar@gmail.com');

-- Admin only: update modules
CREATE POLICY "Admin can update modules"
  ON public.course_modules FOR UPDATE
  USING ((auth.jwt() ->> 'email') = 'cerisescholar@gmail.com');

-- Admin only: delete modules
CREATE POLICY "Admin can delete modules"
  ON public.course_modules FOR DELETE
  USING ((auth.jwt() ->> 'email') = 'cerisescholar@gmail.com');

CREATE INDEX idx_course_modules_order ON public.course_modules(module_order);
CREATE INDEX idx_course_modules_published ON public.course_modules(is_published);

-- ── Videos (lessons inside modules) ──
-- youtube_id is the 11-char id from a YouTube URL (e.g. "dQw4w9WgXcQ").
-- duration_minutes is a plain integer (matches the "18 min" display format).
CREATE TABLE public.course_videos (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id         UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  youtube_id        TEXT NOT NULL,
  duration_minutes  INT DEFAULT 0,
  video_order       INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.course_videos ENABLE ROW LEVEL SECURITY;

-- Anyone logged in can view videos whose module is published
CREATE POLICY "Anyone can view videos in published modules"
  ON public.course_videos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.course_modules m
      WHERE m.id = course_videos.module_id
        AND m.is_published = true
    )
  );

-- Admin can view ALL videos
CREATE POLICY "Admin can view all videos"
  ON public.course_videos FOR SELECT
  USING ((auth.jwt() ->> 'email') = 'cerisescholar@gmail.com');

-- Admin only: insert / update / delete videos
CREATE POLICY "Admin can insert videos"
  ON public.course_videos FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'email') = 'cerisescholar@gmail.com');

CREATE POLICY "Admin can update videos"
  ON public.course_videos FOR UPDATE
  USING ((auth.jwt() ->> 'email') = 'cerisescholar@gmail.com');

CREATE POLICY "Admin can delete videos"
  ON public.course_videos FOR DELETE
  USING ((auth.jwt() ->> 'email') = 'cerisescholar@gmail.com');

CREATE INDEX idx_course_videos_module ON public.course_videos(module_id, video_order);

-- ── Progress (per-user, per-video) ──
-- A row exists only when the user has watched that video.
-- UNIQUE(user_id, video_id) prevents duplicate rows.
CREATE TABLE public.course_progress (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id    UUID NOT NULL REFERENCES public.course_videos(id) ON DELETE CASCADE,
  watched_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, video_id)
);

ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;

-- Users can see ONLY their own progress
CREATE POLICY "Users can view own progress"
  ON public.course_progress FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own progress rows
CREATE POLICY "Users can insert own progress"
  ON public.course_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own progress rows (un-mark as watched)
CREATE POLICY "Users can delete own progress"
  ON public.course_progress FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_course_progress_user ON public.course_progress(user_id);
CREATE INDEX idx_course_progress_video ON public.course_progress(video_id);
