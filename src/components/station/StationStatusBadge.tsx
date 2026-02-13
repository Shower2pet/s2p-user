import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type StationStatus = 'available' | 'busy' | 'offline';

interface StationStatusBadgeProps {
  status: StationStatus;
  className?: string;
}

export const StationStatusBadge = ({ status, className }: StationStatusBadgeProps) => {
  const statusConfig = {
    available: {
      label: 'Available',
      className: 'bg-success text-success-foreground hover:bg-success/90',
    },
    busy: {
      label: 'Busy',
      className: 'bg-warning text-warning-foreground hover:bg-warning/90',
    },
    offline: {
      label: 'Offline',
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
