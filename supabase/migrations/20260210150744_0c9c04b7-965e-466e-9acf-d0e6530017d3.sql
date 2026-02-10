
-- Fix: Change view to security_invoker=on and use a security definer function to read stations safely
DROP VIEW IF EXISTS public.stations_public;

-- Create a security definer function that returns station public data
CREATE OR REPLACE FUNCTION public.get_public_stations()
RETURNS TABLE (
  id text,
  type text,
  status text,
  visibility text,
  geo_lat numeric,
  geo_lng numeric,
  image_url text,
  last_heartbeat_at timestamptz,
  washing_options jsonb,
  structure_id uuid,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.type, s.status::text, s.visibility::text, s.geo_lat, s.geo_lng,
         s.image_url, s.last_heartbeat_at, s.washing_options, s.structure_id, s.created_at
  FROM public.stations s
  WHERE s.visibility != 'HIDDEN';
$$;

-- Grant execute to both roles
GRANT EXECUTE ON FUNCTION public.get_public_stations() TO anon, authenticated;
