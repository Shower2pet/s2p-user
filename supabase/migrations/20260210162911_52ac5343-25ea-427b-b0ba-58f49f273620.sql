-- Keep TEST-001 heartbeat far in the future so it always appears online
UPDATE public.stations SET last_heartbeat_at = NOW() + INTERVAL '10 years' WHERE id = 'TEST-001';