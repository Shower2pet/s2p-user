-- Fix the get_public_stations function to not reference non-existent 'category' column
CREATE OR REPLACE FUNCTION public.get_public_stations()
RETURNS TABLE(
  id text,
  type text,
  status text,
  visibility text,
  geo_lat numeric,
  geo_lng numeric,
  image_url text,
  last_heartbeat_at timestamptz,
  structure_id uuid,
  washing_options jsonb,
  created_at timestamptz,
  category text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id, s.type, s.status::text, s.visibility::text,
    s.geo_lat, s.geo_lng, s.image_url, s.last_heartbeat_at,
    s.structure_id, s.washing_options, s.created_at,
    CASE WHEN s.type = 'BRACCO' THEN 'SHOWER' ELSE 'TUB' END AS category
  FROM public.stations s
  WHERE s.visibility IN ('PUBLIC', 'RESTRICTED');
$$;