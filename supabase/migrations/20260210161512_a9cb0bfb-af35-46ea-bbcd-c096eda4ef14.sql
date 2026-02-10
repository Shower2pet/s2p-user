
-- Create a test structure
INSERT INTO public.structures (id, name, address, description, geo_lat, geo_lng)
VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Test Pet Wash Milano', 'Via Roma 1, Milano', 'Struttura di test per Shower2Pet', 45.4642, 9.1900);

-- Create a test station (category is generated from type)
INSERT INTO public.stations (id, type, status, visibility, geo_lat, geo_lng, structure_id, last_heartbeat_at, washing_options)
VALUES (
  'TEST-001',
  'BARBONCINO',
  'AVAILABLE',
  'PUBLIC',
  45.4642,
  9.1900,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  NOW(),
  '[{"id": 1, "name": "Lavaggio Base", "price": 3.00, "duration": 300}, {"id": 2, "name": "Lavaggio Completo", "price": 5.00, "duration": 600}, {"id": 3, "name": "Lavaggio Premium", "price": 8.00, "duration": 900}]'::jsonb
);
