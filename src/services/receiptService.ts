/**
 * Fiskaly fiscal receipt — fire-and-forget helper.
 * La edge function generate-receipt ricava autonomamente partner_id e amount dal session_id.
 * Non bloccare mai l'UX su errori fiscali.
 */
import { supabase } from '@/integrations/supabase/client';

export async function sendFiskalyReceipt(sessionId: string): Promise<void> {
  try {
    await supabase.functions.invoke('generate-receipt', {
      body: { session_id: sessionId },
    });
  } catch (e) {
    console.warn('[receipt] fire-and-forget error', e);
    // Non bloccare il flusso utente in caso di errore fiscale
  }
}
