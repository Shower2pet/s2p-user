
-- 1. Create a secure public view for stations that hides access_token
CREATE OR REPLACE VIEW public.stations_public
WITH (security_invoker = false) AS
  SELECT
    s.id,
    s.type,
    s.status,
    s.visibility,
    s.geo_lat,
    s.geo_lng,
    s.image_url,
    s.last_heartbeat_at,
    s.washing_options,
    s.structure_id,
    s.created_at
  FROM public.stations s
  WHERE s.visibility != 'HIDDEN';
  -- Excludes: access_token (security sensitive)

-- 2. Remove the overly permissive public SELECT on stations base table
DROP POLICY IF EXISTS "Public read stations" ON public.stations;

-- 3. Add a restrictive SELECT policy on stations base table (only admins, owners, managers)
CREATE POLICY "Authenticated read stations"
  ON public.stations FOR SELECT
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM structures WHERE structures.id = stations.structure_id AND structures.owner_id = auth.uid()
    )
    OR is_manager_of(structure_id)
  );

-- 4. Fix function search_path for handle_maintenance_status
CREATE OR REPLACE FUNCTION public.handle_maintenance_status()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $function$
BEGIN
  IF (TG_OP = 'INSERT') AND (NEW.ended_at IS NULL) THEN
    UPDATE public.stations SET status = 'MAINTENANCE' WHERE id = NEW.station_id;
  ELSIF (TG_OP = 'UPDATE') AND (OLD.ended_at IS NULL AND NEW.ended_at IS NOT NULL) THEN
    UPDATE public.stations SET status = 'AVAILABLE' WHERE id = NEW.station_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- 5. Deny anonymous access to sensitive tables explicitly
-- structure_wallets: already has user-only SELECT, add anon deny
CREATE POLICY "Deny anon wallet access"
  ON public.structure_wallets FOR SELECT
  TO anon
  USING (false);

-- structure_managers: deny anon access
CREATE POLICY "Deny anon manager access"
  ON public.structure_managers FOR SELECT
  TO anon
  USING (false);

-- maintenance_logs: deny anon access
CREATE POLICY "Deny anon maintenance access"
  ON public.maintenance_logs FOR SELECT
  TO anon
  USING (false);

-- transactions: deny anon SELECT (guest insert is still allowed)
CREATE POLICY "Deny anon transaction read"
  ON public.transactions FOR SELECT
  TO anon
  USING (false);

-- partners_fiscal_data: deny anon access
CREATE POLICY "Deny anon fiscal data access"
  ON public.partners_fiscal_data FOR SELECT
  TO anon
  USING (false);

-- 6. Grant SELECT on the view to anon and authenticated roles
GRANT SELECT ON public.stations_public TO anon, authenticated;
