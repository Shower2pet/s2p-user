
-- Drop and recreate get_public_stations with 5-minute threshold
DROP FUNCTION IF EXISTS get_public_stations();

CREATE OR REPLACE FUNCTION get_public_stations()
RETURNS TABLE(
  id text, type text, status text, visibility text,
  geo_lat numeric, geo_lng numeric,
  image_url text, last_heartbeat_at timestamptz,
  structure_id uuid, washing_options jsonb, created_at timestamptz,
  category text, has_access_gate boolean
) LANGUAGE sql SECURITY DEFINER AS $$
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
$$;

-- Increase auto_offline threshold from 2 to 5 minutes
CREATE OR REPLACE FUNCTION auto_offline_expired_heartbeats()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE stations
  SET status = 'OFFLINE'::station_status
  WHERE status = 'AVAILABLE'
    AND last_heartbeat_at < now() - interval '5 minutes';
END;
$$;
