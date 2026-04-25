-- ============================================
-- Cerise Scholar — Course notes expansion
-- Adds:
--   1) course_notes   — per-user, per-video student notes
--   2) admin_notes    — text column on course_videos where admin can
--                      add supplementary content shown below the video
-- ============================================

-- ── 1) Student notes (per user, per video) ──
-- UNIQUE(user_id, video_id) enforces "one note per user per video";
-- the app upserts into the same row as the student types.
CREATE TABLE public.course_notes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id    UUID NOT NULL REFERENCES public.course_videos(id) ON DELETE CASCADE,
  content     TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, video_id)
);

ALTER TABLE public.course_notes ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notes
CREATE POLICY "Users can view own notes"
  ON public.course_notes FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own notes
CREATE POLICY "Users can insert own notes"
  ON public.course_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own notes
CREATE POLICY "Users can update own notes"
  ON public.course_notes FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own notes
CREATE POLICY "Users can delete own notes"
  ON public.course_notes FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_course_notes_user ON public.course_notes(user_id);
CREATE INDEX idx_course_notes_video ON public.course_notes(video_id);
CREATE INDEX idx_course_notes_user_updated ON public.course_notes(user_id, updated_at DESC);

-- ── 2) Admin notes on videos ──
-- Admin (cerisescholar@gmail.com) can add supplementary content per video.
-- Students read this via the existing course_videos SELECT policies — they
-- already see videos in published modules, and admin_notes comes along with
-- the row. The existing admin UPDATE policy lets admin write to this column.
ALTER TABLE public.course_videos
  ADD COLUMN admin_notes TEXT NOT NULL DEFAULT '';
