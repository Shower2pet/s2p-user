import { StationStatusBadge } from './StationStatusBadge';
import { Droplets, Wind } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface StationIdentityBlockProps {
  name: string;
  status: 'available' | 'busy' | 'offline';
  description?: string;
  stationType?: string;
  category?: string;
}

export const StationIdentityBlock = ({ name, status, description, stationType, category }: StationIdentityBlockProps) => {
  const { t } = useLanguage();

  const categoryLabel = category === 'SHOWER' ? '🚿 Doccia' : '🛁 Vasca';

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground leading-tight">{name}</h1>
          {stationType && (
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                {stationType}
              </span>
              <span className="text-xs text-muted-foreground">{categoryLabel}</span>
            </div>
          )}
        </div>
        <StationStatusBadge status={status} />
      </div>
      <p className="text-sm text-muted-foreground font-light">
        {description || t('stationDescription')}
      </p>
      <div className="flex gap-3">
        <div className="flex items-center gap-1.5 rounded-full bg-sky/15 px-3 py-1.5">
          <Droplets className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-primary">{t('waterSystem')}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-sky/15 px-3 py-1.5">
          <Wind className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-primary">{t('petDryer')}</span>
        </div>
      </div>
    </div>
  );
};
