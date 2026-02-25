CREATE POLICY "Anyone can read structures"
  ON public.structures
  FOR SELECT
  TO anon, authenticated
  USING (true);