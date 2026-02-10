
-- 1. Deny anonymous access to stations (protects access_token)
CREATE POLICY "Deny anonymous station access"
ON public.stations FOR SELECT
TO anon
USING (false);

-- 2. Deny anonymous access to profiles (protects email, phone, stripe_customer_id)
CREATE POLICY "Deny anonymous profile access"
ON public.profiles FOR SELECT
TO anon
USING (false);
