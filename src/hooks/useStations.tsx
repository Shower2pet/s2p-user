import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WashingOption {
  id: number;
  name: string;
  price: number;
  duration: number; // seconds
}

export interface Station {
  id: string;
  type: string;
  status: 'AVAILABLE' | 'BUSY' | 'OFFLINE' | 'MAINTENANCE';
  visibility: 'PUBLIC' | 'RESTRICTED' | 'HIDDEN';
  geo_lat: number | null;
  geo_lng: number | null;
  image_url: string | null;
  last_heartbeat_at: string | null;
  washing_options: WashingOption[];
  structure_id: string | null;
  // Joined from structures
  structure_name: string | null;
  structure_address: string | null;
  structure_description: string | null;
  structure_geo_lat: number | null;
  structure_geo_lng: number | null;
}

const HEARTBEAT_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

export const isStationOnline = (station: Station): boolean => {
  if (station.status !== 'AVAILABLE') return false;
  if (!station.last_heartbeat_at) return false;
  const lastHeartbeat = new Date(station.last_heartbeat_at).getTime();
  return Date.now() - lastHeartbeat < HEARTBEAT_TIMEOUT_MS;
};

const parseStation = (row: any): Station => {
  const options = Array.isArray(row.washing_options) ? row.washing_options : [];
  return {
    id: row.id,
    type: row.type,
    status: row.status || 'OFFLINE',
    visibility: row.visibility || 'PUBLIC',
    geo_lat: row.geo_lat,
    geo_lng: row.geo_lng,
    image_url: row.image_url,
    last_heartbeat_at: row.last_heartbeat_at,
    washing_options: options as WashingOption[],
    structure_id: row.structure_id,
    structure_name: row.structures?.name ?? null,
    structure_address: row.structures?.address ?? null,
    structure_description: row.structures?.description ?? null,
    structure_geo_lat: row.structures?.geo_lat ?? null,
    structure_geo_lng: row.structures?.geo_lng ?? null,
  };
};

export const useStations = () => {
  return useQuery({
    queryKey: ['stations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stations')
        .select('*, structures(name, address, description, geo_lat, geo_lng)')
        .order('id');

      if (error) throw error;
      return (data || []).map(parseStation);
    },
  });
};

export const useStation = (stationId: string | undefined) => {
  return useQuery({
    queryKey: ['station', stationId],
    queryFn: async () => {
      if (!stationId) return null;

      const { data, error } = await supabase
        .from('stations')
        .select('*, structures(name, address, description, geo_lat, geo_lng)')
        .eq('id', stationId)
        .maybeSingle();

      if (error) throw error;
      return data ? parseStation(data) : null;
    },
    enabled: !!stationId,
  });
};
