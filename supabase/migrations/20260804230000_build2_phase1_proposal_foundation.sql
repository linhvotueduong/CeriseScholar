-- Cerise Scholar Build 2, Phase 1 — Evidence-to-Proposal domain foundation.
--
-- This migration is additive. Existing paper_sections and evidence_library rows
-- remain authoritative compatibility sources until the Stage 2 UI migration is
-- separately approved. Canonical proposal payloads exclude participant rows.

CREATE TABLE public.research_proposals (
  project_id UUID PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schema_version INTEGER NOT NULL CHECK (schema_version >= 1),
  revision INTEGER NOT NULL CHECK (revision >= 1),
  checksum TEXT NOT NULL CHECK (checksum ~ '^sha256:[a-f0-9]{64}$'),
  document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT research_proposals_document_size CHECK (pg_column_size(document) <= 4194304),
  CONSTRAINT research_proposals_project_match CHECK (document ? 'projectId' AND document ->> 'projectId' = project_id::TEXT),
  CONSTRAINT research_proposals_schema_match CHECK (document ? 'schemaVersion' AND (document ->> 'schemaVersion')::INTEGER = schema_version),
  CONSTRAINT research_proposals_revision_match CHECK (document ? 'revision' AND (document ->> 'revision')::INTEGER = revision),
  CONSTRAINT research_proposals_updated_match CHECK (document ? 'updatedAt' AND (document ->> 'updatedAt')::TIMESTAMPTZ = updated_at),
  CONSTRAINT research_proposals_identity_match CHECK (
    document ? 'identity'
    AND jsonb_typeof(document -> 'identity') = 'object'
    AND document -> 'identity' ->> 'artifactKind' = 'research-proposal'
    AND document -> 'identity' ->> 'artifactId' = 'proposal-' || project_id::TEXT
    AND document -> 'identity' ->> 'checksum' = checksum
  ),
  CONSTRAINT research_proposals_participant_exclusion CHECK (
    document ? 'participantDataIncluded' AND document ->> 'participantDataIncluded' = 'false'
  )
);

CREATE TABLE public.research_proposal_revisions (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL CHECK (revision >= 1),
  schema_version INTEGER NOT NULL CHECK (schema_version >= 1),
  checksum TEXT NOT NULL CHECK (checksum ~ '^sha256:[a-f0-9]{64}$'),
  document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object'),
  recorded_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT research_proposal_revisions_primary PRIMARY KEY (project_id, revision),
  CONSTRAINT research_proposal_revisions_checksum_unique UNIQUE (project_id, checksum),
  CONSTRAINT research_proposal_revisions_document_size CHECK (pg_column_size(document) <= 4194304),
  CONSTRAINT research_proposal_revisions_project_match CHECK (document ? 'projectId' AND document ->> 'projectId' = project_id::TEXT),
  CONSTRAINT research_proposal_revisions_schema_match CHECK (document ? 'schemaVersion' AND (document ->> 'schemaVersion')::INTEGER = schema_version),
  CONSTRAINT research_proposal_revisions_revision_match CHECK (document ? 'revision' AND (document ->> 'revision')::INTEGER = revision),
  CONSTRAINT research_proposal_revisions_recorded_match CHECK (document ? 'updatedAt' AND (document ->> 'updatedAt')::TIMESTAMPTZ = recorded_at),
  CONSTRAINT research_proposal_revisions_checksum_match CHECK (
    document ? 'identity'
    AND jsonb_typeof(document -> 'identity') = 'object'
    AND document -> 'identity' ->> 'checksum' = checksum
  ),
  CONSTRAINT research_proposal_revisions_participant_exclusion CHECK (
    document ? 'participantDataIncluded' AND document ->> 'participantDataIncluded' = 'false'
  )
);

