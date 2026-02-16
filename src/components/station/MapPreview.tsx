import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navigation } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

interface MapPreviewProps {
  stationName: string;
  address?: string;
  lat?: number;
  lng?: number;
}

export const MapPreview = ({ stationName, address, lat, lng }: MapPreviewProps) => {
  const { t } = useLanguage();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  const handleDirections = () => {
    if (lat && lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    }
  };

  useEffect(() => {
    if (!mapContainer.current || !lat || !lng || !MAPBOX_TOKEN) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [lng, lat],
      zoom: 15,
      interactive: true,
    });

    new mapboxgl.Marker({ color: '#005596' })
      .setLngLat([lng, lat])
      .addTo(map.current);

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [lat, lng]);

  if (!lat || !lng || !MAPBOX_TOKEN) {
    return null;
  }

  return (
    <div className="space-y-3">
      <Card className="relative overflow-hidden rounded-2xl">
        <div ref={mapContainer} className="w-full aspect-[16/9]" />
      </Card>
      <Button
        onClick={handleDirections}
        variant="outline"
        size="sm"
        className="w-full rounded-full"
      >
        <Navigation className="w-4 h-4 text-primary" />
        {t('getDirections')}
      </Button>
    </div>
  );
};
