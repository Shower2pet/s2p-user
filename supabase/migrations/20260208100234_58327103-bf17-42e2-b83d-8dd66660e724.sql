
-- 1. Remove the broad SELECT policy that exposes stripe_price_id
DROP POLICY IF EXISTS "Anyone can view stations" ON public.stations;

-- 2. Recreate view without security_invoker so it runs with owner privileges
-- This allows the view to read from stations even though anon/authenticated 
-- no longer have direct SELECT on the base table
DROP VIEW IF EXISTS public.stations_public;
CREATE VIEW public.stations_public AS
SELECT id, name, location, address, lat, lng, 
  status, price_per_session, duration_minutes, 
  currency, created_at, updated_at, company_id
FROM public.stations;

GRANT SELECT ON public.stations_public TO anon, authenticated;
