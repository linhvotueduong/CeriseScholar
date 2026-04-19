-- ============================================
-- Cerise Scholar — Prevent duplicate code names per project per user
-- Drops any existing duplicates (keeps the oldest row), then adds a
-- unique constraint so the races that caused duplicates can never win again.
-- Safe to run multiple times.
-- ============================================

-- 1. Remove duplicate code rows, keeping the earliest per (user, project, name)
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, COALESCE(project_id::text, 'global'), LOWER(name)
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM public.codes
),
to_delete AS (SELECT id FROM ranked WHERE rn > 1)
-- Clear references on highlights first, then delete the duplicate codes
UPDATE public.highlights SET code_id = NULL
WHERE code_id IN (SELECT id FROM to_delete);

DELETE FROM public.codes
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id, COALESCE(project_id::text, 'global'), LOWER(name)
             ORDER BY created_at ASC, id ASC
           ) AS rn
    FROM public.codes
  ) t
  WHERE rn > 1
);

-- 2. Add the constraint (case-insensitive). Use a unique index on LOWER(name)
CREATE UNIQUE INDEX IF NOT EXISTS codes_unique_name_per_scope
ON public.codes (user_id, COALESCE(project_id::text, 'global'), LOWER(name));
