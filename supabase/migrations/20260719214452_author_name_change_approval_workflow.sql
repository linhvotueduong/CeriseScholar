-- Protect the author name shown on Cerise Scholar papers and provide a
-- reviewable, auditable name-change workflow.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS author_name_locked_at TIMESTAMPTZ;

-- Existing profile names predate this workflow. Treat them as the member's
-- established author name instead of forcing everyone through onboarding again.
UPDATE public.profiles
SET author_name_locked_at = COALESCE(updated_at, created_at, now())
WHERE author_name_locked_at IS NULL
  AND (
    NULLIF(btrim(first_name), '') IS NOT NULL
    OR NULLIF(btrim(last_name), '') IS NOT NULL
    OR NULLIF(btrim(full_name), '') IS NOT NULL
  );

CREATE TABLE IF NOT EXISTS public.author_name_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_first_name TEXT,
  current_middle_name TEXT,
  current_last_name TEXT,
  current_full_name TEXT,
  requested_first_name TEXT NOT NULL,
  requested_middle_name TEXT,
  requested_last_name TEXT NOT NULL,
  requested_full_name TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (char_length(btrim(requested_first_name)) BETWEEN 1 AND 100),
  CHECK (requested_middle_name IS NULL OR char_length(btrim(requested_middle_name)) <= 100),
  CHECK (char_length(btrim(requested_last_name)) BETWEEN 1 AND 100),
  CHECK (char_length(btrim(reason)) BETWEEN 20 AND 1000)
);

