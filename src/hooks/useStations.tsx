import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WashingOption {
  id: number;
  name: string;
  price: number;
  duration: number; // seconds
}

export type StationType = 'BARBONCINO' | 'AKITA' | 'HUSKY' | 'BRACCO';
export type StationCategory = 'TUB' | 'SHOWER';

export interface Station {
  id: string;
  type: StationType;
  category: StationCategory;
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
  structure_owner_id: string | null;
  has_access_gate: boolean;
  access_code: string | null;
}

export const getStationCategory = (type: string): StationCategory =>
  type.toUpperCase() === 'BRACCO' ? 'SHOWER' : 'TUB';

export const isShower = (station: Station): boolean => station.category === 'SHOWER';
export const isTub = (station: Station): boolean => station.category === 'TUB';

export const getStationDisplayName = (station: Station): string => {
  const typeName = station.type.charAt(0).toUpperCase() + station.type.slice(1).toLowerCase();
  return station.structure_name ? `${typeName} – ${station.structure_name}` : typeName;
};

export const isStationOnline = (station: Station): boolean => {
  // Status is already resolved server-side by get_public_stations() 
  // which checks last_heartbeat_at as a safety net
  return station.status === 'AVAILABLE';
};

export const isStationBusy = (station: Station): boolean => {
  return station.status === 'BUSY';
};

export const isStationMaintenance = (station: Station): boolean => {
  return station.status === 'MAINTENANCE';
};

const mapRow = (row: any): Station => {
  const options = Array.isArray(row.washing_options) ? row.washing_options : [];
  return {
    id: row.id,
    type: row.type as StationType,
    category: (row.category || getStationCategory(row.type)) as StationCategory,
    status: (row.status || 'OFFLINE') as Station['status'],
    visibility: (row.visibility || 'PUBLIC') as Station['visibility'],
    geo_lat: row.geo_lat,
    geo_lng: row.geo_lng,
    image_url: row.image_url,
    last_heartbeat_at: row.last_heartbeat_at,
    washing_options: options as WashingOption[],
    structure_id: row.structure_id,
    structure_name: row.structure_name ?? null,
    structure_address: row.structure_address ?? null,
    structure_description: row.structure_description ?? null,
    structure_geo_lat: row.structure_geo_lat ?? null,
    structure_geo_lng: row.structure_geo_lng ?? null,
    structure_owner_id: row.structure_owner_id ?? null,
    has_access_gate: row.has_access_gate ?? false,
    access_code: row.access_code ?? null,
  };
};

export const useStations = () => {
  return useQuery({
    queryKey: ['stations'],
    refetchInterval: 30_000, // Poll every 30s for status changes
    queryFn: async () => {
      const { data: stationsData, error } = await supabase.rpc('get_public_stations');
      if (error) throw error;
      return (stationsData || []).map(mapRow);
    },
  });
};

export const useStation = (stationId: string | undefined) => {
  return useQuery({
    queryKey: ['station', stationId],
    refetchInterval: 30_000, // Poll every 30s for status changes
    queryFn: async () => {
      if (!stationId) return null;
      const { data: stationsData, error } = await supabase.rpc('get_public_stations');
      if (error) throw error;
      const row = (stationsData || []).find((s: any) => s.id === stationId);
      return row ? mapRow(row) : null;
    },
    enabled: !!stationId,
  });
};
