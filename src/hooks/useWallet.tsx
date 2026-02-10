import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface WalletBalance {
  id: string;
  structure_id: string | null;
  balance: number;
  structure_name: string | null;
}

export const useWallets = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['wallets', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('structure_wallets')
        .select('*, structures(name)')
        .eq('user_id', user.id);

      if (error) throw error;

      return (data || []).map((w: any) => ({
        id: w.id,
        structure_id: w.structure_id,
        balance: w.balance || 0,
        structure_name: w.structures?.name ?? null,
      })) as WalletBalance[];
    },
    enabled: !!user,
  });
};

export const useWalletForStructure = (structureId: string | null | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['wallet', user?.id, structureId],
    queryFn: async () => {
      if (!user || !structureId) return null;

      const { data, error } = await supabase
        .from('structure_wallets')
        .select('*')
        .eq('user_id', user.id)
        .eq('structure_id', structureId)
        .maybeSingle();

      if (error) throw error;
      return data ? { balance: data.balance || 0 } : { balance: 0 };
    },
    enabled: !!user && !!structureId,
  });
};
