/**
 * Wash-session service — queries & mutations on wash_sessions table.
 */
import { supabase } from '@/integrations/supabase/client';
import type { WashSession } from '@/types/database';

/* ── Fetch active session ────────────────────────────────── */
export const fetchActiveSession = async (
  stationId: string,
  opts: { stripeSessionId?: string | null; userId?: string | null },
): Promise<WashSession | null> => {
  // Guest flow: use edge function to bypass RLS
  if (opts.stripeSessionId && !opts.userId) {
    const { data, error } = await supabase.functions.invoke('get-guest-session', {
      body: { stripe_session_id: opts.stripeSessionId, station_id: stationId },
    });
    if (error) {
      console.error('[SESSION] get-guest-session error:', error);
      return null;
    }
    return (data?.session as WashSession) ?? null;
  }

  let query = supabase
    .from('wash_sessions')
    .select('*')
    .eq('station_id', stationId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (opts.stripeSessionId) {
    query = supabase
      .from('wash_sessions')
      .select('*')
      .eq('station_id', stationId)
      .eq('stripe_session_id', opts.stripeSessionId)
      .order('created_at', { ascending: false })
      .limit(1);
  } else {
    query = query.eq('status', 'ACTIVE');
    if (opts.userId) query = query.eq('user_id', opts.userId);
  }

  const { data } = await query.maybeSingle();
  return (data as WashSession) ?? null;
};

/* ── Update step / status (supports guest via edge function) ── */
export const updateSessionStep = async (
  sessionId: string,
  step: string,
  status?: string,
  opts?: { isGuest?: boolean },
) => {
  if (opts?.isGuest) {
    const body: Record<string, string> = { session_id: sessionId, step };
    if (status) body.status = status;
    const { error } = await supabase.functions.invoke('update-guest-session', { body });
    if (error) throw error;
    return;
  }

  const updates: Record<string, string> = { step };
  if (status) updates.status = status;
  const { error } = await supabase.from('wash_sessions').update(updates).eq('id', sessionId);
  if (error) throw error;
};

/* ── Update session timing ───────────────────────────────── */
export const updateSessionTiming = async (
  sessionId: string,
  startedAt: string,
  endsAt: string,
  step: string,
  opts?: { isGuest?: boolean },
) => {
  if (opts?.isGuest) {
    const { error } = await supabase.functions.invoke('update-guest-session', {
      body: { session_id: sessionId, started_at: startedAt, ends_at: endsAt, step },
    });
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from('wash_sessions')
    .update({ started_at: startedAt, ends_at: endsAt, step })
    .eq('id', sessionId);
  if (error) throw error;
};

/* ── Update courtesy end time ────────────────────────────── */
export const updateCourtesyEnd = async (
  sessionId: string,
  endsAt: string,
  opts?: { isGuest?: boolean },
) => {
  if (opts?.isGuest) {
    const { error } = await supabase.functions.invoke('update-guest-session', {
      body: { session_id: sessionId, step: 'courtesy', ends_at: endsAt },
    });
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from('wash_sessions')
    .update({ step: 'courtesy', ends_at: endsAt })
    .eq('id', sessionId);
  if (error) throw error;
};

/* ── Realtime subscription ───────────────────────────────── */
export const subscribeToSession = (
  sessionId: string,
  onUpdate: (session: WashSession) => void,
) => {
  const channel = supabase
    .channel(`wash_session_${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'wash_sessions',
        filter: `id=eq.${sessionId}`,
      },
      (payload) => onUpdate(payload.new as WashSession),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

/* ── Submit rating ───────────────────────────────────────── */
export const submitRating = async (
  stationId: string,
  sessionId: string,
  userId: string,
  rating: number,
) => {
  const { error } = await supabase
    .from('station_ratings')
    .insert({ station_id: stationId, session_id: sessionId, user_id: userId, rating });
  if (error) throw error;
};

/* ── Fetch station average rating ────────────────────────── */
export const fetchStationAvgRating = async (
  stationId: string,
): Promise<{ avg_rating: number; total_count: number }> => {
  const { data, error } = await supabase.rpc('get_station_avg_rating', { p_station_id: stationId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { avg_rating: Number(row?.avg_rating ?? 0), total_count: Number(row?.total_count ?? 0) };
};
