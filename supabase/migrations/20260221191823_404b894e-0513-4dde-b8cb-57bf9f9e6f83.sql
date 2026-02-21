
-- Riduce soglia auto_offline da 3 minuti a 90 secondi
CREATE OR REPLACE FUNCTION public.auto_offline_expired_heartbeats()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE stations
  SET status = 'OFFLINE'::station_status
  WHERE status = 'AVAILABLE'
    AND last_heartbeat_at < now() - interval '90 seconds';
END;
$function$;

-- Riduce soglia get_public_stations da 3 minuti a 90 secondi
CREATE OR REPLACE FUNCTION public.get_public_stations()
 RETURNS TABLE(id text, type text, status text, visibility text, geo_lat numeric, geo_lng numeric, image_url text, last_heartbeat_at timestamp with time zone, structure_id uuid, washing_options jsonb, created_at timestamp with time zone, category text, has_access_gate boolean)
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT
    s.id, s.type,
    CASE
      WHEN s.status::text = 'AVAILABLE' AND s.last_heartbeat_at < now() - interval '90 seconds' THEN 'OFFLINE'
      WHEN s.status::text = 'AVAILABLE' AND EXISTS (
        SELECT 1 FROM public.wash_sessions ws
        WHERE ws.station_id = s.id
          AND ws.status = 'ACTIVE'
          AND ws.ends_at > now()
          AND ws.step != 'ready'
      ) THEN 'BUSY'
      ELSE s.status::text
    END AS status,
    s.visibility::text,
    s.geo_lat, s.geo_lng, s.image_url, s.last_heartbeat_at,
    s.structure_id, s.washing_options, s.created_at,
    CASE WHEN UPPER(s.type) = 'BRACCO' THEN 'SHOWER' ELSE 'TUB' END AS category,
    COALESCE(s.has_access_gate, false) AS has_access_gate
  FROM public.stations s
  WHERE s.visibility IN ('PUBLIC', 'RESTRICTED');
$function$;