CREATE TABLE public.project_evidence_assessments (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_id TEXT NOT NULL CHECK (char_length(assessment_id) BETWEEN 1 AND 140),
  source_id TEXT NOT NULL CHECK (char_length(source_id) BETWEEN 1 AND 160),
  schema_version INTEGER NOT NULL CHECK (schema_version >= 1),
  revision INTEGER NOT NULL CHECK (revision >= 1),
  status TEXT NOT NULL CHECK (status IN ('candidate', 'included', 'excluded', 'awaiting-review')),
  checksum TEXT NOT NULL CHECK (checksum ~ '^sha256:[a-f0-9]{64}$'),
  source_checksum TEXT NOT NULL CHECK (source_checksum ~ '^sha256:[a-f0-9]{64}$'),
  assessment JSONB NOT NULL CHECK (jsonb_typeof(assessment) = 'object'),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT project_evidence_assessments_primary PRIMARY KEY (project_id, assessment_id),
  CONSTRAINT project_evidence_assessments_source_unique UNIQUE (project_id, source_id),
  CONSTRAINT project_evidence_assessments_document_size CHECK (pg_column_size(assessment) <= 1048576),
  CONSTRAINT project_evidence_assessments_project_match CHECK (assessment ? 'projectId' AND assessment ->> 'projectId' = project_id::TEXT),
  CONSTRAINT project_evidence_assessments_id_match CHECK (assessment ? 'assessmentId' AND assessment ->> 'assessmentId' = assessment_id),
  CONSTRAINT project_evidence_assessments_source_match CHECK (assessment ? 'sourceId' AND assessment ->> 'sourceId' = source_id),
  CONSTRAINT project_evidence_assessments_schema_match CHECK (assessment ? 'schemaVersion' AND (assessment ->> 'schemaVersion')::INTEGER = schema_version),
  CONSTRAINT project_evidence_assessments_revision_match CHECK (assessment ? 'revision' AND (assessment ->> 'revision')::INTEGER = revision),
  CONSTRAINT project_evidence_assessments_status_match CHECK (assessment ? 'status' AND assessment ->> 'status' = status),
  CONSTRAINT project_evidence_assessments_updated_match CHECK (assessment ? 'updatedAt' AND (assessment ->> 'updatedAt')::TIMESTAMPTZ = updated_at),
  CONSTRAINT project_evidence_assessments_reviewed_match CHECK (
    (reviewed_at IS NULL AND (assessment -> 'reviewedAt') = 'null'::JSONB)
    OR (reviewed_at IS NOT NULL AND (assessment ->> 'reviewedAt')::TIMESTAMPTZ = reviewed_at)
  ),
  CONSTRAINT project_evidence_assessments_identity_match CHECK (
    assessment ? 'identity'
    AND jsonb_typeof(assessment -> 'identity') = 'object'
    AND assessment -> 'identity' ->> 'artifactKind' = 'project-evidence-assessment'
    AND assessment -> 'identity' ->> 'artifactId' = 'assessment-' || assessment_id
    AND assessment -> 'identity' ->> 'checksum' = checksum
    AND jsonb_array_length(assessment -> 'identity' -> 'sourceFingerprint' -> 'sources') = 1
    AND assessment -> 'identity' -> 'sourceFingerprint' -> 'sources' -> 0 ->> 'checksum' = source_checksum
  ),
  CONSTRAINT project_evidence_assessments_participant_exclusion CHECK (
    assessment ? 'participantDataIncluded' AND assessment ->> 'participantDataIncluded' = 'false'
  )
);

CREATE TABLE public.project_evidence_assessment_revisions (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_id TEXT NOT NULL CHECK (char_length(assessment_id) BETWEEN 1 AND 140),
  source_id TEXT NOT NULL CHECK (char_length(source_id) BETWEEN 1 AND 160),
  revision INTEGER NOT NULL CHECK (revision >= 1),
  schema_version INTEGER NOT NULL CHECK (schema_version >= 1),
  status TEXT NOT NULL CHECK (status IN ('candidate', 'included', 'excluded', 'awaiting-review')),
  checksum TEXT NOT NULL CHECK (checksum ~ '^sha256:[a-f0-9]{64}$'),
  source_checksum TEXT NOT NULL CHECK (source_checksum ~ '^sha256:[a-f0-9]{64}$'),
  assessment JSONB NOT NULL CHECK (jsonb_typeof(assessment) = 'object'),
  reviewed_at TIMESTAMPTZ,
  recorded_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT project_evidence_assessment_revisions_primary PRIMARY KEY (project_id, assessment_id, revision),
  CONSTRAINT project_evidence_assessment_revisions_checksum_unique UNIQUE (project_id, assessment_id, checksum),
  CONSTRAINT project_evidence_assessment_revisions_document_size CHECK (pg_column_size(assessment) <= 1048576),
  CONSTRAINT project_evidence_assessment_revisions_project_match CHECK (assessment ? 'projectId' AND assessment ->> 'projectId' = project_id::TEXT),
  CONSTRAINT project_evidence_assessment_revisions_id_match CHECK (assessment ? 'assessmentId' AND assessment ->> 'assessmentId' = assessment_id),
  CONSTRAINT project_evidence_assessment_revisions_source_match CHECK (assessment ? 'sourceId' AND assessment ->> 'sourceId' = source_id),
  CONSTRAINT project_evidence_assessment_revisions_revision_match CHECK (assessment ? 'revision' AND (assessment ->> 'revision')::INTEGER = revision),
  CONSTRAINT project_evidence_assessment_revisions_checksum_match CHECK (
    assessment ? 'identity'
    AND jsonb_typeof(assessment -> 'identity') = 'object'
    AND assessment -> 'identity' ->> 'checksum' = checksum
  ),
  CONSTRAINT project_evidence_assessment_revisions_participant_exclusion CHECK (
    assessment ? 'participantDataIncluded' AND assessment ->> 'participantDataIncluded' = 'false'
  )
);

