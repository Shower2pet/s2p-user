CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_full_name text;
  v_first_name text;
  v_last_name text;
BEGIN
  v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', '');
  
  IF v_full_name != '' THEN
    v_first_name := split_part(v_full_name, ' ', 1);
    v_last_name := NULLIF(TRIM(substring(v_full_name FROM position(' ' IN v_full_name) + 1)), '');
    IF v_last_name = v_first_name THEN
      v_last_name := NULL;
    END IF;
  ELSE
    v_first_name := NULL;
    v_last_name := NULL;
  END IF;

  INSERT INTO public.profiles (id, email, role, first_name, last_name)
  VALUES (new.id, new.email, 'user', v_first_name, v_last_name);
  RETURN new;
END;
$function$;