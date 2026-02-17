-- Rename acube_transaction_id to fiskaly_record_id if it still exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'transaction_receipts' AND column_name = 'acube_transaction_id'
  ) THEN
    ALTER TABLE public.transaction_receipts RENAME COLUMN acube_transaction_id TO fiskaly_record_id;
  END IF;
END$$;

-- Drop acube_company_id from profiles if it exists (replaced by fiskaly_system_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'acube_company_id'
  ) THEN
    ALTER TABLE public.profiles DROP COLUMN acube_company_id;
  END IF;
END$$;