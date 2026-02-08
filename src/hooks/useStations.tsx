import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Station {
  id: string;
  name: string;
  location: string;
  address: string;
  lat: number;
  lng: number;
  status: 'available' | 'busy' | 'offline';
  price_per_session: number;
  duration_minutes: number;
  currency: string;
}

export const useStations = () => {
  return useQuery({
    queryKey: ['stations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stations_public')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Station[];
    },
  });
};

export const useStation = (stationId: string | undefined) => {
  return useQuery({
    queryKey: ['station', stationId],
    queryFn: async () => {
      if (!stationId) return null;
      
      const { data, error } = await supabase
        .from('stations_public')
        .select('*')
        .eq('id', stationId)
        .maybeSingle();
      
      if (error) throw error;
      return data as Station | null;
    },
    enabled: !!stationId,
  });
};
