
-- Increase offline threshold from 90 seconds to 5 minutes in get_public_stations
CREATE OR REPLACE FUNCTION public.get_public_stations()
 RETURNS TABLE(id text, type text, status text, visibility text, geo_lat numeric, geo_lng numeric, image_url text, last_heartbeat_at timestamp with time zone, structure_id uuid, washing_options jsonb, created_at timestamp with time zone, category text, has_access_gate boolean)
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT
    s.id, s.type,
    CASE
      WHEN s.status::text = 'AVAILABLE' AND s.last_heartbeat_at < now() - interval '5 minutes' THEN 'OFFLINE'
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

-- Increase auto-offline threshold from 90 seconds to 5 minutes
CREATE OR REPLACE FUNCTION public.auto_offline_expired_heartbeats()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE stations
  SET status = 'OFFLINE'::station_status
  WHERE status = 'AVAILABLE'
    AND last_heartbeat_at < now() - interval '5 minutes';
END;
$function$;

-- Increase enforce trigger threshold from 90 seconds to 5 minutes
CREATE OR REPLACE FUNCTION public.enforce_station_active_requires_price()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'AVAILABLE' THEN
    IF NEW.washing_options IS NULL OR NEW.washing_options = '[]'::jsonb OR jsonb_array_length(NEW.washing_options) = 0 THEN
      NEW.status := 'OFFLINE';
    END IF;
    IF NEW.last_heartbeat_at IS NULL OR NEW.last_heartbeat_at < now() - interval '5 minutes' THEN
      NEW.status := 'OFFLINE';
    END IF;
  END IF;
  IF (NEW.washing_options IS NULL OR NEW.washing_options = '[]'::jsonb OR jsonb_array_length(NEW.washing_options) = 0)
     AND NEW.status = 'AVAILABLE' THEN
    NEW.status := 'OFFLINE';
  END IF;
  RETURN NEW;
END;
$function$;
