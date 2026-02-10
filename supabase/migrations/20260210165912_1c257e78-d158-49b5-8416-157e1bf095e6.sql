
-- Fix heartbeat for test stations to far future
UPDATE stations SET last_heartbeat_at = '2036-02-10 00:00:00+00' WHERE id IN ('test-barboncino', 'test-akita', 'test-husky', 'test-bracco');
