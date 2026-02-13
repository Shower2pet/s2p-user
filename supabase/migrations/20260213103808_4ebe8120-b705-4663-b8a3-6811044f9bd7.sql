
-- Table for logging restricted station access requests
CREATE TABLE public.station_access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  station_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.station_access_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own access logs
CREATE POLICY "Users can view own access logs"
  ON public.station_access_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own access logs
CREATE POLICY "Users can insert own access logs"
  ON public.station_access_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all
CREATE POLICY "Admins can view all access logs"
  ON public.station_access_logs FOR SELECT
  USING (public.is_admin());

-- Partners can see logs for their stations
CREATE POLICY "Partners see structure access logs"
  ON public.station_access_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stations s
      JOIN public.structures st ON s.structure_id = st.id
      WHERE s.id = station_access_logs.station_id
      AND st.owner_id = auth.uid()
    )
  );

-- Index for fast lookups
CREATE INDEX idx_station_access_logs_user_station ON public.station_access_logs(user_id, station_id);
CREATE INDEX idx_station_access_logs_station ON public.station_access_logs(station_id);
