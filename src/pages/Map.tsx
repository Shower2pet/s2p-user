import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/hooks/useLanguage';
import { useStations, Station } from '@/hooks/useStations';
import { MapPin, Navigation, Play, Unlock, X, Search, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Use environment variable only - no hardcoded fallback for security
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Validation pattern for location search (letters, numbers, spaces, Italian characters)
const LOCATION_PATTERN = /^[a-zA-Z0-9\s,àèéìòùÀÈÉÌÒÙ\-']+$/;
const MAX_LOCATION_LENGTH = 100;

const Map = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [showUnlockInput, setShowUnlockInput] = useState(false);
  const [stationCode, setStationCode] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [noStationsMessage, setNoStationsMessage] = useState<string | null>(null);
  const { data: stations, isLoading } = useStations();

  const checkStationsNearLocation = (lng: number, lat: number, locationName: string) => {
    if (!stations || stations.length === 0) {
      setNoStationsMessage(`Non ci sono ancora stazioni disponibili a ${locationName}. Stiamo espandendo il servizio!`);
      return;
    }

    // Check if any station is within ~50km of the searched location
    const nearbyStations = stations.filter(station => {
      if (station.lat < -90 || station.lat > 90 || station.lng < -180 || station.lng > 180) return false;
      const distance = Math.sqrt(Math.pow(station.lat - lat, 2) + Math.pow(station.lng - lng, 2));
      return distance < 0.5; // Roughly 50km
    });

    if (nearbyStations.length === 0) {
      setNoStationsMessage(`Non ci sono ancora stazioni disponibili a ${locationName}. Stiamo espandendo il servizio!`);
    } else {
      setNoStationsMessage(null);
    }
  };

  const handleLocationSearch = async () => {
    const trimmed = locationSearch.trim();
    
    // Validate input
    if (!trimmed || !map.current || !MAPBOX_TOKEN) return;
    
    // Add length limit
    if (trimmed.length > MAX_LOCATION_LENGTH) {
      toast.error(`Località troppo lunga (max ${MAX_LOCATION_LENGTH} caratteri)`);
      return;
    }
    
    // Add character validation
    if (!LOCATION_PATTERN.test(trimmed)) {
      toast.error('La località contiene caratteri non validi');
      return;
    }
    
    setIsSearching(true);
    setNoStationsMessage(null);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmed)}.json?access_token=${MAPBOX_TOKEN}&country=it&limit=1`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error('Errore nella ricerca');
      }
      
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        const placeName = data.features[0].place_name;
        map.current.flyTo({
          center: [lng, lat],
          zoom: 13,
          essential: true
        });
        checkStationsNearLocation(lng, lat, placeName);
      } else {
        toast.error('Località non trovata');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        toast.error('Ricerca scaduta, riprova');
      } else {
        console.error('Geocoding error:', error);
        toast.error('Errore nella ricerca');
      }
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
      navigate(`/s/${station.id}`);
      setShowUnlockInput(false);
      setStationCode('');
    } else {
      toast.error(t('stationNotFound'));
    }
  };

  useEffect(() => {
    if (!mapContainer.current || !stations || stations.length === 0 || !MAPBOX_TOKEN) return;

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
    navigate(`/s/${station.id}`);
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

  // Show error state if Mapbox token is not configured
  if (!MAPBOX_TOKEN) {
    return (
      <AppShell>
        <div className="container max-w-2xl mx-auto px-4 py-6 space-y-4">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-foreground">{t('findStations')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('findStationsDesc')}
            </p>
          </div>
          
          <Card className="p-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <AlertTriangle className="w-10 h-10 text-warning" />
              <p className="text-muted-foreground">
                La mappa non è disponibile al momento. Contatta il supporto.
              </p>
            </div>
          </Card>
          
          {/* Stations List - still show without map */}
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
                maxLength={MAX_LOCATION_LENGTH}
                onKeyDown={(e) => e.key === 'Enter' && handleLocationSearch()}
              />
            </div>
            <Button onClick={handleLocationSearch} disabled={isSearching}>
              {isSearching ? '...' : 'Cerca'}
            </Button>
          </div>
        </Card>

        {/* No Stations Message */}
        {noStationsMessage && (
          <Card className="p-4 bg-warning/10 border-warning animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-warning" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm">Nessuna stazione trovata</h3>
                <p className="text-sm text-muted-foreground mt-1">{noStationsMessage}</p>
              </div>
              <button
                onClick={() => setNoStationsMessage(null)}
                className="p-1 hover:bg-muted rounded-full transition-colors ml-auto"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </Card>
        )}

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
