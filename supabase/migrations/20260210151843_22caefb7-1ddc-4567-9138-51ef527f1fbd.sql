
-- Drop broken restrictive-only policies
DROP POLICY IF EXISTS "Public read packages" ON public.credit_packages;
DROP POLICY IF EXISTS "Partner/Manager manage packages" ON public.credit_packages;

-- Permissive: anyone can read active packages
CREATE POLICY "Anyone can view active credit packages"
ON public.credit_packages FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Permissive: structure owners manage their packages
CREATE POLICY "Structure owners manage packages"
ON public.credit_packages FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.structures
    WHERE structures.id = credit_packages.structure_id
      AND structures.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.structures
    WHERE structures.id = credit_packages.structure_id
      AND structures.owner_id = auth.uid()
  )
);

-- Permissive: managers manage packages for their structure
CREATE POLICY "Managers manage packages"
ON public.credit_packages FOR ALL
TO authenticated
USING (is_manager_of(structure_id))
WITH CHECK (is_manager_of(structure_id));

-- Permissive: admins full access
CREATE POLICY "Admins manage all packages"
ON public.credit_packages FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());
