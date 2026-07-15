-- Replace the unique index on user_preferences.user_id with a proper unique constraint.
-- PostgREST's ON CONFLICT requires a constraint (not just an index) for upsert operations.

DROP INDEX IF EXISTS public.idx_user_preferences_user_id;

ALTER TABLE public.user_preferences
  ADD CONSTRAINT user_preferences_user_id_key UNIQUE (user_id);
