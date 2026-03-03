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

  // Send notification email to support (fire-and-forget)
  try {
    await supabase.functions.invoke('send-email', {
      body: {
        to: 'alberto.c@shower2pet.com',
        type: 'maintenance_ticket_opened',
        data: {
          station_id: stationId,
          reason,
          severity,
        },
      },
    });
  } catch (emailErr) {
    console.error('Failed to send maintenance email:', emailErr);
  }
};
