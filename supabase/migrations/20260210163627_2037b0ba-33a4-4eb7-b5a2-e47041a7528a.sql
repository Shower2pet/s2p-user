-- Table to track active and past wash sessions
CREATE TABLE public.wash_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  station_id TEXT NOT NULL REFERENCES public.stations(id),
  user_id UUID REFERENCES public.profiles(id),
  guest_email TEXT,
  option_id INT NOT NULL,
  option_name TEXT NOT NULL,
  total_seconds INT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL,
  step TEXT NOT NULL DEFAULT 'timer',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  stripe_session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wash_sessions ENABLE ROW LEVEL SECURITY;

-- Users can read their own sessions
CREATE POLICY "User reads own sessions"
  ON public.wash_sessions FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

-- Service role inserts (from edge function), users can also read
CREATE POLICY "Authenticated insert own session"
  ON public.wash_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Allow update step (for frontend step transitions)
CREATE POLICY "User updates own session"
  ON public.wash_sessions FOR UPDATE
  USING (user_id = auth.uid() OR is_admin());

-- Deny anon
CREATE POLICY "Deny anon session access"
  ON public.wash_sessions FOR SELECT
  USING (false);

-- Index for fast lookup of active session by station
CREATE INDEX idx_wash_sessions_station_active 
  ON public.wash_sessions(station_id, status) 
  WHERE status = 'ACTIVE';

-- Index for user's active session
CREATE INDEX idx_wash_sessions_user_active 
  ON public.wash_sessions(user_id, status) 
  WHERE status = 'ACTIVE';

-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.wash_sessions;