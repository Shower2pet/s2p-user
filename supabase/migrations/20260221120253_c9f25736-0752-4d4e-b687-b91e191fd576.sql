
-- Update offline threshold from 2 to 5 minutes
CREATE OR REPLACE FUNCTION public.auto_offline_expired_heartbeats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE stations
  SET status = 'OFFLINE'::station_status
  WHERE status = 'AVAILABLE'
    AND last_heartbeat_at < now() - interval '5 minutes';
  -- manual_offline stays false so they can recover on next heartbeat
END;
$$;

-- Reschedule cron to every 3 minutes
SELECT cron.unschedule('check-heartbeat-every-2min');

SELECT cron.schedule(
  'check-heartbeat-every-3min',
  '*/3 * * * *',
  $$
  SELECT net.http_post(
    url:='https://rbdzinajiyswzdeoenil.supabase.co/functions/v1/check-heartbeat',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHppbmFqaXlzd3pkZW9lbmlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MzMyNzksImV4cCI6MjA4NjMwOTI3OX0.gwnlpDQHdz98pBB_jMP4e6XQTA03kjIcEWbXUkDse_o"}'::jsonb,
    body:=concat('{"time": "', now(), '"}')::jsonb
  ) as request_id;
  $$
);
