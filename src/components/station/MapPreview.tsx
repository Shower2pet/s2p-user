import { Card } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

interface MapPreviewProps {
  stationName: string;
  address?: string;
  lat?: number;
  lng?: number;
}

export const MapPreview = ({ stationName, address, lat, lng }: MapPreviewProps) => {
  const handleOpenMap = () => {
    if (lat && lng) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
    }
  };

  return (
    <Card
      className="relative overflow-hidden rounded-2xl cursor-pointer hover:shadow-floating transition-all duration-300"
      onClick={handleOpenMap}
    >
      {/* Map placeholder with gradient */}
      <div className="aspect-[16/9] bg-gradient-to-br from-sky/20 via-primary/10 to-sky/5 flex flex-col items-center justify-center gap-2">
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
          <MapPin className="w-6 h-6 text-primary" />
        </div>
        <p className="text-sm font-medium text-primary">{stationName}</p>
        {address && (
          <p className="text-xs text-muted-foreground font-light">{address}</p>
        )}
      </div>
    </Card>
  );
};
