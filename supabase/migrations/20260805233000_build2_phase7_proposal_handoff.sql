BEGIN;

CREATE TABLE public.research_proposal_handoffs (
  project_id UUID PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schema_version INTEGER NOT NULL CHECK (schema_version >= 1),
  revision INTEGER NOT NULL CHECK (revision >= 1),
  checksum TEXT NOT NULL CHECK (checksum ~ '^sha256:[a-f0-9]{64}$'),
  proposal_checksum TEXT NOT NULL CHECK (proposal_checksum ~ '^sha256:[a-f0-9]{64}$'),
  package JSONB NOT NULL CHECK (jsonb_typeof(package) = 'object'),
  frozen_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT research_proposal_handoffs_package_size CHECK (pg_column_size(package) <= 2097152),
  CONSTRAINT research_proposal_handoffs_project_match CHECK (package ? 'projectId' AND package ->> 'projectId' = project_id::TEXT),
  CONSTRAINT research_proposal_handoffs_schema_match CHECK (package ? 'schemaVersion' AND (package ->> 'schemaVersion')::INTEGER = schema_version),
  CONSTRAINT research_proposal_handoffs_revision_match CHECK (package ? 'revision' AND (package ->> 'revision')::INTEGER = revision),
  CONSTRAINT research_proposal_handoffs_frozen_match CHECK (package ? 'frozenAt' AND (package ->> 'frozenAt')::TIMESTAMPTZ = frozen_at),
  CONSTRAINT research_proposal_handoffs_proposal_match CHECK (package -> 'proposalReference' ->> 'checksum' = proposal_checksum),
  CONSTRAINT research_proposal_handoffs_identity_match CHECK (
    package ? 'identity'
    AND jsonb_typeof(package -> 'identity') = 'object'
    AND package -> 'identity' ->> 'artifactKind' = 'proposal-handoff'
    AND package -> 'identity' ->> 'artifactId' = 'proposal-handoff-' || project_id::TEXT
    AND package -> 'identity' ->> 'checksum' = checksum
  ),
  CONSTRAINT research_proposal_handoffs_participant_exclusion CHECK (package ->> 'participantDataIncluded' = 'false')
);

CREATE TABLE public.research_proposal_handoff_revisions (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL CHECK (revision >= 1),
  schema_version INTEGER NOT NULL CHECK (schema_version >= 1),
  checksum TEXT NOT NULL CHECK (checksum ~ '^sha256:[a-f0-9]{64}$'),
  proposal_checksum TEXT NOT NULL CHECK (proposal_checksum ~ '^sha256:[a-f0-9]{64}$'),
  package JSONB NOT NULL CHECK (jsonb_typeof(package) = 'object'),
  frozen_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT research_proposal_handoff_revisions_primary PRIMARY KEY (project_id, revision),
  CONSTRAINT research_proposal_handoff_revisions_checksum_unique UNIQUE (project_id, checksum),
  CONSTRAINT research_proposal_handoff_revisions_package_size CHECK (pg_column_size(package) <= 2097152),
  CONSTRAINT research_proposal_handoff_revisions_project_match CHECK (package ? 'projectId' AND package ->> 'projectId' = project_id::TEXT),
  CONSTRAINT research_proposal_handoff_revisions_schema_match CHECK (package ? 'schemaVersion' AND (package ->> 'schemaVersion')::INTEGER = schema_version),
  CONSTRAINT research_proposal_handoff_revisions_revision_match CHECK (package ? 'revision' AND (package ->> 'revision')::INTEGER = revision),
  CONSTRAINT research_proposal_handoff_revisions_frozen_match CHECK (package ? 'frozenAt' AND (package ->> 'frozenAt')::TIMESTAMPTZ = frozen_at),
  CONSTRAINT research_proposal_handoff_revisions_proposal_match CHECK (package -> 'proposalReference' ->> 'checksum' = proposal_checksum),
  CONSTRAINT research_proposal_handoff_revisions_checksum_match CHECK (package -> 'identity' ->> 'checksum' = checksum),
  CONSTRAINT research_proposal_handoff_revisions_participant_exclusion CHECK (package ->> 'participantDataIncluded' = 'false')
);

