-- Fix: drop restrictive INSERT policies and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Anon can insert error logs" ON public.app_error_logs;
DROP POLICY IF EXISTS "Authenticated users can insert error logs" ON public.app_error_logs;

CREATE POLICY "Anon can insert error logs"
  ON public.app_error_logs FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated users can insert error logs"
  ON public.app_error_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);