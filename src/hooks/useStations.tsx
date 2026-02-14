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

const HEARTBEAT_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

export const isStationOnline = (station: Station): boolean => {
  return station.status === 'AVAILABLE';
};

const enrichWithStructure = (row: any, structuresMap: Map<string, any>): Station => {
  const options = Array.isArray(row.washing_options) ? row.washing_options : [];
  const struct = row.structure_id ? structuresMap.get(row.structure_id) : null;
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
    structure_name: struct?.name ?? null,
    structure_address: struct?.address ?? null,
    structure_description: struct?.description ?? null,
    structure_geo_lat: struct?.geo_lat ?? null,
    structure_geo_lng: struct?.geo_lng ?? null,
    structure_owner_id: struct?.owner_id ?? null,
    has_access_gate: row.has_access_gate ?? false,
    access_code: row.access_code ?? null,
  };
};

export const useStations = () => {
  return useQuery({
    queryKey: ['stations'],
    queryFn: async () => {
      // Use RPC function to get public station data (bypasses RLS safely)
      const { data: stationsData, error } = await supabase.rpc('get_public_stations');
      if (error) throw error;

      // Fetch structures (publicly readable)
      const structureIds = [...new Set((stationsData || []).map((s: any) => s.structure_id).filter(Boolean))];
      const structuresMap = new Map<string, any>();

      if (structureIds.length > 0) {
        const { data: structs } = await supabase
          .from('structures')
          .select('id, name, address, description, geo_lat, geo_lng, owner_id')
          .in('id', structureIds);
        
        (structs || []).forEach((s: any) => structuresMap.set(s.id, s));
      }

      return (stationsData || []).map((row: any) => enrichWithStructure(row, structuresMap));
    },
  });
};

export const useStation = (stationId: string | undefined) => {
  return useQuery({
    queryKey: ['station', stationId],
    queryFn: async () => {
      if (!stationId) return null;

      const { data: stationsData, error } = await supabase.rpc('get_public_stations');
      if (error) throw error;

      const row = (stationsData || []).find((s: any) => s.id === stationId);
      if (!row) return null;

      const structuresMap = new Map<string, any>();
      if (row.structure_id) {
        const { data: structs } = await supabase
          .from('structures')
          .select('id, name, address, description, geo_lat, geo_lng, owner_id')
          .eq('id', row.structure_id)
          .maybeSingle();
        
        if (structs) structuresMap.set(structs.id, structs);
      }

      return enrichWithStructure(row, structuresMap);
    },
    enabled: !!stationId,
  });
};
