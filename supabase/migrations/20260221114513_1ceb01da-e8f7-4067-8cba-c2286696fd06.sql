
-- 1. Add manual_offline column
ALTER TABLE stations ADD COLUMN manual_offline boolean NOT NULL DEFAULT false;

-- 2. Create handle_station_heartbeat function
CREATE OR REPLACE FUNCTION public.handle_station_heartbeat(p_station_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE stations
  SET
    last_heartbeat_at = now(),
    status = CASE
      WHEN status = 'OFFLINE' AND manual_offline = false THEN 'AVAILABLE'::station_status
      ELSE status
    END
  WHERE id = p_station_id;
END;
$$;

-- 3. Create auto-offline function for expired heartbeats
CREATE OR REPLACE FUNCTION public.auto_offline_expired_heartbeats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE stations
  SET status = 'OFFLINE'::station_status
  WHERE status = 'AVAILABLE'
    AND last_heartbeat_at < now() - interval '2 minutes';
  -- manual_offline stays false so they can recover on next heartbeat
END;
$$;

-- 4. Update get_public_stations to include heartbeat timeout logic
CREATE OR REPLACE FUNCTION public.get_public_stations()
RETURNS TABLE(
  id text, type text, status text, visibility text,
  geo_lat numeric, geo_lng numeric, image_url text,
  last_heartbeat_at timestamp with time zone,
  structure_id uuid, washing_options jsonb,
  created_at timestamp with time zone, category text,
  has_access_gate boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    s.id, s.type,
    CASE
      -- Heartbeat timeout: treat as OFFLINE if heartbeat expired
      WHEN s.status::text = 'AVAILABLE' AND s.last_heartbeat_at < now() - interval '2 minutes' THEN 'OFFLINE'
      -- BUSY: check for active wash sessions
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
$$;
