
-- Add columns to stations
ALTER TABLE public.stations
  ADD COLUMN IF NOT EXISTS has_access_gate boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS access_code text;

-- Gate commands table
CREATE TABLE IF NOT EXISTS public.gate_commands (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  station_id text NOT NULL REFERENCES public.stations(id),
  user_id uuid REFERENCES auth.users(id),
  command text NOT NULL DEFAULT 'OPEN',
  status text NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gate_commands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create gate commands" ON public.gate_commands
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own gate commands" ON public.gate_commands
  FOR SELECT USING (auth.uid() = user_id);

-- Recreate function with new return type
DROP FUNCTION IF EXISTS public.get_public_stations();

CREATE FUNCTION public.get_public_stations()
 RETURNS TABLE(id text, type text, status text, visibility text, geo_lat numeric, geo_lng numeric, image_url text, last_heartbeat_at timestamp with time zone, structure_id uuid, washing_options jsonb, created_at timestamp with time zone, category text, has_access_gate boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    s.id, s.type, s.status::text, s.visibility::text,
    s.geo_lat, s.geo_lng, s.image_url, s.last_heartbeat_at,
    s.structure_id, s.washing_options, s.created_at,
    CASE WHEN s.type = 'BRACCO' THEN 'SHOWER' ELSE 'TUB' END AS category,
    COALESCE(s.has_access_gate, false) AS has_access_gate
  FROM public.stations s
  WHERE s.visibility IN ('PUBLIC', 'RESTRICTED');
$function$;