CREATE INDEX research_proposal_handoffs_user_id_idx ON public.research_proposal_handoffs(user_id);
CREATE INDEX research_proposal_handoffs_proposal_checksum_idx ON public.research_proposal_handoffs(proposal_checksum);
CREATE INDEX research_proposal_handoff_revisions_user_id_idx ON public.research_proposal_handoff_revisions(user_id);
CREATE INDEX research_proposal_handoff_revisions_project_recorded_idx ON public.research_proposal_handoff_revisions(project_id, recorded_at DESC);

ALTER TABLE public.research_proposal_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_proposal_handoff_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_proposal_handoffs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.research_proposal_handoff_revisions FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.research_proposal_handoffs FROM anon;
REVOKE ALL ON TABLE public.research_proposal_handoff_revisions FROM anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.research_proposal_handoffs TO authenticated;
GRANT SELECT ON TABLE public.research_proposal_handoff_revisions TO authenticated;

CREATE POLICY research_proposal_handoffs_owner_select
  ON public.research_proposal_handoffs FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects WHERE projects.id = research_proposal_handoffs.project_id AND projects.user_id = (SELECT auth.uid())));
CREATE POLICY research_proposal_handoffs_owner_insert
  ON public.research_proposal_handoffs FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects WHERE projects.id = research_proposal_handoffs.project_id AND projects.user_id = (SELECT auth.uid())));
CREATE POLICY research_proposal_handoffs_owner_update
  ON public.research_proposal_handoffs FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects WHERE projects.id = research_proposal_handoffs.project_id AND projects.user_id = (SELECT auth.uid())))
  WITH CHECK ((SELECT auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects WHERE projects.id = research_proposal_handoffs.project_id AND projects.user_id = (SELECT auth.uid())));
CREATE POLICY research_proposal_handoff_revisions_owner_select
  ON public.research_proposal_handoff_revisions FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects WHERE projects.id = research_proposal_handoff_revisions.project_id AND projects.user_id = (SELECT auth.uid())));
CREATE FUNCTION public.enforce_research_proposal_handoff_revision_increment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.revision <= OLD.revision THEN
    RAISE EXCEPTION 'Proposal handoff revision must increase.' USING ERRCODE = '23514';
  END IF;
  IF NEW.user_id <> OLD.user_id OR NEW.project_id <> OLD.project_id THEN
    RAISE EXCEPTION 'Proposal handoff ownership and project identity are immutable.' USING ERRCODE = '23514';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.capture_research_proposal_handoff_revision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.research_proposal_handoff_revisions (
    project_id, user_id, revision, schema_version, checksum, proposal_checksum, package, frozen_at, recorded_at
  ) VALUES (
    NEW.project_id, NEW.user_id, NEW.revision, NEW.schema_version, NEW.checksum, NEW.proposal_checksum, NEW.package, NEW.frozen_at, now()
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.capture_research_proposal_handoff_revision() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.capture_research_proposal_handoff_revision() FROM anon;
REVOKE ALL ON FUNCTION public.capture_research_proposal_handoff_revision() FROM authenticated;

CREATE TRIGGER enforce_research_proposal_handoff_revision_increment_trigger
BEFORE UPDATE ON public.research_proposal_handoffs
FOR EACH ROW EXECUTE FUNCTION public.enforce_research_proposal_handoff_revision_increment();

CREATE TRIGGER capture_research_proposal_handoff_revision_trigger
AFTER INSERT OR UPDATE ON public.research_proposal_handoffs
FOR EACH ROW EXECUTE FUNCTION public.capture_research_proposal_handoff_revision();

COMMIT;
