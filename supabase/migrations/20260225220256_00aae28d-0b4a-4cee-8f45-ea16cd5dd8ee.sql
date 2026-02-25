UPDATE public.profiles p
SET last_name = NULL
FROM (
  SELECT
    id,
    trim(coalesce(raw_user_meta_data->>'full_name', '')) AS meta_full_name,
    nullif(trim(coalesce(raw_user_meta_data->>'last_name', '')), '') AS meta_last_name
  FROM auth.users
) u
WHERE p.id = u.id
  AND p.last_name = 'Utente'
  AND u.meta_last_name IS NULL
  AND (u.meta_full_name = '' OR position(' ' IN u.meta_full_name) = 0);