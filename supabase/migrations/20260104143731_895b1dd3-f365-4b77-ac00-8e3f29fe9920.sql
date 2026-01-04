-- Create a view that hides sensitive columns from public access
CREATE VIEW public.stations_public AS
SELECT 
  id, name, location, address, lat, lng, 
  status, price_per_session, duration_minutes, 
  currency, created_at, updated_at, company_id
FROM public.stations;

-- Grant SELECT on the view to anon and authenticated users
GRANT SELECT ON public.stations_public TO anon, authenticated;

-- Drop the overly permissive "Anyone can view stations" policy
DROP POLICY IF EXISTS "Anyone can view stations" ON public.stations;

-- Create a new restrictive policy - only authenticated users can view full station data
CREATE POLICY "Authenticated users can view stations" 
ON public.stations FOR SELECT 
TO authenticated
USING (true);