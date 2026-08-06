BEGIN;

CREATE TABLE public.research_proposal_review_baselines (
  project_id UUID PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schema_version INTEGER NOT NULL CHECK (schema_version >= 1),
  revision INTEGER NOT NULL CHECK (revision >= 1),
  checksum TEXT NOT NULL CHECK (checksum ~ '^sha256:[a-f0-9]{64}$'),
  handoff_checksum TEXT NOT NULL CHECK (handoff_checksum ~ '^sha256:[a-f0-9]{64}$'),
  proposal_checksum TEXT NOT NULL CHECK (proposal_checksum ~ '^sha256:[a-f0-9]{64}$'),
  baseline JSONB NOT NULL CHECK (jsonb_typeof(baseline) = 'object'),
  frozen_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT research_proposal_review_baselines_size CHECK (pg_column_size(baseline) <= 2097152),
  CONSTRAINT research_proposal_review_baselines_project_match CHECK (baseline ->> 'projectId' = project_id::TEXT),
  CONSTRAINT research_proposal_review_baselines_schema_match CHECK ((baseline ->> 'schemaVersion')::INTEGER = schema_version),
  CONSTRAINT research_proposal_review_baselines_revision_match CHECK ((baseline ->> 'revision')::INTEGER = revision),
  CONSTRAINT research_proposal_review_baselines_freeze_match CHECK ((baseline ->> 'frozenAt')::TIMESTAMPTZ = frozen_at),
  CONSTRAINT research_proposal_review_baselines_handoff_match CHECK (baseline -> 'handoffReference' ->> 'checksum' = handoff_checksum),
  CONSTRAINT research_proposal_review_baselines_proposal_match CHECK (baseline -> 'proposalReference' ->> 'checksum' = proposal_checksum),
  CONSTRAINT research_proposal_review_baselines_identity_match CHECK (
    baseline -> 'identity' ->> 'artifactKind' = 'reviewed-proposal-baseline'
    AND baseline -> 'identity' ->> 'artifactId' = 'reviewed-proposal-' || project_id::TEXT
    AND baseline -> 'identity' ->> 'checksum' = checksum
  ),
  CONSTRAINT research_proposal_review_baselines_participant_exclusion CHECK (baseline ->> 'participantDataIncluded' = 'false')
);

CREATE TABLE public.research_proposal_review_baseline_revisions (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL CHECK (revision >= 1),
  schema_version INTEGER NOT NULL CHECK (schema_version >= 1),
  checksum TEXT NOT NULL CHECK (checksum ~ '^sha256:[a-f0-9]{64}$'),
  handoff_checksum TEXT NOT NULL CHECK (handoff_checksum ~ '^sha256:[a-f0-9]{64}$'),
  proposal_checksum TEXT NOT NULL CHECK (proposal_checksum ~ '^sha256:[a-f0-9]{64}$'),
  baseline JSONB NOT NULL CHECK (jsonb_typeof(baseline) = 'object'),
  frozen_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT research_proposal_review_baseline_revisions_primary PRIMARY KEY (project_id, revision),
  CONSTRAINT research_proposal_review_baseline_revisions_checksum_unique UNIQUE (project_id, checksum),
  CONSTRAINT research_proposal_review_baseline_revisions_size CHECK (pg_column_size(baseline) <= 2097152),
  CONSTRAINT research_proposal_review_baseline_revisions_project_match CHECK (baseline ->> 'projectId' = project_id::TEXT),
  CONSTRAINT research_proposal_review_baseline_revisions_checksum_match CHECK (baseline -> 'identity' ->> 'checksum' = checksum),
  CONSTRAINT research_proposal_review_baseline_revisions_participant_exclusion CHECK (baseline ->> 'participantDataIncluded' = 'false')
);

CREATE INDEX research_proposal_review_baselines_user_id_idx ON public.research_proposal_review_baselines(user_id);
CREATE INDEX research_proposal_review_baselines_handoff_idx ON public.research_proposal_review_baselines(handoff_checksum);
CREATE INDEX research_proposal_review_baseline_revisions_user_idx ON public.research_proposal_review_baseline_revisions(user_id);
CREATE INDEX research_proposal_review_baseline_revisions_recorded_idx ON public.research_proposal_review_baseline_revisions(project_id, recorded_at DESC);

ALTER TABLE public.research_proposal_review_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_proposal_review_baseline_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_proposal_review_baselines FORCE ROW LEVEL SECURITY;
ALTER TABLE public.research_proposal_review_baseline_revisions FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.research_proposal_review_baselines FROM anon;
REVOKE ALL ON TABLE public.research_proposal_review_baseline_revisions FROM anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.research_proposal_review_baselines TO authenticated;
GRANT SELECT ON TABLE public.research_proposal_review_baseline_revisions TO authenticated;

CREATE POLICY research_proposal_review_baselines_owner_select
  ON public.research_proposal_review_baselines FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects WHERE projects.id = research_proposal_review_baselines.project_id AND projects.user_id = (SELECT auth.uid())));
CREATE POLICY research_proposal_review_baselines_owner_insert
  ON public.research_proposal_review_baselines FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects WHERE projects.id = research_proposal_review_baselines.project_id AND projects.user_id = (SELECT auth.uid())));
CREATE POLICY research_proposal_review_baselines_owner_update
  ON public.research_proposal_review_baselines FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects WHERE projects.id = research_proposal_review_baselines.project_id AND projects.user_id = (SELECT auth.uid())))
  WITH CHECK ((SELECT auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects WHERE projects.id = research_proposal_review_baselines.project_id AND projects.user_id = (SELECT auth.uid())));
CREATE POLICY research_proposal_review_baseline_revisions_owner_select
  ON public.research_proposal_review_baseline_revisions FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects WHERE projects.id = research_proposal_review_baseline_revisions.project_id AND projects.user_id = (SELECT auth.uid())));

CREATE FUNCTION public.enforce_research_proposal_review_baseline_revision_increment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.revision <= OLD.revision THEN
    RAISE EXCEPTION 'Reviewed proposal baseline revision must increase.' USING ERRCODE = '23514';
  END IF;
  IF NEW.user_id <> OLD.user_id OR NEW.project_id <> OLD.project_id THEN
    RAISE EXCEPTION 'Reviewed proposal baseline ownership and project identity are immutable.' USING ERRCODE = '23514';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.capture_research_proposal_review_baseline_revision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.research_proposal_review_baseline_revisions (
    project_id, user_id, revision, schema_version, checksum, handoff_checksum, proposal_checksum, baseline, frozen_at, recorded_at
  ) VALUES (
    NEW.project_id, NEW.user_id, NEW.revision, NEW.schema_version, NEW.checksum, NEW.handoff_checksum, NEW.proposal_checksum, NEW.baseline, NEW.frozen_at, now()
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.capture_research_proposal_review_baseline_revision() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.capture_research_proposal_review_baseline_revision() FROM anon;
REVOKE ALL ON FUNCTION public.capture_research_proposal_review_baseline_revision() FROM authenticated;

CREATE TRIGGER enforce_research_proposal_review_baseline_revision_increment_trigger
BEFORE UPDATE ON public.research_proposal_review_baselines
FOR EACH ROW EXECUTE FUNCTION public.enforce_research_proposal_review_baseline_revision_increment();

CREATE TRIGGER capture_research_proposal_review_baseline_revision_trigger
AFTER INSERT OR UPDATE ON public.research_proposal_review_baselines
FOR EACH ROW EXECUTE FUNCTION public.capture_research_proposal_review_baseline_revision();

COMMIT;
