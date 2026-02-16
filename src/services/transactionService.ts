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
