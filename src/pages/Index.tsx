import { useState, useEffect, useRef, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useStations, Station, isStationOnline, StationCategory, getStationDisplayName } from '@/hooks/useStations';
import { useGeolocation, getDistanceKm } from '@/hooks/useGeolocation';
import { QrScanner } from '@/components/scanner/QrScanner';
import { MapPin, Navigation, ScanLine, Unlock, X, Search, AlertTriangle, Lock, LogIn, UserPlus, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const LOCATION_PATTERN = /^[a-zA-Z0-9\s,àèéìòùÀÈÉÌÒÙ\-']+$/;
const MAX_LOCATION_LENGTH = 100;

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  TUB: { bg: 'bg-sky/15', text: 'text-primary', border: 'border-primary/30' },
  SHOWER: { bg: 'bg-emerald-500/15', text: 'text-emerald-600', border: 'border-emerald-500/30' },
};

const Index = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, loading } = useAuth();
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
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [showAllStations, setShowAllStations] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const { data: stations, isLoading } = useStations();
  const { position } = useGeolocation();

  const visibleStations = useMemo(() => {
    const filtered = (stations?.filter(s => s.visibility !== 'HIDDEN') || [])
      .filter(s => categoryFilter === 'ALL' || s.category === categoryFilter);

    // Sort: available first, then by distance
    const sorted = [...filtered].sort((a, b) => {
      const aOnline = isStationOnline(a) ? 0 : 1;
      const bOnline = isStationOnline(b) ? 0 : 1;
      if (aOnline !== bOnline) return aOnline - bOnline;

      if (position) {
        const distA = (a.geo_lat && a.geo_lng) ? getDistanceKm(position.lat, position.lng, a.geo_lat, a.geo_lng) : Infinity;
        const distB = (b.geo_lat && b.geo_lng) ? getDistanceKm(position.lat, position.lng, b.geo_lat, b.geo_lng) : Infinity;
        return distA - distB;
      }
      return 0;
    });

    return sorted;
  }, [stations, categoryFilter, position]);

  // Split into nearby available and the rest
  const { nearbyStations, otherStations } = useMemo(() => {
    const nearby: Station[] = [];
    const other: Station[] = [];

    for (const s of visibleStations) {
      const online = isStationOnline(s);
      if (online && position && s.geo_lat && s.geo_lng) {
        const dist = getDistanceKm(position.lat, position.lng, s.geo_lat, s.geo_lng);
        if (dist <= 100) {
          nearby.push(s);
          continue;
        }
      } else if (online && !position) {
        // No geolocation — show all available in the nearby section
        nearby.push(s);
        continue;
      }
      other.push(s);
    }

    return { nearbyStations: nearby, otherStations: other };
  }, [visibleStations, position]);

  const getDistanceLabel = (station: Station): string | null => {
    if (!position || !station.geo_lat || !station.geo_lng) return null;
    const km = getDistanceKm(position.lat, position.lng, station.geo_lat, station.geo_lng);
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
  };

  const checkStationsNearLocation = (lng: number, lat: number, locationName: string) => {
    if (visibleStations.length === 0) {
      setNoStationsMessage(t('noStationsAtLocation').replace('{location}', locationName));
      return;
    }
    const nearbyStations = visibleStations.filter(s => {
      if (!s.geo_lat || !s.geo_lng) return false;
      const distance = Math.sqrt(Math.pow(s.geo_lat - lat, 2) + Math.pow(s.geo_lng - lng, 2));
      return distance < 0.5;
    });
    if (nearbyStations.length === 0) {
      setNoStationsMessage(t('noStationsAtLocation').replace('{location}', locationName));
    } else {
      setNoStationsMessage(null);
    }
  };

  const handleLocationSearch = async () => {
    const trimmed = locationSearch.trim();
    if (!trimmed || !map.current || !MAPBOX_TOKEN) return;
    if (trimmed.length > MAX_LOCATION_LENGTH) {
      toast.error(t('locationTooLong').replace('{max}', String(MAX_LOCATION_LENGTH)));
      return;
    }
    if (!LOCATION_PATTERN.test(trimmed)) {
      toast.error(t('locationInvalidChars'));
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
      if (!response.ok) throw new Error('search error');
      const data = await response.json();
      if (data.features?.length > 0) {
        const [lng, lat] = data.features[0].center;
        map.current.flyTo({ center: [lng, lat], zoom: 13, essential: true });
        checkStationsNearLocation(lng, lat, data.features[0].place_name);
      } else {
        toast.error(t('locationNotFound'));
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        toast.error(t('searchTimeout'));
      } else {
        toast.error(t('searchError'));
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
    if (!mapContainer.current || !MAPBOX_TOKEN) return;
    if (!map.current) {
      const center: [number, number] = position ? [position.lng, position.lat] : [9.19, 45.4642];
      mapboxgl.accessToken = MAPBOX_TOKEN;
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center,
        zoom: position ? 13 : 11,
      });
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    }
    if (position && map.current) {
      const existingUserMarker = document.querySelector('.user-location-marker');
      if (existingUserMarker) existingUserMarker.remove();
      const el = document.createElement('div');
      el.className = 'user-location-marker';
      new mapboxgl.Marker({ element: el, color: '#ef4444', scale: 0.6 })
        .setLngLat([position.lng, position.lat])
        .setPopup(new mapboxgl.Popup({ offset: 15 }).setText('📍'))
        .addTo(map.current);
      map.current.flyTo({ center: [position.lng, position.lat], zoom: 13, essential: true });
    }
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Track used coordinates to apply pixel offsets for overlapping markers
    const usedCoords = new Map<string, number>();

    visibleStations.forEach((station) => {
      const lat = station.geo_lat;
      const lng = station.geo_lng;
      if (!lat || !lng || lat < -90 || lat > 90 || lng < -180 || lng > 180) return;

      const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
      const count = usedCoords.get(key) || 0;
      usedCoords.set(key, count + 1);

      const online = isStationOnline(station);
      const isRestricted = station.visibility === 'RESTRICTED';
      const markerColor = !online
        ? '#9ca3af'
        : isRestricted
          ? '#f59e0b'
          : station.category === 'SHOWER' ? '#10b981' : '#005596';

      // Pixel-based offset so markers are always visually separated regardless of zoom
      const pixelOffset: [number, number] = count > 0
        ? [Math.cos(count * 60 * Math.PI / 180) * 20, Math.sin(count * 60 * Math.PI / 180) * 20]
        : [0, 0];

      const marker = new mapboxgl.Marker({ color: markerColor, offset: pixelOffset })
        .setLngLat([lng, lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<strong>${getStationDisplayName(station)}</strong><br/>${station.structure_address || ''}${
              station.visibility === 'RESTRICTED' ? `<br/><em>${t('onlyClients')}</em>` : ''
            }`
          )
        )
        .addTo(map.current!);
      marker.getElement().addEventListener('click', () => setSelectedStation(station));
      markersRef.current.push(marker);
    });
  }, [visibleStations, position]);

  useEffect(() => {
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Show auth prompt after 3 seconds for unauthenticated users
  useEffect(() => {
    if (!user && !loading) {
      const timer = setTimeout(() => setShowAuthPrompt(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [user, loading]);

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
    if (station.status === 'MAINTENANCE') return { color: 'bg-destructive/15 text-destructive', text: t('maintenance') };
    return { color: 'bg-muted text-muted-foreground', text: t('offline') };
  };

  const getCategoryStyle = (category: string) => CATEGORY_COLORS[category] || CATEGORY_COLORS.TUB;

  const renderStationCard = (station: Station) => {
    const status = getStatusInfo(station);
    const online = isStationOnline(station);
    const catStyle = getCategoryStyle(station.category);
    const distLabel = getDistanceLabel(station);

    return (
      <Card
        key={station.id}
        className={`p-4 cursor-pointer transition-all ${selectedStation?.id === station.id ? 'ring-2 ring-primary' : ''}`}
        onClick={() => setSelectedStation(station)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-full ${catStyle.bg} flex items-center justify-center flex-shrink-0`}>
              {station.visibility === 'RESTRICTED' ? (
                <Lock className={`w-5 h-5 ${catStyle.text}`} />
              ) : (
                <MapPin className={`w-5 h-5 ${catStyle.text}`} />
              )}
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm">{getStationDisplayName(station)}</h3>
              <p className="text-xs text-muted-foreground">
                {station.structure_address || ''}
                {distLabel && <span className="ml-1 text-primary font-medium">· {distLabel}</span>}
              </p>
              {station.visibility === 'RESTRICTED' && (
                <p className="text-xs text-warning mt-0.5 flex items-center gap-1"><Lock className="w-3 h-3" /> {t('onlyClients')}</p>
              )}
            </div>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap shrink-0 ${status.color}`}>
            {status.text}
          </span>
        </div>
        {selectedStation?.id === station.id && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-border relative z-10">
            <Button variant="default" size="sm" className="flex-1"
              onClick={(e) => { e.stopPropagation(); handleActivateStation(station); }}
            >
              <MapPin className="w-4 h-4" /> {t('learnMore')}
            </Button>
            <Button variant="outline" size="sm" className="flex-1"
              onClick={(e) => { e.stopPropagation(); handleNavigate(station); }}
            >
              <Navigation className="w-4 h-4" /> {t('directions')}
            </Button>
          </div>
        )}
      </Card>
    );
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

  return (
    <AppShell>
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Hero */}
        <div className="text-center space-y-2 animate-fade-in">
          <h1 className="text-2xl font-bold text-primary leading-tight">{t('heroTitle')}</h1>
        </div>

        {/* QR Scanner Button */}
        <Card
          className="p-5 rounded-3xl shadow-floating bg-gradient-to-br from-primary to-primary/80 text-primary-foreground cursor-pointer hover:scale-[1.02] transition-all duration-300 animate-slide-up"
          onClick={() => setShowQrScanner(true)}
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary-foreground/20 flex items-center justify-center">
              <ScanLine className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <p className="text-lg font-bold">{t('scanQrCode')}</p>
              <p className="text-sm opacity-80">{t('scanQrCodeDesc')}</p>
            </div>
          </div>
        </Card>

        {/* Unlock station */}
        {!showUnlockInput ? (
          <Button onClick={() => setShowUnlockInput(true)} variant="outline" className="w-full" size="lg">
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

        {/* Search */}
        {MAPBOX_TOKEN && (
          <Card className="p-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  placeholder={t('searchLocation')}
                  className="pl-10"
                  maxLength={MAX_LOCATION_LENGTH}
                  onKeyDown={(e) => e.key === 'Enter' && handleLocationSearch()}
                />
              </div>
              <Button onClick={handleLocationSearch} disabled={isSearching}>
                {isSearching ? '...' : t('search')}
              </Button>
            </div>
          </Card>
        )}

        {/* Category filter */}
        <div className="flex gap-2 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <Button variant={categoryFilter === 'ALL' ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => setCategoryFilter('ALL')}>
            {t('allCategories')}
          </Button>
          <Button
            variant={categoryFilter === 'TUB' ? 'default' : 'outline'} size="sm"
            className={`flex-1 ${categoryFilter !== 'TUB' ? 'border-primary/40 text-primary hover:bg-primary/10' : ''}`}
            onClick={() => setCategoryFilter('TUB')}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block mr-1.5" />
            {t('tubs')}
          </Button>
          <Button
            variant={categoryFilter === 'SHOWER' ? 'default' : 'outline'} size="sm"
            className={`flex-1 ${categoryFilter !== 'SHOWER' ? 'border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10' : ''}`}
            onClick={() => setCategoryFilter('SHOWER')}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block mr-1.5" />
            {t('showers')}
          </Button>
        </div>

        {noStationsMessage && (
          <Card className="p-4 bg-warning/10 border-warning animate-fade-in">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-foreground text-sm">{t('noStationsFound')}</h3>
                <p className="text-sm text-muted-foreground mt-1">{noStationsMessage}</p>
              </div>
              <button onClick={() => setNoStationsMessage(null)} className="p-1 hover:bg-muted rounded-full">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </Card>
        )}

        {/* Map */}
        {MAPBOX_TOKEN && (
          <Card className="overflow-hidden rounded-2xl animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div ref={mapContainer} className="w-full h-64" />
          </Card>
        )}

        {/* Stations List */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-foreground">{t('nearbyStations')}</h2>
          {nearbyStations.length > 0 ? (
            nearbyStations.map(renderStationCard)
          ) : (
            <p className="text-sm text-muted-foreground">{t('noStationsNearby')}</p>
          )}

          {otherStations.length > 0 && !showAllStations && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowAllStations(true)}
            >
              {t('showMoreStations').replace('{count}', String(otherStations.length))}
            </Button>
          )}

          {showAllStations && otherStations.length > 0 && (
            <>
              <h2 className="text-sm font-bold text-foreground pt-2">{t('otherStations')}</h2>
              {otherStations.map(renderStationCard)}
            </>
          )}
        </div>
      </div>

      {/* QR Scanner Modal */}
      {showQrScanner && <QrScanner onClose={() => setShowQrScanner(false)} />}

      {/* Auth Prompt Dialog */}
      <Dialog open={showAuthPrompt && !user} onOpenChange={setShowAuthPrompt}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader className="text-center items-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <DialogTitle className="text-lg">{t('joinShower2Pet')}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {t('loginOrRegisterPrompt')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <Button onClick={() => { setShowAuthPrompt(false); navigate('/login'); }} className="w-full" size="lg">
              <LogIn className="w-5 h-5" /> {t('login')}
            </Button>
            <Button onClick={() => { setShowAuthPrompt(false); navigate('/register'); }} variant="outline" className="w-full" size="lg">
              <UserPlus className="w-5 h-5" /> {t('registerFree')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default Index;
