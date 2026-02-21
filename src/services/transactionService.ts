/**
 * Transaction service — fetch user transaction history.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Transaction } from '@/types/database';

export const fetchTransactions = async (limit = 50): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as Transaction[];
};

/**
 * Fetch receipt PDF from Fiskaly via edge function.
 * Returns base64 PDF data or null if not available.
 */
export const downloadReceiptPdf = async (transactionId: string): Promise<{ pdf_base64?: string; record?: unknown; message?: string }> => {
  const { data, error } = await supabase.functions.invoke('get-receipt-pdf', {
    body: { transaction_id: transactionId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
};
