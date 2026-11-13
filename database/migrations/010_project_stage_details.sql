-- Add before deploying listing-detail persistence. Existing project data is retained.
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS stage_details TEXT NOT NULL DEFAULT '{}';
