import { useState, useEffect, useRef } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/hooks/useLanguage';
import { useStations, Station } from '@/hooks/useStations';
import { MapPin, Navigation, Play, Unlock, X, Search } from 'lucide-react';
import { toast } from 'sonner';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = 'pk.eyJ1Ijoic2hvd2VyMnBldCIsImEiOiJjbWlydGpkZ3UwaGU2NGtzZ3JzdHM0OHd1In0.W88uve0Md19Ks3x-A8bC6A';

const Map = () => {
  const { t } = useLanguage();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [showUnlockInput, setShowUnlockInput] = useState(false);
  const [stationCode, setStationCode] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const { data: stations, isLoading } = useStations();

  const handleLocationSearch = async () => {
    if (!locationSearch.trim() || !map.current) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(locationSearch)}.json?access_token=${MAPBOX_TOKEN}&country=it&limit=1`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        map.current.flyTo({
          center: [lng, lat],
          zoom: 13,
          essential: true
        });
        toast.success(`Spostato a: ${data.features[0].place_name}`);
      } else {
        toast.error('Località non trovata');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      toast.error('Errore nella ricerca');
    } finally {
      setIsSearching(false);
    }
  };

  const handleUnlockStation = () => {
    if (!stationCode.trim()) {
      toast.error(t('enterStationCode'));
      return;
    }
    
    const station = stations?.find(s => s.id.toLowerCase() === stationCode.toLowerCase().trim());
    if (station) {
      window.open(`https://station-shower2pet.lovable.app/${station.id}`, '_blank');
      setShowUnlockInput(false);
      setStationCode('');
    } else {
      toast.error(t('stationNotFound'));
    }
  };

  useEffect(() => {
    if (!mapContainer.current || !stations || stations.length === 0) return;

    // Initialize map if not already done
    if (!map.current) {
      mapboxgl.accessToken = MAPBOX_TOKEN;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [9.1900, 45.4642],
        zoom: 11,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    }

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add markers for each station (skip invalid coordinates)
    stations.forEach((station) => {
      // Validate coordinates before adding marker
      if (station.lat < -90 || station.lat > 90 || station.lng < -180 || station.lng > 180) {
        console.warn(`Skipping station ${station.id} with invalid coordinates: lat=${station.lat}, lng=${station.lng}`);
        return;
      }

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

      markersRef.current.push(marker);
    });

    return () => {
      // Cleanup only markers, keep map instance
    };
  }, [stations]);

  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  const handleActivateStation = (station: Station) => {
    // Redirect to external station app
    window.open(`https://station-shower2pet.lovable.app/${station.id}`, '_blank');
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

  if (isLoading) {
    return (
      <AppShell>
        <div className="container max-w-2xl mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-10 w-48 mx-auto" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-foreground">{t('findStations')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('findStationsDesc')}
          </p>
        </div>

        {/* Location Search */}
        <Card className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                placeholder="Cerca località (es. Milano, Roma...)"
                className="pl-10"
                onKeyDown={(e) => e.key === 'Enter' && handleLocationSearch()}
              />
            </div>
            <Button onClick={handleLocationSearch} disabled={isSearching}>
              {isSearching ? '...' : 'Cerca'}
            </Button>
          </div>
        </Card>

        {/* Unlock Station Button */}
        {!showUnlockInput ? (
          <Button
            onClick={() => setShowUnlockInput(true)}
            className="w-full shadow-glow-primary"
            size="lg"
          >
            <Unlock className="w-5 h-5 mr-2" />
            {t('unlockStation')}
          </Button>
        ) : (
          <Card className="p-4 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground">{t('enterStationCode')}</h3>
              <button
                onClick={() => {
                  setShowUnlockInput(false);
                  setStationCode('');
                }}
                className="p-1.5 hover:bg-muted rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">{t('enterStationCodeDesc')}</p>
            <div className="flex gap-2">
              <Input
                value={stationCode}
                onChange={(e) => setStationCode(e.target.value)}
                placeholder={t('stationCodePlaceholder')}
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleUnlockStation()}
              />
              <Button onClick={handleUnlockStation}>
                {t('go')}
              </Button>
            </div>
          </Card>
        )}

        {/* Mapbox Map */}
        <Card className="overflow-hidden">
          <div ref={mapContainer} className="w-full h-64" />
        </Card>

        {/* Stations List */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-foreground">{t('nearbyStations')}</h2>
          
          {stations?.map((station) => (
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