CREATE INDEX research_proposals_user_id_idx ON public.research_proposals(user_id);
CREATE INDEX research_proposal_revisions_user_id_idx ON public.research_proposal_revisions(user_id);
CREATE INDEX research_proposal_revisions_project_recorded_idx ON public.research_proposal_revisions(project_id, recorded_at DESC);
CREATE INDEX project_evidence_assessments_user_id_idx ON public.project_evidence_assessments(user_id);
CREATE INDEX project_evidence_assessments_project_status_idx ON public.project_evidence_assessments(project_id, status, updated_at DESC);
CREATE INDEX project_evidence_assessments_source_id_idx ON public.project_evidence_assessments(source_id);
CREATE INDEX project_evidence_assessment_revisions_user_id_idx ON public.project_evidence_assessment_revisions(user_id);
CREATE INDEX project_evidence_assessment_revisions_project_recorded_idx ON public.project_evidence_assessment_revisions(project_id, recorded_at DESC);

ALTER TABLE public.research_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_proposal_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_evidence_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_evidence_assessment_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_proposals FORCE ROW LEVEL SECURITY;
ALTER TABLE public.research_proposal_revisions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.project_evidence_assessments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.project_evidence_assessment_revisions FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.research_proposals FROM anon;
REVOKE ALL ON TABLE public.research_proposal_revisions FROM anon;
REVOKE ALL ON TABLE public.project_evidence_assessments FROM anon;
REVOKE ALL ON TABLE public.project_evidence_assessment_revisions FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.research_proposals TO authenticated;
GRANT SELECT, INSERT ON TABLE public.research_proposal_revisions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_evidence_assessments TO authenticated;
GRANT SELECT, INSERT ON TABLE public.project_evidence_assessment_revisions TO authenticated;

DO $build2_phase1_policies$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'research_proposals',
    'research_proposal_revisions',
    'project_evidence_assessments',
    'project_evidence_assessment_revisions'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects WHERE projects.id = %I.project_id AND projects.user_id = (SELECT auth.uid())))',
      table_name || '_owner_select', table_name, table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects WHERE projects.id = %I.project_id AND projects.user_id = (SELECT auth.uid())))',
      table_name || '_owner_insert', table_name, table_name
    );
  END LOOP;
END
$build2_phase1_policies$;

CREATE POLICY research_proposals_owner_update
  ON public.research_proposals FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects WHERE projects.id = research_proposals.project_id AND projects.user_id = (SELECT auth.uid())))
  WITH CHECK ((SELECT auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects WHERE projects.id = research_proposals.project_id AND projects.user_id = (SELECT auth.uid())));
CREATE POLICY research_proposals_owner_delete
  ON public.research_proposals FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects WHERE projects.id = research_proposals.project_id AND projects.user_id = (SELECT auth.uid())));
CREATE POLICY project_evidence_assessments_owner_update
  ON public.project_evidence_assessments FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects WHERE projects.id = project_evidence_assessments.project_id AND projects.user_id = (SELECT auth.uid())))
  WITH CHECK ((SELECT auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects WHERE projects.id = project_evidence_assessments.project_id AND projects.user_id = (SELECT auth.uid())));
