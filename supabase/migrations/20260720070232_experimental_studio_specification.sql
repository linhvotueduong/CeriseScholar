-- Cerise Scholar — Phase 2 Experimental Studio specification.
--
-- Stores the versioned study-builder structure only. Participant responses,
-- uploaded stimuli, and raw research data are deliberately excluded.

CREATE TABLE public.experiment_studios (
  project_id UUID PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schema_version INTEGER NOT NULL DEFAULT 1 CHECK (schema_version >= 1),
  spec JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(spec) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT experiment_studios_spec_size CHECK (pg_column_size(spec) <= 524288)
);

CREATE INDEX experiment_studios_user_id_idx ON public.experiment_studios(user_id);
CREATE INDEX IF NOT EXISTS projects_user_id_idx ON public.projects(user_id);

ALTER TABLE public.experiment_studios ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.experiment_studios FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.experiment_studios TO authenticated;

CREATE POLICY "Users can view their own experiment studios"
  ON public.experiment_studios
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = experiment_studios.project_id
        AND projects.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can create their own experiment studios"
  ON public.experiment_studios
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = experiment_studios.project_id
        AND projects.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update their own experiment studios"
  ON public.experiment_studios
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = experiment_studios.project_id
        AND projects.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = experiment_studios.project_id
        AND projects.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can delete their own experiment studios"
  ON public.experiment_studios
  FOR DELETE
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = experiment_studios.project_id
        AND projects.user_id = (SELECT auth.uid())
    )
  );
