-- ============================================
-- Cerise Scholar - public beta waitlist/access gate
-- Additive foundation for limited beta approval.
--
-- This migration does not alter Cloudflare, DNS, tunnel, storage,
-- auth provider settings, production env, or existing research tables.
-- ============================================

CREATE TABLE public.beta_waitlist_applications (
  id                         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email                      TEXT NOT NULL,
  full_name                  TEXT,
  status                     TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'future_cohort')),
  signup_method              TEXT NOT NULL DEFAULT 'unknown'
    CHECK (signup_method IN ('email', 'google', 'unknown')),
  admin_notes                TEXT NOT NULL DEFAULT '',
  reviewed_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at                TIMESTAMPTZ,
  waitlist_email_sent_at     TIMESTAMPTZ,
  approval_email_sent_at     TIMESTAMPTZ,
  future_cohort_email_sent_at TIMESTAMPTZ,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
CREATE UNIQUE INDEX beta_waitlist_applications_email_unique
  ON public.beta_waitlist_applications (lower(btrim(email)));
CREATE INDEX beta_waitlist_applications_status_created
  ON public.beta_waitlist_applications(status, created_at DESC);
CREATE INDEX beta_waitlist_applications_reviewed
  ON public.beta_waitlist_applications(reviewed_at DESC);
CREATE TABLE public.beta_waitlist_activity_events (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES public.beta_waitlist_applications(id) ON DELETE CASCADE,
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type     TEXT NOT NULL,
  details        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX beta_waitlist_activity_application
  ON public.beta_waitlist_activity_events(application_id, created_at DESC);
CREATE INDEX beta_waitlist_activity_user
  ON public.beta_waitlist_activity_events(user_id, created_at DESC);
ALTER TABLE public.beta_waitlist_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beta_waitlist_activity_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own beta waitlist application"
  ON public.beta_waitlist_applications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own beta waitlist application"
  ON public.beta_waitlist_applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending_review');
CREATE POLICY "Admin can view beta waitlist applications"
  ON public.beta_waitlist_applications FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'email') = 'cerisescholar@gmail.com');
CREATE POLICY "Admin can update beta waitlist applications"
  ON public.beta_waitlist_applications FOR UPDATE TO authenticated
  USING ((auth.jwt() ->> 'email') = 'cerisescholar@gmail.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'cerisescholar@gmail.com');
CREATE POLICY "Admin can view beta waitlist activity"
  ON public.beta_waitlist_activity_events FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'email') = 'cerisescholar@gmail.com');
CREATE POLICY "Admin can insert beta waitlist activity"
  ON public.beta_waitlist_activity_events FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() ->> 'email') = 'cerisescholar@gmail.com');
CREATE OR REPLACE FUNCTION public.record_beta_waitlist_consents(
  p_user_id UUID,
  p_consent JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  doc JSONB;
  doc_slug TEXT;
  doc_title TEXT;
  doc_version TEXT;
  doc_hash TEXT;
  accepted_at_value TIMESTAMPTZ;
BEGIN
  IF COALESCE(p_consent ->> 'accepted', 'false') <> 'true' THEN
    RETURN;
  END IF;

  BEGIN
    accepted_at_value := COALESCE((p_consent ->> 'accepted_at')::timestamptz, now());
  EXCEPTION WHEN others THEN
    accepted_at_value := now();
  END;

  FOR doc IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_consent -> 'documents', '[]'::jsonb))
  LOOP
    doc_slug := doc ->> 'slug';
    doc_title := doc ->> 'title';
    doc_version := doc ->> 'version';
    doc_hash := doc ->> 'content_hash';

    IF doc_slug IN ('terms', 'privacy')
      AND doc_version IS NOT NULL
      AND doc_hash IS NOT NULL
    THEN
      INSERT INTO public.user_consents (
        user_id,
        document_slug,
        document_version,
        document_hash,
        accepted_at
      )
      VALUES (
        p_user_id,
        doc_slug,
        doc_version,
        doc_hash,
        accepted_at_value
      )
      ON CONFLICT (user_id, document_slug, document_version, document_hash) DO NOTHING;
    END IF;
  END LOOP;
END;
$$;
CREATE OR REPLACE FUNCTION public.handle_new_beta_waitlist_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  metadata JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  consent JSONB := COALESCE(NEW.raw_user_meta_data -> 'cerise_waitlist_consent', '{}'::jsonb);
  provider TEXT := COALESCE(NEW.raw_app_meta_data ->> 'provider', '');
  method TEXT;
  app_id UUID;
BEGIN
  method := COALESCE(metadata ->> 'signup_method', '');

  IF method NOT IN ('email', 'google') THEN
    method := CASE WHEN provider = 'google' THEN 'google' ELSE 'email' END;
  END IF;

  INSERT INTO public.beta_waitlist_applications (
    user_id,
    email,
    full_name,
    signup_method,
    status
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    NULLIF(COALESCE(metadata ->> 'full_name', metadata ->> 'name', ''), ''),
    method,
    'pending_review'
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.beta_waitlist_applications.full_name, EXCLUDED.full_name),
    signup_method = CASE
      WHEN public.beta_waitlist_applications.signup_method = 'unknown'
      THEN EXCLUDED.signup_method
      ELSE public.beta_waitlist_applications.signup_method
    END,
    updated_at = now()
  RETURNING id INTO app_id;

  PERFORM public.record_beta_waitlist_consents(NEW.id, consent);

  INSERT INTO public.beta_waitlist_activity_events (
    application_id,
    user_id,
    event_type,
    details
  )
  VALUES (
    app_id,
    NEW.id,
    'waitlist_created',
    jsonb_build_object('signup_method', method)
  );

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created_beta_waitlist ON auth.users;
CREATE TRIGGER on_auth_user_created_beta_waitlist
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_beta_waitlist_user();
CREATE OR REPLACE FUNCTION public.ensure_beta_waitlist_application(
  p_signup_method TEXT DEFAULT 'unknown',
  p_consent JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(application_id UUID, status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  current_email TEXT := auth.jwt() ->> 'email';
  normalized_method TEXT := COALESCE(p_signup_method, 'unknown');
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF normalized_method NOT IN ('email', 'google') THEN
    normalized_method := 'unknown';
  END IF;

  INSERT INTO public.beta_waitlist_applications (
    user_id,
    email,
    signup_method,
    status
  )
  VALUES (
    current_user_id,
    COALESCE(current_email, ''),
    normalized_method,
    'pending_review'
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    email = COALESCE(NULLIF(EXCLUDED.email, ''), public.beta_waitlist_applications.email),
    signup_method = CASE
      WHEN public.beta_waitlist_applications.signup_method = 'unknown'
      THEN EXCLUDED.signup_method
      ELSE public.beta_waitlist_applications.signup_method
    END,
    updated_at = now()
  RETURNING id, public.beta_waitlist_applications.status
  INTO application_id, status;

  PERFORM public.record_beta_waitlist_consents(current_user_id, p_consent);

  INSERT INTO public.beta_waitlist_activity_events (
    application_id,
    user_id,
    event_type,
    details
  )
  VALUES (
    application_id,
    current_user_id,
    'waitlist_ensured',
    jsonb_build_object('signup_method', normalized_method)
  );

  RETURN NEXT;
END;
$$;
REVOKE ALL ON FUNCTION public.record_beta_waitlist_consents(UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_beta_waitlist_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_beta_waitlist_application(TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_beta_waitlist_application(TEXT, JSONB) TO authenticated;
