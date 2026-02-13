import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Crown, Calendar, Loader2 } from 'lucide-react';
import { useMySubscriptions, UserSubscription } from '@/hooks/useSubscriptions';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const MySubscriptions = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: subscriptions, isLoading } = useMySubscriptions();
  const [hideExpired, setHideExpired] = useState(false);

  if (!user) {
    return (
      <AppShell>
        <div className="container max-w-lg mx-auto px-4 py-10 text-center space-y-4">
          <Crown className="w-12 h-12 text-accent mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">I Miei Abbonamenti</h1>
          <p className="text-muted-foreground">Accedi per visualizzare i tuoi abbonamenti</p>
          <Button onClick={() => navigate('/login')}>Accedi</Button>
        </div>
      </AppShell>
    );
  }

  const filtered = hideExpired
    ? subscriptions?.filter(s => s.status === 'active') || []
    : subscriptions || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success text-success-foreground">Attivo</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancellato</Badge>;
      case 'expired':
        return <Badge variant="outline" className="text-muted-foreground">Scaduto</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AppShell>
      <div className="container max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
            <Crown className="w-6 h-6 text-accent" />
            I Miei Abbonamenti
          </h1>
          <p className="text-sm text-muted-foreground">Gestisci i tuoi abbonamenti attivi</p>
        </div>

        {/* Filter toggle */}
        <div className="flex items-center justify-between px-1">
          <span className="text-sm text-muted-foreground">Nascondi scaduti</span>
          <Switch checked={hideExpired} onCheckedChange={setHideExpired} />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-6 text-center space-y-3">
            <Crown className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Nessun abbonamento trovato</p>
            <Button onClick={() => navigate('/map')} variant="outline" size="sm">
              Esplora stazioni
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((sub) => (
              <Card key={sub.id} className={`p-4 ${sub.status === 'active' ? 'border-accent/30' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-foreground">{sub.plan?.name || 'Piano'}</p>
                      {getStatusBadge(sub.status)}
                    </div>
                    {sub.plan?.description && (
                      <p className="text-xs text-muted-foreground mt-1">{sub.plan.description}</p>
                    )}
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>
                        Dal {format(new Date(sub.starts_at), 'dd MMM yyyy', { locale: it })}
                        {sub.ends_at && ` al ${format(new Date(sub.ends_at), 'dd MMM yyyy', { locale: it })}`}
                      </span>
                    </div>
                    {sub.plan?.max_washes_per_month && sub.status === 'active' && (
                      <p className="text-xs text-primary mt-1">
                        {sub.washes_used_this_period}/{sub.plan.max_washes_per_month} lavaggi usati
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-accent">€{sub.plan?.price_eur?.toFixed(2) || '—'}</p>
                    <p className="text-xs text-muted-foreground">
                      /{sub.plan?.interval === 'month' ? 'mese' : 'anno'}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default MySubscriptions;
