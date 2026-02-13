
-- Backfill missing profiles for existing auth users
INSERT INTO public.profiles (id, email, role, first_name, last_name)
SELECT u.id, u.email, 'user', 'Nuovo', 'Utente'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
