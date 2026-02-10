
-- Step 1: Remove any existing CHECK constraint on type
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE rel.relname = 'stations'
      AND nsp.nspname = 'public'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%type%'
  LOOP
    EXECUTE format('ALTER TABLE public.stations DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- Step 2: Add CHECK constraint
ALTER TABLE public.stations
ADD CONSTRAINT stations_type_check
CHECK (type IN ('BARBONCINO', 'AKITA', 'HUSKY', 'BRACCO'));

-- Step 3: Add generated category column
ALTER TABLE public.stations
ADD COLUMN category text GENERATED ALWAYS AS (
  CASE WHEN type = 'BRACCO' THEN 'SHOWER' ELSE 'TUB' END
) STORED;
