import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type StationStatus = 'available' | 'busy' | 'offline' | 'maintenance';

interface StationStatusBadgeProps {
  status: StationStatus;
  className?: string;
}

export const StationStatusBadge = ({ status, className }: StationStatusBadgeProps) => {
  const statusConfig = {
    available: {
      label: 'Disponibile',
      className: 'bg-success text-success-foreground hover:bg-success/90',
    },
    busy: {
      label: 'Occupata',
      className: 'bg-warning text-warning-foreground hover:bg-warning/90',
    },
    offline: {
      label: 'Offline',
      className: 'bg-muted text-muted-foreground',
    },
    maintenance: {
      label: 'In Manutenzione',
      className: 'bg-destructive/15 text-destructive hover:bg-destructive/20',
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