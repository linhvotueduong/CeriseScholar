-- Account/profile foundation for the settings and onboarding flows.
-- Additive only: keeps auth.users and every existing profile row intact.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS middle_name TEXT,
  ADD COLUMN IF NOT EXISTS level_of_study TEXT,
  ADD COLUMN IF NOT EXISTS institution_unitid TEXT,
  ADD COLUMN IF NOT EXISTS avatar_path TEXT,
  ADD COLUMN IF NOT EXISTS age_confirmed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_language TEXT NOT NULL DEFAULT 'en',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  email_updates_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Users view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users view own preferences" ON public.user_preferences;
CREATE POLICY "Users view own preferences"
  ON public.user_preferences FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users insert own preferences" ON public.user_preferences;
CREATE POLICY "Users insert own preferences"
  ON public.user_preferences FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users update own preferences" ON public.user_preferences;
CREATE POLICY "Users update own preferences"
  ON public.user_preferences FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

REVOKE ALL ON TABLE public.profiles FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.user_preferences FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.user_preferences TO authenticated;

CREATE OR REPLACE FUNCTION public.set_account_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_account_updated_at() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_account_updated_at();

DROP TRIGGER IF EXISTS user_preferences_set_updated_at ON public.user_preferences;
CREATE TRIGGER user_preferences_set_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_account_updated_at();

-- New users receive both rows. Fully qualified names and an empty search path
-- prevent search-path substitution in this security-definer trigger.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, first_name, middle_name, last_name, full_name, avatar_url,
    age_confirmed_at
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'middle_name',
    NEW.raw_user_meta_data ->> 'last_name',
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NEW.raw_user_meta_data ->> 'picture'),
    CASE
      WHEN lower(COALESCE(NEW.raw_user_meta_data ->> 'age_confirmed', 'false')) = 'true'
      THEN NEW.created_at
      ELSE NULL
    END
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_preferences (user_id, email_updates_enabled)
  VALUES (
    NEW.id,
    lower(COALESCE(NEW.raw_user_meta_data ->> 'email_updates_opt_in', 'false')) = 'true'
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Preserve existing users and infer only values they already supplied.
INSERT INTO public.user_preferences (user_id, email_updates_enabled)
SELECT
  u.id,
  lower(COALESCE(u.raw_user_meta_data ->> 'email_updates_opt_in', 'false')) = 'true'
FROM auth.users AS u
ON CONFLICT (user_id) DO NOTHING;

UPDATE public.profiles AS p
SET age_confirmed_at = u.created_at
FROM auth.users AS u
WHERE p.id = u.id
  AND p.age_confirmed_at IS NULL
  AND lower(COALESCE(u.raw_user_meta_data ->> 'age_confirmed', 'false')) = 'true';

-- Private avatars. Objects must live at <auth.uid()>/avatar.<extension>.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  false,
  102400,
  ARRAY['image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users read own avatars" ON storage.objects;
CREATE POLICY "Users read own avatars"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

DROP POLICY IF EXISTS "Users upload own avatars" ON storage.objects;
CREATE POLICY "Users upload own avatars"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

DROP POLICY IF EXISTS "Users update own avatars" ON storage.objects;
CREATE POLICY "Users update own avatars"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

DROP POLICY IF EXISTS "Users delete own avatars" ON storage.objects;
CREATE POLICY "Users delete own avatars"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

-- Record the exact legal documents shown by the July 7 signup UI. Consent
-- persistence resolves these rows server-side; the browser never supplies a hash.
INSERT INTO public.legal_documents (slug, title, version, content_hash, effective_date)
VALUES
  ('terms', 'Terms of Use', '2026-07-07', 'sha256:367679295ee98e1adff6cf3d2739372ed064e1dc2ec51efab7027c5f26aca92b', DATE '2026-07-07'),
  ('privacy', 'Privacy Policy', '2026-07-07', 'sha256:be3ce2df21d161f0fee0f238159e6552f6a18f68d90fe0b83f0b05dbc9a198a5', DATE '2026-07-07')
ON CONFLICT (slug, version) DO UPDATE
SET
  title = EXCLUDED.title,
  content_hash = EXCLUDED.content_hash,
  effective_date = EXCLUDED.effective_date;

REVOKE ALL ON TABLE public.legal_documents FROM PUBLIC;
REVOKE ALL ON TABLE public.user_consents FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.legal_documents TO anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.user_consents TO authenticated;
