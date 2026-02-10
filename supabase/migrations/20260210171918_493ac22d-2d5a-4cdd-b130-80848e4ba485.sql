
-- Seed credit packages for the test structure
INSERT INTO public.credit_packages (name, price_eur, credits_value, structure_id, is_active) VALUES
  ('Starter', 10, 12, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', true),
  ('Value', 20, 25, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', true);

-- RLS: allow anyone to read active credit packages
CREATE POLICY "Anyone can read active credit packages"
  ON public.credit_packages FOR SELECT
  USING (is_active = true);
