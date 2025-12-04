import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/hooks/useLanguage';
import { MapPin, Navigation, Play, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// Mock stations data - in production this would come from Supabase
const mockStations = [
  {
    id: '1',
    name: 'Doccia Bracco',
    location: 'Camping del Sole',
    address: 'Via Roma 123, Milano',
    lat: 45.4642,
    lng: 9.1900,
    status: 'available' as const,
  },
  {
    id: '2',
    name: 'Doccia Luna',
    location: 'Parco Centrale',
    address: 'Via Verdi 45, Milano',
    lat: 45.4700,
    lng: 9.1850,
    status: 'busy' as const,
  },
  {
    id: '3',
    name: 'Doccia Stella',
    location: 'Centro Commerciale Nord',
    address: 'Via Milano 78, Monza',
    lat: 45.5845,
    lng: 9.2744,
    status: 'available' as const,
  },
];

const Map = () => {
  const { t } = useLanguage();
  const [mapboxToken, setMapboxToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(true);
  const [selectedStation, setSelectedStation] = useState<typeof mockStations[0] | null>(null);

  const handleActivateStation = (station: typeof mockStations[0]) => {
    if (station.status !== 'available') {
      toast.error(t('stationNotAvailable'));
      return;
    }
    toast.success(t('stationActivated'));
  };

  const handleNavigate = (station: typeof mockStations[0]) => {
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
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">{t('findStations')}</h1>
          <p className="text-muted-foreground font-light">
            {t('findStationsDesc')}
          </p>
        </div>

        {showTokenInput && (
          <Card className="p-4 bg-warning/10 border-warning">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
              <div className="flex-1 space-y-3">
                <p className="text-sm text-foreground">
                  {t('mapboxTokenRequired')}
                </p>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="pk.eyJ1..."
                    value={mapboxToken}
                    onChange={(e) => setMapboxToken(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => {
                      if (mapboxToken) {
                        setShowTokenInput(false);
                        toast.success(t('mapboxTokenSaved'));
                      }
                    }}
                    disabled={!mapboxToken}
                  >
                    {t('save')}
                  </Button>
                </div>
                <a
                  href="https://mapbox.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary underline"
                >
                  {t('getMapboxToken')}
                </a>
              </div>
            </div>
          </Card>
        )}

        {/* Stations List */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground">{t('nearbyStations')}</h2>
          
          {mockStations.map((station) => (
            <Card
              key={station.id}
              className={`p-4 cursor-pointer transition-all ${
                selectedStation?.id === station.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedStation(station)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{station.name}</h3>
                    <p className="text-sm text-muted-foreground font-light">{station.location}</p>
                    <p className="text-xs text-muted-foreground font-light mt-1">{station.address}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(station.status)}`}>
                  {getStatusText(station.status)}
                </span>
              </div>

              {selectedStation?.id === station.id && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-border">
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

        {/* Map placeholder - would use Mapbox if token provided */}
        {!showTokenInput && mapboxToken && (
          <Card className="h-64 bg-muted flex items-center justify-center">
            <p className="text-muted-foreground font-light">{t('mapLoading')}</p>
          </Card>
        )}
      </div>
    </AppShell>
  );
};

export default Map;
