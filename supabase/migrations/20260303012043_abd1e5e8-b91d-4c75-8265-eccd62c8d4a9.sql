
CREATE OR REPLACE FUNCTION public.maintenance_severity_station_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only enforce authorization when severity is 'high' (changes station status)
  -- Regular users can submit low/medium severity reports
  IF NEW.severity = 'high' THEN
    IF NOT (
      is_admin() OR 
      EXISTS(
        SELECT 1 FROM stations s
        JOIN structures st ON s.structure_id = st.id
        WHERE s.id = NEW.station_id 
        AND st.owner_id = auth.uid()
      ) OR
      EXISTS(
        SELECT 1 FROM stations s
        JOIN structure_managers sm ON sm.structure_id = s.structure_id
        WHERE s.id = NEW.station_id AND sm.user_id = auth.uid()
      )
    ) THEN
      RAISE EXCEPTION 'Unauthorized: cannot modify station status via maintenance';
    END IF;

    -- On INSERT with high severity, set station to MAINTENANCE
    IF TG_OP = 'INSERT' AND NEW.station_id IS NOT NULL THEN
      UPDATE stations SET status = 'MAINTENANCE' WHERE id = NEW.station_id;
    END IF;
  END IF;

  -- On UPDATE: if status changed to 'risolto', and severity was high, restore AVAILABLE
  IF TG_OP = 'UPDATE' AND NEW.status = 'risolto' AND OLD.status != 'risolto' AND NEW.severity = 'high' AND NEW.station_id IS NOT NULL THEN
    IF NOT (
      is_admin() OR 
      EXISTS(
        SELECT 1 FROM stations s
        JOIN structures st ON s.structure_id = st.id
        WHERE s.id = NEW.station_id 
        AND st.owner_id = auth.uid()
      ) OR
      EXISTS(
        SELECT 1 FROM stations s
        JOIN structure_managers sm ON sm.structure_id = s.structure_id
        WHERE s.id = NEW.station_id AND sm.user_id = auth.uid()
      )
    ) THEN
      RAISE EXCEPTION 'Unauthorized: cannot resolve high-severity maintenance tickets';
    END IF;

    -- Only restore if no other open high-severity tickets exist for this station
    IF NOT EXISTS (
      SELECT 1 FROM maintenance_logs
      WHERE station_id = NEW.station_id
        AND id != NEW.id
        AND severity = 'high'
        AND status != 'risolto'
    ) THEN
      UPDATE stations SET status = 'AVAILABLE' WHERE id = NEW.station_id AND status = 'MAINTENANCE';
    END IF;
    NEW.ended_at = now();
  END IF;

  RETURN NEW;
END;
$function$;
