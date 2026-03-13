import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { StationStatusBadge } from './StationStatusBadge';
import { useLanguage } from '@/hooks/useLanguage';
import { fetchStationAvgRating } from '@/services/sessionService';

interface StationIdentityBlockProps {
  name: string;
  status: 'available' | 'busy' | 'offline';
  description?: string;
  stationType?: string;
  category?: string;
  stationId?: string;
}

export const StationIdentityBlock = ({ name, status, description, stationId }: StationIdentityBlockProps) => {
  const { t } = useLanguage();
  const [avgRating, setAvgRating] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (!stationId) return;
    fetchStationAvgRating(stationId)
      .then(({ avg_rating, total_count }) => {
        setAvgRating(avg_rating);
        setTotalCount(total_count);
      })
      .catch((e) => console.error('[RATING] fetch avg failed:', e));
  }, [stationId]);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">{name}</h1>
        <StationStatusBadge status={status} />
      </div>
      {totalCount > 0 && (
        <div className="flex items-center gap-1.5">
          <Star className="w-4 h-4 text-warning fill-warning" />
          <span className="text-sm font-medium text-foreground">{avgRating}</span>
          <span className="text-xs text-muted-foreground">({totalCount} {t('reviews')})</span>
        </div>
      )}
      {description && (
        <p className="text-sm text-muted-foreground font-light">{description}</p>
      )}
    </div>
  );
};
