-- Cerise Scholar Build 0 — cross-stage research foundation.
--
-- Additive and rollback-safe:
-- - Existing domain tables remain authoritative for their editable payloads.
-- - paper_sections is retained for dual-read/write migration.
-- - These tables exclude participant rows, recordings, consent receipts,
--   signatures, and uploaded file contents.

CREATE TABLE public.research_artifact_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artifact_kind TEXT NOT NULL CHECK (char_length(artifact_kind) BETWEEN 1 AND 80),
  artifact_id TEXT NOT NULL CHECK (char_length(artifact_id) BETWEEN 1 AND 160),
  artifact_schema_version INTEGER NOT NULL CHECK (artifact_schema_version >= 1),
  checksum TEXT NOT NULL CHECK (checksum ~ '^sha256:[a-f0-9]{64}$'),
  payload_checksum TEXT NOT NULL CHECK (payload_checksum ~ '^sha256:[a-f0-9]{64}$'),
  source_fingerprint_checksum TEXT NOT NULL CHECK (source_fingerprint_checksum ~ '^sha256:[a-f0-9]{64}$'),
  source_references JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(source_references) = 'array'),
  storage_locator TEXT NOT NULL CHECK (char_length(storage_locator) BETWEEN 1 AND 2000),
  lifecycle_status TEXT NOT NULL CHECK (lifecycle_status IN ('current', 'stale', 'blocked', 'superseded')),
  supersedes_artifact_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT research_artifact_index_sources_size CHECK (pg_column_size(source_references) <= 262144),
  CONSTRAINT research_artifact_index_identity_unique UNIQUE (project_id, artifact_kind, artifact_id)
);

