import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/hooks/useLanguage';
import { useStations, Station, isStationOnline, StationCategory, getStationDisplayName } from '@/hooks/useStations';
import { MapPin, Navigation, Play, Unlock, X, Search, AlertTriangle, Lock, Filter } from 'lucide-react';
import { toast } from 'sonner';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
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
  const [categoryFilter, setCategoryFilter] = useState<StationCategory | 'ALL'>('ALL');
  const { data: stations, isLoading } = useStations();

  // Filter out HIDDEN stations
  const visibleStations = (stations?.filter(s => s.visibility !== 'HIDDEN') || [])
    .filter(s => categoryFilter === 'ALL' || s.category === categoryFilter);

  const checkStationsNearLocation = (lng: number, lat: number, locationName: string) => {
    if (visibleStations.length === 0) {
      setNoStationsMessage(`Non ci sono ancora stazioni disponibili a ${locationName}. Stiamo espandendo il servizio!`);
      return;
    }

    const nearbyStations = visibleStations.filter(s => {
      if (!s.geo_lat || !s.geo_lng) return false;
      if (s.geo_lat < -90 || s.geo_lat > 90 || s.geo_lng < -180 || s.geo_lng > 180) return false;
      const distance = Math.sqrt(Math.pow(s.geo_lat - lat, 2) + Math.pow(s.geo_lng - lng, 2));
      return distance < 0.5;
    });

    if (nearbyStations.length === 0) {
      setNoStationsMessage(`Non ci sono ancora stazioni disponibili a ${locationName}. Stiamo espandendo il servizio!`);
    } else {
      setNoStationsMessage(null);
    }
  };

  const handleLocationSearch = async () => {
    const trimmed = locationSearch.trim();
    if (!trimmed || !map.current || !MAPBOX_TOKEN) return;
    if (trimmed.length > MAX_LOCATION_LENGTH) {
      toast.error(`Località troppo lunga (max ${MAX_LOCATION_LENGTH} caratteri)`);
      return;
    }
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

      if (!response.ok) throw new Error('Errore nella ricerca');
      const data = await response.json();

      if (data.features?.length > 0) {
        const [lng, lat] = data.features[0].center;
        map.current.flyTo({ center: [lng, lat], zoom: 13, essential: true });
        checkStationsNearLocation(lng, lat, data.features[0].place_name);
      } else {
        toast.error('Località non trovata');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        toast.error('Ricerca scaduta, riprova');
      } else {
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
    if (!mapContainer.current || !visibleStations.length || !MAPBOX_TOKEN) return;

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

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    visibleStations.forEach((station) => {
      const lat = station.geo_lat;
      const lng = station.geo_lng;
      if (!lat || !lng || lat < -90 || lat > 90 || lng < -180 || lng > 180) return;

      const online = isStationOnline(station);
      // Pin color: gray if offline/maintenance, blue for public, blue+lock for restricted
      const markerColor = online ? '#005596' : '#9ca3af';

      const marker = new mapboxgl.Marker({ color: markerColor })
        .setLngLat([lng, lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<strong>${getStationDisplayName(station)}</strong><br/>${station.structure_address || ''}${
              station.visibility === 'RESTRICTED' ? '<br/><em>🔒 Solo Clienti</em>' : ''
            }`
          )
        )
        .addTo(map.current!);

      marker.getElement().addEventListener('click', () => setSelectedStation(station));
      markersRef.current.push(marker);
    });
  }, [visibleStations]);

  useEffect(() => {
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  const handleActivateStation = (station: Station) => navigate(`/s/${station.id}`);

  const handleNavigate = (station: Station) => {
    const lat = station.geo_lat || station.structure_geo_lat;
    const lng = station.geo_lng || station.structure_geo_lng;
    if (lat && lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    }
  };

  const getStatusInfo = (station: Station) => {
    const online = isStationOnline(station);
    if (online) return { color: 'bg-success text-success-foreground', text: t('available') };
    if (station.status === 'BUSY') return { color: 'bg-warning text-warning-foreground', text: t('busy') };
    return { color: 'bg-muted text-muted-foreground', text: t('offline') };
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="container max-w-2xl mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-10 w-48 mx-auto" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </AppShell>
    );
  }

  if (!MAPBOX_TOKEN) {
    return (
      <AppShell>
        <div className="container max-w-2xl mx-auto px-4 py-6 space-y-4">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-foreground">{t('findStations')}</h1>
          </div>
          <Card className="p-6 text-center">
            <AlertTriangle className="w-10 h-10 text-warning mx-auto mb-3" />
            <p className="text-muted-foreground">La mappa non è disponibile al momento.</p>
          </Card>
        </div>
      </AppShell>
    );
  }

  const renderStationCard = (station: Station) => {
    const status = getStatusInfo(station);
    const online = isStationOnline(station);

    return (
      <Card
        key={station.id}
        className={`p-4 cursor-pointer transition-all ${selectedStation?.id === station.id ? 'ring-2 ring-primary' : ''}`}
        onClick={() => setSelectedStation(station)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              {station.visibility === 'RESTRICTED' ? (
                <Lock className="w-5 h-5 text-primary" />
              ) : (
                <MapPin className="w-5 h-5 text-primary" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-foreground text-sm">{getStationDisplayName(station)}</h3>
              </div>
              <p className="text-xs text-muted-foreground">{station.structure_address || ''}</p>
              {station.visibility === 'RESTRICTED' && (
                <p className="text-xs text-warning mt-0.5">🔒 Solo Clienti</p>
              )}
            </div>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
            {status.text}
          </span>
        </div>

        {selectedStation?.id === station.id && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-border">
            <Button
              variant="default" size="sm" className="flex-1"
              onClick={(e) => { e.stopPropagation(); handleActivateStation(station); }}
              disabled={!online}
            >
              <Play className="w-4 h-4" /> {t('activate')}
            </Button>
            <Button
              variant="outline" size="sm" className="flex-1"
              onClick={(e) => { e.stopPropagation(); handleNavigate(station); }}
            >
              <Navigation className="w-4 h-4" /> {t('directions')}
            </Button>
          </div>
        )}
      </Card>
    );
  };

  return (
    <AppShell>
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-foreground">{t('findStations')}</h1>
          <p className="text-sm text-muted-foreground">{t('findStationsDesc')}</p>
        </div>

        {/* Search */}
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

        {/* Category filter */}
        <div className="flex gap-2">
          {([
            { value: 'ALL', label: 'Tutte', icon: '📍' },
            { value: 'TUB', label: 'Vasche', icon: '🛁' },
            { value: 'SHOWER', label: 'Docce', icon: '🚿' },
          ] as const).map(({ value, label, icon }) => (
            <Button
              key={value}
              variant={categoryFilter === value ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => setCategoryFilter(value)}
            >
              {icon} {label}
            </Button>
          ))}
        </div>

        {noStationsMessage && (
          <Card className="p-4 bg-warning/10 border-warning animate-fade-in">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-foreground text-sm">Nessuna stazione trovata</h3>
                <p className="text-sm text-muted-foreground mt-1">{noStationsMessage}</p>
              </div>
              <button onClick={() => setNoStationsMessage(null)} className="p-1 hover:bg-muted rounded-full">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </Card>
        )}

        {/* Unlock */}
        {!showUnlockInput ? (
          <Button onClick={() => setShowUnlockInput(true)} className="w-full shadow-glow-primary" size="lg">
            <Unlock className="w-5 h-5 mr-2" /> {t('unlockStation')}
          </Button>
        ) : (
          <Card className="p-4 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground">{t('enterStationCode')}</h3>
              <button onClick={() => { setShowUnlockInput(false); setStationCode(''); }} className="p-1.5 hover:bg-muted rounded-full">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">{t('enterStationCodeDesc')}</p>
            <div className="flex gap-2">
              <Input value={stationCode} onChange={(e) => setStationCode(e.target.value)}
                placeholder={t('stationCodePlaceholder')} className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleUnlockStation()} />
              <Button onClick={handleUnlockStation}>{t('go')}</Button>
            </div>
          </Card>
        )}

        {/* Map */}
        <Card className="overflow-hidden">
          <div ref={mapContainer} className="w-full h-64" />
        </Card>

        {/* Stations List */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-foreground">{t('nearbyStations')}</h2>
          {visibleStations.map(renderStationCard)}
        </div>
      </div>
    </AppShell>
  );
};

export default Map;
