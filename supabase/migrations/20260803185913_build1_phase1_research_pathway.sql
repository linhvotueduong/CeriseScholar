-- Cerise Scholar Build 1, Phase 1 — canonical Stage 1 research pathway.
--
-- The current pathway document is cloud-authoritative. Every accepted revision
-- is copied to an append-only history table by an invoker-rights trigger so an
-- explicit conflict choice never destroys the previously secured revision.
-- Existing projects.research_* columns and browser drafts remain intact for a
-- rollback-safe compatibility period.

CREATE TABLE public.research_pathway_documents (
  project_id UUID PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schema_version INTEGER NOT NULL CHECK (schema_version >= 1),
  revision INTEGER NOT NULL CHECK (revision >= 1),
  checksum TEXT NOT NULL CHECK (checksum ~ '^sha256:[a-f0-9]{64}$'),
  document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT research_pathway_documents_document_size CHECK (pg_column_size(document) <= 2097152),
  CONSTRAINT research_pathway_documents_project_match CHECK (document ? 'projectId' AND document ->> 'projectId' = project_id::TEXT),
  CONSTRAINT research_pathway_documents_schema_match CHECK (document ? 'schemaVersion' AND (document ->> 'schemaVersion')::INTEGER = schema_version),
  CONSTRAINT research_pathway_documents_revision_match CHECK (document ? 'revision' AND (document ->> 'revision')::INTEGER = revision),
  CONSTRAINT research_pathway_documents_checksum_match CHECK (
    document ? 'identity'
    AND jsonb_typeof(document -> 'identity') = 'object'
    AND document -> 'identity' ->> 'checksum' = checksum
  ),
  CONSTRAINT research_pathway_documents_updated_match CHECK (document ? 'updatedAt' AND (document ->> 'updatedAt')::TIMESTAMPTZ = updated_at),
  CONSTRAINT research_pathway_documents_participant_exclusion CHECK (document ? 'participantDataIncluded' AND document ->> 'participantDataIncluded' = 'false')
);

CREATE TABLE public.research_pathway_revisions (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL CHECK (revision >= 1),
  schema_version INTEGER NOT NULL CHECK (schema_version >= 1),
  checksum TEXT NOT NULL CHECK (checksum ~ '^sha256:[a-f0-9]{64}$'),
  document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object'),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT research_pathway_revisions_primary PRIMARY KEY (project_id, revision),
  CONSTRAINT research_pathway_revisions_checksum_unique UNIQUE (project_id, checksum),
  CONSTRAINT research_pathway_revisions_document_size CHECK (pg_column_size(document) <= 2097152),
  CONSTRAINT research_pathway_revisions_project_match CHECK (document ? 'projectId' AND document ->> 'projectId' = project_id::TEXT),
  CONSTRAINT research_pathway_revisions_schema_match CHECK (document ? 'schemaVersion' AND (document ->> 'schemaVersion')::INTEGER = schema_version),
  CONSTRAINT research_pathway_revisions_revision_match CHECK (document ? 'revision' AND (document ->> 'revision')::INTEGER = revision),
  CONSTRAINT research_pathway_revisions_checksum_match CHECK (
    document ? 'identity'
    AND jsonb_typeof(document -> 'identity') = 'object'
    AND document -> 'identity' ->> 'checksum' = checksum
  ),
  CONSTRAINT research_pathway_revisions_recorded_match CHECK (document ? 'updatedAt' AND (document ->> 'updatedAt')::TIMESTAMPTZ = recorded_at),
  CONSTRAINT research_pathway_revisions_participant_exclusion CHECK (document ? 'participantDataIncluded' AND document ->> 'participantDataIncluded' = 'false')
);

CREATE INDEX research_pathway_documents_user_id_idx
  ON public.research_pathway_documents(user_id);
CREATE INDEX research_pathway_revisions_user_id_idx
  ON public.research_pathway_revisions(user_id);
CREATE INDEX research_pathway_revisions_project_recorded_idx
  ON public.research_pathway_revisions(project_id, recorded_at DESC);

ALTER TABLE public.research_pathway_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_pathway_revisions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.research_pathway_documents FROM anon;
REVOKE ALL ON TABLE public.research_pathway_revisions FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.research_pathway_documents TO authenticated;
GRANT SELECT, INSERT ON TABLE public.research_pathway_revisions TO authenticated;

CREATE POLICY research_pathway_documents_owner_select
  ON public.research_pathway_documents FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = research_pathway_documents.project_id
        AND projects.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY research_pathway_documents_owner_insert
  ON public.research_pathway_documents FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = research_pathway_documents.project_id
        AND projects.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY research_pathway_documents_owner_update
  ON public.research_pathway_documents FOR UPDATE TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = research_pathway_documents.project_id
        AND projects.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = research_pathway_documents.project_id
        AND projects.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY research_pathway_documents_owner_delete
  ON public.research_pathway_documents FOR DELETE TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = research_pathway_documents.project_id
        AND projects.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY research_pathway_revisions_owner_select
  ON public.research_pathway_revisions FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = research_pathway_revisions.project_id
        AND projects.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY research_pathway_revisions_owner_insert
  ON public.research_pathway_revisions FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = research_pathway_revisions.project_id
        AND projects.user_id = (SELECT auth.uid())
    )
  );

CREATE FUNCTION public.enforce_research_pathway_revision_increment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.revision <= OLD.revision THEN
    RAISE EXCEPTION 'Research pathway revision must increase.' USING ERRCODE = '23514';
  END IF;
  IF NEW.user_id <> OLD.user_id OR NEW.project_id <> OLD.project_id THEN
    RAISE EXCEPTION 'Research pathway ownership and project identity are immutable.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.capture_research_pathway_revision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.research_pathway_revisions (
    project_id,
    user_id,
    revision,
    schema_version,
    checksum,
    document,
    recorded_at
  ) VALUES (
    NEW.project_id,
    NEW.user_id,
    NEW.revision,
    NEW.schema_version,
    NEW.checksum,
    NEW.document,
    NEW.updated_at
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_research_pathway_revision_increment() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.capture_research_pathway_revision() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_research_pathway_revision_increment() TO authenticated;
GRANT EXECUTE ON FUNCTION public.capture_research_pathway_revision() TO authenticated;

CREATE TRIGGER research_pathway_revision_increment
  BEFORE UPDATE ON public.research_pathway_documents
  FOR EACH ROW EXECUTE FUNCTION public.enforce_research_pathway_revision_increment();

CREATE TRIGGER research_pathway_revision_history
  AFTER INSERT OR UPDATE ON public.research_pathway_documents
  FOR EACH ROW EXECUTE FUNCTION public.capture_research_pathway_revision();

ALTER TABLE public.research_decision_events
  DROP CONSTRAINT IF EXISTS research_decision_events_domain_check;
ALTER TABLE public.research_decision_events
  ADD CONSTRAINT research_decision_events_domain_check
  CHECK (domain IN ('pathway', 'consent', 'analysis', 'manuscript', 'figure', 'recruitment', 'route'));

COMMENT ON TABLE public.research_pathway_documents IS
  'Cloud-authoritative Stage 1 pathway; excludes participant data and preserves legacy stores during migration.';
COMMENT ON TABLE public.research_pathway_revisions IS
  'Append-only checksum-bound history of accepted Stage 1 pathway revisions.';