CREATE TABLE public.project_route_profiles (
  project_id UUID PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schema_version INTEGER NOT NULL CHECK (schema_version >= 1),
  compiler_version INTEGER NOT NULL CHECK (compiler_version >= 1),
  checksum TEXT NOT NULL CHECK (checksum ~ '^sha256:[a-f0-9]{64}$'),
  profile JSONB NOT NULL CHECK (jsonb_typeof(profile) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT project_route_profiles_profile_size CHECK (pg_column_size(profile) <= 262144)
);

CREATE TABLE public.research_knowledge_entries (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_id TEXT NOT NULL CHECK (char_length(entry_id) BETWEEN 1 AND 160),
  stage SMALLINT NOT NULL CHECK (stage BETWEEN 1 AND 8),
  step_id TEXT NOT NULL CHECK (char_length(step_id) BETWEEN 1 AND 160),
  kind TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL CHECK (lifecycle_status IN ('current', 'stale', 'superseded')),
  timing TEXT NOT NULL CHECK (timing IN ('planned', 'actual', 'reconciled')),
  checksum TEXT NOT NULL CHECK (checksum ~ '^sha256:[a-f0-9]{64}$'),
  entry JSONB NOT NULL CHECK (jsonb_typeof(entry) = 'object'),
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT research_knowledge_entries_entry_size CHECK (pg_column_size(entry) <= 131072),
  CONSTRAINT research_knowledge_entries_primary PRIMARY KEY (project_id, entry_id)
);

CREATE TABLE public.manuscript_documents (
  project_id UUID PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schema_version INTEGER NOT NULL CHECK (schema_version >= 1),
  revision INTEGER NOT NULL CHECK (revision >= 1),
  checksum TEXT NOT NULL CHECK (checksum ~ '^sha256:[a-f0-9]{64}$'),
  document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object'),
  legacy_imported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT manuscript_documents_document_size CHECK (pg_column_size(document) <= 2097152)
);

CREATE TABLE public.research_decision_events (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL CHECK (char_length(event_id) BETWEEN 1 AND 160),
  domain TEXT NOT NULL CHECK (domain IN ('consent', 'analysis', 'manuscript', 'figure', 'recruitment', 'route')),
  action TEXT NOT NULL CHECK (action IN ('applied', 'applied-after-edit', 'kept-current', 'dismissed')),
  checksum TEXT NOT NULL CHECK (checksum ~ '^sha256:[a-f0-9]{64}$'),
  event JSONB NOT NULL CHECK (jsonb_typeof(event) = 'object'),
  decided_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT research_decision_events_event_size CHECK (pg_column_size(event) <= 65536),
  CONSTRAINT research_decision_events_primary PRIMARY KEY (project_id, event_id)
);

CREATE TABLE public.research_asset_records (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL CHECK (char_length(asset_id) BETWEEN 1 AND 160),
  kind TEXT NOT NULL CHECK (kind IN ('figure', 'table', 'image', 'diagram', 'supplement')),
  rights_status TEXT NOT NULL CHECK (rights_status IN ('owned', 'licensed', 'permission-required', 'permission-recorded', 'public-domain', 'unknown')),
  review_status TEXT NOT NULL CHECK (review_status IN ('draft', 'verified', 'retired')),
  checksum TEXT NOT NULL CHECK (checksum ~ '^sha256:[a-f0-9]{64}$'),
  record JSONB NOT NULL CHECK (jsonb_typeof(record) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT research_asset_records_record_size CHECK (pg_column_size(record) <= 524288),
  CONSTRAINT research_asset_records_primary PRIMARY KEY (project_id, asset_id)
);

CREATE TABLE public.project_template_pins (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target TEXT NOT NULL CHECK (target IN ('journal-article', 'general-manuscript', 'conference-poster')),
  template_id TEXT NOT NULL CHECK (char_length(template_id) BETWEEN 1 AND 160),
  template_version INTEGER NOT NULL CHECK (template_version >= 1),
  template_checksum TEXT NOT NULL CHECK (template_checksum ~ '^sha256:[a-f0-9]{64}$'),
  pinned_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT project_template_pins_primary PRIMARY KEY (project_id, target)
);

CREATE INDEX research_artifact_index_user_id_idx ON public.research_artifact_index(user_id);
CREATE INDEX research_artifact_index_project_kind_idx ON public.research_artifact_index(project_id, artifact_kind);
CREATE INDEX research_artifact_index_status_idx ON public.research_artifact_index(project_id, lifecycle_status);
CREATE INDEX project_route_profiles_user_id_idx ON public.project_route_profiles(user_id);
CREATE INDEX research_knowledge_entries_user_id_idx ON public.research_knowledge_entries(user_id);
CREATE INDEX research_knowledge_entries_stage_idx ON public.research_knowledge_entries(project_id, stage, lifecycle_status);
CREATE INDEX manuscript_documents_user_id_idx ON public.manuscript_documents(user_id);
CREATE INDEX research_decision_events_user_id_idx ON public.research_decision_events(user_id);
CREATE INDEX research_decision_events_domain_idx ON public.research_decision_events(project_id, domain, decided_at DESC);
CREATE INDEX research_asset_records_user_id_idx ON public.research_asset_records(user_id);
CREATE INDEX research_asset_records_kind_idx ON public.research_asset_records(project_id, kind, review_status);
CREATE INDEX project_template_pins_user_id_idx ON public.project_template_pins(user_id);

ALTER TABLE public.research_artifact_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_route_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_knowledge_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manuscript_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_decision_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_asset_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_template_pins ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.research_artifact_index FROM anon;
REVOKE ALL ON TABLE public.project_route_profiles FROM anon;
REVOKE ALL ON TABLE public.research_knowledge_entries FROM anon;
REVOKE ALL ON TABLE public.manuscript_documents FROM anon;
REVOKE ALL ON TABLE public.research_decision_events FROM anon;
REVOKE ALL ON TABLE public.research_asset_records FROM anon;
REVOKE ALL ON TABLE public.project_template_pins FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.research_artifact_index TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_route_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.research_knowledge_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.manuscript_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.research_decision_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.research_asset_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_template_pins TO authenticated;

DO $foundation_policies$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'research_artifact_index',
    'project_route_profiles',
    'research_knowledge_entries',
    'manuscript_documents',
    'research_decision_events',
    'research_asset_records',
    'project_template_pins'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects WHERE projects.id = %I.project_id AND projects.user_id = (SELECT auth.uid())))',
      table_name || '_owner_select', table_name, table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects WHERE projects.id = %I.project_id AND projects.user_id = (SELECT auth.uid())))',
      table_name || '_owner_insert', table_name, table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects WHERE projects.id = %I.project_id AND projects.user_id = (SELECT auth.uid()))) WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects WHERE projects.id = %I.project_id AND projects.user_id = (SELECT auth.uid())))',
      table_name || '_owner_update', table_name, table_name, table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.projects WHERE projects.id = %I.project_id AND projects.user_id = (SELECT auth.uid())))',
      table_name || '_owner_delete', table_name, table_name
    );
  END LOOP;
END
$foundation_policies$;

COMMENT ON TABLE public.research_artifact_index IS 'Identity and lineage metadata only; domain payloads and participant rows are excluded.';
COMMENT ON TABLE public.research_knowledge_entries IS 'Append-oriented researcher knowledge; participant data is prohibited by the application contract.';
COMMENT ON TABLE public.manuscript_documents IS 'Venue-neutral manuscript AST with legacy paper_sections retained for rollback-safe migration.';
