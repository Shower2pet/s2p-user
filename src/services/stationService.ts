/**
 * Station hardware control & gate commands.
 */
import { supabase } from '@/integrations/supabase/client';

/* ── Station control (MQTT via Edge Function) ────────────── */
export interface StationControlResponse {
  success: boolean;
  [key: string]: unknown;
}

export const sendStationCommand = async (
  stationId: string,
  command: string,
  extra?: Record<string, unknown>,
): Promise<StationControlResponse> => {
  const { data, error } = await supabase.functions.invoke('station-control', {
    body: { station_id: stationId, command, ...extra },
  });
  if (error) throw error;
  return data as StationControlResponse;
};

/* ── Gate command ─────────────────────────────────────────── */
export const sendGateCommand = async (stationId: string, userId: string, command = 'OPEN') => {
  const { error } = await supabase.from('gate_commands').insert({
    station_id: stationId,
    user_id: userId,
    command,
  });
  if (error) throw error;
};
