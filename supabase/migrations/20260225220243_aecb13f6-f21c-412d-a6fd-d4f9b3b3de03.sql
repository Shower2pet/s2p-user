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
  v_full_name := trim(coalesce(new.raw_user_meta_data->>'full_name', ''));
  v_first_name := nullif(trim(coalesce(new.raw_user_meta_data->>'first_name', '')), '');
  v_last_name := nullif(trim(coalesce(new.raw_user_meta_data->>'last_name', '')), '');

  IF v_first_name IS NULL AND v_full_name <> '' THEN
    v_first_name := split_part(v_full_name, ' ', 1);
  END IF;

  IF v_last_name IS NULL AND v_full_name <> '' AND position(' ' IN v_full_name) > 0 THEN
    v_last_name := nullif(trim(substring(v_full_name FROM position(' ' IN v_full_name) + 1)), '');
  END IF;

  INSERT INTO public.profiles (id, email, role, first_name, last_name)
  VALUES (new.id, new.email, 'user', v_first_name, v_last_name);

  RETURN new;
END;
$function$;

UPDATE public.profiles p
SET
  first_name = COALESCE(
    u.meta_first_name,
    CASE
      WHEN u.meta_full_name <> '' THEN split_part(u.meta_full_name, ' ', 1)
      ELSE p.first_name
    END
  ),
  last_name = COALESCE(
    u.meta_last_name,
    CASE
      WHEN u.meta_full_name <> '' AND position(' ' IN u.meta_full_name) > 0
        THEN nullif(trim(substring(u.meta_full_name FROM position(' ' IN u.meta_full_name) + 1)), '')
      ELSE p.last_name
    END
  )
FROM (
  SELECT
    id,
    trim(coalesce(raw_user_meta_data->>'full_name', '')) AS meta_full_name,
    nullif(trim(coalesce(raw_user_meta_data->>'first_name', '')), '') AS meta_first_name,
    nullif(trim(coalesce(raw_user_meta_data->>'last_name', '')), '') AS meta_last_name
  FROM auth.users
) u
WHERE p.id = u.id
  AND p.first_name = 'Nuovo'
  AND p.last_name = 'Utente'
  AND (
    u.meta_first_name IS NOT NULL
    OR u.meta_last_name IS NOT NULL
    OR u.meta_full_name <> ''
  );