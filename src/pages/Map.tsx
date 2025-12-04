import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';
import { MapPin, Navigation, Play } from 'lucide-react';
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

  // Google Maps embed URL - centered on Milano
  const mapCenter = { lat: 45.4642, lng: 9.1900 };
  const googleMapsEmbedUrl = `https://www.google.com/maps/embed/v1/view?key=AIzaSyBFw0Qbyq9zTFTd-tUY6ceFEVLjWhZxCQI&center=${mapCenter.lat},${mapCenter.lng}&zoom=12`;

  return (
    <AppShell>
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-foreground">{t('findStations')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('findStationsDesc')}
          </p>
        </div>

        {/* Google Maps Embed */}
        <Card className="overflow-hidden">
          <iframe
            src={googleMapsEmbedUrl}
            width="100%"
            height="250"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Station Map"
          />
        </Card>

        {/* Stations List */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-foreground">{t('nearbyStations')}</h2>
          
          {mockStations.map((station) => (
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
