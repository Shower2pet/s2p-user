import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, CreditCard } from 'lucide-react';
import { format } from 'date-fns';

interface HistoryItem {
  id: string;
  type: 'session' | 'payment';
  date: Date;
  stationName?: string;
  duration?: number;
  amount?: number;
  status?: 'completed' | 'pending' | 'failed';
  paymentMethod?: string;
}

interface HistoryListProps {
  items: HistoryItem[];
  type: 'session' | 'payment';
}

export const HistoryList = ({ items, type }: HistoryListProps) => {
  if (items.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground font-light">
          No {type === 'session' ? 'sessions' : 'payments'} yet
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.id} className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 text-foreground">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="font-bold">
                  {format(item.date, 'MMM dd, yyyy')}
                </span>
                <Clock className="w-4 h-4 text-muted-foreground ml-2" />
                <span className="text-sm text-muted-foreground font-light">
                  {format(item.date, 'HH:mm')}
                </span>
              </div>
              
              {type === 'session' && item.stationName && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span className="font-light">{item.stationName}</span>
                  {item.duration && (
                    <span className="font-light">• {item.duration} min</span>
                  )}
                </div>
              )}
              
              {type === 'payment' && item.paymentMethod && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CreditCard className="w-4 h-4" />
                  <span className="font-light">{item.paymentMethod}</span>
                </div>
              )}
            </div>
            
            <div className="text-right space-y-2">
              {item.amount !== undefined && (
                <div className="text-lg font-bold text-foreground">
                  €{item.amount.toFixed(2)}
                </div>
              )}
              
              {item.status && (
                <Badge
                  className={cn(
                    item.status === 'completed' && 'bg-success text-foreground',
                    item.status === 'pending' && 'bg-warning text-foreground',
                    item.status === 'failed' && 'bg-destructive text-destructive-foreground'
                  )}
                >
                  {item.status}
                </Badge>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
