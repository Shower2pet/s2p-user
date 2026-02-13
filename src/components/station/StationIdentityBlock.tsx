import { StationStatusBadge } from './StationStatusBadge';
import { useLanguage } from '@/hooks/useLanguage';

interface StationIdentityBlockProps {
  name: string;
  status: 'available' | 'busy' | 'offline';
  description?: string;
  stationType?: string;
  category?: string;
}

export const StationIdentityBlock = ({ name, status, description }: StationIdentityBlockProps) => {
  const { t } = useLanguage();

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-bold text-foreground leading-tight">{name}</h1>
        <StationStatusBadge status={status} />
      </div>
      {description && (
        <p className="text-sm text-muted-foreground font-light">{description}</p>
      )}
    </div>
  );
};
