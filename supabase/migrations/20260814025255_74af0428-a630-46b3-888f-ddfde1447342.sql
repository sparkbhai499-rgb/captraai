ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS timeline jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS width integer NOT NULL DEFAULT 1920;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS height integer NOT NULL DEFAULT 1080;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS fps integer NOT NULL DEFAULT 30;

CREATE TABLE IF NOT EXISTS public.project_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'video',
  name text NOT NULL,
  storage_path text NOT NULL,
  duration_sec numeric,
  width integer,
  height integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_assets TO authenticated;
GRANT ALL ON public.project_assets TO service_role;

ALTER TABLE public.project_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own assets" ON public.project_assets;
CREATE POLICY "own assets" ON public.project_assets FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS project_assets_project_idx ON public.project_assets(project_id);