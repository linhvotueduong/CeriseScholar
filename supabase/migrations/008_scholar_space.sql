-- ============================================
-- Cerise Scholar — Scholar Space (Community Forum)
-- Reddit-style posts, comments, and upvotes
-- ============================================

-- ── Posts ──
CREATE TABLE public.space_posts (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  body          TEXT DEFAULT '',
  topic         TEXT NOT NULL DEFAULT 'general',
  upvote_count  INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.space_posts ENABLE ROW LEVEL SECURITY;

-- Anyone logged in can read all posts
CREATE POLICY "Anyone can view posts"
  ON public.space_posts FOR SELECT
  USING (true);

-- Users can create their own posts
CREATE POLICY "Users can insert posts"
  ON public.space_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own posts
CREATE POLICY "Users can update own posts"
  ON public.space_posts FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete own posts"
  ON public.space_posts FOR DELETE
  USING (auth.uid() = user_id);

-- Index for sorting/filtering
CREATE INDEX idx_space_posts_created ON public.space_posts(created_at DESC);
CREATE INDEX idx_space_posts_topic ON public.space_posts(topic);
CREATE INDEX idx_space_posts_upvotes ON public.space_posts(upvote_count DESC);

-- ── Comments ──
CREATE TABLE public.space_comments (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id       UUID NOT NULL REFERENCES public.space_posts(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body          TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.space_comments ENABLE ROW LEVEL SECURITY;

-- Anyone logged in can read all comments
CREATE POLICY "Anyone can view comments"
  ON public.space_comments FOR SELECT
  USING (true);

-- Users can create their own comments
CREATE POLICY "Users can insert comments"
  ON public.space_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
  ON public.space_comments FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON public.space_comments FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_space_comments_post ON public.space_comments(post_id, created_at);

-- ── Upvotes (one per user per post) ──
CREATE TABLE public.space_upvotes (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id       UUID NOT NULL REFERENCES public.space_posts(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.space_upvotes ENABLE ROW LEVEL SECURITY;

-- Anyone logged in can see upvotes
CREATE POLICY "Anyone can view upvotes"
  ON public.space_upvotes FOR SELECT
  USING (true);

-- Users can insert their own upvotes
CREATE POLICY "Users can insert upvotes"
  ON public.space_upvotes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their own upvotes
CREATE POLICY "Users can delete own upvotes"
  ON public.space_upvotes FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_space_upvotes_post ON public.space_upvotes(post_id);
CREATE INDEX idx_space_upvotes_user ON public.space_upvotes(user_id);

-- ── Function: auto-update post counts ──

-- Increment/decrement upvote_count on space_posts
CREATE OR REPLACE FUNCTION update_post_upvote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.space_posts SET upvote_count = upvote_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.space_posts SET upvote_count = GREATEST(upvote_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_upvote_count
  AFTER INSERT OR DELETE ON public.space_upvotes
  FOR EACH ROW EXECUTE FUNCTION update_post_upvote_count();

-- Increment/decrement comment_count on space_posts
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.space_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.space_posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_comment_count
  AFTER INSERT OR DELETE ON public.space_comments
  FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();
