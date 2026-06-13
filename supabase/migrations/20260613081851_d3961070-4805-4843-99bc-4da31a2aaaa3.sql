CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.funnels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funnels TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funnels TO authenticated;
GRANT ALL ON public.funnels TO service_role;
ALTER TABLE public.funnels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Single-user app can manage funnels" ON public.funnels;
CREATE POLICY "Single-user app can manage funnels"
ON public.funnels
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);
DROP TRIGGER IF EXISTS update_funnels_updated_at ON public.funnels;
CREATE TRIGGER update_funnels_updated_at
BEFORE UPDATE ON public.funnels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.leads (
  id TEXT PRIMARY KEY,
  funnel_id TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT, UPDATE ON public.leads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Quiz visitors can create leads" ON public.leads;
DROP POLICY IF EXISTS "Quiz visitors can update their lead submission" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can manage leads" ON public.leads;
CREATE POLICY "Quiz visitors can create leads"
ON public.leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
CREATE POLICY "Quiz visitors can update their lead submission"
ON public.leads
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);
CREATE POLICY "Authenticated users can manage leads"
ON public.leads
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS leads_funnel_id_created_at_idx ON public.leads (funnel_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.clone_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  message TEXT,
  screenshots JSONB NOT NULL DEFAULT '[]'::jsonb,
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clone_jobs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clone_jobs TO authenticated;
GRANT ALL ON public.clone_jobs TO service_role;
ALTER TABLE public.clone_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Single-user app can manage clone jobs" ON public.clone_jobs;
CREATE POLICY "Single-user app can manage clone jobs"
ON public.clone_jobs
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);
DROP TRIGGER IF EXISTS update_clone_jobs_updated_at ON public.clone_jobs;
CREATE TRIGGER update_clone_jobs_updated_at
BEFORE UPDATE ON public.clone_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS clone_jobs_created_at_idx ON public.clone_jobs (created_at DESC);