-- Cerise Scholar — Phase 5 structured consent protocol authoring.
--
-- Stores researcher decisions, source identities, structured clauses, and
-- version metadata. It deliberately excludes participant consent decisions,
-- signatures, participant responses, and uploaded authority-file contents.

CREATE TABLE public.consent_protocols (
  project_id UUID PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schema_version INTEGER NOT NULL DEFAULT 1 CHECK (schema_version >= 1),
  spec JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(spec) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT consent_protocols_spec_size CHECK (pg_column_size(spec) <= 524288)
);

CREATE INDEX consent_protocols_user_id_idx ON public.consent_protocols(user_id);
CREATE INDEX IF NOT EXISTS projects_user_id_idx ON public.projects(user_id);

ALTER TABLE public.consent_protocols ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.consent_protocols FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.consent_protocols TO authenticated;

CREATE POLICY "Users can view their own consent protocols"
  ON public.consent_protocols
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = consent_protocols.project_id
        AND projects.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can create their own consent protocols"
  ON public.consent_protocols
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = consent_protocols.project_id
        AND projects.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update their own consent protocols"
  ON public.consent_protocols
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = consent_protocols.project_id
        AND projects.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = consent_protocols.project_id
        AND projects.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can delete their own consent protocols"
  ON public.consent_protocols
  FOR DELETE
  TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = consent_protocols.project_id
        AND projects.user_id = (SELECT auth.uid())
    )
  );
