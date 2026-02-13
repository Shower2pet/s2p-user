-- Allow anyone to read basic structure info (public data)
CREATE POLICY "Anyone can view structures"
ON public.structures
FOR SELECT
USING (true);