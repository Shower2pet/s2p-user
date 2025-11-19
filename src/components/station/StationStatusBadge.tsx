import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';

type StationStatus = 'available' | 'busy' | 'offline';

interface StationStatusBadgeProps {
  status: StationStatus;
  className?: string;
}

export const StationStatusBadge = ({ status, className }: StationStatusBadgeProps) => {
  const { t } = useLanguage();
  
  const statusConfig = {
    available: {
      label: t('common.available'),
      className: 'bg-success text-foreground hover:bg-success/90',
    },
    busy: {
      label: t('common.busy'),
      className: 'bg-warning text-foreground hover:bg-warning/90',
    },
    offline: {
      label: t('common.offline'),
      className: 'bg-muted text-muted-foreground',
    },
  };

  const config = statusConfig[status];

  return (
    <Badge className={cn(config.className, 'font-bold px-4 py-1.5', className)}>
      <span className="mr-2 inline-block w-2 h-2 rounded-full bg-current animate-pulse" />
      {config.label}
    </Badge>
  );
};
