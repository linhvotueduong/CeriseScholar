-- Cerise Scholar — versioned Stage 3 study-design specification.
--
-- This table stores research DESIGN metadata only. Participant responses,
-- uploaded stimuli, and raw research data are intentionally out of scope.
-- One compact JSON document per project keeps the early-stage schema small
-- while schema_version supports safe application-level migrations.

CREATE TABLE public.study_designs (
  project_id UUID PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schema_version INTEGER NOT NULL DEFAULT 1 CHECK (schema_version >= 1),
  spec JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(spec) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT study_designs_spec_size CHECK (pg_column_size(spec) <= 1048576)
);

CREATE INDEX study_designs_user_id_idx ON public.study_designs(user_id);

-- The ownership policies below look up projects by both id and user_id.
-- The primary key covers id; this companion index keeps user ownership checks
-- efficient as the projects table grows.
CREATE INDEX IF NOT EXISTS projects_user_id_idx ON public.projects(user_id);

ALTER TABLE public.study_designs ENABLE ROW LEVEL SECURITY;

-- Explicit grants are needed for projects whose Data API no longer exposes
-- newly-created public tables automatically. RLS remains the authorization wall.
REVOKE ALL ON TABLE public.study_designs FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.study_designs TO authenticated;

CREATE POLICY "Users can view their own study designs"
  ON public.study_designs
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM public.projects
      WHERE projects.id = study_designs.project_id
        AND projects.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can create their own study designs"
  ON public.study_designs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM public.projects
      WHERE projects.id = study_designs.project_id
        AND projects.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update their own study designs"
  ON public.study_designs
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM public.projects
      WHERE projects.id = study_designs.project_id
        AND projects.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM public.projects
      WHERE projects.id = study_designs.project_id
        AND projects.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can delete their own study designs"
  ON public.study_designs
  FOR DELETE
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM public.projects
      WHERE projects.id = study_designs.project_id
        AND projects.user_id = (SELECT auth.uid())
    )
  );
