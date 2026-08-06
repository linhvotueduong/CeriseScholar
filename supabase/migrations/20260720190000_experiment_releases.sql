-- Cerise Scholar — Phase 6 immutable Experimental Studio releases.
--
-- This table contains frozen study specifications and integrity metadata only.
-- Participant responses, trial data, local collector databases, and AI content
-- are deliberately excluded. A release can be selected or inserted by its
-- owner but cannot be updated or deleted through the Data API.

CREATE TABLE public.experiment_releases (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  release_id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  release_number INTEGER NOT NULL CHECK (release_number >= 1),
  checksum TEXT NOT NULL CHECK (checksum ~ '^sha256:[0-9a-f]{64}$'),
  release_notes TEXT NOT NULL DEFAULT '' CHECK (char_length(release_notes) <= 2000),
  manifest JSONB NOT NULL CHECK (jsonb_typeof(manifest) = 'object'),
  studio_spec JSONB NOT NULL CHECK (jsonb_typeof(studio_spec) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT experiment_releases_project_number_unique UNIQUE (project_id, release_number),
  CONSTRAINT experiment_releases_release_id_unique UNIQUE (release_id),
  CONSTRAINT experiment_releases_payload_size CHECK (
    pg_column_size(manifest) + pg_column_size(studio_spec) <= 786432
  )
);

CREATE INDEX experiment_releases_user_id_idx ON public.experiment_releases(user_id);
CREATE INDEX experiment_releases_project_created_idx
  ON public.experiment_releases(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS projects_user_id_idx ON public.projects(user_id);

ALTER TABLE public.experiment_releases ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.experiment_releases FROM anon;
REVOKE ALL ON TABLE public.experiment_releases FROM authenticated;
REVOKE ALL ON SEQUENCE public.experiment_releases_id_seq FROM anon;
GRANT SELECT, INSERT ON TABLE public.experiment_releases TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.experiment_releases_id_seq TO authenticated;

CREATE POLICY "Users can view their own experiment releases"
  ON public.experiment_releases
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM public.projects
      WHERE projects.id = experiment_releases.project_id
        AND projects.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can create their own experiment releases"
  ON public.experiment_releases
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM public.projects
      WHERE projects.id = experiment_releases.project_id
        AND projects.user_id = (SELECT auth.uid())
    )
  );

COMMENT ON TABLE public.experiment_releases IS
  'Immutable researcher-owned Experimental Studio release snapshots. No participant responses.';
