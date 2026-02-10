
INSERT INTO stations (id, type, status, visibility, geo_lat, geo_lng, structure_id, last_heartbeat_at, washing_options) VALUES
('test-barboncino', 'BARBONCINO', 'AVAILABLE', 'PUBLIC', 45.4642, 9.1900, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', now(),
 '[{"id":1,"name":"Lavaggio Base","price":1.00,"duration":300},{"id":2,"name":"Lavaggio Completo","price":2.00,"duration":600}]'::jsonb),

('test-akita', 'AKITA', 'AVAILABLE', 'PUBLIC', 45.4650, 9.1910, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', now(),
 '[{"id":1,"name":"Lavaggio Base","price":2.00,"duration":600},{"id":2,"name":"Lavaggio Premium","price":3.50,"duration":900}]'::jsonb),

('test-husky', 'HUSKY', 'AVAILABLE', 'PUBLIC', 45.4700, 9.1850, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', now(),
 '[{"id":1,"name":"Lavaggio Base","price":3.00,"duration":900},{"id":2,"name":"Lavaggio XL","price":5.00,"duration":1200}]'::jsonb),

('test-bracco', 'BRACCO', 'AVAILABLE', 'PUBLIC', 45.5845, 9.2744, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', now(),
 '[{"id":1,"name":"Doccia Rapida","price":1.50,"duration":300},{"id":2,"name":"Doccia Completa","price":2.50,"duration":600}]'::jsonb)
ON CONFLICT (id) DO NOTHING;
