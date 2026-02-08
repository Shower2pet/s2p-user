import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Navigation } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface AboutStationProps {
  location: string;
  address?: string;
  openingHours?: string;
  description?: string;
  lat?: number;
  lng?: number;
}

export const AboutStation = ({ location, address, openingHours, description, lat, lng }: AboutStationProps) => {
  const { t } = useLanguage();

  const handleDirections = () => {
    if (lat && lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    }
  };

  return (
    <Card className="p-5 rounded-2xl space-y-3">
      <h3 className="text-sm font-bold text-foreground">{t('locationInfo')}</h3>

      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">{location}</p>
            {address && <p className="text-xs text-muted-foreground font-light">{address}</p>}
          </div>
        </div>

        {openingHours && (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary shrink-0" />
            <p className="text-sm text-muted-foreground font-light">{openingHours}</p>
          </div>
        )}

        {description && (
          <p className="text-xs text-muted-foreground font-light pt-1">{description}</p>
        )}
      </div>

      {lat && lng && (
        <Button
          onClick={handleDirections}
          variant="outline"
          size="sm"
          className="w-full rounded-full"
        >
          <Navigation className="w-4 h-4 text-primary" />
          {t('getDirections')}
        </Button>
      )}
    </Card>
  );
};
