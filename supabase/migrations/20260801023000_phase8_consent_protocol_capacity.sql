-- Cerise Scholar — Phase 8 specialized consent capacity alignment.
--
-- The application already enforces a 1 MiB canonical JSON ceiling. Phase 8 adds
-- bounded structured biomedical/data-use fields and attachment metadata only;
-- participant data and uploaded addendum contents remain excluded.

ALTER TABLE public.consent_protocols
  DROP CONSTRAINT IF EXISTS consent_protocols_spec_size;

ALTER TABLE public.consent_protocols
  ADD CONSTRAINT consent_protocols_spec_size
  CHECK (pg_column_size(spec) <= 1048576);