CREATE POLICY project_evidence_assessments_owner_delete
  ON public.project_evidence_assessments FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects WHERE projects.id = project_evidence_assessments.project_id AND projects.user_id = (SELECT auth.uid())));

CREATE FUNCTION public.enforce_research_proposal_revision_increment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.revision <= OLD.revision THEN
    RAISE EXCEPTION 'Research proposal revision must increase.' USING ERRCODE = '23514';
  END IF;
  IF NEW.user_id <> OLD.user_id OR NEW.project_id <> OLD.project_id THEN
    RAISE EXCEPTION 'Research proposal ownership and project identity are immutable.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.capture_research_proposal_revision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.research_proposal_revisions (
    project_id, user_id, revision, schema_version, checksum, document, recorded_at
  ) VALUES (
    NEW.project_id, NEW.user_id, NEW.revision, NEW.schema_version, NEW.checksum, NEW.document, NEW.updated_at
  );
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.enforce_project_evidence_assessment_revision_increment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.revision <= OLD.revision THEN
    RAISE EXCEPTION 'Project evidence assessment revision must increase.' USING ERRCODE = '23514';
  END IF;
  IF NEW.user_id <> OLD.user_id OR NEW.project_id <> OLD.project_id OR NEW.assessment_id <> OLD.assessment_id OR NEW.source_id <> OLD.source_id THEN
    RAISE EXCEPTION 'Evidence assessment ownership, identity, and source are immutable.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.capture_project_evidence_assessment_revision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.project_evidence_assessment_revisions (
    project_id, user_id, assessment_id, source_id, revision, schema_version,
    status, checksum, source_checksum, assessment, reviewed_at, recorded_at
  ) VALUES (
    NEW.project_id, NEW.user_id, NEW.assessment_id, NEW.source_id, NEW.revision, NEW.schema_version,
    NEW.status, NEW.checksum, NEW.source_checksum, NEW.assessment, NEW.reviewed_at, NEW.updated_at
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_research_proposal_revision_increment() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.capture_research_proposal_revision() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_project_evidence_assessment_revision_increment() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.capture_project_evidence_assessment_revision() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_research_proposal_revision_increment() TO authenticated;
GRANT EXECUTE ON FUNCTION public.capture_research_proposal_revision() TO authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_project_evidence_assessment_revision_increment() TO authenticated;
GRANT EXECUTE ON FUNCTION public.capture_project_evidence_assessment_revision() TO authenticated;

CREATE TRIGGER research_proposal_revision_increment
  BEFORE UPDATE ON public.research_proposals
  FOR EACH ROW EXECUTE FUNCTION public.enforce_research_proposal_revision_increment();
CREATE TRIGGER research_proposal_revision_history
  AFTER INSERT OR UPDATE ON public.research_proposals
  FOR EACH ROW EXECUTE FUNCTION public.capture_research_proposal_revision();
CREATE TRIGGER project_evidence_assessment_revision_increment
  BEFORE UPDATE ON public.project_evidence_assessments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_project_evidence_assessment_revision_increment();
CREATE TRIGGER project_evidence_assessment_revision_history
  AFTER INSERT OR UPDATE ON public.project_evidence_assessments
  FOR EACH ROW EXECUTE FUNCTION public.capture_project_evidence_assessment_revision();

ALTER TABLE public.research_decision_events
  DROP CONSTRAINT IF EXISTS research_decision_events_domain_check;
ALTER TABLE public.research_decision_events
  ADD CONSTRAINT research_decision_events_domain_check
  CHECK (domain IN ('pathway', 'evidence', 'proposal', 'consent', 'analysis', 'manuscript', 'figure', 'recruitment', 'route'));

COMMENT ON TABLE public.research_proposals IS
  'Current checksum-bound Stage 2 proposal document; imports and dual-writes legacy proposal paper_sections during migration.';
COMMENT ON TABLE public.research_proposal_revisions IS
  'Append-only accepted history for canonical Stage 2 research proposal revisions.';
COMMENT ON TABLE public.project_evidence_assessments IS
  'Project-specific source inclusion, relevance, and appraisal judgments; not universal quality scores.';
COMMENT ON TABLE public.project_evidence_assessment_revisions IS
  'Append-only checksum-bound history of project-specific evidence assessments.';
