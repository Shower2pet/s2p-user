
-- Remove old every-minute job
SELECT cron.unschedule('check-heartbeat-every-minute');

-- Create new every-2-minutes job
SELECT cron.schedule(
  'check-heartbeat-every-2min',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url:='https://rbdzinajiyswzdeoenil.supabase.co/functions/v1/check-heartbeat',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHppbmFqaXlzd3pkZW9lbmlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MzMyNzksImV4cCI6MjA4NjMwOTI3OX0.gwnlpDQHdz98pBB_jMP4e6XQTA03kjIcEWbXUkDse_o"}'::jsonb,
    body:=concat('{"time": "', now(), '"}')::jsonb
  ) as request_id;
  $$
);
