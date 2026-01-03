-- Add explicit DELETE policy that denies all user deletions for audit trail integrity
CREATE POLICY "Prevent transaction deletion" 
ON public.transactions 
FOR DELETE 
USING (false);