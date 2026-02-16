/**
 * Maintenance service — report problems / logs.
 */
import { supabase } from '@/integrations/supabase/client';
import type { MaintenanceSeverity } from '@/types/database';

export const reportProblem = async (
  stationId: string,
  userId: string,
  reason: string,
  severity: MaintenanceSeverity = 'low',
) => {
  const { error } = await supabase.from('maintenance_logs').insert({
    station_id: stationId,
    performed_by: userId,
    reason,
    severity,
    status: 'open',
  });
  if (error) throw error;
};