CREATE UNIQUE INDEX IF NOT EXISTS author_name_change_requests_one_pending_per_user
  ON public.author_name_change_requests (user_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS author_name_change_requests_admin_queue
  ON public.author_name_change_requests (status, created_at DESC);

ALTER TABLE public.author_name_change_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own author name requests"
  ON public.author_name_change_requests;
CREATE POLICY "Users view own author name requests"
  ON public.author_name_change_requests
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON TABLE public.author_name_change_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.author_name_change_requests TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.author_name_change_requests TO service_role;

-- Names may be inserted by the signup trigger and changed only by the functions
-- below. Ordinary profile editing keeps access to non-name profile fields.
REVOKE INSERT, UPDATE ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT INSERT (
  id, avatar_url, avatar_path, bio, institution, institution_unitid,
  field_of_study, level_of_study, onboarding_completed
) ON TABLE public.profiles TO authenticated;
GRANT UPDATE (
  avatar_url, avatar_path, bio, institution, institution_unitid,
  field_of_study, level_of_study, onboarding_completed
) ON TABLE public.profiles TO authenticated;

-- Email/password signup supplies a confirmed author name before auth.users is
-- created. OAuth signup is locked later by set_initial_author_name after the
-- member reviews the locally preserved signup form.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, first_name, middle_name, last_name, full_name, avatar_url,
    age_confirmed_at, author_name_locked_at
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
    END,
    CASE
      WHEN lower(COALESCE(NEW.raw_user_meta_data ->> 'author_name_confirmed', 'false')) = 'true'
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

CREATE OR REPLACE FUNCTION public.set_initial_author_name(
  requested_first_name TEXT,
  requested_middle_name TEXT,
  requested_last_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_id UUID := auth.uid();
  clean_first TEXT := regexp_replace(btrim(COALESCE(requested_first_name, '')), '\s+', ' ', 'g');
  clean_middle TEXT := NULLIF(regexp_replace(btrim(COALESCE(requested_middle_name, '')), '\s+', ' ', 'g'), '');
  clean_last TEXT := regexp_replace(btrim(COALESCE(requested_last_name, '')), '\s+', ' ', 'g');
  profile_locked_at TIMESTAMPTZ;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF char_length(clean_first) NOT BETWEEN 1 AND 100
     OR char_length(clean_last) NOT BETWEEN 1 AND 100
     OR char_length(COALESCE(clean_middle, '')) > 100 THEN
    RAISE EXCEPTION 'Enter a valid first and last name';
  END IF;

  SELECT author_name_locked_at
    INTO profile_locked_at
  FROM public.profiles
  WHERE id = caller_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;
  IF profile_locked_at IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.profiles
  SET
    first_name = clean_first,
    middle_name = clean_middle,
    last_name = clean_last,
    full_name = concat_ws(' ', clean_first, clean_middle, clean_last),
    author_name_locked_at = now()
  WHERE id = caller_id;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.set_initial_author_name(TEXT, TEXT, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_initial_author_name(TEXT, TEXT, TEXT)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_author_name_change(
  requested_first_name TEXT,
  requested_middle_name TEXT,
  requested_last_name TEXT,
  request_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_id UUID := auth.uid();
  current_profile public.profiles%ROWTYPE;
  clean_first TEXT := regexp_replace(btrim(COALESCE(requested_first_name, '')), '\s+', ' ', 'g');
  clean_middle TEXT := NULLIF(regexp_replace(btrim(COALESCE(requested_middle_name, '')), '\s+', ' ', 'g'), '');
  clean_last TEXT := regexp_replace(btrim(COALESCE(requested_last_name, '')), '\s+', ' ', 'g');
  clean_reason TEXT := btrim(COALESCE(request_reason, ''));
  clean_full TEXT;
  request_id UUID;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF char_length(clean_first) NOT BETWEEN 1 AND 100
     OR char_length(clean_last) NOT BETWEEN 1 AND 100
     OR char_length(COALESCE(clean_middle, '')) > 100 THEN
    RAISE EXCEPTION 'Enter a valid first and last name';
  END IF;
  IF char_length(clean_reason) NOT BETWEEN 20 AND 1000 THEN
    RAISE EXCEPTION 'Reason must be between 20 and 1000 characters';
  END IF;

  SELECT * INTO current_profile
  FROM public.profiles
  WHERE id = caller_id
  FOR UPDATE;

  IF NOT FOUND OR current_profile.author_name_locked_at IS NULL THEN
    RAISE EXCEPTION 'Complete your author name setup first';
  END IF;

  clean_full := concat_ws(' ', clean_first, clean_middle, clean_last);
  IF lower(clean_full) = lower(COALESCE(current_profile.full_name, '')) THEN
    RAISE EXCEPTION 'Requested name matches the current author name';
  END IF;

  INSERT INTO public.author_name_change_requests (
    user_id,
    current_first_name,
    current_middle_name,
    current_last_name,
    current_full_name,
    requested_first_name,
    requested_middle_name,
    requested_last_name,
    requested_full_name,
    reason
  ) VALUES (
    caller_id,
    current_profile.first_name,
    current_profile.middle_name,
    current_profile.last_name,
    current_profile.full_name,
    clean_first,
    clean_middle,
    clean_last,
    clean_full,
    clean_reason
  )
  RETURNING id INTO request_id;

  RETURN request_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'A name change request is already pending';
END;
$$;

REVOKE ALL ON FUNCTION public.submit_author_name_change(TEXT, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_author_name_change(TEXT, TEXT, TEXT, TEXT)
  TO authenticated;

-- The API route verifies the Cerise admin first; this function repeats that
-- authorization check using Supabase Auth's signed top-level email claim. It
-- never trusts editable user_metadata. Approval and profile mutation happen in
-- one transaction without exposing a service-role key to the application.
CREATE OR REPLACE FUNCTION public.review_author_name_change(
  target_request_id UUID,
  review_decision TEXT,
  reviewer_note TEXT DEFAULT NULL
)
RETURNS public.author_name_change_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_request public.author_name_change_requests%ROWTYPE;
  clean_decision TEXT := lower(btrim(COALESCE(review_decision, '')));
BEGIN
  IF lower(COALESCE(auth.jwt() ->> 'email', '')) <> 'cerisescholar@gmail.com' THEN
    RAISE EXCEPTION 'Cerise admin required' USING ERRCODE = '42501';
  END IF;
  IF clean_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Decision must be approved or rejected';
  END IF;
  IF char_length(btrim(COALESCE(reviewer_note, ''))) > 1000 THEN
    RAISE EXCEPTION 'Review note must be 1000 characters or fewer';
  END IF;

  SELECT * INTO target_request
  FROM public.author_name_change_requests
  WHERE id = target_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Name change request not found';
  END IF;
  IF target_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Name change request has already been reviewed';
  END IF;

  IF clean_decision = 'approved' THEN
    UPDATE public.profiles
    SET
      first_name = target_request.requested_first_name,
      middle_name = target_request.requested_middle_name,
      last_name = target_request.requested_last_name,
      full_name = target_request.requested_full_name,
      author_name_locked_at = now()
    WHERE id = target_request.user_id;
  END IF;

  UPDATE public.author_name_change_requests
  SET
    status = clean_decision,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    review_note = NULLIF(btrim(COALESCE(reviewer_note, '')), '')
  WHERE id = target_request_id
  RETURNING * INTO target_request;

  RETURN target_request;
END;
$$;

REVOKE ALL ON FUNCTION public.review_author_name_change(UUID, TEXT, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_author_name_change(UUID, TEXT, TEXT)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.list_author_name_change_requests()
RETURNS SETOF public.author_name_change_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF lower(COALESCE(auth.jwt() ->> 'email', '')) <> 'cerisescholar@gmail.com' THEN
    RAISE EXCEPTION 'Cerise admin required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT request.*
  FROM public.author_name_change_requests AS request
  ORDER BY request.created_at DESC
  LIMIT 100;
END;
$$;

REVOKE ALL ON FUNCTION public.list_author_name_change_requests()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_author_name_change_requests()
  TO authenticated;

DROP TRIGGER IF EXISTS author_name_change_requests_set_updated_at
  ON public.author_name_change_requests;
CREATE TRIGGER author_name_change_requests_set_updated_at
  BEFORE UPDATE ON public.author_name_change_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_account_updated_at();

COMMENT ON TABLE public.author_name_change_requests IS
  'Audited requests to change the author name displayed on Cerise Scholar papers.';
