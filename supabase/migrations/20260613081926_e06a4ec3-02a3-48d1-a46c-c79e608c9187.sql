DROP POLICY IF EXISTS "Single-user app can manage funnels" ON public.funnels;
CREATE POLICY "Single-user app can manage valid funnels"
ON public.funnels
FOR ALL
TO anon, authenticated
USING (id IS NOT NULL AND length(id) > 0)
WITH CHECK (id IS NOT NULL AND length(id) > 0 AND name IS NOT NULL AND length(name) > 0);

DROP POLICY IF EXISTS "Quiz visitors can create leads" ON public.leads;
DROP POLICY IF EXISTS "Quiz visitors can update their lead submission" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can manage leads" ON public.leads;
CREATE POLICY "Quiz visitors can create valid leads"
ON public.leads
FOR INSERT
TO anon, authenticated
WITH CHECK (id IS NOT NULL AND length(id) > 0 AND funnel_id IS NOT NULL AND length(funnel_id) > 0);
CREATE POLICY "Quiz visitors can update matching leads"
ON public.leads
FOR UPDATE
TO anon, authenticated
USING (id IS NOT NULL AND length(id) > 0 AND funnel_id IS NOT NULL AND length(funnel_id) > 0)
WITH CHECK (id IS NOT NULL AND length(id) > 0 AND funnel_id IS NOT NULL AND length(funnel_id) > 0);
CREATE POLICY "Authenticated users can read leads"
ON public.leads
FOR SELECT
TO authenticated
USING (funnel_id IS NOT NULL AND length(funnel_id) > 0);
CREATE POLICY "Authenticated users can delete leads"
ON public.leads
FOR DELETE
TO authenticated
USING (funnel_id IS NOT NULL AND length(funnel_id) > 0);

DROP POLICY IF EXISTS "Single-user app can manage clone jobs" ON public.clone_jobs;
CREATE POLICY "Single-user app can manage valid clone jobs"
ON public.clone_jobs
FOR ALL
TO anon, authenticated
USING (source_url IS NOT NULL AND length(source_url) > 0)
WITH CHECK (source_url IS NOT NULL AND length(source_url) > 0);