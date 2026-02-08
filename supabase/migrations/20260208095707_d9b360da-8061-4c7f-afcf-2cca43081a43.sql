
-- 1. Restrict service role policies to service_role only (fixes overly permissive USING(true))
DROP POLICY IF EXISTS "Service role can manage stations" ON public.stations;
CREATE POLICY "Service role can manage stations" 
ON public.stations FOR ALL 
TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert transactions" ON public.transactions;
CREATE POLICY "Service role can insert transactions" 
ON public.transactions FOR INSERT 
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update transactions" ON public.transactions;
CREATE POLICY "Service role can update transactions" 
ON public.transactions FOR UPDATE 
TO service_role
USING (true);

-- 2. Replace broad authenticated SELECT with scoped policy for anon+authenticated
DROP POLICY IF EXISTS "Authenticated users can view stations" ON public.stations;
CREATE POLICY "Anyone can view stations" 
ON public.stations FOR SELECT 
TO anon, authenticated
USING (true);

-- 3. Recreate stations_public view with security_invoker (fixes SECURITY DEFINER view issue)
DROP VIEW IF EXISTS public.stations_public;
CREATE VIEW public.stations_public
WITH (security_invoker = on) AS
SELECT id, name, location, address, lat, lng, 
  status, price_per_session, duration_minutes, 
  currency, created_at, updated_at, company_id
FROM public.stations;

GRANT SELECT ON public.stations_public TO anon, authenticated;

-- 4. Explicit deny for anonymous access to profiles (defense-in-depth)
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);
