import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CreditPackage {
  id: string;
  name: string | null;
  price_eur: number;
  credits_value: number;
  structure_id: string | null;
  structure_name?: string | null;
}

export const useCreditPackages = () => {
  return useQuery({
    queryKey: ['credit-packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_packages')
        .select('*, structures(name)')
        .eq('is_active', true)
        .order('price_eur');

      if (error) throw error;

      return (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        price_eur: p.price_eur,
        credits_value: p.credits_value,
        structure_id: p.structure_id,
        structure_name: p.structures?.name ?? null,
      })) as CreditPackage[];
    },
  });
};
