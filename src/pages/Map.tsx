import { useState, useEffect, useRef } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';
import { MapPin, Navigation, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { stations, Station } from '@/config/stations';

const MAPBOX_TOKEN = 'pk.eyJ1Ijoic2hvd2VyMnBldCIsImEiOiJjbWlydGpkZ3UwaGU2NGtzZ3JzdHM0OHd1In0.W88uve0Md19Ks3x-A8bC6A';

const Map = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [9.1900, 45.4642],
      zoom: 11,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add markers for each station
    stations.forEach((station) => {
      const markerColor = station.status === 'available' ? '#22c55e' : '#f59e0b';
      
      const marker = new mapboxgl.Marker({ color: markerColor })
        .setLngLat([station.lng, station.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<strong>${station.name}</strong><br/>${station.location}`
          )
        )
        .addTo(map.current!);

      marker.getElement().addEventListener('click', () => {
        setSelectedStation(station);
      });
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  const handleActivateStation = (station: Station) => {
    // Navigate to the station page
    navigate(`/${station.id}`);
  };

  const handleNavigate = (station: Station) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;
    window.open(url, '_blank');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-success text-success-foreground';
      case 'busy':
        return 'bg-warning text-warning-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available':
        return t('available');
      case 'busy':
        return t('busy');
      default:
        return t('offline');
    }
  };

  return (
    <AppShell>
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-foreground">{t('findStations')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('findStationsDesc')}
          </p>
        </div>

        {/* Mapbox Map */}
        <Card className="overflow-hidden">
          <div ref={mapContainer} className="w-full h-64" />
        </Card>

        {/* Stations List */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-foreground">{t('nearbyStations')}</h2>
          
          {stations.map((station) => (
            <Card
              key={station.id}
              className={`p-4 cursor-pointer transition-all ${
                selectedStation?.id === station.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedStation(station)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-sm">{station.name}</h3>
                    <p className="text-xs text-muted-foreground">{station.location}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{station.address}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(station.status)}`}>
                  {getStatusText(station.status)}
                </span>
              </div>

              {selectedStation?.id === station.id && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleActivateStation(station);
                    }}
                    disabled={station.status !== 'available'}
                  >
                    <Play className="w-4 h-4" />
                    {t('activate')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNavigate(station);
                    }}
                  >
                    <Navigation className="w-4 h-4" />
                    {t('directions')}
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
};

export default Map;